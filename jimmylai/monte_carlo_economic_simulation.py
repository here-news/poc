"""
Monte Carlo Economic Simulation: Truth Market Scaling Potential

Simulates the economic value generation of a single high-stakes truth quest
like the Jimmy Lai case, modeling participant growth from 0 to millions.

Key Variables:
- Social impact (human rights, geopolitical significance)
- Political visibility (Senate involvement, presidential action)
- Global reach (language span, international interest)
- Network effects (viral spread, quality evidence)
- Economic incentives (bounties, reputation value)

Runs N simulations to estimate:
- Participant growth curves
- Total economic value generated
- Bounty pool accumulation
- Evidence quality distribution
- Platform revenue potential
"""

import numpy as np
import json
from dataclasses import dataclass
from typing import List, Dict, Tuple
from datetime import datetime, timedelta


@dataclass
class QuestCharacteristics:
    """Characteristics that drive economic value"""
    social_impact: float  # 0-1: human rights, justice significance
    political_visibility: float  # 0-1: government involvement, media coverage
    global_reach: float  # 0-1: international interest, language diversity
    controversy_level: float  # 0-1: disagreement drives engagement
    evidence_accessibility: float  # 0-1: can public find/verify evidence?

    def virality_coefficient(self) -> float:
        """How viral can this quest become?"""
        return (
            self.social_impact * 0.25 +
            self.political_visibility * 0.30 +
            self.global_reach * 0.20 +
            self.controversy_level * 0.15 +
            self.evidence_accessibility * 0.10
        )

    def quality_multiplier(self) -> float:
        """Quality of evidence/discussion expected"""
        return (
            self.political_visibility * 0.4 +
            self.evidence_accessibility * 0.35 +
            (1 - self.controversy_level) * 0.25  # Less controversy = more focus on evidence
        )


@dataclass
class SimulationResult:
    """Results from a single Monte Carlo run"""
    days: int
    final_participants: int
    total_bounty: float
    total_evidence_submitted: int
    total_comments: int
    total_value_generated: float  # Platform + participants
    converged: bool
    convergence_day: int
    language_communities: int


