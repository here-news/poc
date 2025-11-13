"""
Timeline repository - data access layer for timeline entries
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import List, Optional
from datetime import datetime
from ..models import TimelineEntry, User
from ...models.timeline import TimelineEntryCreate, TimelineEntryUpdate, TimelineEntryInDB


class TimelineRepository:
    """Repository for timeline data operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, entry_id: str) -> Optional[TimelineEntryInDB]:
        """Get timeline entry by ID"""
        result = await self.db.execute(
            select(TimelineEntry).where(TimelineEntry.id == entry_id)
        )
        entry = result.scalar_one_or_none()
        if entry:
            return TimelineEntryInDB.model_validate(entry)
        return None

    async def get_by_user(
        self,
        user_id: str,
        limit: int = 50,
        offset: int = 0
    ) -> List[TimelineEntryInDB]:
        """Get timeline entries for a user"""
        result = await self.db.execute(
            select(TimelineEntry)
            .where(TimelineEntry.user_id == user_id)
            .order_by(desc(TimelineEntry.created_at))
            .limit(limit)
            .offset(offset)
        )
        entries = result.scalars().all()
        return [TimelineEntryInDB.model_validate(entry) for entry in entries]

    async def create(
        self,
        user_id: str,
        entry_data: TimelineEntryCreate
    ) -> TimelineEntryInDB:
        """Create new timeline entry"""
        entry = TimelineEntry(
            user_id=user_id,
            content=entry_data.content,
            link=entry_data.link,
            type=entry_data.type,
            metadata=entry_data.metadata
        )
        self.db.add(entry)
        await self.db.flush()
        await self.db.refresh(entry)
        return TimelineEntryInDB.model_validate(entry)

    async def update(
        self,
        entry_id: str,
        entry_data: TimelineEntryUpdate
    ) -> Optional[TimelineEntryInDB]:
        """Update timeline entry"""
        result = await self.db.execute(
            select(TimelineEntry).where(TimelineEntry.id == entry_id)
        )
        entry = result.scalar_one_or_none()

        if not entry:
            return None

        if entry_data.content is not None:
            entry.content = entry_data.content
        if entry_data.link is not None:
            entry.link = entry_data.link
        if entry_data.metadata is not None:
            entry.metadata = entry_data.metadata

        entry.updated_at = datetime.utcnow()
        await self.db.flush()
        await self.db.refresh(entry)
        return TimelineEntryInDB.model_validate(entry)

    async def delete(self, entry_id: str) -> bool:
        """Delete timeline entry"""
        result = await self.db.execute(
            select(TimelineEntry).where(TimelineEntry.id == entry_id)
        )
        entry = result.scalar_one_or_none()

        if not entry:
            return False

        await self.db.delete(entry)
        await self.db.flush()
        return True

    async def check_ownership(self, entry_id: str, user_id: str) -> bool:
        """Check if user owns the timeline entry"""
        result = await self.db.execute(
            select(TimelineEntry).where(
                TimelineEntry.id == entry_id,
                TimelineEntry.user_id == user_id
            )
        )
        entry = result.scalar_one_or_none()
        return entry is not None
