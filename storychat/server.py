from fastapi import FastAPI, Request, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import httpx
import os
import re
import json
import time
import asyncio
import html
from datetime import datetime
from openai import OpenAI
from collections import defaultdict
from contextlib import asynccontextmanager

from typing import Optional, List, Dict, Any, Set

from services.task_store import get_task_store, TaskStatus
from services.pubsub_publisher import pubsub_publisher
from services.neo4j_client import neo4j_client
from services.beacon import BeaconClient

# Initialize task store (Firestore by default)
task_store = get_task_store()

# Initialize beacon client
beacon = BeaconClient(
    gateway_url=os.getenv("GATEWAY_URL", "http://gateway:3000")
)

# Load environment variables
BACKEND_SERVICE_URL = os.getenv('BACKEND_SERVICE_URL', 'https://story-engine-here-3n5yrhhfpa-uc.a.run.app')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

# Initialize OpenAI client
openai_client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

# News curation cache (refreshes every 5 minutes)
news_curation_cache = {
    "data": None,
    "timestamp": 0,
    "ttl": 300  # 5 minutes in seconds
}

# Top Stories curation cache (refreshes every 10 minutes)
top_stories_curation_cache = {
    "content": None,  # Rich markdown content with entity markup
    "story_ids": [],  # IDs of stories included in curation
    "timestamp": 0,
    "ttl": 600  # 10 minutes in seconds
}

async def generate_top_stories_curation():
    """
    Background task that generates rich curation content for top stories.
    Runs every 10 minutes and updates the cache when stories change.
    """
    global top_stories_curation_cache

    print("🎨 Starting Top Stories curation task")

    while True:
        try:
            await asyncio.sleep(600)  # 10 minutes

            print("🎨 Running Top Stories curation...")

            # Fetch top stories (high coherence)
            top_stories = neo4j_client.get_story_summaries(limit=4, min_coherence=0.7)

            # Fetch emerging stories (lower coherence but potentially interesting)
            emerging_stories = neo4j_client.get_story_summaries(limit=3, min_coherence=0.4)

            # Filter out emerging stories that are already in top stories
            top_story_ids = {s['id'] for s in top_stories}
            emerging_stories = [s for s in emerging_stories if s['id'] not in top_story_ids][:2]

            # Combine: top stories first, then emerging
            all_stories = top_stories + emerging_stories

            if not all_stories:
                print("🎨 No stories found, skipping curation")
                continue

            # Get current story IDs
            current_story_ids = [s['id'] for s in all_stories]
            cached_story_ids = top_stories_curation_cache.get('story_ids', [])
            cached_timestamp = top_stories_curation_cache.get('timestamp', 0)

            # Check if there are new or updated stories
            new_stories = [sid for sid in current_story_ids if sid not in cached_story_ids]

            # Also check if cache is older than 1 hour (3600 seconds)
            current_time = time.time()
            cache_age = current_time - cached_timestamp
            is_cache_stale = cache_age > 3600

            if not new_stories and cached_story_ids and not is_cache_stale:
                print(f"🎨 No changes in stories and cache fresh ({int(cache_age/60)}m old), keeping cache")
                continue

            if new_stories:
                print(f"🎨 Found {len(new_stories)} new/updated stories, generating curation...")
            elif is_cache_stale:
                print(f"🎨 Cache is stale ({int(cache_age/60)}m old), regenerating curation...")
            else:
                print(f"🎨 Generating initial curation...")

            # Build context for LLM and story references
            stories_context = ""
            story_references = {}  # Map story number to story data
            num_top_stories = len(top_stories)

            for i, story in enumerate(all_stories, 1):
                title = story.get('title', 'Untitled')
                story_id = story.get('id', '')
                desc = story.get('description') or story.get('gist', '')
                coherence = story.get('coherence_score', 0)
                last_updated = story.get('last_updated_human', 'recently')

                # Mark as emerging story
                is_emerging = i > num_top_stories
                story_type = "🌱 EMERGING" if is_emerging else "⭐ ESTABLISHED"

                # Store story reference
                story_references[i] = {
                    'id': story_id,
                    'title': title,
                    'is_emerging': is_emerging
                }

                # Get entities for this story
                story_entities = []
                if story.get('people_entities'):
                    story_entities.extend(story['people_entities'][:3])

                entities_text = ""
                if story_entities:
                    entity_names = [e.get('name', '') for e in story_entities if e.get('name')]
                    entities_text = f" (featuring {', '.join(entity_names)})"

                stories_context += f"{i}. [{story_type}] **{title}**{entities_text}\n   ID: {story_id}\n   {desc}\n   Updated {last_updated}, coherence: {int(coherence*100)}%\n\n"

            # Previous curation content for context
            previous_content = top_stories_curation_cache.get('content', '')

            # Generate LLM prompt
            if not openai_client:
                print("⚠️ OpenAI client not available, skipping curation")
                continue

            prompt = f"""You are Phi (φ), the interplanet news oracle for HERE.news. Write a creative, engaging news update that weaves stories together with interesting connections and contrasts.

Current Stories:
{stories_context}

Guidelines:
- BREVITY: Write EXACTLY 2 sentences. Maximum 50 words total.
- Start punchy (e.g., "Wild! 🌍", "Chaos! 🚀")
- Cover ONLY 3 stories - link ALL of them
- **CRITICAL RULE**: EVERY story you mention MUST be an inline link [text](Story N). NO exceptions!
  - If you mention a story, event, or development - it MUST be linked
  - DO NOT mention stories without linking them
  Examples:
  * "While [interstellar comet 3I/ATLAS](Story 1) baffles scientists 🌌, [Elon's Grokipedia](Story 2) stirs controversy 😬"
  * "[Netherlands seizes Nexperia](Story 3) as [chip wars](Story 5) escalate 🔥"
- Only mention 3 stories maximum - but link ALL 3
- Add 2-3 emojis
- Be vivid and show contrasts

Previous curation (if this is an update):
{previous_content if previous_content else '(This is the first curation)'}

Write the curation summary with creative storytelling and juxtaposition:"""

            # Call OpenAI API
            response = openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are Phi (φ), an interplanet news oracle. Write creative, engaging news summaries that connect stories with bold juxtaposition and cosmic perspective. Be vivid, expressive, and show personality."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.85,  # Slightly higher for more creativity
                max_tokens=120     # Strict limit - 2 sentences, 50 words max
            )

            curation_text = response.choices[0].message.content.strip()

            # Enhance curation with entity markup and story links
            enhanced_content = curation_text

            # Step 1: Add story links
            # Replace inline "[link text](Story N)" with actual story URLs
            import re as regex_module
            for story_num, story_data in story_references.items():
                story_id = story_data['id']
                story_title = story_data['title']
                # Create URL-friendly slug
                slug = story_title.lower().replace(' ', '-')
                slug = regex_module.sub(r'[^\w\s-]', '', slug)
                slug = regex_module.sub(r'[-\s]+', '-', slug)

                # Replace [link text](Story N) with [link text](/story/id/slug)
                # This preserves the LLM's descriptive link text
                pattern = rf'\[([^\]]+)\]\(Story {story_num}\)'
                replacement = rf'[\1](/story/{story_id}/{slug})'
                enhanced_content = regex_module.sub(pattern, replacement, enhanced_content)

            # Step 2: Collect all entities from all stories
            all_entities = []
            entities_metadata = {}
            for story in all_stories:
                if story.get('people_entities'):
                    all_entities.extend(story['people_entities'])

            # Sort entities by name length (longer first to avoid partial matches)
            all_entities.sort(key=lambda e: len(e.get('name', '')), reverse=True)

            # Step 3: Replace entity names with markup and build metadata dict
            for entity in all_entities:
                name = entity.get('name', '')
                canonical_id = entity.get('canonical_id', '')
                thumbnail = entity.get('wikidata_thumbnail', '')
                qid = entity.get('qid', '')
                description = entity.get('description', '')

                if name and canonical_id and name in enhanced_content:
                    # Create entity markup
                    entity_markup = f"[[{name}|{canonical_id}]]"

                    # Replace only first occurrence to avoid over-replacement
                    enhanced_content = enhanced_content.replace(name, entity_markup, 1)

                    # Add to metadata dict
                    if canonical_id not in entities_metadata:
                        entities_metadata[canonical_id] = {
                            'name': name,
                            'qid': qid or 'unknown',
                            'description': description or 'No description available',
                            'wikidata_thumbnail': thumbnail,
                            'entity_type': 'Person',
                            'claim_count': 0
                        }

            # Update cache
            top_stories_curation_cache['content'] = enhanced_content
            top_stories_curation_cache['story_ids'] = current_story_ids
            top_stories_curation_cache['entities_metadata'] = entities_metadata
            top_stories_curation_cache['story_references'] = story_references
            top_stories_curation_cache['timestamp'] = time.time()

            print(f"✅ Top Stories curation updated: {len(enhanced_content)} chars")

        except Exception as e:
            print(f"❌ Error in Top Stories curation: {e}")
            import traceback
            traceback.print_exc()
            # Continue running even if one iteration fails
            continue

