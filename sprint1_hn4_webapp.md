# Sprint 1: Story-Matching Intelligence - HN4 Web App

**Sprint Goal**: Display story match results immediately after extraction completes, allowing users to join existing stories or create new investigations.

**Duration**: 5-7 days
**Service**: `hn4/` (React + FastAPI)
**Dependencies**: here-extraction-service API, Neo4j client

---

## 📋 Sprint Backlog

### Epic: Real-Time Story Matching UI

---

## 🎯 **Task 1: Update Chat Session Hook to Handle story_match**

**Priority**: P0 (Blocking)
**Estimate**: 2-3 hours
**Owner**: Frontend Engineer

### Acceptance Criteria:
- [ ] `useChatSession.ts` polls for `story_match` field in task response
- [ ] When `story_match.is_new === false`, fetch full story details
- [ ] When `story_match.is_new === true`, navigate to new story page
- [ ] Display story match card immediately (no delay)
- [ ] Handle missing/null `story_match` gracefully

### Implementation Details:

**File**: `app/hooks/useChatSession.ts:258-340`

**Modify polling logic** to detect `story_match`:

```typescript
// Inside polling interval (line ~267-338)
pollingIntervalRef.current = setInterval(async () => {
  pollAttempts++

  try {
    const taskResponse = await fetch(`/api/task/${seedResponse.task_id}`)
    const taskData = await taskResponse.json()

    // Existing preview handling...
    if (taskData.preview_meta && !previewReceived) {
      // ... existing preview code ...
    }

    // NEW: Check for story match when extraction completes
    if (taskData.status === 'completed' && taskData.story_match) {
      const storyMatch = taskData.story_match

      // Clear polling
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }

      // Handle story match result
      if (storyMatch.is_new) {
        // New story created - show success message and navigate
        const successMessage: ChatMessage = {
          id: `msg_${Date.now()}_story_created`,
          role: 'system',
          timestamp: new Date(),
          content: {
            type: 'text',
            data: {
              text: `✨ Created new investigation: **${storyMatch.matched_story_title || 'Untitled Story'}**`
            }
          }
        }

        pushSystemMessages([successMessage])
        setIsTyping(false)

        // Navigate to story page after 2s
        setTimeout(() => {
          window.location.href = `/story/${storyMatch.story_id}`
        }, 2000)
      } else {
        // Matched existing story - fetch details and show match card
        setTypingMessage('Found related investigation...')

        try {
          const storyResponse = await fetch(`/api/stories/${storyMatch.story_id}`)
          const storyDetails = await storyResponse.json()

          // Convert to StoryMatch format
          const match: StoryMatch = {
            id: storyDetails.id,
            title: storyDetails.title,
            description: storyDetails.description,
            healthIndicator: storyDetails.health_indicator || 'healthy',
            lastUpdated: storyDetails.last_updated_human || 'recently',
            matchScore: storyMatch.match_score,
            contributorCount: storyDetails.people_count,
            claimCount: storyDetails.claim_count
          }

          // Show story match card
          pushSystemMessages([
            buildStoryMatchesMessage(
              taskData.result?.title || parsed.text,
              [match]
            ),
            buildActionPromptMessage([match], taskData.result?.title || parsed.text)
          ])

          setIsTyping(false)
        } catch (error) {
          console.error('Failed to fetch story details:', error)
          setIsTyping(false)
        }
      }

      return // Exit polling
    }

    // Fallback: completed but no story_match (shouldn't happen, but handle gracefully)
    if (taskData.status === 'completed' && !taskData.story_match) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }

      // Fallback to existing behavior (fetch story matches via search)
      if (!activeTaskMatchesRef.current[seedResponse.task_id]) {
        activeTaskMatchesRef.current[seedResponse.task_id] = true
        await fetchStoryMatches(
          taskData.result?.title || parsed.text || seedResponse.urls?.[0],
          'url',
          parsed
        )
      }
    }

    // Handle failures
    if (taskData.status === 'failed' || taskData.status === 'blocked') {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }

      const errorMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        role: 'system',
        timestamp: new Date(),
        content: {
          type: 'text',
          data: {
            text: taskData.status === 'blocked'
              ? '⚠️ Unable to access this article (paywall or blocked)'
              : '❌ Extraction failed. Please try a different article.'
          }
        }
      }
      pushSystemMessages([errorMessage])
      setIsTyping(false)
    }

    // Timeout after max attempts
    if (pollAttempts >= maxAttempts) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
      setIsTyping(false)
    }
  } catch (error) {
    console.error('Polling error:', error)
  }
}, 1000)  // Poll every second
```

