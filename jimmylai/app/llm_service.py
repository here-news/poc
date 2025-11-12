"""
LLM Service for Truth Market Quest System

This module provides LLM-powered analysis for:
1. Hypothesis generation from quest questions and initial evidence
2. Evidence analysis and probability updates
3. Claim extraction and verification
"""

from typing import List, Dict, Optional, Tuple
from openai import OpenAI
import json
import os


class LLMService:
    """Service for LLM-powered forensic analysis"""

    def __init__(self, api_key: Optional[str] = None):
        """Initialize LLM service with OpenAI API key"""
        self.api_key = api_key or os.getenv('OPENAI_API_KEY')
        self.client = OpenAI(api_key=self.api_key) if self.api_key else None
        self.model = "gpt-4o-mini"  # Cost-effective model for analysis

    def is_available(self) -> bool:
        """Check if LLM service is available"""
        return self.client is not None

    def generate_binary_hypotheses(
        self,
        quest_title: str,
        quest_description: str,
        initial_evidence: Optional[str] = None
    ) -> List[Dict[str, any]]:
        """
        Generate binary hypotheses for a quest question

        Args:
            quest_title: The quest question
            quest_description: Context about the question
            initial_evidence: Optional initial evidence text

        Returns:
            List of hypothesis dicts with statement and initial_probability
        """
        if not self.is_available():
            return self._fallback_hypotheses(quest_title)

        # Build prompt for hypothesis generation
        prompt = self._build_hypothesis_generation_prompt(
            quest_title, quest_description, initial_evidence
        )

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": """You are a forensic analyst generating competing hypotheses for investigation questions.

Your task is to generate a RICH, MULTIDIMENSIONAL hypothesis space that explores various possibilities.

**CRITICAL FRAMEWORK:**

1. **THINK IN DIMENSIONS, NOT JUST BINARY**:
   - Don't just create "Yes/No" hypotheses
   - Explore different ASPECTS of the question: timing, scope, context, partial truth, alternative explanations
   - Example: For "Did X happen?", consider:
     * X happened fully as claimed
     * X happened partially (specify how)
     * X happened in specific context but not others
     * X appeared to happen but actually Y happened
     * X did not happen at all

2. **GENERATE MAJOR HYPOTHESES (typically 2) WITH SUB-VARIATIONS**:
   - Start with 2 major competing positions (e.g., "Yes" vs "No")
   - Under each major position, add nuanced variations exploring different dimensions:
     * Scope variations (public vs private, official vs unofficial)
     * Degree variations (fully, partially, conditionally)
     * Context variations (when, where, under what circumstances)
     * Mechanism variations (how it might have happened)
   - Structure as: Major hypothesis → Sub-hypotheses exploring possibilities
   - Even without evidence, generate plausible variations based on the question's nature

3. **PROBABILITY DISTRIBUTION**:
   - Major hypotheses can start with baseline split (e.g., 0.5/0.5)
   - Sub-hypotheses under each major hypothesis should sum to that major's probability
   - Example: Major "Yes" (0.5) → "Publicly yes" (0.25) + "Privately yes" (0.25)
   - All probabilities across all hypotheses must sum to 1.0

4. **HYPOTHESIS STRUCTURE**:
   - Create a FLAT list (no nested JSON)
   - Use clear naming to show relationships: "Yes: Full confirmation", "Yes: Partial (public only)", "No: Complete denial", etc.
   - Each hypothesis is independent and mutually exclusive

Format as JSON:
{
  "hypotheses": [
    {
      "statement": "Clear, specific hypothesis statement",
      "probability": 0.25,
      "reasoning": "Why this variation is worth considering",
      "dimension": "scope|degree|context|mechanism|other"
    }
  ]
}

**EXAMPLE FOR "Did Trump mention Lai to Xi?"**:
- "Yes: Mentioned in both public and private contexts" (0.15)
- "Yes: Mentioned only in private bilateral meeting" (0.25)
- "Yes: Mentioned only in public press conference" (0.05)
- "Yes: Mentioned briefly but not substantively" (0.05)
- "No: Did not mention at all in any context" (0.35)
- "No: Planned to mention but meeting was cut short" (0.10)
- "No: Decided against mentioning due to strategic reasons" (0.05)

This creates a rich space for evidence to refine, not just flip between two options."""
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7,
                max_tokens=1000,
                response_format={"type": "json_object"}
            )

            result = json.loads(response.choices[0].message.content)
            hypotheses = result.get("hypotheses", [])

            # Normalize probabilities to sum to 1.0
            total_prob = sum(h.get("probability", 0) for h in hypotheses)
            if total_prob > 0:
                for h in hypotheses:
                    h["probability"] = h.get("probability", 0) / total_prob

            return hypotheses

        except Exception as e:
            print(f"❌ Error generating hypotheses: {e}")
            return self._fallback_hypotheses(quest_title)

    def analyze_evidence(
        self,
        evidence_text: str,
        evidence_url: str,
        hypotheses: List[Dict[str, any]],
        quest_context: str
    ) -> Dict[str, any]:
        """
        Analyze evidence and determine impact on hypothesis probabilities

        Args:
            evidence_text: The evidence content
            evidence_url: Source URL
            hypotheses: Current hypotheses with probabilities
            quest_context: Quest question and description

        Returns:
            Analysis dict with:
            - novelty_score: How novel/unique is this evidence (0-1)
            - probability_deltas: Dict mapping hypothesis_id to probability change
            - key_claims: List of key claims extracted from evidence
            - reasoning: Explanation of analysis
        """
        if not self.is_available():
            return self._fallback_analysis()

        prompt = self._build_evidence_analysis_prompt(
            evidence_text, evidence_url, hypotheses, quest_context
        )

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": """You are a forensic evidence analyst evaluating new evidence for investigation quests.