# Task user mapping (task_id -> user_id)
# Since Cloud Run doesn't preserve user_id in task objects,
# we maintain this mapping locally to enable WebSocket broadcasts
task_user_mapping: Dict[str, str] = {}

# WebSocket Connection Manager for real-time updates
class ConnectionManager:
    """
    Thread-safe WebSocket connection manager for real-time story updates.
    Handles concurrent connections, broadcasting, and heartbeat monitoring.
    """
    def __init__(self):
        # Use asyncio.Lock for thread-safe operations
        self._lock = asyncio.Lock()
        # Active WebSocket connections
        self.active_connections: List[WebSocket] = []
        # User subscriptions (user_id -> Set[story_id])
        self.subscriptions: Dict[str, Set[str]] = defaultdict(set)
        # Connection metadata (websocket -> user_id)
        self.connection_users: Dict[WebSocket, str] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        """Accept new WebSocket connection with thread safety."""
        await websocket.accept()
        async with self._lock:
            self.active_connections.append(websocket)
            self.connection_users[websocket] = user_id
            print(f"✅ WebSocket connected: {user_id} (total: {len(self.active_connections)})")

    async def disconnect(self, websocket: WebSocket):
        """Remove disconnected WebSocket with thread safety."""
        async with self._lock:
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)
            user_id = self.connection_users.pop(websocket, None)
            if user_id and user_id in self.subscriptions:
                del self.subscriptions[user_id]
            print(f"❌ WebSocket disconnected: {user_id} (total: {len(self.active_connections)})")

    async def broadcast(self, message: Dict[str, Any]):
        """
        Broadcast message to all connected clients.
        Non-blocking: failed sends don't block others.
        """
        # Create snapshot of connections to avoid locking during send
        async with self._lock:
            connections = self.active_connections.copy()

        # Send to all connections concurrently
        tasks = []
        for connection in connections:
            tasks.append(self._safe_send(connection, message))

        # Wait for all sends to complete (with individual error handling)
        await asyncio.gather(*tasks, return_exceptions=True)

    async def _safe_send(self, websocket: WebSocket, message: Dict[str, Any]):
        """Send message with error handling to prevent one failure blocking others."""
        try:
            await websocket.send_json(message)
        except Exception as e:
            print(f"⚠️ Failed to send to client: {e}")
            # Schedule disconnect on next event loop iteration
            asyncio.create_task(self.disconnect(websocket))

    async def send_to_user(self, user_id: str, message: Dict[str, Any]):
        """Send message to specific user's connections."""
        async with self._lock:
            connections = [
                ws for ws, uid in self.connection_users.items()
                if uid == user_id
            ]

        tasks = [self._safe_send(ws, message) for ws in connections]
        await asyncio.gather(*tasks, return_exceptions=True)

    async def subscribe(self, user_id: str, story_id: str):
        """Subscribe user to story updates."""
        async with self._lock:
            self.subscriptions[user_id].add(story_id)

    async def unsubscribe(self, user_id: str, story_id: str):
        """Unsubscribe user from story updates."""
        async with self._lock:
            if user_id in self.subscriptions:
                self.subscriptions[user_id].discard(story_id)

# Global connection manager instance
manager = ConnectionManager()


# ============================================================================
# Task State Broadcasting System
# ============================================================================

class TaskEventType:
    """Standardized task event types for WebSocket broadcasting"""
    CREATED = "task.created"
    STATE_CHANGE = "task.state_change"
    PROGRESS = "task.progress"
    COMPLETED = "task.completed"
    FAILED = "task.failed"
    BLOCKED = "task.blocked"