### Testing:
1. Paste URL for **new story** (e.g., unique tech news)
   - ✅ Shows "Created new investigation"
   - ✅ Auto-navigates to `/story/{id}` after 2s

2. Paste URL for **existing story** (e.g., related to previous article)
   - ✅ Shows story match card with similarity score
   - ✅ Displays "Add to Existing Thread" action

3. Paste URL that **fails extraction**
   - ✅ Shows error message, no crash

---

## 🎯 **Task 2: Add GET /api/stories/{story_id} Endpoint**

**Priority**: P0 (Blocking)
**Estimate**: 1 hour
**Owner**: Backend Engineer
**Depends On**: None (uses existing neo4j_client)

### Acceptance Criteria:
- [ ] Endpoint returns full story details by ID
- [ ] Includes: title, description, artifact_count, claim_count, people_count
- [ ] Returns 404 if story not found
- [ ] Response format matches existing story search response

### Implementation Details:

**File**: `server.py`

**Add new endpoint** (after `/api/stories/search` at line ~98):

```python
@app.get("/api/stories/{story_id}")
async def get_story_by_id(story_id: str):
    """
    Get a single story by ID with full metadata

    Returns:
        Story summary with counts, locations, confidence, etc.
    """
    try:
        story = neo4j_client.get_story_by_id(story_id)

        if not story:
            raise HTTPException(status_code=404, detail=f"Story {story_id} not found")

        return {
            "success": True,
            "story": story
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching story {story_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
```

**Verify neo4j_client method exists** (already implemented in `services/neo4j_client.py:445-486`):
- ✅ Method: `get_story_by_id(story_id: str)`
- ✅ Returns: `Dict` with story summary
- ✅ Handles: Missing story (returns None)

### Testing:
```bash
# Test endpoint
curl "http://localhost:5173/api/stories/test-story-uuid-123" | jq .

# Expected response:
{
  "success": true,
  "story": {
    "id": "test-story-uuid-123",
    "title": "OpenAI Sora Controversy",
    "description": "Story about OpenAI's video AI release...",
    "artifact_count": 3,
    "claim_count": 12,
    "people_count": 5,
    "locations": ["United States", "California"],
    "confidence": 0.82,
    "health_indicator": "healthy",
    "last_updated_human": "2h ago"
  }
}
```

---

## 🎯 **Task 3: Enhance Story Match Card with Similarity Score**

**Priority**: P1 (Important)
**Estimate**: 1-2 hours
**Owner**: Frontend Engineer
**Depends On**: Task 1

### Acceptance Criteria:
- [ ] `StoryMatchCard.tsx` displays similarity score badge
- [ ] Score shown as percentage (0.82 → "82% match")
- [ ] Visual indicator for high confidence matches (>80%)
- [ ] Tooltip explains what similarity score means

### Implementation Details:

**File**: `app/components/cards/StoryMatchCard.tsx`

**Add similarity badge** (after health indicator at line ~30-50):

