"""
Comment repository for database operations
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.models import Comment, User
from typing import List, Optional, Dict
from datetime import datetime


class CommentRepository:
    """Repository for comment CRUD operations"""

    @staticmethod
    async def create_comment(
        db: AsyncSession,
        story_id: str,
        user_id: str,
        text: str,
        parent_comment_id: Optional[str] = None,
        reaction_type: Optional[str] = None
    ) -> Comment:
        """
        Create a new comment

        Args:
            db: Database session
            story_id: Neo4j Story ID
            user_id: User ID
            text: Comment text
            parent_comment_id: Parent comment ID for threading
            reaction_type: 'support', 'refute', 'question', 'comment'

        Returns:
            Created Comment object
        """
        comment = Comment(
            story_id=story_id,
            user_id=user_id,
            text=text,
            parent_comment_id=parent_comment_id,
            reaction_type=reaction_type
        )

        db.add(comment)
        await db.commit()
        await db.refresh(comment)

        return comment

    @staticmethod
    async def get_comments_for_story(
        db: AsyncSession,
        story_id: str
    ) -> List[Dict]:
        """
        Get all comments for a story with user information

        Args:
            db: Database session
            story_id: Neo4j Story ID

        Returns:
            List of comment dictionaries with user info
        """
        query = (
            select(Comment, User)
            .join(User, Comment.user_id == User.user_id)
            .where(Comment.story_id == story_id)
            .order_by(Comment.created_at.asc())
        )

        result = await db.execute(query)
        rows = result.all()

        comments = []
        for comment, user in rows:
            comments.append({
                'id': comment.id,
                'story_id': comment.story_id,
                'user_id': str(comment.user_id),
                'user_name': user.name,
                'user_picture': user.picture_url,
                'user_email': user.email,
                'text': comment.text,
                'parent_comment_id': comment.parent_comment_id,
                'reaction_type': comment.reaction_type,
                'created_at': comment.created_at.isoformat() if comment.created_at else None,
                'updated_at': comment.updated_at.isoformat() if comment.updated_at else None
            })

        return comments

    @staticmethod
    async def get_comment_by_id(
        db: AsyncSession,
        comment_id: str
    ) -> Optional[Comment]:
        """Get a single comment by ID"""
        query = select(Comment).where(Comment.id == comment_id)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def delete_comment(
        db: AsyncSession,
        comment_id: str,
        user_id: str
    ) -> bool:
        """
        Delete a comment (only if user is the author)

        Args:
            db: Database session
            comment_id: Comment ID
            user_id: User ID (must match comment author)

        Returns:
            True if deleted, False if not found or unauthorized
        """
        comment = await CommentRepository.get_comment_by_id(db, comment_id)

        if not comment or comment.user_id != user_id:
            return False

        await db.delete(comment)
        await db.commit()

        return True

    @staticmethod
    async def get_comment_count(
        db: AsyncSession,
        story_id: str
    ) -> int:
        """Get total comment count for a story"""
        query = select(Comment).where(Comment.story_id == story_id)
        result = await db.execute(query)
        return len(result.scalars().all())
