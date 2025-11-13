"""
JWT session management
"""

from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
from ..config import get_settings
from ..models.user import UserInDB

settings = get_settings()


def create_access_token(user: UserInDB) -> str:
    """
    Create JWT access token for user

    Args:
        user: User object

    Returns:
        JWT token string
    """
    expires_delta = timedelta(minutes=settings.jwt_expire_minutes)
    expire = datetime.utcnow() + expires_delta

    to_encode = {
        "sub": user.id,
        "email": user.email,
        "name": user.name,
        "picture": user.picture,
        "exp": expire,
    }

    encoded_jwt = jwt.encode(
        to_encode,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm
    )
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    """
    Decode and validate JWT token

    Args:
        token: JWT token string

    Returns:
        Decoded payload dict or None if invalid
    """
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm]
        )
        return payload
    except JWTError:
        return None


def get_user_id_from_token(token: str) -> Optional[str]:
    """
    Extract user ID from JWT token

    Args:
        token: JWT token string

    Returns:
        User ID or None if invalid
    """
    payload = decode_access_token(token)
    if payload:
        return payload.get("sub")
    return None
