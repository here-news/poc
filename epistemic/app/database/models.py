"""
SQLAlchemy ORM models
"""

from sqlalchemy import Column, String, Text, DateTime, JSON, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .connection import Base
import uuid


def generate_id():
    """Generate unique ID"""
    return str(uuid.uuid4())


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

    # Relationships
    timeline_entries = relationship("TimelineEntry", back_populates="user", cascade="all, delete-orphan")


class TimelineEntry(Base):
    """Timeline entry ORM model"""
    __tablename__ = "timeline_entries"

    id = Column(String, primary_key=True, default=generate_id)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    content = Column(Text, nullable=False)
    link = Column(String)
    type = Column(String, nullable=False, default="share")
    metadata = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="timeline_entries")
