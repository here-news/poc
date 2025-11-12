# Bounty Distribution System Design

## Current State

### What We Have
1. **Epistemic Value Calculator** (`epistemic_value_calculator.py`)
   - Calculates epistemic value for each piece of evidence
   - Factors: source credibility, verification level, novelty, clarity, truth alignment, curator reputation
   - Currently calculates values but doesn't distribute payments

2. **Database Tables**
   - `evidence_submissions`: Has `epistemic_value`, `estimated_payout`, `actual_payout`, `paid_out` fields
   - `contributor_rewards`: Tracks user rewards but currently unused
   - `curator_reputation`: Tracks curator accuracy over time

3. **Bounty Pool**
   - `quests.initial_bounty` and `quests.total_bounty` fields
   - Community can add to bounty pool (simulated with `+$20.0 added to bounty pool`)
   - No actual distribution mechanism yet

### What We Need
1. **Payment distribution formula** based on epistemic value
2. **Receipt/ledger system** for transparency
3. **Recursive value attribution** to original creators, publishers, curators
4. **Support for multiple stakeholder types** (users, institutions, external sources)
5. **Clear tranche/payment events** (when does payment happen?)

---

## Design Principles (Axiology & Epistemic Foundations)

### 1. **Truth-Alignment Principle**
**Payment should flow to those who helped discover truth, proportional to their contribution.**

- Evidence aligned with winning hypothesis gets more rewards
- Evidence that pushed toward correct answer early gets bonuses
- Misinformation gets zero (or negative) rewards

### 2. **Methodological Quality Principle**
**Reward the methodology, not just the outcome.**

- High-quality evidence from losing hypothesis still gets rewarded (it was good epistemic practice)
- Methodology-based source weights (not brand-based)
- Curator reputation matters (track record of quality)

### 3. **Recursive Value Principle**
**Credit flows backward through the value chain.**

Value Chain: `Original Creator → Publisher → Curator → Validators`

Example:
- Reuters investigative team (created the evidence)
- Reuters.com (published it)
- `user-buildera` (found and shared it to Truth Market)
- Community (validated its quality)

### 4. **Temporal Fairness Principle**
**Early high-quality contributions deserve bonuses.**

- First to submit high-value evidence gets early-bird bonus
- Evidence submitted before convergence is more valuable than after
- But post-convergence evidence that causes un-convergence also valuable!

### 5. **Transparency Principle**
**Every payment must have a clear receipt showing the calculation.**

- Show epistemic value formula breakdown
- Show percentage of total bounty
- Show value attribution split (creator/publisher/curator/validators)
- Publicly visible ledger

---

## Payment Distribution Formula

### Core Formula

```python
total_available_bounty = quest.total_bounty * (1 - platform_fee_percent)

for each evidence in quest:
    # 1. Calculate evidence's share of total bounty
    evidence_bounty = (evidence.epistemic_value / sum_all_epistemic_values) * total_available_bounty

    # 2. Apply temporal bonus (early birds get extra)
    if evidence.submitted_before_first_convergence:
        evidence_bounty *= 1.2  # 20% bonus for early contributors

    # 3. Split among value chain participants
    splits = calculate_value_attribution_splits(evidence)

    # 4. Distribute to each participant
    for participant in splits:
        participant.payout = evidence_bounty * participant.share_percent
```

### Epistemic Value (Already Calculated)

```python
epistemic_value = (
    source_credibility *
    verification_level *
    evidence_type_weight *
    novelty_score *
    max(0.1, 1.0 + clarity_delta) *
    truth_alignment_score *
    curator_reputation *
    (1 - redundancy_penalty) *
    (1 - misinformation_multiplier)
)
```

**Key Insight**: This gives us a score from 0.0 to 1.0 for each piece of evidence. Higher epistemic value = larger share of bounty.

---

## Value Attribution Splits

### Evidence Type Classifications

