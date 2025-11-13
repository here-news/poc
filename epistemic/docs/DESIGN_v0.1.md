# Epistemic - Unified Community Platform (v0.1 Design)

**Status:** 🎨 Design Phase
**Created:** November 2025
**Authors:** Claude Code, Product Team

---

## Executive Summary

**Epistemic** is a unified platform that combines story discovery with evidence-based discourse, enabling communities to collaboratively investigate concerns through structured quests, while building reputation through meaningful contributions.

### **Core Innovation**
Merge the **concern feed** (stories, events, people, orgs) with **quest-based investigations** (evidence, hypotheses, payouts) to create an engaging epistemic community where users earn reputation and credits for quality contributions.

---

## Vision & Goals

### **Product Vision**
Create a platform where:
- Users discover **concerns** (hot topics) that matter
- Engage through **quests** (evidence-based investigations)
- Participate via **polls** (quick opinions) and **comments** (discussions)
- Build **reputation** through quality contributions
- Earn **credits** that reward epistemic value

### **User Value Propositions**

**For Readers:**
- Discover trending topics across multiple formats (stories, events, people)
- See evidence-based discussions instead of opinion wars
- Follow knowledge graphs to explore connections

**For Contributors:**
- Submit evidence and earn reputation
- Participate in collaborative truth-seeking
- Get rewarded when investigations resolve

**For Investigators:**
- Create quests to investigate unclear topics
- Watch hypotheses evolve with evidence
- See community consensus emerge

---

## Core Concepts

### **1. Concerns** (Content Types)

A **concern** is any topic worthy of community attention:

| Type | Description | Example | Primary Interaction |
|------|-------------|---------|---------------------|
| **Story** | News article | "Trump-Epstein emails released" | Quest, Poll, Comments |
| **Event** | Real-world occurrence | "US Mint stops penny production" | Quest, Timeline |
| **Person** | Individual entity | "Who is Jimmy Lai?" | Quest, Bio, Graph |
| **Organization** | Company/institution | "OpenAI leadership changes" | Quest, Relationships |
| **Report** | Long-form document | "2024 Climate Report" | Quest, Evidence extraction |
| **Poll** | Community vote | "Do you think Trump engaged with Epstein?" | Vote, Escalate to Quest |
| **Quest** | Open investigation | "Trump-Epstein Connection?" | Evidence, Hypotheses |

### **2. Quests** (Investigations)

A **quest** is a structured investigation with:
- **Question:** Clear investigation goal
- **Hypotheses:** Competing explanations with probabilities
- **Evidence:** Community-submitted sources with epistemic scores
- **Bounty:** Credit pool distributed to contributors
- **Status:** Active → Converged → Resolved

### **3. Evidence** (Contributions)

**Evidence** is user-submitted information:
- **Source:** URL or document
- **Synopsis:** Brief summary
- **Type:** News, court doc, academic paper, video, etc.
- **Epistemic Value:** Quality score (0-1) based on:
  - Source credibility
  - Novelty (new information?)
  - Clarity contribution (reduces uncertainty?)
  - Curator reputation
  - Truth alignment (when quest resolves)

### **4. Reputation System**

**Users earn reputation through:**
- ✅ Submitting high-value evidence
- ✅ Accurate voting on evidence quality
- ✅ Helpful comments (upvoted by community)
- ✅ Being on "winning side" of resolved quests

**Reputation affects:**
- ✅ Weight of your votes
- ✅ Visibility of your contributions
- ✅ Credit earnings multiplier
- ✅ Unlock features (create quests, moderate)

### **5. Credits** (Rewards)

**Credits (C)** are earned through contributions:
- **Evidence rewards:** Proportional to epistemic value
- **Quest payouts:** Share of bounty when quest resolves
- **Comment upvotes:** Small rewards for helpful discussion
- **Accuracy bonuses:** Extra credits for supporting winning hypotheses

**Future:** Credits could be redeemable for perks, donations, or converted to real value.

---

## User Experience Flows

### **Flow 1: Casual Reader**
```
1. Land on homepage → See hot concerns feed
2. Click interesting story: "Epstein emails"
3. See ongoing quest with 2 competing hypotheses
4. Read evidence timeline with community comments
5. Upvote helpful evidence
6. Leave supporting comment → Earn 2C
```

