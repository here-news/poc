# Epistemic - Unified Community Platform

**Status:** 🎨 Design Phase (v0.1)
**Last Updated:** November 2025

---

## Overview

**Epistemic** is a unified platform that merges story discovery with evidence-based discourse. Users investigate concerns (stories, events, people, organizations) through structured quests, earning reputation and credits for quality contributions.

### **Core Features**
- 📰 **Concerns Feed** - Discover trending topics across multiple content types
- 🎯 **Quest System** - Evidence-based investigations with hypotheses
- 💬 **Community Discourse** - Support/refute evidence with threaded comments
- 🏆 **Reputation System** - Earn epistemic reputation through quality contributions
- 💰 **Credit Rewards** - Get rewarded when quests resolve
- 🕸️ **Knowledge Graph** - Explore entity relationships via Neo4j

---

## Project Structure

```
epistemic/
├── README.md              # This file
├── docs/
│   └── DESIGN_v0.1.md    # Comprehensive design document
├── mockups/
│   ├── 01-homepage.txt   # Homepage mockup (ASCII)
│   └── 02-quest-detail.txt # Quest detail mockup
└── schemas/
    └── database_schema_v0.1.sql  # PostgreSQL schema
```

---

## Key Concepts

### **Concerns**
Unified content types: Stories, Events, People, Organizations, Reports, Polls, Quests

### **Quests**
Structured investigations with:
- Clear question
- Competing hypotheses with probabilities
- Community-submitted evidence
- Credit bounty pool

### **Evidence**
User contributions scored by:
- Source credibility
- Novelty (new information?)
- Clarity contribution (reduces uncertainty?)
- Curator reputation

### **Reputation**
Users build epistemic reputation through:
- High-quality evidence submissions
- Accurate predictions
- Helpful comments
- Being on "winning side" of resolved quests

---

## Getting Started

### **Current Status: Design Phase**

We're currently in the design and mockup phase. Before implementation:

1. ✅ Review `docs/DESIGN_v0.1.md`
2. ✅ Check mockups in `mockups/`
3. ✅ Review database schema in `schemas/`
4. 🔲 Gather feedback from stakeholders
5. 🔲 Refine designs based on feedback
6. 🔲 Create high-fidelity UI mockups
7. 🔲 Begin Phase 1 implementation

---

## Tech Stack (Planned)

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend** | React + Vite + TypeScript | Modern, type-safe, fast |
| **Backend** | FastAPI (Python) | Async, ML-friendly |
| **Database** | PostgreSQL | ACID, complex queries |
| **Graph DB** | Neo4j | Entity relationships |
| **AI/LLM** | OpenAI API | Hypothesis generation |
| **Real-time** | WebSockets | Live updates |

---

## Implementation Phases

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| **Phase 0** | 1 week | Design docs, mockups, schemas ✅ |
| **Phase 1** | 3 weeks | Core models, concerns feed, quest view |
| **Phase 2** | 4 weeks | Evidence submission, comments, voting |
| **Phase 3** | 3 weeks | Neo4j integration, entity graph |
| **Phase 4** | 3 weeks | Reputation, credits, payouts |
| **Phase 5** | 2 weeks | Polish, launch |

**Estimated MVP:** 15 weeks

---

## Related Apps

This unified app builds on:
- **storychat** - Story discovery and discussion interface
- **jimmylai** - Quest-based truth market with evidence tracking

---

## Documentation

- **Design Doc:** [`docs/DESIGN_v0.1.md`](docs/DESIGN_v0.1.md) - Full product specification
- **Mockups:** [`mockups/`](mockups/) - UI wireframes and flows
- **Schema:** [`schemas/database_schema_v0.1.sql`](schemas/database_schema_v0.1.sql) - Database design

---

## Questions & Feedback

Open issues or questions to address:
- [ ] Authentication strategy (OAuth vs custom)
- [ ] Moderation approach (community vs admin)
- [ ] Credits: Internal reputation or real money?
- [ ] Content migration from storychat/jimmylai?
- [ ] Expected scale (users, quests, evidence per day)

---

## Next Steps

1. **Review & Refine**
   - Stakeholder review of design doc
   - User research/interviews
   - Competitive analysis

2. **Prototype Key Flows**
   - Evidence submission UX
   - Hypothesis probability visualization
   - Knowledge graph exploration

3. **Technical Validation**
   - Prove Neo4j + PostgreSQL integration
   - Test LLM hypothesis generation
   - Validate WebSocket real-time updates

4. **Begin Implementation**
   - Set up project structure
   - Phase 1.1: Core data models
   - Phase 1.2: Concerns feed

---

**Contact:** [Your contact info]
**Repository:** `/media/im3/plus/lab4/re_news/apps/epistemic/`
