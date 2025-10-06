from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

from typing import Optional

from services.task_store import task_store, TaskStatus
from services.pubsub_publisher import pubsub_publisher

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

# API endpoints
@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

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
        "created_at": task.created_at,
        "completed_at": task.completed_at,
        "token_costs": task.token_costs,
        "gcs_paths": task.gcs_paths,
        "user_id": task.user_id
    }

    if task.status == TaskStatus.COMPLETED:
        response["result"] = task.result
    elif task.status == TaskStatus.FAILED:
        response["error"] = task.error

    return response

@app.post("/api/task/{task_id}/clean")
async def clean_task_content(task_id: str):
    """Clean/validate the extracted content"""
    task = task_store.get_task(task_id)

    if not task:
        return {"error": "Task not found"}, 404

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

    if task.status != TaskStatus.COMPLETED:
        return {
            "task_id": task_id,
            "status": task.status,
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

# Serve static files and React app
app.mount("/assets", StaticFiles(directory="dist/assets"), name="assets")

@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    """Serve the React SPA for all routes"""
    return FileResponse("dist/index.html")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=9494)
