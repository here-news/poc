"""
User repository - data access layer for users
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from datetime import datetime
from ..models import User
from ...models.user import UserCreate, UserInDB


class UserRepository:
    """Repository for user data operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, user_id: str) -> Optional[UserInDB]:
        """Get user by ID"""
        result = await self.db.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        if user:
            return UserInDB.model_validate(user)
        return None

    async def get_by_email(self, email: str) -> Optional[UserInDB]:
        """Get user by email"""
        result = await self.db.execute(
            select(User).where(User.email == email)
        )
        user = result.scalar_one_or_none()
        if user:
            return UserInDB.model_validate(user)
        return None

    async def get_by_google_id(self, google_id: str) -> Optional[UserInDB]:
        """Get user by Google ID"""
        result = await self.db.execute(
            select(User).where(User.google_id == google_id)
        )
        user = result.scalar_one_or_none()
        if user:
            return UserInDB.model_validate(user)
        return None

    async def create(self, user_data: UserCreate) -> UserInDB:
        """Create new user"""
        user = User(
            email=user_data.email,
            name=user_data.name,
            picture=user_data.picture,
            google_id=user_data.google_id,
            last_login=datetime.utcnow()
        )
        self.db.add(user)
        await self.db.flush()
        await self.db.refresh(user)
        return UserInDB.model_validate(user)

    async def update_last_login(self, user_id: str) -> None:
        """Update user's last login timestamp"""
        result = await self.db.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        if user:
            user.last_login = datetime.utcnow()
            await self.db.flush()
