"""
URL Extraction API Router
Handles submission and tracking of URL extraction tasks
"""

from fastapi import APIRouter, Depends, HTTPException, Request, Form
from fastapi.responses import RedirectResponse, JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, insert
from typing import Optional
import uuid
import httpx
from datetime import datetime, timedelta

from app.auth.middleware import get_current_user
from app.database.connection import get_db
from app.models.user import UserPublic
from app.models.extraction import ExtractionTask, UserURL
from app.database.models import User
from app.config import get_settings

settings = get_settings()
router = APIRouter(tags=["extraction"])


@router.post("/submit")
async def submit_url(
    request: Request,
    url: str = Form(...),
    force: bool = Form(False),
    target_story_id: Optional[str] = Form(None),
    response_format: str = Form("redirect"),  # "redirect" or "json"
    user: UserPublic = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Submit URL for extraction

    Args:
        url: URL to extract
        force: Bypass deduplication checks
        target_story_id: Optional story ID to assign
        response_format: "redirect" or "json"

    Returns:
        Redirect to /task/{task_id} or JSON with task_id
    """
    # Check user credits
    SUBMISSION_COST = 10

    # Get full user record with credits
    result = await db.execute(
        select(User).where(User.user_id == user.user_id)
    )
    db_user = result.scalar_one_or_none()

    if not db_user:
        raise HTTPException(status_code=401, detail="User not found")

    if db_user.credits_balance < SUBMISSION_COST:
        raise HTTPException(
            status_code=402,
            detail=f"Insufficient credits. You have {db_user.credits_balance} credits, but need {SUBMISSION_COST}."
        )

    # Normalize URL (TODO: implement URL normalization)
    original_url = url

    # Check for dead URLs (404 only)
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            response = await client.head(url, follow_redirects=True)

            if response.status_code == 404:
                raise HTTPException(
                    status_code=400,
                    detail=f"URL is not accessible (HTTP {response.status_code}). Please check the URL and try again."
                )
    except httpx.TimeoutException:
        # Allow timeout - Playwright might still work
        pass
    except httpx.RequestError as e:
        # Allow other errors - Playwright might handle them
        print(f"⚠️ Pre-flight check failed for {url}: {e}")

    # Check for recent duplicate submission (unless force=True)
    if not force:
        cutoff_time = datetime.utcnow() - timedelta(hours=24)
        result = await db.execute(
            select(ExtractionTask)
            .where(ExtractionTask.url == url)
            .where(ExtractionTask.created_at >= cutoff_time)
            .order_by(ExtractionTask.created_at.desc())
            .limit(1)
        )
        existing_task = result.scalar_one_or_none()

        if existing_task:
            print(f"🔁 Found recent task for URL (within 24h): {existing_task.id}")

            # Still deduct credits and link to user
            await db.execute(
                update(User)
                .where(User.user_id == user.user_id)
                .values(credits_balance=User.credits_balance - SUBMISSION_COST)
            )

            # Link URL to user
            await db.execute(
                insert(UserURL).values(
                    user_id=user.user_id,
                    task_id=existing_task.id,
                    url=url,
                    credits_spent=SUBMISSION_COST
                )
            )

            await db.commit()

            # Return existing task
            if response_format == "json":
                return {"task_id": existing_task.id, "status": "submitted", "reused": True}
            else:
                return RedirectResponse(url=f"/task/{existing_task.id}", status_code=303)

    # Create new extraction task
    task_id = str(uuid.uuid4())

    new_task = ExtractionTask(
        id=task_id,
        url=url,
        user_id=user.user_id,
        status="pending",
        target_story_id=target_story_id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )

    db.add(new_task)

    # Deduct credits
    await db.execute(
        update(User)
        .where(User.user_id == user.user_id)
        .values(credits_balance=User.credits_balance - SUBMISSION_COST)
    )

    # Link URL to user
    user_url = UserURL(
        user_id=user.user_id,
        task_id=task_id,
        url=url,
        credits_spent=SUBMISSION_COST
    )
    db.add(user_url)

    await db.commit()

    print(f"✅ Task created: {task_id} for {url}")

    # Trigger extraction in service_farm
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            trigger_response = await client.post(
                f"{settings.service_farm_url}/trigger/extract/{task_id}",
                timeout=5.0
            )

            if trigger_response.status_code == 200:
                print(f"✅ Triggered extraction for task {task_id}")
            else:
                print(f"⚠️  Failed to trigger extraction: {trigger_response.status_code}")
    except Exception as e:
        print(f"⚠️  Failed to trigger extraction worker: {e}")
        # Don't fail the request - task is created, worker will pick it up

    # Return response
    if response_format == "json":
        return {"task_id": task_id, "status": "submitted"}
    else:
        return RedirectResponse(url=f"/task/{task_id}", status_code=303)


@router.get("/api/task/{task_id}")
async def get_task_status(
    task_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get task status and results

    Args:
        task_id: Task UUID

    Returns:
        Task details including status, results, and semantic data
    """
    result = await db.execute(
        select(ExtractionTask).where(ExtractionTask.id == task_id)
    )
    task = result.scalar_one_or_none()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Build response
    response = {
        "task_id": task.id,
        "url": task.url,
        "canonical_url": task.canonical_url,
        "status": task.status,
        "current_stage": task.current_stage,
        "created_at": task.created_at.isoformat() if task.created_at else None,
        "updated_at": task.updated_at.isoformat() if task.updated_at else None,
        "completed_at": task.completed_at.isoformat() if task.completed_at else None,
        "error_message": task.error_message,
        "block_reason": task.block_reason,
        "result": task.result,
        "semantic_data": task.semantic_data,
        "story_match": task.story_match
    }

    return response


@router.get("/api/preview")
async def get_preview(
    url: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get instant preview for a URL

    Checks if we have cached metadata from previous extractions

    Args:
        url: URL to preview

    Returns:
        Preview metadata (title, description, image, etc.)
    """
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")

    # Check for rogue/paywalled domains
    from urllib.parse import urlparse
    parsed = urlparse(url)
    domain = parsed.netloc.lower()

    rogue_domains = [
        'reuters.com', 'wsj.com', 'ft.com', 'economist.com',
        'nytimes.com', 'bloomberg.com', 'inmediahk.net',
        'scmp.com', 'washingtonpost.com'
    ]

    is_rogue = any(rogue_domain in domain for rogue_domain in rogue_domains)

    # Look for recent completed task for this URL
    cutoff_time = datetime.utcnow() - timedelta(days=30)
    result = await db.execute(
        select(ExtractionTask)
        .where(ExtractionTask.url == url)
        .where(ExtractionTask.status == "completed")
        .where(ExtractionTask.created_at >= cutoff_time)
        .order_by(ExtractionTask.created_at.desc())
        .limit(1)
    )
    task = result.scalar_one_or_none()

    if task and task.result:
        result_data = task.result

        # Extract preview fields
        preview = {
            "url": url,
            "title": result_data.get("title", ""),
            "description": result_data.get("meta_description") or result_data.get("content_text", "")[:200],
            "image": result_data.get("screenshot_url"),
            "site_name": result_data.get("site_name"),
            "author": result_data.get("author"),
            "published_date": result_data.get("publish_date"),
            "word_count": result_data.get("word_count"),
            "reading_time_minutes": result_data.get("reading_time_minutes"),
            "preview_quality": "cached",
            "is_cached": True,
            "is_rogue": is_rogue
        }

        return preview

    # No cached result - return placeholder
    return {
        "url": url,
        "title": "Preview not available",
        "description": "Submit to start extraction",
        "preview_quality": "placeholder",
        "is_cached": False,
        "is_rogue": is_rogue
    }