```tsx
interface StoryMatchCardProps {
  match: StoryMatch
  onJoin: (storyId: string) => void
  onView: (storyId: string) => void
}

export function StoryMatchCard({ match, onJoin, onView }: StoryMatchCardProps) {
  const healthColor = {
    healthy: 'bg-emerald-500/10 text-emerald-400',
    growing: 'bg-blue-500/10 text-blue-400',
    stale: 'bg-amber-500/10 text-amber-400',
    archived: 'bg-gray-500/10 text-gray-400'
  }[match.healthIndicator]

  // Format similarity score
  const matchScore = match.matchScore
  const matchPercentage = matchScore ? Math.round(matchScore * 100) : null
  const isHighConfidence = matchScore && matchScore >= 0.8

  return (
    <div className="border border-zinc-700/50 rounded-lg p-4 hover:border-zinc-600/50 transition-colors">
      {/* Header with badges */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h3 className="text-base font-medium text-zinc-100 mb-1">
            {match.title}
          </h3>
        </div>

        <div className="flex items-center gap-2 ml-3">
          {/* Health indicator badge */}
          <Badge variant="outline" className={`text-xs ${healthColor}`}>
            {match.healthIndicator}
          </Badge>

          {/* NEW: Similarity score badge */}
          {matchPercentage !== null && (
            <Badge
              variant="outline"
              className={`text-xs ${
                isHighConfidence
                  ? 'bg-green-500/10 text-green-400 border-green-500/30'
                  : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
              }`}
              title={`Semantic similarity: ${matchPercentage}% - Articles are ${
                isHighConfidence ? 'highly' : 'moderately'
              } related based on content analysis`}
            >
              {matchPercentage}% match
            </Badge>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-zinc-400 mb-3 line-clamp-2">
        {match.description}
      </p>

      {/* Metadata row */}
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <div className="flex items-center gap-4">
          {match.contributorCount !== undefined && (
            <span>👥 {match.contributorCount} contributors</span>
          )}
          {match.claimCount !== undefined && (
            <span>📋 {match.claimCount} claims</span>
          )}
          <span>🕐 {match.lastUpdated}</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => onView(match.id)}
          className="flex-1 px-3 py-2 text-sm border border-zinc-700/50 rounded-md
                     hover:border-zinc-600/50 hover:bg-zinc-800/50 transition-colors"
        >
          View Thread
        </button>
        <button
          onClick={() => onJoin(match.id)}
          className="flex-1 px-3 py-2 text-sm bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-md
                     hover:bg-blue-600/30 hover:border-blue-500/50 transition-colors"
        >
          Add to Thread
        </button>
      </div>
    </div>
  )
}
```

**Update type definition** (already has `matchScore` in `app/types/chat.ts:27-36`):
```typescript
export interface StoryMatch {
  id: string
  title: string
  description: string
  healthIndicator: 'healthy' | 'growing' | 'stale' | 'archived'
  lastUpdated: string
  matchScore?: number  // ✅ Already defined
  contributorCount?: number
  claimCount?: number
}
```

### Testing:
1. Submit URL that matches existing story at **85% similarity**
   - ✅ Shows green "85% match" badge
   - ✅ Badge has high-confidence styling

2. Submit URL that matches existing story at **70% similarity**
   - ✅ Shows blue "70% match" badge
   - ✅ Badge has moderate-confidence styling

3. Hover over badge
   - ✅ Tooltip explains similarity score

---

## 🎯 **Task 4: Add Loading State Messages for Story Matching**

**Priority**: P2 (Nice to have)
**Estimate**: 1 hour
**Owner**: Frontend Engineer

### Acceptance Criteria:
- [ ] Show "Analyzing content..." while extraction runs
- [ ] Show "Matching with existing investigations..." when Neo4j query runs
- [ ] Show "Creating new investigation..." if no match found
- [ ] Typing indicator updates in real-time

### Implementation Details:

**File**: `app/hooks/useChatSession.ts`

**Update typing messages** at different stages:

```typescript
// Initial submission (line ~199)
setTypingMessage('Analyzing...')

// After cache check (line ~205)
if (cached) {
  setTypingMessage('Checking for related investigations...')
}

// When preview arrives (line ~275)
if (taskData.preview_meta && !previewReceived) {
  setTypingMessage('Extracting content...')
}

// When extraction completes (line ~311)
if (taskData.status === 'completed') {
  setTypingMessage('Matching with existing investigations...')
}

// Before creating new story (line ~320)
if (storyMatch.is_new) {
  setTypingMessage('Creating new investigation...')
}
```

**Add progress indicator component** (optional enhancement):

