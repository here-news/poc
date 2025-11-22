"""
Comments API router
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.connection import get_db
from app.database.repositories.comment_repo import CommentRepository
from app.auth.middleware import get_current_user_optional
from app.models.user import UserPublic
from pydantic import BaseModel
from typing import Optional, List, Dict

router = APIRouter(prefix="/api/comments", tags=["comments"])


class CommentCreate(BaseModel):
    """Request model for creating a comment"""
    story_id: str
    text: str
    parent_comment_id: Optional[str] = None
    reaction_type: Optional[str] = None  # 'support', 'refute', 'question', 'comment'


class CommentResponse(BaseModel):
    """Response model for a comment"""
    id: str
    story_id: str
    user_id: str
    user_name: str
    user_picture: Optional[str]
    user_email: str
    text: str
    parent_comment_id: Optional[str]
    reaction_type: Optional[str]
    created_at: str
    updated_at: Optional[str]


@router.post("", response_model=CommentResponse)
async def create_comment(
    comment_data: CommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[UserPublic] = Depends(get_current_user_optional)
):
    """
    Create a new comment on a story

    Requires authentication
    """
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to post comments"
        )

    # Validate reaction_type
    if comment_data.reaction_type and comment_data.reaction_type not in ['support', 'refute', 'question', 'comment']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reaction_type. Must be one of: support, refute, question, comment"
        )

    try:
        # Create comment
        comment = await CommentRepository.create_comment(
            db=db,
            story_id=comment_data.story_id,
            user_id=current_user.user_id,
            text=comment_data.text,
            parent_comment_id=comment_data.parent_comment_id,
            reaction_type=comment_data.reaction_type
        )

        # Return comment with user info
        return CommentResponse(
            id=comment.id,
            story_id=comment.story_id,
            user_id=comment.user_id,
            user_name=current_user.name,
            user_picture=current_user.picture,
            user_email=current_user.email,
            text=comment.text,
            parent_comment_id=comment.parent_comment_id,
            reaction_type=comment.reaction_type,
            created_at=comment.created_at.isoformat(),
            updated_at=comment.updated_at.isoformat() if comment.updated_at else None
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create comment: {str(e)}"
        )


@router.get("/story/{story_id}", response_model=List[CommentResponse])
async def get_story_comments(
    story_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get all comments for a story

    Returns comments with user information, sorted by creation time
    """
    try:
        comments = await CommentRepository.get_comments_for_story(db, story_id)
        return comments

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch comments: {str(e)}"
        )


@router.delete("/{comment_id}")
async def delete_comment(
    comment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[UserPublic] = Depends(get_current_user_optional)
):
    """
    Delete a comment

    Only the comment author can delete their own comment
    """
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )

    success = await CommentRepository.delete_comment(
        db=db,
        comment_id=comment_id,
        user_id=current_user.user_id
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found or unauthorized"
        )

    return {"status": "success", "message": "Comment deleted"}


@router.get("/story/{story_id}/count")
async def get_comment_count(
    story_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get total comment count for a story"""
    try:
        count = await CommentRepository.get_comment_count(db, story_id)
        return {"story_id": story_id, "count": count}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get comment count: {str(e)}"
        )
