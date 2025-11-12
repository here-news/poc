"""
Truth Market Dynamics - Entropy & Tension Calculations
-------------------------------------------------------
Computes dual metrics for investigation progress:

1. **Entropy (H)**: Measures uncertainty/clarity across scoped Asks
   H = mean(1 - |L_i|) where L_i ∈ [-1, 1] is the belief for Ask_i

   - H → 1: High uncertainty (nobody knows)
   - H → 0: High clarity (strong consensus)

2. **Tension (Θ)**: Measures community urgency/curiosity
   Θ = w1*α + w2*β + w3*γ - w4*δ

   Where:
   - α (backdrop): Prediction/expectation priming
   - β (trigger): Cross-lingual social media spread
   - γ (semantic_gap): Conflicting claims
   - δ (evidence_density): Primary source availability

Phase Classification:
- IGNITION: Θ rising, H high (curiosity building)
- STORM: Θ peak, H high (debate without evidence)
- BREAKTHROUGH: Θ high, H dropping (evidence arriving)
- RESOLUTION: Θ falling, H low (consensus reached)
- DECAY: Θ low, H low (investigation complete)
"""

from datetime import datetime
from typing import List, Tuple, Literal
from pydantic import BaseModel


class DynamicsSnapshot(BaseModel):
    """Point-in-time measurement of investigation dynamics"""
    timestamp: datetime
    entropy: float  # H ∈ [0, 1]
    tension: float  # Θ ∈ [0, 100]
    phase: Literal["ignition", "storm", "breakthrough", "resolution", "decay"]

    # Component breakdown (for debugging/transparency)
    clarity_per_scope: dict  # {scope: L_i value}
    tension_components: dict  # {α, β, γ, δ}


def calculate_entropy(scope_beliefs: dict) -> float:
    """
    Calculate entropy from scope-specific belief values.

    Args:
        scope_beliefs: {scope: L_i} where L_i ∈ [-1, 1]
                       -1 = strongly false
                        0 = unknown
                       +1 = strongly true

    Returns:
        H ∈ [0, 1] where 0 = perfect clarity, 1 = total uncertainty
    """
    if not scope_beliefs:
        return 1.0  # No beliefs = maximum uncertainty

    uncertainties = [1 - abs(belief) for belief in scope_beliefs.values()]
    return sum(uncertainties) / len(uncertainties)


def calculate_tension(
    has_prediction: bool,
    social_trigger_count: int,
    conflicting_claims: int,
    primary_sources: int,
    weights: Tuple[float, float, float, float] = (0.15, 0.25, 0.35, 0.25)
) -> Tuple[float, dict]:
    """
    Calculate tension from investigation characteristics.

    Args:
        has_prediction: Whether there's a backdrop prediction (α)
        social_trigger_count: Cross-lingual social posts (β)
        conflicting_claims: Number of contradictory claims (γ)
        primary_sources: Number of primary evidence pieces (δ)
        weights: (w1, w2, w3, w4) for α, β, γ, δ

    Returns:
        (tension, components) where tension ∈ [0, 100] and components shows breakdown
    """
    w1, w2, w3, w4 = weights

    # Normalize components to [0, 1] scale
    α = 1.0 if has_prediction else 0.0
    β = min(social_trigger_count / 5.0, 1.0)  # Saturates at 5 posts
    γ = min(conflicting_claims / 3.0, 1.0)    # Saturates at 3 conflicts
    δ = min(primary_sources / 3.0, 1.0)       # Saturates at 3 primary sources

    # Tension formula: excitation - resolution
    tension = (w1 * α + w2 * β + w3 * γ - w4 * δ) * 100
    tension = max(0, min(100, tension))  # Clamp to [0, 100]

    components = {
        "backdrop_α": α,
        "social_trigger_β": β,
        "semantic_gap_γ": γ,
        "evidence_density_δ": δ,
        "weighted_excitation": (w1 * α + w2 * β + w3 * γ),
        "weighted_resolution": (w4 * δ)
    }

    return tension, components


