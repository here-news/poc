# Recursive Value Attribution Framework

## The Problem

When a user shares high-quality evidence from external sources (Senate letter, Reuters article, YouTube video), who deserves credit?

**Example**: `user-policywonk` shares Senate letter urging Trump to raise Jimmy Lai case.

- **Primary Creator**: U.S. Senate (Senators Risch, Scott, and colleagues)
- **Publisher**: Senate.gov website
- **Curator/Contributor**: `user-policywonk` (found and shared it to Truth Market)

**Current system**: Only `user-policywonk` gets bounty.

**Problem**: Senate created the actual epistemic value, but gets nothing!

## Core Insight: Value Chains, Not Individual Attribution

Every piece of evidence has a **value chain**:

```
Original Creator → Publisher/Platform → Curator → Community Validation
```

Each link in the chain deserves a share proportional to their contribution.

## Proposed Solution: Recursive Value Splits

### 1. Value Attribution Tiers

```python
class ValueAttribution:
    # Tier 0: Original Creators (primary sources)
    original_creator: str          # "U.S. Senate", "Reuters Journalism Team"
    original_creator_share: float  # 0.0 - 0.5 (up to 50% of evidence value)

    # Tier 1: Publishers/Platforms
    publisher: str                 # "Senate.gov", "Reuters.com", "YouTube"
    publisher_share: float         # 0.0 - 0.2 (up to 20%)

    # Tier 2: Curators/Contributors
    curator: str                   # "user-policywonk"
    curator_share: float           # 0.3 - 1.0 (remainder)

    # Tier 3: Validators (optional)
    validators: List[str]          # Users who validated quality
    validator_share: float         # 0.0 - 0.1 (up to 10%)
```

### 2. Attribution Split Rules

#### Primary Sources (Original Research/Statements)
- **Example**: Senate letter, Reuters investigative article, court documents
- **Split**:
  - 40% → Original creator (Senate, Reuters team)
  - 10% → Publisher (senate.gov, reuters.com)
  - 40% → Curator (user who shared it)
  - 10% → Validators

#### Secondary Sources (Curated/Aggregated)
- **Example**: News article citing others, YouTube compilation
- **Split**:
  - 20% → Original creator (if identifiable)
  - 10% → Publisher
  - 60% → Curator
  - 10% → Validators

#### Original Analysis (User-Generated)
- **Example**: Video analysis by `user-buildera`, transcript extraction
- **Split**:
  - 0% → No external creator
  - 0% → No publisher
  - 90% → Creator/Curator (same person)
  - 10% → Validators

#### Social Media Posts (Minimal Original Value)
- **Example**: Random X post, Grok AI response
- **Split**:
  - 0% → Original poster (low value)
  - 0% → Platform (X/Twitter gets nothing)
  - 90% → Curator (if they flag it correctly as misinfo)
  - 10% → Validators

### 3. How to Attribute to External Entities

Since Senate, Reuters, etc. are not Truth Market users, we need options:

#### Option A: Hold Funds in Escrow
```python
{
    "beneficiary": "U.S. Senate",
    "beneficiary_type": "government",
    "amount_held": 375.00,  # 40% of this evidence's bounty
    "status": "held_in_escrow",
    "contact_attempted": False,
    "expires_at": "2026-11-07"  # After 1 year, reallocate
}
```

#### Option B: Attribution Credit (Non-Monetary)
```python
{
    "beneficiary": "Reuters Journalism Team",
    "beneficiary_type": "news_organization",
    "value_attributed": 1200.00,  # Credited but not paid
    "public_acknowledgment": True,
    "impact_score": 0.95,  # For their reputation
}
```

#### Option C: Donate to Related Causes
```python
{
    "beneficiary": "U.S. Senate",
    "intended_share": 375.00,
    "redirect_to": "Jimmy Lai Legal Defense Fund",
    "redirect_reason": "Aligns with original creator's intent",
    "approved_by": "community_vote"
}
```

#### Option D: Curator Bonus (If Unreachable)
```python
{
    "beneficiary": "U.S. Senate",
    "intended_share": 375.00,
    "status": "unreachable",
    "redistributed_to": "user-policywonk",
    "redistribution_reason": "Curator bonus for finding high-value source",
    "curator_total_share": 775.00  # Original 400 + redistributed 375
}
```