class TruthMarketEconomics:
    """Monte Carlo simulation of truth market economics"""

    def __init__(self, quest_chars: QuestCharacteristics):
        self.quest = quest_chars

    def simulate_participant_growth(
        self,
        days: int,
        initial_participants: int = 5
    ) -> List[int]:
        """
        Simulate participant growth using viral coefficient.

        Models:
        - Early adopters (linear growth)
        - Viral spread (exponential phase)
        - Saturation (logistic curve)
        - Evidence-driven spikes
        """
        participants = [initial_participants]

        # Maximum addressable market based on global reach
        max_participants = int(10_000_000 * self.quest.global_reach)

        # Virality drives growth rate
        base_growth_rate = self.quest.virality_coefficient() * 0.3

        for day in range(1, days):
            current = participants[-1]

            # Logistic growth with saturation
            saturation_factor = 1 - (current / max_participants)

            # Random daily growth (viral spread varies)
            daily_growth_rate = np.random.normal(
                base_growth_rate * saturation_factor,
                base_growth_rate * 0.3  # Variance
            )

            # Evidence submission creates spikes (10% chance of breakthrough)
            if np.random.random() < 0.1:
                evidence_spike = np.random.uniform(1.2, 2.0)
                daily_growth_rate *= evidence_spike

            # Controversy creates engagement spikes
            if np.random.random() < self.quest.controversy_level * 0.15:
                controversy_spike = np.random.uniform(1.3, 2.5)
                daily_growth_rate *= controversy_spike

            # Calculate new participants
            new_participants = int(current * (1 + daily_growth_rate))
            new_participants = min(new_participants, max_participants)

            participants.append(new_participants)

        return participants

    def simulate_bounty_accumulation(
        self,
        participants: List[int],
        days: int
    ) -> List[float]:
        """
        Simulate bounty pool growth.

        Models:
        - Individual contributions (small, frequent)
        - Whale contributions (large, rare)
        - Political/corporate backing (very large, conditional)
        """
        bounties = [0.0]

        for day in range(1, days):
            current_participants = participants[day]

            # Base contribution: 1-5% of participants contribute
            contribution_rate = np.random.uniform(0.01, 0.05)
            contributors = int(current_participants * contribution_rate)

            # Average contribution (most people give $5-50)
            avg_contribution = np.random.lognormal(
                mean=np.log(20),  # Median ~$20
                sigma=1.2  # Long tail to $100+
            )

            daily_bounty = contributors * avg_contribution

            # Whale contributions (1% chance per day)
            if np.random.random() < 0.01:
                whale_contribution = np.random.uniform(1000, 10000)
                daily_bounty += whale_contribution

            # Political backing (tied to political visibility)
            if np.random.random() < self.quest.political_visibility * 0.02:
                political_backing = np.random.uniform(5000, 50000)
                daily_bounty += political_backing

            bounties.append(bounties[-1] + daily_bounty)

        return bounties

    def simulate_evidence_quality(
        self,
        days: int
    ) -> Tuple[List[int], float]:
        """
        Simulate evidence submission and quality.

        Returns: (evidence_count_per_day, avg_quality)
        """
        evidence_counts = []
        quality_scores = []

        base_evidence_rate = self.quest.evidence_accessibility * 2.0  # pieces per day

        for day in range(days):
            # Evidence comes in waves
            daily_evidence = np.random.poisson(base_evidence_rate)
            evidence_counts.append(daily_evidence)

            # Quality driven by quest characteristics
            for _ in range(daily_evidence):
                quality = np.random.beta(
                    self.quest.quality_multiplier() * 10,
                    (1 - self.quest.quality_multiplier()) * 5
                )
                quality_scores.append(quality)

        avg_quality = np.mean(quality_scores) if quality_scores else 0.5
        return evidence_counts, avg_quality

    def simulate_comment_activity(
        self,
        participants: List[int],
        evidence_counts: List[int],
        days: int
    ) -> List[int]:
        """
        Simulate comment/discussion activity.

        More evidence + more controversy = more comments
        """
        comments = []

        for day in range(days):
            current_participants = participants[day]
            daily_evidence = evidence_counts[day]

            # Base: 5-15% of participants comment
            comment_rate = np.random.uniform(0.05, 0.15)

            # Controversy multiplier
            comment_rate *= (1 + self.quest.controversy_level * 0.5)

            # Evidence drives discussion
            evidence_multiplier = 1 + (daily_evidence * 0.3)

            daily_comments = int(
                current_participants * comment_rate * evidence_multiplier
            )

            comments.append(daily_comments)

        return comments

    def estimate_value_generated(
        self,
        participants: List[int],
        bounties: List[float],
        evidence_counts: List[int],
        comments: List[int],
        avg_evidence_quality: float
    ) -> float:
        """
        Estimate total economic value generated.

        Components:
        1. Direct bounty pool (explicit value)
        2. Platform transaction fees (5% of bounties)
        3. Reputation value (implicit, estimated)
        4. Knowledge/truth value (societal benefit)
        5. Attention economy (eyeballs x time)
        """
        final_bounty = bounties[-1]
        total_participants = participants[-1]
        total_evidence = sum(evidence_counts)
        total_comments = sum(comments)

        # 1. Direct bounty pool
        direct_value = final_bounty

        # 2. Platform revenue (5% fee)
        platform_revenue = final_bounty * 0.05

        # 3. Reputation value (estimated market value of reputation earned)
        # Top contributors earn reputation worth 2-5x their bounty share
        reputation_value = final_bounty * 2.5

        # 4. Knowledge value (truth discovery has societal value)
        # High-impact truths worth 10-100x the bounty pool
        knowledge_multiplier = (
            self.quest.social_impact * 50 +
            self.quest.political_visibility * 30 +
            avg_evidence_quality * 20
        )
        knowledge_value = final_bounty * knowledge_multiplier

        # 5. Attention economy (participant time x avg value per hour)
        # Assume avg 30 min per participant per engagement
        avg_time_per_person = 0.5  # hours
        avg_value_per_hour = 25  # USD (opportunity cost)
        attention_value = total_participants * avg_time_per_person * avg_value_per_hour

        total_value = (
            direct_value +
            platform_revenue +
            reputation_value +
            knowledge_value +
            attention_value
        )

        return total_value

    def run_simulation(
        self,
        days: int = 30,
        initial_participants: int = 5
    ) -> SimulationResult:
        """Run a single Monte Carlo simulation"""

        # Simulate participant growth
        participants = self.simulate_participant_growth(days, initial_participants)

        # Simulate bounty accumulation
        bounties = self.simulate_bounty_accumulation(participants, days)

        # Simulate evidence quality
        evidence_counts, avg_quality = self.simulate_evidence_quality(days)

        # Simulate comments
        comments = self.simulate_comment_activity(participants, evidence_counts, days)

        # Estimate convergence (high quality + high participation)
        converged = (
            avg_quality > 0.7 and
            participants[-1] > 100 and
            sum(evidence_counts) > 5
        )
        convergence_day = days // 2 if converged else -1

        # Estimate language communities (global reach drives diversity)
        language_communities = int(np.random.uniform(
            1,
            20 * self.quest.global_reach
        ))

        # Calculate total value
        total_value = self.estimate_value_generated(
            participants, bounties, evidence_counts, comments, avg_quality
        )

        return SimulationResult(
            days=days,
            final_participants=participants[-1],
            total_bounty=bounties[-1],
            total_evidence_submitted=sum(evidence_counts),
            total_comments=sum(comments),
            total_value_generated=total_value,
            converged=converged,
            convergence_day=convergence_day,
            language_communities=language_communities
        )


