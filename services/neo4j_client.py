"""Neo4j client for querying story graph database with optional embedding search."""

import os
from typing import Dict, List, Optional

import numpy as np
from neo4j import GraphDatabase

try:  # Optional dependency
    from openai import OpenAI  # type: ignore
except ImportError:  # pragma: no cover
    OpenAI = None  # type: ignore


class Neo4jClient:
    def __init__(self):
        self.uri = os.getenv('NEO4J_URI')
        self.username = os.getenv('NEO4J_USERNAME')
        self.password = os.getenv('NEO4J_PASSWORD')
        self.database = os.getenv('NEO4J_DATABASE', 'neo4j')
        self.driver = None
        self.connected = False

        self.embedding_model = os.getenv('EMBEDDING_MODEL', 'text-embedding-3-small')
        self.openai_client = None

        openai_key = os.getenv('OPENAI_API_KEY')
        if openai_key and OpenAI:
            try:
                self.openai_client = OpenAI(api_key=openai_key)
                print("✅ OpenAI client initialised for story search embeddings")
            except Exception as exc:  # pragma: no cover - network failure
                print(f"⚠️  Failed to initialise OpenAI client: {exc}")
                self.openai_client = None
        elif openai_key and not OpenAI:
            print("⚠️  openai package not installed - embeddings disabled")

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

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def get_recent_stories(self, limit: int = 10) -> List[Dict]:
        """Legacy helper used by homepage widgets."""
        summaries = self.get_story_summaries(limit=limit)
        stories = []
        for summary in summaries:
            stories.append({
                'id': summary.get('id', ''),
                'title': summary.get('title', 'Untitled Story'),
                'description': summary.get('description', ''),
                'created_at': summary.get('created_at'),
                'last_updated': summary.get('updated_at'),
                'timestamp': summary.get('last_updated_human', 'unknown'),
                'health_indicator': summary.get('health_indicator', 'unknown'),
                'claim_count': summary.get('claim_count', 0),
                'contributor_count': summary.get('people_count', 0)
            })
        return stories

    def get_story_summaries(self, limit: int = 20) -> List[Dict]:
        """Fetch enriched story summaries suitable for homepage and chat."""
        if not self.connected:
            self._connect()
        if not self.connected:
            return []

        cypher = """
        MATCH (story:Story)
        // Match all artifact types (Page, File, Image, Video) using base Artifact label
        // For now only Page exists, but this is future-proof
        OPTIONAL MATCH (story)-[:HAS_ARTIFACT]->(artifact)
        WHERE artifact:Page OR artifact:Artifact
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
        RETURN story.id as id,
               coalesce(story.title, story.topic) as title,
               story.gist as description,
               story.content as content,
               story.coherence_score as coherence_score,
               artifact_count,
               claim_count,
               people_count,
               [loc in all_locations WHERE loc.name IS NOT NULL | loc.name] as locations,
               story.confidence as confidence,
               story.entropy as entropy,
               story.created_at as created_at,
               story.last_updated as updated_at,
               coalesce(cover_thumbnail, '') as cover_image,
               coalesce(story.last_updated, last_artifact_date, story.created_at) as last_activity
        ORDER BY last_activity DESC
        LIMIT $limit
        """

        with self.driver.session(database=self.database) as session:
            result = session.run(cypher, limit=limit)
            summaries: List[Dict] = []
            for record in result:
                summary = self._record_to_summary(record)
                summaries.append(summary)
            return summaries

    def search_story_summaries(self, query: str, limit: int = 5) -> List[Dict]:
        """Search stories using substring and optional embedding similarity."""
        if not query:
            return []
        if not self.connected:
            self._connect()
        if not self.connected:
            return []

        trimmed = query.strip()
        if not trimmed:
            return []

        substring_matches = self._search_story_summaries_substring(trimmed, limit * 2)

        embedding_matches: List[Dict] = []
        if self.openai_client:
            embedding = self._generate_embedding(trimmed)
            if embedding:
                embedding_matches = self._search_story_summaries_embedding(embedding, trimmed, max(limit * 5, 25))

        combined: Dict[str, Dict] = {}

        def add(entry: Dict, similarity: float):
            story_id = entry.get('id')
            if not story_id:
                return
            existing = combined.get(story_id)
            if existing:
                if similarity > existing.get('similarity', 0):
                    merged = {**existing, **entry}
                    merged['similarity'] = similarity
                    combined[story_id] = merged
            else:
                entry_copy = {**entry}
                entry_copy['similarity'] = similarity
                combined[story_id] = entry_copy

        for entry in substring_matches:
            add(entry, entry.get('similarity', 0.55))

        for entry in embedding_matches:
            add(entry, entry.get('similarity', 0.0))

        ranked = sorted(combined.values(), key=lambda item: item.get('similarity', 0), reverse=True)

        for summary in ranked:
            similarity = summary.get('similarity')
            if similarity is not None:
                summary['confidence'] = similarity
                summary['match_score'] = similarity

        return ranked[:limit]

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------
    def _search_story_summaries_substring(self, query: str, limit: int) -> List[Dict]:
        cypher = """
        MATCH (story:Story)
        OPTIONAL MATCH (story)-[:HAS_ARTIFACT]->(artifact:Artifact)
        OPTIONAL MATCH (story)-[:HAS_CLAIM]->(claim:Claim)
        OPTIONAL MATCH (story)-[:MENTIONS]->(person:Person)
        OPTIONAL MATCH (story)-[:MENTIONS_LOCATION]->(location:Location)
        OPTIONAL MATCH (artifact)-[:MENTIONS_LOCATION]->(artifact_location:Location)
        WITH story,
             collect(DISTINCT artifact) AS artifacts,
             collect(DISTINCT claim) AS claims,
             collect(DISTINCT person) AS people,
             collect(DISTINCT location) + collect(DISTINCT artifact_location) AS all_locations,
             max(artifact.created_at) AS last_artifact_date,
             toLower($search_text) AS q
        WITH story, artifacts, claims, people, all_locations, last_artifact_date, q,
             size(artifacts) AS artifact_count,
             size(claims) AS claim_count,
             size(people) AS people_count,
             head([a IN artifacts WHERE a.thumbnail_url IS NOT NULL AND a.thumbnail_url <> '' | a.thumbnail_url]) AS cover_thumbnail
        WHERE artifact_count > 0 AND (
              (story.topic IS NOT NULL AND toLower(story.topic) CONTAINS q)
           OR (story.gist IS NOT NULL AND toLower(story.gist) CONTAINS q)
           OR any(a IN artifacts WHERE (a.title IS NOT NULL AND toLower(a.title) CONTAINS q)
                                   OR (a.description IS NOT NULL AND toLower(a.description) CONTAINS q))
           OR any(loc IN all_locations WHERE loc.name IS NOT NULL AND toLower(loc.name) CONTAINS q)
        )
        WITH story, artifact_count, claim_count, people_count, all_locations, cover_thumbnail,
             coalesce(last_artifact_date, story.updated_at, story.created_at) AS last_activity
        RETURN story.id AS id,
               story.topic AS title,
               story.gist AS description,
               artifact_count,
               claim_count,
               people_count,
               [loc IN all_locations WHERE loc.name IS NOT NULL | loc.name] AS locations,
               story.confidence AS confidence,
               story.entropy AS entropy,
               story.created_at AS created_at,
               story.updated_at AS updated_at,
               cover_thumbnail AS cover_image,
               last_activity
        ORDER BY last_activity DESC
        LIMIT $limit
        """

        with self.driver.session(database=self.database) as session:
            result = session.run(cypher, search_text=query.lower(), limit=limit)
            matches: List[Dict] = []
            for record in result:
                summary = self._record_to_summary(record)
                summary['similarity'] = 0.55
                matches.append(summary)
            return matches

    def _search_story_summaries_embedding(self, query_embedding: List[float], query_text: str, limit: int) -> List[Dict]:
        if not self.connected:
            return []

        cypher = """
        MATCH (story:Story)
        WHERE story.embedding IS NOT NULL
        OPTIONAL MATCH (story)-[:HAS_ARTIFACT]->(artifact:Artifact)
        OPTIONAL MATCH (story)-[:HAS_CLAIM]->(claim:Claim)
        OPTIONAL MATCH (story)-[:MENTIONS]->(person:Person)
        OPTIONAL MATCH (story)-[:MENTIONS_LOCATION]->(location:Location)
        OPTIONAL MATCH (artifact)-[:MENTIONS_LOCATION]->(artifact_location:Location)
        WITH story,
             story.embedding AS embedding,
             collect(DISTINCT artifact) AS artifacts,
             collect(DISTINCT claim) AS claims,
             collect(DISTINCT person) AS people,
             collect(DISTINCT location) + collect(DISTINCT artifact_location) AS all_locations,
             max(artifact.created_at) AS last_artifact_date
        WITH story, embedding, artifacts, claims, people, all_locations, last_artifact_date,
             size(artifacts) AS artifact_count,
             size(claims) AS claim_count,
             size(people) AS people_count,
             head([a IN artifacts WHERE a.thumbnail_url IS NOT NULL AND a.thumbnail_url <> '' | a.thumbnail_url]) AS cover_thumbnail
        WHERE artifact_count > 0
        WITH story, embedding, artifact_count, claim_count, people_count, all_locations, cover_thumbnail,
             coalesce(last_artifact_date, story.updated_at, story.created_at) AS last_activity
        RETURN story.id AS id,
               story.topic AS title,
               story.gist AS description,
               artifact_count,
               claim_count,
               people_count,
               [loc IN all_locations WHERE loc.name IS NOT NULL | loc.name] AS locations,
               story.confidence AS confidence,
               story.entropy AS entropy,
               story.created_at AS created_at,
               story.updated_at AS updated_at,
               cover_thumbnail AS cover_image,
               last_activity,
               embedding
        ORDER BY last_activity DESC
        LIMIT $limit
        """

        matches: List[Dict] = []
        with self.driver.session(database=self.database) as session:
            result = session.run(cypher, limit=limit)
            for record in result:
                embedding = record.get('embedding')
                if not embedding:
                    continue
                similarity = self._cosine_similarity(query_embedding, embedding)
                if similarity <= 0:
                    continue
                summary = self._record_to_summary(record)
                summary['similarity'] = similarity
                summary['matched_query'] = query_text
                matches.append(summary)
        return matches

    def _record_to_summary(self, record) -> Dict:
        created_at = self._format_datetime(record.get('created_at'))
        updated_at = self._format_datetime(record.get('updated_at'))
        last_activity = self._format_datetime(record.get('last_activity'))

        summary = {
            'id': record.get('id'),
            'title': record.get('title') or 'Untitled Story',
            'description': record.get('description') or '',
            'content': record.get('content') or '',
            'coherence_score': record.get('coherence_score'),
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
        }
        summary['health_indicator'] = self._infer_health_indicator(summary)
        return summary

    # ------------------------------------------------------------------
    # Utility methods
    # ------------------------------------------------------------------
    def _generate_embedding(self, text: str) -> List[float]:
        if not self.openai_client:
            return []
        try:
            response = self.openai_client.embeddings.create(
                input=text,
                model=self.embedding_model
            )
            embedding = response.data[0].embedding
            return embedding
        except Exception as exc:
            print(f"⚠️  Failed to generate embedding for story search: {exc}")
            return []

    def _cosine_similarity(self, vector_a: List[float], vector_b: List[float]) -> float:
        try:
            a = np.array(vector_a)
            b = np.array(vector_b)
            if a.size == 0 or b.size == 0:
                return 0.0
            denom = np.linalg.norm(a) * np.linalg.norm(b)
            if denom == 0:
                return 0.0
            similarity = float(np.dot(a, b) / denom)
            return similarity
        except Exception as exc:
            print(f"⚠️  Cosine similarity failed: {exc}")
            return 0.0

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

    def _infer_health_indicator(self, summary: Dict) -> str:
        category = summary.get('category')
        entropy = summary.get('entropy') or 0
        artifact_count = summary.get('artifact_count') or 0
        last_updated = summary.get('last_updated_human') or ''
        if category == 'local':
            return 'healthy'
        if entropy > 0.75:
            return 'growing'
        if artifact_count == 0:
            return 'archived'
        if isinstance(last_updated, str) and ('w' in last_updated or 'd' in last_updated and last_updated.startswith('7')):
            return 'stale'
        return 'healthy'

    def _format_time_ago(self, timestamp) -> str:
        if not timestamp:
            return 'unknown'
        from datetime import datetime, timezone
        try:
            if isinstance(timestamp, str):
                dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            elif hasattr(timestamp, 'to_native'):
                dt = timestamp.to_native()
            else:
                dt = timestamp
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            now = datetime.now(timezone.utc)
            diff = now - dt
            seconds = int(diff.total_seconds())
            if seconds < 60:
                return 'just now'
            if seconds < 3600:
                minutes = seconds // 60
                return f'{minutes}m ago'
            if seconds < 86400:
                hours = seconds // 3600
                return f'{hours}h ago'
            if seconds < 604800:
                days = seconds // 86400
                return f'{days}d ago'
            weeks = seconds // 604800
            return f'{weeks}w ago'
        except Exception as exc:
            print(f"Error formatting timestamp: {exc}")
            return 'unknown'

    def get_story_by_id(self, story_id: str) -> Optional[Dict]:
        """Get a single story by ID with all metadata."""
        if not self.connected:
            self._connect()
        if not self.connected:
            return None

        cypher = """
        MATCH (story:Story {id: $story_id})
        // Match all artifact types (Page, File, Image, Video)
        OPTIONAL MATCH (story)-[:HAS_ARTIFACT]->(artifact)
        WHERE artifact:Page OR artifact:Artifact
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
        RETURN story.id as id,
               coalesce(story.title, story.topic) as title,
               story.gist as description,
               story.content as content,
               story.coherence_score as coherence_score,
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
        """

        with self.driver.session(database=self.database) as session:
            result = session.run(cypher, story_id=story_id)
            record = result.single()
            if not record:
                return None
            return self._record_to_summary(record)

    def get_story_graph(self, story_id: str) -> Optional[Dict]:
        """Get the graph structure for a story showing story -> claims -> artifacts."""
        if not self.connected:
            self._connect()
        if not self.connected:
            return None

        # Split query to avoid nested aggregation
        cypher = """
        MATCH (story:Story {id: $story_id})
        OPTIONAL MATCH (story)-[:HAS_CLAIM]->(claim:Claim)
        OPTIONAL MATCH (story)-[:HAS_ARTIFACT]->(artifact:Artifact)
        RETURN story,
               collect(DISTINCT claim) as claims,
               collect(DISTINCT artifact) as artifacts
        """

        with self.driver.session(database=self.database) as session:
            result = session.run(cypher, story_id=story_id)
            record = result.single()

            if not record:
                return None

            story_node = record.get('story')
            claims = record.get('claims', [])
            artifacts = record.get('artifacts', [])

            nodes = []
            edges = []

            # Add story node
            if story_node:
                story_id_val = story_node.get('id')
                nodes.append({
                    'id': story_id_val,
                    'type': 'story',
                    'label': story_node.get('topic', 'Untitled Story'),
                    'description': story_node.get('gist', '')
                })

                # Add claim nodes
                for claim in claims:
                    if claim:
                        claim_id = claim.get('id') or str(claim.id) if hasattr(claim, 'id') else None
                        if not claim_id:
                            continue

                        nodes.append({
                            'id': claim_id,
                            'type': 'claim',
                            'label': (claim.get('statement', 'Claim') or 'Claim')[:50],
                            'description': claim.get('statement', ''),
                            'metadata': {
                                'confidence': claim.get('confidence'),
                                'status': claim.get('status')
                            }
                        })

                        edges.append({
                            'source': story_id_val,
                            'target': claim_id,
                            'type': 'HAS_CLAIM',
                            'label': 'has claim'
                        })

                # Add artifact nodes
                for artifact in artifacts:
                    if artifact:
                        artifact_id = artifact.get('id') or str(artifact.id) if hasattr(artifact, 'id') else None
                        if not artifact_id:
                            continue

                        nodes.append({
                            'id': artifact_id,
                            'type': 'artifact',
                            'label': (artifact.get('title', 'Artifact') or 'Artifact')[:40],
                            'description': artifact.get('description', ''),
                            'metadata': {
                                'url': artifact.get('url'),
                                'domain': artifact.get('domain')
                            }
                        })

                        edges.append({
                            'source': story_id_val,
                            'target': artifact_id,
                            'type': 'HAS_ARTIFACT',
                            'label': 'has artifact'
                        })

            return {
                'story_id': story_id,
                'story_title': story_node.get('topic', 'Untitled Story') if story_node else 'Unknown',
                'nodes': nodes,
                'edges': edges
            }


# Singleton instance
neo4j_client = Neo4jClient()
