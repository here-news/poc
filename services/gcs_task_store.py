"""
GCS Task Store - Read tasks from GCS bucket
Replaces Firestore-based task_store for webapp read operations
"""
import os
import json
from typing import Optional
from enum import Enum
from google.cloud import storage


class TaskStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    BLOCKED = "blocked"


class ExtractionTask:
    """Task model matching GCS schema"""

    def __init__(self, data: dict):
        self.task_id = data.get("task_id")
        self.url = data.get("url")
        self.domain = data.get("domain")
        self.status = data.get("status", TaskStatus.PENDING)
        self.current_stage = data.get("current_stage", "pending")
        self.created_at = data.get("created_at")
        self.updated_at = data.get("updated_at")
        self.completed_at = data.get("completed_at")

        # Results (populated as pipeline progresses)
        self.preview_meta = data.get("preview_meta")
        self.result = data.get("result")
        self.semantic_data = data.get("semantic_data")
        self.story_match = data.get("story_match")

        # Progress tracking
        self.token_costs = data.get("token_costs", {
            "extraction": 0,
            "cleaning": 0,
            "resolution": 0,
            "semantization": 0,
            "total": 0
        })

        # Error handling
        self.error = data.get("error")

        # Additional metadata
        self.gcs_paths = data.get("gcs_paths", {})
        self.extraction_attempts = data.get("extraction_attempts", [])
        self.target_story_id = data.get("target_story_id")
        self.user_id = data.get("user_id")
        self.auto_chain = data.get("auto_chain", False)


class GCSTaskStore:
    """GCS-backed task reader (read-only for webapp)"""

    def __init__(self, bucket_name: Optional[str] = None):
        """
        Initialize GCS client

        Args:
            bucket_name: GCS bucket name (defaults to GCS_BUCKET env var)
        """
        self.bucket_name = bucket_name or os.getenv("GCS_BUCKET", "here2-474221-extraction-artifacts")

        try:
            self.storage_client = storage.Client()
            self.bucket = self.storage_client.bucket(self.bucket_name)
            print(f"✅ GCS Task Store initialized: gs://{self.bucket_name}/tasks/")
        except Exception as e:
            print(f"⚠️ GCS Task Store initialization failed: {e}")
            self.storage_client = None
            self.bucket = None

    def get_task(self, task_id: str) -> Optional[ExtractionTask]:
        """
        Get task by ID from GCS

        Args:
            task_id: Task identifier

        Returns:
            ExtractionTask or None if not found
        """
        if not self.bucket:
            return None

        try:
            blob = self.bucket.blob(f"tasks/{task_id}.json")

            # Check if blob exists
            if not blob.exists():
                return None

            # Download and parse JSON
            content = blob.download_as_text()
            data = json.loads(content)

            return ExtractionTask(data)

        except Exception as e:
            print(f"❌ Error reading task {task_id} from GCS: {e}")
            return None

    def list_recent_tasks(self, limit: int = 100) -> list:
        """
        List recent tasks (for debugging/monitoring)

        Args:
            limit: Maximum number of tasks to return

        Returns:
            List of task IDs
        """
        if not self.bucket:
            return []

        try:
            blobs = self.bucket.list_blobs(prefix="tasks/", max_results=limit)
            task_ids = []

            for blob in blobs:
                # Extract task ID from path: tasks/{task_id}.json
                if blob.name.endswith('.json'):
                    task_id = blob.name.replace('tasks/', '').replace('.json', '')
                    task_ids.append(task_id)

            return task_ids

        except Exception as e:
            print(f"❌ Error listing tasks from GCS: {e}")
            return []


# Singleton instance
gcs_task_store = GCSTaskStore()
