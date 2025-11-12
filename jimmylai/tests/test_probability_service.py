"""
Test Probability Service using Jimmy Lai simulation data

Tests the core truth-seeking algorithm with realistic data
"""

import sys
sys.path.append('/app')

from app.services.probability_service import (
    ProbabilityService,
    Hypothesis,
    Evidence,
    get_probability_service
)


def test_evidence_quality_weights():
    """Test that evidence types have correct quality weights"""
    service = get_probability_service()

    assert service.calculate_evidence_weight("video_primary") == 1.00
    assert service.calculate_evidence_weight("transcript_extraction") == 0.95
    assert service.calculate_evidence_weight("official_statement") == 0.85
    assert service.calculate_evidence_weight("news_article") == 0.70
    assert service.calculate_evidence_weight("prediction") == 0.50
    assert service.calculate_evidence_weight("social_media") == 0.30

    print("✓ Evidence quality weights correct")


def test_shannon_entropy():
    """Test Shannon entropy calculation"""
    service = get_probability_service()

    # Maximum uncertainty (50/50)
    entropy_max = service.calculate_shannon_entropy([0.5, 0.5])
    assert abs(entropy_max - 1.0) < 0.01, f"Expected 1.0, got {entropy_max}"

    # Certainty (100/0)
    entropy_min = service.calculate_shannon_entropy([1.0, 0.0])
    assert abs(entropy_min - 0.0) < 0.01, f"Expected 0.0, got {entropy_min}"

    # Moderate uncertainty (80/20)
    entropy_moderate = service.calculate_shannon_entropy([0.8, 0.2])
    assert 0.7 < entropy_moderate < 0.8, f"Expected ~0.72, got {entropy_moderate}"

    print("✓ Shannon entropy calculations correct")


