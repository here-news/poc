"""
Neo4j client for querying story graph database
"""
import os
from typing import List, Dict, Optional
from neo4j import GraphDatabase


class Neo4jClient:
    def __init__(self):
        self.uri = os.getenv('NEO4J_URI')
        self.username = os.getenv('NEO4J_USERNAME')
        self.password = os.getenv('NEO4J_PASSWORD')
        self.database = os.getenv('NEO4J_DATABASE', 'neo4j')
        self.driver = None
        self.connected = False

        self._connect()

    def _connect(self):
        """Attempt to connect to Neo4j if credentials are available."""
        if self.connected:
            return

        if not all([self.uri, self.username, self.password]):
            print("⚠️  Neo4j credentials not configured - story feed disabled")
            return

        try:
            self.driver = GraphDatabase.driver(
                self.uri,
                auth=(self.username, self.password)
            )

            with self.driver.session(database=self.database) as session:
                session.run("RETURN 1")

            self.connected = True
            print("✅ Connected to Neo4j for story feed")
        except Exception as exc:
            print(f"❌ Failed to connect to Neo4j: {exc}")
            self.connected = False
            if self.driver:
                self.driver.close()
                self.driver = None

    def close(self):
        """Close the driver connection"""
        if self.driver:
            self.driver.close()
        self.driver = None
        self.connected = False

    def get_recent_stories(self, limit: int = 10) -> List[Dict]:
        """Public helper retained for compatibility with LiveSignals."""
        summaries = self.get_story_summaries(limit=limit)

        # Map to legacy structure expected by the UI (health indicator heuristics)
        stories = []
        for summary in summaries:
            health_indicator = 'unknown'
            # Simple heuristics: local stories -> healthy, global high entropy -> growing
            category = summary.get('category')
            entropy = summary.get('entropy', 0)
            artifact_count = summary.get('artifact_count', 0)

            if category == 'local':
                health_indicator = 'healthy'
            elif entropy and entropy > 0.7:
                health_indicator = 'growing'
            elif artifact_count == 0:
                health_indicator = 'archived'

            stories.append({
                'id': summary.get('id', ''),
                'title': summary.get('title', 'Untitled Story'),
                'description': summary.get('description', ''),
                'created_at': summary.get('created_at'),
                'last_updated': summary.get('updated_at'),
                'timestamp': summary.get('last_updated_human', 'unknown'),
                'health_indicator': health_indicator,
                'claim_count': summary.get('claim_count', 0),
                'contributor_count': summary.get('people_count', 0)
            })

        return stories

    def get_story_summaries(self, limit: int = 20) -> List[Dict]:
        """Fetch enriched story summaries suitable for the homepage chat experience."""
        if not self.connected:
            self._connect()

        if not self.connected:
            return []

        query = """
        MATCH (story:Story)

        OPTIONAL MATCH (story)-[:HAS_ARTIFACT]->(artifact:Artifact)
        OPTIONAL MATCH (story)-[:HAS_CLAIM]->(claim:Claim)
        OPTIONAL MATCH (story)-[:MENTIONS]->(person:Person)
        OPTIONAL MATCH (story)-[:MENTIONS_LOCATION]->(location:Location)
        OPTIONAL MATCH (artifact)-[:MENTIONS_LOCATION]->(artifact_location:Location)

        WITH story,
             count(DISTINCT artifact) as artifact_count,
             count(DISTINCT claim) as claim_count,
             count(DISTINCT person) as people_count,
             collect(DISTINCT location) + collect(DISTINCT artifact_location) as all_locations,
             head([a IN collect(DISTINCT artifact) WHERE a.thumbnail_url IS NOT NULL AND a.thumbnail_url <> '' | a.thumbnail_url]) as cover_thumbnail,
             max(artifact.created_at) as last_artifact_date

        WHERE artifact_count > 0

        RETURN story.id as id,
               story.topic as title,
               story.gist as description,
               artifact_count,
               claim_count,
               people_count,
               [loc in all_locations WHERE loc.name IS NOT NULL | loc.name] as locations,
               story.confidence as confidence,
               story.entropy as entropy,
               story.created_at as created_at,
               story.updated_at as updated_at,
               coalesce(cover_thumbnail, '') as cover_image,
               coalesce(last_artifact_date, story.updated_at, story.created_at) as last_activity
        ORDER BY last_activity DESC
        LIMIT $limit
        """

        with self.driver.session(database=self.database) as session:
            result = session.run(query, limit=limit)
            summaries: List[Dict] = []

            for record in result:
                created_at = self._format_datetime(record.get('created_at'))
                updated_at = self._format_datetime(record.get('updated_at'))
                last_activity = self._format_datetime(record.get('last_activity'))

                summaries.append({
                    'id': record.get('id'),
                    'title': record.get('title') or 'Untitled Story',
                    'description': record.get('description') or '',
                    'artifact_count': record.get('artifact_count', 0),
                    'claim_count': record.get('claim_count', 0),
                    'people_count': record.get('people_count', 0),
                    'locations': record.get('locations') or [],
                    'confidence': record.get('confidence') or 0.7,
                    'entropy': record.get('entropy') or 0.5,
                    'category': self._infer_category(record.get('locations') or []),
                    'cover_image': record.get('cover_image') or '',
                    'created_at': created_at,
                    'updated_at': updated_at,
                    'last_activity': last_activity,
                    'last_updated_human': self._format_time_ago(last_activity)
                })

            return summaries

    def _format_datetime(self, timestamp) -> Optional[str]:
        if not timestamp:
            return None

        try:
            if hasattr(timestamp, 'isoformat'):
                return timestamp.isoformat()
            if isinstance(timestamp, str):
                return timestamp
            return str(timestamp)
        except Exception:
            return None

    def _infer_category(self, locations: List[str]) -> str:
        if not locations:
            return 'global'

        us_indicators = {
            'united states', 'usa', 'us', 'america', 'washington', 'new york',
            'california', 'texas', 'florida', 'illinois', 'pennsylvania', 'ohio',
            'georgia', 'north carolina', 'michigan', 'nevada', 'arizona'
        }

        for location in locations:
            if any(indicator in location.lower() for indicator in us_indicators):
                return 'local'

        return 'global'

    def search_stories_by_text(self, query_text: str, limit: int = 5) -> List[Dict]:
        """
        Search stories by text query (basic substring match)

        TODO: Implement vector similarity search with embeddings
        """
        query = """
        MATCH (s:Story)
        WHERE toLower(s.title) CONTAINS toLower($query_text)
           OR toLower(s.description) CONTAINS toLower($query_text)
        OPTIONAL MATCH (s)-[:HAS_CLAIM]->(c:Claim)
        OPTIONAL MATCH (s)<-[:CONTRIBUTED_TO]-(u:User)
        WITH s,
             count(DISTINCT c) as claim_count,
             count(DISTINCT u) as contributor_count
        RETURN s.id as id,
               s.title as title,
               s.description as description,
               s.last_updated as last_updated,
               s.health_indicator as health_indicator,
               claim_count,
               contributor_count
        ORDER BY s.last_updated DESC
        LIMIT $limit
        """

        with self.driver.session(database=self.database) as session:
            result = session.run(query, query_text=query_text, limit=limit)
            stories = []

            for record in result:
                last_updated = record.get('last_updated')
                time_ago = self._format_time_ago(last_updated) if last_updated else 'unknown'

                stories.append({
                    'id': record.get('id', ''),
                    'title': record.get('title', 'Untitled Story'),
                    'description': record.get('description', ''),
                    'last_updated': record.get('last_updated'),
                    'timestamp': time_ago,
                    'health_indicator': record.get('health_indicator', 'unknown'),
                    'claim_count': record.get('claim_count', 0),
                    'contributor_count': record.get('contributor_count', 0),
                    'match_score': 0.85  # Placeholder for future vector similarity
                })

            return stories

    def _format_time_ago(self, timestamp) -> str:
        """Format timestamp as relative time (e.g., '2h ago')"""
        if not timestamp:
            return 'unknown'

        from datetime import datetime, timezone

        try:
            # Handle different timestamp formats
            if isinstance(timestamp, str):
                dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            elif hasattr(timestamp, 'to_native'):
                # Neo4j DateTime object
                dt = timestamp.to_native()
            else:
                dt = timestamp

            # Make timezone-aware
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)

            now = datetime.now(timezone.utc)
            diff = now - dt

            seconds = int(diff.total_seconds())

            if seconds < 60:
                return 'just now'
            elif seconds < 3600:
                minutes = seconds // 60
                return f'{minutes}m ago'
            elif seconds < 86400:
                hours = seconds // 3600
                return f'{hours}h ago'
            elif seconds < 604800:
                days = seconds // 86400
                return f'{days}d ago'
            else:
                weeks = seconds // 604800
                return f'{weeks}w ago'
        except Exception as e:
            print(f"Error formatting timestamp: {e}")
            return 'unknown'


# Singleton instance
neo4j_client = Neo4jClient()
