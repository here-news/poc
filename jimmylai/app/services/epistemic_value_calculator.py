"""
Epistemic Value Calculator

Calculates the true contribution of each piece of evidence to truth discovery.
This forms the "axiological surface" - the value landscape of truth-seeking.

Core Formula:
    epistemic_value = (
        source_credibility *
        verification_level *
        evidence_type_weight *
        novelty_score *
        max(0.1, 1.0 + clarity_delta) *  # Clarity as modifier, not multiplicand
        truth_alignment_score *
        (1 - redundancy_penalty) *
        (1 - misinformation_multiplier)
    )

Where:
    - source_credibility: 0.0-1.0 based on source type (Reuters=0.9, random X=0.25)
    - verification_level: 0.0-1.0 based on evidence quality (primary=1.0, hearsay=0.3)
    - evidence_type_weight: 0.0-1.0 based on format (video=0.9, social_media=0.4)
    - novelty_score: 0.0-1.0 from LLM analysis
    - clarity_delta: -1.0 to 1.0, treated as modifier (1.0 + delta) with floor at 0.1
    - truth_alignment_score: 0.0-1.0, how aligned with winning hypothesis
    - redundancy_penalty: 0.0-1.0, if evidence just repeats known info
    - misinformation_multiplier: 0.0-1.0, 1.0 if flagged as misinfo (zeroes out value)
"""

from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime
import math
import json


@dataclass
class EvidenceQuality:
    """Quality metrics for a piece of evidence"""
    # Intrinsic quality
    source_credibility: float = 0.5
    verification_level: float = 0.5
    evidence_type_weight: float = 0.5

    # Temporal relevance
    temporal_proximity: float = 0.5
    temporal_context: str = "post_event"

    # Epistemic contribution
    novelty_score: float = 0.5
    clarity_delta: float = 0.0
    contradiction_penalty: float = 0.0

    # Final value
    truth_alignment_score: float = 0.0
    redundancy_penalty: float = 0.0
    misinformation_multiplier: float = 0.0

    epistemic_value: float = 0.0


# Source credibility tiers
SOURCE_CREDIBILITY = {
    # Tier 1: Institutional & Primary (0.85-1.0)
    "government_official": 0.95,
    "wire_service": 0.90,          # Reuters, AP, AFP
    "major_newspaper": 0.85,        # NYT, WaPo, WSJ
    "verified_video": 0.90,         # Primary video evidence
    "video_primary": 0.90,          # Primary video (legacy)

    # Tier 2: Professional (0.65-0.84)
    "credentialed_journalist": 0.75,  # Owen Jensen
    "official_statement": 0.80,        # Government statements
    "subject_expert": 0.80,
    "regional_newspaper": 0.70,
    "news_article": 0.75,             # Generic news article

    # Tier 3: Secondary (0.40-0.64)
    "verified_social_media": 0.55,
    "transcript_extraction": 0.60,
    "analysis_piece": 0.50,
    "prediction": 0.45,

    # Tier 4: Unverified (0.1-0.39)
    "anonymous_social_media": 0.25,
    "social_media": 0.30,             # Generic social media
    "ai_generated_content": 0.15,     # Grok AI response
    "unverified_claim": 0.20,
}