#### Type A: Primary/Official Sources (e.g., Senate Letter, Court Documents)
**Split**:
- 35% → Original creator (Senate, court)
- 10% → Publisher (senate.gov, court clerk)
- 40% → Curator (user who found and shared)
- 10% → Community validators
- 5% → Platform fee (if not already deducted)

**Rationale**: Original creator did the real work (writing the letter), curator found it, validators confirmed quality.

#### Type B: Investigative Journalism (e.g., Reuters multi-source article)
**Split**:
- 40% → News organization (Reuters)
- 0% → Publisher (same as creator)
- 45% → Curator
- 10% → Validators
- 5% → Platform

**Rationale**: High-quality journalism deserves largest share, but curator who brought it to community also deserves significant reward.

#### Type C: Primary Evidence with User Analysis (e.g., Video analysis)
**Split**:
- 10% → Original video creator (if identifiable, otherwise 0%)
- 0% → Platform (YouTube gets nothing)
- 75% → Analyst/curator (user who did the analysis)
- 10% → Validators
- 5% → Platform

**Rationale**: User created original epistemic value through analysis, not just sharing.

#### Type D: User-Generated Original Research (e.g., Transcript extraction)
**Split**:
- 0% → No external creator
- 0% → No external publisher
- 85% → Creator/curator (same person)
- 10% → Validators
- 5% → Platform

**Rationale**: User did all the work, deserves vast majority.

#### Type E: Low-Quality Sources (e.g., Social media, AI-generated)
**Split**:
- 0% → Original poster
- 0% → Platform (X/Twitter gets nothing)
- 85% → Curator (if flagging misinfo correctly)
- 10% → Validators
- 5% → Platform

**Rationale**: If curator correctly flags low-quality source, they get rewarded for epistemic hygiene.

---

## Payment Tranches (When Does Payment Happen?)

### Tranche 1: Convergence Reached (80%+ threshold)
**Trigger**: Quest reaches convergence for the first time

**What Happens**:
1. Calculate epistemic values for all evidence submitted so far
2. Distribute 60% of bounty pool to contributors
3. Hold 40% in reserve (in case of un-convergence or new evidence)

**Rationale**: Don't pay out everything immediately - truth might shift!

### Tranche 2: Convergence Confirmed (7 days after initial convergence, no un-convergence)
**Trigger**: 7 days pass with convergence maintained

**What Happens**:
1. Recalculate epistemic values (includes any new evidence)
2. Distribute remaining 35% of bounty
3. Hold final 5% for late validators

**Rationale**: Give time for contradictory evidence to emerge. If no un-convergence in a week, truth is likely stable.

### Tranche 3: Quest Closed (30 days after initial convergence)
**Trigger**: 30 days pass, quest auto-closes

**What Happens**:
1. Final distribution of remaining 5%
2. Close quest to new evidence
3. Generate final receipts for all contributors
4. Archive quest

**Rationale**: Eventually quest must close. 30 days gives ample time for challenges.

### Special Case: Un-Convergence Event
**Trigger**: New evidence pushes probabilities back below 80% threshold

**What Happens**:
1. **DO NOT** reclaim already-paid funds from Tranche 1
2. Recalculate epistemic values including new evidence
3. When re-convergence happens, distribute remaining pool
4. Evidence that caused un-convergence may get bonus for "challenging consensus"

**Rationale**: Can't take back already-paid money, but can reward those who challenged weak consensus.

---

## Database Schema Enhancements

### New Table: `bounty_tranches`
Tracks payment events for transparency.

```sql
CREATE TABLE bounty_tranches (
    id TEXT PRIMARY KEY,
    quest_id TEXT NOT NULL,

    tranche_number INTEGER NOT NULL,  -- 1, 2, 3
    tranche_type TEXT NOT NULL,       -- 'convergence', 'confirmed', 'closed', 'unconvergence'

    trigger_event TEXT NOT NULL,      -- What caused this tranche?
    trigger_timestamp TEXT NOT NULL,

    amount_distributed REAL NOT NULL,
    amount_remaining REAL NOT NULL,

    recipient_count INTEGER NOT NULL,
    evidence_count INTEGER NOT NULL,

    calculation_method TEXT,  -- JSON with formula details
    receipts_generated TEXT,  -- JSON array of receipt IDs

    created_at TEXT DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (quest_id) REFERENCES quests(id)
);
```

