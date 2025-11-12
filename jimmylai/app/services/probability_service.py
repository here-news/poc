"""
Probability Service - Core Truth-Seeking Algorithm

Handles:
- Bayesian probability updates when new evidence arrives
- Evidence quality weighting (video > transcript > article > social)
- Delta clarity calculation (information gain)
- Convergence detection (≥80% threshold)

This is the HEART of the Truth Market system.
"""

from typing import List, Dict, Any, Tuple
from dataclasses import dataclass
import math


@dataclass
class Hypothesis:
    """Represents a competing explanation/answer to the quest"""
    id: str
    quest_id: str
    hypothesis_text: str
    probability: float  # 0.0 to 1.0
    created_by: str
    created_at: str


@dataclass
class Evidence:
    """Represents a piece of evidence submitted to support/refute hypotheses"""
    id: str
    quest_id: str
    hypothesis_id: str  # Which hypothesis this supports
    evidence_url: str
    evidence_type: str
    synopsis: str
    novelty_score: float  # 0.0 to 1.0, from LLM
    submitted_by: str
    submitted_at: str


@dataclass
class ProbabilityUpdate:
    """Result of updating probabilities with new evidence"""
    updated_hypotheses: List[Hypothesis]
    delta_clarity: float  # Information gain
    entropy_before: float
    entropy_after: float
    reasoning: str


