# Entity and Page Detail Views — Webapp Spec (Draft)

Last Updated: 2025-10-11
Status: Draft (Sprint 3 prototype)

Overview
- Add read-only views for extracted pages and canonical entities to validate the NER pipeline and coherence.

Routes
- `/page/:id` — Page detail
  - Data: title, canonical_url, domain, publish_date, word_count, processing_time, screenshot_url, cleaned excerpt, entities (people/orgs/locations)
  - API: `GET /api/pages/{id}` (new)
- `/entity/:type/:id` — Entity detail (type ∈ {person, organization, location})
  - Data: canonical_name, wikidata_qid?, aliases, mentions (sample), related stories/pages
  - API: `GET /api/entities/{type}/{id}` (new)

UI Components
- PageHeader: title, domain, publish date, screenshot banner (if present)
- EntityChips: chips by type; link to entity routes
- EntityHeader: name, type, QID badge; aliases list
- RelatedStories: minimal list linking story IDs/titles

Acceptance
- `/page/:id` renders with mocked API; shows entity chips; links work
- `/entity/:type/:id` renders canonical entity; shows at least one related story/page

Testing
- Playwright specs with route interception (no live backend):
  - `webapp/tests/e2e/page-detail.spec.ts`
  - `webapp/tests/e2e/entity-detail.spec.ts`

Notes
- Minimal styling; focus on data coherence and navigation
- Integrate progressively with real API once backend delivers endpoints