### New Table: `payment_receipts`
Individual payment records for each participant.

```sql
CREATE TABLE payment_receipts (
    id TEXT PRIMARY KEY,
    quest_id TEXT NOT NULL,
    tranche_id TEXT NOT NULL,
    evidence_id TEXT,  -- NULL for community-wide payments

    recipient_id TEXT NOT NULL,  -- User ID or external entity ID
    recipient_type TEXT NOT NULL,  -- 'user', 'institution', 'external_creator', 'community_pool'

    role TEXT NOT NULL,  -- 'curator', 'original_creator', 'publisher', 'validator'

    base_amount REAL NOT NULL,
    bonus_amount REAL DEFAULT 0.0,
    penalty_amount REAL DEFAULT 0.0,
    total_amount REAL NOT NULL,

    epistemic_value REAL,  -- For evidence-based payments
    share_percent REAL,    -- Percentage of evidence bounty

    calculation_breakdown TEXT,  -- JSON with detailed formula

    payment_status TEXT DEFAULT 'pending',  -- 'pending', 'paid', 'held_escrow', 'credited_only'
    paid_at TEXT,
    payment_method TEXT,  -- 'platform_balance', 'escrow', 'external_claim'

    notes TEXT,

    created_at TEXT DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (quest_id) REFERENCES quests(id),
    FOREIGN KEY (tranche_id) REFERENCES bounty_tranches(id),
    FOREIGN KEY (evidence_id) REFERENCES evidence_submissions(id)
);
```

### Enhanced Table: `evidence_submissions`
Add value attribution metadata.

```sql
ALTER TABLE evidence_submissions
ADD COLUMN value_attribution TEXT;  -- JSON

-- Value attribution structure:
{
    "attribution_type": "investigative_journalism",  -- Type B
    "splits": {
        "original_creator": {
            "entity_id": "org-reuters",
            "entity_name": "Reuters Journalism Team",
            "entity_type": "news_organization",
            "share_percent": 40.0,
            "amount": 435.20,
            "disposition": "payable",  -- 'payable', 'escrow', 'credited_only', 'redirected'
            "contact_email": "truth-market@reuters.com",
            "claimed": false
        },
        "publisher": {
            "entity_id": "org-reuters",  -- Same as creator
            "entity_name": "Reuters.com",
            "entity_type": "news_platform",
            "share_percent": 0.0,  -- Combined with creator
            "amount": 0.0,
            "disposition": "combined_with_creator"
        },
        "curator": {
            "entity_id": "user-buildera",
            "entity_name": "user-buildera",
            "entity_type": "truth_market_user",
            "share_percent": 45.0,
            "amount": 489.60,
            "disposition": "paid"
        },
        "validators": {
            "entity_id": "community-pool",
            "entity_type": "distributed",
            "share_percent": 10.0,
            "amount": 108.80,
            "disposition": "distributed_to_voters",
            "recipient_count": 5,
            "recipients": [
                {"user_id": "user-chinahawk", "votes": 2, "amount": 43.52},
                {"user_id": "user-skeptic", "votes": 1, "amount": 21.76},
                ...
            ]
        }
    }
}
```

### New Table: `external_beneficiaries`
Track entities that aren't Truth Market users.