class TaskStateEvent:
    """
    Structured task state event for real-time broadcasting.

    Event Flow:
    1. task.created → Task submitted and queued
    2. task.state_change (preview) → Fetching page preview
    3. task.state_change (extraction) → Extracting content
    4. task.progress → Word count, extraction progress
    5. task.state_change (cleaning) → Cleaning extracted content
    6. task.state_change (resolution) → Resolving entities
    7. task.progress → Entities resolved, claims extracted
    8. task.state_change (semantization) → Generating semantic data
    9. task.state_change (story_matching) → Matching to stories
    10. task.completed OR task.failed OR task.blocked → Final state
    """

    @staticmethod
    def build_event(
        event_type: str,
        task_id: str,
        status: str,
        stage: Optional[str] = None,
        url: Optional[str] = None,
        story_id: Optional[str] = None,
        progress: Optional[Dict[str, Any]] = None,
        error: Optional[str] = None,
        result_summary: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Build a standardized task state event.

        Args:
            event_type: One of TaskEventType constants
            task_id: Unique task identifier
            status: Task status (pending, processing, completed, failed, blocked)
            stage: Current processing stage (preview, extraction, cleaning, etc.)
            url: Source URL being processed
            story_id: Associated story ID (if applicable)
            progress: Progress metrics (words_extracted, claims_count, etc.)
            error: Error message (if failed/blocked)
            result_summary: Summary of completed task (claim_count, word_count, etc.)

        Returns:
            Structured event dict ready for WebSocket broadcasting
        """
        event = {
            "type": event_type,
            "task_id": task_id,
            "status": status,
            "timestamp": datetime.now().isoformat()
        }

        # Add optional fields only if provided
        if stage:
            event["stage"] = stage
        if url:
            event["url"] = url
        if story_id:
            event["story_id"] = story_id
        if progress:
            event["progress"] = progress
        if error:
            event["error"] = error
        if result_summary:
            event["result"] = result_summary

        return event


async def broadcast_task_event(event: Dict[str, Any]):
    """
    Broadcast task event to all connected WebSocket clients.

    This is the central broadcasting hub for all task-related events.
    Events are sent to all clients, and clients filter based on their subscriptions.
    """
    try:
        await manager.broadcast(event)
        print(f"📡 Broadcast: {event['type']} for task {event['task_id']} (stage: {event.get('stage', 'N/A')})")
    except Exception as e:
        print(f"⚠️  Failed to broadcast task event: {e}")


# Convenience functions for common task events

async def broadcast_task_created(task_id: str, url: str, story_id: Optional[str] = None):
    """Broadcast task creation event"""
    event = TaskStateEvent.build_event(
        event_type=TaskEventType.CREATED,
        task_id=task_id,
        status="pending",
        stage="pending",
        url=url,
        story_id=story_id
    )
    await broadcast_task_event(event)


async def broadcast_task_state_change(
    task_id: str,
    status: str,
    stage: str,
    url: Optional[str] = None,
    story_id: Optional[str] = None
):
    """Broadcast task stage transition"""
    event = TaskStateEvent.build_event(
        event_type=TaskEventType.STATE_CHANGE,
        task_id=task_id,
        status=status,
        stage=stage,
        url=url,
        story_id=story_id
    )
    await broadcast_task_event(event)


async def broadcast_task_progress(
    task_id: str,
    stage: str,
    progress: Dict[str, Any]
):
    """Broadcast task progress update (within a stage)"""
    event = TaskStateEvent.build_event(
        event_type=TaskEventType.PROGRESS,
        task_id=task_id,
        status="processing",
        stage=stage,
        progress=progress
    )
    await broadcast_task_event(event)


async def broadcast_task_completed(
    task_id: str,
    url: str,
    story_id: Optional[str] = None,
    result_summary: Optional[Dict[str, Any]] = None
):
    """Broadcast task completion"""
    event = TaskStateEvent.build_event(
        event_type=TaskEventType.COMPLETED,
        task_id=task_id,
        status="completed",
        stage="completed",
        url=url,
        story_id=story_id,
        result_summary=result_summary
    )
    await broadcast_task_event(event)


async def broadcast_task_failed(
    task_id: str,
    url: str,
    error: str,
    stage: Optional[str] = None
):
    """Broadcast task failure"""
    event = TaskStateEvent.build_event(
        event_type=TaskEventType.FAILED,
        task_id=task_id,
        status="failed",
        stage=stage or "unknown",
        url=url,
        error=error
    )
    await broadcast_task_event(event)


async def broadcast_task_blocked(
    task_id: str,
    url: str,
    reason: str,
    stage: Optional[str] = None
):
    """Broadcast task blocked by site defenses or validation"""
    event = TaskStateEvent.build_event(
        event_type=TaskEventType.BLOCKED,
        task_id=task_id,
        status="blocked",
        stage=stage or "unknown",
        url=url,
        error=reason
    )
    await broadcast_task_event(event)


# Background task reference
curation_task: Optional[asyncio.Task] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for FastAPI app startup and shutdown.
    Starts background tasks on startup and cleans them up on shutdown.
    """
    global curation_task

    # Startup: Start background tasks
    print("🚀 Starting background tasks...")
    await beacon.start()
    print("✅ Beacon client started")
    curation_task = asyncio.create_task(generate_top_stories_curation())
    print("✅ Top Stories curation task started")

    yield

    # Shutdown: Cancel background tasks
    print("🛑 Stopping background tasks...")
    beacon.stop()
    print("✅ Beacon client stopped")
    if curation_task:
        curation_task.cancel()
        try:
            await curation_task
        except asyncio.CancelledError:
            pass
    print("✅ Background tasks stopped")

app = FastAPI(lifespan=lifespan)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static assets (built by Vite)
app.mount("/assets", StaticFiles(directory="dist/assets"), name="assets")

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

@app.get("/api/news-curation")
async def get_news_curation():
    """
    Get curated news feed with top stories and trending entities.
    Cached for 5 minutes for performance.

    Returns:
        - Top stories (coherence > 0.7)
        - Trending people (with headshots)
        - Trending organizations
        - Trending locations
        - Timestamp of last update
    """
    global news_curation_cache

    current_time = time.time()

    # Check if cache is still valid
    if (news_curation_cache["data"] is not None and
        current_time - news_curation_cache["timestamp"] < news_curation_cache["ttl"]):
        print("📦 Returning cached news curation")
        return news_curation_cache["data"]

    print("🔄 Fetching fresh news curation...")

    try:
        # Get top stories
        top_stories = neo4j_client.get_story_summaries(limit=8, min_coherence=0.7)

        # Get trending entities from recent stories
        trending_entities = _get_trending_entities(limit_stories=20)

        curation_data = {
            "success": True,
            "stories": top_stories[:6],  # Top 6 stories
            "entities": {
                "people": trending_entities.get("people", [])[:6],
                "organizations": trending_entities.get("organizations", [])[:4],
                "locations": trending_entities.get("locations", [])[:4]
            },
            "last_updated": datetime.now().isoformat(),
            "cached": False
        }

        # Update cache
        news_curation_cache["data"] = curation_data
        news_curation_cache["timestamp"] = current_time

        return curation_data

    except Exception as e:
        print(f"Error fetching news curation: {e}")
        # Return minimal response on error
        return {
            "success": False,
            "stories": [],
            "entities": {"people": [], "organizations": [], "locations": []},
            "error": str(e)
        }

@app.get("/api/top-stories-curation")
async def get_top_stories_curation():
    """
    Get LLM-generated curation summary for top stories.
    Cached for 10 minutes and updated when stories change.

    Returns:
        - Rich markdown content with entity markup
        - List of story IDs included in curation
        - Timestamp of last update
    """
    global top_stories_curation_cache

    current_time = time.time()

    # Check if cache exists
    if not top_stories_curation_cache.get('content'):
        # Generate initial curation immediately on first request
        try:
            print("🎨 Generating initial Top Stories curation...")

            # Fetch top stories (high coherence)
            top_stories = neo4j_client.get_story_summaries(limit=4, min_coherence=0.7)

            # Fetch emerging stories (lower coherence but potentially interesting)
            emerging_stories = neo4j_client.get_story_summaries(limit=3, min_coherence=0.4)

            # Filter out emerging stories that are already in top stories
            top_story_ids_set = {s['id'] for s in top_stories}
            emerging_stories = [s for s in emerging_stories if s['id'] not in top_story_ids_set][:2]

            # Combine: top stories first, then emerging
            all_stories = top_stories + emerging_stories

            if not all_stories:
                return {
                    "success": False,
                    "content": None,
                    "error": "No stories available"
                }

            # Get current story IDs
            current_story_ids = [s['id'] for s in all_stories]

            # Build context for LLM and story references
            stories_context = ""
            story_references = {}
            num_top_stories = len(top_stories)

            for i, story in enumerate(all_stories, 1):
                title = story.get('title', 'Untitled')
                story_id = story.get('id', '')
                desc = story.get('description') or story.get('gist', '')
                coherence = story.get('coherence_score', 0)
                last_updated = story.get('last_updated_human', 'recently')

                # Mark as emerging story
                is_emerging = i > num_top_stories
                story_type = "🌱 EMERGING" if is_emerging else "⭐ ESTABLISHED"

                # Store story reference
                story_references[i] = {
                    'id': story_id,
                    'title': title,
                    'is_emerging': is_emerging
                }

                # Get entities for this story
                story_entities = []
                if story.get('people_entities'):
                    story_entities.extend(story['people_entities'][:3])

                entities_text = ""
                if story_entities:
                    entity_names = [e.get('name', '') for e in story_entities if e.get('name')]
                    entities_text = f" (featuring {', '.join(entity_names)})"

                stories_context += f"{i}. [{story_type}] **{title}**{entities_text}\n   ID: {story_id}\n   {desc}\n   Updated {last_updated}, coherence: {int(coherence*100)}%\n\n"

            # Generate LLM prompt
            if not openai_client:
                return {
                    "success": False,
                    "content": None,
                    "error": "OpenAI client not available"
                }

            prompt = f"""You are Phi (φ), the interplanet news oracle for HERE.news. Write a creative, engaging news update that weaves stories together with interesting connections and contrasts.

Current Stories:
{stories_context}

Guidelines:
- BREVITY: Write EXACTLY 2 sentences. Maximum 50 words total.
- Start punchy (e.g., "Wild! 🌍", "Chaos! 🚀")
- Cover ONLY 3 stories - link ALL of them
- **CRITICAL RULE**: EVERY story you mention MUST be an inline link [text](Story N). NO exceptions!
  - If you mention a story, event, or development - it MUST be linked
  - DO NOT mention stories without linking them
  Examples:
  * "While [interstellar comet 3I/ATLAS](Story 1) baffles scientists 🌌, [Elon's Grokipedia](Story 2) stirs controversy 😬"
  * "[Netherlands seizes Nexperia](Story 3) as [chip wars](Story 5) escalate 🔥"
- Only mention 3 stories maximum - but link ALL 3
- Add 2-3 emojis
- Be vivid and show contrasts

Write the curation summary with creative storytelling and juxtaposition:"""

            # Call OpenAI API
            response = openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are Phi (φ), an interplanet news oracle. Write creative, engaging news summaries that connect stories with bold juxtaposition and cosmic perspective. Be vivid, expressive, and show personality."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.85,  # Slightly higher for more creativity
                max_tokens=120     # Strict limit - 2 sentences, 50 words max
            )

            curation_text = response.choices[0].message.content.strip()

            # Enhance curation with story links and entity markup
            enhanced_content = curation_text

            # Step 1: Add story links
            # Replace inline "[link text](Story N)" with actual story URLs
            import re as regex_module
            for story_num, story_data in story_references.items():
                story_id = story_data['id']
                story_title = story_data['title']
                # Create URL-friendly slug
                slug = story_title.lower().replace(' ', '-')
                slug = regex_module.sub(r'[^\w\s-]', '', slug)
                slug = regex_module.sub(r'[-\s]+', '-', slug)

                # Replace [link text](Story N) with [link text](/story/id/slug)
                # This preserves the LLM's descriptive link text
                pattern = rf'\[([^\]]+)\]\(Story {story_num}\)'
                replacement = rf'[\1](/story/{story_id}/{slug})'
                enhanced_content = regex_module.sub(pattern, replacement, enhanced_content)

            # Step 2: Collect all entities from all stories
            all_entities = []
            entities_metadata = {}
            for story in all_stories:
                if story.get('people_entities'):
                    all_entities.extend(story['people_entities'])

            all_entities.sort(key=lambda e: len(e.get('name', '')), reverse=True)

            for entity in all_entities:
                name = entity.get('name', '')
                canonical_id = entity.get('canonical_id', '')
                thumbnail = entity.get('wikidata_thumbnail', '')
                qid = entity.get('qid', '')
                description = entity.get('description', '')

                if name and canonical_id and name in enhanced_content:
                    entity_markup = f"[[{name}|{canonical_id}]]"
                    enhanced_content = enhanced_content.replace(name, entity_markup, 1)

                    # Add to metadata dict
                    if canonical_id not in entities_metadata:
                        entities_metadata[canonical_id] = {
                            'name': name,
                            'qid': qid or 'unknown',
                            'description': description or 'No description available',
                            'wikidata_thumbnail': thumbnail,
                            'entity_type': 'Person',
                            'claim_count': 0
                        }

            # Update cache
            top_stories_curation_cache['content'] = enhanced_content
            top_stories_curation_cache['story_ids'] = current_story_ids
            top_stories_curation_cache['entities_metadata'] = entities_metadata
            top_stories_curation_cache['timestamp'] = current_time

            print(f"✅ Initial Top Stories curation generated: {len(enhanced_content)} chars")

        except Exception as e:
            print(f"❌ Error generating initial curation: {e}")
            return {
                "success": False,
                "content": None,
                "error": str(e)
            }

    # Return cached content
    return {
        "success": True,
        "content": top_stories_curation_cache.get('content'),
        "entities_metadata": top_stories_curation_cache.get('entities_metadata', {}),
        "story_ids": top_stories_curation_cache.get('story_ids', []),
        "last_updated": datetime.fromtimestamp(top_stories_curation_cache.get('timestamp', 0)).isoformat() if top_stories_curation_cache.get('timestamp') else None,
        "cached": True
    }

