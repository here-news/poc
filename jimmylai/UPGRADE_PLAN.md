# Truth Market Complete Upgrade Plan

## 🎯 Vision
Transform from single-case prototype to scalable platform hosting millions of truth-seeking investigations with community-driven evidence, LLM-powered analysis, and automated probability convergence.

---

## 📋 PHASE 1: Foundation & Naming

### Naming Discussion: "Bounty Quest" vs Alternatives

**Option A: "Bounty Quest"**
- ✅ Gamification appeal
- ✅ Clear incentive structure
- ❌ May feel too playful for serious journalism
- ❌ "Quest" implies adventure/game vs truth-seeking

**Option B: "Truth Bounty"**
- ✅ Direct, professional
- ✅ Emphasizes core mission
- ✅ "Bounty" = reward + wanted truth
- ❌ Less memorable

**Option C: "Investigation" or "Ask"**
- ✅ Professional, journalistic
- ✅ Familiar terminology (currently using "Ask")
- ❌ No incentive signal
- ❌ Generic

**Option D: "Clarity Quest"**
- ✅ Mission-aligned (ΔClarity tracking)
- ✅ Combines incentive + purpose
- ✅ Unique branding
- ✅ Scalable terminology

**RECOMMENDATION: "Clarity Quest"**
Reasoning: Ties to existing ΔClarity metric, signals both mission (clarity) and engagement (quest), professional yet accessible.

Alternative tier naming:
- **Clarity Quest** = Individual investigation
- **Story** = Collection of related quests (e.g., "US-China Relations")
- **Case** = Sub-category within story (e.g., "Trump-Xi October Summit")

---

## 🏗️ PHASE 2: Database Schema Upgrade

### New Tables

```sql
-- Quests (replaces "Ask")
CREATE TABLE quests (
    id TEXT PRIMARY KEY,
    story_id TEXT NOT NULL,
    case_id TEXT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    initial_evidence_url TEXT,
    initial_evidence_text TEXT,

    -- Status tracking
    status TEXT DEFAULT 'active',  -- active, converged, resolved, expired
    created_by TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,

    -- Convergence tracking
    converged_at TEXT,
    winning_hypothesis_id TEXT,
    winning_probability REAL,

    -- Bounty
    initial_bounty REAL DEFAULT 0.0,
    total_bounty REAL DEFAULT 0.0,
    platform_fee_percent REAL DEFAULT 10.0,

    -- Metadata
    view_count INTEGER DEFAULT 0,
    evidence_count INTEGER DEFAULT 0,
    participant_count INTEGER DEFAULT 0,

    FOREIGN KEY (story_id) REFERENCES stories(id),
    FOREIGN KEY (case_id) REFERENCES cases(id)
);

-- Hypotheses (LLM-generated, tracked over time)
CREATE TABLE hypotheses (
    id TEXT PRIMARY KEY,
    quest_id TEXT NOT NULL,
    statement TEXT NOT NULL,

    -- Probability tracking
    current_probability REAL NOT NULL,
    initial_probability REAL NOT NULL,
    last_updated TEXT DEFAULT CURRENT_TIMESTAMP,

    -- LLM metadata
    generated_by TEXT DEFAULT 'llm',
    generation_prompt TEXT,
    confidence_score REAL,

    -- Status
    is_winner BOOLEAN DEFAULT FALSE,
    converged_at TEXT,

    FOREIGN KEY (quest_id) REFERENCES quests(id)
);

-- Evidence submissions (community contributions)
CREATE TABLE evidence_submissions (
    id TEXT PRIMARY KEY,
    quest_id TEXT NOT NULL,
    submitted_by TEXT NOT NULL,

    -- Content
    source_url TEXT NOT NULL,
    source_type TEXT,  -- article, video, document, social_media, primary_source
    synopsis TEXT,
    full_text TEXT,

    -- LLM analysis
    llm_analyzed BOOLEAN DEFAULT FALSE,
    llm_analysis_json TEXT,  -- JSON with claims, credibility, impact
    novelty_score REAL,

    -- Impact tracking
    clarity_contribution REAL DEFAULT 0.0,
    hypothesis_impacts TEXT,  -- JSON: {h1: +5%, h2: -3%}

    -- Community validation
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    validated BOOLEAN DEFAULT FALSE,

    -- Rewards
    estimated_payout REAL DEFAULT 0.0,
    actual_payout REAL DEFAULT 0.0,
    paid_out BOOLEAN DEFAULT FALSE,

    submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (quest_id) REFERENCES quests(id),
    FOREIGN KEY (submitted_by) REFERENCES users(id)
);

-- Probability evolution log
CREATE TABLE probability_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quest_id TEXT NOT NULL,
    hypothesis_id TEXT NOT NULL,

    -- Before/After
    probability_before REAL NOT NULL,
    probability_after REAL NOT NULL,
    delta REAL NOT NULL,

    -- Trigger
    trigger_type TEXT NOT NULL,  -- new_evidence, vote_shift, expert_validation, llm_update
    trigger_id TEXT,  -- ID of evidence/vote/etc that caused change
    trigger_description TEXT,

    -- Entropy tracking
    entropy_before REAL,
    entropy_after REAL,

    -- Metadata
    calculated_by TEXT DEFAULT 'system',
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (quest_id) REFERENCES quests(id),
    FOREIGN KEY (hypothesis_id) REFERENCES hypotheses(id)
);

-- Contributor rewards
CREATE TABLE contributor_rewards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quest_id TEXT NOT NULL,
    user_id TEXT NOT NULL,

    -- Contribution tracking
    evidence_ids TEXT,  -- JSON array of evidence IDs
    comment_count INTEGER DEFAULT 0,
    validation_actions INTEGER DEFAULT 0,

    -- Rewards
    base_reward REAL DEFAULT 0.0,
    clarity_bonus REAL DEFAULT 0.0,
    early_bird_bonus REAL DEFAULT 0.0,
    total_reward REAL DEFAULT 0.0,

    -- Payout
    paid_out BOOLEAN DEFAULT FALSE,
    paid_at TEXT,

    FOREIGN KEY (quest_id) REFERENCES quests(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Platform analytics
CREATE TABLE platform_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,

    -- Quest metrics
    total_quests INTEGER,
    active_quests INTEGER,
    converged_quests INTEGER,

    -- Community metrics
    active_users INTEGER,
    new_users INTEGER,
    total_evidence_submitted INTEGER,

    -- Financial metrics
    total_bounty_pool REAL,
    total_paid_out REAL,
    platform_fees_collected REAL,

    UNIQUE(date)
);
```