```typescript
// Show extraction progress as percentage
const [extractionProgress, setExtractionProgress] = useState(0)

// Update based on polling attempts
const progressPercentage = Math.min(95, (pollAttempts / maxAttempts) * 100)
setExtractionProgress(progressPercentage)
```

### Testing:
1. Submit URL and watch typing messages
   - ✅ "Analyzing..." → "Extracting content..." → "Matching with existing investigations..."
   - ✅ Messages feel responsive (no long gaps)

2. Submit URL for new story
   - ✅ Final message: "Creating new investigation..."

---

## 🎯 **Task 5: Handle "Add to Thread" Action**

**Priority**: P1 (Important)
**Estimate**: 2 hours
**Owner**: Full-stack Engineer
**Depends On**: Task 1, Task 2

### Acceptance Criteria:
- [ ] Clicking "Add to Thread" navigates to story page
- [ ] URL includes query param to show "recently added" highlight
- [ ] Story page displays newly added artifact at top
- [ ] Confirmation message shown ("Added to investigation")

### Implementation Details:

**File**: `app/hooks/useChatSession.ts:384-392`

**Update `handleJoinStory` method**:

```typescript
const handleJoinStory = useCallback((storyId: string, artifactUrl?: string) => {
  console.log('Join story:', storyId, artifactUrl)

  // Navigate to story page with optional artifact highlight
  const url = new URL(`/story/${storyId}`, window.location.origin)
  if (artifactUrl) {
    url.searchParams.set('highlight', encodeURIComponent(artifactUrl))
    url.searchParams.set('added', 'true')
  }

  window.location.href = url.toString()
}, [])
```

**Update action button click** in `useChatSession.ts:361-382`:

```typescript
const handleAction = useCallback((actionId: string, route?: string, context?: any) => {
  console.log('Action clicked:', actionId, route, context)

  if (actionId === 'add_to_existing' && context?.storyId && context?.artifactUrl) {
    // User wants to add current article to existing story
    handleJoinStory(context.storyId, context.artifactUrl)
    return
  }

  // ... existing action handling ...
}, [handleJoinStory])
```

**Update StoryMatchCard button** (in `app/components/cards/StoryMatchCard.tsx`):

```tsx
<button
  onClick={() => onJoin(match.id)}
  className="..."
>
  Add to Thread
</button>
```

**Update StoryPage to handle highlight** (in `app/StoryPage.tsx`):

```typescript
// Inside StoryPage component
const urlParams = new URLSearchParams(window.location.search)
const highlightUrl = urlParams.get('highlight')
const isNewlyAdded = urlParams.get('added') === 'true'

useEffect(() => {
  if (isNewlyAdded) {
    // Show toast notification
    const toast = document.createElement('div')
    toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50'
    toast.textContent = '✅ Article added to investigation'
    document.body.appendChild(toast)

    setTimeout(() => toast.remove(), 3000)

    // Scroll to highlighted artifact
    if (highlightUrl) {
      const element = document.querySelector(`[data-artifact-url="${highlightUrl}"]`)
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }
}, [isNewlyAdded, highlightUrl])
```

### Testing:
1. Click "Add to Thread" on story match card
   - ✅ Navigates to `/story/{id}?highlight={url}&added=true`
   - ✅ Shows toast: "Article added to investigation"
   - ✅ Scrolls to newly added artifact

---

## 🎯 **Task 6: Add Error Handling for Story Matching Failures**

**Priority**: P1 (Important)
**Estimate**: 1 hour
**Owner**: Frontend Engineer

### Acceptance Criteria:
- [ ] Handle case where story_match is null/missing
- [ ] Handle case where story details fetch fails (404)
- [ ] Show user-friendly error message
- [ ] Fallback to manual search if auto-match fails

### Implementation Details:

**File**: `app/hooks/useChatSession.ts`

**Add error boundaries**:

