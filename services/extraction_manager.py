"""
Extraction Manager - Handles background extraction tasks
"""
import uuid
from datetime import datetime
from typing import Dict, Optional
from enum import Enum

class TaskStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class ExtractionTask:
    def __init__(self, task_id: str, url: str):
        self.task_id = task_id
        self.url = url
        self.status = TaskStatus.PENDING
        self.result = None
        self.semantic_data = None  # Store claims and entities
        self.screenshot_bytes = None  # Store screenshot binary (not in JSON response)
        self.gcs_paths = None  # Store GCS artifact paths
        self.token_costs = {
            "extraction": 0,
            "cleaning": 0,
            "semantization": 0,
            "total": 0
        }
        self.error = None
        self.created_at = datetime.now().isoformat()
        self.completed_at = None

class ExtractionManager:
    """Manages background extraction tasks"""

    def __init__(self):
        self.tasks: Dict[str, ExtractionTask] = {}

    def create_task(self, url: str) -> str:
        """Create a new extraction task and return task_id"""
        task_id = str(uuid.uuid4())
        task = ExtractionTask(task_id, url)
        self.tasks[task_id] = task
        return task_id

    def get_task(self, task_id: str) -> Optional[ExtractionTask]:
        """Get task by ID"""
        return self.tasks.get(task_id)

    def update_task_status(self, task_id: str, status: TaskStatus):
        """Update task status"""
        if task_id in self.tasks:
            self.tasks[task_id].status = status
            if status in [TaskStatus.COMPLETED, TaskStatus.FAILED]:
                self.tasks[task_id].completed_at = datetime.now().isoformat()

    def set_task_result(self, task_id: str, result):
        """Set task result"""
        if task_id in self.tasks:
            self.tasks[task_id].result = result
            self.tasks[task_id].status = TaskStatus.COMPLETED
            self.tasks[task_id].completed_at = datetime.now().isoformat()

    def set_task_error(self, task_id: str, error: str):
        """Set task error"""
        if task_id in self.tasks:
            self.tasks[task_id].error = error
            self.tasks[task_id].status = TaskStatus.FAILED
            self.tasks[task_id].completed_at = datetime.now().isoformat()

    def set_semantic_data(self, task_id: str, semantic_data):
        """Set semantic analysis data (claims, entities)"""
        if task_id in self.tasks:
            self.tasks[task_id].semantic_data = semantic_data

    def set_gcs_paths(self, task_id: str, gcs_paths: dict):
        """Set GCS artifact paths after persistence"""
        if task_id in self.tasks:
            self.tasks[task_id].gcs_paths = gcs_paths

    def add_token_cost(self, task_id: str, step: str, tokens: int):
        """Add token cost for a specific step"""
        if task_id in self.tasks:
            self.tasks[task_id].token_costs[step] = tokens
            # Recalculate total
            self.tasks[task_id].token_costs["total"] = sum(
                v for k, v in self.tasks[task_id].token_costs.items() if k != "total"
            )

# Global extraction manager instance
extraction_manager = ExtractionManager()
