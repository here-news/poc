"""
User repository for database operations
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.sql import func
from typing import Optional, Union
from datetime import datetime
from uuid import UUID

from ..models import User
from ...models.user import UserCreate


class UserRepository:
    """Repository for User database operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, user_id: Union[UUID, str]) -> Optional[User]:
        """Get user by ID"""
        result = await self.db.execute(
            select(User).where(User.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        result = await self.db.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none()

    async def get_by_google_id(self, google_id: str) -> Optional[User]:
        """Get user by Google ID"""
        result = await self.db.execute(
            select(User).where(User.google_id == google_id)
        )
        return result.scalar_one_or_none()

    async def create(self, user_create: UserCreate) -> User:
        """Create new user"""
        user = User(
            email=user_create.email,
            name=user_create.name,
            picture_url=user_create.picture,
            google_id=user_create.google_id,
            credits_balance=1000,  # Starting credits
            reputation=0
        )
        self.db.add(user)
        await self.db.flush()
        await self.db.refresh(user)
        return user

    async def update_last_login(self, user_id: Union[UUID, str]):
        """Update user's last login timestamp"""
        result = await self.db.execute(
            select(User).where(User.user_id == user_id)
        )
        user = result.scalar_one_or_none()
        if user:
            user.last_login = datetime.utcnow()
            await self.db.flush()
