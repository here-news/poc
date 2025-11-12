"""
Enhanced LLM Analyzer with Round-by-Round Learning

Key improvements:
1. Evidence context awareness (pre-event vs post-event)
2. Evidence type differentiation (prediction vs proof)
3. Cumulative reasoning (learns from previous evidence)
4. Hypothesis refinement (can split hypotheses when new scope discovered)
5. Temporal logic (timing matters)

This allows LLM to make better decisions at each round.
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from datetime import datetime
from openai import OpenAI
import json
import os


@dataclass
class Evidence:
    """Evidence with enhanced metadata"""
    id: str
    synopsis: str
    evidence_type: str
    evidence_url: str
    submitted_at: str
    novelty_score: float = 0.5


@dataclass
class Hypothesis:
    """Hypothesis with scope awareness"""
    id: str
    statement: str
    current_probability: float
    scope: Optional[str] = None  # e.g., "public", "private", "overall"


@dataclass
class AnalysisContext:
    """Full context for LLM analysis"""
    quest_title: str
    quest_description: str
    current_hypotheses: List[Hypothesis]
    previous_evidence: List[Evidence]  # All evidence so far
    new_evidence: Evidence  # The evidence being analyzed
    key_event_date: Optional[str] = None  # e.g., meeting date


class EnhancedLLMAnalyzer:
    """
    LLM analyzer that gets smarter with each round of evidence
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv('OPENAI_API_KEY')
        self.client = OpenAI(api_key=self.api_key) if self.api_key else None
        self.model = "gpt-4o-mini"

    def is_available(self) -> bool:
        return self.client is not None

    def analyze_evidence_with_context(
        self,
        context: AnalysisContext
    ) -> Dict[str, Any]:
        """
        Analyze new evidence in context of all previous evidence

        Returns:
        {
            "novelty_score": float,
            "evidence_quality": str,  # "prediction", "secondary", "primary"
            "temporal_context": str,  # "pre_event", "post_event"
            "target_hypothesis_id": str or None,
            "probability_shifts": {hypothesis_id: shift_amount},
            "reasoning": str,
            "scope_refinement_needed": bool,
            "suggested_new_hypotheses": List[str] or None
        }
        """
        if not self.is_available():
            return self._fallback_analysis(context)

        # Build rich prompt with full context
        prompt = self._build_contextual_prompt(context)

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": """You are a forensic evidence analyst helping determine truth in complex situations.

Your task is to analyze NEW evidence in the context of ALL PREVIOUS evidence and current hypothesis probabilities.

CRITICAL REASONING RULES:

1. **EVIDENCE TYPE HIERARCHY**:
   - Prediction/Expectation (before event): LOW impact, maintains uncertainty
   - Secondary sources (news reporting): MODERATE impact
   - Primary sources (video, official documents): HIGH impact
   - Multiple independent sources: VERY HIGH impact

2. **TEMPORAL AWARENESS**:
   - Evidence BEFORE the key event = speculation, not proof
   - Evidence AFTER the key event = potential proof
   - Time difference matters!

3. **EVIDENCE QUALITY**:
   - "Trump expected to..." = PREDICTION, not confirmation
   - "Trump said he may..." = NON-COMMITTAL, low confidence
   - "Video shows Trump..." = PRIMARY SOURCE, high confidence
   - "Multiple sources confirm..." = CORROBORATION, very high confidence

4. **SCOPE AWARENESS**:
   - If evidence reveals different scopes (public vs private), suggest splitting hypotheses
   - Example: Video of public portion ≠ private bilateral meeting

5. **CUMULATIVE REASONING**:
   - Consider how new evidence relates to previous evidence
   - Does it corroborate? Contradict? Add new dimension?
   - Don't overreact to single pieces of evidence

6. **PROBABILITY GUIDANCE**:
   - Prediction evidence: shift by 5-15% max
   - Single secondary source: shift by 10-20%
   - Primary source OR credentialed journalist: shift by 20-40%
   - Multiple independent sources (2-3): shift by 35-55%, can reach 80-85%
   - Multiple independent sources (3+) with corroboration: shift by 45-65%, can reach 85-95%
   - Wire service (Reuters/AP) with multiple sources: treat as high-quality, can reach 85-95%
   - Be bold when evidence quality is exceptional - don't artificially cap probabilities

