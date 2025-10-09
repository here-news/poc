# HN4 Web App - Bugs & Features

## Priority 1: Critical Issues (User Experience)

- [x] **URL preview images not showing in chat interface**
  - **Status**: Fixed (2025-10-08)
  - **Issue**: Cached extractions display title/description but no thumbnail image
  - **Root cause**: `getPreviewFromTask()` only checked `og_metadata` which is unreliable
  - **Solution**: Implemented smart fallback chain for thumbnails
    1. **Best**: `screenshot_url` from extraction results (shows actual content)
    2. **Fallback 1**: `preview_meta.thumbnail_url` from iFramely (fast metadata)
    3. **Fallback 2**: `og_metadata.image` if available (unreliable but worth trying)
    4. **Fallback 3**: Domain favicon (always available via `favicon` field)
  - **Implementation**: `app/utils/extractionAdapter.ts:68-116`
  - **Testing**: Will work automatically when screenshot_url is available in extraction results
  - **Note**: Existing cached tasks without screenshots will show no thumbnail (graceful degradation)

- [ ] **Firestore composite index requirement for cache queries**
  - **Status**: Workaround implemented
  - **Current solution**: Query by URL only, filter status/date in Python
  - **Impact**: Slightly slower cache lookups (~10 extra tasks filtered)
  - **Permanent fix**: Create composite index in Firebase Console
  - **Index URL**: https://console.firebase.google.com/v1/r/project/here2-474221/firestore/indexes?create_composite=...
  - **Fields**: `url` (=), `status` (=), `created_at` (DESC)
  - **Priority**: Low (workaround is acceptable)

## Priority 2: Feature Enhancements

- [x] **Cache-first URL extraction flow**
  - **Completed**: 2025-10-08
  - **Implementation**: Three-tier performance optimization
    1. Cache check (~0ms) - Instant results for previously extracted URLs
    2. iFramely preview (~200ms) - Fast metadata while full extraction runs
    3. Full extraction (~30s) - Complete semantic analysis
  - **Files modified**:
    - `app/utils/extractionAdapter.ts` - Added `checkCachedUrl()` function
    - `server.py` - Added `/api/check` endpoint (lines 99-127)
    - `services/task_store.py` - Added `find_recent_task_by_url()` method (lines 258-301)
    - `app/hooks/useChatSession.ts` - Integrated cache-first flow (lines 202-241)
  - **Benefits**:
    - Instant results for repeated URLs
    - No duplicate task creation
    - Better UX with progressive loading

- [x] **Screenshot display in URL preview cards**
  - **Priority**: High
  - **Status**: Complete (2025-10-08)
  - **Description**: Show article screenshots in chat preview cards
  - **Current status**:
    - Extraction service captures screenshots ✅
    - Screenshots uploaded to GCS with `screenshot_url` field ✅
    - `screenshot_url` included in extraction results (main.py:486, 548) ✅
    - Already exposed in `/api/check` response (via `result` object) ✅
    - extractionAdapter fallback chain uses `screenshot_url` as first choice ✅
  - **Implementation**:
    - ✅ `screenshot_url` automatically included in `/api/check` response
    - ✅ extractionAdapter.ts updated to prioritize screenshot_url (line 94-96)
    - ✅ URLPreview component already handles thumbnail display
  - **Testing**: New extractions will automatically show screenshots, old cached tasks will gracefully degrade
  - **Note**: Houston task was extracted before screenshot feature, so no screenshot available for that cached result

- [ ] **Better loading states for multi-stage extraction**
  - **Priority**: Medium
  - **Description**: Show progressive feedback during extraction stages
  - **Stages to show**:
    1. "Checking cache..." (cache check)
    2. "Fetching preview..." (iFramely stage)
    3. "Extracting content..." (full extraction)
    4. "Analyzing claims..." (semantization)
  - **Implementation**: Update typing messages in useChatSession.ts
  - **Current**: Generic "Analyzing..." message

- [ ] **Story match search improvements**
  - **Priority**: Medium
  - **Description**: Better semantic search for related threads
  - **Current**: Searches Neo4j with URL title/description
  - **Enhancements needed**:
    - [ ] Use article content for better matching (not just title)
    - [ ] Show match confidence scores
    - [ ] Deduplicate matches from same story
    - [ ] Sort by relevance + recency

## Priority 3: Technical Debt

- [ ] **Add og_metadata to extraction results**
  - **Location**: `here-extraction-service/services/universal_web_extractor.py`
  - **Action**: Extract Open Graph metadata (og:image, og:title, etc.)
  - **Benefit**: Provides rich preview images for all extractions

- [ ] **Ensure preview_meta is persisted from iFramely stage**
  - **Location**: `here-extraction-service/main.py:476-480`
  - **Action**: Verify `task_store.set_preview_meta()` is working correctly
  - **Benefit**: Fast previews available even after full extraction completes

- [ ] **Error handling for cache failures**
  - **Location**: `app/utils/extractionAdapter.ts:142-145`
  - **Current**: Silently falls back to normal extraction on error
  - **Improvement**: Log cache check failures, show user feedback

- [ ] **Cache invalidation strategy**
  - **Current**: 24-hour TTL for all cached results
  - **Enhancements**:
    - [ ] Configurable TTL per domain (e.g., news sites vs. static content)
    - [ ] Manual "refresh" option to bypass cache
    - [ ] Content-based invalidation (detect if article updated)

- [ ] **Performance monitoring**
  - **Metrics to track**:
    - [ ] Cache hit rate
    - [ ] Average extraction time by stage
    - [ ] Failed extraction rate by domain
    - [ ] API endpoint response times
  - **Implementation**: Add logging to key endpoints, use analytics service

## Priority 4: UI/UX Polish

- [ ] **Preview card animations**
  - **Description**: Smooth transitions when preview data arrives
  - **Stages**:
    1. Show skeleton loader during cache check
    2. Fade in preview when iFramely data arrives
    3. Update with richer data when full extraction completes
  - **Location**: `app/components/chat/URLPreviewCard.tsx`

- [ ] **Error states for blocked/failed extractions**
  - **Description**: User-friendly error messages
  - **Cases to handle**:
    - Paywall detected → "Article requires subscription"
    - Cloudflare block → "Unable to access site"
    - 404 page → "Article not found"
    - Generic error → "Extraction failed, try again"
  - **Location**: `app/hooks/useChatSession.ts`

- [ ] **Chat history persistence**
  - **Description**: Save chat sessions to localStorage or backend
  - **Benefits**: Users can resume conversations, review past searches
  - **Implementation**: Store messages array, restore on page load

## Completed Features ✅

### Cache-First Extraction Flow (2025-10-08)
- ✅ Implemented `/api/check` endpoint for cache lookups
- ✅ Added `find_recent_task_by_url()` to TaskStore
- ✅ Integrated cache check into useChatSession hook
- ✅ Progressive loading: cache → preview → full extraction
- ✅ Avoided Firestore composite index requirement with Python filtering

## Notes

- Cache implementation uses Python-side filtering to avoid complex Firestore index
- Two-stage extraction (iFramely + full) provides progressive enhancement
- Next focus: Fix og_metadata/preview_meta persistence for image thumbnails
- Screenshot URLs already available in extraction service, need frontend integration
