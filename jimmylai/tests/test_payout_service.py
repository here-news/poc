"""
Test Payout Service using Jimmy Lai simulation data

Tests fair reward distribution algorithm
"""

import sys
sys.path.append('/app')

from app.services.payout_service import (
    PayoutService,
    EvidenceContribution,
    get_payout_service
)


def test_jimmy_lai_payout_distribution():
    """
    Test payout distribution for Jimmy Lai case

    Expected results (from case study):
    - @BuilderA (video): ~40% + timing bonus
    - @BuilderB (transcript): ~32% + breakthrough bonus
    - @BuilderC (misinformation flag): ~15%
    - @BuilderD (prediction): ~13%
    """
    service = get_payout_service()

    total_bounty = 60.00  # From simulation

    contributions = [
        # BuilderD: Prediction article (first, low impact)
        EvidenceContribution(
            evidence_id="ev1",
            user_id="user-builderd",
            evidence_type="prediction",
            delta_clarity=0.023,  # From test output
            novelty_score=0.6,
            community_votes=5,
            submitted_at="2025-10-25T06:14:00Z",
            triggered_convergence=False
        ),
        # BuilderA: Video footage (high impact)
        EvidenceContribution(
            evidence_id="ev2",
            user_id="user-buildera",
            evidence_type="video_primary",
            delta_clarity=0.042,
            novelty_score=0.8,
            community_votes=15,
            submitted_at="2025-10-30T18:00:00Z",
            triggered_convergence=False
        ),
        # BuilderB: Transcript (highest impact, triggered convergence!)
        EvidenceContribution(
            evidence_id="ev3",
            user_id="user-builderb",
            evidence_type="transcript_extraction",
            delta_clarity=0.399,  # Huge clarity gain!
            novelty_score=0.8,
            community_votes=12,
            submitted_at="2025-10-30T18:30:00Z",
            triggered_convergence=True  # Gets breakthrough bonus
        ),
    ]

    print("\n" + "="*70)
    print("JIMMY LAI PAYOUT DISTRIBUTION TEST")
    print("="*70)
    print(f"\nTotal Bounty Pool: ${total_bounty:.2f}")
    print(f"Number of Contributors: {len(contributions)}")
    print("\nContributions:")
    for c in contributions:
        print(f"  {c.user_id}")
        print(f"    Type: {c.evidence_type}")
        print(f"    ΔClarity: {c.delta_clarity:.3f}")
        print(f"    Novelty: {c.novelty_score:.1f}")
        print(f"    Votes: {c.community_votes}")
        print(f"    Convergence: {'YES 🏆' if c.triggered_convergence else 'No'}")

    # Calculate payouts
    result = service.calculate_payouts("quest-jimmy-lai", total_bounty, contributions)

    print(f"\n" + "-"*70)
    print("PAYOUT CALCULATION RESULTS")
    print("-"*70)
    print(f"\nTotal Bounty: ${result.total_bounty:.2f}")
    print(f"Platform Fee (10%): ${result.platform_fee:.2f}")
    print(f"Distributable: ${result.distributable_amount:.2f}")

    print(f"\n{'User':<20} {'Evidence':<15} {'Amount':<12} {'% of Pool':<12}")
    print("-"*70)

    for payout in result.payouts:
        user_short = payout.user_id.replace('user-', '@')
        pct = payout.percentage_of_pool * 100
        print(f"{user_short:<20} {payout.evidence_id:<15} ${payout.total_amount:>8.2f}   {pct:>6.1f}%")

    print("-"*70)
    total_distributed = sum(p.total_amount for p in result.payouts)
    print(f"{'TOTAL DISTRIBUTED':<50} ${total_distributed:>8.2f}")
    print(f"{'PLATFORM FEE':<50} ${result.platform_fee:>8.2f}")
    print(f"{'GRAND TOTAL':<50} ${result.platform_fee + total_distributed:>8.2f}")

    # Detailed breakdown for top contributor
    print(f"\n" + "="*70)
    print("DETAILED BREAKDOWN - TOP CONTRIBUTOR")
    print("="*70)

    top = result.payouts[0]
    print(f"\nUser: {top.user_id}")
    print(f"Evidence ID: {top.evidence_id}")
    print(f"Total Payout: ${top.total_amount:.2f}")
    print(f"Percentage of Pool: {top.percentage_of_pool*100:.1f}%")
    print(f"\nBreakdown:")
    for component, amount in top.breakdown.items():
        print(f"  {component:.<40} ${amount:>8.2f}")

    # Validation
    print(f"\n" + "="*70)
    print("VALIDATION CHECKS")
    print("="*70)

    # Check platform fee
    expected_fee = total_bounty * 0.10
    assert abs(result.platform_fee - expected_fee) < 0.01, "Platform fee should be 10%"
    print("✓ Platform fee correct (10%)")

    # Check total adds up (note: breakthrough bonuses are ON TOP of bounty pool)
    total_check = result.platform_fee + total_distributed
    expected_total = total_bounty + (service.BREAKTHROUGH_BONUS * result.summary["breakthrough_bonuses_paid"])
    assert abs(total_check - expected_total) < 0.01, f"Total should equal bounty + bonuses (got {total_check:.2f}, expected {expected_total:.2f})"
    print(f"✓ Total adds up correctly (${total_check:.2f} = ${total_bounty:.2f} pool + ${service.BREAKTHROUGH_BONUS * result.summary['breakthrough_bonuses_paid']:.2f} bonus + ${result.platform_fee:.2f} fee)")

    # Check BuilderB got breakthrough bonus
    builderb_payout = next(p for p in result.payouts if p.user_id == "user-builderb")
    assert "breakthrough_bonus" in builderb_payout.breakdown, "BuilderB should get breakthrough bonus"
    assert builderb_payout.breakdown["breakthrough_bonus"] == 20.00, "Breakthrough bonus should be $20"
    print("✓ Breakthrough bonus awarded to BuilderB ($20.00)")

    # Check BuilderB is top earner (highest delta clarity + breakthrough bonus)
    assert result.payouts[0].user_id == "user-builderb", "BuilderB should be top earner"
    print(f"✓ Top earner correct: {result.payouts[0].user_id}")

    # Check BuilderD has lowest payout (prediction, earliest but lowest impact)
    assert result.payouts[-1].user_id == "user-builderd", "BuilderD should have lowest payout"
    print(f"✓ Lowest payout correct: {result.payouts[-1].user_id}")

    # Check summary
    assert result.summary["total_contributors"] == 3, "Should have 3 contributors"
    assert result.summary["breakthrough_bonuses_paid"] == 1, "Should have 1 breakthrough bonus"
    print("✓ Summary metrics correct")

    print(f"\n" + "="*70)
    print("ALL PAYOUT TESTS PASSED ✓")
    print("="*70)


