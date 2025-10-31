from fastapi import FastAPI, Request, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import httpx
import os
from openai import OpenAI

from typing import Optional, List, Dict

from services.task_store import task_store, TaskStatus
from services.pubsub_publisher import pubsub_publisher
from services.neo4j_client import neo4j_client

# Load environment variables
BACKEND_SERVICE_URL = os.getenv('BACKEND_SERVICE_URL', 'https://story-engine-here-3n5yrhhfpa-uc.a.run.app')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

# Initialize OpenAI client
openai_client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request models
class URLSubmission(BaseModel):
    url: str
    user_id: Optional[str] = None

class SeedSubmission(BaseModel):
    content: str
    user_id: Optional[str] = None

class StorySearchRequest(BaseModel):
    query: str
    limit: Optional[int] = 5

class StoryChatMessage(BaseModel):
    message: str
    conversation_history: Optional[List[Dict[str, str]]] = []

# API endpoints
@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

@app.get("/api/stories/{story_id}")
async def get_story_by_id(story_id: str):
    """
    Get a single story by ID with full metadata

    Returns:
        Story summary with counts, locations, confidence, etc.
    """
    try:
        story = neo4j_client.get_story_by_id(story_id)

        if not story:
            return {"error": f"Story {story_id} not found"}, 404

        return {
            "success": True,
            "story": story
        }
    except Exception as e:
        print(f"Error fetching story {story_id}: {e}")
        return {
            "success": False,
            "error": str(e)
        }, 500

