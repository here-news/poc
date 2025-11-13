"""
Authentication middleware and dependencies
"""

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from .session import decode_access_token
from ..models.user import UserPublic

security = HTTPBearer(auto_error=False)


async def get_current_user_optional(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[UserPublic]:
    """
    Get current user from JWT token (optional - doesn't raise if not authenticated)

    Usage:
        @app.get("/api/items")
        async def get_items(user: Optional[UserPublic] = Depends(get_current_user_optional)):
            if user:
                # User is logged in
            else:
                # Anonymous user
    """
    # Try to get token from cookie first
    token = request.cookies.get("access_token")

    # If not in cookie, try Authorization header
    if not token and credentials:
        token = credentials.credentials

    if not token:
        return None

    payload = decode_access_token(token)
    if not payload:
        return None

    return UserPublic(
        id=payload.get("sub"),
        name=payload.get("name"),
        picture=payload.get("picture")
    )


async def get_current_user(
    user: Optional[UserPublic] = Depends(get_current_user_optional)
) -> UserPublic:
    """
    Get current user from JWT token (required - raises 401 if not authenticated)

    Usage:
        @app.get("/api/protected")
        async def protected_route(user: UserPublic = Depends(get_current_user)):
            # User is guaranteed to be logged in here
            return {"user_id": user.id}
    """
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user
