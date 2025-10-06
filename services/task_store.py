"""
Task Store - Firestore-backed task management
Replaces in-memory ExtractionManager with persistent storage
"""
import os
import uuid
from datetime import datetime
from typing import Dict, Optional
from enum import Enum
from google.cloud import firestore
from google.api_core.exceptions import NotFound


class TaskStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ExtractionTask:
    """Task model matching the original ExtractionManager interface"""

    def __init__(self, data: dict):
        self.task_id = data.get("task_id")
        self.url = data.get("url")
        self.status = data.get("status", TaskStatus.PENDING)
        self.preview_meta = data.get("preview_meta")  # iFramely quick preview
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

    def to_dict(self) -> dict:
        """Convert to Firestore-compatible dict"""
        return {
            "task_id": self.task_id,
            "url": self.url,
            "status": self.status,
            "current_stage": self.current_stage,
            "result": self.result,
            "semantic_data": self.semantic_data,
            "gcs_paths": self.gcs_paths,
            "token_costs": self.token_costs,
            "user_id": self.user_id,
            "error": self.error,
            "created_at": self.created_at,
            "completed_at": self.completed_at,
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

    def create_task(self, url: str, task_id: Optional[str] = None, user_id: Optional[str] = None) -> str:
        """
        Create a new extraction task

        Args:
            url: URL to extract
            task_id: Optional custom task ID (for idempotency)
            user_id: Optional user identifier tied to this task

        Returns:
            task_id
        """
        task_id = task_id or str(uuid.uuid4())

        task_data = {
            "task_id": task_id,
            "url": url,
            "status": TaskStatus.PENDING,
            "current_stage": "pending",
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
            "updated_at": firestore.SERVER_TIMESTAMP
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

        if status in [TaskStatus.COMPLETED, TaskStatus.FAILED]:
            update_data["completed_at"] = datetime.now().isoformat()

        self.collection.document(task_id).update(update_data)

    def set_task_result(self, task_id: str, result: dict):
        """Set task extraction result"""
        self.collection.document(task_id).update({
            "result": result,
            "status": TaskStatus.COMPLETED,
            "completed_at": datetime.now().isoformat(),
            "updated_at": firestore.SERVER_TIMESTAMP
        })

    def set_task_error(self, task_id: str, error: str):
        """Set task error"""
        self.collection.document(task_id).update({
            "error": error,
            "status": TaskStatus.FAILED,
            "completed_at": datetime.now().isoformat(),
            "updated_at": firestore.SERVER_TIMESTAMP
        })

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


# Global task store instance
task_store = TaskStore()