---

## 🔄 PHASE 3: User Journey Flow

### 1. **Homepage: Quest Discovery**

```
┌─────────────────────────────────────────────────────┐
│  🏠 TRUTH MARKET                                    │
│                                                      │
│  [+ Create New Clarity Quest]                       │
│                                                      │
│  🔥 TRENDING QUESTS                                 │
│  ┌──────────────────────────────────────────┐      │
│  │ 💰 $1,200  Did Trump raise Jimmy Lai?    │      │
│  │ 🎯 82% converged | 47 evidence | 3d left │      │
│  │ H1: Raised privately (82%) 🏆 WINNER     │      │
│  └──────────────────────────────────────────┘      │
│                                                      │
│  ⚡ NEEDS EVIDENCE                                  │
│  ┌──────────────────────────────────────────┐      │
│  │ 💰 $450  Climate data accuracy 2024      │      │
│  │ 🎯 45% entropy | 12 evidence | 30d left  │      │
│  │ 4 competing hypotheses                    │      │
│  └──────────────────────────────────────────┘      │
│                                                      │
│  📊 RECENTLY RESOLVED                               │
│  🔍 BROWSE ALL QUESTS                               │
└─────────────────────────────────────────────────────┘
```

**Features:**
- Search & filter (by topic, bounty size, status, entropy)
- Sort (trending, high bounty, needs evidence, closing soon)
- Quick stats dashboard
- User profile (contributions, earnings, reputation)

---

### 2. **Quest Creation Flow**

