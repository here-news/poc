# Epistemological Reputation & Value Attribution Framework

## Problem Statement

The current system treats all evidence and contributors equally, without accounting for:
1. **Evidence Quality**: Reuters vs random social media posts
2. **Misinformation**: Chinese X post with Grok AI hallucination
3. **Source Reliability**: Professional journalists vs anonymous users
4. **Retroactive Truth**: What if Reuters or Owen Jensen proved wrong later?
5. **Axiological Surface**: Which evidence actually contributed to truth discovery?
6. **Fair Compensation**: Bounty should reward truth-seekers, not noise generators

## Core Concepts

### 1. Evidence Quality Dimensions

Each evidence submission is scored across multiple dimensions:

```python
class EvidenceQuality:
    # Intrinsic Quality (0.0 - 1.0)
    source_credibility: float      # Reuters=0.9, random X user=0.3
    verification_level: float      # Primary source=1.0, hearsay=0.3
    evidence_type_weight: float    # Video=0.9, social_media=0.4

    # Temporal Relevance (0.0 - 1.0)
    temporal_proximity: float      # How close to the event?
    temporal_context: str          # "pre_event", "during_event", "post_event"

    # Epistemic Contribution (-1.0 to 1.0)
    novelty_score: float           # How new is this information?
    clarity_delta: float           # Did this increase or decrease clarity?
    contradiction_penalty: float   # Contradicts established facts?

    # Community Verification (0.0 - 1.0)
    community_trust_score: float   # Based on votes/challenges
    expert_endorsements: int       # Domain experts who validated
    challenge_rate: float          # % of community who challenged it
```

### 2. Source Credibility Tiers

```python
SOURCE_CREDIBILITY = {
    # Tier 1: Institutional & Primary (0.85-1.0)
    "government_official": 0.95,
    "wire_service": 0.90,          # Reuters, AP, AFP
    "major_newspaper": 0.85,        # NYT, WaPo, WSJ
    "verified_video": 0.90,         # Primary video evidence

    # Tier 2: Professional (0.65-0.84)
    "credentialed_journalist": 0.75,  # Owen Jensen
    "subject_expert": 0.80,
    "regional_newspaper": 0.70,

    # Tier 3: Secondary (0.40-0.64)
    "verified_social_media": 0.55,
    "transcript_extraction": 0.60,
    "analysis_piece": 0.50,

    # Tier 4: Unverified (0.1-0.39)
    "anonymous_social_media": 0.25,
    "ai_generated_content": 0.15,    # Grok AI response
    "unverified_claim": 0.20,
}
```

### 3. Misinformation Detection & Flagging

```python
class MisinformationFlag:
    flagged_by: str                # user_id or "system"
    flag_type: str                 # "unverified", "contradicted", "ai_hallucination"
    flag_reason: str
    flagged_at: datetime

    # Resolution
    resolution_status: str         # "pending", "confirmed_misinfo", "cleared"
    resolved_by: str               # "community_vote", "expert", "later_evidence"
    resolved_at: datetime

    # Impact
    evidence_multiplier: float     # 0.0 = completely excluded from axiological surface
    bounty_eligibility: bool       # Can submitter still get bounty?
```

### 4. Axiological Surface (Truth Contribution Map)

The **axiological surface** maps which evidence actually contributed to discovering truth:

```python
class AxiologicalContribution:
    evidence_id: str

    # Contribution Metrics
    truth_alignment_score: float   # How aligned with final winning hypothesis?
    path_criticality: float        # Was this on the critical path to truth?
    redundancy_penalty: float      # Did it just repeat known info?

    # Calculated Value
    epistemic_value: float         # Net contribution to truth discovery

    # Formula:
    # epistemic_value = (
    #     source_credibility *
    #     verification_level *
    #     novelty_score *
    #     abs(clarity_delta) *
    #     truth_alignment_score *
    #     (1 - redundancy_penalty) *
    #     (1 - misinformation_multiplier)
    # )
```

### 5. User Reputation System

```python
class UserReputation:
    user_id: str

    # Track Record
    total_submissions: int
    verified_accurate: int
    flagged_misinfo: int

    # Scores
    accuracy_rate: float           # verified_accurate / total_submissions
    credibility_score: float       # Weighted by evidence quality
    expertise_domains: List[str]   # ["politics", "china", "journalism"]

    # Reputation Tier
    tier: str                      # "novice", "contributor", "trusted", "expert"
    tier_multiplier: float         # Affects bounty share

    # Retroactive Adjustment
    reputation_history: List[ReputationEvent]
```