class EpistemicValueCalculator:
    """Calculates epistemic value of evidence for bounty distribution"""

    def __init__(self, db_connection):
        self.conn = db_connection

    def get_source_credibility(self, source_type: str, source_url: str = None) -> float:
        """
        Get credibility score for a source type.

        Can be enhanced later to check source_credibility_registry table.
        """
        # Check if it's a known high-credibility domain
        if source_url:
            if "reuters.com" in source_url.lower():
                return 0.90
            elif "apnews.com" in source_url.lower() or "ap.org" in source_url.lower():
                return 0.90
            elif "nytimes.com" in source_url.lower():
                return 0.85
            elif "washingtonpost.com" in source_url.lower():
                return 0.85
            elif "youtube.com" in source_url.lower():
                # Could be primary video
                return 0.75

        return SOURCE_CREDIBILITY.get(source_type, 0.5)

    def get_verification_level(self, source_type: str, synopsis: str = "") -> float:
        """
        Assess verification level based on evidence characteristics.

        Primary sources (video, official docs) = 1.0
        Secondary with multiple sources = 0.7-0.9
        Unverified claims = 0.2-0.4
        """
        if source_type in ["verified_video", "video_primary", "government_official"]:
            return 1.0

        if source_type in ["official_statement", "wire_service"]:
            # Check if multiple sources mentioned
            if synopsis and any(word in synopsis.lower() for word in ["three sources", "multiple sources", "independent sources"]):
                return 0.95
            return 0.85

        if source_type in ["news_article", "major_newspaper"]:
            return 0.80

        if source_type == "transcript_extraction":
            return 0.70

        if source_type == "credentialed_journalist":
            if synopsis and "anonymous" in synopsis.lower():
                return 0.60  # Anonymous source reduces verification
            return 0.75

        if source_type in ["social_media", "anonymous_social_media"]:
            return 0.25

        if source_type == "ai_generated_content":
            return 0.10

        return 0.50

    def get_evidence_type_weight(self, source_type: str) -> float:
        """
        Weight based on evidence format/type.

        Video evidence > documents > secondary analysis > social media
        """
        weights = {
            "verified_video": 0.95,
            "video_primary": 0.95,
            "government_official": 0.90,
            "wire_service": 0.85,
            "official_statement": 0.85,
            "major_newspaper": 0.80,
            "news_article": 0.75,
            "credentialed_journalist": 0.70,
            "transcript_extraction": 0.65,
            "verified_social_media": 0.50,
            "social_media": 0.40,
            "prediction": 0.35,
            "ai_generated_content": 0.15,
        }
        return weights.get(source_type, 0.50)

    def calculate_truth_alignment(
        self,
        evidence_id: str,
        quest_id: str,
        winning_hypothesis_id: str
    ) -> float:
        """
        Calculate how well this evidence aligns with the winning hypothesis.

        Uses probability changes to determine if evidence supported winner.
        1.0 = strongly supported winner
        0.5 = neutral
        0.0 = strongly opposed winner
        """
        cursor = self.conn.cursor()

        # Get probability changes triggered by this evidence
        cursor.execute("""
            SELECT
                hypothesis_id,
                probability_before,
                probability_after,
                delta
            FROM probability_events
            WHERE trigger_id = ?
            AND quest_id = ?
        """, (evidence_id, quest_id))

        events = cursor.fetchall()

        if not events:
            return 0.5  # Neutral if no probability changes

        # Find the event for the winning hypothesis
        winner_delta = 0.0
        for event in events:
            if event[0] == winning_hypothesis_id:  # hypothesis_id
                winner_delta = event[3]  # delta
                break

        # Map delta to 0-1 scale
        # Positive delta (increased winner probability) = high alignment
        # Negative delta (decreased winner probability) = low alignment
        if winner_delta > 0:
            # Evidence supported winner: 0.5 to 1.0
            return min(0.5 + (winner_delta * 2.5), 1.0)
        else:
            # Evidence opposed winner: 0.0 to 0.5
            return max(0.5 + (winner_delta * 2.5), 0.0)

    def calculate_redundancy_penalty(
        self,
        evidence_id: str,
        quest_id: str,
        novelty_score: float
    ) -> float:
        """
        Penalize evidence that just repeats existing information.

        Low novelty = high redundancy penalty
        """
        # Novelty score is inverse of redundancy
        return max(0, 1.0 - novelty_score)

    def is_flagged_misinformation(self, evidence_id: str) -> Tuple[bool, float]:
        """
        Check if evidence is flagged as misinformation.

        Returns: (is_flagged, multiplier)
        where multiplier is 0.0 if confirmed misinfo, 1.0 if cleared
        """
        try:
            cursor = self.conn.cursor()

            cursor.execute("""
                SELECT resolution_status, evidence_multiplier
                FROM evidence_flags
                WHERE evidence_id = ?
                AND resolution_status IN ('confirmed_misinfo', 'pending')
                ORDER BY flagged_at DESC
                LIMIT 1
            """, (evidence_id,))

            result = cursor.fetchone()

            if not result:
                return False, 1.0  # Not flagged

            status = result[0]
            multiplier = result[1] if result[1] is not None else 0.0

            if status == "confirmed_misinfo":
                return True, 0.0  # Completely excluded

            if status == "pending":
                return True, 0.5  # Partial penalty while under investigation

            return False, 1.0
        except Exception:
            # Table doesn't exist yet or other error - assume not flagged
            return False, 1.0

    def calculate_epistemic_value(
        self,
        evidence_id: str,
        quest_id: str,
        winning_hypothesis_id: Optional[str] = None
    ) -> EvidenceQuality:
        """
        Calculate the epistemic value of a piece of evidence.

        This is the core function that determines bounty distribution.
        """
        cursor = self.conn.cursor()

        # Get evidence details
        cursor.execute("""
            SELECT
                source_url,
                source_type,
                synopsis,
                novelty_score,
                clarity_contribution
            FROM evidence_submissions
            WHERE id = ?
        """, (evidence_id,))

        evidence = cursor.fetchone()
        if not evidence:
            raise ValueError(f"Evidence {evidence_id} not found")

        source_url = evidence[0]
        source_type = evidence[1] or "unknown"
        synopsis = evidence[2] or ""
        novelty_score = evidence[3] if evidence[3] is not None else 0.5
        clarity_delta = evidence[4] if evidence[4] is not None else 0.0

        # Calculate quality dimensions
        quality = EvidenceQuality()

        quality.source_credibility = self.get_source_credibility(source_type, source_url)
        quality.verification_level = self.get_verification_level(source_type, synopsis)
        quality.evidence_type_weight = self.get_evidence_type_weight(source_type)

        quality.novelty_score = novelty_score
        quality.clarity_delta = clarity_delta

        # Check for misinformation flags
        is_flagged, misinfo_mult = self.is_flagged_misinformation(evidence_id)
        quality.misinformation_multiplier = 1.0 - misinfo_mult

        # If quest has converged, calculate truth alignment
        if winning_hypothesis_id:
            quality.truth_alignment_score = self.calculate_truth_alignment(
                evidence_id, quest_id, winning_hypothesis_id
            )
            quality.redundancy_penalty = self.calculate_redundancy_penalty(
                evidence_id, quest_id, novelty_score
            )
        else:
            # Quest still active - can't calculate final alignment
            quality.truth_alignment_score = 0.5  # Neutral
            quality.redundancy_penalty = 0.0

        # Calculate final epistemic value
        # Clarity is treated as a modifier (1.0 + clarity_delta) to avoid zero multiplication
        # where clarity_delta ranges from -1.0 to 1.0, giving modifier range of 0.0 to 2.0
        clarity_multiplier = max(0.1, 1.0 + quality.clarity_delta)  # Floor at 0.1 to avoid zeros

        quality.epistemic_value = (
            quality.source_credibility *
            quality.verification_level *
            quality.evidence_type_weight *
            quality.novelty_score *
            clarity_multiplier *
            quality.truth_alignment_score *
            (1.0 - quality.redundancy_penalty) *
            (1.0 - quality.misinformation_multiplier)
        )

        return quality

    def calculate_all_epistemic_values(self, quest_id: str) -> Dict[str, EvidenceQuality]:
        """
        Calculate epistemic values for all evidence in a quest.

        Returns dict of {evidence_id: EvidenceQuality}
        """
        cursor = self.conn.cursor()

        # Get quest details
        cursor.execute("""
            SELECT winning_hypothesis_id, status
            FROM quests
            WHERE id = ?
        """, (quest_id,))

        quest = cursor.fetchone()
        if not quest:
            raise ValueError(f"Quest {quest_id} not found")

        winning_hypothesis_id = quest[0]
        status = quest[1]

        # Only calculate truth alignment for converged quests
        if status != "converged":
            winning_hypothesis_id = None

        # Get all evidence for quest
        cursor.execute("""
            SELECT id
            FROM evidence_submissions
            WHERE quest_id = ?
            ORDER BY submitted_at
        """, (quest_id,))

        evidence_ids = [row[0] for row in cursor.fetchall()]

        # Calculate epistemic value for each
        results = {}
        for evidence_id in evidence_ids:
            quality = self.calculate_epistemic_value(
                evidence_id,
                quest_id,
                winning_hypothesis_id
            )
            results[evidence_id] = quality

        return results

    def save_epistemic_values(self, quest_id: str):
        """
        Calculate and save epistemic values to database.

        Called when quest converges.
        """
        values = self.calculate_all_epistemic_values(quest_id)

        cursor = self.conn.cursor()

        for evidence_id, quality in values.items():
            cursor.execute("""
                UPDATE evidence_submissions
                SET
                    source_credibility = ?,
                    verification_level = ?,
                    evidence_type_weight = ?,
                    truth_alignment_score = ?,
                    redundancy_penalty = ?,
                    epistemic_value = ?,
                    is_flagged_misinfo = ?
                WHERE id = ?
            """, (
                quality.source_credibility,
                quality.verification_level,
                quality.evidence_type_weight,
                quality.truth_alignment_score,
                quality.redundancy_penalty,
                quality.epistemic_value,
                quality.misinformation_multiplier > 0.5,
                evidence_id
            ))

        self.conn.commit()

        print(f"✅ Saved epistemic values for {len(values)} evidence pieces")

    def get_curator_reputation(self, user_id: str) -> float:
        """
        Get curator's current reputation score.
        New curators start at 0.5 (neutral).
        Returns value between 0.0 and 1.0.
        """
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT reputation_score
            FROM curator_reputation
            WHERE user_id = ?
        """, (user_id,))

        result = cursor.fetchone()
        if result:
            return result[0]

        # New curator - initialize with neutral reputation
        cursor.execute("""
            INSERT INTO curator_reputation (user_id, reputation_score)
            VALUES (?, 0.5)
        """, (user_id,))
        self.conn.commit()
        return 0.5

    def flag_misinformation(self, evidence_id: str, penalty: float = 0.9):
        """
        Flag evidence as misinformation and apply penalty.
        penalty: 0.0-1.0, where 1.0 completely zeros out epistemic value
        """
        cursor = self.conn.cursor()

        # Get the curator
        cursor.execute("""
            SELECT submitted_by FROM evidence_submissions WHERE id = ?
        """, (evidence_id,))
        result = cursor.fetchone()
        if not result:
            return

        curator_id = result[0]

        # Flag the evidence
        cursor.execute("""
            UPDATE evidence_submissions
            SET is_flagged_misinfo = TRUE,
                misinformation_penalty = ?
            WHERE id = ?
        """, (penalty, evidence_id))

        # Update curator reputation (immediate penalty)
        cursor.execute("""
            UPDATE curator_reputation
            SET flagged_misinfo_count = flagged_misinfo_count + 1,
                reputation_score = MAX(0.1, reputation_score - 0.1),
                last_updated = ?
            WHERE user_id = ?
        """, (datetime.utcnow().isoformat(), curator_id))

        self.conn.commit()
        print(f"🚩 Flagged evidence {evidence_id} as misinformation (penalty={penalty:.1%})")
        print(f"   Curator {curator_id} reputation decreased")

    def update_curator_reputations(self, quest_id: str):
        """
        Update all curator reputations after quest converges.
        Rewards curators whose evidence supported the winning hypothesis.
        """
        cursor = self.conn.cursor()

        # Get winning hypothesis
        cursor.execute("""
            SELECT winning_hypothesis_id
            FROM quests
            WHERE id = ?
        """, (quest_id,))
        result = cursor.fetchone()
        if not result or not result[0]:
            return

        winning_hyp_id = result[0]

        # Get all evidence for this quest
        cursor.execute("""
            SELECT id, submitted_by, truth_alignment_score, is_flagged_misinfo
            FROM evidence_submissions
            WHERE quest_id = ?
        """, (quest_id,))

        evidence_list = cursor.fetchall()

        # Update each curator's reputation
        for ev_id, curator_id, truth_alignment, is_misinfo in evidence_list:
            # Get current reputation
            cursor.execute("""
                SELECT reputation_score, total_submissions, correct_submissions
                FROM curator_reputation
                WHERE user_id = ?
            """, (curator_id,))
            rep_data = cursor.fetchone()

            if not rep_data:
                # Initialize if doesn't exist
                reputation, total, correct = 0.5, 0, 0
            else:
                reputation, total, correct = rep_data

            # Calculate reputation change
            if is_misinfo:
                # Already penalized in flag_misinformation
                delta = 0.0
            elif truth_alignment > 0.7:
                # Evidence strongly supported winner
                delta = +0.05
                correct += 1
            elif truth_alignment > 0.4:
                # Evidence weakly supported winner
                delta = +0.02
                correct += 1
            elif truth_alignment < 0.3:
                # Evidence contradicted winner
                delta = -0.03
            else:
                # Neutral evidence
                delta = 0.0

            total += 1
            new_reputation = max(0.0, min(1.0, reputation + delta))
            weighted_accuracy = correct / total if total > 0 else 0.5

            # Update reputation
            cursor.execute("""
                INSERT INTO curator_reputation (user_id, reputation_score, total_submissions, correct_submissions, weighted_accuracy, last_updated)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(user_id) DO UPDATE SET
                    reputation_score = ?,
                    total_submissions = ?,
                    correct_submissions = ?,
                    weighted_accuracy = ?,
                    last_updated = ?
            """, (
                curator_id, new_reputation, total, correct, weighted_accuracy, datetime.utcnow().isoformat(),
                new_reputation, total, correct, weighted_accuracy, datetime.utcnow().isoformat()
            ))

            if delta != 0:
                sign = "+" if delta > 0 else ""
                print(f"   {curator_id}: {reputation:.2f} → {new_reputation:.2f} ({sign}{delta:.2f})")

        self.conn.commit()
        print(f"✅ Updated curator reputations for quest {quest_id}")


def get_epistemic_calculator(db_connection):
    """Get singleton instance of epistemic value calculator"""
    return EpistemicValueCalculator(db_connection)