def _get_trending_entities(limit_stories: int = 20) -> Dict[str, List[Dict]]:
    """Get trending entities from recent high-coherence stories."""
    if not neo4j_client.connected:
        neo4j_client._connect()
    if not neo4j_client.connected:
        return {"people": [], "organizations": [], "locations": []}

    cypher = """
    // Get recent high-quality stories
    MATCH (story:Story)
    WHERE story.coherence_score > 0.6
    WITH story
    ORDER BY story.last_updated DESC
    LIMIT $limit_stories

    // Get entities from these stories
    OPTIONAL MATCH (story)-[:MENTIONS_PERSON]->(person:Person)
    OPTIONAL MATCH (story)-[:MENTIONS_ORG]->(org:Organization)
    OPTIONAL MATCH (story)-[:MENTIONS_LOCATION]->(location:Location)

    WITH
        collect(DISTINCT {
            id: person.id,
            name: person.name,
            thumbnail: person.wikidata_thumbnail,
            qid: person.qid,
            description: person.description,
            story_count: COUNT { (person)<-[:MENTIONS_PERSON]-(:Story) }
        }) as people,
        collect(DISTINCT {
            id: org.id,
            name: org.name,
            thumbnail: org.wikidata_thumbnail,
            domain: org.domain,
            story_count: COUNT { (org)<-[:MENTIONS_ORG]-(:Story) }
        }) as orgs,
        collect(DISTINCT {
            id: location.id,
            name: location.name,
            thumbnail: location.wikidata_thumbnail,
            story_count: COUNT { (location)<-[:MENTIONS_LOCATION]-(:Story) }
        }) as locs

    RETURN people, orgs, locs
    """

    with neo4j_client.driver.session(database=neo4j_client.database) as session:
        result = session.run(cypher, limit_stories=limit_stories)
        record = result.single()

        if not record:
            return {"people": [], "organizations": [], "locations": []}

        # Filter out nulls and sort by story_count
        people = [p for p in record["people"] if p.get("id") and p.get("name")]
        orgs = [o for o in record["orgs"] if o.get("id") and o.get("name")]
        locs = [l for l in record["locs"] if l.get("id") and l.get("name")]

        # Sort by story count (trending)
        people.sort(key=lambda x: x.get("story_count", 0), reverse=True)
        orgs.sort(key=lambda x: x.get("story_count", 0), reverse=True)
        locs.sort(key=lambda x: x.get("story_count", 0), reverse=True)

        return {
            "people": people,
            "organizations": orgs,
            "locations": locs
        }

