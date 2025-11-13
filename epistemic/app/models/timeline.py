"""
Timeline entry data models
"""

from pydantic import BaseModel, HttpUrl
from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum


class TimelineEntryType(str, Enum):
    """Types of timeline entries"""
    SHARE = "share"
    COMMENT = "comment"
    EVIDENCE = "evidence"
    QUEST_SUBMISSION = "quest_submission"


class TimelineEntryCreate(BaseModel):
    """Create new timeline entry"""
    content: str
    link: Optional[str] = None
    type: TimelineEntryType = TimelineEntryType.SHARE
    metadata: Optional[Dict[str, Any]] = None


class TimelineEntryUpdate(BaseModel):
    """Update timeline entry"""
    content: Optional[str] = None
    link: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class TimelineEntryInDB(BaseModel):
    """Timeline entry as stored in database"""
    id: str
    user_id: str
    content: str
    link: Optional[str] = None
    type: TimelineEntryType
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TimelineEntryResponse(BaseModel):
    """Timeline entry returned from API"""
    id: str
    content: str
    link: Optional[str] = None
    type: TimelineEntryType
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    # Optionally include user info
    user: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True
