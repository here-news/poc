# 🎯 Handoff Document - φ HERE Platform

**Date**: 2025-11-18
**Status**: Ready for fresh build
**Target**: Working prototype on port 7272

---

## What Was Done

### 1. Cleanup Complete ✅

- **Stopped all legacy containers** from `apps/` directory
- **Removed all legacy images**: epistemic, storychat, jimmylai, gateway, apps-*
- **Pruned Docker**: Freed 19.74GB of space
- **Clean slate**: Only story-engine-here container remains (unrelated project)

### 2. Fresh Directory Created ✅

Location: `/media/im3/plus/lab4/re_news/webapp/`

**Files ready:**
- ✅ `START_HERE.md` - Quick orientation (read this first!)
- ✅ `BUILD_INSTRUCTIONS.md` - Complete step-by-step guide
- ✅ `README.md` - Project vision and philosophy
- ✅ `SIMPLIFIED_ARCHITECTURE.md` - Architecture decisions
- ✅ `teaser.html` - Beautiful landing page (ready to use)
- ✅ `.env.example` - Environment variables with working credentials
- ✅ `requirements.txt` - Python dependencies

### 3. Documentation Comprehensive ✅

Everything you need to know is documented:
- What works (Neo4j, OAuth, coherence service, TCF algorithm)
- What to copy (working services from old codebase)
- What to build (minimal backend + frontend)
- How to test (checkpoints at each stage)
- Common pitfalls and solutions

---

## Next Steps for New Claude

### Step 1: Read the Docs (5 min)
1. Open `START_HERE.md` - Quick overview
2. Open `BUILD_INSTRUCTIONS.md` - Detailed guide
3. Understand the architecture (simple, no nginx, clean paths)

### Step 2: Set Up Environment (5 min)
```bash
cd /media/im3/plus/lab4/re_news/webapp
cp .env.example .env
# Generate new JWT_SECRET_KEY (important!)
```

### Step 3: Build Backend (60 min)
Follow BUILD_INSTRUCTIONS.md § Steps 1-6:
- Create FastAPI app structure
- **Copy** coherence_service.py and tcf_feed_service.py from old codebase
- Implement OAuth router
- Create coherence API endpoint

### Step 4: Build Frontend (45 min)
Follow BUILD_INSTRUCTIONS.md § Step 7:
- Set up Vite + TypeScript + Lit
- Create minimal feed view
- Fetch from `/api/coherence/feed`
- Display stories with TCF scores

### Step 5: Docker (15 min)
Follow BUILD_INSTRUCTIONS.md § Steps 8-9:
- Multi-stage Dockerfile
- Simple docker-compose.yml
- Build and run

### Step 6: Test (10 min)
- Teaser at `http://localhost:7272/`
- API at `http://localhost:7272/api/coherence/feed`
- App at `http://localhost:7272/app`

**Total estimated time: 2.5 hours**

---

## Critical Success Factors

### ✅ DO THESE

1. **Copy the working services** - Don't rewrite them!
   - `apps/epistemic/app/services/coherence_service.py`
   - `apps/epistemic/app/services/tcf_feed_service.py`

2. **Use clean URL paths** - No `/epistemic/` prefixes
   - Good: `/api/auth/login`, `/api/coherence/feed`
   - Bad: `/epistemic/api/auth/login`

3. **Add SessionMiddleware** - OAuth requires it
   ```python
   app.add_middleware(
       SessionMiddleware,
       secret_key=settings.jwt_secret_key,
       session_cookie="session",
       max_age=86400,
       same_site="lax",
       https_only=False
   )
   ```

4. **Set frontend base path** - In vite.config.ts
   ```typescript
   base: '/app/'
   ```

### ❌ DON'T DO THESE

1. ❌ Don't add nginx - FastAPI serves everything
2. ❌ Don't rewrite coherence service - it works perfectly
3. ❌ Don't skip SessionMiddleware - OAuth will fail
4. ❌ Don't hardcode `/epistemic/` - we removed that mess

---

## What's Already Working

### Neo4j Database (Remote)
- **URI**: `neo4j+s://9a8bea5f.databases.neo4j.io`
- **Database**: `neo4j`
- **Credentials**: In `.env.example` (already working)
- **Data**: 15,289 nodes, 39,154 relationships
- **Content**: Jimmy Lai political case timeline

### Google OAuth (Configured)
- **Client ID**: In `.env.example`
- **Client Secret**: In `.env.example`
- **Redirect URI**: `http://localhost:7272/api/auth/callback` (already whitelisted)
- **Status**: Ready to use immediately

