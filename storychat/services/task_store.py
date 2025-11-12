"""
Task Store - Firestore-backed task management
Replaces in-memory ExtractionManager with persistent storage
"""
import os
import uuid
from datetime import datetime
from typing import Dict, Optional, Any, List
from enum import Enum
from google.cloud import firestore
from google.cloud import storage
from google.api_core.exceptions import NotFound


class TaskStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    BLOCKED = "blocked"


class ExtractionTask:
    """Task model matching the original ExtractionManager interface"""

    def __init__(self, data: dict):
        self.task_id = data.get("task_id")
        self.url = data.get("url")
        self.status = data.get("status", TaskStatus.PENDING)
        self.preview_meta = data.get("preview_meta")  # Quick iFramely metadata
        self.result = data.get("result")
        self.semantic_data = data.get("semantic_data")
        self.screenshot_bytes = None  # Not persisted in Firestore (too large)
        self.gcs_paths = data.get("gcs_paths")
        self.token_costs = data.get("token_costs", {
            "extraction": 0,
            "cleaning": 0,
            "resolution": 0,
            "semantization": 0,
            "total": 0
        })
        self.user_id = data.get("user_id")
        self.error = data.get("error")
        self.created_at = data.get("created_at")
        self.completed_at = data.get("completed_at")
        self.current_stage = data.get("current_stage", "pending")
        self.auto_chain = data.get("auto_chain", True)  # Default to True for backward compat
        self.story_match = data.get("story_match")  # Story matching result from Neo4j

        # Source quality tracking (Sprint 2)
        self.domain = data.get("domain")  # Extracted domain (e.g., 'bbc.com')
        self.source_quality = data.get("source_quality")  # Quality metadata
        self.extraction_attempts = data.get("extraction_attempts", [])  # Attempt history

        # Manual curation support
        self.target_story_id = data.get("target_story_id")  # Optional story override

        # Additional field for persistence retry tracking
        self.needs_persistence_retry = data.get("needs_persistence_retry", False)

    def get(self, key: str, default=None):
        """Dict-style access for backward compatibility"""
        return getattr(self, key, default)

    def __getitem__(self, key: str):
        """Dict-style subscript access for backward compatibility"""
        return getattr(self, key)

    def to_dict(self) -> dict:
        """Convert to Firestore-compatible dict"""
        return {
            "task_id": self.task_id,
            "url": self.url,
            "status": self.status,
            "current_stage": self.current_stage,
            "preview_meta": self.preview_meta,
            "result": self.result,
            "semantic_data": self.semantic_data,
            "gcs_paths": self.gcs_paths,
            "token_costs": self.token_costs,
            "error": self.error,
            "created_at": self.created_at,
            "completed_at": self.completed_at,
            "story_match": self.story_match,
            "domain": self.domain,
            "source_quality": self.source_quality,
            "extraction_attempts": self.extraction_attempts,
            "target_story_id": self.target_story_id,
            "needs_persistence_retry": self.needs_persistence_retry,
            "updated_at": firestore.SERVER_TIMESTAMP
        }