def run_monte_carlo(
    quest_chars: QuestCharacteristics,
    n_simulations: int = 1000,
    days: int = 30
) -> Dict:
    """
    Run Monte Carlo simulation with N iterations.

    Returns distribution of outcomes
    """
    print(f"\n{'='*80}")
    print(f"MONTE CARLO ECONOMIC SIMULATION: TRUTH MARKET SCALING")
    print(f"{'='*80}")
    print(f"\n🎯 Quest Characteristics:")
    print(f"   Social Impact: {quest_chars.social_impact:.2f}")
    print(f"   Political Visibility: {quest_chars.political_visibility:.2f}")
    print(f"   Global Reach: {quest_chars.global_reach:.2f}")
    print(f"   Controversy Level: {quest_chars.controversy_level:.2f}")
    print(f"   Evidence Accessibility: {quest_chars.evidence_accessibility:.2f}")
    print(f"\n   → Virality Coefficient: {quest_chars.virality_coefficient():.3f}")
    print(f"   → Quality Multiplier: {quest_chars.quality_multiplier():.3f}")

    print(f"\n🔬 Running {n_simulations:,} simulations over {days} days...")

    economics = TruthMarketEconomics(quest_chars)
    results = []

    for i in range(n_simulations):
        if (i + 1) % 100 == 0:
            print(f"   Progress: {i+1}/{n_simulations} simulations...")
        result = economics.run_simulation(days)
        results.append(result)

    # Analyze results
    participants = [r.final_participants for r in results]
    bounties = [r.total_bounty for r in results]
    values = [r.total_value_generated for r in results]
    convergence_rate = sum(1 for r in results if r.converged) / len(results)
    languages = [r.language_communities for r in results]

    print(f"\n{'='*80}")
    print(f"📊 RESULTS (N={n_simulations:,} simulations)")
    print(f"{'='*80}")

    print(f"\n👥 PARTICIPANT GROWTH:")
    print(f"   P5:  {np.percentile(participants, 5):>15,.0f} participants")
    print(f"   P25: {np.percentile(participants, 25):>15,.0f}")
    print(f"   P50: {np.percentile(participants, 50):>15,.0f} (median)")
    print(f"   P75: {np.percentile(participants, 75):>15,.0f}")
    print(f"   P95: {np.percentile(participants, 95):>15,.0f}")
    print(f"   Max: {max(participants):>15,.0f}")

    print(f"\n💰 BOUNTY POOL ACCUMULATION:")
    print(f"   P5:  ${np.percentile(bounties, 5):>15,.2f}")
    print(f"   P25: ${np.percentile(bounties, 25):>15,.2f}")
    print(f"   P50: ${np.percentile(bounties, 50):>15,.2f} (median)")
    print(f"   P75: ${np.percentile(bounties, 75):>15,.2f}")
    print(f"   P95: ${np.percentile(bounties, 95):>15,.2f}")
    print(f"   Max: ${max(bounties):>15,.2f}")

    print(f"\n💎 TOTAL ECONOMIC VALUE GENERATED:")
    print(f"   P5:  ${np.percentile(values, 5):>15,.2f}")
    print(f"   P25: ${np.percentile(values, 25):>15,.2f}")
    print(f"   P50: ${np.percentile(values, 50):>15,.2f} (median)")
    print(f"   P75: ${np.percentile(values, 75):>15,.2f}")
    print(f"   P95: ${np.percentile(values, 95):>15,.2f}")
    print(f"   Max: ${max(values):>15,.2f}")

    print(f"\n🌍 GLOBAL REACH:")
    print(f"   Language Communities (median): {np.median(languages):.0f}")
    print(f"   Language Communities (P95): {np.percentile(languages, 95):.0f}")

    print(f"\n✓ CONVERGENCE RATE: {convergence_rate*100:.1f}%")

    print(f"\n{'='*80}")
    print(f"🎯 KEY INSIGHTS")
    print(f"{'='*80}")

    median_value = np.median(values)
    median_participants = np.median(participants)
    median_bounty = np.median(bounties)

    print(f"\n• Median case generates ${median_value:,.0f} in total economic value")
    print(f"• Median {median_participants:,.0f} participants engaging")
    print(f"• Median ${median_bounty:,.0f} bounty pool")
    print(f"• {convergence_rate*100:.0f}% chance of reaching truth convergence")

    value_per_participant = median_value / median_participants if median_participants > 0 else 0
    print(f"• ${value_per_participant:.2f} value generated per participant")

    platform_revenue = median_bounty * 0.05
    print(f"• Platform revenue (5% fee): ${platform_revenue:,.2f}")

    print(f"\n💡 SCALING POTENTIAL:")
    if max(participants) > 1_000_000:
        print(f"   ✓ 95th percentile reaches {np.percentile(participants, 95):,.0f} participants")
        print(f"   ✓ Million-participant potential confirmed")
    else:
        print(f"   • Peak simulation: {max(participants):,.0f} participants")
        print(f"   • Increase global reach or virality for million+ scale")

    return {
        "quest_characteristics": quest_chars,
        "n_simulations": n_simulations,
        "days": days,
        "results": {
            "participants": {
                "p5": int(np.percentile(participants, 5)),
                "p50": int(np.percentile(participants, 50)),
                "p95": int(np.percentile(participants, 95)),
                "max": max(participants)
            },
            "bounty": {
                "p5": float(np.percentile(bounties, 5)),
                "p50": float(np.percentile(bounties, 50)),
                "p95": float(np.percentile(bounties, 95)),
                "max": float(max(bounties))
            },
            "total_value": {
                "p5": float(np.percentile(values, 5)),
                "p50": float(np.percentile(values, 50)),
                "p95": float(np.percentile(values, 95)),
                "max": float(max(values))
            },
            "convergence_rate": convergence_rate,
            "language_communities": {
                "p50": int(np.median(languages)),
                "p95": int(np.percentile(languages, 95))
            }
        }
    }


if __name__ == "__main__":
    # Jimmy Lai case characteristics
    jimmy_lai_case = QuestCharacteristics(
        social_impact=0.85,  # High: human rights, press freedom
        political_visibility=0.90,  # Very high: US Senate, Presidential meeting
        global_reach=0.75,  # High: English + Chinese + international interest
        controversy_level=0.70,  # High: US-China tensions, political divide
        evidence_accessibility=0.60  # Medium: public videos, news, but some private
    )

    print("\n🔥 CASE STUDY: Jimmy Lai Truth Quest")
    print("    (High-stakes geopolitical truth discovery)")

    results = run_monte_carlo(
        quest_chars=jimmy_lai_case,
        n_simulations=1000,
        days=30
    )

    # Save results
    output_file = "monte_carlo_results.json"
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2, default=str)

    print(f"\n💾 Results saved to: {output_file}")
    print(f"\n{'='*80}\n")