### Coherence Service (Battle-tested)
- **Location**: `apps/epistemic/app/services/coherence_service.py`
- **Status**: Working perfectly, tested with real data
- **Action**: Just copy it, don't modify

### TCF Feed Algorithm (Validated)
- **Location**: `apps/epistemic/app/services/tcf_feed_service.py`
- **Status**: Working perfectly, returns ranked stories
- **Action**: Just copy it, don't modify

---

## Expected Result

When everything works, you'll have:

### Public Landing (`/`)
Beautiful gradient teaser page explaining coherence-first philosophy.

### API Endpoint (`/api/coherence/feed`)
Returns JSON like:
```json
{
  "status": "success",
  "count": 20,
  "algorithm": "TCF (Timely-Coherence-Funding)",
  "weights": {"coherence": 0.7, "timely": 0.2, "funding": 0.1},
  "stories": [
    {
      "story_id": "...",
      "title": "小野田紀美大臣、中国依存の経済リスクに警戒感を示す",
      "tcf_score": 64.73,
      "coherence": 64.86,
      "timely": 96.64,
      "funding": 0.0,
      "explanation": "Moderate coherence (65/100) • Very recent"
    }
  ]
}
```

### Authenticated App (`/app`)
After Google OAuth login, shows feed with:
- Story cards displaying title and TCF breakdown
- Coherence scores with explanations
- Clean, modern UI

---

## Architecture Overview

```
http://localhost:7272
│
├── / (GET)
│   └── teaser.html (public landing page)
│
├── /app (GET)
│   └── index.html (authenticated SPA)
│
├── /app/assets/* (Static Files)
│   └── Frontend JS/CSS
│
└── /api/* (API Routes)
    ├── /api/auth/login (Google OAuth)
    ├── /api/auth/callback (OAuth callback)
    ├── /api/auth/me (Current user)
    ├── /api/coherence/feed (TCF-ranked stories)
    └── /api/coherence/stats (Algorithm info)
```

**Single Docker container. No nginx. No complexity.**

---

## Troubleshooting Guide

### "redirect_uri_mismatch"
✅ **Already whitelisted** - Check your `.env` has correct URI

### "CSRF state mismatch"
✅ Add SessionMiddleware in `main.py` (see BUILD_INSTRUCTIONS.md)

### Neo4j connection fails
✅ Use async driver: `neo4j.AsyncGraphDatabase.driver()`

### Frontend assets 404
✅ Check `app.mount("/app/assets", ...)` and `base: '/app/'` in vite config

### No coherence scores in stories
✅ Make sure you copied the working services from old codebase

---

## File Structure Reference

```
webapp/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI entry point
│   ├── config.py            # Settings
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── auth.py          # Google OAuth
│   │   └── coherence.py     # Feed API
│   ├── services/
│   │   ├── __init__.py
│   │   ├── neo4j_service.py
│   │   ├── coherence_service.py  # COPY FROM OLD
│   │   └── tcf_feed_service.py   # COPY FROM OLD
│   ├── database/
│   │   ├── __init__.py
│   │   ├── connection.py
│   │   └── models.py
│   └── models/
│       ├── __init__.py
│       └── user.py
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── index.html
│   └── src/
│       ├── main.ts
│       ├── api/
│       └── components/
├── data/                    # Created at runtime
├── static/                  # Build output
├── teaser.html
├── .env
├── .env.example
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## Philosophy Reminder

**Coherence Above All**

This platform ranks stories by how much they:
- Reduce uncertainty
- Connect to existing knowledge
- Support verifiable claims
- Link entities in meaningful ways

NOT by:
- Clicks or engagement
- Advertising revenue
- Viral potential
- Popularity

---

## Final Checklist

Before you start:
- [ ] Read `START_HERE.md`
- [ ] Read `BUILD_INSTRUCTIONS.md`
- [ ] Understand the architecture (simple, clean, no nginx)
- [ ] Copy `.env.example` to `.env`
- [ ] Generate new `JWT_SECRET_KEY`

While building:
- [ ] Copy coherence services, don't rewrite
- [ ] Use clean `/api/*` paths
- [ ] Add SessionMiddleware
- [ ] Set vite base to `/app/`

After building:
- [ ] Teaser loads at `/`
- [ ] API returns stories at `/api/coherence/feed`
- [ ] OAuth login works
- [ ] Feed displays at `/app` after login
- [ ] Stories show TCF scores

---

**Good luck! Build something clean and coherent. 🚀**

*Everything you need is documented. Trust the process.*