```typescript
// In polling logic (line ~311-360)
if (taskData.status === 'completed' && taskData.story_match) {
  const storyMatch = taskData.story_match

  try {
    if (storyMatch.is_new) {
      // ... existing new story logic ...
    } else {
      // Matched existing story
      setTypingMessage('Found related investigation...')

      try {
        const storyResponse = await fetch(`/api/stories/${storyMatch.story_id}`)

        if (!storyResponse.ok) {
          throw new Error(`Story fetch failed: ${storyResponse.status}`)
        }

        const storyDetails = await storyResponse.json()

        // ... existing story match display logic ...

      } catch (storyFetchError) {
        console.error('Failed to fetch story details:', storyFetchError)

        // Fallback: Show generic match message without details
        const fallbackMessage: ChatMessage = {
          id: `msg_${Date.now()}`,
          role: 'system',
          timestamp: new Date(),
          content: {
            type: 'text',
            data: {
              text: `Found a related investigation (${Math.round((storyMatch.match_score || 0) * 100)}% match). [View Story](/story/${storyMatch.story_id})`
            }
          }
        }
        pushSystemMessages([fallbackMessage])
        setIsTyping(false)
      }
    }
  } catch (error) {
    console.error('Story matching error:', error)

    // Ultimate fallback: manual search
    const errorMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'system',
      timestamp: new Date(),
      content: {
        type: 'text',
        data: { text: '⚠️ Story matching unavailable. Searching manually...' }
      }
    }
    pushSystemMessages([errorMessage])

    // Fall back to text-based search
    await fetchStoryMatches(
      taskData.result?.title || parsed.text,
      'url',
      parsed
    )
  }
}

// Handle case where story_match is missing (line ~362-380)
if (taskData.status === 'completed' && !taskData.story_match) {
  console.warn('Extraction completed but no story_match returned - falling back to search')

  // Fallback to existing search behavior
  if (!activeTaskMatchesRef.current[seedResponse.task_id]) {
    activeTaskMatchesRef.current[seedResponse.task_id] = true
    await fetchStoryMatches(
      taskData.result?.title || parsed.text || seedResponse.urls?.[0],
      'url',
      parsed
    )
  }
}
```

### Testing:
1. **Simulate story fetch failure**
   ```typescript
   // Mock server.py to return 404
   @app.get("/api/stories/{story_id}")
   async def get_story_by_id(story_id: str):
       raise HTTPException(status_code=404, detail="Story not found")
   ```
   - ✅ Shows fallback message with match score
   - ✅ Includes link to story page

2. **Simulate missing story_match field**
   ```python
   # In extraction service, return no story_match
   response["story_match"] = None
   ```
   - ✅ Falls back to manual search
   - ✅ Shows search results as before

---

## 🎯 **Task 7: Update API Proxy for /api/task/{id}**

**Priority**: P0 (Blocking)
**Estimate**: 30 minutes
**Owner**: Backend Engineer

### Acceptance Criteria:
- [ ] `server.py` proxies `/api/task/{id}` to extraction service
- [ ] Passes through `story_match` field without modification
- [ ] Handles extraction service downtime gracefully

### Implementation Details:

**File**: `server.py`

**Add proxy endpoint** (after `/api/check` at line ~128):

```python
import httpx

EXTRACTION_SERVICE_URL = os.getenv(
    "EXTRACTION_SERVICE_URL",
    "https://here-extraction-service-179431661561.us-central1.run.app"
)

@app.get("/api/task/{task_id}")
async def get_task_status(task_id: str):
    """
    Proxy to extraction service to get task status and results

    Returns:
        Task status, result, semantic_data, story_match
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{EXTRACTION_SERVICE_URL}/task/{task_id}"
            )

        if response.status_code == 404:
            raise HTTPException(status_code=404, detail="Task not found")

        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Extraction service error: {response.text}"
            )

        # Pass through response (includes story_match if available)
        return response.json()

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="Extraction service timeout"
        )
    except httpx.RequestError as e:
        print(f"Error proxying to extraction service: {e}")
        raise HTTPException(
            status_code=503,
            detail="Extraction service unavailable"
        )
```

**Add httpx to dependencies** (in `requirements.txt` or `package.json`):
```txt
httpx>=0.25.0
```