class TaskStore:
    """Firestore-backed task manager (drop-in replacement for ExtractionManager)"""

    def __init__(self, project_id: Optional[str] = None):
        """
        Initialize Firestore client

        Args:
            project_id: GCP project ID (defaults to FIRESTORE_PROJECT_ID env var)
        """
        self.project_id = project_id or os.getenv("FIRESTORE_PROJECT_ID")

        # Check if using emulator (for local dev)
        if os.getenv("FIRESTORE_EMULATOR_HOST"):
            print(f"🔧 Using Firestore emulator: {os.getenv('FIRESTORE_EMULATOR_HOST')}")
            self.db = firestore.Client(project=self.project_id or "test-project")
        else:
            self.db = firestore.Client(project=self.project_id)

        self.collection = self.db.collection("extraction_tasks")

    def create_task(self, url: str, task_id: Optional[str] = None, user_id: Optional[str] = None, auto_chain: bool = True, target_story_id: Optional[str] = None) -> str:
        """
        Create a new extraction task

        Args:
            url: URL to extract
            task_id: Optional custom task ID (for idempotency)
            user_id: Optional user ID
            auto_chain: Auto-trigger next stages (extraction→cleaning→resolution→semantization)
            target_story_id: Optional story ID to assign this page to (bypasses automatic matching)

        Returns:
            task_id
        """
        from urllib.parse import urlparse

        task_id = task_id or str(uuid.uuid4())

        # Extract domain from URL
        parsed = urlparse(url)
        domain = parsed.netloc.lower()
        # Remove 'www.' prefix if present
        if domain.startswith('www.'):
            domain = domain[4:]

        task_data = {
            "task_id": task_id,
            "url": url,
            "domain": domain,
            "status": TaskStatus.PENDING,
            "current_stage": "pending",
            "preview_meta": None,
            "result": None,
            "semantic_data": None,
            "gcs_paths": None,
            "token_costs": {
                "extraction": 0,
                "cleaning": 0,
                "resolution": 0,
                "semantization": 0,
                "total": 0
            },
            "user_id": user_id,
            "error": None,
            "created_at": datetime.now().isoformat(),
            "completed_at": None,
            "updated_at": firestore.SERVER_TIMESTAMP,
            "auto_chain": auto_chain,  # Control automatic stage progression
            "source_quality": None,  # Will be populated during extraction
            "extraction_attempts": [],
            "target_story_id": target_story_id  # Optional story ID for manual curation
        }

        self.collection.document(task_id).set(task_data)
        return task_id

    def get_task(self, task_id: str) -> Optional[ExtractionTask]:
        """Get task by ID"""
        try:
            doc = self.collection.document(task_id).get()
            if doc.exists:
                return ExtractionTask(doc.to_dict())
            return None
        except NotFound:
            return None

    def update_task_status(self, task_id: str, status: TaskStatus, stage: Optional[str] = None):
        """Update task status and optionally the current stage"""
        update_data = {
            "status": status,
            "updated_at": firestore.SERVER_TIMESTAMP
        }

        if stage:
            update_data["current_stage"] = stage

        # Only set completed_at for FAILED and BLOCKED
        # For COMPLETED status, use mark_completed_with_story() instead
        if status in [TaskStatus.FAILED, TaskStatus.BLOCKED]:
            update_data["completed_at"] = datetime.now().isoformat()

        self.collection.document(task_id).update(update_data)

    def mark_completed_with_story(self, task_id: str, story_match: Optional[dict] = None):
        """
        Mark task as completed after story matching finishes.
        This is the correct way to complete a task - it sets both status and completed_at.

        Args:
            task_id: Task ID
            story_match: Optional story match data from Neo4j persistence
        """
        update_data = {
            "status": TaskStatus.COMPLETED,
            "current_stage": "completed",
            "completed_at": datetime.now().isoformat(),
            "updated_at": firestore.SERVER_TIMESTAMP
        }

        if story_match:
            update_data["story_match"] = story_match

        self.collection.document(task_id).update(update_data)

    def set_preview_meta(self, task_id: str, preview_meta: dict):
        """Set preview metadata from iFramely (fast preview)"""
        self.collection.document(task_id).update({
            "preview_meta": preview_meta,
            "updated_at": firestore.SERVER_TIMESTAMP
        })

    def set_task_result(self, task_id: str, result: dict):
        """
        Set task extraction result (intermediate update, does NOT mark task as completed).
        This is called after extraction/cleaning/resolution stages.
        Use mark_completed_with_story() to mark task as fully completed.
        """
        self.collection.document(task_id).update({
            "result": result,
            "updated_at": firestore.SERVER_TIMESTAMP
        })

    def set_task_error(self, task_id: str, error: str):
        """Set task error"""
        update_data = {
            "error": error,
            "status": TaskStatus.FAILED,
            "completed_at": datetime.now().isoformat(),
            "updated_at": firestore.SERVER_TIMESTAMP
        }

        # Special handling for "No content available" errors
        if "No content available" in error:
            update_data["result"] = {
                "is_empty": True,
                "word_count": 0,
                "content_text": "",
                "error_message": error,
                "processing_time_ms": 0
            }

        self.collection.document(task_id).update(update_data)

    def set_semantic_data(self, task_id: str, semantic_data: dict):
        """Set semantic analysis data (claims, entities)"""
        self.collection.document(task_id).update({
            "semantic_data": semantic_data,
            "updated_at": firestore.SERVER_TIMESTAMP
        })

    def set_gcs_paths(self, task_id: str, gcs_paths: dict):
        """Set GCS artifact paths after persistence"""
        self.collection.document(task_id).update({
            "gcs_paths": gcs_paths,
            "updated_at": firestore.SERVER_TIMESTAMP
        })

    def add_token_cost(self, task_id: str, step: str, tokens: int):
        """Add token cost for a specific step"""
        task = self.get_task(task_id)
        if task:
            task.token_costs[step] = tokens
            # Recalculate total
            task.token_costs["total"] = sum(
                v for k, v in task.token_costs.items() if k != "total"
            )

            self.collection.document(task_id).update({
                "token_costs": task.token_costs,
                "updated_at": firestore.SERVER_TIMESTAMP
            })

    def update_result_field(self, task_id: str, field_path: str, value):
        """
        Update a specific field in the result dict

        Args:
            task_id: Task ID
            field_path: Field path (e.g. "result.title" or "result.resolved_entities")
            value: New value
        """
        self.collection.document(task_id).update({
            field_path: value,
            "updated_at": firestore.SERVER_TIMESTAMP
        })

    def update_fields(self, task_id: str, fields: dict):
        """
        Update multiple fields in the task document

        Args:
            task_id: Task ID
            fields: Dict of fields to update (e.g. {"story_match": {...}, "some_field": "value"})
        """
        fields["updated_at"] = firestore.SERVER_TIMESTAMP
        self.collection.document(task_id).update(fields)

    def mark_task_blocked(
        self,
        task_id: str,
        reason: str,
        *,
        markers: Optional[List[str]] = None,
        result_overrides: Optional[Dict[str, Any]] = None,
        semantic_data: Optional[Dict[str, Any]] = None
    ):
        """Mark a task as blocked by site defenses and persist optional metadata."""
        update_data: Dict[str, Any] = {
            "status": TaskStatus.BLOCKED,
            "current_stage": "blocked",
            "completed_at": datetime.now().isoformat(),
            "updated_at": firestore.SERVER_TIMESTAMP,
            "error": reason
        }

        if reason:
            update_data["result.blocked_reason"] = reason
        if markers is not None:
            update_data["result.blocked_markers"] = markers
        if result_overrides:
            for key, value in result_overrides.items():
                update_data[f"result.{key}"] = value
        if semantic_data is not None:
            update_data["semantic_data"] = semantic_data

        self.collection.document(task_id).update(update_data)

    def list_tasks(self, limit: int = 100, status: Optional[TaskStatus] = None):
        """
        List tasks (for debugging/admin)

        Args:
            limit: Maximum number of tasks to return
            status: Filter by status
        """
        query = self.collection.order_by("created_at", direction=firestore.Query.DESCENDING).limit(limit)

        if status:
            query = query.where("status", "==", status)

        docs = query.stream()
        return [ExtractionTask(doc.to_dict()) for doc in docs]

    def find_recent_task_by_url(self, url: str, max_age_hours: int = 24) -> Optional[ExtractionTask]:
        """
        Find a recent task for the same URL (for deduplication)

        Args:
            url: URL to search for
            max_age_hours: Maximum age in hours (default 24)

        Returns:
            Most recent task if found, None otherwise
        """
        from datetime import datetime, timedelta
        cutoff_time = (datetime.now() - timedelta(hours=max_age_hours)).isoformat()

        # Query for tasks with this URL created after cutoff
        query = (self.collection
                .where("url", "==", url)
                .where("created_at", ">=", cutoff_time)
                .order_by("created_at", direction=firestore.Query.DESCENDING)
                .limit(1))

        docs = list(query.stream())
        if docs:
            return ExtractionTask(docs[0].to_dict())
        return None

    def delete_task(self, task_id: str) -> bool:
        """
        Permanently delete a task and all its data.
        This is an admin-only operation for cleaning up stuck/corrupted tasks.

        Args:
            task_id: The ID of the task to delete

        Returns:
            bool: True if task was found and deleted, False if not found
        """
        try:
            task_ref = self.collection.document(task_id)
            task = task_ref.get()
            if task.exists:
                task_ref.delete()
                print(f"🗑️  Deleted task: {task_id}")
                return True
            return False
        except Exception as e:
            print(f"❌ Error deleting task {task_id}: {e}")
            return False

    async def query_by_domain(self, domain: str, limit: int = 100) -> List[Dict]:
        """
        Query tasks by domain for source quality tracking

        Args:
            domain: Domain name (e.g., 'bbc.com')
            limit: Maximum number of tasks to return

        Returns:
            List of task dicts with status, word_count, etc.
        """
        try:
            # Query tasks with this domain
            query = (self.collection
                    .where("domain", "==", domain)
                    .order_by("created_at", direction=firestore.Query.DESCENDING)
                    .limit(limit))

            docs = query.stream()
            tasks = []

            for doc in docs:
                data = doc.to_dict()
                # Extract relevant fields for quality tracking
                tasks.append({
                    'task_id': data.get('task_id'),
                    'status': data.get('status'),
                    'word_count': data.get('result', {}).get('word_count', 0) if data.get('result') else 0,
                    'created_at': data.get('created_at'),
                    'error': data.get('error')
                })

            return tasks

        except Exception as e:
            print(f"⚠️  Error querying by domain {domain}: {e}")
            return []

    async def append_extraction_attempt(self, task_id: str, attempt_data: Dict):
        """
        Append extraction attempt to task's attempt history

        Args:
            task_id: Task ID
            attempt_data: Dict with attempt details (attempt_number, status, reason, timestamp, word_count)
        """
        try:
            task_ref = self.collection.document(task_id)
            task = task_ref.get()

            if not task.exists:
                print(f"⚠️  Task {task_id} not found, cannot append attempt")
                return

            data = task.to_dict()
            attempts = data.get('extraction_attempts', [])
            attempts.append(attempt_data)

            task_ref.update({
                'extraction_attempts': attempts,
                'updated_at': firestore.SERVER_TIMESTAMP
            })

        except Exception as e:
            print(f"⚠️  Error appending extraction attempt: {e}")

    async def count_tasks(self, filters: Optional[Dict] = None) -> int:
        """
        Count tasks matching filters

        Args:
            filters: Optional filters (e.g., {'status': 'completed'})

        Returns:
            Count of matching tasks
        """
        try:
            query = self.collection

            if filters:
                for key, value in filters.items():
                    query = query.where(key, "==", value)

            # Firestore doesn't have a direct count() API that's efficient
            # So we fetch IDs only and count them (more efficient than full docs)
            docs = query.select([]).stream()
            return sum(1 for _ in docs)

        except Exception as e:
            print(f"⚠️  Error counting tasks: {e}")
            return 0

    async def aggregate_by_domain(self) -> Dict[str, int]:
        """
        Aggregate task counts by domain

        Returns:
            Dict mapping domain -> task count
        """
        try:
            # Firestore doesn't support GROUP BY, so we need to fetch and aggregate in memory
            # Limit to recent tasks (last 1000) to avoid performance issues
            query = (self.collection
                    .order_by("created_at", direction=firestore.Query.DESCENDING)
                    .limit(1000))

            docs = query.stream()
            domain_counts = {}

            for doc in docs:
                data = doc.to_dict()
                domain = data.get('domain')
                if domain:
                    domain_counts[domain] = domain_counts.get(domain, 0) + 1

            return domain_counts

        except Exception as e:
            print(f"⚠️  Error aggregating by domain: {e}")
            return {}