def classify_phase(entropy: float, tension: float, h_trend: float, θ_trend: float) -> str:
    """
    Classify investigation phase based on entropy/tension dynamics.

    Args:
        entropy: Current H value
        tension: Current Θ value
        h_trend: Change in H (negative = decreasing uncertainty)
        θ_trend: Change in Θ (positive = increasing urgency)

    Returns:
        Phase name: "ignition" | "storm" | "breakthrough" | "resolution" | "decay"
    """
    # IGNITION: Building curiosity, still uncertain
    if entropy > 0.6 and θ_trend > 0 and tension > 30:
        return "ignition"

    # STORM: Peak tension, high uncertainty, no resolution yet
    if entropy > 0.5 and tension > 60:
        return "storm"

    # BREAKTHROUGH: Evidence arriving, clarity increasing
    if h_trend < -0.1 and tension > 40:
        return "breakthrough"

    # RESOLUTION: Clarity achieved, tension dropping
    if entropy < 0.4 and tension < 50:
        return "resolution"

    # DECAY: Investigation complete, low activity
    if entropy < 0.3 and tension < 30:
        return "decay"

    # Default: treat as early ignition
    return "ignition"


def compute_ask_dynamics(
    answers: List,
    sources: List,
    resolutions: List,
    bounty_contributions: List,
    timestamp: datetime = None
) -> DynamicsSnapshot:
    """
    Compute current dynamics snapshot for an Ask.

    This is the main entry point used by the API endpoint.
    """
    timestamp = timestamp or datetime.utcnow()

    # Step 1: Calculate entropy from scope resolutions
    scope_beliefs = {}
    for res in resolutions:
        if res.status == "resolved":
            # Map clarity to belief: 0% → 0 (unknown), 100% → ±1 (certain)
            # Assume resolved = true, pending = unknown
            scope_beliefs[res.scope] = res.clarity / 100.0
        else:
            scope_beliefs[res.scope] = 0.0  # Pending = unknown

    entropy = calculate_entropy(scope_beliefs)

    # Step 2: Calculate tension from evidence characteristics
    has_prediction = any(
        'prediction' in (s.title or '').lower() or 'expect' in (s.title or '').lower()
        for s in sources
    )

    social_trigger_count = sum(
        1 for s in sources if s.type == "secondary" and s.modality == "social_post"
    )

    # Count conflicting claims (answers with negative clarity_gain)
    conflicting_claims = sum(1 for a in answers if a.clarity_gain < 0)

    # Count primary sources
    primary_sources = sum(1 for s in sources if s.type == "primary")

    tension, tension_components = calculate_tension(
        has_prediction=has_prediction,
        social_trigger_count=social_trigger_count,
        conflicting_claims=conflicting_claims,
        primary_sources=primary_sources
    )

    # Step 3: Classify phase (simplified - no trend data in this call)
    # In a real implementation, we'd compare with previous snapshots
    phase = classify_phase(
        entropy=entropy,
        tension=tension,
        h_trend=0.0,  # Would need historical data
        θ_trend=0.0   # Would need historical data
    )

    return DynamicsSnapshot(
        timestamp=timestamp,
        entropy=entropy,
        tension=tension,
        phase=phase,
        clarity_per_scope=scope_beliefs,
        tension_components=tension_components
    )


def get_phase_emoji(phase: str) -> str:
    """Get emoji representation of phase"""
    return {
        "ignition": "🌱",
        "storm": "🌪️",
        "breakthrough": "💡",
        "resolution": "✅",
        "decay": "😴"
    }.get(phase, "❓")


def get_phase_label(phase: str) -> str:
    """Get human-readable phase label"""
    return {
        "ignition": "Ignition",
        "storm": "Evidence Storm",
        "breakthrough": "Breakthrough",
        "resolution": "Resolution",
        "decay": "Settled"
    }.get(phase, "Unknown")


def get_tension_level(tension: float) -> Tuple[str, str]:
    """
    Get tension level label and emoji.

    Returns:
        (level, emoji) e.g., ("High", "🔥")
    """
    if tension >= 75:
        return ("Very High", "🔥🔥🔥")
    elif tension >= 60:
        return ("High", "🔥🔥")
    elif tension >= 40:
        return ("Medium", "🔥")
    elif tension >= 20:
        return ("Low", "💨")
    else:
        return ("Very Low", "😴")
