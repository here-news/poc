"""
SQLAlchemy ORM models
"""

from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from .connection import Base
import uuid
import enum


def generate_id():
    """Generate unique ID"""
    return str(uuid.uuid4())


def generate_uuid():
    """Generate UUID for user_id"""
    return uuid.uuid4()


class ChatSessionStatus(str, enum.Enum):
    """Chat session status enum"""
    active = "active"
    exhausted = "exhausted"


class User(Base):
    """User ORM model"""
    __tablename__ = "users"

    user_id = Column(UUID(as_uuid=True), primary_key=True, default=generate_uuid, name="user_id")
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String)
    picture_url = Column(String, name="picture_url")
    google_id = Column(String, unique=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login = Column(DateTime(timezone=True), onupdate=func.now())

    # Credits and reputation
    credits_balance = Column(Integer, default=1000, name="credits_balance")
    reputation = Column(Integer, default=0)

    # Additional fields from database
    subscription_tier = Column(String, nullable=True)
    is_active = Column(Integer, default=True)  # Boolean stored as integer in DB


class Comment(Base):
    """Story comment/discussion model"""
    __tablename__ = "comments"

    id = Column(String, primary_key=True, default=generate_id)
    story_id = Column(String, nullable=False, index=True)  # Neo4j Story ID
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    text = Column(Text, nullable=False)
    parent_comment_id = Column(String, ForeignKey("comments.id"), nullable=True, index=True)
    reaction_type = Column(String, nullable=True)  # 'support', 'refute', 'question', 'comment'
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class ChatSession(Base):
    """Premium AI chat session for stories"""
    __tablename__ = "chat_sessions"

    id = Column(String, primary_key=True, default=generate_id)
    story_id = Column(String, nullable=False, index=True)  # Neo4j Story ID
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False, index=True)
    message_count = Column(Integer, default=0, nullable=False)
    cost = Column(Integer, default=10, nullable=False)  # Credits spent to unlock
    status = Column(Enum(ChatSessionStatus), default=ChatSessionStatus.active, nullable=False)
    unlocked_at = Column(DateTime(timezone=True), server_default=func.now())
    last_message_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class EventSubmission(Base):
    """User-submitted events pending processing"""
    __tablename__ = "event_submissions"

    id = Column(String, primary_key=True, default=generate_id)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    content = Column(Text, nullable=False)  # User's description of the event
    urls = Column(Text, nullable=True)  # Comma-separated URLs extracted from content

    # Status tracking (follows classic_app pattern)
    status = Column(String, default="pending")  # pending, extracting, completed, failed, blocked
    task_id = Column(String, nullable=True)  # Task ID for polling extraction status

    # Story matching (JSON stored as Text, parsed in application)
    # Format: {"story_id": str, "is_new": bool, "match_score": float, "matched_story_title": str}
    story_match = Column(Text, nullable=True)

    # Preview metadata (JSON stored as Text)
    # Format: {"title": str, "description": str, "thumbnail_url": str, "site_name": str}
    preview_meta = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    processed_at = Column(DateTime(timezone=True), nullable=True)
