"""
Receipt generation - resolution records for completed Asks.
Based on the case study Receipt concept (section 5).
"""
from datetime import datetime
from typing import List, Tuple
from .models import Ask, Receipt, Builder, ClarityEvent, ScopeResolution


def calculate_overall_clarity(ask: Ask) -> int:
    """
    Calculate overall clarity from scope resolutions.
    Resolved scopes weighted more than pending.
    """
    if not ask.resolutions:
        # Fallback: cap cumulative answer gains at 100
        total = sum(a.clarity_gain for a in ask.answers)
        return min(total, 100)

    total_weight = 0
    weighted_clarity = 0

    for resolution in ask.resolutions:
        # Resolved scopes count full, pending count half
        weight = 1.0 if resolution.status == 'resolved' else 0.5
        weighted_clarity += resolution.clarity * weight
        total_weight += weight

    return int(weighted_clarity / total_weight) if total_weight > 0 else 0


def calculate_payout_distribution(
    ask: Ask, builders: List[Builder], reserve_pct: float = 0.10
) -> List[Tuple[str, int, float]]:
    """
    Calculate payout distribution based on ΔClarity contributions.

    Args:
        ask: The resolved Ask
        builders: List of builders who contributed
        reserve_pct: Percentage to keep in treasury reserve (default 10%)

    Returns:
        List of (builder_id, clarity_gain, payout) tuples
    """
    total_bounty = ask.bounty
    distributable = total_bounty * (1 - reserve_pct)

    # Calculate total clarity contributed
    total_clarity = sum(answer.clarity_gain for answer in ask.answers)

    if total_clarity == 0:
        return []

    # Proportional distribution based on ΔClarity
    payouts = []
    for answer in ask.answers:
        if answer.clarity_gain > 0:
            payout = (answer.clarity_gain / total_clarity) * distributable
            payouts.append((answer.builder_id, answer.clarity_gain, payout))

    return sorted(payouts, key=lambda x: x[1], reverse=True)


def generate_receipt(ask: Ask, builders: List[Builder]) -> Receipt:
    """
    Generate a resolution receipt for a resolved Ask.

    Args:
        ask: The resolved Ask
        builders: List of all builders (to look up info)

    Returns:
        Receipt object with full resolution record
    """
    # Calculate payouts
    payouts = calculate_payout_distribution(ask, builders)

    # Build contributions list
    builder_contributions = []
    for builder_id, clarity_gain, payout in payouts:
        builder = next((b for b in builders if b.id == builder_id), None)
        builder_contributions.append(
            {
                "builder_id": builder_id,
                "builder_name": builder.username if builder else "anonymous",
                "clarity_gain": clarity_gain,
                "payout": payout,
            }
        )

    # Collect source IDs
    source_ids = []
    for answer in ask.answers:
        source_ids.extend(answer.source_ids)
    source_ids = list(set(source_ids))  # Deduplicate

    # Create receipt
    receipt = Receipt(
        ask_id=ask.id,
        generated_at=datetime.utcnow(),
        final_clarity=ask.clarity,
        total_bounty=ask.bounty,
        builder_contributions=builder_contributions,
        clarity_trajectory=ask.clarity_events,
        source_ids=source_ids,
        resolutions=ask.resolutions,
    )

    return receipt


def apply_payouts(ask: Ask, builders: List[Builder], db) -> List[Tuple[str, float]]:
    """
    Apply payouts to builders and update their records.

    Args:
        ask: The resolved Ask
        builders: List of all builders
        db: Database instance

    Returns:
        List of (builder_id, payout) tuples
    """
    payouts = calculate_payout_distribution(ask, builders)

    applied = []
    for builder_id, clarity_gain, payout in payouts:
        builder = db.get_builder(builder_id)
        if builder:
            builder.credits += payout
            builder.total_clarity_contributed += clarity_gain
            db.update_builder(builder)
            applied.append((builder_id, payout))

            # Update answer payout in ask
            for answer in ask.answers:
                if answer.builder_id == builder_id:
                    answer.payout = payout

    return applied
