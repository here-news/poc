# Playwright Scenario: Result Page Screenshot & Story Match Flow (Draft)

Last Updated: 2025-10-11

Objective
Validate that the Result Page renders extraction outcomes, including preview imagery, story match metadata, and blocked-task handling.

Pre-requisites
- Backend (or mocked routes) returning completed tasks with `screenshot_url` and optional `story_match`.
- Playwright routing to stub `/api/task/{id}` and `/api/task/{id}/preview` responses.

Test Flow
1. Completed Task Rendering: hero image, domain, publish date, word count.
2. Screenshot Thumbnail Modal (pending UI): click thumbnail → zoom view loads.
3. Claims & Entities (future): render per semantic payload.
4. Duplicate Submission Banner: redirect from `/submit` shows reuse notice.
5. Blocked Task: preview hidden; blocked guidance copy shown.

Implementation Notes
- Store fixtures under `webapp/tests/fixtures/`.
- Capture `trace.zip` and screenshots on failure for CI.

