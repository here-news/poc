"""
Story detail API router
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.neo4j_client import neo4j_client
from app.services.tcf_feed_service import TCFFeedService
from typing import Optional

router = APIRouter(prefix="/api/stories", tags=["stories"])


class StorySearchRequest(BaseModel):
    """Search request body"""
    query: str
    limit: Optional[int] = 5


@router.post("/search")
async def search_stories(request: StorySearchRequest):
    """
    Search stories by query string

    Uses hybrid search:
    - Substring matching on titles, descriptions, artifacts
    - Semantic similarity via OpenAI embeddings (if available)

    Returns top matches ranked by relevance
    """
    try:
        matches = neo4j_client.search_story_summaries(
            query=request.query,
            limit=request.limit
        )

        return {
            "status": "success",
            "matches": matches,
            "total": len(matches)
        }

    except Exception as e:
        print(f"Error searching stories: {e}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@router.get("/{story_id}")
async def get_story(story_id: str):
    """
    Get story details with full content, entities, and metadata

    Returns:
    - Story content with citations
    - Entity lists (people, orgs, locations)
    - Related stories
    - Coherence breakdown
    - Claim count
    """
    try:
        # Get story from Neo4j
        with neo4j_client.driver.session(database=neo4j_client.database) as session:
            # Get story basic info
            result = session.run('''
                MATCH (s:Story {id: $story_id})
                OPTIONAL MATCH (s)-[:HAS_CLAIM]->(c:Claim)
                OPTIONAL MATCH (s)<-[:PART_OF]-(page:Page)
                WITH s,
                     collect(DISTINCT c) as claims,
                     collect(DISTINCT page) as pages
                RETURN s.id as id,
                       coalesce(s.title, s.topic) as title,
                       s.gist as description,
                       s.content as content,
                       s.created_at as created_at,
                       s.health_indicator as health_indicator,
                       s.cover_image as cover_image,
                       claims,
                       pages
            ''', story_id=story_id)

            record = result.single()

            if not record:
                raise HTTPException(status_code=404, detail="Story not found")

            # Get entities using storychat pattern
            entity_result = session.run('''
                MATCH (story:Story {id: $story_id})
                OPTIONAL MATCH (story)-[:MENTIONS]->(person:Person)
                OPTIONAL MATCH (story)-[:MENTIONS_ORG]->(org:Organization)
                OPTIONAL MATCH (story)-[:MENTIONS_LOCATION]->(location:Location)
                WITH collect(DISTINCT person) as people,
                     collect(DISTINCT org) as orgs,
                     collect(DISTINCT location) as locations
                WITH people + orgs + locations as all_entities
                UNWIND all_entities as entity
                WITH entity
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
            ''', story_id=story_id)

            # Parse entities
            people = []
            orgs = []
            locations = []

            for ent_record in entity_result:
                entity_type = ent_record.get("entity_type", "").lower()
                entity_obj = {
                    'id': ent_record.get("canonical_id"),
                    'canonical_id': ent_record.get("canonical_id"),
                    'name': ent_record.get("name"),
                    'canonical_name': ent_record.get("name"),
                    'wikidata_qid': ent_record.get("qid"),
                    'wikidata_thumbnail': ent_record.get("wikidata_thumbnail"),
                    'description': ent_record.get("description"),
                    'confidence': ent_record.get("confidence")
                }

                if entity_type == 'person':
                    people.append(entity_obj)
                elif entity_type == 'organization':
                    orgs.append(entity_obj)
                elif entity_type == 'location':
                    locations.append(entity_obj)

            # Parse claims
            claim_list = []
            for claim in record['claims']:
                claim_data = dict(claim)
                claim_list.append({
                    'id': claim_data.get('id'),
                    'text': claim_data.get('text', claim_data.get('statement')),
                    'confidence': claim_data.get('confidence'),
                })

            # Parse pages (artifacts/sources)
            artifacts = []
            for page in record['pages']:
                page_data = dict(page)
                artifacts.append({
                    'url': page_data.get('url'),
                    'title': page_data.get('title'),
                    'domain': page_data.get('domain'),
                    'published_at': page_data.get('pub_time', page_data.get('published_at')),
                })

            # Get TCF score for this story
            tcf_service = TCFFeedService()
            from datetime import datetime
            created_at = None
            if record['created_at']:
                try:
                    created_at = datetime.fromisoformat(record['created_at'].replace('Z', '+00:00'))
                except:
                    pass

            tcf_data = tcf_service.calculate_tcf_score(
                story_id,
                created_at=created_at,
                funding=0.0
            )

            # Get related stories using RELATED_TO relationship (like storychat)
            related_result = session.run('''
                MATCH (s:Story {id: $story_id})
                OPTIONAL MATCH (s)-[rel:RELATED_TO]->(related:Story)
                WHERE related IS NOT NULL
                RETURN related.id as id,
                       coalesce(related.title, related.topic) as title,
                       coalesce(rel.score_event, 0.5) as match_score
                LIMIT 5
            ''', story_id=story_id)

            related_stories = []
            for rel in related_result:
                if rel['id']:
                    related_stories.append({
                        'id': rel['id'],
                        'title': rel['title'],
                        'match_score': rel['match_score']
                    })

            return {
                "status": "success",
                "story": {
                    "id": record['id'],
                    "title": record['title'],
                    "description": record['description'],
                    "content": record['content'],
                    "created_at": record['created_at'],
                    "health_indicator": record['health_indicator'],
                    "cover_image": record['cover_image'],
                    "claim_count": len(claim_list),
                    "artifact_count": len(artifacts),
                    **tcf_data,
                    "entities": {
                        "people": people,
                        "organizations": orgs,
                        "locations": locations
                    },
                    "claims": claim_list,
                    "artifacts": artifacts,
                    "related_stories": related_stories
                }
            }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching story: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch story: {str(e)}")


@router.get("/{story_id}/entities")
async def get_story_entities(story_id: str):
    """Get all entities mentioned in a story with their connections"""
    try:
        with neo4j_client.driver.session(database=neo4j_client.database) as session:
            result = session.run('''
                MATCH (s:Story {id: $story_id})-[:MENTIONS_ENTITY]->(e)
                OPTIONAL MATCH (e)<-[:MENTIONS_ENTITY]-(other:Story)
                WHERE other.id <> $story_id
                WITH e, count(DISTINCT other) as story_count
                RETURN e.id as id,
                       e.name as name,
                       e.type as type,
                       story_count as connections
                ORDER BY connections DESC
            ''', story_id=story_id)

            entities = []
            for record in result:
                entities.append({
                    'id': record['id'],
                    'name': record['name'],
                    'type': record['type'],
                    'connections': record['connections']
                })

            return {
                "status": "success",
                "entities": entities
            }

    except Exception as e:
        print(f"Error fetching entities: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch entities: {str(e)}")


@router.get("/entity/{entity_id}")
async def get_entity_metadata(entity_id: str):
    """
    Get entity metadata including Wikidata info

    Returns:
    - Entity name, type, canonical_id
    - Wikidata QID, thumbnail, description
    - Story count and connections
    """
    try:
        with neo4j_client.driver.session(database=neo4j_client.database) as session:
            result = session.run('''
                MATCH (e) WHERE e.id = $entity_id OR e.canonical_id = $entity_id
                OPTIONAL MATCH (e)<-[:MENTIONS_ENTITY]-(s:Story)
                WITH e, count(DISTINCT s) as story_count
                RETURN e.id as id,
                       e.canonical_id as canonical_id,
                       e.name as name,
                       e.canonical_name as canonical_name,
                       e.type as entity_type,
                       e.wikidata_qid as wikidata_qid,
                       e.wikidata_thumbnail as wikidata_thumbnail,
                       e.wikidata_description as wikidata_description,
                       e.description as description,
                       e.confidence as confidence,
                       story_count
            ''', entity_id=entity_id)

            record = result.single()

            if not record:
                raise HTTPException(status_code=404, detail="Entity not found")

            return {
                "status": "success",
                "entity": {
                    "id": record['id'] or record['canonical_id'],
                    "canonical_id": record['canonical_id'],
                    "name": record['canonical_name'] or record['name'],
                    "entity_type": record['entity_type'],
                    "wikidata_qid": record['wikidata_qid'],
                    "wikidata_thumbnail": record['wikidata_thumbnail'],
                    "wikidata_description": record['wikidata_description'],
                    "description": record['description'] or record['wikidata_description'],
                    "confidence": record['confidence'],
                    "story_count": record['story_count']
                }
            }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching entity metadata: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch entity metadata: {str(e)}")
