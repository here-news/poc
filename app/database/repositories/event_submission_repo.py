"""
Repository for event submissions
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import uuid

from app.database.models import EventSubmission


class EventSubmissionRepository:
    """Repository for event submission operations"""

    @staticmethod
    async def create(db: AsyncSession, user_id: str, content: str, urls: str = "") -> EventSubmission:
        """Create a new event submission"""
        submission = EventSubmission(
            id=str(uuid.uuid4()),
            user_id=user_id,
            content=content,
            urls=urls,
            status="pending"
        )
        db.add(submission)
        await db.commit()
        await db.refresh(submission)
        return submission

    @staticmethod
    async def get_by_user(db: AsyncSession, user_id: str, limit: int = 50) -> List[EventSubmission]:
        """Get event submissions by user"""
        result = await db.execute(
            select(EventSubmission)
            .where(EventSubmission.user_id == user_id)
            .order_by(EventSubmission.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    @staticmethod
    async def get_by_id(db: AsyncSession, submission_id: str) -> EventSubmission | None:
        """Get event submission by ID"""
        result = await db.execute(
            select(EventSubmission)
            .where(EventSubmission.id == submission_id)
        )
        return result.scalar_one_or_none()