```sql
CREATE TABLE external_beneficiaries (
    id TEXT PRIMARY KEY,
    entity_name TEXT NOT NULL,
    entity_type TEXT NOT NULL,  -- 'government', 'news_org', 'individual', 'ngo', 'academic'

    total_value_attributed REAL DEFAULT 0.0,
    total_amount_held REAL DEFAULT 0.0,
    total_amount_paid REAL DEFAULT 0.0,

    contact_email TEXT,
    contact_attempted BOOLEAN DEFAULT FALSE,
    contact_attempted_at TEXT,
    contact_method TEXT,  -- 'email', 'social_media', 'official_channel'

    claimed BOOLEAN DEFAULT FALSE,
    claimed_at TEXT,
    claim_verification_method TEXT,
    verified_by TEXT,  -- Admin who verified the claim

    disposition_strategy TEXT DEFAULT 'escrow',  -- 'escrow', 'credited_only', 'donated', 'curator_bonus'
    redirect_to TEXT,  -- If donated, where did it go?
    redirect_reason TEXT,

    evidence_contributions TEXT,  -- JSON array of {evidence_id, amount, quest_id}

    reputation_score REAL,  -- For news orgs, track quality

    notes TEXT,
    metadata TEXT,  -- JSON for extra fields

    created_at TEXT,
    last_updated TEXT
);
```

---

## Implementation Phases

### Phase 1: Basic Distribution (Simplest Version)
**Goal**: Get money flowing to curators based on epistemic value

**Implementation**:
1. When quest converges, sum all epistemic values
2. Calculate each curator's share: `(evidence.epistemic_value / total_epistemic_value) * bounty_pool`
3. Create payment receipt for each curator
4. Update `evidence_submissions.actual_payout` and `paid_out = TRUE`
5. Display receipt in UI

**No recursive attribution yet** - just get basic payments working.

### Phase 2: Add Temporal Bonuses
**Goal**: Reward early high-quality contributions

**Implementation**:
1. Track `first_convergence_timestamp` on quest
2. Evidence submitted before this gets 20% bonus
3. Evidence that causes un-convergence gets 15% "challenger bonus"

### Phase 3: Recursive Value Attribution
**Goal**: Split payments among value chain participants

**Implementation**:
1. LLM identifies original creator, publisher during evidence analysis
2. Calculate attribution splits based on evidence type
3. Create receipts for each participant (curator, creator, publisher, validators)
4. Handle external beneficiaries (escrow, credited-only, etc.)

### Phase 4: Multi-Tranche Distribution
**Goal**: Don't pay everything at once - allow for un-convergence

**Implementation**:
1. Tranche 1 (60%) at first convergence
2. Tranche 2 (35%) after 7-day confirmation
3. Tranche 3 (5%) at quest closure

### Phase 5: Community Validators
**Goal**: Reward users who validated high-quality evidence

**Implementation**:
1. Track upvotes on evidence submissions
2. Distribute validator portion of bounty to users who upvoted winning evidence
3. Higher epistemic value evidence = more validator rewards

---

## Example Calculation (Jimmy Lai Quest)

### Quest Data
- **Total Bounty**: $1000.00
- **Platform Fee**: 5% = $50.00
- **Distributable**: $950.00
- **Status**: Converged (Tranche 1 - 60% = $570.00 available)

### Evidence Epistemic Values
| Evidence | Type | Epistemic Value | % of Total |
|----------|------|----------------|------------|
| #1 Senate Letter | primary_official | 0.042 | 4.2% |
| #2 Zaobao Prediction | prediction | 0.025 | 2.5% |
| #3 Fox News | news_article | 0.018 | 1.8% |
| #4 X Post + Grok | social_media | 0.005 | 0.5% |
| #5 Video Analysis | user_analysis | 0.101 | 10.1% |
| #6 Transcript | user_original | 0.115 | 11.5% |
| #7 Owen Jensen | credentialed_journalist | 0.068 | 6.8% |
| #8 Sebastien Lai | official_statement | 0.075 | 7.5% |
| #9 Reuters | investigative_journalism | 0.135 | 13.5% |
| **Total** | | **1.000** | **100%** |

### Payments (Tranche 1 - 60% = $570)

#### Evidence #9: Reuters (Highest Value - 13.5%)
**Bounty for this evidence**: $570 × 13.5% = **$76.95**

**Attribution Splits** (Type B: Investigative Journalism):
- 40% → Reuters → $30.78 (held in escrow for Reuters to claim)
- 45% → user-buildera (curator) → $34.63 (paid to platform balance)
- 10% → Community validators → $7.70 (distributed to 5 users who upvoted)
- 5% → Platform fee → $3.85

