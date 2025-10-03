"""
Streamlined Semantic Analyzer - Extract atomic claims with entities from cleaned content
"""
import asyncio
from typing import Dict, Any, List, Optional
from openai import OpenAI
import os
from dotenv import load_dotenv
import json
from datetime import datetime
import hashlib
import time

load_dotenv()

class EnhancedSemanticAnalyzer:
    def __init__(self):
        self.openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    def _with_retry(self, fn, *args, **kwargs):
        """Execute function with retry logic for API failures"""
        for i in range(2):
            try:
                return fn(*args, **kwargs)
            except Exception as e:
                if i == 0 and any(t in str(e) for t in ["429", "Rate limit", "timeout", "500", "502", "503"]):
                    time.sleep(1.2)
                    continue
                raise

    async def extract_enhanced_claims(self, page_meta: Dict[str, Any],
                                    page_text: List[Dict[str, str]],
                                    url: str, fetch_time: str = None,
                                    lang: str = "en") -> Dict[str, Any]:
        """
        Extract atomic, attributable claims with entities from content

        Args:
            page_meta: {title, byline, pub_time, site}
            page_text: [{selector, text}] - content blocks
            url: canonical URL
            fetch_time: when content was fetched
            lang: language code

        Returns:
            {
                "claims": [claim objects with WHO/WHERE/WHEN],
                "excluded_claims": [claims that failed premise checks],
                "entities": {people, locations, organizations, time_references},
                "gist": "one sentence summary",
                "confidence": float,
                "token_usage": {prompt_tokens, completion_tokens, total_tokens}
            }
        """
        try:
            if not page_text:
                return self._empty_extraction("No page content provided")

            # Prepare content
            full_text = self._prepare_content(page_meta, page_text)

            # Extract claims with entities
            claims_response = await self._extract_atomic_claims_with_ner(
                full_text, page_meta, url, lang
            )

            # Apply premise filter gatekeeper
            all_claims = claims_response.get('claims', [])
            admitted_claims = []
            excluded_claims = []

            for claim in all_claims:
                is_admitted, exclusion_reason = self._passes_claim_premises(claim)
                if is_admitted:
                    admitted_claims.append(claim)
                else:
                    claim['excluded_reason'] = exclusion_reason
                    excluded_claims.append(claim)

            # Extract entities only from admitted claims
            entities = self._extract_entities_from_claims(admitted_claims)

            print(f"✅ Claims: {len(admitted_claims)} admitted, {len(excluded_claims)} excluded")

            return {
                "claims": admitted_claims,
                "excluded_claims": excluded_claims,
                "entities": entities,
                "gist": claims_response.get('gist', 'No summary available'),
                "confidence": claims_response.get('overall_confidence', 0.5),
                "notes_unsupported": claims_response.get('notes_unsupported', []),
                "token_usage": claims_response.get('token_usage', {})
            }

        except Exception as e:
            print(f"❌ Claims extraction failed: {e}")
            return self._empty_extraction(f"Extraction failed: {str(e)}")

    def _prepare_content(self, page_meta: Dict[str, Any],
                        page_text: List[Dict[str, str]]) -> str:
        """Prepare content for LLM analysis"""
        content_parts = []

        # Add metadata
        if page_meta.get('title'):
            content_parts.append(f"Title: {page_meta['title']}")
        if page_meta.get('byline'):
            content_parts.append(f"Author: {page_meta['byline']}")
        if page_meta.get('pub_time'):
            content_parts.append(f"Published: {page_meta['pub_time']}")
        if page_meta.get('site'):
            content_parts.append(f"Source: {page_meta['site']}")

        content_parts.append("---")

        # Add text content
        for text_block in page_text[:20]:  # Limit to first 20 blocks
            text = text_block.get('text', '').strip()
            if text and len(text) > 20:
                content_parts.append(text)

        return "\n".join(content_parts)

    async def _extract_atomic_claims_with_ner(self, content: str,
                                            page_meta: Dict[str, Any],
                                            url: str, lang: str = "en") -> Dict[str, Any]:
        """Extract atomic claims with named entities using LLM"""

        system_prompt = f"""You are a fact extractor for structured journalism. Extract atomic, verifiable claims that meet minimum journalistic standards.

Language: {lang}
Return entity types in English (PERSON, ORG, GPE, LOCATION) but keep names as-is.

Before including a claim, verify it meets ALL these criteria:
1. **Attribution**: Clearly named source (person or organization) - no vague "they said"
2. **Temporal context**: Identifiable event time (not just reporting date)
3. **Modality clarity**: Is it official fact, reported info, or allegation?
4. **Evidence signal**: Mentions quote, document, photo, statement, or artifact
5. **Hedging filter**: Reject "reportedly", "allegedly", "might have" unless properly attributed
6. **Controversy guard**: Criminal/fault implications require official or court-confirmed source

Extract up to 10 claims per article that meet these standards. Aim for comprehensive coverage.

For each claim:
- WHO: Named people/organizations (PERSON:/ORG: prefix) - required
- WHERE: Specific places (GPE:/LOCATION: prefix)
- WHEN: Event time with precision (exact/approximate/relative)
- MODALITY: official_fact|reported_claim|allegation|opinion
- EVIDENCE: Artifacts referenced (document, video, photo, statement, testimony)
- CONFIDENCE: 0.0-1.0 based on evidence strength"""

        user_prompt = f"""Extract atomic claims from this content:

METADATA:
Title: {page_meta.get('title', 'Unknown')}
Site: {page_meta.get('site', 'Unknown')}
Published: {page_meta.get('pub_time', 'Unknown')}

CONTENT:
{content}

Return JSON:
{{
    "claims": [
        {{
            "text": "Atomic factual claim (one predicate only)",
            "who": ["PERSON:Name", "ORG:Organization"],
            "where": ["GPE:Location", "LOCATION:Place"],
            "when": {{
                "date": "YYYY-MM-DD",
                "time": "HH:MM:SS",
                "precision": "exact|approximate|relative",
                "event_time": "when it happened",
                "temporal_context": "timing description"
            }},
            "modality": "official_fact|reported_claim|allegation|opinion",
            "evidence_references": ["statement", "document", "photo"],
            "confidence": 0.85
        }}
    ],
    "gist": "One sentence summary",
    "overall_confidence": 0.8,
    "notes_unsupported": ["Weak statements not meeting standards"]
}}

Only include claims passing ALL 6 criteria above. Use notes_unsupported for interesting but weak statements."""

        try:
            response = await asyncio.to_thread(
                self._with_retry,
                self.openai_client.chat.completions.create,
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.2,
                max_tokens=2000
            )

            result = json.loads(response.choices[0].message.content)

            # Extract token usage
            token_usage = {
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens,
                "model": "gpt-4o"
            }

            # Normalize claims
            result = self._normalize_claims(result, url)
            result['token_usage'] = token_usage

            return result

        except Exception as e:
            print(f"❌ LLM extraction failed: {e}")
            return {
                "claims": [],
                "gist": "Extraction failed",
                "overall_confidence": 0.1,
                "notes_unsupported": [f"Error: {str(e)}"],
                "token_usage": {}
            }

    def _normalize_claims(self, result: Dict[str, Any], url: str) -> Dict[str, Any]:
        """Normalize LLM output with deterministic IDs and calibrated confidence"""
        claims = result.get('claims', [])
        current_time_iso = datetime.now().isoformat()

        for claim in claims:
            # Generate deterministic ID
            claim_text = claim.get('text', '')
            claim['id'] = self._claim_id(claim_text, url)

            # Normalize temporal info
            when_info = claim.get('when', {})
            if when_info and isinstance(when_info, dict):
                claim['when'] = self._normalize_when(when_info, current_time_iso)

            # Ensure confidence is valid
            confidence = claim.get('confidence', 0.7)
            if not isinstance(confidence, (int, float)) or confidence < 0 or confidence > 1:
                confidence = 0.7
            claim['confidence'] = round(min(max(float(confidence), 0.0), 0.99), 3)

        # Add metadata
        result['extraction_timestamp'] = current_time_iso
        result['source_url'] = url

        return result

    def _claim_id(self, text: str, url: str, version: str = "1.0") -> str:
        """Generate deterministic claim ID"""
        h = hashlib.sha256(f"{version}|{url}|{text}".encode()).hexdigest()[:16]
        return f"clm_{h}"

    def _normalize_when(self, when: dict, reported_time_iso: str) -> dict:
        """Normalize temporal information to consistent format"""
        normalized = {
            "date": when.get("date") or None,
            "time": when.get("time") or None,
            "precision": when.get("precision") or "approximate",
            "event_time": when.get("event_time") or None,
            "reported_time": reported_time_iso,
            "temporal_context": when.get("temporal_context") or None
        }

        # Create ISO timestamp if both date and time exist
        if normalized["date"] and normalized["time"]:
            normalized["event_time_iso"] = f'{normalized["date"]}T{normalized["time"]}Z'

        return normalized

    def _passes_claim_premises(self, claim: Dict[str, Any]) -> tuple[bool, str]:
        """
        Lightweight gatekeeper: Verify claim meets minimal journalistic standards

        6 checks aligned with LLM prompt instructions:
        1. Attribution - named source required
        2. Temporal context - event time required
        3. Modality clarity - must be specified
        4. Evidence signal - must reference artifacts
        5. Hedging filter - reject vague language
        6. Controversy guard - criminal claims need official source

        Returns: (is_admitted: bool, exclusion_reason: str)
        """
        text = claim.get('text', '').lower()
        who = claim.get('who', [])
        when = claim.get('when', {})
        modality = claim.get('modality', '')
        evidence = claim.get('evidence_references', [])
        confidence = claim.get('confidence', 0.0)

        # Check 1: Attribution - must have named source
        if not who or all(":" not in w for w in who):
            return False, "Attribution: No named source (WHO)"

        # Check 2: Temporal context - must have event time
        if not when or not when.get('date'):
            return False, "Temporal: Missing event time (WHEN)"

        # Check 3: Modality clarity - must be specified
        if not modality or modality not in ['official_fact', 'reported_claim', 'allegation', 'opinion']:
            return False, "Modality: Not specified or invalid"

        # Check 4: Evidence signal - must reference artifacts
        if not evidence or len(evidence) == 0:
            return False, "Evidence: No artifacts referenced"

        # Check 5: Hedging filter - reject unattributed hedging
        hedging = ["reportedly", "allegedly", "might have", "may have", "rumored", "unconfirmed"]
        if any(h in text for h in hedging):
            return False, "Hedging: Vague language without proper attribution"

        # Check 6: Controversy guard - criminal claims need official source
        criminal_terms = ["murdered", "killed", "assassinated", "raped", "trafficked", "kidnapped"]
        if any(term in text for term in criminal_terms):
            if modality != 'official_fact':
                return False, "Controversy: Criminal implication requires official_fact modality"

        # Confidence floor (basic quality check)
        if confidence < 0.65:
            return False, f"Confidence: Below threshold ({confidence:.2f} < 0.65)"

        return True, ""

    def _extract_entities_from_claims(self, claims: List[Dict[str, Any]]) -> Dict[str, List[str]]:
        """Extract and categorize entities from claims"""
        entities = {
            "people": set(),
            "organizations": set(),
            "locations": set(),
            "time_references": set()
        }

        for claim in claims:
            if not isinstance(claim, dict):
                continue

            # Extract from WHO field
            for who in claim.get('who', []):
                if who.startswith('PERSON:'):
                    entities['people'].add(who[7:])
                elif who.startswith('ORG:'):
                    entities['organizations'].add(who[4:])

            # Extract from WHERE field
            for where in claim.get('where', []):
                location = where.split(':', 1)[-1] if ':' in where else where
                entities['locations'].add(location.strip())

            # Extract from WHEN field
            when_info = claim.get('when', {})
            if isinstance(when_info, dict):
                if when_info.get('date'):
                    entities['time_references'].add(when_info['date'])
                if when_info.get('event_time'):
                    entities['time_references'].add(when_info['event_time'])
                if when_info.get('temporal_context'):
                    entities['time_references'].add(when_info['temporal_context'])

        # Convert sets to lists
        return {k: list(v) for k, v in entities.items()}

    def _empty_extraction(self, reason: str) -> Dict[str, Any]:
        """Return empty extraction result"""
        return {
            "claims": [],
            "excluded_claims": [],
            "entities": {
                "people": [],
                "organizations": [],
                "locations": [],
                "time_references": []
            },
            "gist": "No content extracted",
            "confidence": 0.0,
            "notes_unsupported": [reason],
            "token_usage": {}
        }

# Global instance
semantic_analyzer = EnhancedSemanticAnalyzer()