```
Step 1: Initial Question
┌─────────────────────────────────────────┐
│ What truth are you seeking?             │
│ ┌─────────────────────────────────────┐ │
│ │ Did Trump raise the Jimmy Lai case  │ │
│ │ with Xi Jinping at their October    │ │
│ │ meeting?                             │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ Category: [Politics ▾]                  │
│ Story: [US-China Relations ▾] or New   │
└─────────────────────────────────────────┘

Step 2: Initial Evidence
┌─────────────────────────────────────────┐
│ Provide first evidence (optional)       │
│ ┌─────────────────────────────────────┐ │
│ │ URL or paste text...                │ │
│ │ https://zaobao.com/article/...      │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ [🤖 Analyze with LLM] [Skip]           │
└─────────────────────────────────────────┘

Step 3: Initial Bounty
┌─────────────────────────────────────────┐
│ Fund truth-seeking                      │
│ ┌─────────────────────────────────────┐ │
│ │ $50  Suggested: $25-$100            │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ Payout: Community contributors get 90% │
│ Platform fee: 10% (for LLM & hosting)  │
│                                          │
│ [Create Quest →]                        │
└─────────────────────────────────────────┘
```

---

### 3. **LLM Forensic Analysis Pipeline**

When first evidence is submitted:

```python
# 1. Extract claims from evidence
claims = llm_extract_claims(evidence_text)
# Output: [
#   "Trump expected to raise Jimmy Lai case",
#   "Meeting scheduled for October 25",
#   "Prediction from Singapore news source"
# ]

# 2. Generate competing hypotheses
hypotheses = llm_generate_hypotheses(question, claims)
# Output: [
#   {
#     "statement": "Trump raised the issue privately, no public mention",
#     "reasoning": "Prediction suggests private discussion, no transcript evidence",
#     "initial_probability": 0.35
#   },
#   {
#     "statement": "Trump did not raise the issue",
#     "reasoning": "No official confirmation, prediction unverified",
#     "initial_probability": 0.30
#   },
#   {
#     "statement": "Coordinated information campaign",
#     "reasoning": "Conflicting claims suggest narrative manipulation",
#     "initial_probability": 0.20
#   },
#   ...
# ]

# 3. Assess evidence credibility
credibility = llm_assess_credibility(evidence)
# Output: {
#   "source_reliability": 0.7,  # Singapore Zaobao is credible
#   "evidence_type": "prediction",  # Not primary source
#   "confidence": 0.6,
#   "red_flags": ["unverified prediction", "no primary source"]
# }

# 4. Calculate initial probability distribution
probs = bayesian_initialize(hypotheses, evidence, credibility)

# 5. Store in database
for h in hypotheses:
    create_hypothesis(quest_id, h)
    record_probability_snapshot(quest_id, h.id, h.probability, "Initial evidence analysis")
```

**LLM Prompts:**

```python
CLAIM_EXTRACTION_PROMPT = """
Analyze this evidence and extract all factual claims:

Evidence: {evidence_text}

Return JSON:
{
  "claims": [
    {"claim": "...", "confidence": 0.0-1.0, "type": "factual|prediction|opinion"}
  ],
  "source_type": "primary|secondary|tertiary",
  "credibility_flags": ["flag1", "flag2"]
}
"""

HYPOTHESIS_GENERATION_PROMPT = """
Given this question and initial evidence, generate 3-5 competing hypotheses
that could explain the truth:

Question: {question}
Claims: {claims}

Requirements:
- Mutually exclusive explanations
- Cover high-probability scenarios
- Include "null hypothesis" (event didn't happen)
- Be specific and falsifiable

Return JSON:
{
  "hypotheses": [
    {
      "statement": "...",
      "reasoning": "...",
      "initial_probability": 0.0-1.0,
      "evidence_needed": ["type1", "type2"]
    }
  ]
}
"""

EVIDENCE_IMPACT_PROMPT = """
Analyze how this new evidence impacts each hypothesis:

Hypotheses: {hypotheses}
New Evidence: {evidence}

For each hypothesis, assess:
- Support (+), Refute (-), or Neutral (0)
- Impact strength (0.0-1.0)
- Reasoning

Return JSON:
{
  "impacts": [
    {
      "hypothesis_id": "h1",
      "direction": "support|refute|neutral",
      "strength": 0.0-1.0,
      "reasoning": "..."
    }
  ],
  "novelty_score": 0.0-1.0,
  "triggers_convergence": true|false
}
"""
```

---

### 4. **Evidence Submission & Probability Updates**

```
User Flow:
1. Community member finds new evidence
2. Submits URL + synopsis
3. LLM analyzes impact on all hypotheses
4. Bayesian update recalculates probabilities
5. Record probability snapshot
6. Update UI in real-time
7. Estimate contributor payout
```

**Bayesian Update Algorithm:**

