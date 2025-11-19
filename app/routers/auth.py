"""
Authentication API router with Google OAuth and JWT
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse, JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.auth.google_oauth import get_google_oauth
from app.auth.session import create_access_token
from app.auth.middleware import get_current_user_optional
from app.database.connection import get_db
from app.database.repositories.user_repo import UserRepository
from app.models.user import UserCreate, UserResponse, UserPublic
from app.config import get_settings

settings = get_settings()
router = APIRouter(prefix="/api/auth", tags=["authentication"])


@router.get("/login")
async def login(request: Request):
    """
    Initiate Google OAuth login flow

    Redirects user to Google consent screen
    """
    google = get_google_oauth()
    redirect_uri = settings.google_redirect_uri

    return await google.authorize_redirect(request, redirect_uri)


@router.get("/callback")
async def auth_callback(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    OAuth callback handler

    Google redirects here after user authorization
    Creates/updates user and issues session token
    """
    try:
        google = get_google_oauth()

        # Exchange authorization code for user info
        token = await google.authorize_access_token(request)
        user_info = token.get('userinfo')

        if not user_info:
            raise HTTPException(status_code=400, detail="Failed to get user info from Google")

        # Extract user data
        google_id = user_info.get('sub')
        email = user_info.get('email')
        name = user_info.get('name')
        picture = user_info.get('picture')

        if not google_id or not email:
            raise HTTPException(status_code=400, detail="Invalid user info from Google")

        # Create or update user
        user_repo = UserRepository(db)
        user = await user_repo.get_by_google_id(google_id)

        if not user:
            # Create new user
            user_create = UserCreate(
                email=email,
                name=name or email.split('@')[0],
                picture=picture,
                google_id=google_id
            )
            user = await user_repo.create(user_create)
        else:
            # Update last login
            await user_repo.update_last_login(user.id)

        # Create JWT token
        access_token = create_access_token(user)

        # Redirect to app with token in cookie
        response = RedirectResponse(url="/app")
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            max_age=settings.jwt_expire_minutes * 60,
            samesite="lax",
            secure=False  # Set to True in production with HTTPS
        )

        return response

    except Exception as e:
        print(f"OAuth callback error: {e}")
        raise HTTPException(status_code=500, detail="Authentication failed")


@router.get("/logout")
async def logout():
    """
    Logout user

    Clears session cookie
    """
    response = RedirectResponse(url="/")
    response.delete_cookie(key="access_token")
    return response


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[UserPublic] = Depends(get_current_user_optional)
):
    """
    Get current authenticated user info

    Returns 401 if not authenticated
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Fetch full user details from database
    user_repo = UserRepository(db)
    user = await user_repo.get_by_id(current_user.id)

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return UserResponse.model_validate(user)


@router.get("/status")
async def auth_status(
    current_user: Optional[UserPublic] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """
    Check authentication status

    Returns user info if authenticated, null if not
    """
    if current_user:
        # Get full user data from database
        user_repo = UserRepository(db)
        user = await user_repo.get_by_id(current_user.id)

        if user:
            return {
                "authenticated": True,
                "user": UserResponse.model_validate(user)
            }

    return {
        "authenticated": False,
        "user": None
    }
