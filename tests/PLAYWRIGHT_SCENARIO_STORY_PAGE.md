# Playwright Scenario: Story Page Metrics & Chat (Draft)

_Last updated: 2025-10-08 21:20 UTC_

## Objective
Ensure the redesigned Story Page from Sprint 1 renders hero imagery, metrics, calls-to-action, and chat sidebar interactions correctly when backed by the `/api/stories/{story_id}` endpoint.

## Pre-requisites
- Mock or real `/api/stories/{id}` endpoint returning fields described in `StoryPage.tsx` (`cover_image`, `entropy`, `confidence`, counts, locations, revision`).
- Optional: API stub for `/api/stories/{id}/chat` when chat sidebar is opened.

## Test Flow
1. **Load Story Details**
   - Navigate to `/story/{id}`.
   - Assert hero banner image is visible when `cover_image` set.
   - Verify status pill ("DEVELOPING STORY"), entropy bar width, and confidence metric.

2. **Story Summary Chips**
   - Confirm location pills render for each location.
   - Ensure artifact/verified facts chips show counts.

3. **Key Facts & Investigation CTA**
   - Check "✅ Key Verified Facts" section text references contributors/sources.
   - Confirm "Contribute to Investigation" link points to `/build/{id}`.

4. **Support Sidebar**
   - Verify support buttons ($5/$10/custom) appear with correct styling.
   - Confirm Story Stats card shows people count, artifact count, last updated human string.

5. **Chat Sidebar Toggle**
   - Click chat toggle; ensure sidebar slides in with story title.
   - Close sidebar; ensure toggle reappears.

## Implementation Notes
- Use Playwright route mocks to fulfill `/api/stories/{id}` with deterministic JSON fixtures.
- Capture trace/screenshot for each failure; add accessibility checks later (`@axe-core/playwright`).

## Next Steps
- Add scenario verifying entropy thresholds/health indicator styling once business rules land.
- Hook into real backend when endpoint is stable.
