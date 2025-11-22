"""
Event submission API router
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import json
import logging
import httpx
import uuid
from datetime import datetime

from app.auth.middleware import get_current_user_optional
from app.database.connection import get_db
from app.database.repositories.event_submission_repo import EventSubmissionRepository
from app.database.repositories.user_repo import UserRepository
from app.models.user import UserPublic
from app.models.event_submission import (
    EventSubmissionCreate,
    EventSubmissionResponse,
    StoryMatch,
    PreviewMeta
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/events", tags=["events"])

# Get settings for service farm URL
from app.config import get_settings
settings = get_settings()


def parse_json_field(field_value: str | None, model_class=None):
    """Safely parse JSON field from database"""
    if not field_value:
        return None
    try:
        data = json.loads(field_value)
        if model_class:
            return model_class(**data)
        return data
    except (json.JSONDecodeError, TypeError, ValueError):
        return None


@router.post("", response_model=EventSubmissionResponse, status_code=status.HTTP_201_CREATED)
async def create_event_submission(
    submission_data: EventSubmissionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: UserPublic = Depends(get_current_user_optional)
):
    """
    Submit a new event for processing

    Requires authentication
    """
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to submit events"
        )

    # Get full user data from database for picture
    user_repo = UserRepository(db)
    user = await user_repo.get_by_id(current_user.user_id)

    # Create submission
    submission = await EventSubmissionRepository.create(
        db=db,
        user_id=current_user.user_id,
        content=submission_data.content,
        urls=submission_data.urls or ""
    )

    # Extract URL and trigger extraction on service_farm
    url = submission_data.urls.strip() if submission_data.urls else None
    if url:
        try:
            # Get instant preview from service_farm
            async with httpx.AsyncClient(timeout=10.0) as client:
                preview_response = await client.get(
                    f"{settings.service_farm_url}/api/preview",
                    params={"url": url},
                    timeout=10.0
                )

                preview_meta = None
                task_id = None

                if preview_response.status_code == 200:
                    preview_data = preview_response.json()

                    # Extract task_id from preview response
                    task_id = preview_data.get("task_id") or str(uuid.uuid4())

                    # Extract preview metadata
                    if preview_data.get("found") and preview_data.get("preview"):
                        preview_info = preview_data["preview"]
                        preview_meta = {
                            "title": preview_info.get("title"),
                            "description": preview_info.get("description"),
                            "thumbnail_url": preview_info.get("image") or preview_info.get("thumbnail_url"),
                            "site_name": preview_info.get("site_name"),
                            "canonical_url": preview_info.get("canonical_url")
                        }
                else:
                    # Preview failed, generate task_id
                    task_id = str(uuid.uuid4())

            # Update submission with task_id, status, and preview
            submission.task_id = task_id
            submission.status = "extracting"
            if preview_meta:
                submission.preview_meta = json.dumps(preview_meta)
            await db.commit()
            await db.refresh(submission)

            logger.info(f"🚀 Extraction started for URL: {url} (task_id: {task_id})")

        except Exception as e:
            logger.error(f"❌ Failed to trigger extraction: {e}")
            # Don't fail the request - submission is created, extraction will be retried
            submission.status = "pending"
            await db.commit()

    # Return with user info
    return EventSubmissionResponse(
        id=submission.id,
        user_id=str(submission.user_id),
        user_name=user.name if user else current_user.name,
        user_picture=user.picture_url if user else None,
        content=submission.content,
        urls=submission.urls,
        status=submission.status,
        task_id=submission.task_id,
        story_match=parse_json_field(submission.story_match, StoryMatch),
        preview_meta=parse_json_field(submission.preview_meta, PreviewMeta),
        created_at=submission.created_at
    )


@router.get("/mine", response_model=List[EventSubmissionResponse])
async def get_my_submissions(
    db: AsyncSession = Depends(get_db),
    current_user: UserPublic = Depends(get_current_user_optional)
):
    """
    Get current user's event submissions

    Requires authentication
    """
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )

    # Get full user data from database for picture
    user_repo = UserRepository(db)
    user = await user_repo.get_by_id(current_user.user_id)

    submissions = await EventSubmissionRepository.get_by_user(db, current_user.user_id)

    # Query extraction tasks to get latest status
    from app.models.extraction import ExtractionTask
    from sqlalchemy import select

    result_list = []
    for sub in submissions:
        # Get extraction task status if task_id exists
        current_status = sub.status
        current_story_match = parse_json_field(sub.story_match, StoryMatch)
        current_preview_meta = parse_json_field(sub.preview_meta, PreviewMeta)

        if sub.task_id:
            try:
                task_result = await db.execute(
                    select(ExtractionTask).where(ExtractionTask.id == sub.task_id)
                )
                task = task_result.scalar_one_or_none()

                if task:
                    # Map extraction task status to submission status
                    if task.status == "completed":
                        current_status = "completed"
                        if task.story_match:
                            current_story_match = StoryMatch(**task.story_match) if isinstance(task.story_match, dict) else current_story_match
                    elif task.status == "failed":
                        current_status = "failed"
                    elif task.status == "blocked":
                        current_status = "blocked"
                    elif task.status == "processing":
                        current_status = "extracting"

                    # Update preview_meta if available
                    if task.preview_meta and isinstance(task.preview_meta, dict):
                        current_preview_meta = PreviewMeta(**task.preview_meta)
            except Exception as e:
                logger.error(f"Failed to fetch extraction task {sub.task_id}: {e}")

        result_list.append(EventSubmissionResponse(
            id=sub.id,
            user_id=str(sub.user_id),
            user_name=user.name if user else current_user.name,
            user_picture=user.picture_url if user else None,
            content=sub.content,
            urls=sub.urls,
            status=current_status,
            task_id=sub.task_id,
            story_match=current_story_match,
            preview_meta=current_preview_meta,
            created_at=sub.created_at
        ))

    return result_list
