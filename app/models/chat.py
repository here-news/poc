"""
Pydantic models for Chat Sessions
"""

from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from app.database.models import ChatSessionStatus


class ChatSessionResponse(BaseModel):
    """Chat session response model"""
    id: str
    story_id: str
    user_id: str
    message_count: int
    cost: int
    status: ChatSessionStatus
    unlocked_at: datetime
    last_message_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class UnlockChatRequest(BaseModel):
    """Request to unlock chat for a story"""
    story_id: str


class ChatMessage(BaseModel):
    """Single chat message"""
    role: str  # 'user' or 'assistant'
    content: str


class SendMessageRequest(BaseModel):
    """Request to send a chat message"""
    story_id: str
    message: str
    conversation_history: List[ChatMessage] = []


class SendMessageResponse(BaseModel):
    """Response after sending a message"""
    message: str
    message_count: int
    remaining_messages: int
    session_status: ChatSessionStatus