### **Flow 2: Evidence Contributor**
```
1. Browse concerns → Find active quest
2. "I have relevant information!"
3. Submit evidence: URL + synopsis
4. LLM analyzes → Assigns novelty & clarity scores
5. Evidence appears in timeline
6. Community upvotes → Reputation increases
7. Quest resolves → Earn 50C from bounty pool
```

### **Flow 3: Quest Creator**
```
1. See polarizing poll: "Trump-Epstein?" (52% vs 48%)
2. Click "Escalate to Quest"
3. LLM generates 2-3 hypotheses
4. Add bounty: 100C
5. Community submits evidence
6. Watch probabilities evolve
7. Quest converges → Credits distributed
```

### **Flow 4: Knowledge Explorer**
```
1. Reading story about Trump
2. Click "Trump" entity tag
3. Neo4j graph appears: Trump → [Epstein, Putin, Musk, ...]
4. Click "Epstein" node
5. See all related concerns, quests, evidence
6. Discover new investigation to follow
```

---

## Information Architecture

### **Navigation Structure**

```
┌─────────────────────────────────────────────┐
│ HEADER: Logo | Search | Notifications | Me  │
├─────────────────────────────────────────────┤
│ MAIN LAYOUT (2-column)                      │
│ ┌──────────────┬──────────────────────────┐ │
│ │ LEFT PANEL   │ RIGHT PANEL              │ │
│ │              │                          │ │
│ │ Concerns     │ Concern Detail           │ │
│ │ Feed         │ + Quest View             │ │
│ │              │ + Evidence Timeline      │ │
│ │ - Hot Topics │ + Comment Tree           │ │
│ │ - Stories    │                          │ │
│ │ - Events     │                          │ │
│ │ - People     │                          │ │
│ │ - Orgs       │                          │ │
│ │ - Quests     │                          │ │
│ └──────────────┴──────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### **Page Types**

1. **Homepage** (`/epistemic/`)
   - Concerns feed (left)
   - Featured quest (right)
   - Filters: Hot, New, Trending, Type

2. **Concern Detail** (`/epistemic/concern/{id}`)
   - Concern metadata (left)
   - Active quest for this concern (right)
   - Related concerns (bottom)

3. **Quest Detail** (`/epistemic/quest/{id}`)
   - Full-width quest view
   - Hypotheses with probability charts
   - Evidence timeline
   - Comment threads

4. **Entity Page** (`/epistemic/entity/{id}`)
   - Entity info (bio, description)
   - Neo4j graph visualization
   - Related concerns and quests
   - Recent activity

5. **User Profile** (`/epistemic/user/{id}`)
   - Reputation score & rank
   - Credit balance
   - Contribution history
   - Badges & achievements

6. **Leaderboard** (`/epistemic/leaderboard`)
   - Top contributors by reputation
   - Recent payouts
   - Rising stars (new users with high quality)

---

## Data Models (Conceptual)

### **Concern Model**
```typescript
interface Concern {
  id: string;
  type: 'story' | 'event' | 'person' | 'org' | 'report' | 'poll' | 'quest';
  title: string;
  description: string;
  neo4j_node_id?: string;  // Link to knowledge graph
  heat_score: number;      // Trending algorithm score
  created_at: Date;
  status: 'active' | 'archived' | 'resolved';

  // Polymorphic fields based on type
  metadata: {
    // For stories
    url?: string;
    source?: string;
    published_at?: Date;

    // For events
    event_date?: Date;
    location?: string;

    // For polls
    options?: PollOption[];
    total_votes?: number;
  };
}
```

### **Quest Model**
```typescript
interface Quest {
  id: string;
  concern_id: string;
  title: string;
  description: string;
  total_bounty: number;      // Credits available
  status: 'active' | 'converged' | 'resolved';
  created_by: string;
  created_at: Date;
  converged_at?: Date;
  resolved_at?: Date;
  winning_hypothesis_id?: string;

  hypotheses: Hypothesis[];
  evidence: Evidence[];
}
```

### **Evidence Model**
```typescript
interface Evidence {
  id: string;
  quest_id: string;
  submitted_by: string;
  source_url: string;
  synopsis: string;
  source_type: 'news' | 'academic' | 'court_doc' | 'video' | 'other';

  // Epistemic quality scores
  epistemic_value: number;        // 0-1, final score
  source_credibility: number;     // 0-1
  novelty_score: number;          // 0-1
  clarity_contribution: number;   // ΔClarity
  curator_reputation: number;     // Submitter's reputation
  truth_alignment_score?: number; // After quest resolves