def get_task_store():
    """
    Factory function to get task store instance (Firestore, GCS, or Redis)

    Priority order:
    1. USE_REDIS=true → RedisTaskStore (very fast, expensive - requires Memorystore)
    2. USE_GCS=true → GCSTaskStore (slow, legacy mode)
    3. Default → Firestore TaskStore (fast, recommended for production)

    Returns:
        TaskStore, GCSTaskStore, or RedisTaskStore instance
    """
    # Check for Redis mode (fastest option, but expensive)
    use_redis = os.getenv("USE_REDIS", "false").lower() == "true"
    if use_redis:
        try:
            from .redis_task_store import RedisTaskStore
            print("🚀 Using Redis + GCS task store (high performance mode)")
            return RedisTaskStore()
        except Exception as e:
            print(f"⚠️  Redis task store initialization failed: {e}")
            print(f"   Falling back to Firestore task store")
            return TaskStore()

    # Check for legacy GCS mode (slow, not recommended)
    use_gcs = os.getenv("USE_GCS", "false").lower() == "true"
    if use_gcs:
        from .gcs_task_store import GCSTaskStore
        print("⚠️  Using GCS task store (legacy mode - slow)")
        return GCSTaskStore()

    # Default to Firestore (recommended for production)
    print("✅ Using Firestore task store (production mode)")
    return TaskStore()


# Global task store instance
# This will be Redis if USE_REDIS=true, otherwise GCS (default)
task_store = get_task_store()