7. **CRITICAL: HYPOTHESIS TARGETING**:
   - Read each hypothesis statement CAREFULLY
   - NEGATIVE evidence (shows something did NOT happen) should target hypotheses claiming it did NOT happen
   - POSITIVE evidence (shows something DID happen) should target hypotheses claiming it DID happen
   - Example:
     * Evidence: "Video shows Trump did NOT mention Lai publicly"
     * This SUPPORTS hypothesis: "Trump did not mention Lai"
     * This CONTRADICTS hypothesis: "Trump did mention Lai"
     * Therefore target_hypothesis_id should be the "did not mention" hypothesis ID!
   - When evidence shows ABSENCE of something, target the NEGATIVE hypothesis
   - When evidence shows PRESENCE of something, target the POSITIVE hypothesis
   - If you cannot determine the target, return null, do NOT guess

Return JSON with your analysis."""
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.3,  # Lower for more consistent reasoning
                max_tokens=1500,
                response_format={"type": "json_object"}
            )

            result = json.loads(response.choices[0].message.content)
            return result

        except Exception as e:
            print(f"❌ Error in enhanced LLM analysis: {e}")
            return self._fallback_analysis(context)

    def _build_contextual_prompt(self, context: AnalysisContext) -> str:
        """Build rich prompt with full context"""

        # Quest overview
        prompt = f"""**QUEST**: {context.quest_title}

{context.quest_description}

"""

        # Key event timing
        if context.key_event_date:
            prompt += f"**KEY EVENT DATE**: {context.key_event_date}\n\n"

        # Current hypotheses and probabilities
        prompt += "**CURRENT HYPOTHESES**:\n"
        for h in context.current_hypotheses:
            scope_note = f" [Scope: {h.scope}]" if h.scope else ""
            prompt += f"- {h.id}: \"{h.statement}\"{scope_note} — {h.current_probability*100:.1f}%\n"
        prompt += "\n"

        # Previous evidence timeline
        if context.previous_evidence:
            prompt += "**PREVIOUS EVIDENCE TIMELINE**:\n"
            for i, ev in enumerate(context.previous_evidence, 1):
                prompt += f"{i}. [{ev.evidence_type}] at {ev.submitted_at}\n"
                prompt += f"   Synopsis: {ev.synopsis[:150]}...\n"
                prompt += f"   Novelty: {ev.novelty_score:.2f}\n"
            prompt += "\n"

        # New evidence being analyzed
        prompt += "**NEW EVIDENCE** (analyze this in context of above):\n"
        prompt += f"Type: {context.new_evidence.evidence_type}\n"
        prompt += f"Submitted: {context.new_evidence.submitted_at}\n"
        prompt += f"URL: {context.new_evidence.evidence_url}\n"
        prompt += f"Synopsis:\n{context.new_evidence.synopsis}\n\n"

        # Analysis instructions
        prompt += """**YOUR ANALYSIS**:

Analyze this new evidence considering:
1. Is this BEFORE or AFTER the key event? (temporal context)
2. What TYPE of evidence is this? (prediction vs proof)
3. How does it relate to PREVIOUS evidence? (corroboration, contradiction, new dimension)
4. Which hypothesis does it support, if any?
   - If evidence shows something DID happen → target hypothesis claiming it DID happen
   - If evidence shows something did NOT happen → target hypothesis claiming it did NOT happen
   - Look at the hypothesis STATEMENTS carefully to match positive/negative claims!
5. How much should probabilities shift? (be conservative!)
6. Do we need to refine hypothesis scopes?

**IMPORTANT FOR target_hypothesis_id**:
- Look at each hypothesis ID and its statement above
- Match the evidence direction (positive/negative) to the hypothesis claim (positive/negative)
- Return the exact hypothesis_id string (e.g., "h-1234567890.123456")
- If unclear, return null

