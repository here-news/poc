# Seeding Flow – "Seed a Thread"

## Purpose

Introduce an in-situ conversational intake on the homepage that lets users surface
emerging story ideas without jumping to a new page. The flow should feel like
planting a seed that can grow into a full narrative thread, aligned with our
intelligence journalism model.

## Entry Point

- CTA: **Seed a Thread** (primary button in the right-hand panel)
- Placement: Replaces the current single URL input on the homepage (right column)
- Keeps a secondary link for the legacy "Quick URL extraction" for power users

## Interaction Outline

1. User clicks **Seed a Thread**
2. A chat-style composer expands in place:
   - Prompt text: "What are you seeing? Paste a link or describe the signal."
   - Allow multiline text; auto-detect URLs to highlight
3. On submit, UI appends the user's message and immediately shows a system
   response placeholder: "Searching for related threads…"
4. Backend returns one of:
   - **Matches found**: A list of existing stories/threads (title, health
     indicator, last update). Each item has actions: "Open" / "Follow"
   - **No matches**: System asks a clarifying question, e.g., "Any source or
     attribution we should check?"
   - **URL present, extraction queued**: System confirms and provides a link to
     the task page once available
5. User can continue responding in the same panel. Conversation history is
   persisted per session (using the existing user ID) so returning users see
   prior seeds and system outcomes.

## Visual Design Notes

- Present messages as alternating bubbles (user right-aligned, system left).
- Keep the panel 1-column wide with a soft background; match existing gradient.
- Show a small activity indicator when searching/running heuristics.
- When search results appear, render them as cards inline with the chat flow.
- Include a subtle "Need the classic extractor?" link beneath the composer.

## Backend Touchpoints

- New endpoint: `POST /api/seed`
  - Body: `{ user_id, content, detected_urls: [] }`
  - Response: structured messages/events to drive the chat UI
- New Pub/Sub topic: `seed-requests` for asynchronous enrichment
- Firestore additions:
  - `seed_threads` collection storing session, content, status, related stories
  - Link to extraction tasks when seeds trigger full processing

## Success Criteria (MVP)

- Users can submit a seed and immediately see either matching stories or a
  follow-up question without page navigation.
- If a URL is included and extraction is triggered, the experience hands off to
  the existing Result page gracefully (providing a CTA in the chat).
- The existing URL-only flow remains accessible via secondary action.
- Session continuity is preserved using the already-implemented user ID.

## Future Enhancements

- Autosuggest entities/topics as user types (NER hinting)
- Allow attachments/screenshots (drop zone) for richer seeds
- Surface editorial notes when a seed graduates to a published story
- Integrate with notification system to alert users when their seed evolves