def test_jimmy_lai_evidence_sequence():
    """
    Test probability updates using Jimmy Lai simulation sequence

    Evidence timeline:
    1. Prediction article (novelty 0.6) → expect small shift
    2. Video footage (novelty 0.8) → expect large shift
    3. Transcript (novelty 0.8) → expect convergence
    """
    service = get_probability_service()

    # Initial state: Binary hypotheses at 50/50
    h1 = Hypothesis(
        id="h1",
        quest_id="q1",
        hypothesis_text="Trump raised Jimmy Lai's case with Xi",
        probability=0.5,
        created_by="system",
        created_at="2025-10-25T00:00:00Z"
    )

    h2 = Hypothesis(
        id="h2",
        quest_id="q1",
        hypothesis_text="Trump did not raise Jimmy Lai's case",
        probability=0.5,
        created_by="system",
        created_at="2025-10-25T00:00:00Z"
    )

    hypotheses = [h1, h2]

    print("\n" + "="*60)
    print("JIMMY LAI EVIDENCE SEQUENCE TEST")
    print("="*60)

    # Evidence 1: Prediction article
    print("\n[Evidence 1] Prediction article (Lianhe Zaobao)")
    ev1 = Evidence(
        id="ev1",
        quest_id="q1",
        hypothesis_id="h1",  # Supports "DID raise"
        evidence_url="https://zaobao.com.sg/article",
        evidence_type="prediction",
        synopsis="Prediction that Trump will raise case",
        novelty_score=0.6,
        submitted_by="alice",
        submitted_at="2025-10-25T06:14:00Z"
    )

    llm_analysis_1 = {
        "novelty_score": 0.6,
        "reasoning": "Predictive article with moderate novelty"
    }

    update1 = service.update_probabilities(hypotheses, ev1, llm_analysis_1)
    hypotheses = update1.updated_hypotheses

    print(f"  Entropy before: {update1.entropy_before:.3f}")
    print(f"  Entropy after:  {update1.entropy_after:.3f}")
    print(f"  Delta clarity:  {update1.delta_clarity:.3f}")
    print(f"  H1 probability: {hypotheses[0].probability*100:.1f}%")
    print(f"  H2 probability: {hypotheses[1].probability*100:.1f}%")
    print(f"  Reasoning: {update1.reasoning}")

    # Should shift towards H1, but not dramatically
    assert hypotheses[0].probability > 0.5, "H1 should increase from prediction"
    assert hypotheses[0].probability < 0.7, "H1 should not jump too high from prediction"

    # Evidence 2: Video footage (supports H2 - NO public mention)
    print("\n[Evidence 2] Video footage (primary source)")
    ev2 = Evidence(
        id="ev2",
        quest_id="q1",
        hypothesis_id="h2",  # Supports "did NOT raise" (publicly)
        evidence_url="https://youtube.com/watch?v=...",
        evidence_type="video_primary",
        synopsis="Full press gaggle video - no mention of Lai",
        novelty_score=0.8,
        submitted_by="bob",
        submitted_at="2025-10-30T18:00:00Z"
    )

    llm_analysis_2 = {
        "novelty_score": 0.8,
        "reasoning": "Primary video source with high novelty"
    }

    update2 = service.update_probabilities(hypotheses, ev2, llm_analysis_2)
    hypotheses = update2.updated_hypotheses

    print(f"  Entropy before: {update2.entropy_before:.3f}")
    print(f"  Entropy after:  {update2.entropy_after:.3f}")
    print(f"  Delta clarity:  {update2.delta_clarity:.3f}")
    print(f"  H1 probability: {hypotheses[0].probability*100:.1f}%")
    print(f"  H2 probability: {hypotheses[1].probability*100:.1f}%")
    print(f"  Reasoning: {update2.reasoning}")

    # Video is high quality, should shift significantly towards H2
    assert hypotheses[1].probability > hypotheses[0].probability, "H2 should dominate after video"
    assert update2.delta_clarity > update1.delta_clarity, "Video should have higher clarity gain"

    # Evidence 3: Transcript (corroborates video)
    print("\n[Evidence 3] Transcript extraction")
    ev3 = Evidence(
        id="ev3",
        quest_id="q1",
        hypothesis_id="h2",  # Also supports "did NOT raise"
        evidence_url="https://artifacts/transcript.md",
        evidence_type="transcript_extraction",
        synopsis="Transcript confirms no mention of Lai",
        novelty_score=0.8,
        submitted_by="charlie",
        submitted_at="2025-10-30T18:30:00Z"
    )

    llm_analysis_3 = {
        "novelty_score": 0.8,
        "reasoning": "High-quality transcript corroborating video"
    }

    update3 = service.update_probabilities(hypotheses, ev3, llm_analysis_3)
    hypotheses = update3.updated_hypotheses

    print(f"  Entropy before: {update3.entropy_before:.3f}")
    print(f"  Entropy after:  {update3.entropy_after:.3f}")
    print(f"  Delta clarity:  {update3.delta_clarity:.3f}")
    print(f"  H1 probability: {hypotheses[0].probability*100:.1f}%")
    print(f"  H2 probability: {hypotheses[1].probability*100:.1f}%")
    print(f"  Reasoning: {update3.reasoning}")

    # Check convergence
    converged, winner_id = service.check_convergence(hypotheses)
    if converged:
        winner = next(h for h in hypotheses if h.id == winner_id)
        print(f"\n  🏆 CONVERGENCE! Winner: {winner.hypothesis_text}")
        print(f"  Confidence: {winner.probability*100:.1f}%")

    # Should approach or reach 80% threshold
    assert hypotheses[1].probability >= 0.75, f"H2 should be high after transcript (got {hypotheses[1].probability*100:.1f}%)"
    assert update3.entropy_after < 0.6, "Entropy should be low after convergence"

    print("\n" + "="*60)
    print("✓ Jimmy Lai evidence sequence test PASSED")
    print("="*60)


def test_convergence_detection():
    """Test that convergence is detected at 80% threshold"""
    service = get_probability_service()

    # Just below threshold
    h1 = Hypothesis(
        id="h1",
        quest_id="q1",
        hypothesis_text="Test hypothesis 1",
        probability=0.79,
        created_by="system",
        created_at="2025-01-01T00:00:00Z"
    )

    h2 = Hypothesis(
        id="h2",
        quest_id="q1",
        hypothesis_text="Test hypothesis 2",
        probability=0.21,
        created_by="system",
        created_at="2025-01-01T00:00:00Z"
    )

    converged, winner = service.check_convergence([h1, h2])
    assert not converged, "Should not converge at 79%"

    # At threshold
    h1.probability = 0.80
    h2.probability = 0.20
    converged, winner = service.check_convergence([h1, h2])
    assert converged, "Should converge at 80%"
    assert winner == "h1", "Winner should be h1"

    print("✓ Convergence detection correct")


if __name__ == "__main__":
    print("\n" + "="*60)
    print("PROBABILITY SERVICE TESTS")
    print("="*60)

    test_evidence_quality_weights()
    test_shannon_entropy()
    test_convergence_detection()
    test_jimmy_lai_evidence_sequence()

    print("\n" + "="*60)
    print("ALL TESTS PASSED ✓")
    print("="*60)