```python
def update_probabilities(quest_id, new_evidence_id):
    """
    Recalculate all hypothesis probabilities given new evidence
    """
    # 1. Get current state
    hypotheses = get_hypotheses(quest_id)
    evidence = get_evidence(new_evidence_id)
    all_evidence = get_all_evidence(quest_id)

    # 2. LLM analyzes evidence impact
    impacts = llm_analyze_evidence_impact(hypotheses, evidence)

    # 3. Calculate likelihood ratios
    for h in hypotheses:
        impact = impacts[h.id]

        # Likelihood of this evidence if hypothesis is true
        p_e_given_h = calculate_likelihood(impact, evidence.credibility)

        # Update using Bayes' theorem
        prior = h.current_probability
        posterior = (p_e_given_h * prior) / marginal_likelihood

        h.probability_before = prior
        h.current_probability = posterior
        h.delta = posterior - prior

    # 4. Normalize to sum to 1.0
    normalize_probabilities(hypotheses)

    # 5. Calculate entropy (measure of uncertainty)
    entropy = calculate_entropy(hypotheses)

    # 6. Check convergence
    if max(h.current_probability for h in hypotheses) >= 0.8:
        trigger_convergence(quest_id, hypotheses)

    # 7. Record snapshot
    for h in hypotheses:
        record_probability_event(
            quest_id, h.id,
            h.probability_before, h.current_probability,
            trigger_type="new_evidence",
            trigger_id=new_evidence_id,
            entropy_after=entropy
        )

    # 8. Update contributor rewards estimate
    update_payout_estimates(quest_id)

def calculate_likelihood(impact, credibility):
    """
    How likely is this evidence if hypothesis is true?

    Strong support + high credibility → high likelihood (0.8-0.9)
    Weak support + low credibility → medium likelihood (0.5-0.6)
    Refuting + high credibility → low likelihood (0.1-0.2)
    """
    base_likelihood = {
        "strong_support": 0.85,
        "moderate_support": 0.65,
        "neutral": 0.50,
        "moderate_refute": 0.35,
        "strong_refute": 0.15
    }[impact.strength_category]

    # Adjust by credibility
    adjusted = base_likelihood * credibility.score

    return adjusted

def calculate_entropy(hypotheses):
    """
    Shannon entropy: H = -Σ(p * log₂(p))

    High entropy (near 1.0) = high uncertainty
    Low entropy (near 0.0) = low uncertainty, convergence likely
    """
    entropy = 0
    for h in hypotheses:
        if h.current_probability > 0:
            entropy -= h.current_probability * math.log2(h.current_probability)

    # Normalize to 0-1 scale
    max_entropy = math.log2(len(hypotheses))
    return entropy / max_entropy if max_entropy > 0 else 0
```

---

### 5. **Convergence Detection & Resolution**

