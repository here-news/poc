"""
Pub/Sub Publisher - Submit extraction jobs to Cloud Run workers
"""
import os
import json
from typing import Optional
from google.cloud import pubsub_v1


class PubSubPublisher:
    """Publishes extraction tasks to Pub/Sub topics"""

    def __init__(self, project_id: Optional[str] = None):
        """
        Initialize Pub/Sub publisher

        Args:
            project_id: GCP project ID (defaults to FIRESTORE_PROJECT_ID env var)
        """
        self.project_id = project_id or os.getenv("FIRESTORE_PROJECT_ID", "here2-474221")

        # Check if using emulator (for local dev)
        if os.getenv("PUBSUB_EMULATOR_HOST"):
            print(f"🔧 Using Pub/Sub emulator: {os.getenv('PUBSUB_EMULATOR_HOST')}")

        self.publisher = pubsub_v1.PublisherClient()

    def _get_topic_path(self, topic_name: str) -> str:
        """Get full topic path"""
        return self.publisher.topic_path(self.project_id, topic_name)

    def publish_extraction_job(self, task_id: str, url: str) -> str:
        """
        Publish extraction job to extraction-requests topic

        Args:
            task_id: Task ID
            url: URL to extract

        Returns:
            Message ID
        """
        topic_path = self._get_topic_path("extraction-requests")

        data = {
            "task_id": task_id,
            "url": url
        }

        # Publish message with stage attribute
        future = self.publisher.publish(
            topic_path,
            json.dumps(data).encode("utf-8"),
            stage="extraction"
        )

        message_id = future.result()
        print(f"📤 Published extraction job: task_id={task_id}, message_id={message_id}")
        return message_id

    def publish_cleaning_job(self, task_id: str) -> str:
        """
        Publish cleaning job to cleaning-requests topic

        Args:
            task_id: Task ID

        Returns:
            Message ID
        """
        topic_path = self._get_topic_path("cleaning-requests")

        data = {
            "task_id": task_id
        }

        future = self.publisher.publish(
            topic_path,
            json.dumps(data).encode("utf-8"),
            stage="cleaning"
        )

        message_id = future.result()
        print(f"📤 Published cleaning job: task_id={task_id}, message_id={message_id}")
        return message_id

    def publish_resolution_job(self, task_id: str) -> str:
        """
        Publish entity resolution job to resolution-requests topic

        Args:
            task_id: Task ID

        Returns:
            Message ID
        """
        topic_path = self._get_topic_path("resolution-requests")

        data = {
            "task_id": task_id
        }

        future = self.publisher.publish(
            topic_path,
            json.dumps(data).encode("utf-8"),
            stage="resolution"
        )

        message_id = future.result()
        print(f"📤 Published resolution job: task_id={task_id}, message_id={message_id}")
        return message_id

    def publish_semantization_job(self, task_id: str) -> str:
        """
        Publish semantization job to semantization-requests topic

        Args:
            task_id: Task ID

        Returns:
            Message ID
        """
        topic_path = self._get_topic_path("semantization-requests")

        data = {
            "task_id": task_id
        }

        future = self.publisher.publish(
            topic_path,
            json.dumps(data).encode("utf-8"),
            stage="semantization"
        )

        message_id = future.result()
        print(f"📤 Published semantization job: task_id={task_id}, message_id={message_id}")
        return message_id


# Global publisher instance
pubsub_publisher = PubSubPublisher()
