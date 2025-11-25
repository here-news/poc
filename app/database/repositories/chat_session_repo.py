"""
Chat session repository for database operations
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from datetime import datetime

from ..models import ChatSession, ChatSessionStatus, User


class ChatSessionRepository:
    """Repository for ChatSession database operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_story_and_user(self, story_id: str, user_id: str) -> Optional[ChatSession]:
        """Get chat session by story and user"""
        result = await self.db.execute(
            select(ChatSession).where(
                ChatSession.story_id == story_id,
                ChatSession.user_id == user_id
            )
        )
        return result.scalar_one_or_none()

    async def create_session(self, story_id: str, user_id: str, cost: int = 10) -> ChatSession:
        """
        Create new chat session and deduct credits from user

        Raises:
            ValueError: If user doesn't have enough credits
        """
        # Check if session already exists
        existing = await self.get_by_story_and_user(story_id, user_id)
        if existing:
            return existing

        # Get user and check credits
        user_result = await self.db.execute(
            select(User).where(User.user_id == user_id)
        )
        user = user_result.scalar_one_or_none()

        if not user:
            raise ValueError("User not found")

        if user.credits_balance < cost:
            raise ValueError(f"Insufficient credits. Need {cost}, have {user.credits_balance}")

        # Deduct credits
        user.credits_balance -= cost

        # Create session
        session = ChatSession(
            story_id=story_id,
            user_id=user_id,
            message_count=0,
            cost=cost,
            status=ChatSessionStatus.active
        )

        self.db.add(session)
        await self.db.flush()
        await self.db.refresh(session)

        return session

    async def increment_message_count(self, session_id: str, max_messages: int = 100) -> ChatSession:
        """
        Increment message count and update session status if exhausted

        Raises:
            ValueError: If session is already exhausted
        """
        result = await self.db.execute(
            select(ChatSession).where(ChatSession.id == session_id)
        )
        session = result.scalar_one_or_none()

        if not session:
            raise ValueError("Session not found")

        if session.status == ChatSessionStatus.exhausted:
            raise ValueError("Chat session has been exhausted")

        session.message_count += 1
        session.last_message_at = datetime.utcnow()

        # Check if limit reached
        if session.message_count >= max_messages:
            session.status = ChatSessionStatus.exhausted

        await self.db.flush()
        await self.db.refresh(session)

        return session

    async def get_remaining_messages(self, session_id: str, max_messages: int = 100) -> int:
        """Get remaining messages for a session"""
        result = await self.db.execute(
            select(ChatSession).where(ChatSession.id == session_id)
        )
        session = result.scalar_one_or_none()

        if not session:
            return 0

        return max(0, max_messages - session.message_count)