```python
def check_convergence(quest_id):
    """
    Detect when truth has converged
    """
    hypotheses = get_hypotheses(quest_id)
    entropy = calculate_entropy(hypotheses)

    # Convergence criteria
    winner = max(hypotheses, key=lambda h: h.current_probability)

    converged = (
        winner.current_probability >= 0.80 and  # 80% threshold
        entropy < 0.3 and  # Low uncertainty
        len(get_all_evidence(quest_id)) >= 5 and  # Minimum evidence
        time_stable(winner, hours=24)  # Stable for 24h
    )

    if converged:
        resolve_quest(quest_id, winner.id)

def resolve_quest(quest_id, winning_hypothesis_id):
    """
    Quest resolved, distribute rewards
    """
    quest = get_quest(quest_id)
    winner = get_hypothesis(winning_hypothesis_id)

    # 1. Mark as resolved
    quest.status = "converged"
    quest.converged_at = datetime.utcnow()
    quest.winning_hypothesis_id = winning_hypothesis_id
    quest.winning_probability = winner.current_probability

    # 2. Calculate contributor rewards
    total_pool = quest.total_bounty
    platform_fee = total_pool * (quest.platform_fee_percent / 100)
    payout_pool = total_pool - platform_fee

    contributors = calculate_contributor_rewards(quest_id, payout_pool)

    # 3. Distribute payouts
    for contrib in contributors:
        payout = contrib.total_reward
        contrib.paid_out = True
        contrib.paid_at = datetime.utcnow()

        # Transfer credits to user account
        user = get_user(contrib.user_id)
        user.balance += payout

        # Record transaction
        create_transaction(
            user_id=contrib.user_id,
            amount=payout,
            type="quest_payout",
            quest_id=quest_id,
            description=f"Contribution reward for '{quest.title}'"
        )

    # 4. Notify community
    notify_quest_resolution(quest_id, winner)

    # 5. Update platform stats
    update_platform_stats()

def calculate_contributor_rewards(quest_id, payout_pool):
    """
    Distribute rewards based on contribution quality
    """
    evidence_list = get_all_evidence(quest_id)

    # Calculate scores for each piece of evidence
    for evidence in evidence_list:
        # Base score: clarity contribution
        score = evidence.clarity_contribution

        # Bonus: novelty (first to introduce key claim)
        if evidence.novelty_score > 0.7:
            score *= 1.5

        # Bonus: early submission
        submission_rank = get_submission_rank(evidence)
        if submission_rank <= 5:
            score *= (1.0 + (6 - submission_rank) * 0.1)

        # Bonus: community validation
        vote_ratio = evidence.upvotes / (evidence.upvotes + evidence.downvotes + 1)
        if vote_ratio > 0.7:
            score *= 1.2

        # Penalty: low quality
        if evidence.downvotes > evidence.upvotes:
            score *= 0.5

        evidence.contribution_score = score

    # Normalize scores to payout pool
    total_score = sum(e.contribution_score for e in evidence_list)

    contributors = {}
    for evidence in evidence_list:
        user_id = evidence.submitted_by
        payout = (evidence.contribution_score / total_score) * payout_pool

        if user_id not in contributors:
            contributors[user_id] = {
                "user_id": user_id,
                "evidence_ids": [],
                "total_reward": 0.0
            }

        contributors[user_id]["evidence_ids"].append(evidence.id)
        contributors[user_id]["total_reward"] += payout

    return list(contributors.values())
```

---

## 🎨 PHASE 4: UI/UX Updates

### New Homepage Component

```typescript
// HomePage.tsx
interface Quest {
  id: string
  title: string
  description: string
  bounty: number
  status: 'active' | 'converged' | 'resolved'
  entropy: number
  convergence_probability: number
  evidence_count: number
  participant_count: number
  time_remaining: string
  leading_hypothesis: {
    statement: string
    probability: number
  }
}

const HomePage = () => {
  return (
    <div>
      <Header />
      <CreateQuestButton />
      <QuestFeed filter="trending" />
      <QuestFeed filter="needs_evidence" />
      <QuestFeed filter="recently_resolved" />
    </div>
  )
}
```

### Quest Creation Wizard

```typescript
// CreateQuestWizard.tsx
const CreateQuestWizard = () => {
  const [step, setStep] = useState(1)
  const [question, setQuestion] = useState('')
  const [evidence, setEvidence] = useState('')
  const [bounty, setBounty] = useState(50)
  const [analyzing, setAnalyzing] = useState(false)

  const handleSubmit = async () => {
    // 1. Create quest
    const quest = await createQuest({ question, bounty })

    // 2. Submit initial evidence
    if (evidence) {
      await submitEvidence(quest.id, evidence)
    }

    // 3. Trigger LLM analysis
    await triggerLLMAnalysis(quest.id)

    // 4. Redirect to quest page
    navigate(`/quest/${quest.id}`)
  }
}
```

---

## 📊 PHASE 5: LLM Integration Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Frontend                                                │
│  ┌──────────────┐                                       │
│  │ User submits │                                       │
│  │  evidence    │                                       │
│  └───────┬──────┘                                       │
└──────────┼──────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────┐
│  FastAPI Backend                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ POST /api/evidence                                │  │
│  │ → Store in SQLite                                 │  │
│  │ → Enqueue LLM job                                 │  │
│  └───────────────────────┬──────────────────────────┘  │
└────────────────────────────┼───────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│  LLM Analysis Worker (Celery/Background Task)           │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 1. Extract claims                                 │  │
│  │ 2. Assess credibility                             │  │
│  │ 3. Calculate impact on hypotheses                 │  │
│  │ 4. Update probabilities (Bayesian)                │  │
│  │ 5. Record probability snapshot                    │  │
│  │ 6. Check convergence                              │  │
│  │ 7. Notify frontend (WebSocket)                    │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**LLM Provider Options:**
- OpenAI GPT-4 (most capable, expensive)
- Anthropic Claude (strong reasoning, good value)
- Open source (Llama 3, Mixtral - cheaper, self-hosted)

