# ✅ Ready to Build - φ HERE Platform

**Status**: All preparation complete
**Location**: `/media/im3/plus/lab4/re_news/webapp/`
**Next**: Open a new Claude session here and start building

---

## What's Ready

### ✅ Environment & Credentials
- **`.env`** - Working credentials copied from old build
  - Google OAuth (client ID, secret, redirect URI)
  - Neo4j connection (URI, username, password)
  - JWT secret key
- **`.env.example`** - Template for reference

### ✅ Documentation
- **`START_HERE.md`** ← Read this first! (Quick orientation)
- **`BUILD_INSTRUCTIONS.md`** ← Complete step-by-step guide
- **`HANDOFF.md`** ← Handoff document with context
- **`README.md`** ← Project vision and philosophy
- **`SIMPLIFIED_ARCHITECTURE.md`** ← Architecture decisions

### ✅ Assets
- **`teaser.html`** - Beautiful landing page (ready to use)
- **`requirements.txt`** - Python dependencies

### ✅ Directory Structure
- **`app/`** - Backend structure created
- **`static/`** - Frontend build output (will be created)

### ✅ Docker Cleanup
- All legacy containers stopped
- All legacy images removed
- 19.74GB space freed
- Clean slate for fresh build

---

## How to Start

### For the New Claude Session

1. **Open in webapp directory**
   ```bash
   cd /media/im3/plus/lab4/re_news/webapp
   ```

2. **Read the docs** (5 minutes)
   - Open `START_HERE.md` first
   - Then `BUILD_INSTRUCTIONS.md` for details

3. **Start building** (2 hours)
   - Follow BUILD_INSTRUCTIONS.md step by step
   - Copy working services from old codebase
   - Build minimal backend + frontend
   - Docker compose up on port 7272

4. **Test the prototype**
   - Teaser: `http://localhost:7272/`
   - API: `http://localhost:7272/api/coherence/feed`
   - App: `http://localhost:7272/app`

---

## What to Tell the New Claude

**Suggested opening message:**

```
I'm building a coherence-first news platform called φ HERE.

Please read START_HERE.md and BUILD_INSTRUCTIONS.md in this directory.

Then help me build the complete prototype following the instructions:
1. Backend with FastAPI (clean /api/* paths)
2. Copy working coherence services from ../apps/epistemic/app/services/
3. Frontend with Vite + Lit displaying TCF-ranked feed
4. Docker setup on port 7272

Everything is documented. Let's build it step by step.
```

---

## Key Reminders

### ✅ Critical Success Factors

1. **Copy, don't rewrite** coherence services from old codebase
2. **Use clean paths** - `/api/*` not `/epistemic/api/*`
3. **Add SessionMiddleware** - OAuth requires it
4. **Set vite base** to `/app/`

### 🎯 What Success Looks Like

- Beautiful teaser at `/`
- Working API returning real stories with TCF scores
- OAuth login flow working
- Feed displaying coherence-ranked news
- All on port 7272, single container, no nginx

### ⏱️ Estimated Time

- Backend setup: 60 minutes
- Frontend setup: 45 minutes
- Docker config: 15 minutes
- **Total: ~2 hours to working prototype**

---

## Files Inventory

```
webapp/
├── .env                          ✅ Working credentials
├── .env.example                  ✅ Template
├── START_HERE.md                 ✅ Read first!
├── BUILD_INSTRUCTIONS.md         ✅ Complete guide
├── HANDOFF.md                    ✅ Context & handoff
├── README.md                     ✅ Project vision
├── SIMPLIFIED_ARCHITECTURE.md    ✅ Architecture
├── READY_TO_BUILD.md            ✅ This file
├── teaser.html                   ✅ Landing page
├── requirements.txt              ✅ Dependencies
├── app/                          ✅ Backend structure
└── static/                       ✅ Frontend output (empty)

Need to create:
├── Dockerfile                    📝 Multi-stage build
├── docker-compose.yml            📝 Single service
├── frontend/                     📝 Vite project
└── app/*.py files                📝 FastAPI code
```

---

## Environment Variables Summary

All in `.env` (working credentials):

### Google OAuth ✅
- `GOOGLE_CLIENT_ID` - Already configured
- `GOOGLE_CLIENT_SECRET` - Ready to use
- `GOOGLE_REDIRECT_URI` - Already whitelisted

### Neo4j Database ✅
- `NEO4J_URI` - Remote connection working
- `NEO4J_USERNAME` - Valid credentials
- `NEO4J_PASSWORD` - Valid credentials
- `NEO4J_DATABASE` - Database name

### Application ✅
- `JWT_SECRET_KEY` - Secret for sessions
- `JWT_ALGORITHM` - HS256
- `JWT_EXPIRE_MINUTES` - 1440 (24 hours)
- `DATABASE_URL` - SQLite for user data

---

## Reference: Old Codebase

**Location**: `/media/im3/plus/lab4/re_news/apps/epistemic/`

**Files to copy/reference:**

```
apps/epistemic/
├── app/services/
│   ├── coherence_service.py      👈 COPY THIS (working!)
│   └── tcf_feed_service.py       👈 COPY THIS (working!)
├── app/routers/
│   ├── auth.py                   👈 REFERENCE for OAuth
│   └── coherence_feed.py         👈 REFERENCE for API
└── app/database/
    └── connection.py             👈 REFERENCE for Neo4j
```

**Don't copy the frontend** - it has `/epistemic/` path issues.
Build fresh with clean paths.

---

## Testing Checklist

After building, verify:

- [ ] Container builds without errors
- [ ] Container starts on port 7272
- [ ] `curl http://localhost:7272/` returns teaser HTML
- [ ] `curl http://localhost:7272/api/coherence/feed` returns JSON
- [ ] Stories have `tcf_score`, `coherence`, `timely`, `funding` fields
- [ ] OAuth login redirects to Google
- [ ] OAuth callback succeeds without errors
- [ ] Frontend loads at `/app`
- [ ] Feed displays stories with TCF breakdown

---

## Common Issues & Solutions

### Issue: "redirect_uri_mismatch"
**Solution**: Already whitelisted! Check `.env` has correct URI.

### Issue: "CSRF state mismatch"
**Solution**: Add SessionMiddleware in `app/main.py`

### Issue: Neo4j connection fails
**Solution**: Use `AsyncGraphDatabase.driver()` not sync

### Issue: Frontend assets 404
**Solution**:
1. Check `app.mount("/app/assets", ...)` in main.py
2. Verify vite.config.ts has `base: '/app/'`

### Issue: No coherence scores
**Solution**: Make sure you copied the working services!

---

## Philosophy

**Coherence Above All**

Rank stories by:
- ✅ How much they reduce uncertainty
- ✅ How well they connect to existing knowledge
- ✅ Evidence and verifiable claims
- ✅ Entity relationships in the graph

NOT by:
- ❌ Clicks or engagement
- ❌ Advertising dollars
- ❌ Viral potential
- ❌ Popularity metrics

70% Coherence • 20% Timeliness • 10% Funding

---

**Everything is ready. Time to build! 🚀**

*New Claude: Start by reading START_HERE.md*
