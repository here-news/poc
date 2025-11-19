"""
Coherence feed API router
"""

from fastapi import APIRouter, HTTPException, Body
from app.services.tcf_feed_service import TCFFeedService
from app.services.neo4j_client import neo4j_client
from typing import List, Dict

router = APIRouter(prefix="/api/coherence", tags=["coherence"])

# Create singleton feed service instance to reuse connections
feed_service = TCFFeedService()


@router.get("/feed")
async def get_feed(limit: int = 20, offset: int = 0, min_coherence: float = 0.0):
    """
    Get TCF-ranked story feed with pagination support

    Returns stories ranked by the TCF algorithm:
    - 70% Coherence (entity overlap + graph centrality + claims)
    - 20% Timeliness (recency with exponential decay)
    - 10% Funding (community credits, logarithmic)

    Args:
        limit: Number of stories to return (default 20, max 50)
        offset: Number of stories to skip for pagination (default 0)
        min_coherence: Minimum coherence score filter 0-100 (default 0.0)
    """
    try:
        # Limit maximum page size to prevent overload
        limit = min(limit, 50)

        # Use singleton feed service instance
        stories = feed_service.get_feed(limit=limit, offset=offset, min_coherence=min_coherence)
        return {
            "status": "success",
            "count": len(stories),
            "offset": offset,
            "limit": limit,
            "algorithm": "TCF (Timely-Coherence-Funding)",
            "weights": {"coherence": 0.7, "timely": 0.2, "funding": 0.1},
            "stories": stories
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch feed: {str(e)}")


@router.get("/stats")
async def get_stats():
    """Feed algorithm statistics and configuration"""
    return {
        "status": "success",
        "algorithm": "TCF (Timely-Coherence-Funding)",
        "version": "1.0.0",
        "weights": {
            "coherence": 0.7,
            "timely": 0.2,
            "funding": 0.1
        },
        "description": "Stories are ranked by epistemic coherence, prioritizing knowledge graph connections over popularity"
    }


@router.post("/search")
async def search_stories(
    query: str = Body(..., embed=True),
    limit: int = Body(5, embed=True)
):
    """
    Search stories by keyword

    Uses Neo4j search (substring + optional embeddings)
    """
    try:
        if not query or len(query.strip()) < 2:
            return {"matches": []}

        # Use Neo4j client's search function
        matches = neo4j_client.search_story_summaries(query.strip(), limit=limit)

        return {"matches": matches}

    except Exception as e:
        print(f"Search error: {e}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")
