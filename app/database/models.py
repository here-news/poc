"""
SQLAlchemy ORM models
"""

from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, Enum
from sqlalchemy.sql import func
from .connection import Base
import uuid
import enum


def generate_id():
    """Generate unique ID"""
    return str(uuid.uuid4())


class ChatSessionStatus(str, enum.Enum):
    """Chat session status enum"""
    active = "active"
    exhausted = "exhausted"


class User(Base):
    """User ORM model"""
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_id)
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String)
    picture = Column(String)
    google_id = Column(String, unique=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login = Column(DateTime(timezone=True), onupdate=func.now())

    # Credits and reputation
    credits = Column(Integer, default=1000)  # Start with 1000 credits
    reputation = Column(Integer, default=0)


class Comment(Base):
    """Story comment/discussion model"""
    __tablename__ = "comments"

    id = Column(String, primary_key=True, default=generate_id)
    story_id = Column(String, nullable=False, index=True)  # Neo4j Story ID
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
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
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    message_count = Column(Integer, default=0, nullable=False)
    cost = Column(Integer, default=10, nullable=False)  # Credits spent to unlock
    status = Column(Enum(ChatSessionStatus), default=ChatSessionStatus.active, nullable=False)
    unlocked_at = Column(DateTime(timezone=True), server_default=func.now())
    last_message_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