Your task is to:
1. Extract key claims from the evidence
2. Assess novelty (is this truly new information?)
3. Determine how this evidence affects the probability of each hypothesis
4. Provide clear reasoning

CRITICAL EVIDENCE EVALUATION RULES:
- Positive delta (+) = Evidence SUPPORTS this hypothesis (makes it MORE likely to be true)
- Negative delta (-) = Evidence CONTRADICTS this hypothesis (makes it LESS likely to be true)
- If evidence directly confirms something, give that hypothesis a POSITIVE delta
- If evidence directly denies something, give that hypothesis a NEGATIVE delta

Example: If evidence says "X happened", then:
  - "Yes, X happened" gets POSITIVE delta (e.g., +0.15)
  - "No, X did not happen" gets NEGATIVE delta (e.g., -0.15)

Evidence strength guidelines:
- Primary sources (video, official documents): Stronger deltas (±0.15 to ±0.25)
- Multiple independent sources: Strong deltas (±0.10 to ±0.20)
- Single secondary source: Moderate deltas (±0.05 to ±0.15)
- Speculation or predictions: Weak deltas (±0.02 to ±0.08)

Guidelines:
- Novelty score: 0.0 (redundant) to 1.0 (completely new information)
- Probability deltas: -0.3 to +0.3 for each hypothesis
- Deltas must sum to near 0 (probabilities always sum to 1.0)
- Extract 2-5 key claims as bullet points
- Provide concise reasoning (2-3 sentences)

Format as JSON:
{
  "novelty_score": 0.7,
  "probability_deltas": {
    "hypothesis_1_id": 0.15,
    "hypothesis_2_id": -0.15
  },
  "key_claims": ["Claim 1", "Claim 2"],
  "reasoning": "This evidence supports..."
}"""
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.5,
                max_tokens=800,
                response_format={"type": "json_object"}
            )

            analysis = json.loads(response.choices[0].message.content)

            # Normalize probability deltas to sum to ~0
            deltas = analysis.get("probability_deltas", {})
            delta_sum = sum(deltas.values())
            if abs(delta_sum) > 0.01:  # Allow small rounding errors
                adjustment = delta_sum / len(deltas)
                for hyp_id in deltas:
                    deltas[hyp_id] -= adjustment

            return analysis

        except Exception as e:
            print(f"❌ Error analyzing evidence: {e}")
            return self._fallback_analysis()

    def _build_hypothesis_generation_prompt(
        self,
        quest_title: str,
        quest_description: str,
        initial_evidence: Optional[str]
    ) -> str:
        """Build prompt for hypothesis generation"""
        prompt_parts = [
            f"Quest Question: {quest_title}",
            f"\nContext: {quest_description}"
        ]

        if initial_evidence:
            prompt_parts.append(f"\nInitial Evidence:\n{initial_evidence[:2000]}")

        prompt_parts.append("""
Generate 5-8 hypotheses exploring multiple dimensions of this question.

Structure them around 2 major positions (e.g., Yes/No, Happened/Didn't Happen), with multiple variations under each that explore:
- Different scopes (public/private, official/unofficial, partial/complete)
- Different contexts or circumstances
- Different degrees or intensities
- Alternative explanations or mechanisms

Even without evidence, think creatively about plausible variations based on the question's nature.""")

        return "\n".join(prompt_parts)

    def _build_evidence_analysis_prompt(
        self,
        evidence_text: str,
        evidence_url: str,
        hypotheses: List[Dict[str, any]],
        quest_context: str
    ) -> str:
        """Build prompt for evidence analysis"""
        prompt_parts = [
            f"Quest: {quest_context}",
            "\nCurrent Hypotheses:"
        ]

        for i, hyp in enumerate(hypotheses, 1):
            prompt_parts.append(
                f"{i}. [{hyp['id']}] {hyp['statement']} "
                f"(current probability: {hyp['current_probability']:.1%})"
            )

        prompt_parts.extend([
            f"\nNew Evidence Source: {evidence_url}",
            f"\nEvidence Content:\n{evidence_text[:3000]}",
            "\nAnalyze this evidence and determine its impact on the hypothesis probabilities."
        ])

        return "\n".join(prompt_parts)

    def _fallback_hypotheses(self, quest_title: str) -> List[Dict[str, any]]:
        """Fallback hypotheses when LLM is unavailable"""
        return [
            {
                "statement": f"{quest_title} - Hypothesis A (confirm)",
                "probability": 0.5,
                "reasoning": "Default binary hypothesis (LLM unavailable)"
            },
            {
                "statement": f"{quest_title} - Hypothesis B (reject)",
                "probability": 0.5,
                "reasoning": "Default binary hypothesis (LLM unavailable)"
            }
        ]

    def _fallback_analysis(self) -> Dict[str, any]:
        """Fallback analysis when LLM is unavailable"""
        return {
            "novelty_score": 0.5,
            "probability_deltas": {},
            "key_claims": ["LLM analysis unavailable"],
            "reasoning": "Evidence submitted but LLM service is not configured"
        }


# Singleton instance
_llm_service = None

def get_llm_service() -> LLMService:
    """Get or create the LLM service singleton"""
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service
