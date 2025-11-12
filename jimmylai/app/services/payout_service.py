"""
Payout Service - Fair Reward Distribution

Handles:
- Calculate contributor payouts based on multiple factors
- Delta clarity contribution (40%)
- Evidence novelty (30%)
- Community votes (20%)
- Timing bonus (10%)
- Breakthrough bonus (flat $20 for triggering convergence)
- Platform fee (10%)

This ensures fairness and transparency in reward distribution.
"""

from typing import List, Dict, Any, Tuple
from dataclasses import dataclass
from datetime import datetime


@dataclass
class EvidenceContribution:
    """Represents a contributor's evidence and its impact"""
    evidence_id: str
    user_id: str
    evidence_type: str
    delta_clarity: float  # Information gain from this evidence
    novelty_score: float  # LLM-assessed novelty (0-1)
    community_votes: int  # Upvotes - downvotes
    submitted_at: str  # ISO timestamp
    triggered_convergence: bool  # Did this evidence cause ≥80%?


@dataclass
class PayoutBreakdown:
    """Detailed breakdown of a single payout"""
    user_id: str
    evidence_id: str
    total_amount: float
    breakdown: Dict[str, float]  # {delta_clarity: X, novelty: Y, ...}
    percentage_of_pool: float


@dataclass
class PayoutResult:
    """Complete payout calculation for a quest"""
    quest_id: str
    total_bounty: float
    platform_fee: float
    distributable_amount: float
    payouts: List[PayoutBreakdown]
    summary: Dict[str, Any]


