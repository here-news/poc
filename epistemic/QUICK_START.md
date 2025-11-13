# Epistemic - Quick Start Guide

**TL;DR:** Unified platform combining story discovery (storychat) + evidence-based quests (jimmylai) with reputation and rewards.

---

## 📁 What's in This Folder?

```
epistemic/
├── README.md              ← Start here
├── QUICK_START.md        ← You are here
├── docs/
│   └── DESIGN_v0.1.md   ← Full design doc (50+ pages worth)
├── mockups/
│   ├── 01-homepage.txt   ← Homepage layout
│   └── 02-quest-detail.txt ← Quest page layout
└── schemas/
    └── database_schema_v0.1.sql ← PostgreSQL schema
```

---

## 🎯 Core Idea (30-second pitch)

**Problem:** People want to understand complex topics but get lost in opinion wars and unreliable sources.

**Solution:** Epistemic combines:
1. **Concerns feed** (stories, events, people, orgs) ← From storychat
2. **Quest investigations** (evidence + hypotheses) ← From jimmylai
3. **Reputation system** (earn credits for quality contributions)
4. **Knowledge graph** (explore entity connections via Neo4j)

**Result:** A community that collaboratively investigates truth through structured evidence-based discourse.

---

## 🏗️ What Gets Built?

### **Left Panel: Concerns Feed**
```
🔥 Hot Topics
─────────────
📰 Trump-Epstein emails released
📅 US Mint stops penny production
👤 Who is Jimmy Lai?
🏢 OpenAI leadership changes
📊 [Poll] Do you think...?
```

### **Right Panel: Quest View**
```
🎯 Trump-Epstein Connection?
─────────────────────────────
Hypotheses:
├─ H1: Close friends (58%) ████████░░
└─ H2: Business only (42%) ██████░░░░

Evidence Timeline:
├─ 📄 Flight logs (EV: 0.85) @bob ↑45
└─ 🎥 Interview (EV: 0.62) @alice ↑23
```

---

## 📊 Data Architecture

### **PostgreSQL (RDB)**
- Users & reputation
- Quests & hypotheses
- Evidence & comments
- Credits & transactions

### **Neo4j (Graph DB)**
- Entities (Person, Org, Event)
- Relationships (MENTIONS, WORKS_FOR)
- Knowledge graph queries

### **Why both?**
- **RDB:** Transactions, community activity, reputation scores
- **Graph:** Entity relationships, topic discovery, "Who's connected to X?"

---

## 🎮 User Flows

### **Flow 1: Read & Engage**
```
User lands → Sees hot topics → Clicks story
→ Sees quest with evidence → Upvotes helpful evidence
→ Leaves comment → Earns 2 credits
```

### **Flow 2: Submit Evidence**
```
User finds relevant info → Submits to quest
→ LLM analyzes quality → Evidence appears in timeline
→ Community upvotes → Reputation increases
→ Quest resolves → Earns 50 credits from bounty
```

### **Flow 3: Explore Graph**
```
Reading about Trump → Clicks "Trump" entity
→ Neo4j graph shows connections → Finds Epstein node
→ Discovers related quests → Joins investigation
```

---

## 💎 Reputation System

Users earn **epistemic reputation** through:
- ✅ Submitting high-value evidence
- ✅ Accurate predictions (supporting winning hypotheses)
- ✅ Helpful comments (upvoted by community)
- ✅ Consistent quality over time

**Reputation unlocks:**
- More voting weight
- Ability to create quests
- Moderation privileges
- Higher credit earnings

---

## 💰 Credit System

**Earn credits:**
- Submit evidence → Proportional to epistemic value
- Quest payouts → Share of bounty when resolved
- Comment upvotes → Small rewards
- Accuracy bonuses → Extra for being right

**Future uses:**
- Unlock premium features
- Donate to causes
- Convert to real value (?)

---

## 🚀 Implementation Timeline

| Phase | Duration | Key Features |
|-------|----------|--------------|
| **0: Design** | 1 week | ✅ Docs, mockups, schemas |
| **1: Foundation** | 3 weeks | Core models, concerns feed, quest view |
| **2: Community** | 4 weeks | Evidence, comments, voting |
| **3: Graph** | 3 weeks | Neo4j integration, entity pages |
| **4: Rewards** | 3 weeks | Reputation, credits, payouts |
| **5: Polish** | 2 weeks | UX, performance, launch |

**MVP:** ~15 weeks

---

## 📋 Next Actions

- [ ] **Review** `docs/DESIGN_v0.1.md`
- [ ] **Check** mockups in `mockups/`
- [ ] **Validate** database schema
- [ ] **Discuss** open questions:
  - Authentication strategy?
  - Moderation approach?
  - Real money or just reputation?
  - Import storychat/jimmylai data?
- [ ] **Approve** design to proceed to Phase 1

---

## ❓ Open Questions

1. **Auth:** OAuth (Google/GitHub) or custom email/password?
2. **Moderation:** Community flags + AI detection? Or admin-only?
3. **Credits:** Internal points or allow real money redemption?
4. **Scale:** Expected users? (100s? 1000s? 10000s?)
5. **Content:** Import existing stories and quests from storychat/jimmylai?
6. **Monetization:** Free? Ads? Subscriptions? Credit purchases?

---

## 🔗 Related Docs

- **Full Design:** [`docs/DESIGN_v0.1.md`](docs/DESIGN_v0.1.md)
- **Database Schema:** [`schemas/database_schema_v0.1.sql`](schemas/database_schema_v0.1.sql)
- **Mockups:** [`mockups/`](mockups/)

---

**Ready to start building?** Let's go! 🚀
