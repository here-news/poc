"""
Pydantic models for event submissions
"""

from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime


class EventSubmissionCreate(BaseModel):
    """Request model for creating an event submission"""
    content: str
    urls: Optional[str] = ""


class StoryMatch(BaseModel):
    """Story matching information"""
    story_id: str
    is_new: bool
    match_score: float
    matched_story_title: str


class PreviewMeta(BaseModel):
    """Preview metadata"""
    title: Optional[str] = None
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    site_name: Optional[str] = None


class EventSubmissionResponse(BaseModel):
    """Response model for event submission"""
    id: str
    user_id: str
    user_name: str
    user_picture: Optional[str]
    content: str
    urls: Optional[str]
    status: str  # pending, extracting, completed, failed, blocked
    task_id: Optional[str] = None
    story_match: Optional[StoryMatch] = None
    preview_meta: Optional[PreviewMeta] = None
    created_at: datetime

    class Config:
        from_attributes = True