  upvotes: number;
  downvotes: number;
  submitted_at: Date;

  comments: Comment[];
}
```

### **User Model**
```typescript
interface User {
  id: string;
  username: string;
  email: string;

  // Reputation system
  epistemic_reputation: number;   // 0-10 scale
  total_credits: number;          // Earned credits
  rank: string;                   // 'Novice', 'Contributor', 'Expert', 'Master'

  // Stats
  evidence_submitted: number;
  quests_participated: number;
  accuracy_rate: number;          // % on winning side

  created_at: Date;
  badges: Badge[];
}
```

---

## Technical Architecture

### **Tech Stack**

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | React + Vite + TypeScript | Fast, modern, type-safe |
| **Backend** | FastAPI (Python) | Async, fast, easy ML integration |
| **Database** | PostgreSQL | ACID, complex queries, JSONB support |
| **Graph DB** | Neo4j | Entity relationships, graph queries |
| **Cache** | Redis (optional) | Hot concerns, real-time data |
| **AI/LLM** | OpenAI API | Hypothesis generation, evidence analysis |
| **WebSockets** | Socket.io / FastAPI WebSocket | Real-time updates |

### **Data Flow**

```
User → Frontend (React) → API (FastAPI) → Services
                                            ├─→ PostgreSQL (users, quests, evidence)
                                            ├─→ Neo4j (entities, relationships)
                                            └─→ LLM Service (analysis)
```

### **Key Services**

1. **Concern Service** - CRUD for concerns, heat scoring
2. **Quest Service** - Quest lifecycle, hypothesis tracking
3. **Evidence Service** - Submission, scoring, ranking
4. **Reputation Service** - Calculate user reputation
5. **Credit Service** - Transactions, payouts
6. **Neo4j Service** - Entity queries, graph traversal
7. **LLM Service** - Hypothesis generation, evidence analysis
8. **Notification Service** - Real-time updates via WebSocket

---

## UI/UX Mockups

See `mockups/` directory for:
- `01-homepage.png` - Concerns feed + featured quest
- `02-concern-detail.png` - Concern with quest view
- `03-quest-detail.png` - Full quest interface
- `04-entity-graph.png` - Neo4j graph visualization
- `05-user-profile.png` - User reputation dashboard

*(To be created as ASCII mockups or wireframes)*

---

## Success Metrics

### **Engagement Metrics**
- Daily Active Users (DAU)
- Evidence submissions per day
- Comments per quest
- Average session duration

### **Quality Metrics**
- Average epistemic value of evidence
- Quest resolution rate (% reaching convergence)
- User retention rate
- Reputation distribution (avoid power users dominating)

### **Community Health**
- Diversity of contributors (Gini coefficient)
- Civil discourse rate (low toxicity)
- Evidence citation rate (how often evidence is referenced)
- Cross-concern exploration (users following entity links)

---

## Implementation Phases (Summary)

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| **Phase 0** | 1 week | Design doc, mockups, schema design |
| **Phase 1** | 3 weeks | Core models, concerns feed, quest view |
| **Phase 2** | 4 weeks | Evidence submission, comments, votes |
| **Phase 3** | 3 weeks | Neo4j integration, entity graph |
| **Phase 4** | 3 weeks | Reputation system, credits, payouts |
| **Phase 5** | 2 weeks | Polish, performance, launch |

**Total MVP: ~15 weeks**

---

## Open Questions

1. **Authentication:** Build custom auth or use OAuth (Google, GitHub)?
2. **Moderation:** How to handle misinformation flags? Community voting? AI detection?
3. **Credits:** Keep as internal reputation or allow real money redemption?
4. **Content:** Import existing storychat stories and jimmylai quests?
5. **Monetization:** Ads? Subscriptions? Credit purchases? Or stay free?
6. **Mobile:** Web-first or native apps needed?
7. **Scalability:** Expected user base? (10s, 100s, 1000s, 10000s?)

---

## Next Steps

- [ ] Review and refine this design doc
- [ ] Create UI mockups (wireframes or high-fidelity)
- [ ] Design detailed database schemas
- [ ] Prototype key interactions (evidence submission flow)
- [ ] Validate with potential users
- [ ] Begin Phase 1 implementation

---

**Document Version:** v0.1
**Last Updated:** November 2025
**Status:** Draft for review