@app.post("/api/clear-curation-cache")
async def clear_curation_cache():
    """Clear the top stories curation cache to force regeneration."""
    global top_stories_curation_cache
    top_stories_curation_cache['content'] = None
    top_stories_curation_cache['story_ids'] = []
    top_stories_curation_cache['entities_metadata'] = {}
    top_stories_curation_cache['timestamp'] = 0

    return {"success": True, "message": "Cache cleared. Next request will regenerate curation."}

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

@app.get("/api/story/{story_id}/claims")
async def get_story_claims(story_id: str):
    """Get claims for a specific story."""
    try:
        claims = _get_story_claims(story_id)
        return {
            "success": True,
            "claims": claims
        }
    except Exception as e:
        print(f"Error fetching story claims: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/story/{story_id}/entities")
async def get_story_entities(story_id: str):
    """Get entities for a specific story from graph relationships."""
    try:
        entities = _get_story_entities(story_id)
        return {
            "success": True,
            "entities": entities
        }
    except Exception as e:
        print(f"Error fetching story entities: {e}")
        raise HTTPException(status_code=500, detail=str(e))

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
                "content": f"""You are a concise assistant that answers questions about news stories based on verified information.

Story Context:
{context}

Guidelines:
- Answer in 2-3 sentences maximum
- Use only the provided story information
- Be direct and factual - no filler words
- If information isn't available, say so in one sentence
- When citing claims, reference them by number (e.g., "Claim 5 states..." or "Claims 3 and 7 confirm...")
- **ENTITY MARKUP**: When mentioning key entities (people, organizations, locations), wrap ONLY the FIRST mention in double brackets:
  Format: [[Entity Name]]
  Example: "[[Chuck Schumer]] proposed the bill. Schumer also mentioned..." (only first "Chuck Schumer" is marked)
  Example: "According to [[Bernie Sanders]], the policy... Sanders believes..." (only first mention marked)
  WRONG: "[[Chuck Schumer]] proposed... [[Chuck Schumer]] also said..." (don't mark subsequent mentions)
  This will render with entity headshots/icons when available. Only markup major entities, not every noun.
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

        # Call OpenAI API (using gpt-4o-mini for cost efficiency and speed)
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=0.5,  # Lower temp for more focused, concise responses
            max_tokens=200    # Reduced for brevity (roughly 2-3 sentences)
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

@app.post("/api/chat")
async def chat_global(chat_message: StoryChatMessage):
    """
    General chat with Phi (φ) about news topics and article contributions.
    Searches for relevant stories based on user's question and provides links.

    Args:
        chat_message: Contains user message and optional conversation history

    Returns:
        AI-generated response with relevant story links
    """
    if not openai_client:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")

    try:
        # Use embedding-based semantic search for better multilingual matching
        user_text = chat_message.message

        # Get broader set of stories to search through
        all_stories = neo4j_client.get_story_summaries(limit=30, min_coherence=0.5)

        print(f"🔍 Semantic search for: '{user_text}'")

        # Generate embedding for user's question
        try:
            query_response = openai_client.embeddings.create(
                model="text-embedding-3-small",
                input=user_text
            )
            query_embedding = query_response.data[0].embedding
            print(f"   Generated query embedding (dim: {len(query_embedding)})")
        except Exception as e:
            print(f"   Error generating query embedding: {e}")
            # Fallback to empty results if embedding fails
            query_embedding = None

        relevant_stories = []
        if query_embedding:
            # Calculate similarity for each story
            import numpy as np

            for story in all_stories:
                title = story.get('title', '')
                desc = story.get('description') or story.get('gist', '')
                story_text = f"{title}. {desc[:200]}"  # Limit description length

                try:
                    # Generate embedding for story
                    story_response = openai_client.embeddings.create(
                        model="text-embedding-3-small",
                        input=story_text
                    )
                    story_embedding = story_response.data[0].embedding

                    # Calculate cosine similarity
                    query_vec = np.array(query_embedding)
                    story_vec = np.array(story_embedding)
                    similarity = np.dot(query_vec, story_vec) / (np.linalg.norm(query_vec) * np.linalg.norm(story_vec))

                    # Only include stories with similarity > 0.25 (threshold for relevance)
                    # Lower threshold to catch more potentially relevant stories
                    if similarity > 0.25:
                        relevant_stories.append({
                            'story': story,
                            'score': float(similarity)  # Use similarity as score
                        })
                except Exception as e:
                    print(f"   Error processing story '{title[:50]}...': {e}")
                    continue

        # Sort by relevance and take top 5
        relevant_stories.sort(key=lambda x: x['score'], reverse=True)
        top_relevant = relevant_stories[:5]

        print(f"   Found {len(relevant_stories)} relevant stories (similarity > 0.25)")
        if top_relevant:
            print(f"   Top {len(top_relevant)} stories:")
            for item in top_relevant:
                print(f"      - {item['story'].get('title', 'Untitled')} (similarity: {item['score']:.3f})")
        else:
            print(f"   ⚠️  No relevant stories found - Phi will answer generally without story links")

        # Build context with relevant stories and their IDs for linking
        stories_context = ""
        story_references = {}
        if top_relevant:
            stories_context = "Relevant stories you can reference:\n"
            for i, item in enumerate(top_relevant, 1):
                story = item['story']
                story_id = story.get('id', '')
                title = story.get('title', 'Untitled')
                desc = story.get('description') or story.get('gist', '')
                coherence = story.get('coherence_score', 0)

                story_references[i] = {
                    'id': story_id,
                    'title': title
                }

                stories_context += f"{i}. {title}\n   ID: {story_id}\n   {desc[:200]}...\n   (coherence: {int(coherence*100)}%)\n\n"

        # Build conversation messages
        messages = [
            {
                "role": "system",
                "content": f"""You are Phi (φ), an interplanet news oracle from HERE.news.

{stories_context if top_relevant else "No relevant stories found in the database for this query."}

Your role:
- Help users explore and understand current news events across the planet
- ONLY provide links to stories explicitly listed above
- Accept and acknowledge article contributions (users share URLs)
- Encourage collaboration and valuable contributions
- Provide cosmic perspective on trending stories and breaking news

Guidelines:
- Answer in 2-4 sentences maximum - be concise and enlightening
- **CRITICAL**: ONLY link to stories explicitly numbered above using inline markdown format [link text](Story N). NEVER make up story numbers.
- If relevant stories are listed above, use natural inline hyperlinks:
  Example: "There's been major developments in [AI news](Story 1) recently 🤖, and [cryptocurrency regulations](Story 3) are heating up 💰"
