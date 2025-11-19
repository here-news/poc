"""
Pydantic models for User
"""

from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional


class UserCreate(BaseModel):
    """Model for creating a user"""
    email: EmailStr
    name: str
    picture: Optional[str] = None
    google_id: str


class UserPublic(BaseModel):
    """Public user model (minimal info)"""
    id: str
    email: str
    name: str
    picture: Optional[str] = None

    model_config = {"from_attributes": True}


class UserResponse(BaseModel):
    """Full user response model"""
    id: str
    email: str
    name: str
    picture: Optional[str] = None
    google_id: str
    credits: int
    reputation: int
    created_at: datetime
    last_login: Optional[datetime] = None

    model_config = {"from_attributes": True}