### Testing:
```bash
# Test proxy endpoint
curl "http://localhost:5173/api/task/test-task-id-123" | jq .

# Expected response:
{
  "task_id": "test-task-id-123",
  "url": "https://example.com/article",
  "status": "completed",
  "result": {...},
  "semantic_data": {...},
  "story_match": {
    "story_id": "story-uuid",
    "is_new": false,
    "match_score": 0.82,
    "matched_story_title": "OpenAI Sora Controversy"
  }
}
```

---

## 📊 Definition of Done

### Code Quality:
- [ ] TypeScript types updated for `story_match` field
- [ ] Error boundaries around all async operations
- [ ] Console logs for debugging (can be removed post-launch)
- [ ] Consistent styling with existing components

### Testing:
- [ ] Manual testing with 3+ different URLs
- [ ] Test new story creation flow
- [ ] Test existing story matching flow
- [ ] Test error cases (404, timeout, blocked)

### UX:
- [ ] Loading states feel responsive
- [ ] Story match appears within 35s
- [ ] Error messages are user-friendly
- [ ] Actions are clearly labeled

### Documentation:
- [ ] README updated with story matching feature
- [ ] API response format documented
- [ ] Component props documented

---

## 🚀 Deployment Plan

### Pre-deployment:
1. **Test against staging extraction service**
   - Point `EXTRACTION_SERVICE_URL` to staging
   - Run full extraction flow
   - Verify `story_match` field appears

2. **Coordinate with backend team**
   - Confirm extraction service is deployed with story matching
   - Get test task IDs for frontend testing
   - Verify Neo4j has Story nodes with embeddings

### Deployment:
```bash
# Build production bundle
npm run build

# Deploy to hosting (Vercel/Netlify/etc)
npm run deploy

# Or deploy FastAPI server
uvicorn server:app --host 0.0.0.0 --port 8080
```

### Post-deployment:
- Monitor browser console for errors
- Check analytics for story match engagement
- Gather user feedback on match accuracy

---

## 📈 Success Metrics

**User Engagement:**
- ✅ 70%+ of users click on story match results
- ✅ Average time to join story < 5 seconds after match appears
- ✅ Story match click-through rate > 50%

**Technical Metrics:**
- ✅ Story match appears within 35s of URL submission
- ✅ < 1% error rate for story fetching
- ✅ Polling stops within 2s of extraction completion

**User Satisfaction:**
- ✅ Users find story matches relevant (survey)
- ✅ Reduced duplicate story creation
- ✅ Increased story collaboration

---

## 🔧 Rollback Plan

If critical issues arise:

1. **Quick fix**: Hide story match feature with feature flag
   ```typescript
   const ENABLE_STORY_MATCH = false  // Set to false to disable

   if (ENABLE_STORY_MATCH && taskData.story_match) {
     // ... story match logic ...
   }
   ```

2. **Revert deployment**: Roll back to previous git commit
   ```bash
   git revert HEAD
   git push origin main
   ```

3. **Database cleanup**: No cleanup needed (read-only feature)

---

## 🎯 **Task 8: Verify StoryPage Displays Generated Stories**

**Priority**: P2 (Important)
**Estimate**: 30 minutes
**Owner**: Frontend Engineer
**Depends On**: Task 2

### Acceptance Criteria:
- [ ] StoryPage renders `story.description` (Story.gist from Neo4j)
- [ ] Story title shown from `story.title` (Story.topic from Neo4j)
- [ ] No additional fields needed from backend
- [ ] Test with newly created Story from extraction

### Implementation Details:

**File**: `app/StoryPage.tsx` (already implemented!)

**Verification checklist**:
- ✅ Line 174: `{story.description}` renders Story.gist ✅
- ✅ Line 136: `{story.title}` renders Story.topic ✅
- ✅ Line 183: `{story.artifact_count} artifacts` shows linked Pages ✅
- ✅ Line 187: `{story.claim_count} verified facts` shows Claims ✅