- Make link text descriptive (the story subject or key phrase) - NOT generic like "here" or "this"
- **ENTITY MARKUP**: When mentioning key entities (people, organizations, locations), wrap ONLY the FIRST mention in double brackets:
  Format: [[Entity Name]]
  Example: "[[Elon Musk]] announced the new policy. Musk also said..." (only first mention marked)
  Example: "[[SpaceX]] launched today. The company reported..." (only first mention marked)
  WRONG: "[[Elon Musk]] announced... [[Elon Musk]] also said..." (don't mark subsequent mentions)
  This will render with entity headshots/icons when available. Only markup major entities, not every noun.
- If NO stories are listed (see "No relevant stories" message), answer generally WITHOUT any links and invite users to share articles on the topic
- When users share URLs, they're contributing articles to build stories (our system handles submission)
- Be friendly, appreciative, and encouraging with a hint of wisdom
- Add emojis that naturally fit the mood
- Mention that valuable contributions may earn rewards
- If you don't have specific information, say so briefly and invite contributions
- Maintain a helpful, collaborative tone with an oracle-like presence

Remember: You're Phi (φ), an interplanet news oracle - not "Oracle" or "HERE.news AI" """
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

        # Call OpenAI API
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=0.7,  # Slightly higher for more natural conversation
            max_tokens=250    # Slightly more for general discussion
        )

        assistant_message = response.choices[0].message.content

        # Replace inline [link text](Story N) with actual story URLs
        if story_references:
            import re as regex_module
            for story_num, story_data in story_references.items():
                story_id = story_data['id']
                story_title = story_data['title']
                # Create URL-friendly slug
                slug = story_title.lower().replace(' ', '-')
                slug = regex_module.sub(r'[^\w\s-]', '', slug)
                slug = regex_module.sub(r'[-\s]+', '-', slug)

                # Replace [link text](Story N) with [link text](/story/id/slug)
                # This preserves the LLM's descriptive link text
                pattern = rf'\[([^\]]+)\]\(Story {story_num}\)'
                replacement = rf'[\1](/story/{story_id}/{slug})'
                assistant_message = regex_module.sub(pattern, replacement, assistant_message)

        # Entity markup [[Entity Name]] will be resolved by frontend
        # using existing /api/entity?name=... endpoint for better performance

        return {
            "success": True,
            "response": assistant_message
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in global chat: {e}")
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
           COALESCE(claim.event_time, artifact.pub_time) as created_at,
           artifact.url as source_url
    ORDER BY COALESCE(claim.event_time, artifact.pub_time) DESC
    """

    with neo4j_client.driver.session(database=neo4j_client.database) as session:
        result = session.run(cypher, story_id=story_id)
        claims = []
        for record in result:
            if record["text"]:
                # Convert Neo4j datetime to ISO string if present
                created_at = record.get("created_at")
                if created_at and hasattr(created_at, 'isoformat'):
                    created_at = created_at.isoformat()
                elif created_at:
                    created_at = str(created_at)

                claims.append({
                    "text": record["text"],
                    "confidence": record.get("confidence"),
                    "type": record.get("type"),
                    "created_at": created_at,
                    "source_url": record.get("source_url")
                })
        return claims

def _get_story_entities(story_id: str) -> Dict:
    """Get all entities associated with a story from graph relationships."""
    if not neo4j_client.connected:
        neo4j_client._connect()
    if not neo4j_client.connected:
        return {"persons": [], "organizations": [], "locations": []}

    # Use Story-[:MENTIONS]->Entity relationships (created during synthesis)
    # NOT Page-[:MENTIONS_ENTITY]->Entity (those don't exist)
    cypher = """
    MATCH (story:Story {id: $story_id})
    OPTIONAL MATCH (story)-[:MENTIONS]->(person:Person)
    OPTIONAL MATCH (story)-[:MENTIONS_ORG]->(org:Organization)
    OPTIONAL MATCH (story)-[:MENTIONS_LOCATION]->(location:Location)
    WITH story,
         collect(DISTINCT person) as people,
         collect(DISTINCT org) as orgs,
         collect(DISTINCT location) as locations
    UNWIND people + orgs + locations as entity
    WHERE entity IS NOT NULL
    RETURN DISTINCT
           labels(entity)[0] as entity_type,
           entity.canonical_id as canonical_id,
           entity.canonical_name as name,
           entity.wikidata_qid as qid,
           entity.wikidata_thumbnail as wikidata_thumbnail,
           entity.description as description,
           entity.confidence as confidence
    ORDER BY entity.canonical_name
    """

    with neo4j_client.driver.session(database=neo4j_client.database) as session:
        result = session.run(cypher, story_id=story_id)
        entities = {
            "persons": [],
            "organizations": [],
            "locations": []
        }

        for record in result:
            entity_type = record.get("entity_type", "").lower()
            entity_data = {
                "canonical_id": record.get("canonical_id"),
                "name": record.get("name"),
                "qid": record.get("qid"),
                "wikidata_thumbnail": record.get("wikidata_thumbnail"),
                "description": record.get("description"),
                "confidence": record.get("confidence")
            }

            if entity_type == "person":
                entities["persons"].append(entity_data)
            elif entity_type == "organization":
                entities["organizations"].append(entity_data)
            elif entity_type == "location":
                entities["locations"].append(entity_data)

        return entities

def _strip_entity_markup(text: str) -> str:
    """Remove entity markup [[Name]] from text, leaving just the name."""
    return re.sub(r'\[\[([^\]]+)\]\]', r'\1', text)

def _build_story_context(story: Dict, claims: List[Dict]) -> str:
    """Build formatted context string for the LLM."""
    context_parts = []

    # Title and description
    context_parts.append(f"Title: {story.get('title', 'Untitled')}")
    if story.get('description'):
        clean_description = _strip_entity_markup(story['description'])
        context_parts.append(f"\nSummary: {clean_description}")

    # Full content if available
    if story.get('content'):
        # Strip entity markup and truncate if too long
        clean_content = _strip_entity_markup(story['content'])
        content = clean_content[:4000]
        if len(clean_content) > 4000:
            content += "... [truncated]"
        context_parts.append(f"\nContent: {content}")

    # Claims (up to 50)
    if claims:
        context_parts.append(f"\n\nVerified Claims ({len(claims[:50])}):")
        for i, claim in enumerate(claims[:50], 1):
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

    NOTE: Cache checking is currently disabled with GCS pipeline.
    The Cloud Run service handles deduplication internally.
    """
    # TODO: Implement GCS-based cache lookup if needed
    # For now, always return cache miss - Cloud Run service will handle deduplication
    print(f"🔍 Cache check for {url} - disabled with GCS pipeline")
    return {"cache_hit": False, "message": "Cache checking disabled with GCS pipeline"}

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

    # Call Cloud Run service's /submit endpoint
    remote_url = "https://story-engine-here-179431661561.us-central1.run.app/submit"
    print(f"🌱 Seed extraction request: {url}")

    try:
        form_data = {
            "url": url,
            "response_format": "json"
        }
        if user_id:
            form_data["user_id"] = user_id

        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            response = await client.post(
                remote_url,
                data=form_data,
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )

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
                task_id = result.get("task_id")
                if not task_id:
                    raise ValueError("No task_id in response")

                # Store task_id -> user_id mapping for WebSocket broadcasts
                if user_id:
                    task_user_mapping[task_id] = user_id
                    print(f"✅ Seed task created: {task_id} (user: {user_id})")
                else:
                    print(f"✅ Seed task created: {task_id} (no user_id)")

                return {
                    "seed_id": f"seed_{int(__import__('time').time() * 1000)}",
                    "user_id": user_id,
                    "type": "url_only" if not text_only else "mixed",
                    "text": text_only,
                    "urls": urls,
                    "task_id": task_id,
                    "status": "submitted",
                    "message": "Extraction job submitted to Cloud Run"
                }

            except (json.JSONDecodeError, ValueError) as e:
                print(f"❌ Failed to parse response: {e}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Invalid response from remote service: {str(e)}"
                )

    except httpx.TimeoutException:
        print(f"❌ Timeout calling remote service")
        raise HTTPException(status_code=504, detail="Request to extraction service timed out")
    except httpx.RequestError as e:
        print(f"❌ Request error: {e}")
        raise HTTPException(status_code=503, detail=f"Failed to reach extraction service: {str(e)}")

@app.post("/api/extract")
async def extract_url(submission: URLSubmission, request: Request):
    """Submit URL for extraction - returns immediately with task_id"""
    user_id = submission.user_id or request.headers.get('x-user-id')
    url = submission.url
    print(f"🔍 Homepage extraction request: {url}")

    # Call Cloud Run service's /submit endpoint (same as builder submission)
    remote_url = "https://story-engine-here-179431661561.us-central1.run.app/submit"

    try:
        form_data = {
            "url": url,
            "response_format": "json"
        }
        if user_id:
            form_data["user_id"] = user_id

        print(f"📤 Sending to {remote_url}")
        print(f"📤 Form data: {form_data}")

        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            response = await client.post(
                remote_url,
                data=form_data,
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )

            print(f"📥 Response status: {response.status_code}")
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
                task_id = result.get("task_id")
                if not task_id:
                    raise ValueError("No task_id in response")

                # Store task_id -> user_id mapping for WebSocket broadcasts
                if user_id:
                    task_user_mapping[task_id] = user_id
                    print(f"✅ Task created: {task_id} (user: {user_id})")
                else:
                    print(f"✅ Task created: {task_id} (no user_id)")

                # Broadcast task creation to WebSocket clients
                asyncio.create_task(broadcast_task_created(
                    task_id=task_id,
                    url=url,
                    story_id=None
                ))

                return {
                    "task_id": task_id,
                    "status": "submitted",
                    "message": "Extraction job submitted to Cloud Run",
                    "user_id": user_id
                }

            except (json.JSONDecodeError, ValueError) as e:
                print(f"❌ Failed to parse response: {e}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Invalid response from remote service: {str(e)}"
                )

    except httpx.TimeoutException:
        print(f"❌ Timeout calling remote service")
        raise HTTPException(status_code=504, detail="Request to extraction service timed out")
    except httpx.RequestError as e:
        print(f"❌ Request error: {e}")
        raise HTTPException(status_code=503, detail=f"Failed to reach extraction service: {str(e)}")

@app.post("/api/story/{story_id}/add-page")
async def add_page_to_story(story_id: str, submission: URLSubmission, request: Request):
    """
    Add page to story by calling Cloud Run service's /submit endpoint directly
    with target_story_id as a form parameter.

    This bypasses the webapp's task_store and directly calls the Cloud Run worker,
    which will handle task creation and linking to the specified story.

    Returns task_id for polling.
    """
    user_id = submission.user_id or request.headers.get('x-user-id')
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
        if user_id:
            form_data["user_id"] = user_id

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

                # Store task_id -> user_id mapping for WebSocket broadcasts
                if user_id:
                    task_user_mapping[task_id] = user_id
                    print(f"✓ Task created: {task_id} for story {story_id} (user: {user_id})")
                else:
                    print(f"✓ Task created: {task_id} for story {story_id} (no user_id)")

                # Broadcast task creation to WebSocket clients with story association
                asyncio.create_task(broadcast_task_created(
                    task_id=task_id,
                    url=url,
                    story_id=story_id
                ))

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

# Helper function: Fetch task from remote backend service
async def fetch_remote_task(task_id: str) -> dict:
    """
    Fetch task from remote backend service when not found locally.

    Raises HTTPException with appropriate status codes:
    - 404: Task not found on remote
    - 504: Timeout
    - 503: Connection error
    """
    try:
        # Increased timeout to 90s to handle large responses (tasks with full content can be 100+ KB)
        async with httpx.AsyncClient(timeout=90.0) as client:
            response = await client.get(f"{BACKEND_SERVICE_URL}/api/task/{task_id}")
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 404:
                raise HTTPException(status_code=404, detail="Task not found")
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Remote service error: {response.text}"
                )
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Timeout connecting to backend service")
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Failed to connect to backend service: {str(e)}")