class PayoutService:
    """
    Service for calculating fair reward distribution

    Formula:
    evidence_score = (
        delta_clarity × 40% +
        novelty × 30% +
        normalized_votes × 20% +
        timing_bonus × 10%
    )

    payout = (evidence_score / total_score) × distributable_pool

    Plus breakthrough bonus if evidence triggered convergence
    """

    # Configuration
    PLATFORM_FEE_RATE = 0.10  # 10% platform fee
    BREAKTHROUGH_BONUS = 20.00  # Flat $20 for triggering convergence

    # Score weights (must sum to 1.0)
    WEIGHT_DELTA_CLARITY = 0.40
    WEIGHT_NOVELTY = 0.30
    WEIGHT_VOTES = 0.20
    WEIGHT_TIMING = 0.10

    def __init__(self):
        pass

    def calculate_timing_bonus(
        self,
        submitted_at: str,
        earliest_timestamp: str,
        latest_timestamp: str
    ) -> float:
        """
        Calculate timing bonus (earlier = higher)

        Args:
            submitted_at: When this evidence was submitted
            earliest_timestamp: First evidence timestamp
            latest_timestamp: Last evidence timestamp

        Returns:
            Timing bonus (0.0 to 1.0, where 1.0 = earliest)
        """
        try:
            submitted = datetime.fromisoformat(submitted_at.replace('Z', '+00:00'))
            earliest = datetime.fromisoformat(earliest_timestamp.replace('Z', '+00:00'))
            latest = datetime.fromisoformat(latest_timestamp.replace('Z', '+00:00'))

            time_range = (latest - earliest).total_seconds()

            if time_range == 0:
                # All submitted at same time
                return 1.0

            time_since_earliest = (submitted - earliest).total_seconds()

            # Linear decay: earliest = 1.0, latest = 0.3
            bonus = 1.0 - (0.7 * (time_since_earliest / time_range))
            return max(0.3, min(1.0, bonus))

        except Exception as e:
            print(f"Warning: Could not calculate timing bonus: {e}")
            return 0.5  # Default to middle value

    def normalize_votes(
        self,
        vote_count: int,
        max_votes: int,
        min_votes: int
    ) -> float:
        """
        Normalize vote counts to 0-1 range

        Args:
            vote_count: This evidence's votes
            max_votes: Highest vote count in quest
            min_votes: Lowest vote count in quest

        Returns:
            Normalized score (0.0 to 1.0)
        """
        if max_votes == min_votes:
            return 0.5  # All have same votes

        # Linear normalization
        normalized = (vote_count - min_votes) / (max_votes - min_votes)
        return max(0.0, min(1.0, normalized))

    def calculate_evidence_score(
        self,
        contribution: EvidenceContribution,
        all_contributions: List[EvidenceContribution]
    ) -> Tuple[float, Dict[str, float]]:
        """
        Calculate composite score for a single evidence contribution

        Returns:
            (total_score, breakdown_dict)
        """
        # Get timing range
        timestamps = [c.submitted_at for c in all_contributions]
        earliest = min(timestamps)
        latest = max(timestamps)

        # Get vote range
        votes = [c.community_votes for c in all_contributions]
        max_votes = max(votes) if votes else 0
        min_votes = min(votes) if votes else 0

        # Calculate components
        timing_bonus = self.calculate_timing_bonus(
            contribution.submitted_at,
            earliest,
            latest
        )

        normalized_votes = self.normalize_votes(
            contribution.community_votes,
            max_votes,
            min_votes
        )

        # Weighted score
        score_components = {
            "delta_clarity": contribution.delta_clarity * self.WEIGHT_DELTA_CLARITY,
            "novelty": contribution.novelty_score * self.WEIGHT_NOVELTY,
            "votes": normalized_votes * self.WEIGHT_VOTES,
            "timing": timing_bonus * self.WEIGHT_TIMING,
        }

        total_score = sum(score_components.values())

        return (total_score, score_components)

    def calculate_payouts(
        self,
        quest_id: str,
        total_bounty: float,
        contributions: List[EvidenceContribution]
    ) -> PayoutResult:
        """
        Calculate fair payout distribution for all contributors

        Args:
            quest_id: Quest identifier
            total_bounty: Total bounty pool
            contributions: List of evidence contributions

        Returns:
            PayoutResult with detailed breakdown
        """
        if not contributions:
            return PayoutResult(
                quest_id=quest_id,
                total_bounty=total_bounty,
                platform_fee=0.0,
                distributable_amount=0.0,
                payouts=[],
                summary={"error": "No contributions to distribute"}
            )

        # Calculate platform fee
        platform_fee = total_bounty * self.PLATFORM_FEE_RATE
        distributable_amount = total_bounty - platform_fee

        # Calculate scores for all contributions
        scores = []
        for contribution in contributions:
            score, breakdown = self.calculate_evidence_score(contribution, contributions)
            scores.append((contribution, score, breakdown))

        # Calculate total score
        total_score = sum(score for _, score, _ in scores)

        if total_score == 0:
            # Fallback: equal distribution
            equal_amount = distributable_amount / len(contributions)
            payouts = [
                PayoutBreakdown(
                    user_id=c.user_id,
                    evidence_id=c.evidence_id,
                    total_amount=equal_amount,
                    breakdown={"equal_split": equal_amount},
                    percentage_of_pool=1.0 / len(contributions)
                )
                for c in contributions
            ]

            return PayoutResult(
                quest_id=quest_id,
                total_bounty=total_bounty,
                platform_fee=platform_fee,
                distributable_amount=distributable_amount,
                payouts=payouts,
                summary={"distribution_method": "equal_split"}
            )

        # Calculate payouts based on scores
        payouts = []
        for contribution, score, score_breakdown in scores:
            # Base payout from score
            payout_percentage = score / total_score
            base_payout = distributable_amount * payout_percentage

            # Add breakthrough bonus if applicable
            breakthrough_bonus = self.BREAKTHROUGH_BONUS if contribution.triggered_convergence else 0.0
            total_payout = base_payout + breakthrough_bonus

            # Create detailed breakdown
            breakdown_amounts = {
                "base_payout": base_payout,
                "delta_clarity_contribution": score_breakdown["delta_clarity"],
                "novelty_contribution": score_breakdown["novelty"],
                "votes_contribution": score_breakdown["votes"],
                "timing_contribution": score_breakdown["timing"],
            }

            if breakthrough_bonus > 0:
                breakdown_amounts["breakthrough_bonus"] = breakthrough_bonus

            payout = PayoutBreakdown(
                user_id=contribution.user_id,
                evidence_id=contribution.evidence_id,
                total_amount=total_payout,
                breakdown=breakdown_amounts,
                percentage_of_pool=payout_percentage,
            )

            payouts.append(payout)

        # Sort by payout amount (highest first)
        payouts.sort(key=lambda p: p.total_amount, reverse=True)

        # Create summary
        total_distributed = sum(p.total_amount for p in payouts)
        summary = {
            "total_contributors": len(contributions),
            "total_distributed": total_distributed,
            "platform_fee": platform_fee,
            "top_contributor": payouts[0].user_id if payouts else None,
            "top_payout": payouts[0].total_amount if payouts else 0.0,
            "breakthrough_bonuses_paid": sum(
                1 for c in contributions if c.triggered_convergence
            ),
        }

        return PayoutResult(
            quest_id=quest_id,
            total_bounty=total_bounty,
            platform_fee=platform_fee,
            distributable_amount=distributable_amount,
            payouts=payouts,
            summary=summary
        )


# Singleton instance
_payout_service = None

def get_payout_service() -> PayoutService:
    """Get singleton instance of PayoutService"""
    global _payout_service
    if _payout_service is None:
        _payout_service = PayoutService()
    return _payout_service