Return JSON with:
{
    "novelty_score": 0.0-1.0,
    "evidence_quality": "prediction" | "secondary" | "primary",
    "temporal_context": "pre_event" | "post_event" | "unclear",
    "target_hypothesis_id": "hypothesis_id" or null,
    "probability_shifts": {"hypothesis_id": +/- shift_amount},
    "reasoning": "detailed explanation including WHY you chose this target_hypothesis_id",
    "scope_refinement_needed": true/false,
    "suggested_new_hypotheses": ["hypothesis 1", ...] or null
}"""

        return prompt

    def _fallback_analysis(self, context: AnalysisContext) -> Dict[str, Any]:
        """Fallback when LLM unavailable"""
        return {
            "novelty_score": 0.5,
            "evidence_quality": "secondary",
            "temporal_context": "unclear",
            "target_hypothesis_id": None,
            "probability_shifts": {},
            "reasoning": "LLM unavailable, using fallback analysis",
            "scope_refinement_needed": False,
            "suggested_new_hypotheses": None
        }

    def suggest_hypothesis_refinement(
        self,
        quest_title: str,
        current_hypotheses: List[Hypothesis],
        all_evidence: List[Evidence]
    ) -> Optional[List[Dict[str, Any]]]:
        """
        Analyze all evidence and suggest if hypotheses should be refined

        Returns new hypothesis set if refinement needed, None otherwise
        """
        if not self.is_available():
            return None

        prompt = f"""Quest: {quest_title}

Current Hypotheses:
{chr(10).join(f"- {h.statement} ({h.current_probability*100:.1f}%)" for h in current_hypotheses)}

Evidence collected so far:
{chr(10).join(f"{i}. [{ev.evidence_type}] {ev.synopsis[:100]}..." for i, ev in enumerate(all_evidence, 1))}

**CRITICAL ANALYSIS:**

Do the current hypotheses capture the FULL TRUTH? Look for:

1. **Scope Conflicts**: Does evidence show different outcomes in different contexts?
   - Example: "Public event: NO" vs "Private meeting: YES"
   - These are NOT contradictions - they're COMPLEMENTARY truths!
   - If found: Split into scope-specific hypotheses

2. **Partial Coverage**: Do hypotheses only cover one aspect when evidence reveals multiple?
   - Example: Video only shows public segment, not private meeting
   - If found: Add hypotheses for uncovered scopes

3. **False Binary**: Is the question ambiguous without scope qualifier?
   - Example: "Did X happen?" when X happened in context A but not B
   - If found: Disambiguate with explicit scopes

**DECISION CRITERIA:**

Refinement is NEEDED if:
✓ Evidence clearly shows different outcomes in different scopes/contexts
✓ Current hypotheses force binary choice when both YES and NO are true
✓ Probability has oscillated dramatically (suggests scope confusion)

Refinement is NOT needed if:
✗ Evidence is just weak/contradictory (quality issue, not scope issue)
✗ Hypotheses already cover relevant scopes
✗ Question is genuinely binary with single answer

Return JSON:
{{
    "refinement_needed": true/false,
    "reason": "SPECIFIC explanation of scope conflict or why refinement not needed",
    "suggested_hypotheses": [
        {{
            "statement": "Scope-qualified statement (e.g., 'In PUBLIC context, X did NOT happen')",
            "initial_probability": 0.X,
            "scope": "scope_identifier"
        }},
        ...
    ] or null
}}"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are analyzing if hypotheses need refinement based on emerging evidence patterns."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                response_format={"type": "json_object"}
            )

            result = json.loads(response.choices[0].message.content)
            if result.get("refinement_needed"):
                return result.get("suggested_hypotheses")

            return None

        except Exception as e:
            print(f"Error in hypothesis refinement: {e}")
            return None


# Singleton
_enhanced_analyzer = None

def get_enhanced_analyzer() -> EnhancedLLMAnalyzer:
    global _enhanced_analyzer
    if _enhanced_analyzer is None:
        _enhanced_analyzer = EnhancedLLMAnalyzer()
    return _enhanced_analyzer