# Helper function: Build task response from local task object
def build_task_response(task, user_id: str = None) -> dict:
    """Build standardized task response dict from task object."""
    response = {
        "task_id": task.task_id,
        "url": task.url,
        "status": task.status,
        "current_stage": task.current_stage,
        "created_at": task.created_at,
        "completed_at": task.completed_at,
        "token_costs": task.token_costs,
        "gcs_paths": task.gcs_paths,
        "user_id": user_id
    }

    # Include iFramely preview metadata if available
    if task.preview_meta:
        response["preview_meta"] = task.preview_meta

    # Add status-specific fields
    if task.status == TaskStatus.COMPLETED:
        response["result"] = task.result
        if task.semantic_data:
            response["semantic_data"] = task.semantic_data
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

    # Include story_match field if available
    if hasattr(task, 'story_match') and task.story_match:
        response["story_match"] = task.story_match

    return response


# Helper function: Broadcast task completion via WebSocket
async def broadcast_task_completion(task):
    """Broadcast task completion if not already broadcasted."""
    if task.status == TaskStatus.COMPLETED and task.user_id:
        if not hasattr(task, '_broadcasted') or not task._broadcasted:
            task._broadcasted = True
            await manager.broadcast({
                "type": "task.completed",
                "task_id": task.task_id,
                "user_id": task.user_id,
                "result": task.result,
                "story_match": task.story_match if hasattr(task, 'story_match') else None,
                "url": task.url,
                "timestamp": datetime.now().isoformat()
            })


