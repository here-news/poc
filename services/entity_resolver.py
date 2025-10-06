"""
Entity Resolver - NER extraction, deduplication, and Wikidata linking

Pipeline:
1. NER extraction (spaCy/GLiNER) - language-specific models
2. Entity deduplication (fuzzy matching + coreference)
3. Wikidata linking (API + Redis cache)
4. Media source standardization

DEPRECATED: Entity resolution now runs inside the Cloud Run workers in
../here-extraction-service. This file remains for reference only.
"""

import os
import json
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from datetime import datetime
import httpx
from rapidfuzz import fuzz
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# Note: spaCy will be loaded on-demand to avoid startup overhead
SPACY_MODELS = {
    'en': 'en_core_web_sm',  # English
    'es': 'es_core_news_sm',  # Spanish (will upgrade to _lg if needed)
    'fr': 'fr_core_news_sm',  # French
    'de': 'de_core_news_sm',  # German
    'zh': 'zh_core_web_sm',   # Chinese
}

@dataclass
class ResolvedEntity:
    """Canonical entity with external references"""
    canonical_name: str
    canonical_id: str  # Deterministic ID for this entity
    entity_type: str   # PERSON, ORG, GPE, LOC, etc.
    mentions: List[str]  # All text variations found
    wikidata_qid: Optional[str] = None
    confidence: float = 0.0
    context: Dict[str, Any] = None  # Additional metadata

    def to_dict(self):
        return asdict(self)

@dataclass
class ResolvedEntities:
    """Complete entity resolution result"""
    persons: List[ResolvedEntity]
    organizations: List[ResolvedEntity]
    locations: List[ResolvedEntity]
    media_source: Optional[Dict[str, Any]] = None
    processing_time_ms: int = 0

    def to_dict(self):
        return {
            'persons': [e.to_dict() for e in self.persons],
            'organizations': [e.to_dict() for e in self.organizations],
            'locations': [e.to_dict() for e in self.locations],
            'media_source': self.media_source,
            'processing_time_ms': self.processing_time_ms
        }


