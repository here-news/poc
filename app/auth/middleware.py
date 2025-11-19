"""
Authentication middleware and dependencies
"""

from fastapi import Request, Depends, HTTPException
from jose import JWTError
from typing import Optional

from .session import decode_access_token
from app.models.user import UserPublic


async def get_current_user_optional(request: Request) -> Optional[UserPublic]:
    """
    Get current user from JWT token (optional - doesn't raise if not authenticated)

    Returns:
        UserPublic if authenticated, None otherwise
    """
    # Try to get token from cookie
    token = request.cookies.get("access_token")

    if not token:
        return None

    try:
        # Decode JWT
        payload = decode_access_token(token)

        # Create UserPublic from payload
        user = UserPublic(
            id=payload.get("sub"),
            email=payload.get("email"),
            name=payload.get("name"),
            picture=None  # Not stored in JWT
        )

        return user

    except JWTError:
        return None


async def get_current_user(
    user: Optional[UserPublic] = Depends(get_current_user_optional)
) -> UserPublic:
    """
    Get current user (required - raises 401 if not authenticated)

    Returns:
        UserPublic

    Raises:
        HTTPException 401 if not authenticated
    """
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    return user