## Detailed Example: Jimmy Lai Quest

### Evidence #1: Senate Letter

**Source**: https://www.risch.senate.gov/public/index.cfm/2025/10/risch-scott-colleagues-write-letter

**Value Chain**:
1. **Original Creator**: U.S. Senate (Senators Risch, Scott, and colleagues)
2. **Publisher**: Senate.gov
3. **Curator**: `user-policywonk`
4. **Validators**: Community upvotes

**Epistemic Value**: 0.042 (4.2% of total quest value)

**Bounty for this Evidence**: $394 (4.2% of $9,381)

**Split**:
```python
{
    "original_creator": {
        "entity": "U.S. Senate (Risch, Scott, et al.)",
        "share_percent": 40,
        "amount": 157.60,
        "disposition": "held_in_escrow",  # Option A
        "note": "Can be claimed by Senate office or redirected to Jimmy Lai fund"
    },
    "publisher": {
        "entity": "Senate.gov",
        "share_percent": 10,
        "amount": 39.40,
        "disposition": "public_acknowledgment",  # Option B - non-monetary
        "note": "Government website, cannot accept private funds"
    },
    "curator": {
        "entity": "user-policywonk",
        "share_percent": 40,
        "amount": 157.60,
        "disposition": "paid",
        "note": "Reward for finding and sharing high-value source"
    },
    "validators": {
        "entity": "community",
        "share_percent": 10,
        "amount": 39.40,
        "disposition": "distributed_to_voters",
        "note": "Split among users who upvoted this evidence"
    }
}
```

### Evidence #9: Reuters Article

**Source**: https://www.reuters.com/world/trump-pressed-xi-release-jimmy-lai-2025-11-06/

**Value Chain**:
1. **Original Creator**: Reuters investigative journalism team (3 sources + admin official)
2. **Publisher**: Reuters.com
3. **Curator**: `user-buildera`

**Epistemic Value**: 0.116 (11.6% of total - HIGHEST)

**Bounty for this Evidence**: $1,088 (11.6% of $9,381)

**Split**:
```python
{
    "original_creator": {
        "entity": "Reuters Journalism Team",
        "share_percent": 40,
        "amount": 435.20,
        "disposition": "payable_to_organization",
        "contact": "reuters-newsroom@reuters.com",
        "note": "Can be claimed by Reuters or donated to press freedom org"
    },
    "publisher": {
        "entity": "Reuters.com",
        "share_percent": 10,
        "amount": 108.80,
        "disposition": "combined_with_creator",  # Reuters owns the platform
        "note": "Combined with creator share = $544 total for Reuters"
    },
    "curator": {
        "entity": "user-buildera",
        "share_percent": 40,
        "amount": 435.20,
        "disposition": "paid",
        "note": "Found and shared this critical evidence"
    },
    "validators": {
        "entity": "community",
        "share_percent": 10,
        "amount": 108.80,
        "disposition": "distributed_to_voters"
    }
}
```

### Evidence #5: Video Analysis (User-Generated)

**Source**: https://www.youtube.com/watch?v=g6GfiUnj5jE&t=243s

**Value Chain**:
1. **Original Video**: White House press pool footage (public domain)
2. **Platform**: YouTube
3. **Analyst**: `user-buildera` (analyzed the video frame-by-frame)

**Epistemic Value**: 0.101 (10.1%)

**Bounty for this Evidence**: $948

**Split**:
```python
{
    "original_creator": {
        "entity": "White House Press Pool",
        "share_percent": 10,  # Public domain, minimal attribution
        "amount": 94.80,
        "disposition": "public_acknowledgment",
        "note": "Public domain footage, non-monetary credit"
    },
    "publisher": {
        "entity": "YouTube",
        "share_percent": 0,  # Platform gets nothing
        "amount": 0,
        "disposition": "excluded",
        "note": "Commercial platform, no value attribution"
    },
    "curator_analyst": {
        "entity": "user-buildera",
        "share_percent": 80,  # Created the analysis
        "amount": 758.40,
        "disposition": "paid",
        "note": "Original analysis work - frame-by-frame investigation"
    },
    "validators": {
        "entity": "community",
        "share_percent": 10,
        "amount": 94.80,
        "disposition": "distributed_to_voters"
    }
}
```

## Implementation

### Database Schema Addition