### 6. Bounty Distribution Algorithm

```python
def calculate_bounty_distribution(quest: Quest) -> Dict[str, float]:
    """
    Distribute bounty based on epistemic value contribution
    """
    total_bounty = quest.total_bounty * (1 - quest.platform_fee_percent / 100)

    # Step 1: Calculate epistemic value for each evidence
    evidence_values = []
    for evidence in quest.evidence:
        # Skip misinformation
        if evidence.is_flagged_misinfo:
            continue

        # Calculate contribution
        value = calculate_epistemic_value(evidence, quest.winning_hypothesis)

        # Apply user reputation multiplier
        user_rep = get_user_reputation(evidence.submitted_by)
        value *= user_rep.tier_multiplier

        evidence_values.append({
            "evidence_id": evidence.id,
            "user_id": evidence.submitted_by,
            "value": value
        })

    # Step 2: Normalize to sum to 1.0
    total_value = sum(ev["value"] for ev in evidence_values)

    # Step 3: Distribute proportionally
    payouts = {}
    for ev in evidence_values:
        share = ev["value"] / total_value
        payout = total_bounty * share

        if ev["user_id"] in payouts:
            payouts[ev["user_id"]] += payout
        else:
            payouts[ev["user_id"]] = payout

    return payouts
```

### 7. Retroactive Reputation Adjustment

