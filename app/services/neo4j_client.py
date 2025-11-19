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
        """Get recent stories with entity data including images."""
        if not self.connected:
            self._connect()
        if not self.connected:
            return []

        cypher = """
        MATCH (story:Story)
        OPTIONAL MATCH (story)-[:MENTIONS_ENTITY]->(entity:Person)
        OPTIONAL MATCH (story)-[:HAS_ARTIFACT]->(artifact)
        OPTIONAL MATCH (artifact)-[:HAS_CLAIM]->(claim:Claim)
        WITH story,
             [p IN collect(DISTINCT entity) WHERE p IS NOT NULL | {
                 id: p.id,
                 name: p.name,
                 image: coalesce(p.image, p.wikidata_image, '')
             }] as people,
             count(DISTINCT artifact) as artifact_count,
             count(DISTINCT claim) as claim_count,
             head([a IN collect(DISTINCT artifact) WHERE a.thumbnail_url IS NOT NULL AND a.thumbnail_url <> '' | a.thumbnail_url]) as cover_image
        RETURN story.id as id,
               coalesce(story.title, story.topic) as title,
               story.gist as description,
               story.created_at as created_at,
               story.last_updated as last_updated,
               story.health_indicator as health_indicator,
               story.coherence_score as coherence_score,
               claim_count,
               people,
               coalesce(cover_image, '') as cover_image
        ORDER BY coalesce(story.last_updated, story.created_at) DESC
        LIMIT $limit
        """

        with self.driver.session(database=self.database) as session:
            result = session.run(cypher, limit=limit)
            stories = []
            for record in result:
                # Filter out people with no name, keep even if no image (will show initials)
                people = [p for p in record['people'] if p['name']]
                # Limit to top 3 people for display
                people = people[:3]

                stories.append({
                    'id': record['id'],
                    'title': record['title'],
                    'description': record['description'],
                    'created_at': self._format_datetime(record['created_at']),
                    'last_updated': self._format_datetime(record['last_updated']),
                    'health_indicator': record['health_indicator'],
                    'coherence_score': record.get('coherence_score'),
                    'claim_count': record['claim_count'],
                    'people': people,
                    'cover_image': record.get('cover_image', '')
                })
            return stories

    def get_story_summaries(
        self,
        limit: int = 20,
        offset: int = 0,
        min_coherence: float = 0.0,
        max_coherence: float = 1.0
    ) -> List[Dict]:
        """Fetch enriched story summaries suitable for homepage and chat.

        Args:
            limit: Number of stories to return
            offset: Number of stories to skip
            min_coherence: Minimum coherence score (0-1)
            max_coherence: Maximum coherence score (0-1)
        """
        if not self.connected:
            self._connect()
        if not self.connected:
            return []

        cypher = """
        MATCH (story:Story)
        WHERE coalesce(story.coherence_score, 0) >= $min_coherence
          AND coalesce(story.coherence_score, 0) <= $max_coherence
        // Match all artifact types (Page, File, Image, Video) using base Artifact label
        // For now only Page exists, but this is future-proof
        OPTIONAL MATCH (story)-[:HAS_ARTIFACT]->(artifact)
        WHERE artifact:Page OR artifact:Artifact
        // Claims are connected to Pages, not Stories directly
        OPTIONAL MATCH (artifact)-[:HAS_CLAIM]->(claim:Claim)
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
        SKIP $offset
        LIMIT $limit
        """

        with self.driver.session(database=self.database) as session:
            result = session.run(
                cypher,
                limit=limit,
                offset=offset,
                min_coherence=min_coherence,
                max_coherence=max_coherence
            )
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
        // Claims are connected to Pages, not Stories directly
        OPTIONAL MATCH (artifact)-[:HAS_CLAIM]->(claim:Claim)
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
        WHERE (story.topic IS NOT NULL AND toLower(story.topic) CONTAINS q)
           OR (story.gist IS NOT NULL AND toLower(story.gist) CONTAINS q)
           OR any(a IN artifacts WHERE (a.title IS NOT NULL AND toLower(a.title) CONTAINS q)
                                   OR (a.description IS NOT NULL AND toLower(a.description) CONTAINS q))
           OR any(loc IN all_locations WHERE loc.name IS NOT NULL AND toLower(loc.name) CONTAINS q)
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
        // Claims are connected to Pages, not Stories directly
        OPTIONAL MATCH (artifact)-[:HAS_CLAIM]->(claim:Claim)
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

        content = record.get('content')
        print(f"📄 Story {record.get('id')}: content={'YES' if content else 'NO'} ({len(content) if content else 0} chars)")

        summary = {
            'id': record.get('id'),
            'title': record.get('title') or 'Untitled Story',
            'description': record.get('description') or '',
            'content': content or '',
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
        """Get a single story by ID with all metadata, artifacts, and relationships."""
        if not self.connected:
            self._connect()
        if not self.connected:
            return None

        cypher = """
        MATCH (story:Story {id: $story_id})
        // Match all artifact types (Page, File, Image, Video)
        OPTIONAL MATCH (story)-[:HAS_ARTIFACT]->(artifact)
        WHERE artifact:Page OR artifact:Artifact
        // Get domain from artifact property (migrated from MediaSource)
        // Organization relationship provides rich entity data for publisher
        OPTIONAL MATCH (artifact)-[:PUBLISHED_BY]->(publisher:Organization)
        // Claims are connected to Pages, not Stories directly
        OPTIONAL MATCH (artifact)-[:HAS_CLAIM]->(claim:Claim)
        OPTIONAL MATCH (story)-[r_person:MENTIONS]->(person:Person)
        OPTIONAL MATCH (story)-[r_org:MENTIONS_ORG]->(org:Organization)
        OPTIONAL MATCH (story)-[r_location:MENTIONS_LOCATION]->(location:Location)
        OPTIONAL MATCH (artifact)-[:MENTIONS_LOCATION]->(artifact_location:Location)
        OPTIONAL MATCH (story)-[rel:RELATED_TO]->(related_story:Story)
        WITH story,
             count(DISTINCT artifact) as artifact_count,
             count(DISTINCT claim) as claim_count,
             count(DISTINCT person) as people_count,
             count(DISTINCT org) as org_count,
             count(DISTINCT location) + count(DISTINCT artifact_location) as location_count,
             collect(DISTINCT location) + collect(DISTINCT artifact_location) as all_locations,
             collect(DISTINCT {
                id: artifact.id,
                url: artifact.url,
                title: artifact.title,
                domain: artifact.domain,
                site: artifact.site,
                gist: artifact.gist,
                thumbnail_url: artifact.thumbnail_url,
                created_at: artifact.created_at,
                pub_date: artifact.pub_date,
                pub_time: artifact.pub_time,
                published_at: artifact.published_at,
                publication_date: artifact.publication_date,
                publish_date: artifact.publish_date
             }) as artifacts,
             collect(DISTINCT {
                id: related_story.id,
                title: coalesce(related_story.title, related_story.topic),
                match_score: rel.score_event,
                relationship_type: rel.reason
             }) as related_stories,
             collect(DISTINCT {entity: person, importance: coalesce(r_person.importance, 0.5)}) as people_with_importance,
             collect(DISTINCT {entity: org, importance: coalesce(r_org.importance, 0.5)}) as orgs_with_importance,
             collect(DISTINCT {entity: location, importance: coalesce(r_location.importance, 0.5)}) as locations_with_importance,
             collect(DISTINCT artifact_location) as artifact_locations,
             head([a IN collect(DISTINCT artifact) WHERE a.thumbnail_url IS NOT NULL AND a.thumbnail_url <> '' | a.thumbnail_url]) as cover_thumbnail,
             max(artifact.created_at) as last_artifact_date
        RETURN story.id as id,
               coalesce(story.title, story.topic) as title,
               story.gist as description,
               story.content as content,
               story.coherence_score as coherence_score,
               story.citations as citations,
               artifact_count,
               claim_count,
               people_count,
               org_count,
               location_count,
               [loc in all_locations WHERE loc.name IS NOT NULL | loc.name] as locations,
               [a in artifacts WHERE a.url IS NOT NULL] as artifacts,
               [r in related_stories WHERE r.id IS NOT NULL] as related_stories,
               [p in people_with_importance WHERE p.entity.canonical_id IS NOT NULL | {id: p.entity.canonical_id, name: p.entity.canonical_name, thumbnail: p.entity.wikidata_thumbnail, importance: p.importance}] as people_entities,
               [o in orgs_with_importance WHERE o.entity.canonical_id IS NOT NULL | {id: o.entity.canonical_id, name: o.entity.canonical_name, thumbnail: o.entity.wikidata_thumbnail, domain: o.entity.domain, importance: o.importance}] as org_entities,
               [l in locations_with_importance WHERE l.entity.canonical_id IS NOT NULL | {id: l.entity.canonical_id, name: l.entity.canonical_name, thumbnail: l.entity.wikidata_thumbnail, importance: l.importance}] + [al in artifact_locations WHERE al.canonical_id IS NOT NULL | {id: al.canonical_id, name: al.canonical_name, thumbnail: al.wikidata_thumbnail, importance: 0.3}] as location_entities,
               story.confidence as confidence,
               story.entropy as entropy,
               story.created_at as created_at,
               story.last_updated as updated_at,
               coalesce(cover_thumbnail, '') as cover_image,
               coalesce(story.last_updated, last_artifact_date, story.created_at) as last_activity
        """

        with self.driver.session(database=self.database) as session:
            result = session.run(cypher, story_id=story_id)
            record = result.single()
            if not record:
                return None

            # Convert to dict and add entity structure
            story_dict = self._record_to_summary(record)

            # Serialize datetime fields in artifacts
            artifacts = record.get('artifacts', [])
            serialized_artifacts = []
            for artifact in artifacts:
                if artifact:
                    serialized_artifact = dict(artifact)
                    if 'created_at' in serialized_artifact:
                        serialized_artifact['created_at'] = self._format_datetime(serialized_artifact['created_at'])
                    serialized_artifacts.append(serialized_artifact)
            story_dict['artifacts'] = serialized_artifacts

            story_dict['related_stories'] = record.get('related_stories', [])
            story_dict['org_count'] = record.get('org_count', 0)
            story_dict['location_count'] = record.get('location_count', 0)

            people_entities = record.get('people_entities', [])
            org_entities = record.get('org_entities', [])
            location_entities = record.get('location_entities', [])

            print(f"📊 Story {story_id}: people={len(people_entities)}, orgs={len(org_entities)}, locations={len(location_entities)}")

            story_dict['entities'] = {
                'people': people_entities,
                'organizations': org_entities,
                'locations': location_entities
            }

            # Also add flat entity lists for API response
            story_dict['people_entities'] = people_entities
            story_dict['org_entities'] = org_entities
            story_dict['location_entities'] = location_entities

            return story_dict

    def get_builder_stories(self) -> List[Dict]:
        """Get list of all stories for builder interface."""
        if not self.connected:
            self._connect()
        if not self.connected:
            return []

        cypher = """
        MATCH (s:Story)
        OPTIONAL MATCH (s)-[:HAS_ARTIFACT]->(p:Page)
        OPTIONAL MATCH (p)-[:HAS_CLAIM]->(c:Claim)
        WITH s,
             count(DISTINCT p) as pageCount,
             count(DISTINCT c) as claimCount,
             coalesce(s.last_updated, s.created_at) as last_activity
        RETURN s.id as id,
               coalesce(s.title, s.topic) as topic,
               s.gist as gist,
               s.coherence_score as coherence,
               s.status as status,
               pageCount,
               claimCount,
               s.created_at as createdAt,
               s.last_updated as updatedAt,
               last_activity
        ORDER BY last_activity DESC
        """

        with self.driver.session(database=self.database) as session:
            result = session.run(cypher)
            stories = []
            for record in result:
                story = dict(record)
                # Serialize datetime fields
                if 'createdAt' in story:
                    story['createdAt'] = self._format_datetime(story['createdAt'])
                if 'updatedAt' in story:
                    story['updatedAt'] = self._format_datetime(story['updatedAt'])
                if 'last_activity' in story:
                    story['last_activity'] = self._format_datetime(story['last_activity'])
                stories.append(story)
            return stories

    def get_builder_story(self, story_id: str) -> Optional[Dict]:
        """Get story with claims, sources, and entities for builder interface."""
        if not self.connected:
            self._connect()
        if not self.connected:
            return None

        cypher = """
        MATCH (s:Story {id: $story_id})

        // Get all pages (artifacts) for this story
        OPTIONAL MATCH (s)-[:HAS_ARTIFACT]->(p:Page)

        // Get all claims from those pages
        OPTIONAL MATCH (p)-[:HAS_CLAIM]->(c:Claim)

        WITH s,
             collect(DISTINCT c {
                id: c.claim_id,
                .text,
                .modality,
                .confidence,
                .event_time,
                .created_at,
                source: p {
                    .url,
                    .title,
                    .site,
                    domain: p.domain,
                    published_at: coalesce(p.published_at, p.pub_time, p.publication_date, p.publish_date, p.pub_date),
                    image_url: coalesce(p.thumbnail_url, p.image_url),
                    author: coalesce(p.byline, p.author),
                    .description,
                    .gist
                }
             }) as claims,
             collect(DISTINCT p {
                .url,
                .title,
                .domain,
                .site,
                published_at: coalesce(p.published_at, p.pub_time, p.publication_date, p.publish_date, p.pub_date),
                image_url: coalesce(p.thumbnail_url, p.image_url),
                author: coalesce(p.byline, p.author),
                .description,
                .gist
             }) as sources,
             collect(DISTINCT p) as pages_list,
             collect(DISTINCT c) as claims_list

        // Get claim entities (handle empty claims gracefully)
        WITH s, claims, sources, pages_list,
             CASE WHEN size(claims_list) > 0 THEN claims_list ELSE [null] END as claims_to_process
        UNWIND claims_to_process as claim
        OPTIONAL MATCH (claim)-[r]->(e)
        WHERE claim IS NOT NULL
          AND type(r) IN ['MENTIONS_PERSON', 'MENTIONS_ORG', 'MENTIONS_LOCATION', 'MENTIONS_ENTITY']
          AND (e:Person OR e:Organization OR e:Location OR e:MediaSource)

        WITH s, claims, sources, pages_list,
             [x IN collect(DISTINCT {
                 claim_id: claim.claim_id,
                 canonical_id: e.canonical_id,
                 canonical_name: e.canonical_name,
                 wikidata_qid: e.wikidata_qid,
                 wikidata_thumbnail: e.wikidata_thumbnail,
                 role: e.role,
                 type: labels(e)[0]
             }) WHERE x.canonical_id IS NOT NULL] as claim_entities

        // Get page entities (handle empty pages gracefully)
        WITH s, claims, sources, claim_entities,
             CASE WHEN size(pages_list) > 0 THEN pages_list ELSE [null] END as pages_to_process
        UNWIND pages_to_process as page
        OPTIONAL MATCH (page)-[r]->(e)
        WHERE page IS NOT NULL
          AND type(r) IN ['MENTIONS_PERSON', 'MENTIONS_ORG', 'MENTIONS_LOCATION', 'MENTIONS_ENTITY']
          AND (e:Person OR e:Organization OR e:Location OR e:MediaSource)

        RETURN s {
            .id,
            topic: coalesce(s.title, s.topic),
            .gist,
            .coherence_score,
            .created_at,
            updated_at: s.last_updated
        } as story,
        claims,
        sources,
        [x IN collect(DISTINCT {
            page_url: page.url,
            canonical_id: e.canonical_id,
            canonical_name: e.canonical_name,
            wikidata_qid: e.wikidata_qid,
            wikidata_thumbnail: e.wikidata_thumbnail,
            role: e.role,
            type: labels(e)[0]
        }) WHERE x.canonical_id IS NOT NULL] as page_entities,
        claim_entities
        """

        with self.driver.session(database=self.database) as session:
            result = session.run(cypher, story_id=story_id)
            record = result.single()
            if not record:
                return None

            story_data = dict(record['story'])
            claims = [dict(c) for c in record['claims'] if c['text']]  # Filter out empty claims
            sources = [dict(s) for s in record['sources']]
            claim_entities = [dict(e) for e in record['claim_entities'] if e.get('canonical_name')]
            page_entities = [dict(e) for e in record['page_entities'] if e.get('canonical_name')]

            # Serialize datetime fields
            if 'created_at' in story_data:
                story_data['created_at'] = self._format_datetime(story_data['created_at'])
            if 'updated_at' in story_data:
                story_data['updated_at'] = self._format_datetime(story_data['updated_at'])

            for claim in claims:
                if 'created_at' in claim:
                    claim['created_at'] = self._format_datetime(claim['created_at'])
                if 'event_time' in claim:
                    claim['event_time'] = self._format_datetime(claim['event_time'])
                if claim.get('source') and 'published_at' in claim['source']:
                    claim['source']['published_at'] = self._format_datetime(claim['source']['published_at'])

            for source in sources:
                if 'published_at' in source:
                    source['published_at'] = self._format_datetime(source['published_at'])

            # Group claims by modality for threads
            threads = {}
            for claim in claims:
                modality = claim.get('modality', 'unknown')
                if modality not in threads:
                    threads[modality] = []
                threads[modality].append(claim)

            return {
                'story': story_data,
                'claims': claims,
                'sources': sources,
                'claim_entities': claim_entities,
                'page_entities': page_entities,
                'threads': threads
            }

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

    def get_entity_by_name(self, canonical_name: str) -> Optional[Dict]:
        """
        Get entity by canonical name from Neo4j

        Args:
            canonical_name: Entity canonical name (e.g., "Sam Altman", "OpenAI")

        Returns:
            Entity dict with type, description, Wikidata QID, confidence, etc.
        """
        if not self.connected:
            self._connect()
        if not self.connected:
            return None

        cypher = """
        MATCH (e)
        WHERE (e:Person OR e:Organization OR e:Location)
          AND e.canonical_name = $canonical_name
        RETURN labels(e)[0] as entity_type,
               e.canonical_id as canonical_id,
               e.canonical_name as canonical_name,
               e.wikidata_qid as wikidata_qid,
               e.wikidata_thumbnail as wikidata_thumbnail,
               e.description as description,
               e.confidence as confidence,
               e.mentions as mentions,
               e.role as role,
               e.domain as domain
        LIMIT 1
        """

        with self.driver.session(database=self.database) as session:
            result = session.run(cypher, canonical_name=canonical_name)
            record = result.single()

            if not record:
                return None

            # Build context object from role and domain
            context = {}
            if record.get('role'):
                context['role'] = record.get('role')
            if record.get('domain'):
                context['domain'] = record.get('domain')

            return {
                'entity_type': record.get('entity_type'),
                'canonical_id': record.get('canonical_id'),
                'canonical_name': record.get('canonical_name'),
                'wikidata_qid': record.get('wikidata_qid'),
                'wikidata_thumbnail': record.get('wikidata_thumbnail'),
                'description': record.get('description'),
                'confidence': record.get('confidence'),
                'mentions': record.get('mentions', []),
                'context': context if context else None
            }

    def get_entity_by_domain(self, domain: str) -> Optional[Dict]:
        """
        Get organization entity by domain from Neo4j

        Args:
            domain: Organization domain (e.g., "apnews.com", "reuters.com")

        Returns:
            Entity dict with type, description, Wikidata QID, confidence, etc.
        """
        if not self.connected:
            self._connect()
        if not self.connected:
            return None

        cypher = """
        MATCH (e:Organization)
        WHERE e.domain = $domain
        RETURN labels(e)[0] as entity_type,
               e.canonical_id as canonical_id,
               e.canonical_name as canonical_name,
               e.wikidata_qid as wikidata_qid,
               e.wikidata_thumbnail as wikidata_thumbnail,
               e.description as description,
               e.confidence as confidence,
               e.mentions as mentions,
               e.role as role,
               e.domain as domain
        LIMIT 1
        """

        with self.driver.session(database=self.database) as session:
            result = session.run(cypher, domain=domain)
            record = result.single()

            if not record:
                return None

            # Build context object from role and domain
            context = {}
            if record.get('role'):
                context['role'] = record.get('role')
            if record.get('domain'):
                context['domain'] = record.get('domain')

            return {
                'entity_type': record.get('entity_type'),
                'id': record.get('canonical_id'),
                'canonical_id': record.get('canonical_id'),
                'canonical_name': record.get('canonical_name'),
                'wikidata_qid': record.get('wikidata_qid'),
                'wikidata_thumbnail': record.get('wikidata_thumbnail'),
                'description': record.get('description'),
                'confidence': record.get('confidence'),
                'mentions': record.get('mentions', []),
                'context': context if context else None
            }

    def get_entity_by_id(self, canonical_id: str) -> Optional[Dict]:
        """
        Get entity by canonical_id from Neo4j

        Args:
            canonical_id: Entity canonical_id (e.g., "person_a1b2c3", "org_x4y5z6")

        Returns:
            Entity dict with type, description, Wikidata QID, confidence, mentions, etc.
        """
        if not self.connected:
            self._connect()
        if not self.connected:
            return None

        cypher = """
        MATCH (e {canonical_id: $canonical_id})
        WHERE (e:Person OR e:Organization OR e:Location)
        RETURN labels(e)[0] as entity_type,
               e.canonical_id as canonical_id,
               e.canonical_name as canonical_name,
               e.wikidata_qid as wikidata_qid,
               e.wikidata_thumbnail as wikidata_thumbnail,
               e.wikidata_description as wikidata_description,
               e.description as description,
               e.confidence as confidence,
               e.mentions as mentions,
               e.role as role,
               e.domain as domain
        LIMIT 1
        """

        with self.driver.session(database=self.database) as session:
            result = session.run(cypher, canonical_id=canonical_id)
            record = result.single()

            if not record:
                return None

            # Build context object from role and domain
            context = {}
            if record.get('role'):
                context['role'] = record.get('role')
            if record.get('domain'):
                context['domain'] = record.get('domain')

            return {
                'entity_type': record.get('entity_type'),
                'canonical_id': record.get('canonical_id'),
                'canonical_name': record.get('canonical_name'),
                'wikidata_qid': record.get('wikidata_qid'),
                'wikidata_thumbnail': record.get('wikidata_thumbnail'),
                'wikidata_description': record.get('wikidata_description'),
                'description': record.get('description') or record.get('wikidata_description'),
                'confidence': record.get('confidence'),
                'mentions': record.get('mentions', []),
                'context': context if context else None
            }

    def get_entity_stories(self, canonical_id: str) -> List[Dict]:
        """
        Get stories that mention a specific entity

        Args:
            canonical_id: Entity canonical_id

        Returns:
            List of story summaries that mention this entity
        """
        if not self.connected:
            self._connect()
        if not self.connected:
            return []

        cypher = """
        MATCH (e {canonical_id: $canonical_id})
        WHERE (e:Person OR e:Organization OR e:Location)
        WITH e
        // Support both direct Story→Entity (from synthesis) and Story→Page→Entity (primary)
        MATCH (story:Story)
        WHERE (story)-[:MENTIONS_ENTITY]->(e)
           OR (story)-[:HAS_ARTIFACT]->(:Page)-[:MENTIONS_ENTITY]->(e)
        OPTIONAL MATCH (story)-[:HAS_ARTIFACT]->(artifact)
        WHERE artifact:Page OR artifact:Artifact
        WITH DISTINCT story, count(DISTINCT artifact) as artifact_count
        RETURN story.id as id,
               coalesce(story.title, story.topic) as title,
               story.gist as description,
               story.content as content,
               story.created_at as created_at,
               story.last_updated as updated_at,
               artifact_count
        ORDER BY story.last_updated DESC
        LIMIT 50
        """

        with self.driver.session(database=self.database) as session:
            result = session.run(cypher, canonical_id=canonical_id)
            stories: List[Dict] = []
            for record in result:
                created_at = self._format_datetime(record.get('created_at'))
                stories.append({
                    'id': record.get('id'),
                    'title': record.get('title') or 'Untitled Story',
                    'description': record.get('description') or '',
                    'content': record.get('content') or '',
                    'artifact_count': record.get('artifact_count', 0),
                    'created_at': created_at
                })
            return stories


# Singleton instance
neo4j_client = Neo4jClient()