@app.get("/api/task/{task_id}")
async def get_task_status(task_id: str):
    """
    Get extraction task status and result.

    Checks local storage first, then proxies to remote backend service if not found.
    """
    # Try local storage first
    task = task_store.get_task(task_id)

    if not task:
        # Not found locally - proxy to remote backend service
        return await fetch_remote_task(task_id)

    # Found locally - attach user_id from mapping if needed
    user_id = task.user_id or task_user_mapping.get(task_id)
    if user_id and not task.user_id:
        task.user_id = user_id

    # Build response
    response = build_task_response(task, user_id)

    # Broadcast completion via WebSocket if applicable
    asyncio.create_task(broadcast_task_completion(task))

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

        # Build citations dictionary from artifacts (pages)
        # Citations reference page IDs in {{cite:page_id}} markup
        artifacts = story.get('artifacts', [])
        print(f"📚 Building citations for story {story_id}: found {len(artifacts)} artifacts")

        citations = {}
        for artifact in artifacts:
            if artifact and artifact.get('id'):
                page_id = artifact['id']
                citations[page_id] = {
                    'url': artifact.get('url', ''),
                    'title': artifact.get('title', ''),
                    'domain': artifact.get('domain', ''),
                    'pub_time': artifact.get('pub_time') or artifact.get('published_at') or artifact.get('publish_date'),
                    'snippet': artifact.get('gist', '')
                }

        print(f"📚 Built {len(citations)} citations")

        return {
            "id": story.get('id'),
            "title": story.get('title'),
            "description": story.get('description'),
            "content": story.get('content'),  # Full story content with entity/citation markup
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
            "revision": story.get('revision', 'v0.45'),
            "citations": citations,  # Build from artifacts for {{cite:id}} markup rendering
            "people_entities": story.get('people_entities', []),  # Entity data for inline markup
            "org_entities": story.get('org_entities', []),
            "location_entities": story.get('location_entities', [])
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

# WebSocket endpoint for real-time updates
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint with proper async handling.
    """
    await websocket.accept()
    user_id = f'user_{id(websocket)}'

    # Add to active connections
    async with manager._lock:
        manager.active_connections.append(websocket)
        manager.connection_users[websocket] = user_id

    print(f"✅ WebSocket connected: {user_id} (total: {len(manager.active_connections)})")

    # Ping task to keep connection alive
    async def send_pings():
        try:
            while True:
                await asyncio.sleep(30)
                await websocket.send_json({"type": "ping", "timestamp": time.time()})
        except:
            pass

    ping_task = asyncio.create_task(send_pings())

    try:
        # Send connection confirmation
        await websocket.send_json({
            "type": "connected",
            "user_id": user_id
        })

        # Listen for messages from client
        while True:
            message = await websocket.receive()

            # Check for disconnect
            if message.get("type") == "websocket.disconnect":
                break

            # Handle different message types
            if "text" in message:
                try:
                    data = json.loads(message["text"])
                    msg_type = data.get("type")

                    if msg_type == "pong":
                        pass  # Client is alive
                    elif msg_type == "subscribe":
                        story_id = data.get("story_id")
                        if story_id:
                            async with manager._lock:
                                manager.subscriptions[user_id].add(story_id)
                except json.JSONDecodeError:
                    print(f"⚠️ Received invalid JSON: {message['text']}")
            elif "bytes" in message:
                pass  # Ignore binary messages

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"❌ WebSocket error: {e}")
    finally:
        ping_task.cancel()
        # Remove from connections
        async with manager._lock:
            if websocket in manager.active_connections:
                manager.active_connections.remove(websocket)
            manager.connection_users.pop(websocket, None)
            if user_id in manager.subscriptions:
                del manager.subscriptions[user_id]
        print(f"❌ WebSocket disconnected: {user_id} (total: {len(manager.active_connections)})")

# Helper function to broadcast story updates (called by pipeline hooks)
async def broadcast_story_event(event_type: str, story_data: Dict[str, Any]):
    """
    Broadcast story event to all connected clients.

    Event types:
    - story.created: New story appeared
    - story.updated: Story coherence/content updated
    - story.emerging: Low coherence story needing sources
    - task.completed: User submission finished processing
    """
    await manager.broadcast({
        "type": event_type,
        "story": story_data,
        "timestamp": datetime.now().isoformat()
    })

# Serve static files and React app
# Note: Vite dev mode serves assets directly, no /assets mount needed in dev

@app.get("/{full_path:path}")
async def serve_spa(full_path: str, request: Request):
    """Serve the React SPA for all routes with dynamic OG tags for story pages"""

    # Skip SPA for certain paths (let them 404 or be handled by other routes)
    skip_paths = ['api/', 'ws', 'app/', 'assets/', 'node_modules/', '@']
    if any(full_path.startswith(path) for path in skip_paths):
        raise HTTPException(status_code=404, detail="Not found")

    # Check if this is a story URL
    story_match = re.match(r'^story/([a-f0-9-]+)(?:/.*)?$', full_path)

    if story_match:
        story_id = story_match.group(1)

        try:
            # Fetch story data from Neo4j
            story = neo4j_client.get_story_by_id(story_id)

            if story:
                # Read the built HTML file
                html_path = "dist/index.html"
                with open(html_path, 'r', encoding='utf-8') as f:
                    html_content = f.read()

                # Extract story metadata
                title = story.get('title', 'Untitled Story')
                description = story.get('description') or story.get('gist', 'Read the full story on HERE.news')

                # Truncate description for OG tags (recommended max 200 chars)
                if len(description) > 200:
                    description = description[:197] + '...'

                # Escape HTML special characters to prevent XSS
                title = html.escape(title)
                description = html.escape(description)

                # Try to get a preview image - prefer cover_image, then entity thumbnails
                preview_image = "https://here.news/og-default.png"

                # First, try cover_image if available
                if story.get('cover_image'):
                    preview_image = story['cover_image']
                else:
                    # Fallback: Try to get image from story entities
                    for entity_type in ['people_entities', 'org_entities', 'location_entities']:
                        entities = story.get(entity_type, [])
                        if entities:
                            for entity in entities:
                                if entity.get('wikidata_thumbnail'):
                                    preview_image = entity['wikidata_thumbnail']
                                    break
                        if preview_image != "https://here.news/og-default.png":
                            break

                # Build full URL
                base_url = str(request.base_url).rstrip('/')
                story_url = f"{base_url}/story/{story_id}"

                # Replace OG tags in HTML
                # Replace default title
                html_content = html_content.replace(
                    '<meta property="og:title" content="HERE.news - Curated News Stories" />',
                    f'<meta property="og:title" content="{title} - HERE.news" />'
                )
                html_content = html_content.replace(
                    '<meta name="twitter:title" content="HERE.news - Curated News Stories" />',
                    f'<meta name="twitter:title" content="{title} - HERE.news" />'
                )
                html_content = html_content.replace(
                    '<title>HERE.news</title>',
                    f'<title>{title} - HERE.news</title>'
                )

                # Replace description
                html_content = html_content.replace(
                    '<meta property="og:description" content="Discover and explore curated news stories with verified claims, entity relationships, and real-time updates." />',
                    f'<meta property="og:description" content="{description}" />'
                )
                html_content = html_content.replace(
                    '<meta name="twitter:description" content="Discover and explore curated news stories with verified claims, entity relationships, and real-time updates." />',
                    f'<meta name="twitter:description" content="{description}" />'
                )

                # Replace URL
                html_content = html_content.replace(
                    '<meta property="og:url" content="https://here.news" />',
                    f'<meta property="og:url" content="{story_url}" />'
                )

                # Replace image
                html_content = html_content.replace(
                    '<meta property="og:image" content="https://here.news/og-default.png" />',
                    f'<meta property="og:image" content="{preview_image}" />'
                )
                html_content = html_content.replace(
                    '<meta name="twitter:image" content="https://here.news/og-default.png" />',
                    f'<meta name="twitter:image" content="{preview_image}" />'
                )

                # Change type to article for story pages
                html_content = html_content.replace(
                    '<meta property="og:type" content="website" />',
                    '<meta property="og:type" content="article" />'
                )

                return HTMLResponse(
                    content=html_content,
                    headers={
                        "Cache-Control": "no-cache, no-store, must-revalidate",
                        "Pragma": "no-cache",
                        "Expires": "0"
                    }
                )
        except Exception as e:
            print(f"⚠️ Error generating OG tags for story {story_id}: {e}")
            # Fall through to default response

    # Default: serve built HTML
    response = FileResponse("dist/index.html")
    # Disable caching to prevent stale bundles
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=7272)
