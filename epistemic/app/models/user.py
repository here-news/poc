"""
User data models
"""

from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    """Base user fields"""
    email: EmailStr
    name: Optional[str] = None
    picture: Optional[str] = None


class UserCreate(UserBase):
    """User creation model"""
    google_id: str


class UserInDB(UserBase):
    """User model as stored in database"""
    id: str
    google_id: str
    created_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserPublic(BaseModel):
    """Public user info (safe to expose in API)"""
    id: str
    name: Optional[str] = None
    picture: Optional[str] = None

    class Config:
        from_attributes = True


class UserResponse(UserBase):
    """User info returned from API"""
    id: str
    created_at: datetime

    class Config:
        from_attributes = True