@app.post("/api/story/{story_id}/chat")
async def chat_with_story(story_id: str, chat_message: StoryChatMessage):
    """
    Chat about a specific story using OpenAI.
    Loads story context including title, description, content, and claims.

    Args:
        story_id: The story ID
        chat_message: Contains user message and optional conversation history

    Returns:
        AI-generated response based on story context
    """
    if not openai_client:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")

    try:
        # Get story data
        story = neo4j_client.get_story_by_id(story_id)
        if not story:
            raise HTTPException(status_code=404, detail=f"Story {story_id} not found")

        # Get claims associated with this story's artifacts
        claims = _get_story_claims(story_id)

        # Build context for the LLM
        context = _build_story_context(story, claims)

        # Build conversation messages
        messages = [
            {
                "role": "system",
                "content": f"""You are a helpful assistant that answers questions about news stories based on verified information.

Story Context:
{context}

Guidelines:
- Answer questions based only on the provided story information
- Be factual and cite specific claims when relevant
- If information isn't in the story, say so clearly
- Keep responses concise but informative
- Maintain a neutral, journalistic tone"""
            }
        ]

        # Add conversation history if provided
        if chat_message.conversation_history:
            messages.extend(chat_message.conversation_history)

        # Add current user message
        messages.append({
            "role": "user",
            "content": chat_message.message
        })

        # Call OpenAI API (using gpt-4o-mini for cost efficiency)
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=0.7,
            max_tokens=500
        )

        assistant_message = response.choices[0].message.content

        return {
            "success": True,
            "response": assistant_message,
            "story_id": story_id
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in story chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def _get_story_claims(story_id: str) -> List[Dict]:
    """Get all claims associated with a story's artifacts."""
    if not neo4j_client.connected:
        neo4j_client._connect()
    if not neo4j_client.connected:
        return []

    cypher = """
    MATCH (story:Story {id: $story_id})-[:HAS_ARTIFACT]->(artifact)
    OPTIONAL MATCH (artifact)-[:HAS_CLAIM]->(claim:Claim)
    WHERE claim IS NOT NULL
    RETURN claim.text as text,
           claim.confidence as confidence,
           claim.type as type,
           claim.created_at as created_at
    ORDER BY claim.created_at DESC
    """

    with neo4j_client.driver.session(database=neo4j_client.database) as session:
        result = session.run(cypher, story_id=story_id)
        claims = []
        for record in result:
            if record["text"]:
                claims.append({
                    "text": record["text"],
                    "confidence": record.get("confidence"),
                    "type": record.get("type")
                })
        return claims

def _build_story_context(story: Dict, claims: List[Dict]) -> str:
    """Build formatted context string for the LLM."""
    context_parts = []

    # Title and description
    context_parts.append(f"Title: {story.get('title', 'Untitled')}")
    if story.get('description'):
        context_parts.append(f"\nSummary: {story['description']}")

    # Full content if available
    if story.get('content'):
        # Truncate if too long (keep first 2000 chars)
        content = story['content'][:2000]
        if len(story['content']) > 2000:
            content += "... [truncated]"
        context_parts.append(f"\nContent: {content}")

    # Claims
    if claims:
        context_parts.append(f"\n\nVerified Claims ({len(claims)}):")
        for i, claim in enumerate(claims[:10], 1):  # Limit to 10 claims
            context_parts.append(f"{i}. {claim['text']}")

    # Metadata
    metadata = []
    if story.get('artifact_count'):
        metadata.append(f"{story['artifact_count']} sources")
    if story.get('people_count'):
        metadata.append(f"{story['people_count']} people mentioned")
    if metadata:
        context_parts.append(f"\n\nMetadata: {', '.join(metadata)}")

    return '\n'.join(context_parts)

@app.get("/api/stories")
async def get_stories(
    limit: int = 10,
    offset: int = 0,
    min_coherence: float = 0.0,
    max_coherence: float = 1.0
):
    """
    Get recent stories from Neo4j graph database

    Args:
        limit: Number of stories to return (default 10)
        offset: Number of stories to skip for pagination (default 0)
        min_coherence: Minimum coherence score (0-1, default 0.0)
        max_coherence: Maximum coherence score (0-1, default 1.0)

    Returns list of story nodes with metadata
    """
    try:
        summaries = neo4j_client.get_story_summaries(
            limit=limit,
            offset=offset,
            min_coherence=min_coherence,
            max_coherence=max_coherence
        )

        category_map = {}
        for story in summaries:
            category = story.get('category', 'global') or 'global'
            category_map.setdefault(category, []).append(story)

        return {
            "stories": summaries,
            "categories": category_map,
            "total": len(summaries)
        }
    except Exception as e:
        print(f"Error fetching stories from Neo4j: {e}")
        return {
            "stories": [],
            "categories": {},
            "total": 0,
            "error": str(e)
        }

@app.post("/api/stories/search")
async def search_stories(payload: StorySearchRequest):
    try:
        matches = neo4j_client.search_story_summaries(
            query=payload.query,
            limit=payload.limit or 5
        )

        category_map = {}
        for story in matches:
            category = story.get('category', 'global') or 'global'
            category_map.setdefault(category, []).append(story)

        return {
            "matches": matches,
            "categories": category_map,
            "total": len(matches)
        }
    except Exception as e:
        print(f"Error searching stories: {e}")
        return {
            "matches": [],
            "categories": {},
            "total": 0,
            "error": str(e)
        }

@app.get("/api/check")
async def check_cached_url(url: str):
    """
    Check if URL has a recent cached extraction result (lightweight cache lookup)

    Returns:
        - 200 with cached data if found (within 24 hours)
        - 404 if no cache available

    This endpoint provides instant results for previously extracted URLs,
    avoiding the need to create a new task and wait for extraction.
    """
    # Check for recent completed task with same URL
    existing_task = task_store.find_recent_task_by_url(url, max_age_hours=24)

    if existing_task and existing_task.status == TaskStatus.COMPLETED and existing_task.result:
        word_count = existing_task.result.get("word_count", 0)
        if word_count > 50:  # Only return if it has real content
            print(f"💾 Cache hit for {url} (task {existing_task.task_id})")
            return {
                "cache_hit": True,
                "task_id": existing_task.task_id,
                "url": existing_task.url,
                "result": existing_task.result,
                "semantic_data": existing_task.semantic_data,
                "created_at": existing_task.created_at
            }

    return {"cache_hit": False, "message": "No cached result available"}

@app.post("/api/seed")
async def seed_thread(submission: SeedSubmission, request: Request):
    """
    Seed a thread - parse input, extract URLs, and trigger extraction if needed

    Flow:
    1. Parse content to detect URLs
    2. If URL found:
       - Check cache first (instant if hit)
       - Create extraction task if needed
       - Publish to Pub/Sub (Cloud Run will generate iFramely preview)
       - Return task_id for polling
    3. If text-only:
       - Return empty task_id
       - Frontend should search Neo4j for matches

    Returns immediately - frontend polls /api/task/{id} for preview updates
    """
    import re

    user_id = submission.user_id or request.headers.get('x-user-id')
    content = submission.content.strip()

    # Simple URL detection
    url_pattern = r'(https?://[^\s]+)'
    urls = re.findall(url_pattern, content)

    # Parse input type
    if not urls:
        # Text-only seed
        return {
            "seed_id": f"seed_{int(__import__('time').time() * 1000)}",
            "user_id": user_id,
            "type": "text_only",
            "text": content,
            "urls": [],
            "task_id": None
        }

    # URL detected - trigger extraction
    url = urls[0]  # Take first URL
    text_only = re.sub(url_pattern, '', content).strip()

    # Create extraction task
    task_id = task_store.create_task(url, user_id=user_id)

    # Publish to Pub/Sub for Cloud Run worker to process
    # Cloud Run will:
    # 1. Call iFramely to get quick preview
    # 2. Write preview_meta to Firestore
    # 3. Continue with full extraction
    pubsub_publisher.publish_extraction_job(task_id, url)

    return {
        "seed_id": f"seed_{int(__import__('time').time() * 1000)}",
        "user_id": user_id,
        "type": "url_only" if not text_only else "mixed",
        "text": text_only,
        "urls": urls,
        "task_id": task_id,
        "status": "submitted",
        "message": "Extraction job published to Cloud Run"
    }

@app.post("/api/extract")
async def extract_url(submission: URLSubmission, request: Request):
    """Submit URL for extraction - returns immediately with task_id"""
    user_id = submission.user_id or request.headers.get('x-user-id')

    # Create task in Firestore
    task_id = task_store.create_task(submission.url, user_id=user_id)

    # Publish to Pub/Sub for Cloud Run worker to process
    pubsub_publisher.publish_extraction_job(task_id, submission.url)

    return {
        "task_id": task_id,
        "status": "submitted",
        "message": "Extraction job published to Cloud Run",
        "user_id": user_id
    }

@app.post("/api/story/{story_id}/add-page")
async def add_page_to_story(story_id: str, submission: URLSubmission, request: Request):
    """
    Add page to story by calling Cloud Run service's /submit endpoint directly
    with target_story_id as a form parameter.

    This bypasses the webapp's task_store and directly calls the Cloud Run worker,
    which will handle task creation and linking to the specified story.

    Returns task_id for polling.
    """
    url = submission.url
    print(f"📌 Adding page to story {story_id}: {url}")

    # Call Cloud Run service's /submit endpoint with target_story_id as form parameter
    # This is the correct way per backend team's recommendation
    remote_url = "https://story-engine-here-179431661561.us-central1.run.app/submit"

    try:
        form_data = {
            "url": url,
            "target_story_id": story_id,
            "response_format": "json"
        }
        print(f"📤 Sending to {remote_url}")
        print(f"📤 Form data: {form_data}")

        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            response = await client.post(
                remote_url,
                data=form_data,
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )

            print(f"📥 Response status: {response.status_code}")
            print(f"📥 Response content-type: {response.headers.get('content-type')}")
            print(f"📥 Response body (first 500 chars): {response.text[:500]}")

            if response.status_code != 200:
                error_detail = response.text
                print(f"❌ Remote service error ({response.status_code}): {error_detail}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Remote service error: {error_detail}"
                )

            # Parse JSON response
            try:
                result = response.json()
                print(f"✓ Parsed result: {result}")

                task_id = result.get("task_id")
                if not task_id:
                    print(f"⚠️  Warning: No task_id in response: {result}")
                    raise HTTPException(
                        status_code=500,
                        detail="Remote service did not return a task_id"
                    )

                print(f"✓ Task created: {task_id} for story {story_id}")
                return {
                    "task_id": task_id,
                    "story_id": story_id,
                    "status": "submitted",
                    "message": f"Extraction job submitted. Will link to story when complete."
                }

            except Exception as json_err:
                print(f"❌ Failed to parse JSON response: {json_err}")
                raise HTTPException(
                    status_code=500,
                    detail="Invalid JSON response from remote service"
                )

    except httpx.TimeoutException:
        print(f"❌ Timeout calling remote service")
        raise HTTPException(
            status_code=504,
            detail="Request to remote service timed out"
        )

    except HTTPException:
        # Re-raise HTTPException without wrapping it
        raise

    except Exception as e:
        print(f"❌ Error calling remote service: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to submit to remote service: {str(e)}"
        )

@app.get("/api/task/{task_id}")
async def get_task_status(task_id: str):
    """Get extraction task status and result"""
    task = task_store.get_task(task_id)

    if not task:
        return {"error": "Task not found"}, 404

    response = {
        "task_id": task.task_id,
        "url": task.url,
        "status": task.status,
        "current_stage": task.current_stage,
        "created_at": task.created_at,
        "completed_at": task.completed_at,
        "token_costs": task.token_costs,
        "gcs_paths": task.gcs_paths,
        "user_id": task.user_id
    }

    # Include iFramely preview metadata if available (fast preview)
    if task.preview_meta:
        response["preview_meta"] = task.preview_meta

    if task.status == TaskStatus.COMPLETED:
        response["result"] = task.result
        # Include semantic data if available
        if task.semantic_data:
            response["semantic_data"] = task.semantic_data
        # Include manual_link_result if this was a manual link task
        if hasattr(task, 'manual_link_result') and task.manual_link_result:
            response["manual_link_result"] = task.manual_link_result
    elif task.status == TaskStatus.BLOCKED:
        response["result"] = task.result
        response["blocked"] = {
            "reason": task.result.get("blocked_reason") or task.error or "Blocked by site defenses",
            "markers": task.result.get("blocked_markers", [])
        }
        if task.error:
            response["error"] = task.error
    elif task.status == TaskStatus.FAILED:
        response["error"] = task.error

    # TODO: Add story_match field once extraction service supports it
    # This will be populated by the extraction service after semantization
    # response["story_match"] = task.story_match if hasattr(task, 'story_match') else None

    return response

@app.post("/api/task/{task_id}/clean")
async def clean_task_content(task_id: str):
    """Clean/validate the extracted content"""
    task = task_store.get_task(task_id)

    if not task:
        return {"error": "Task not found"}, 404

    if task.status == TaskStatus.BLOCKED:
        return {"error": "Task was blocked by site defenses and cannot be cleaned"}, 400

    if task.status != TaskStatus.COMPLETED:
        return {"error": "Task not completed yet"}, 400

    if not task.result:
        return {"error": "No result to clean"}, 400

    # Publish cleaning job to Cloud Run worker
    pubsub_publisher.publish_cleaning_job(task_id)

    return {
        "success": True,
        "message": "Cleaning job published to Cloud Run",
        "task_id": task_id
    }

@app.post("/api/task/{task_id}/resolve")
async def resolve_task_entities(task_id: str):
    """
    Resolve entities from cleaned content using NER + Wikidata linking

    This should be called AFTER /clean and BEFORE /semantize
    """
    task = task_store.get_task(task_id)

    if not task:
        return {"error": "Task not found"}, 404

    if task.status == TaskStatus.BLOCKED:
        return {"error": "Task was blocked by site defenses and cannot be resolved"}, 400

    if task.status != TaskStatus.COMPLETED:
        return {"error": "Task not completed yet"}, 400

    if not task.result:
        return {"error": "No result to resolve entities from"}, 400

    # Publish resolution job to Cloud Run worker
    pubsub_publisher.publish_resolution_job(task_id)

    return {
        "success": True,
        "message": "Entity resolution job published to Cloud Run",
        "task_id": task_id
    }

@app.post("/api/task/{task_id}/semantize")
async def semantize_task_content(task_id: str):
    """Extract semantic claims from cleaned content"""
    task = task_store.get_task(task_id)

    if not task:
        return {"error": "Task not found"}, 404

    if task.status == TaskStatus.BLOCKED:
        return {"error": "Task was blocked by site defenses and cannot be semantized"}, 400

    if task.status != TaskStatus.COMPLETED:
        return {"error": "Task not completed yet"}, 400

    if not task.result:
        return {"error": "No result to semantize"}, 400

    # Publish semantization job to Cloud Run worker
    pubsub_publisher.publish_semantization_job(task_id)

    return {
        "success": True,
        "message": "Semantization job published to Cloud Run",
        "task_id": task_id
    }

@app.get("/api/task/{task_id}/preview")
async def get_task_preview(task_id: str):
    """
    Get frontend-optimized preview data for display

    Returns:
    - Article card data (title, image, description)
    - Metadata badges (language, section, tags)
    - Quality indicators (flags, confidence scores)
    - Social links (publisher profiles)
    """
    task = task_store.get_task(task_id)

    if not task:
        return {"error": "Task not found"}, 404

    if task.status == TaskStatus.BLOCKED:
        return {
            "task_id": task_id,
            "status": task.status,
            "current_stage": task.current_stage,
            "preview_available": False,
            "blocked": {
                "reason": task.result.get("blocked_reason") if task.result else task.error,
                "markers": task.result.get("blocked_markers", []) if task.result else []
            }
        }

    # If task has iFramely preview but not yet completed, return early preview
    if task.status != TaskStatus.COMPLETED:
        if task.preview_meta:
            # Return iFramely preview data
            return {
                "task_id": task_id,
                "status": task.status,
                "current_stage": task.current_stage,
                "preview_available": True,
                "preview_source": "iframely",
                "title": task.preview_meta.get("title", ""),
                "description": task.preview_meta.get("description", ""),
                "preview_image": {
                    "url": task.preview_meta.get("thumbnail_url", ""),
                    "secure_url": task.preview_meta.get("thumbnail_url", ""),
                    "width": None,
                    "height": None
                },
                "url": task.preview_meta.get("canonical_url", task.url),
                "domain": task.url.split('/')[2] if '://' in task.url else "",
                "author": {
                    "name": task.preview_meta.get("author", ""),
                },
                "publisher": {
                    "name": task.preview_meta.get("site_name", ""),
                },
                "metadata": {
                    "publish_date": task.preview_meta.get("published_date", ""),
                },
                "processing": {
                    "response_time_ms": task.preview_meta.get("response_time_ms", 0)
                }
            }
        else:
            return {
                "task_id": task_id,
                "status": task.status,
                "current_stage": task.current_stage,
                "preview_available": False
            }

    result = task.result or {}

    # Extract Open Graph metadata (with backwards compatibility)
    og_meta = result.get('og_metadata', {})
    article_meta = result.get('article_metadata', {})
    twitter_meta = result.get('twitter_metadata', {})
    jsonld_meta = result.get('jsonld_metadata', {})

    # Debug logging for missing metadata (informational only - normal for simple pages)
    if not og_meta and not article_meta:
        print(f"ℹ️  Task {task_id} has minimal metadata (page may lack Open Graph tags)")

    # Build frontend-optimized response
    preview = {
        # Card display
        "title": result.get('title', ''),
        "description": result.get('meta_description', ''),
        "preview_image": _get_preview_image(og_meta, jsonld_meta),
        "url": result.get('canonical_url', result.get('url', '')),
        "domain": result.get('domain', ''),

        # Publisher info
        "publisher": {
            "name": og_meta.get('site_name', result.get('domain', '')),
            "favicon": f"https://www.google.com/s2/favicons?domain={result.get('domain', '')}&sz=32",
            "facebook": article_meta.get('publisher', '') if article_meta.get('publisher', '').startswith('http') else '',
            "twitter": twitter_meta.get('site', '')
        },

        # Author info
        "author": {
            "name": result.get('author', ''),
            "facebook": article_meta.get('author', '') if article_meta.get('author', '').startswith('http') else '',
            "twitter": twitter_meta.get('creator', '')
        },

        # Metadata badges
        "metadata": {
            "language": result.get('language', ''),
            "language_name": _get_language_name(result.get('language', '')),
            "locale": og_meta.get('locale', ''),
            "publish_date": result.get('publish_date', ''),
            "section": article_meta.get('section', ''),
            "tags": article_meta.get('tags', []),
            "content_type": og_meta.get('type', 'article')
        },

        # Content metrics
        "metrics": {
            "word_count": result.get('word_count', 0),
            "reading_time_minutes": result.get('reading_time_minutes', 0),
            "language_confidence": result.get('language_confidence', 0.0)
        },

        # Quality indicators
        "quality": {
            "flags": result.get('flags', []),
            "is_readable": result.get('is_readable', True),
            "status": result.get('status', 'readable')
        },

        # Processing info
        "processing": {
            "extraction_timestamp": result.get('extraction_timestamp', ''),
            "processing_time_ms": result.get('processing_time_ms', 0),
            "token_costs": task.token_costs
        },

        # GCS paths (for downloading artifacts)
        "artifacts": task.gcs_paths if task.gcs_paths else {}
    }

    return preview

def _get_preview_image(og_meta: dict, jsonld_meta: dict) -> dict:
    """Extract preview image with dimensions"""
    # Priority: Open Graph image (most reliable)
    og_image = og_meta.get('image', {})
    if isinstance(og_image, dict) and og_image.get('url'):
        return {
            "url": og_image.get('url', ''),
            "secure_url": og_image.get('secure_url', og_image.get('url', '')),
            "width": int(og_image.get('width', 0)) if og_image.get('width') else None,
            "height": int(og_image.get('height', 0)) if og_image.get('height') else None
        }

    # Fallback: JSON-LD image
    jsonld_image = jsonld_meta.get('image', '')
    if jsonld_image:
        return {
            "url": jsonld_image,
            "secure_url": jsonld_image,
            "width": None,
            "height": None
        }

    return {
        "url": '',
        "secure_url": '',
        "width": None,
        "height": None
    }

@app.get("/api/task/{task_id}/debug")
async def debug_task_metadata(task_id: str):
    """
    Debug endpoint to see what metadata was extracted

    Useful for troubleshooting missing metadata fields
    """
    task = task_store.get_task(task_id)

    if not task:
        return {"error": "Task not found"}, 404

    result = task.result or {}

    return {
        "task_id": task_id,
        "status": task.status,
        "result_keys": list(result.keys()),
        "has_rich_metadata": {
            "og_metadata": bool(result.get('og_metadata')),
            "article_metadata": bool(result.get('article_metadata')),
            "twitter_metadata": bool(result.get('twitter_metadata')),
            "jsonld_metadata": bool(result.get('jsonld_metadata'))
        },
        "og_metadata": result.get('og_metadata', {}),
        "article_metadata": result.get('article_metadata', {}),
        "twitter_metadata": result.get('twitter_metadata', {}),
        "jsonld_metadata": result.get('jsonld_metadata', {}),
        "basic_fields": {
            "title": result.get('title', ''),
            "author": result.get('author', ''),
            "publish_date": result.get('publish_date', ''),
            "language": result.get('language', ''),
            "domain": result.get('domain', '')
        }
    }

@app.get("/api/story/{story_id}")
async def get_story_details(story_id: str):
    """
    Get detailed information about a specific story

    Returns story metadata, metrics, and current summary
    """
    try:
        story = neo4j_client.get_story_by_id(story_id)

        if not story:
            return {"error": "Story not found"}, 404

        return {
            "id": story.get('id'),
            "title": story.get('title'),
            "description": story.get('description'),
            "category": story.get('category', 'global'),
            "artifact_count": story.get('artifact_count', 0),
            "claim_count": story.get('claim_count', 0),
            "people_count": story.get('people_count', 0),
            "locations": story.get('locations', []),
            "last_updated_human": story.get('last_updated_human', 'recently'),
            "cover_image": story.get('cover_image'),
            "health_indicator": story.get('health_indicator'),
            "entropy": story.get('entropy', 0.45),
            "verified_claims": story.get('verified_claims', story.get('claim_count', 0)),
            "total_claims": story.get('total_claims', story.get('claim_count', 0) * 2),
            "confidence": story.get('confidence', 72),
            "revision": story.get('revision', 'v0.45')
        }
    except Exception as e:
        print(f"Error fetching story {story_id}: {e}")
        return {"error": str(e)}, 500

@app.get("/api/story/{story_id}/graph")
async def get_story_graph(story_id: str):
    """
    Get the evidence graph for a story showing story -> claims -> artifacts

    Returns nodes and edges for visualization
    """
    try:
        graph_data = neo4j_client.get_story_graph(story_id)

        if not graph_data:
            return {"error": "Story graph not found"}, 404

        return graph_data
    except Exception as e:
        print(f"Error fetching story graph {story_id}: {e}")
        return {"error": str(e)}, 500

@app.get("/api/entity")
async def get_entity_by_name(name: str = None, domain: str = None):
    """
    Get entity details by canonical name or domain

    Query params:
        name: Entity canonical name (e.g., "Sam Altman", "OpenAI")
        domain: Entity domain (e.g., "apnews.com", "reuters.com") - for organizations

    Returns:
        Entity metadata including type, description, Wikidata QID, confidence
    """
    try:
        if domain:
            entity = neo4j_client.get_entity_by_domain(domain)
        elif name:
            entity = neo4j_client.get_entity_by_name(name)
        else:
            raise HTTPException(status_code=400, detail="Either 'name' or 'domain' parameter is required")

        if not entity:
            identifier = domain if domain else name
            raise HTTPException(status_code=404, detail=f"Entity '{identifier}' not found")

        return entity
    except HTTPException:
        raise
    except Exception as e:
        identifier = domain if domain else name
        print(f"Error fetching entity '{identifier}': {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/entity/{entity_id}")
async def get_entity_by_id(entity_id: str):
    """
    Get entity details by canonical_id

    Path params:
        entity_id: Entity canonical_id (e.g., "person_a1b2c3", "org_x4y5z6")

    Returns:
        Entity metadata including type, description, Wikidata QID, confidence, mentions
    """
    try:
        entity = neo4j_client.get_entity_by_id(entity_id)

        if not entity:
            return {"error": f"Entity '{entity_id}' not found"}, 404

        return entity
    except Exception as e:
        print(f"Error fetching entity '{entity_id}': {e}")
        return {"error": str(e)}, 500

@app.get("/api/entity/{entity_id}/stories")
async def get_entity_stories(entity_id: str):
    """
    Get stories related to an entity

    Path params:
        entity_id: Entity canonical_id

    Returns:
        List of stories that mention this entity
    """
    try:
        stories = neo4j_client.get_entity_stories(entity_id)

        return {
            "entity_id": entity_id,
            "stories": stories,
            "total": len(stories)
        }
    except Exception as e:
        print(f"Error fetching stories for entity '{entity_id}': {e}")
        return {"error": str(e)}, 500

def _get_language_name(lang_code: str) -> str:
    """Convert ISO 639-1 code to readable language name"""
    language_names = {
        'en': 'English',
        'es': 'Spanish',
        'fr': 'French',
        'de': 'German',
        'zh-cn': 'Chinese (Simplified)',
        'zh-tw': 'Chinese (Traditional)',
        'ja': 'Japanese',
        'ko': 'Korean',
        'ar': 'Arabic',
        'pt': 'Portuguese',
        'ru': 'Russian',
        'it': 'Italian',
        'nl': 'Dutch',
        'pl': 'Polish',
        'tr': 'Turkish',
        'vi': 'Vietnamese',
        'th': 'Thai',
        'id': 'Indonesian',
        'he': 'Hebrew',
        'hi': 'Hindi'
    }
    return language_names.get(lang_code.lower(), lang_code.upper())

# Builder interface endpoints
@app.get("/api/builder/stories")
async def get_builder_stories():
    """
    Get list of all stories for builder interface

    Returns:
        List of stories with basic metadata sorted by last activity
    """
    try:
        stories = neo4j_client.get_builder_stories()
        return stories
    except Exception as e:
        print(f"Error fetching builder stories: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/builder/story/{story_id}")
async def get_builder_story(story_id: str):
    """
    Get detailed story data for builder interface

    Returns story with claims grouped into threads, sources, and entities
    """
    try:
        story_data = neo4j_client.get_builder_story(story_id)

        if not story_data:
            raise HTTPException(status_code=404, detail=f"Story {story_id} not found")

        return story_data
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching builder story {story_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Builder interface UI route
@app.get("/build/{story_id}")
async def serve_builder(story_id: str):
    """Serve the builder interface for a specific story"""
    return FileResponse("templates/builder.html")

# Serve static files and React app
app.mount("/assets", StaticFiles(directory="dist/assets"), name="assets")

@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    """Serve the React SPA for all routes"""
    return FileResponse("dist/index.html")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=7272)
