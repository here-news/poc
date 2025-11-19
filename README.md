# φ HERE - Coherence-First News Platform

**Fresh Start - November 18, 2025**

## Vision

A news curation platform that ranks stories by **epistemic coherence** rather than popularity or funding.

### TCF Algorithm (70-20-10)
- **70% Coherence**: How well stories connect to the knowledge graph
- **20% Timeliness**: Recent stories matter more
- **10% Funding**: Logarithmic to prevent whale dominance

## Architecture

**Simple. Clean. Direct.**

```
Single FastAPI Container (Port 7272)
├── / → Teaser landing page
├── /app → Full application (login + feed)
├── /api/* → All API endpoints
└── /app/assets/* → Frontend static files
```

**No nginx. No multi-app routing. No complexity.**

## Tech Stack

### Backend
- **FastAPI** - Python async web framework
- **Neo4j** (remote) - Knowledge graph database
- **SQLite** - User data and local state
- **Google OAuth** - Authentication

### Frontend
- **Vite + TypeScript** - Modern build tooling
- **Lit** - Lightweight web components
- **Tailwind CSS** - Utility-first styling

### Data Sources
- Remote Neo4j database with 15K+ nodes, 39K+ relationships
- Jimmy Lai timeline data (political case study)
- Coherence calculations from graph analysis

## Key Services

### Coherence Service
Calculates epistemic value based on:
1. **Entity Overlap**: Shared entities with knowledge graph
2. **Graph Centrality**: Hub entities weighted higher
3. **Claim Density**: More verifiable claims = higher value

### TCF Feed Service
Ranks stories using weighted formula:
```
TCF = 0.7 * coherence + 0.2 * timeliness + 0.1 * funding
```

## Environment Variables

```bash
# OAuth
GOOGLE_CLIENT_ID=<your-client-id>
GOOGLE_CLIENT_SECRET=<your-client-secret>
GOOGLE_REDIRECT_URI=http://localhost:7272/api/auth/callback

# Database
DATABASE_URL=sqlite:///./data/app.db
NEO4J_URI=<remote-neo4j-uri>
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=<password>

# Security
JWT_SECRET_KEY=<generate-secure-key>
```

## Development Plan

### Phase 1: Minimal Backend ✓
- [x] FastAPI app with clean routing
- [x] OAuth authentication
- [x] Neo4j connection
- [x] Coherence calculations
- [x] TCF feed algorithm

### Phase 2: Clean Frontend (Current)
- [ ] Teaser page at `/`
- [ ] App at `/app` with login
- [ ] Coherence feed display
- [ ] Story cards with TCF scores

### Phase 3: Polish
- [ ] User credits system
- [ ] Story submission
- [ ] Quest system integration

## What We Learned from `apps/epistemic/`

**Things to avoid:**
- ❌ Complex nginx routing with multiple apps
- ❌ Hardcoded `/epistemic/` paths everywhere
- ❌ Mixing old quest system with new coherence feed
- ❌ Building before clarifying architecture

**What works:**
- ✅ Single container, direct port access
- ✅ Clean API paths (`/api/*`)
- ✅ Separate teaser (public) from app (authenticated)
- ✅ Remote Neo4j for shared knowledge graph
- ✅ TCF algorithm with 70-20-10 weighting

## Quick Start

```bash
# 1. Set up environment
cp .env.example .env
# Edit .env with your credentials

# 2. Build and run
docker compose up -d

# 3. Access
# http://localhost:7272/ - Teaser
# http://localhost:7272/app - Full app (requires login)
# http://localhost:7272/api/coherence/feed - API
```

## Philosophy

**Coherence Above All**

We rank stories by how much they reduce uncertainty and connect to existing knowledge, not by clicks, shares, or advertising dollars.

The platform rewards:
- Evidence-backed journalism
- Stories that connect disparate facts
- Claims that can be verified
- Entities that appear in multiple contexts

---

*Fresh start. Clean slate. Coherence-first.*