When evidence is later proven wrong (e.g., Owen Jensen's anonymous source contradicted):

```python
def retroactive_adjustment(evidence_id: str, new_status: str):
    """
    Adjust reputation when evidence quality changes retroactively
    """
    evidence = get_evidence(evidence_id)
    submitter = get_user_reputation(evidence.submitted_by)

    # Record the event
    event = ReputationEvent(
        user_id=evidence.submitted_by,
        evidence_id=evidence_id,
        event_type="retroactive_downgrade",
        old_quality=evidence.quality_score,
        new_quality=calculate_new_quality(evidence, new_status),
        timestamp=datetime.utcnow()
    )

    # Adjust user reputation
    submitter.credibility_score = recalculate_credibility(submitter)

    # Mark evidence
    evidence.quality_override = new_status
    evidence.quality_override_reason = "Later evidence contradicted"

    # Recalculate axiological surface for the quest
    quest = get_quest(evidence.quest_id)
    recalculate_axiological_surface(quest)
```

## Implementation Roadmap

### Phase 1: Database Schema (Week 1)

```sql
-- Evidence quality tracking
ALTER TABLE evidence_submissions ADD COLUMN source_credibility REAL DEFAULT 0.5;
ALTER TABLE evidence_submissions ADD COLUMN verification_level REAL DEFAULT 0.5;
ALTER TABLE evidence_submissions ADD COLUMN evidence_type_weight REAL DEFAULT 0.5;
ALTER TABLE evidence_submissions ADD COLUMN temporal_proximity REAL DEFAULT 0.5;
ALTER TABLE evidence_submissions ADD COLUMN epistemic_value REAL DEFAULT 0.0;

-- Misinformation flagging
CREATE TABLE evidence_flags (
    id TEXT PRIMARY KEY,
    evidence_id TEXT NOT NULL,
    flagged_by TEXT NOT NULL,
    flag_type TEXT NOT NULL,
    flag_reason TEXT,
    flagged_at TEXT NOT NULL,
    resolution_status TEXT DEFAULT 'pending',
    resolved_by TEXT,
    resolved_at TEXT,
    FOREIGN KEY (evidence_id) REFERENCES evidence_submissions(id)
);

-- User reputation
CREATE TABLE user_reputation (
    user_id TEXT PRIMARY KEY,
    total_submissions INTEGER DEFAULT 0,
    verified_accurate INTEGER DEFAULT 0,
    flagged_misinfo INTEGER DEFAULT 0,
    accuracy_rate REAL DEFAULT 1.0,
    credibility_score REAL DEFAULT 0.5,
    tier TEXT DEFAULT 'novice',
    tier_multiplier REAL DEFAULT 1.0,
    last_updated TEXT
);

-- Reputation history
CREATE TABLE reputation_events (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    evidence_id TEXT,
    event_type TEXT NOT NULL,
    old_value REAL,
    new_value REAL,
    reason TEXT,
    timestamp TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES user_reputation(user_id)
);

-- Bounty distribution
CREATE TABLE bounty_payouts (
    id TEXT PRIMARY KEY,
    quest_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    evidence_ids TEXT,  -- JSON array
    epistemic_value REAL NOT NULL,
    payout_amount REAL NOT NULL,
    calculated_at TEXT NOT NULL,
    paid_at TEXT,
    FOREIGN KEY (quest_id) REFERENCES quests(id)
);
```

### Phase 2: LLM Integration (Week 2)

Enhance LLM analyzer to output:
- Source credibility assessment
- Misinformation risk score
- Truth alignment score
- Recommended quality multipliers

### Phase 3: Community Verification (Week 3)

- Evidence challenge system
- Expert validation workflow
- Community voting on flags

### Phase 4: Bounty Calculation (Week 4)

- Implement epistemic value calculator
- Build payout distribution algorithm
- Create transparency dashboard

## Example: Jimmy Lai Quest

### Evidence #4: Chinese X Post with Grok AI

```python
{
    "evidence_id": "ev-xxx-004",
    "source_type": "social_media",
    "source_credibility": 0.25,  # anonymous social media
    "verification_level": 0.1,    # AI hallucination, no primary source
    "evidence_type_weight": 0.2,  # unverified social post

    # Flagged as misinformation
    "flags": [{
        "flag_type": "ai_hallucination",
        "flag_reason": "Grok AI responded without video evidence, known to hallucinate",
        "resolution_status": "confirmed_misinfo",
        "evidence_multiplier": 0.0  # EXCLUDED from axiological surface
    }],

    # Final epistemic value
    "epistemic_value": 0.0,  # Does NOT contribute to bounty pool
}
```

### Evidence #5: Video Analysis (user-buildera)

```python
{
    "evidence_id": "ev-xxx-005",
    "source_type": "video_primary",
    "source_credibility": 0.90,   # verified video
    "verification_level": 1.0,     # primary source
    "evidence_type_weight": 0.9,   # video evidence
    "novelty_score": 0.80,
    "clarity_delta": 0.206,        # HIGH clarity increase
    "truth_alignment_score": 0.75, # Partially aligned (showed public segment only)

    # Final epistemic value
    "epistemic_value": 0.90 * 1.0 * 0.9 * 0.80 * 0.206 * 0.75 = 0.101
}
```

### Evidence #9: Reuters Confirmation

```python
{
    "evidence_id": "ev-xxx-009",
    "source_type": "news_article",
    "source_credibility": 0.90,   # wire service
    "verification_level": 0.95,    # 3 independent sources
    "evidence_type_weight": 0.85,  # investigative journalism
    "novelty_score": 0.80,
    "clarity_delta": 0.200,
    "truth_alignment_score": 1.0,  # Perfect alignment with winner

    # Final epistemic value
    "epistemic_value": 0.90 * 0.95 * 0.85 * 0.80 * 0.200 * 1.0 = 0.116
    # HIGHEST contribution → LARGEST bounty share
}
```

### Bounty Distribution ($10,423 total, 10% platform fee = $9,381 to distribute)

```python
{
    "user-builderc": $0,        # Submitted misinformation (Evidence #4)
    "user-buildera": $1,875,    # Video analysis (high epistemic value)
    "user-builderb": $1,250,    # Transcript extraction (corroboration)
    "user-owen": $1,500,        # First credible private confirmation
    "user-sebastian": $1,100,   # Family confirmation (strong signal)
    "user-buildera": $3,656,    # Reuters article (HIGHEST value)
    # ... others proportionally
}
```

## Key Principles

1. **Truth Rewards Truth**: Those who contributed most to discovering truth get largest rewards
2. **Misinformation Penalty**: Zero payout for confirmed misinformation
3. **Quality Over Quantity**: One Reuters article > ten unverified tweets
4. **Retroactive Justice**: If sources prove unreliable later, reputation adjusts
5. **Transparency**: Full axiological surface visible to all participants
6. **Expertise Compounds**: Consistent accuracy builds reputation multiplier

## Next Steps

1. Implement database schema changes
2. Create `EpistemicValueCalculator` service
3. Build misinformation flagging UI
4. Integrate with bounty payout system
5. Create transparency dashboard showing axiological surface