class EntityResolver:
    """Universal entity resolver with NER, deduplication, and linking"""

    def __init__(self):
        self.spacy_models_cache = {}  # Lazy-load spaCy models
        self.wikidata_client = httpx.AsyncClient(timeout=10.0)
        # TODO: Add Redis cache for Wikidata lookups
        self.wikidata_cache = {}  # In-memory cache for now

        # OpenAI client for LLM-based NER
        api_key = os.getenv("OPENAI_API_KEY")
        if api_key:
            self.openai_client = OpenAI(api_key=api_key)
            self.use_llm_ner = True
            print("✅ LLM-based NER enabled (GPT-4o-mini)")
        else:
            self.openai_client = None
            self.use_llm_ner = False
            print("⚠️ No OpenAI API key, falling back to spaCy NER only")

    async def resolve_entities(
        self,
        content: str,
        language: str,
        metadata: Dict[str, Any]
    ) -> ResolvedEntities:
        """
        Full entity resolution pipeline

        Args:
            content: Cleaned article text
            language: ISO 639-1 code (e.g., 'en', 'es')
            metadata: Article metadata (for context)

        Returns:
            ResolvedEntities with canonical entities and Wikidata links
        """
        import time
        start_time = time.time()

        print(f"🔍 Starting entity resolution for {language} content ({len(content)} chars)")

        # Step 1: NER extraction (LLM first, spaCy fallback)
        if self.use_llm_ner:
            try:
                entities_raw = await self._extract_entities_llm(content, language)
                print(f"   Found {len(entities_raw)} raw entities (via LLM)")
            except Exception as e:
                print(f"   ⚠️ LLM NER failed: {e}, falling back to spaCy")
                entities_raw = self._extract_entities_ner(content, language)
                print(f"   Found {len(entities_raw)} raw entities (via spaCy fallback)")
        else:
            entities_raw = self._extract_entities_ner(content, language)
            print(f"   Found {len(entities_raw)} raw entities (via spaCy)")

        # Step 2: Deduplication and canonicalization
        entities_canonical = self._deduplicate_entities(entities_raw)
        print(f"   Deduplicated to {sum(len(v) for v in entities_canonical.values())} canonical entities")

        # Step 3: Wikidata linking (async)
        entities_linked = await self._link_wikidata(entities_canonical, language, content)
        print(f"   Linked {sum(1 for entities in entities_linked.values() for e in entities if e.wikidata_qid)} entities to Wikidata")

        # Step 4: Media source standardization
        media_source = self._resolve_media_source(metadata)

        processing_time = int((time.time() - start_time) * 1000)

        return ResolvedEntities(
            persons=entities_linked.get('PERSON', []),
            organizations=entities_linked.get('ORG', []),
            locations=entities_linked.get('GPE', []) + entities_linked.get('LOC', []),
            media_source=media_source,
            processing_time_ms=processing_time
        )

    async def _extract_entities_llm(self, content: str, language: str) -> List[Dict[str, Any]]:
        """
        Extract named entities using LLM (GPT-4o-mini)

        More accurate than spaCy, especially for:
        - Person names (with roles/context)
        - Organizations
        - Coreference resolution

        Returns list of entities with text, label, role/context
        """
        # Truncate content if too long (to save tokens)
        max_chars = 8000
        content_sample = content[:max_chars] if len(content) > max_chars else content

        prompt = f"""Extract all named entities from this article in {language}.

For each entity, provide:
1. Entity text (exact as it appears)
2. Entity type: PERSON, ORGANIZATION, LOCATION, or OTHER
3. Role/context (for persons: their title/position; for orgs: what they do)

Article:
{content_sample}

Return a JSON array with this structure:
[
  {{"text": "Gavin Newsom", "type": "PERSON", "role": "Governor of California"}},
  {{"text": "Donald Trump", "type": "PERSON", "role": "President"}},
  {{"text": "California", "type": "LOCATION", "role": "State"}},
  ...
]

Important:
- Only extract real entities (not punctuation, quotes, or generic terms)
- Include all persons mentioned (even if just by last name)
- Include all organizations and locations
- For persons, always include their role/title if mentioned
- Resolve coreferences (e.g., "Newsom" → "Gavin Newsom")
"""

        response = self.openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert named entity recognition system. Extract entities accurately and completely."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.1,
            response_format={"type": "json_object"}
        )

        result_text = response.choices[0].message.content
        result_json = json.loads(result_text)

        # Parse LLM response to our standard format
        entities = []

        # Handle different response formats
        entity_list = result_json.get('entities', result_json if isinstance(result_json, list) else [])

        for ent in entity_list:
            entity_type = ent.get('type', 'OTHER')

            # Map LLM types to spaCy-style labels
            type_mapping = {
                'PERSON': 'PERSON',
                'ORGANIZATION': 'ORG',
                'LOCATION': 'GPE',  # Geo-political entity
                'PLACE': 'LOC',
                'OTHER': 'MISC'
            }

            label = type_mapping.get(entity_type.upper(), 'MISC')

            entities.append({
                'text': ent.get('text', ''),
                'label': label,
                'start': 0,  # LLM doesn't provide positions
                'end': 0,
                'context': ent.get('role', '')  # Store role/context
            })

        return entities

    def _extract_entities_ner(self, content: str, language: str) -> List[Dict[str, Any]]:
        """
        Extract named entities using spaCy

        Returns list of raw entities with text, label, start, end
        """
        # Load spaCy model (lazy loading)
        nlp = self._load_spacy_model(language)

        if not nlp:
            print(f"⚠️  No spaCy model available for language: {language}")
            return []

        # Process text with spaCy
        doc = nlp(content[:100000])  # Limit to first 100k chars for performance

        # Extract entities
        entities = []
        for ent in doc.ents:
            # Filter entity types we care about
            if ent.label_ in ['PERSON', 'ORG', 'GPE', 'LOC', 'FAC', 'NORP']:
                entities.append({
                    'text': ent.text,
                    'label': ent.label_,
                    'start': ent.start_char,
                    'end': ent.end_char
                })

        return entities

    def _load_spacy_model(self, language: str):
        """Lazy-load spaCy model for given language"""
        if language in self.spacy_models_cache:
            return self.spacy_models_cache[language]

        model_name = SPACY_MODELS.get(language)
        if not model_name:
            print(f"⚠️  No spaCy model configured for language: {language}")
            return None

        try:
            import spacy
            nlp = spacy.load(model_name)
            self.spacy_models_cache[language] = nlp
            print(f"✅ Loaded spaCy model: {model_name}")
            return nlp
        except OSError:
            print(f"⚠️  spaCy model not installed: {model_name}")
            print(f"   Run: python -m spacy download {model_name}")
            return None
        except Exception as e:
            print(f"❌ Failed to load spaCy model: {e}")
            return None

    def _deduplicate_entities(self, entities_raw: List[Dict[str, Any]]) -> Dict[str, List[ResolvedEntity]]:
        """
        Deduplicate entities using fuzzy matching

        Groups similar mentions into canonical entities
        """
        # Group by entity type
        by_type = {}
        for ent in entities_raw:
            label = ent['label']
            if label not in by_type:
                by_type[label] = []
            by_type[label].append(ent)

        # Deduplicate within each type
        canonical_entities = {}

        for entity_type, entities in by_type.items():
            canonical = []
            used = set()

            for i, ent1 in enumerate(entities):
                if i in used:
                    continue

                # Find all similar mentions
                mentions = [ent1['text']]
                used.add(i)

                for j, ent2 in enumerate(entities):
                    if j <= i or j in used:
                        continue

                    # Fuzzy match (case-insensitive)
                    similarity = fuzz.ratio(ent1['text'].lower(), ent2['text'].lower())

                    # Threshold: 85% similarity
                    if similarity >= 85:
                        mentions.append(ent2['text'])
                        used.add(j)

                # Create canonical entity
                canonical_name = self._choose_canonical_name(mentions)
                canonical_id = self._generate_entity_id(canonical_name, entity_type)

                # Extract context/role from first entity (LLM provides this)
                context = {}
                if 'context' in ent1 and ent1['context']:
                    context = {'role': ent1['context']}

                canonical.append(ResolvedEntity(
                    canonical_name=canonical_name,
                    canonical_id=canonical_id,
                    entity_type=entity_type,
                    mentions=list(set(mentions)),  # Remove duplicates
                    confidence=1.0 if len(mentions) > 1 else 0.7,  # Higher confidence if multiple mentions
                    context=context
                ))

            canonical_entities[entity_type] = canonical

        return canonical_entities

    def _choose_canonical_name(self, mentions: List[str]) -> str:
        """
        Choose the best canonical name from mentions

        Prefer:
        1. Longest name (most complete)
        2. Most common capitalization
        """
        if not mentions:
            return ""

        # Sort by length (descending)
        sorted_mentions = sorted(mentions, key=len, reverse=True)
        return sorted_mentions[0]

    def _generate_entity_id(self, name: str, entity_type: str) -> str:
        """
        Generate deterministic canonical ID for entity

        Format: {type}_{hash}
        Example: person_a1b2c3d4
        """
        import hashlib

        # Normalize name for hashing
        normalized = name.lower().strip()

        # Hash
        hash_obj = hashlib.md5(f"{entity_type}:{normalized}".encode())
        hash_str = hash_obj.hexdigest()[:8]

        return f"{entity_type.lower()}_{hash_str}"

    async def _link_wikidata(
        self,
        entities: Dict[str, List[ResolvedEntity]],
        language: str,
        content: str
    ) -> Dict[str, List[ResolvedEntity]]:
        """
        Link entities to Wikidata QIDs

        Uses Wikidata API with caching
        """
        linked = {}

        for entity_type, entity_list in entities.items():
            linked_list = []

            for entity in entity_list:
                # Check cache first
                cache_key = f"{language}:{entity_type}:{entity.canonical_name}"

                if cache_key in self.wikidata_cache:
                    entity.wikidata_qid = self.wikidata_cache[cache_key]
                    linked_list.append(entity)
                    continue

                # Query Wikidata
                qid = await self._query_wikidata(
                    entity.canonical_name,
                    entity_type,
                    language
                )

                entity.wikidata_qid = qid
                self.wikidata_cache[cache_key] = qid
                linked_list.append(entity)

            linked[entity_type] = linked_list

        return linked

    async def _query_wikidata(
        self,
        name: str,
        entity_type: str,
        language: str
    ) -> Optional[str]:
        """
        Query Wikidata API for entity

        Returns QID (e.g., 'Q717') or None
        """
        try:
            # Wikidata entity search API
            url = "https://www.wikidata.org/w/api.php"
            params = {
                'action': 'wbsearchentities',
                'search': name,
                'language': language,
                'type': 'item',
                'limit': 3,
                'format': 'json'
            }

            response = await self.wikidata_client.get(url, params=params)
            data = response.json()

            if 'search' in data and len(data['search']) > 0:
                # Take first result (best match)
                # TODO: Add type filtering (P31 instance-of checks)
                qid = data['search'][0]['id']
                print(f"   🔗 Linked '{name}' → {qid}")
                return qid

            return None

        except Exception as e:
            print(f"⚠️  Wikidata lookup failed for '{name}': {e}")
            return None

    def _resolve_media_source(self, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """
        Standardize media source from metadata

        Uses og:site_name, article:publisher, domain
        """
        og_meta = metadata.get('og_metadata', {})
        article_meta = metadata.get('article_metadata', {})

        return {
            'canonical_name': og_meta.get('site_name', metadata.get('domain', '')),
            'domain': metadata.get('domain', ''),
            'facebook': article_meta.get('publisher', '') if article_meta.get('publisher', '').startswith('http') else '',
            'twitter': metadata.get('twitter_metadata', {}).get('site', ''),
            'locale': og_meta.get('locale', ''),
            'wikidata_qid': None  # TODO: Lookup media org in Wikidata
        }


# Global instance
entity_resolver = EntityResolver()