**What happens:**
1. User submits URL → extraction creates/matches Story
2. User navigates to `/story/{id}`
3. StoryPage fetches `/api/stories/{id}` (Task 2)
4. Displays:
   - **Title**: Story.topic (generated from first Page's "about")
   - **Summary**: Story.gist (full "about" text)
   - **Stats**: artifact_count, claim_count, people_count

**Testing**:
```bash
# 1. Submit URL that creates NEW story
# POST to /api/seed with unique URL

# 2. Wait for extraction to complete (~35s)
# story_match.is_new === true

# 3. Navigate to /story/{story_id}
# Should show:
# - Title: First sentence of "about" field
# - Summary: Full "about" text
# - Stats: 1 artifact (the Page just added)
```

### Expected User Flow:

```
User: Pastes https://techcrunch.com/article-about-openai
      ↓
Chat: "Created new investigation: OpenAI releases Sora"
      [Auto-navigates to /story/uuid-123]
      ↓
StoryPage shows:
┌────────────────────────────────────────────────────┐
│ 🟡 DEVELOPING STORY                                │
│                                                    │
│ OpenAI releases Sora                              │ ← Story.topic
│                                                    │
│ Summary:                                           │
│ OpenAI released its AI video app Sora with a      │
│ lenient copyright policy that led to              │ ← Story.gist
│ controversies over misuse...                      │
│                                                    │
│ 📊 1 artifact  ✓ 5 verified facts                │
└────────────────────────────────────────────────────┘
```

### Notes:
- **No code changes needed!** StoryPage already has correct fields.
- Story generation happens in extraction service (Task 3)
- Future: Sprint 2 will add progressive enhancement as more Pages added

---

## 🤝 Collaboration Points

**Sync with Extraction Service Team:**
- Confirm `story_match` field is in production
- Share frontend component screenshots for feedback
- Coordinate on launch timing (same day/week)
- ✅ **Confirm Story.topic and Story.gist are populated** (Task 3)

**Dependencies:**
- Extraction service must be deployed first
- Neo4j must have Story nodes with embeddings
- `/api/stories/{id}` endpoint must be working
- Story nodes must have `topic` and `gist` fields populated

**Testing Coordination:**
- Backend team provides test task IDs
- Frontend team tests with real extraction service (staging)
- QA team validates end-to-end flow

---

## 📝 Notes

- **Feature flag**: Consider adding feature flag for gradual rollout
- **Analytics**: Add event tracking for story match interactions
- **A/B testing**: Test different similarity thresholds (0.70 vs 0.75 vs 0.80)
- **Future enhancement**: Allow users to manually override story matches

---

## 🎨 UI Mockup

```
┌─────────────────────────────────────────────────────────────┐
│ Chat Interface                                              │
├─────────────────────────────────────────────────────────────┤
│ You:                                                        │
│ https://techcrunch.com/2024/12/17/openai-launches-sora     │
│                                                             │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ [Thumbnail]  OpenAI launches Sora video AI            │  │
│ │              TechCrunch · 2h ago                      │  │
│ │              OpenAI has launched Sora, its highly     │  │
│ │              anticipated text-to-video AI model...    │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                             │
│ System:                                                     │
│ Found related investigation:                                │
│                                                             │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ OpenAI Sora Controversy              [healthy] [85%]  │  │
│ │                                                       │  │
│ │ Investigation into OpenAI's Sora video AI release    │  │
│ │ and subsequent copyright controversies                │  │
│ │                                                       │  │
│ │ 👥 3 contributors  📋 12 claims  🕐 2h ago           │  │
│ │                                                       │  │
│ │ [View Thread]  [Add to Thread]                       │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                             │
│ Would you like to:                                          │
│ • Add to Existing Thread                                    │
│ • Start New Investigation                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔍 Future Enhancements

**Phase 2 Features:**
- [ ] Show story match confidence in real-time (as extraction progresses)
- [ ] Allow user to reject match and force new story creation
- [ ] Show preview of story claims before joining
- [ ] Bulk add multiple articles to story at once
- [ ] Story merge functionality (combine duplicate stories)
- [ ] Manual story override (user selects which story to join)

**Analytics:**
- [ ] Track match accuracy (user accepts vs rejects)
- [ ] A/B test similarity thresholds
- [ ] Monitor story fragmentation rate
