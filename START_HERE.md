# 🚀 START HERE - φ HERE Platform

**Welcome to the fresh start!**

This is a **clean rebuild** of the coherence-first news platform. All legacy complexity has been removed.

---

## Quick Context

**What is φ HERE?**
A news platform that ranks stories by **epistemic coherence** (how much they reduce uncertainty and connect to knowledge) rather than clicks or advertising.

**What's the algorithm?**
- 70% Coherence (entity overlap + graph centrality + claims)
- 20% Timeliness (recent stories matter)
- 10% Funding (community support, logarithmic to prevent whales)

---

## Files in This Directory

### Start Here First
1. **START_HERE.md** ← You are here
2. **BUILD_INSTRUCTIONS.md** ← Complete step-by-step build guide
3. **README.md** ← Project vision and philosophy

### Already Provided
- **teaser.html** - Beautiful landing page (ready to use)
- **.env.example** - Environment variables template with working credentials
- **SIMPLIFIED_ARCHITECTURE.md** - Architecture decisions from previous build

### You Need to Create
Everything else! Follow BUILD_INSTRUCTIONS.md

---

## What's Already Working

✅ **Neo4j Database** (remote, shared)
- 15,289 nodes, 39,154 relationships
- Real political case data (Jimmy Lai timeline)
- Credentials in `.env.example`

✅ **Google OAuth** (configured)
- Client ID and secret in `.env.example`
- Redirect URI `http://localhost:7272/api/auth/callback` already whitelisted
- Ready to use immediately

✅ **Coherence Service** (battle-tested)
- Located in: `../apps/epistemic/app/services/coherence_service.py`
- **COPY THIS FILE** - don't rewrite it!

✅ **TCF Feed Algorithm** (validated)
- Located in: `../apps/epistemic/app/services/tcf_feed_service.py`
- **COPY THIS FILE** - it works perfectly!

---

## Your Mission

Build a minimal, clean platform in 6 steps:

### Step 1: Backend Foundation (30 min)
- Create `app/main.py` with FastAPI
- Set up clean routing: `/`, `/app`, `/api/*`
- Add SessionMiddleware for OAuth
- See: BUILD_INSTRUCTIONS.md § Step 3

### Step 2: Copy Working Services (5 min)
- Copy `coherence_service.py` from old codebase
- Copy `tcf_feed_service.py` from old codebase
- Create Neo4j connection wrapper
- See: BUILD_INSTRUCTIONS.md § Step 5

### Step 3: Auth Router (20 min)
- Implement Google OAuth flow
- `/api/auth/login`, `/api/auth/callback`, `/api/auth/me`
- Use authlib for OAuth
- See: BUILD_INSTRUCTIONS.md § Step 4

### Step 4: Coherence API (10 min)
- Create `/api/coherence/feed` endpoint
- Call the TCF service (already working!)
- Return ranked stories
- See: BUILD_INSTRUCTIONS.md § Step 6

### Step 5: Frontend (45 min)
- Set up Vite + TypeScript + Lit
- Create minimal feed view
- Fetch from `/api/coherence/feed`
- Display stories with TCF scores
- See: BUILD_INSTRUCTIONS.md § Step 7

### Step 6: Docker (15 min)
- Multi-stage Dockerfile (frontend + backend)
- Simple docker-compose.yml
- Build and run on port 7272
- See: BUILD_INSTRUCTIONS.md § Steps 8-9

**Total time: ~2 hours to working prototype**

---

## The Golden Rules

### ✅ DO THESE

1. **Copy the working services** from `../apps/epistemic/app/services/`
   - `coherence_service.py` ← Coherence calculations
   - `tcf_feed_service.py` ← Feed ranking algorithm
   - Don't modify them, they work!

2. **Use clean URL paths**
   - Good: `/api/auth/login`
   - Bad: `/epistemic/api/auth/login`

3. **Add SessionMiddleware** to FastAPI
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

4. **Set frontend base path** in vite.config.ts
   ```typescript
   base: '/app/'
   ```

### ❌ DON'T DO THESE

