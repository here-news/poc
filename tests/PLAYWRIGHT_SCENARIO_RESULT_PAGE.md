# Playwright Scenario: Result Page Screenshot & Story Match Flow (Draft)

_Last updated: 2025-10-08 21:20 UTC_

## Objective
Validate that the Result Page renders extraction outcomes from Sprint 1, including preview imagery, story match metadata, and blocked-task handling.

## Pre-requisites
- Extraction service (or mocked API routes) returning:
  - `status: completed` tasks with `screenshot_url`, `story_match`, and semantic fields.
  - `status: blocked` tasks without screenshots.
- Playwright routing to stub `/api/task/{id}` and `/api/task/{id}/preview` responses.

## Test Flow
1. **Completed Task Rendering**
   - Visit `/tasks/{task_id}`.
   - Assert hero preview image displays.
   - Check metadata (domain, publish date, word count, processing time).
   - Verify story match ribbon shows matched title + match percentage (`story_match.match_score`).

2. **Screenshot Thumbnail Modal** *(pending UI implementation)*
   - When thumbnail modal lands, click to open zoom view, assert high-res image loads.

3. **Claims & Entities Section**
   - Ensure claims accordion renders per semantic data (future test once available).

4. **Duplicate Submission Banner**
   - Simulate redirect from `/submit`, confirm reuse banner or toast visible.

5. **Blocked Task Regression**
   - Hit task with `status=blocked`.
   - Verify preview section hidden, display blocked guidance copy.

## Implementation Notes
- Use shared fixtures under `hn4/tests/fixtures/` to maintain sprint data (story match fields, preview image URLs).
- Capture Playwright `trace.zip` and screenshots on failure for CI debugging.
- Expand once screenshot lightbox is available.

## Next Steps
- Wire story match assertions once UI exposes match block on Result page.
- Align with extraction adapter updates delivering `story_match` to the page.