**Cost Optimization:**
- Use cheaper models for claim extraction
- Use advanced models for hypothesis generation
- Cache common analyses
- Batch process when possible

---

## 💰 PHASE 6: Economics & Incentives

### Reward Formula

```
Contributor Payout =
    Base Reward (clarity contribution) +
    Novelty Bonus (new information) +
    Early Bird Bonus (submission rank) +
    Quality Bonus (community votes) +
    Validation Bonus (expert confirmation)

Platform Fee = 10% of total bounty
- 5% → LLM API costs
- 3% → Infrastructure
- 2% → Development fund
```

### Example Payout Scenario

```
Quest: "Did Trump raise Jimmy Lai case?"
Total Bounty: $1,200
Evidence Submitted: 8 pieces

Payout Pool: $1,200 * 0.90 = $1,080

Evidence #1 (Zaobao prediction) - User A
- Clarity: +12% → $200
- Early Bird: 1st → +$40
- Novelty: High → +$60
- Total: $300

Evidence #4 (Family sources) - User D
- Clarity: +20% → $320
- Novelty: High → +$80
- Quality: 15 upvotes → +$50
- Total: $450

Evidence #2 (Official transcript) - User B
- Clarity: +15% → $240
- Early Bird: 2nd → +$30
- Total: $270

Other evidence: $60 split

Platform keeps: $120 (10%)
```

---

## 🚀 PHASE 7: Implementation Roadmap

### Sprint 1: Foundation (2 weeks)
- [ ] Update database schema
- [ ] Create Quest model & CRUD operations
- [ ] Build homepage with quest feed
- [ ] Implement quest creation wizard

### Sprint 2: LLM Pipeline (3 weeks)
- [ ] Integrate LLM API (Claude/GPT-4)
- [ ] Build claim extraction
- [ ] Build hypothesis generation
- [ ] Build evidence impact analysis
- [ ] Add background job queue (Celery)

### Sprint 3: Probability Engine (2 weeks)
- [ ] Implement Bayesian update algorithm
- [ ] Build entropy calculation
- [ ] Create convergence detection
- [ ] Add probability event logging

### Sprint 4: Rewards System (2 weeks)
- [ ] Implement payout calculation
- [ ] Build contributor scoring
- [ ] Add automated distribution
- [ ] Create transaction ledger

### Sprint 5: UI Polish (2 weeks)
- [ ] Quest detail page redesign
- [ ] Real-time probability updates
- [ ] Convergence celebration UI
- [ ] User profile & earnings dashboard

### Sprint 6: Scale & Optimize (2 weeks)
- [ ] Database indexing
- [ ] Caching layer (Redis)
- [ ] LLM cost optimization
- [ ] Load testing

---

## 📐 Technical Stack Additions

**Backend:**
- Celery + Redis (background jobs)
- SQLAlchemy (ORM for complex queries)
- LangChain (LLM orchestration)
- WebSocket (real-time updates)

**Frontend:**
- React Query (server state)
- Zustand (client state)
- Recharts (probability viz)
- Socket.io (real-time)

**Infrastructure:**
- PostgreSQL (production DB, migrate from SQLite)
- Redis (cache + job queue)
- Docker Compose (local dev)
- Railway/Fly.io (deployment)

---

## 🎯 Success Metrics

**Platform Health:**
- Active quests: 100+ simultaneous
- Average time to convergence: 7-14 days
- Evidence per quest: 10-20 submissions
- Participant retention: 40%+

**Quality Metrics:**
- Convergence accuracy: 85%+ (validated post-hoc)
- LLM analysis quality: 90%+ useful
- Community satisfaction: 4+ stars

**Economic Health:**
- Average bounty: $50-$500
- Platform fees cover costs + 20% margin
- Contributor earnings: $10-$1000/month for active users
- Payment success rate: 99.9%

---

## 🎬 Next Steps

1. **Approve this plan** - Review and provide feedback
2. **Start Sprint 1** - Database schema upgrade
3. **LLM integration test** - Validate prompts with real data
4. **MVP target** - Single quest end-to-end with LLM

Would you like me to start implementing Sprint 1 (database schema + homepage)?