class ProbabilityService:
    """
    Service for calculating and updating hypothesis probabilities

    Uses Bayesian inference with evidence quality weighting
    """

    # Evidence quality hierarchy (methodology-based, not source-based)
    EVIDENCE_WEIGHTS = {
        "video_primary": 1.00,              # Direct video/audio evidence
        "transcript_extraction": 0.95,       # Verified transcript from primary source
        "corroborated_multi_source": 0.90,  # 3+ independent sources (any outlet)
        "official_statement": 0.85,          # Government/official on-record statement
        "credentialed_journalist": 0.75,     # Professional journalist, single source
        "news_article": 0.70,                # Standard news report
        "prediction": 0.50,                  # Forward-looking claim
        "social_media": 0.30,                # Social media post
    }

    CONVERGENCE_THRESHOLD = 0.80  # 80% probability = convergence

    def __init__(self):
        pass

    def calculate_evidence_weight(self, evidence_type: str) -> float:
        """
        Get quality weight for evidence type

        Args:
            evidence_type: Type of evidence (video_primary, news_article, etc.)

        Returns:
            Quality weight (0.0 to 1.0)
        """
        return self.EVIDENCE_WEIGHTS.get(evidence_type, 0.50)  # Default to 0.5

    def calculate_shannon_entropy(self, probabilities: List[float]) -> float:
        """
        Calculate Shannon entropy for probability distribution

        H = -Σ(p_i × log₂(p_i))

        Range: 0.0 (certain) to 1.0 (max uncertainty for binary)

        Args:
            probabilities: List of probabilities (must sum to 1.0)

        Returns:
            Shannon entropy (normalized to 0-1 for binary case)
        """
        if len(probabilities) == 0:
            return 0.0

        entropy = 0.0
        for p in probabilities:
            if p > 0:  # log(0) is undefined
                entropy -= p * math.log2(p)

        # Normalize by max entropy (log2(n) for n hypotheses)
        max_entropy = math.log2(len(probabilities)) if len(probabilities) > 1 else 1.0
        normalized_entropy = entropy / max_entropy if max_entropy > 0 else 0.0

        return normalized_entropy

    def update_probabilities(
        self,
        current_hypotheses: List[Hypothesis],
        new_evidence: Evidence,
        llm_analysis: Dict[str, Any]
    ) -> ProbabilityUpdate:
        """
        Update hypothesis probabilities based on new evidence

        Algorithm:
        1. Calculate evidence weight based on type and novelty
        2. Apply Bayesian-inspired update to target hypothesis
        3. Redistribute probabilities to sum to 1.0
        4. Calculate information gain (delta clarity)

        Args:
            current_hypotheses: Current state of all hypotheses
            new_evidence: Newly submitted evidence
            llm_analysis: LLM analysis result with impact assessment

        Returns:
            ProbabilityUpdate with new probabilities and metrics
        """
        if not current_hypotheses:
            raise ValueError("No hypotheses to update")

        # Calculate entropy before update
        current_probs = [h.probability for h in current_hypotheses]
        entropy_before = self.calculate_shannon_entropy(current_probs)

        # Get evidence quality weight
        evidence_weight = self.calculate_evidence_weight(new_evidence.evidence_type)

        # Get novelty from LLM analysis
        novelty_score = llm_analysis.get("novelty_score", 0.5)

        # Combined impact factor
        impact_factor = evidence_weight * novelty_score

        # Find target hypothesis (the one this evidence supports)
        target_hypothesis_id = new_evidence.hypothesis_id

        # Calculate probability shift
        # Higher impact = larger shift, scaled by evidence quality
        # Dynamic shift based on evidence quality and novelty:
        # - Exceptional evidence (impact > 0.75): up to 50% shift
        # - High-quality evidence (impact 0.60-0.75): up to 40% shift
        # - Good evidence (impact 0.40-0.60): up to 30% shift
        # - Moderate evidence (impact < 0.40): up to 20% shift

        if impact_factor >= 0.75:
            base_shift = 0.50  # Exceptional evidence (e.g., Reuters with multiple sources)
        elif impact_factor >= 0.60:
            base_shift = 0.40  # High-quality evidence
        elif impact_factor >= 0.40:
            base_shift = 0.30  # Good evidence
        else:
            base_shift = 0.20  # Moderate evidence

        shift_amount = impact_factor * base_shift

        # Find target hypothesis and calculate new probabilities
        updated_hypotheses = []
        target_idx = None

        for idx, h in enumerate(current_hypotheses):
            if h.id == target_hypothesis_id:
                target_idx = idx
                # Boost target hypothesis
                new_prob = min(0.99, h.probability + shift_amount)
            else:
                # Will redistribute below
                new_prob = h.probability

            new_h = Hypothesis(
                id=h.id,
                quest_id=h.quest_id,
                hypothesis_text=h.hypothesis_text,
                probability=new_prob,
                created_by=h.created_by,
                created_at=h.created_at
            )
            updated_hypotheses.append(new_h)

        # Redistribute from non-target hypotheses proportionally
        if target_idx is not None:
            target_new_prob = updated_hypotheses[target_idx].probability
            target_gain = target_new_prob - current_hypotheses[target_idx].probability

            # Others lose proportionally to their current probabilities
            other_total = sum(h.probability for i, h in enumerate(current_hypotheses) if i != target_idx)

            if other_total > 0:
                for idx, h in enumerate(updated_hypotheses):
                    if idx != target_idx:
                        # Lose proportionally
                        loss_fraction = current_hypotheses[idx].probability / other_total
                        loss = target_gain * loss_fraction
                        h.probability = max(0.01, current_hypotheses[idx].probability - loss)

        # Normalize probabilities to sum to 1.0
        total_prob = sum(h.probability for h in updated_hypotheses)
        if total_prob > 0:
            for h in updated_hypotheses:
                h.probability = h.probability / total_prob

        # Calculate entropy after update
        new_probs = [h.probability for h in updated_hypotheses]
        entropy_after = self.calculate_shannon_entropy(new_probs)

        # Calculate delta clarity (information gain)
        delta_clarity = entropy_before - entropy_after

        # Generate reasoning
        reasoning = self._generate_reasoning(
            new_evidence,
            impact_factor,
            delta_clarity,
            updated_hypotheses
        )

        return ProbabilityUpdate(
            updated_hypotheses=updated_hypotheses,
            delta_clarity=delta_clarity,
            entropy_before=entropy_before,
            entropy_after=entropy_after,
            reasoning=reasoning
        )

    def check_convergence(self, hypotheses: List[Hypothesis]) -> Tuple[bool, str]:
        """
        Check if quest has reached convergence

        Convergence criteria:
        - Any hypothesis ≥ 80% probability
        - If multiple hypotheses are ≥80%, return the one with highest probability

        Args:
            hypotheses: Current hypotheses

        Returns:
            (converged: bool, winning_hypothesis_id: str or None)
        """
        # Find all hypotheses above threshold
        candidates = [h for h in hypotheses if h.probability >= self.CONVERGENCE_THRESHOLD]

        if not candidates:
            return (False, None)

        # Return the hypothesis with the HIGHEST probability
        winner = max(candidates, key=lambda h: h.probability)
        return (True, winner.id)

    def _generate_reasoning(
        self,
        evidence: Evidence,
        impact_factor: float,
        delta_clarity: float,
        updated_hypotheses: List[Hypothesis]
    ) -> str:
        """Generate human-readable reasoning for probability update"""

        evidence_quality = self.calculate_evidence_weight(evidence.evidence_type)
        quality_desc = (
            "high-quality primary source" if evidence_quality >= 0.9 else
            "credible secondary source" if evidence_quality >= 0.7 else
            "moderate-quality source" if evidence_quality >= 0.5 else
            "low-quality source"
        )

        # Find which hypothesis was boosted
        winner = max(updated_hypotheses, key=lambda h: h.probability)

        reasoning = (
            f"Evidence from {quality_desc} ({evidence.evidence_type}) "
            f"with novelty score {evidence.novelty_score:.2f}. "
            f"This evidence increases confidence in: '{winner.hypothesis_text[:80]}...' "
            f"to {winner.probability * 100:.1f}%. "
            f"Information gain: {delta_clarity:.3f}"
        )

        return reasoning


# Singleton instance
_probability_service = None

def get_probability_service() -> ProbabilityService:
    """Get singleton instance of ProbabilityService"""
    global _probability_service
    if _probability_service is None:
        _probability_service = ProbabilityService()
    return _probability_service