**Receipt**:
```json
{
    "receipt_id": "pmt-001",
    "quest_id": "quest-1762641589",
    "tranche": 1,
    "evidence": "#9 Reuters Article",
    "evidence_epistemic_value": 0.135,
    "evidence_bounty": 76.95,

    "recipients": [
        {
            "id": "org-reuters",
            "role": "original_creator",
            "entity": "Reuters Journalism Team",
            "amount": 30.78,
            "status": "held_escrow",
            "note": "Claimable by Reuters at truth-market@reuters.com"
        },
        {
            "id": "user-buildera",
            "role": "curator",
            "entity": "user-buildera",
            "amount": 34.63,
            "status": "paid",
            "paid_at": "2025-11-06T12:00:00Z"
        },
        {
            "id": "community-pool",
            "role": "validators",
            "entity": "Community Validators",
            "amount": 7.70,
            "status": "distributed",
            "recipients": [
                {"user": "user-policywonk", "votes": 2, "amount": 3.08},
                {"user": "user-newsjunkie", "votes": 1, "amount": 1.54},
                {"user": "user-chinahawk", "votes": 2, "amount": 3.08}
            ]
        }
    ],

    "calculation": {
        "base_formula": "(0.135 epistemic value / 1.000 total) × $570 tranche 1",
        "temporal_bonus": 0.0,  -- Not early (submitted after convergence)
        "value_splits": "Type B: Investigative Journalism (40% creator, 45% curator, 10% validators, 5% platform)"
    }
}
```

---

## Questions for Discussion

### 1. **Tranche Timing**
Should we use:
- **Option A**: Fixed time periods (7 days, 30 days)?
- **Option B**: Evidence-based (X new pieces of evidence, or entropy stability)?
- **Option C**: Manual trigger (quest creator closes it)?

**My recommendation**: Option A for simplicity, but allow early closure if no activity for 14 days.

### 2. **External Beneficiary Strategy**
What should we do with funds for entities like Reuters or U.S. Senate?
- **Escrow**: Hold for 1 year, then reallocate if unclaimed?
- **Credit-only**: Give them recognition but not money?
- **Donate**: Redirect to related cause (e.g., press freedom fund)?
- **Curator bonus**: Give it to the curator who found the source?

**My recommendation**: Start with **Credit-only** (build reputation for institutions) and **Curator bonus** (if unclaimed after 90 days, goes to curator).

### 3. **Validator Rewards**
How should we split the 10% validator portion?
- **Equal split**: Every upvoter gets equal share?
- **Vote-weighted**: More upvotes = larger share?
- **Early-bird validators**: First 5 validators get bonus?

**My recommendation**: **Vote-weighted** - but cap at 3 votes per user to prevent gaming.

### 4. **Minimum Epistemic Value Threshold**
Should evidence below a certain epistemic value get zero payment?
- **Option A**: No threshold - everyone who contributed gets something
- **Option B**: 0.01 threshold - filter out pure noise
- **Option C**: Dynamic threshold - bottom 20% get nothing

**My recommendation**: **Option B** - 0.01 threshold (1% of max). This filters out flagged misinfo and pure noise.

### 5. **Un-Convergence Challenger Bonus**
If evidence causes un-convergence, how much bonus?
- 10% bonus?
- 25% bonus?
- Double their normal share?

**My recommendation**: **25% bonus** - challenging consensus is valuable but risky, deserves significant reward.

---

## Next Steps

1. **Review this design** - Does it align with our epistemic/axiological principles?
2. **Decide on the questions above** - Need your input on strategy choices
3. **Implement Phase 1** - Basic distribution (curator payments only)
4. **Test with simulation** - Run Jimmy Lai quest through full payment cycle
5. **Iterate** - Refine based on what we learn

This is a foundational piece of the Truth Market mechanism design. The better we get this right, the stronger the incentive alignment for truth-seeking behavior.

