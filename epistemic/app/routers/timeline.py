"""
Timeline API routes
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from ..auth.middleware import get_current_user
from ..database.connection import get_db
from ..database.repositories.timeline_repo import TimelineRepository
from ..database.repositories.user_repo import UserRepository
from ..models.timeline import (
    TimelineEntryCreate,
    TimelineEntryUpdate,
    TimelineEntryResponse
)
from ..models.user import UserPublic

router = APIRouter(prefix="/api/timeline", tags=["timeline"])


@router.get("/", response_model=List[TimelineEntryResponse])
async def get_timeline(
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: UserPublic = Depends(get_current_user)
):
    """
    Get current user's timeline entries

    Requires authentication
    """
    timeline_repo = TimelineRepository(db)
    entries = await timeline_repo.get_by_user(
        user_id=current_user.id,
        limit=limit,
        offset=offset
    )

    # Convert to response model with user info
    response_entries = []
    for entry in entries:
        entry_dict = entry.model_dump()
        entry_dict["user"] = {
            "id": current_user.id,
            "name": current_user.name,
            "picture": current_user.picture
        }
        response_entries.append(TimelineEntryResponse(**entry_dict))

    return response_entries


@router.post("/", response_model=TimelineEntryResponse, status_code=status.HTTP_201_CREATED)
async def create_timeline_entry(
    entry_data: TimelineEntryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: UserPublic = Depends(get_current_user)
):
    """
    Create new timeline entry

    Requires authentication
    """
    timeline_repo = TimelineRepository(db)
    entry = await timeline_repo.create(
        user_id=current_user.id,
        entry_data=entry_data
    )

    # Add user info to response
    entry_dict = entry.model_dump()
    entry_dict["user"] = {
        "id": current_user.id,
        "name": current_user.name,
        "picture": current_user.picture
    }

    return TimelineEntryResponse(**entry_dict)


@router.get("/{entry_id}", response_model=TimelineEntryResponse)
async def get_timeline_entry(
    entry_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserPublic = Depends(get_current_user)
):
    """
    Get specific timeline entry

    Requires authentication and ownership
    """
    timeline_repo = TimelineRepository(db)

    # Check ownership
    is_owner = await timeline_repo.check_ownership(entry_id, current_user.id)
    if not is_owner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Timeline entry not found"
        )

    entry = await timeline_repo.get_by_id(entry_id)
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Timeline entry not found"
        )

    # Add user info to response
    entry_dict = entry.model_dump()
    entry_dict["user"] = {
        "id": current_user.id,
        "name": current_user.name,
        "picture": current_user.picture
    }

    return TimelineEntryResponse(**entry_dict)


@router.put("/{entry_id}", response_model=TimelineEntryResponse)
async def update_timeline_entry(
    entry_id: str,
    entry_data: TimelineEntryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: UserPublic = Depends(get_current_user)
):
    """
    Update timeline entry

    Requires authentication and ownership
    """
    timeline_repo = TimelineRepository(db)

    # Check ownership
    is_owner = await timeline_repo.check_ownership(entry_id, current_user.id)
    if not is_owner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Timeline entry not found"
        )

    entry = await timeline_repo.update(entry_id, entry_data)
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Timeline entry not found"
        )

    # Add user info to response
    entry_dict = entry.model_dump()
    entry_dict["user"] = {
        "id": current_user.id,
        "name": current_user.name,
        "picture": current_user.picture
    }

    return TimelineEntryResponse(**entry_dict)


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_timeline_entry(
    entry_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserPublic = Depends(get_current_user)
):
    """
    Delete timeline entry

    Requires authentication and ownership
    """
    timeline_repo = TimelineRepository(db)

    # Check ownership
    is_owner = await timeline_repo.check_ownership(entry_id, current_user.id)
    if not is_owner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Timeline entry not found"
        )

    success = await timeline_repo.delete(entry_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Timeline entry not found"
        )

    return None