def test_equal_contributions():
    """Test payout when all contributions are equal"""
    service = get_payout_service()

    contributions = [
        EvidenceContribution(
            evidence_id="ev1",
            user_id="user-alice",
            evidence_type="news_article",
            delta_clarity=0.1,
            novelty_score=0.5,
            community_votes=10,
            submitted_at="2025-01-01T10:00:00Z",
            triggered_convergence=False
        ),
        EvidenceContribution(
            evidence_id="ev2",
            user_id="user-bob",
            evidence_type="news_article",
            delta_clarity=0.1,
            novelty_score=0.5,
            community_votes=10,
            submitted_at="2025-01-01T10:05:00Z",
            triggered_convergence=False
        ),
    ]

    result = service.calculate_payouts("quest-test", 100.0, contributions)

    # With equal contributions, payouts should be similar (within 20% due to timing)
    payout_amounts = [p.total_amount for p in result.payouts]
    max_payout = max(payout_amounts)
    min_payout = min(payout_amounts)

    # Should be close to equal split (45% each after platform fee)
    # Timing bonus may cause small variance
    assert max_payout - min_payout < 10.0, "Equal contributions should have similar payouts"

    print("\n✓ Equal contributions test passed")


if __name__ == "__main__":
    print("\n" + "="*70)
    print("PAYOUT SERVICE TESTS")
    print("="*70)

    test_equal_contributions()
    test_jimmy_lai_payout_distribution()
