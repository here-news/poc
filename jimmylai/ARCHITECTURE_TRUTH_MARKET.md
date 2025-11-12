# Truth Market Architecture: Backend Services & Reward Distribution

**Based on**: Jimmy Lai Quest Simulation Analysis
**Date**: 2025-11-07
**Purpose**: Re-architect system to handle evidence dynamics and fair reward distribution

---

## Table of Contents

1. [Evidence Lifecycle & Service Touchpoints](#evidence-lifecycle--service-touchpoints)
2. [Backend Services Architecture](#backend-services-architecture)
3. [Reward Distribution Algorithm](#reward-distribution-algorithm)
4. [Critical Service Interactions](#critical-service-interactions)
5. [Implementation Roadmap](#implementation-roadmap)

---

## Evidence Lifecycle & Service Touchpoints

### Phase 1: Evidence Submission
```
User submits evidence → Frontend → API Gateway
                                      ↓
                          [TOUCHPOINT 1: Validation Service]
                                      ↓
                          - Check URL reachability
                          - Verify format (video/article/transcript)
                          - Detect duplicates
                          - Extract metadata
                                      ↓
                          [TOUCHPOINT 2: Storage Service]
                                      ↓
                          - Store evidence record in DB
                          - Cache original content
                          - Generate evidence_id
```

**Backend Services Required:**
- `ValidationService` - URL check, format validation, duplicate detection
- `StorageService` - Database writes, content caching
- `MetadataExtractor` - Pull title, author, publish date from URLs

### Phase 2: LLM Forensic Analysis
```
Evidence stored → Trigger Analysis
                       ↓
           [TOUCHPOINT 3: LLM Service]
                       ↓
           - Analyze evidence synopsis
           - Extract claims
           - Measure novelty (0.0-1.0)
           - Calculate impact on hypotheses
           - Generate reasoning
                       ↓
           [TOUCHPOINT 4: Probability Engine]
                       ↓
           - Apply Bayesian updates
           - Calculate ΔClarity (delta)
           - Update hypothesis probabilities
           - Check convergence threshold (≥80%)
                       ↓
           [TOUCHPOINT 5: Entropy Calculator]
                       ↓
           - Calculate Shannon entropy
           - Measure information gain
           - Track uncertainty reduction
```

**Backend Services Required:**
- `LLMService` - OpenAI GPT-4o-mini integration
- `ProbabilityEngine` - Bayesian probability updates
- `EntropyCalculator` - Shannon entropy, information theory metrics
- `ConvergenceDetector` - Monitor thresholds, trigger resolution

### Phase 3: Community Interaction
```
Evidence published → Community sees it
                          ↓
              [TOUCHPOINT 6: Comment Service]
                          ↓
              - Post comment with reaction_type
              - Build comment tree (parent_comment_id)
              - Track support/refute/question counts
                          ↓
              [TOUCHPOINT 7: Voting Service]
                          ↓
              - Record votes on evidence quality
              - Aggregate community sentiment
              - Weight by user reputation
                          ↓
              [TOUCHPOINT 8: Bounty Service]
                          ↓
              - Accept bounty contributions
              - Track contributor list
              - Update quest.total_bounty
```

**Backend Services Required:**
- `CommentService` - Threaded comments, reactions
- `VotingService` - Evidence quality votes, reputation weighting
- `BountyService` - Payment processing, pool management
- `NotificationService` - Real-time updates to followers

### Phase 4: Resolution & Convergence
```
Hypothesis reaches ≥80% → Trigger Resolution
                               ↓
                   [TOUCHPOINT 9: Resolution Service]
                               ↓
                   - Mark quest as CONVERGED
                   - Freeze probability updates
                   - Generate resolution statement
                   - Capture final entropy
                               ↓
                   [TOUCHPOINT 10: Payout Calculator]
                               ↓
                   - Calculate each contributor's ΔClarity
                   - Apply reward formula
                   - Distribute bounty pool
                               ↓
                   [TOUCHPOINT 11: Receipt Generator]
                               ↓
                   - Create resolution receipt
                   - List all evidence with impact scores
                   - Show payout breakdown
                   - Publish transparent record
```

**Backend Services Required:**
- `ResolutionService` - Quest completion logic
- `PayoutCalculator` - Fair reward distribution (see algorithm below)
- `ReceiptGenerator` - Transparent record creation
- `AuditLogger` - Immutable record of all calculations

---

## Backend Services Architecture

### Service Dependency Map

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Gateway (main.py)                     │
│                     /api/quests, /api/evidence                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
    ┌──────────┐  ┌──────────┐  ┌──────────┐
    │Validation│  │ Storage  │  │   LLM    │
    │ Service  │  │ Service  │  │ Service  │
    └──────────┘  └──────────┘  └─────┬────┘
                         │             │
                         │      ┌──────▼────────┐
                         │      │ Probability   │
                         │      │    Engine     │
                         │      └──────┬────────┘
                         │             │
                  ┌──────▼─────────────▼─────┐
                  │   Convergence Detector   │
                  └──────────┬───────────────┘
                             │
                      ┌──────▼──────┐
                      │ Resolution  │
                      │   Service   │
                      └──────┬──────┘
                             │
                  ┌──────────▼──────────┐
                  │  Payout Calculator  │
                  └──────────┬──────────┘
                             │
                  ┌──────────▼──────────┐
                  │ Receipt Generator   │
                  └─────────────────────┘
```

### Service Specifications

#### 1. **ValidationService** (`app/validation_service.py`)

```python
class ValidationService:
    async def validate_evidence_submission(
        self,
        url: str,
        evidence_type: str,
        synopsis: str
    ) -> ValidationResult:
        """
        Validate evidence before acceptance

        Checks:
        - URL is reachable (HTTP 200)
        - Content type matches evidence_type
        - Synopsis is non-empty (min 50 chars)
        - No duplicate URL in quest
        - URL not on blocklist (known misinformation sites)

        Returns: ValidationResult(valid: bool, reason: str)
        """
```

**Priority**: HIGH (prevents spam, duplicates, broken links)

#### 2. **LLMService** (`app/llm_service.py` - EXISTING)

**Current Status**: ✅ Already implemented
**Enhancements Needed**:
- Add `calculate_delta_clarity()` method
- Add `extract_claims()` for structured claim extraction
- Add `detect_contradictions()` between evidence pieces

#### 3. **ProbabilityEngine** (`app/probability_engine.py`)

```python
class ProbabilityEngine:
    def update_probabilities(
        self,
        current_hypotheses: List[Hypothesis],
        evidence: Evidence,
        llm_analysis: LLMAnalysisResult
    ) -> ProbabilityUpdateResult:
        """
        Apply Bayesian probability updates

        Formula:
        P(H|E) = P(E|H) × P(H) / P(E)

        Where:
        - P(H|E) = posterior probability (new)
        - P(E|H) = likelihood (from LLM: novelty × evidence_quality)
        - P(H) = prior probability (current)
        - P(E) = normalizing constant

        Returns:
        - updated_hypotheses: List[Hypothesis]
        - delta_clarity: float (information gain)
        - reasoning: str
        """

    def calculate_evidence_quality_weight(
        self,
        evidence_type: str
    ) -> float:
        """
        Evidence hierarchy from case study:
        - video_primary: 1.0
        - transcript_extraction: 0.95
        - official_statement: 0.85
        - news_article: 0.70
        - prediction: 0.50
        - social_media: 0.30
        """
```

**Priority**: HIGH (core truth-seeking mechanism)

#### 4. **EntropyCalculator** (`app/entropy_calculator.py`)

```python
class EntropyCalculator:
    def calculate_shannon_entropy(
        self,
        probabilities: List[float]
    ) -> float:
        """
        Shannon Entropy: H = -Σ(p_i × log₂(p_i))

        Range: 0.0 (certain) to 1.0 (maximum uncertainty)

        Example:
        - [1.0, 0.0] → H = 0.0 (certainty)
        - [0.5, 0.5] → H = 1.0 (maximum uncertainty)
        - [0.8, 0.2] → H = 0.72 (moderate uncertainty)
        """

    def calculate_information_gain(
        self,
        entropy_before: float,
        entropy_after: float
    ) -> float:
        """
        Information Gain = Entropy_before - Entropy_after

        This is the ΔClarity contributed by evidence
        Higher = more valuable contribution
        """
```

**Priority**: MEDIUM (nice metric for UX, not critical for MVP)

#### 5. **ConvergenceDetector** (`app/convergence_detector.py`)

```python
class ConvergenceDetector:
    CONVERGENCE_THRESHOLD = 0.80  # 80% probability

    async def check_convergence(
        self,
        quest_id: str
    ) -> ConvergenceResult:
        """
        Check if quest has reached resolution

        Convergence conditions:
        1. Any hypothesis ≥ 80% probability, OR
        2. Entropy ≤ 0.3 (low uncertainty), OR
        3. Deadline reached

        Returns:
        - converged: bool
        - winning_hypothesis_id: str
        - confidence: float
        - trigger_reason: str
        """

    async def trigger_resolution(
        self,
        quest_id: str
    ) -> None:
        """
        Execute resolution flow:
        1. Mark quest as CONVERGED
        2. Freeze probability updates
        3. Trigger payout calculation
        4. Generate receipt
        5. Notify all followers
        """
```

**Priority**: HIGH (critical for quest completion)

#### 6. **PayoutCalculator** (`app/payout_calculator.py`)

```python
class PayoutCalculator:
    PLATFORM_FEE = 0.10  # 10% to platform

    def calculate_payouts(
        self,
        quest: Quest,
        evidence_list: List[Evidence],
        community_votes: Dict[str, VoteData]
    ) -> PayoutResult:
        """
        Fair reward distribution algorithm (see detailed formula below)

        Factors:
        1. ΔClarity contribution (40% weight)
        2. Evidence novelty score (30% weight)
        3. Community votes (20% weight)
        4. Timing bonus (10% weight)
        5. Breakthrough bonus (flat $20 for convergence trigger)

        Returns:
        - payouts: Dict[user_id, amount]
        - breakdown: Dict[evidence_id, calculation_details]
        - total_distributed: float
        """
```

**Priority**: CRITICAL (must be fair and transparent)

---

## Reward Distribution Algorithm

### Core Principle
> **Contributors are rewarded proportionally to their clarity contribution, weighted by evidence quality, community validation, and timing.**

### Detailed Formula

```python
# Total pool after platform fee
distributable_pool = total_bounty × 0.90

# For each evidence submission:
evidence_score = (
    delta_clarity_points × 0.40 +      # Information gain
    novelty_score × 0.30 +              # LLM-assessed uniqueness
    community_vote_score × 0.20 +       # Upvotes - downvotes
    timing_bonus × 0.10                 # Earlier = higher
)

# Normalize scores to percentages
total_score = sum(all_evidence_scores)
payout_percentage = evidence_score / total_score

# Calculate final payout
contributor_payout = distributable_pool × payout_percentage

# Add breakthrough bonus
if evidence_triggered_convergence:
    contributor_payout += breakthrough_bonus  # Flat $20
```

### Example from Jimmy Lai Simulation

**Total Bounty Pool**: $60
**Distributable**: $60 × 0.90 = $54
**Platform Fee**: $6

| Contributor | Evidence Type | ΔClarity | Novelty | Votes | Timing | Score | Payout |
|-------------|---------------|----------|---------|-------|--------|-------|--------|
| @BuilderA | Video (primary) | +25% | 0.80 | +15 | 0.9 | 24.5 | $24.50 (45%) |
| @BuilderB | Transcript | +14% | 0.80 | +12 | 0.8 | 17.3 | $17.30 (32%) |
| @BuilderC | Misinformation flag | +6% | 0.60 | +8 | 0.7 | 8.1 | $8.10 (15%) |
| @BuilderD | Prediction | +5% | 0.60 | +5 | 1.0 | 4.1 | $4.10 (8%) |
| **Total** | - | - | - | - | - | **54.0** | **$54.00** |

**Breakthrough Bonus**: @BuilderB gets +$20 for triggering convergence (transcript pushed to 90%)

**Final Payouts**:
- @BuilderA: $24.50
- @BuilderB: $37.30 ($17.30 + $20 bonus)
- @BuilderC: $8.10
- @BuilderD: $4.10
- Platform: $6.00

---

## Critical Service Interactions

### Interaction 1: Evidence Submission Flow

```
POST /api/quests/{quest_id}/evidence
    ↓
[ValidationService]
    validate_evidence_submission()
    ↓ (if valid)
[StorageService]
    store_evidence()
    ↓
[LLMService]
    analyze_evidence() → {novelty, reasoning}
    ↓
[ProbabilityEngine]
    update_probabilities() → {new_probs, delta_clarity}
    ↓
[Database]
    update_hypotheses()
    log_probability_update()
    ↓
[ConvergenceDetector]
    check_convergence()
    ↓ (if converged)
[ResolutionService]
    trigger_resolution()
    ↓
[PayoutCalculator]
    calculate_payouts()
    ↓
[NotificationService]
    notify_all_followers("Quest resolved!")
```

**Critical Path Duration**: ~5-10 seconds
**Must be**: Atomic transaction (all-or-nothing)

### Interaction 2: Bounty Contribution Flow

```
POST /api/quests/{quest_id}/bounty
    ↓
[BountyService]
    validate_contribution(amount, user_id)
    ↓
[PaymentProcessor] (future)
    charge_user()
    ↓
[StorageService]
    update_quest.total_bounty += amount
    log_contribution(user_id, amount)
    ↓
[NotificationService]
    notify_followers("Bounty increased to ${total}!")
```

### Interaction 3: Comment & Reaction Flow

```
POST /api/comments
    ↓
[CommentService]
    validate_comment(text, reaction_type)
    ↓
[StorageService]
    store_comment()
    ↓
[EngagementTracker]
    increment_evidence.comment_count
    track_reaction_distribution(support/refute/question)
    ↓
[VotingService] (implicit)
    update_community_sentiment_score()
```

---

## Implementation Roadmap

### Phase 1: Core Services (Week 1)
**Goal**: Evidence submission → LLM analysis → Probability update

- [ ] `ValidationService` - URL checks, duplicate detection
- [ ] `ProbabilityEngine` - Bayesian updates with evidence weighting
- [ ] `ConvergenceDetector` - 80% threshold monitoring
- [ ] Enhanced `LLMService` - Add delta_clarity calculation

**Deliverable**: Evidence submission causes real-time probability updates

### Phase 2: Reward System (Week 2)
**Goal**: Fair, transparent payout distribution

- [ ] `PayoutCalculator` - Implement formula (ΔClarity + novelty + votes + timing)
- [ ] `ResolutionService` - Quest completion workflow
- [ ] `ReceiptGenerator` - Transparent payout breakdown
- [ ] `AuditLogger` - Immutable record of calculations

**Deliverable**: Converged quests automatically distribute rewards

### Phase 3: Community Features (Week 3)
**Goal**: Engagement, voting, reputation

- [ ] `VotingService` - Evidence quality voting
- [ ] `ReputationEngine` - Track user accuracy over time
- [ ] `NotificationService` - Real-time updates via SSE/WebSocket
- [ ] `EngagementTracker` - Follower analytics

**Deliverable**: Community can influence payouts via voting

### Phase 4: Advanced Analysis (Week 4)
**Goal**: Contradiction detection, claim extraction

- [ ] `ContradictionDetector` - Find conflicting evidence (like Grok vs Video)
- [ ] `ClaimExtractor` - Structured claim graph
- [ ] `ScopeResolver` - Handle "public vs private" distinctions
- [ ] `EntropyCalculator` - Information theory metrics

**Deliverable**: System detects contradictions and refines scope automatically

---

## Database Schema Updates

### New Tables Required

```sql
-- Track individual probability updates
CREATE TABLE probability_updates (
    id TEXT PRIMARY KEY,
    quest_id TEXT NOT NULL,
    hypothesis_id TEXT NOT NULL,
    evidence_id TEXT NOT NULL,
    probability_before REAL NOT NULL,
    probability_after REAL NOT NULL,
    delta_clarity REAL NOT NULL,
    reasoning TEXT,
    timestamp TEXT NOT NULL,
    FOREIGN KEY (quest_id) REFERENCES quests(id),
    FOREIGN KEY (hypothesis_id) REFERENCES hypotheses(id),
    FOREIGN KEY (evidence_id) REFERENCES evidence_submissions(id)
);

-- Track bounty contributions
CREATE TABLE bounty_contributions (
    id TEXT PRIMARY KEY,
    quest_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    amount REAL NOT NULL,
    message TEXT,
    timestamp TEXT NOT NULL,
    FOREIGN KEY (quest_id) REFERENCES quests(id)
);

-- Track payouts
CREATE TABLE payouts (
    id TEXT PRIMARY KEY,
    quest_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    evidence_id TEXT,
    amount REAL NOT NULL,
    breakdown JSON NOT NULL,  -- {delta_clarity: 0.25, novelty: 0.8, ...}
    payout_type TEXT NOT NULL,  -- 'contribution' or 'breakthrough_bonus'
    timestamp TEXT NOT NULL,
    FOREIGN KEY (quest_id) REFERENCES quests(id),
    FOREIGN KEY (evidence_id) REFERENCES evidence_submissions(id)
);

-- Track votes on evidence quality
CREATE TABLE evidence_votes (
    id TEXT PRIMARY KEY,
    evidence_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    vote_type TEXT NOT NULL,  -- 'upvote' or 'downvote'
    timestamp TEXT NOT NULL,
    FOREIGN KEY (evidence_id) REFERENCES evidence_submissions(id),
    UNIQUE(evidence_id, user_id)  -- One vote per user per evidence
);

-- Quest resolution record
CREATE TABLE quest_resolutions (
    id TEXT PRIMARY KEY,
    quest_id TEXT NOT NULL,
    winning_hypothesis_id TEXT NOT NULL,
    final_probability REAL NOT NULL,
    final_entropy REAL NOT NULL,
    total_evidence_count INTEGER NOT NULL,
    total_bounty_distributed REAL NOT NULL,
    resolution_statement TEXT NOT NULL,
    resolved_at TEXT NOT NULL,
    FOREIGN KEY (quest_id) REFERENCES quests(id),
    FOREIGN KEY (winning_hypothesis_id) REFERENCES hypotheses(id)
);
```

---

## Configuration & Tuning Parameters

```python
# config/truth_market.yaml

convergence:
  probability_threshold: 0.80  # 80% to win
  entropy_threshold: 0.30      # Low uncertainty
  min_evidence_count: 3        # Need at least 3 pieces

rewards:
  platform_fee: 0.10           # 10%
  breakthrough_bonus: 20.00    # Flat $20 for triggering convergence
  weights:
    delta_clarity: 0.40
    novelty: 0.30
    community_votes: 0.20
    timing: 0.10

evidence_quality:
  video_primary: 1.00
  transcript_extraction: 0.95
  official_statement: 0.85
  news_article: 0.70
  prediction: 0.50
  social_media: 0.30

llm:
  model: "gpt-4o-mini"
  temperature: 0.3             # Lower = more consistent
  max_tokens: 1500

validation:
  min_synopsis_length: 50
  max_synopsis_length: 2000
  url_timeout_seconds: 10
  block_list:
    - "example-fake-news.com"
```

---

## Success Metrics

### System Health
- **Evidence validation rate**: >95% valid submissions
- **LLM analysis latency**: <5 seconds per evidence
- **Probability update accuracy**: Converges to ground truth in >80% of cases

### User Engagement
- **Average evidence per quest**: >5
- **Community vote participation**: >30% of followers
- **Bounty contribution rate**: >20% of followers add funds

### Fairness & Transparency
- **Payout variance**: Low standard deviation (fair distribution)
- **User satisfaction**: >4.5/5.0 rating on payout fairness
- **Audit trail completeness**: 100% of payouts have receipts

---

## Next Steps

1. **Review this architecture** with team
2. **Prioritize services** for Week 1 sprint
3. **Create detailed API specs** for each service
4. **Design database migrations** for new tables
5. **Implement PayoutCalculator first** - most critical for trust

---

**Questions to Resolve:**

1. Should we use **real money** (Stripe) or **credits** (virtual currency) for MVP?
2. What's the **minimum viable bounty** to make rewards meaningful? ($10? $50?)
3. Should **platform fee** be flexible (quest creator sets it) or fixed (10%)?
4. How do we handle **ties** in probability (e.g., 50/50 after all evidence)?
5. Should we allow **payout disputes** or is the algorithm final?

---

**End of Architecture Document**
