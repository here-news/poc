from fastapi import FastAPI, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

from services.extraction_manager import extraction_manager, TaskStatus
from services.universal_web_extractor import web_extractor
from services.content_validator import content_validator
from services.semantic_analyzer import semantic_analyzer
from services.gcs_persistence import initialize_gcs_persistence

# Initialize GCS persistence
gcs_persistence = initialize_gcs_persistence()

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

# Background task for extraction (without validation)
async def extract_url_background(task_id: str, url: str):
    """Background task to extract URL content"""
    try:
        extraction_manager.update_task_status(task_id, TaskStatus.PROCESSING)

        # Extract content
        print(f"🔍 Extracting: {url}")
        result = await web_extractor.extract_page(url)

        # Store screenshot_bytes separately before converting to dict
        task = extraction_manager.get_task(task_id)
        if task:
            task.screenshot_bytes = result.screenshot_bytes

        extraction_manager.set_task_result(task_id, result.to_dict())
        print(f"✅ Extraction completed")
    except Exception as e:
        print(f"❌ Extraction error: {e}")
        extraction_manager.set_task_error(task_id, str(e))

# API endpoints
@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

@app.post("/api/extract")
async def extract_url(submission: URLSubmission, background_tasks: BackgroundTasks):
    """Submit URL for extraction - returns immediately with task_id"""
    task_id = extraction_manager.create_task(submission.url)
    background_tasks.add_task(extract_url_background, task_id, submission.url)

    return {
        "task_id": task_id,
        "status": "submitted",
        "message": "Extraction started"
    }

@app.get("/api/task/{task_id}")
async def get_task_status(task_id: str):
    """Get extraction task status and result"""
    task = extraction_manager.get_task(task_id)

    if not task:
        return {"error": "Task not found"}, 404

    response = {
        "task_id": task.task_id,
        "url": task.url,
        "status": task.status,
        "created_at": task.created_at,
        "completed_at": task.completed_at,
        "token_costs": task.token_costs,
        "gcs_paths": task.gcs_paths
    }

    if task.status == TaskStatus.COMPLETED:
        response["result"] = task.result
    elif task.status == TaskStatus.FAILED:
        response["error"] = task.error

    return response

@app.post("/api/task/{task_id}/clean")
async def clean_task_content(task_id: str):
    """Clean/validate the extracted content"""
    task = extraction_manager.get_task(task_id)

    if not task:
        return {"error": "Task not found"}, 404

    if task.status != TaskStatus.COMPLETED:
        return {"error": "Task not completed yet"}, 400

    if not task.result:
        return {"error": "No result to clean"}, 400

    try:
        print(f"🧹 Cleaning content for task {task_id}")
        validation = await content_validator.validate_extraction(task.result)

        # Log flags if any
        if validation.flags:
            print(f"⚠️  Content flags: {', '.join(validation.flags)}")

        # Apply cleaned metadata to result
        if validation.cleaned_data:
            print(f"✅ Applying cleaned metadata")
            if "title" in validation.cleaned_data and validation.cleaned_data["title"]:
                task.result["title"] = validation.cleaned_data["title"]
            if "author" in validation.cleaned_data:
                task.result["author"] = validation.cleaned_data["author"]
            if "publish_date" in validation.cleaned_data:
                task.result["publish_date"] = validation.cleaned_data["publish_date"]
            if "meta_description" in validation.cleaned_data:
                task.result["meta_description"] = validation.cleaned_data["meta_description"]

        # Apply cleaned content
        if validation.cleaned_content:
            print(f"✅ Applying cleaned content")
            task.result["content_text"] = validation.cleaned_content
            # Recalculate word count
            words = validation.cleaned_content.split()
            task.result["word_count"] = len(words)
            task.result["reading_time_minutes"] = round(len(words) / 200, 1)

        # Track token usage
        if validation.token_usage:
            extraction_manager.add_token_cost(
                task_id,
                "cleaning",
                validation.token_usage.get("total_tokens", 0)
            )

        # Persist to GCS (forensic evidence) - only if GCS is available
        if gcs_persistence:
            try:
                print(f"💾 Persisting to GCS...")
                # Don't pass task_id - let it generate deterministic UUID from canonical URL
                gcs_paths = gcs_persistence.persist_extraction(
                    url=task.url,
                    extraction_result=task.result,
                    cleaned_content=validation.cleaned_content,
                    screenshot_bytes=task.screenshot_bytes,
                    task_id=None  # Generate from canonical URL for consistency
                )
                extraction_manager.set_gcs_paths(task_id, gcs_paths)
                print(f"✅ Persisted to GCS: {gcs_paths['artifact_id']} (deterministic from URL)")
            except Exception as e:
                print(f"⚠️  GCS persistence failed (non-blocking): {e}")
        else:
            print(f"⚠️  GCS persistence skipped (not initialized)")

        print(f"✅ Cleaning completed")
        return {
            "is_valid": True,
            "reason": validation.reason,
            "flags": validation.flags,
            "cleaned_data": validation.cleaned_data,
            "cleaned_content": validation.cleaned_content,
            "token_usage": validation.token_usage,
            "result": task.result
        }

    except Exception as e:
        print(f"❌ Cleaning error: {e}")
        return {"error": str(e)}, 500

@app.post("/api/task/{task_id}/semantize")
async def semantize_task_content(task_id: str):
    """Extract semantic claims from cleaned content"""
    task = extraction_manager.get_task(task_id)

    if not task:
        return {"error": "Task not found"}, 404

    if task.status != TaskStatus.COMPLETED:
        return {"error": "Task not completed yet"}, 400

    if not task.result:
        return {"error": "No result to semantize"}, 400

    try:
        print(f"🧠 Semantizing content for task {task_id}")

        # Prepare content for semantic analysis
        page_meta = {
            "title": task.result.get("title", ""),
            "byline": task.result.get("author", ""),
            "pub_time": task.result.get("publish_date", ""),
            "site": task.result.get("domain", "")
        }

        # Convert content to page_text format expected by semantic analyzer
        content_text = task.result.get("content_text", "")
        page_text = [{"selector": "#main-content", "text": content_text}]

        # Extract claims
        semantic_result = await semantic_analyzer.extract_enhanced_claims(
            page_meta=page_meta,
            page_text=page_text,
            url=task.result.get("canonical_url", task.url),
            lang="en"
        )

        # Store semantic data
        extraction_manager.set_semantic_data(task_id, semantic_result)

        # Track token usage
        if semantic_result.get('token_usage'):
            extraction_manager.add_token_cost(
                task_id,
                "semantization",
                semantic_result['token_usage'].get("total_tokens", 0)
            )

        admitted_count = len(semantic_result.get('claims', []))
        excluded_count = len(semantic_result.get('excluded_claims', []))
        print(f"✅ Semantization completed: {admitted_count} claims admitted, {excluded_count} excluded")

        return {
            "success": True,
            "semantic_data": semantic_result,
            "claims_count": admitted_count,
            "excluded_count": excluded_count,
            "token_usage": semantic_result.get('token_usage', {})
        }

    except Exception as e:
        print(f"❌ Semantization error: {e}")
        return {"error": str(e)}, 500

# Serve static files and React app
app.mount("/assets", StaticFiles(directory="dist/assets"), name="assets")

@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    """Serve the React SPA for all routes"""
    return FileResponse("dist/index.html")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=9494)