```sql
-- Add to evidence_submissions table
ALTER TABLE evidence_submissions ADD COLUMN value_attribution TEXT;  -- JSON

-- Value attribution structure:
{
    "original_creator": {
        "entity": "U.S. Senate",
        "entity_type": "government",
        "share_percent": 40,
        "amount": 157.60,
        "disposition": "held_in_escrow",
        "contact_info": null,
        "claimed": false
    },
    "publisher": {
        "entity": "Senate.gov",
        "entity_type": "government_website",
        "share_percent": 10,
        "amount": 39.40,
        "disposition": "public_acknowledgment"
    },
    "curator": {
        "entity": "user-policywonk",
        "entity_type": "truth_market_user",
        "share_percent": 40,
        "amount": 157.60,
        "disposition": "paid"
    },
    "validators": {
        "entity": "community",
        "entity_type": "distributed",
        "share_percent": 10,
        "amount": 39.40,
        "disposition": "distributed_to_voters",
        "recipients": ["user-chinahawk", "user-skeptic", ...]
    }
}

-- External beneficiary tracking
CREATE TABLE external_beneficiaries (
    id TEXT PRIMARY KEY,
    entity_name TEXT NOT NULL,
    entity_type TEXT NOT NULL,  -- 'government', 'news_org', 'individual', 'ngo'

    total_value_attributed REAL DEFAULT 0.0,
    total_amount_held REAL DEFAULT 0.0,
    total_amount_paid REAL DEFAULT 0.0,

    contact_email TEXT,
    contact_attempted BOOLEAN DEFAULT FALSE,
    contact_attempted_at TEXT,

    claimed BOOLEAN DEFAULT FALSE,
    claimed_at TEXT,
    claim_verification TEXT,

    disposition_strategy TEXT,  -- 'escrow', 'credit_only', 'donate', 'curator_bonus'

    evidence_contributions TEXT,  -- JSON array of evidence_ids

    created_at TEXT,
    last_updated TEXT
);
```

### LLM Enhancement for Attribution

When analyzing evidence, LLM should also identify:

```python
{
    "attribution": {
        "original_creator": {
            "name": "U.S. Senate",
            "confidence": 0.95,
            "reasoning": "Official letter from Senators Risch and Scott"
        },
        "publisher": {
            "name": "Senate.gov",
            "confidence": 1.0,
            "reasoning": "Hosted on official Senate website"
        },
        "is_original_research": False,
        "is_user_generated": False,
        "recommended_split": {
            "original_creator": 40,
            "publisher": 10,
            "curator": 40,
            "validators": 10
        }
    }
}
```

## Benefits

### 1. Incentivizes Quality Source Discovery
Users are rewarded for finding authoritative sources (Senate, Reuters), not just creating noise.

### 2. Credits Original Creators
Senate, Reuters, investigative journalists get recognition (and potentially payment) for their work.

### 3. Encourages Institutional Participation
If Reuters knows they can earn bounties from Truth Market, they might:
- Directly submit evidence
- Monitor quests related to their reporting
- Claim their attributed value

### 4. Builds Reputation for Sources
We can track:
- Which news organizations produce highest-value evidence?
- Which government agencies provide useful information?
- Which institutions deserve trust?

### 5. Community Validation Rewards
Users who upvote high-quality evidence share in the bounty, incentivizing good curation.

## Future: Institutional Accounts

Eventually, we could allow:
```python
{
    "user_id": "org-reuters",
    "user_type": "institutional",
    "organization": "Reuters",
    "verified": True,
    "can_claim_attributions": True
}
```

Then Reuters could:
1. See their attributed value across all quests
2. Claim payment for evidence others shared
3. Directly submit their own investigative work
4. Build institutional reputation score

## Philosophical Alignment

This aligns with the core mission:
- **Truth-seeking rewards truth-creators**
- **Recognition flows to source of value**
- **Intermediaries (curators) still rewarded for discovery**
- **Community validators share in success**

It's not just about "who posted on Truth Market" but "who created epistemic value in the world."

## Summary

Current: `user-policywonk` gets 100% for sharing Senate letter

Proposed:
- Senate gets 40% (held for them)
- Senate.gov gets 10% (public credit)
- `user-policywonk` gets 40% (curator reward)
- Community validators get 10%

This is **recursive value attribution** - flowing value backward through the chain of creation, publication, curation, and validation.