1. **Don't add nginx** - FastAPI serves everything
2. **Don't rewrite the coherence service** - just copy it
3. **Don't skip SessionMiddleware** - OAuth needs it
4. **Don't hardcode `/epistemic/`** - we removed that complexity

---

## Testing Your Build

### Checkpoint 1: Backend Running
```bash
docker compose up -d
docker logs phi_here

# Should see:
# INFO: Application startup complete
# INFO: Uvicorn running on http://0.0.0.0:8000
```

### Checkpoint 2: Teaser Page
```bash
curl http://localhost:7272/

# Should return HTML with:
# <h1>φ HERE</h1>
# <div class="tagline">Coherence Above All</div>
```

### Checkpoint 3: API Working
```bash
curl http://localhost:7272/api/coherence/feed?limit=5

# Should return JSON like:
# {
#   "status": "success",
#   "count": 5,
#   "stories": [
#     {
#       "title": "...",
#       "tcf_score": 64.73,
#       "coherence": 64.86,
#       "timely": 96.64,
#       "funding": 0.0
#     }
#   ]
# }
```

### Checkpoint 4: OAuth Flow
1. Visit `http://localhost:7272/api/auth/login`
2. Redirects to Google
3. After auth, redirects to callback
4. No "redirect_uri_mismatch" or "state mismatch" errors

### Checkpoint 5: Frontend
1. Visit `http://localhost:7272/app`
2. Shows feed with stories
3. Each story displays: title, TCF score, coherence breakdown
4. No 404 errors on assets

---

## When You're Stuck

### Problem: "redirect_uri_mismatch"
**Solution**: The redirect URI is already whitelisted. Check your `.env`:
```bash
GOOGLE_REDIRECT_URI=http://localhost:7272/api/auth/callback
```

### Problem: "CSRF state mismatch"
**Solution**: Add SessionMiddleware to `app/main.py` (see BUILD_INSTRUCTIONS.md § Step 3)

### Problem: Neo4j connection fails
**Solution**: Credentials are correct in `.env.example`. Use async driver:
```python
from neo4j import AsyncGraphDatabase
driver = AsyncGraphDatabase.driver(uri, auth=(user, pass))
```

### Problem: Frontend assets 404
**Solution**:
1. Check `app.mount("/app/assets", StaticFiles(...))` in main.py
2. Verify vite.config.ts has `base: '/app/'`
3. Ensure build outputs to `static/` directory

### Problem: Stories have no coherence scores
**Solution**: Make sure you copied `coherence_service.py` and `tcf_feed_service.py` from the old codebase. Don't try to rewrite them!

---

## Success Looks Like

When everything works, you'll have:

1. **Public Landing** (`http://localhost:7272/`)
   - Beautiful gradient teaser page
   - Explains coherence-first philosophy
   - No login required

2. **API** (`http://localhost:7272/api/coherence/feed`)
   - Returns real stories from Neo4j
   - Each with TCF score breakdown
   - Ranked by 70-20-10 algorithm

3. **Authenticated App** (`http://localhost:7272/app`)
   - Login with Google OAuth
   - Feed displays coherence-ranked stories
   - Shows: title, scores, explanation, entities

4. **Clean Architecture**
   - No nginx
   - No `/epistemic/` prefixes
   - Single Docker container
   - Direct port 7272 access

---

## Next Steps After Prototype

Once the basic prototype works:

1. **Polish UI** - Better styling, animations, responsiveness
2. **Add Features** - Story submission, user credits, voting
3. **Quest System** - Integrate the hypothesis/evidence workflow
4. **Performance** - Caching, pagination, lazy loading

But first: **Get the minimal version working!**

---

## Need Help?

Refer to these files in order:
1. This file (START_HERE.md) ← Overview
2. BUILD_INSTRUCTIONS.md ← Detailed build steps
3. README.md ← Project vision
4. SIMPLIFIED_ARCHITECTURE.md ← Architecture decisions

Reference the old codebase:
- `../apps/epistemic/app/services/` ← Working services to copy
- `../apps/epistemic/app/routers/` ← Reference for OAuth implementation

---

**Ready? Open BUILD_INSTRUCTIONS.md and start coding! 🚀**

*Remember: Copy the working services, use clean paths, don't overthink it.*
