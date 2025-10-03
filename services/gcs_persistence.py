"""
GCS Persistence Service - Store forensic evidence of web extractions

Stores:
- Screenshots (PNG)
- Cleaned content (JSON + Markdown)
- Metadata for later retrieval

Storage structure:
  gs://here_news/
    domains/
      {domain}/
        {uuid}/
          screenshot.png
          content.json
          content.md
          metadata.json
"""

import os
import json
import uuid
import hashlib
from datetime import datetime
from typing import Dict, Any, Optional
from google.cloud import storage
from urllib.parse import urlparse

class GCSPersistenceService:
    """Persist web extraction artifacts to Google Cloud Storage"""

    def __init__(self, bucket_name: str = "here_news",
                 credentials_path: str = None):
        """
        Initialize GCS persistence service

        Args:
            bucket_name: GCS bucket name
            credentials_path: Path to service account JSON key file
        """
        self.bucket_name = bucket_name

        # Set credentials if provided
        if credentials_path and os.path.exists(credentials_path):
            os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = credentials_path

        # Initialize GCS client
        self.client = storage.Client()
        self.bucket = self.client.bucket(bucket_name)

        print(f"✅ GCS Persistence initialized: bucket={bucket_name}")

    def persist_extraction(self,
                          url: str,
                          extraction_result: Dict[str, Any],
                          cleaned_content: str,
                          screenshot_bytes: Optional[bytes] = None,
                          task_id: str = None) -> Dict[str, str]:
        """
        Persist extraction artifacts to GCS

        Args:
            url: Original URL
            extraction_result: Raw extraction result dict
            cleaned_content: Cleaned content (text)
            screenshot_bytes: Screenshot PNG bytes (optional)
            task_id: Task UUID (if None, generates deterministic UUID from canonical URL)

        Returns:
            Dict with GCS paths:
            {
                "artifact_id": "uuid",
                "domain": "example.com",
                "screenshot_path": "gs://...",
                "content_json_path": "gs://...",
                "content_md_path": "gs://...",
                "metadata_path": "gs://..."
            }
        """
        # Generate deterministic artifact ID from canonical URL
        canonical_url = extraction_result.get("canonical_url", url)
        artifact_id = task_id or self._generate_deterministic_uuid(canonical_url)

        # Extract domain from URL
        domain = urlparse(url).netloc.replace('www.', '')

        # Base path in GCS
        base_path = f"domains/{domain}/{artifact_id}"

        paths = {
            "artifact_id": artifact_id,
            "domain": domain,
            "base_path": f"gs://{self.bucket_name}/{base_path}"
        }

        # 1. Save screenshot if provided
        if screenshot_bytes:
            screenshot_path = f"{base_path}/screenshot.png"
            blob = self.bucket.blob(screenshot_path)
            blob.upload_from_string(screenshot_bytes, content_type='image/png')
            paths["screenshot_path"] = f"gs://{self.bucket_name}/{screenshot_path}"
            print(f"📸 Screenshot saved: {screenshot_path}")

        # 2. Save content as JSON
        content_json = {
            "url": url,
            "canonical_url": extraction_result.get("canonical_url", url),
            "domain": domain,
            "title": extraction_result.get("title", ""),
            "author": extraction_result.get("author", ""),
            "publish_date": extraction_result.get("publish_date", ""),
            "content_text": cleaned_content,
            "word_count": extraction_result.get("word_count", 0),
            "extraction_timestamp": extraction_result.get("extraction_timestamp", datetime.now().isoformat()),
            "processing_time_ms": extraction_result.get("processing_time_ms", 0)
        }

        content_json_path = f"{base_path}/content.json"
        blob = self.bucket.blob(content_json_path)
        blob.upload_from_string(
            json.dumps(content_json, indent=2, ensure_ascii=False),
            content_type='application/json'
        )
        paths["content_json_path"] = f"gs://{self.bucket_name}/{content_json_path}"
        print(f"📄 Content JSON saved: {content_json_path}")

        # 3. Save content as Markdown
        markdown_content = self._format_as_markdown(content_json)
        content_md_path = f"{base_path}/content.md"
        blob = self.bucket.blob(content_md_path)
        blob.upload_from_string(
            markdown_content,
            content_type='text/markdown'
        )
        paths["content_md_path"] = f"gs://{self.bucket_name}/{content_md_path}"
        print(f"📝 Content Markdown saved: {content_md_path}")

        # 4. Save metadata
        metadata = {
            "artifact_id": artifact_id,
            "url": url,
            "canonical_url": extraction_result.get("canonical_url", url),
            "domain": domain,
            "title": extraction_result.get("title", ""),
            "author": extraction_result.get("author", ""),
            "publish_date": extraction_result.get("publish_date", ""),
            "word_count": extraction_result.get("word_count", 0),
            "extraction_timestamp": extraction_result.get("extraction_timestamp", datetime.now().isoformat()),
            "processing_time_ms": extraction_result.get("processing_time_ms", 0),
            "is_readable": extraction_result.get("is_readable", False),
            "status": extraction_result.get("status", "unknown"),
            "has_screenshot": screenshot_bytes is not None,
            "gcs_paths": paths
        }

        metadata_path = f"{base_path}/metadata.json"
        blob = self.bucket.blob(metadata_path)
        blob.upload_from_string(
            json.dumps(metadata, indent=2, ensure_ascii=False),
            content_type='application/json'
        )
        paths["metadata_path"] = f"gs://{self.bucket_name}/{metadata_path}"
        print(f"🗂️  Metadata saved: {metadata_path}")

        print(f"✅ Persisted extraction: {artifact_id} ({domain})")
        return paths

    def _generate_deterministic_uuid(self, canonical_url: str) -> str:
        """
        Generate deterministic UUID from canonical URL using UUID5
        Same URL always produces same UUID for consistency

        Args:
            canonical_url: Canonical URL of the article

        Returns:
            UUID string (deterministic)
        """
        # Use UUID5 with DNS namespace for deterministic generation
        # This ensures same URL always gets same UUID
        deterministic_uuid = uuid.uuid5(uuid.NAMESPACE_URL, canonical_url)
        return str(deterministic_uuid)

    def _format_as_markdown(self, content_json: Dict[str, Any]) -> str:
        """Format content as Markdown for human readability"""
        md_parts = []

        # Header
        md_parts.append(f"# {content_json['title']}\n")

        # Metadata
        if content_json.get('author'):
            md_parts.append(f"**Author:** {content_json['author']}\n")
        if content_json.get('publish_date'):
            md_parts.append(f"**Published:** {content_json['publish_date']}\n")
        md_parts.append(f"**Source:** [{content_json['domain']}]({content_json['url']})\n")
        md_parts.append(f"**Word Count:** {content_json['word_count']} words\n")
        md_parts.append(f"**Extracted:** {content_json['extraction_timestamp']}\n")

        # Separator
        md_parts.append("\n---\n\n")

        # Content
        md_parts.append(content_json['content_text'])

        return "".join(md_parts)

    def retrieve_artifact(self, domain: str, artifact_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve artifact metadata from GCS

        Args:
            domain: Domain name (e.g., "example.com")
            artifact_id: Artifact UUID

        Returns:
            Metadata dict if found, None otherwise
        """
        metadata_path = f"domains/{domain}/{artifact_id}/metadata.json"

        try:
            blob = self.bucket.blob(metadata_path)
            if not blob.exists():
                return None

            content = blob.download_as_text()
            return json.loads(content)
        except Exception as e:
            print(f"❌ Failed to retrieve artifact {artifact_id}: {e}")
            return None

    def get_screenshot_url(self, domain: str, artifact_id: str,
                          expiration_seconds: int = 3600) -> Optional[str]:
        """
        Generate signed URL for screenshot

        Args:
            domain: Domain name
            artifact_id: Artifact UUID
            expiration_seconds: URL expiration time

        Returns:
            Signed URL string or None if not found
        """
        screenshot_path = f"domains/{domain}/{artifact_id}/screenshot.png"

        try:
            blob = self.bucket.blob(screenshot_path)
            if not blob.exists():
                return None

            url = blob.generate_signed_url(
                expiration=expiration_seconds,
                method='GET'
            )
            return url
        except Exception as e:
            print(f"❌ Failed to generate screenshot URL: {e}")
            return None

# Global instance
gcs_persistence = None

def initialize_gcs_persistence(credentials_path: str = None):
    """Initialize global GCS persistence service"""
    global gcs_persistence

    if credentials_path is None:
        # Try multiple paths (Docker vs local)
        possible_paths = [
            "/app/sage-striker-294302-b89a8b7e205b.json",  # Docker container
            "./sage-striker-294302-b89a8b7e205b.json",     # Local relative
            os.path.join(os.path.dirname(__file__), "../sage-striker-294302-b89a8b7e205b.json")  # Relative to this file
        ]

        for path in possible_paths:
            if os.path.exists(path):
                credentials_path = path
                print(f"✅ Found GCS credentials: {path}")
                break

        if not credentials_path or not os.path.exists(credentials_path):
            print(f"⚠️  GCS credentials not found. Tried: {possible_paths}")
            print(f"⚠️  GCS persistence disabled (non-blocking)")
            return None

    gcs_persistence = GCSPersistenceService(
        bucket_name="here_news",
        credentials_path=credentials_path
    )
    return gcs_persistence
