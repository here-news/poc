# NewsRecursive MVP 1 - UX Wireframes

## Overview

This directory contains DrawIO wireframes for the **NewsRecursive MVP 1** user experience, based on the **Recursive Narrative Stack** model: Surface → Story → Backstage.

## Files

### newsrecursive-mvp1-wireframes.drawio

Single DrawIO file containing all wireframes organized as tabs:

**Tab 0: UI Map & Flow**
- High-level overview of all three screens
- User flow diagrams showing navigation between screens
- Data model entity connections
- Interaction patterns across the entire system

**Tab 1: Homepage**
- News Feed (default mode) with story cards
- Magazine Mode toggle (Phase 1.5 placeholder)
- Global Chat drawer for story submission
- Sorting and filtering controls
- Navigation to Profile and Notifications

**Tab 2: Story Page**
- Story title, summary, and timeline
- Verified claims and embedded artifacts
- Narrative Health Meter (Coherence Index)
- Backstage updates preview
- Stake/Tip actions
- "Ask Story" chat interface
- Cross-narratives (related stories)

**Tab 3: Builder Page**
- Categorized discussion board:
  - 🧩 Evidence/Sources
  - 🧠 Analysis/Interpretation
  - 🏛️ Institutional/Official Responses
  - 🪞 Reflections/Ethics & Impact
- Entropy trajectory chart
- Contributor leaderboard
- Quick artifact upload
- AI Assists (Phase 1.5 placeholders)

## Design Principles

### 1. Transparency
- **Narrative Health** visible on all screens (single unified metric)
- Real-time health tracking with visual color gradients
- Clear attribution and sourcing

### 2. Low Friction Contribution
- One-click access to chat and submission flows
- Quick artifact upload
- Minimal barriers to participation

### 3. Continuity
- Seamless transitions between public (Story) and backstage (Builder)
- Consistent navigation patterns
- Persistent health metrics across screens

### 4. Trust Through Process
- Minimal identity requirements (KYC-lite optional)
- Pseudonymous profiles supported
- Reputation through contribution quality

### 5. Scalability
- Modular React components:
  - `StoryCard`
  - `HealthBar`
  - `ChatDrawer`
  - `ThreadBoard`
  - `ArtifactUploader`
  - `EntropyChart`

## UX Refinements: Narrative Health

### One-Index Principle

To reduce cognitive load, MVP 1 uses a **single unified metric**: **Narrative Health**

**Why "Narrative Health"?**
- Familiar, neutral terminology (like "system health")
- Avoids academic jargon (entropy, coherence)
- Scales naturally: "Health ↑" implies entropy reduction without needing explanation

### Visual Design

**Color-Coded States (instead of raw decimals):**
- ⚠️ **Forming** (0–0.4): Red/Orange — Story just seeded, high uncertainty
- 🟡 **Developing** (0.4–0.7): Yellow — Active discussion, moderate coherence
- 🟢 **Coherent** (0.7–1.0): Green — Well-verified, low ambiguity

**Interactive Elements:**
- **Health bar**: Color gradient from red → yellow → green
- **Hover tooltip**: Shows detailed score (e.g., "Health: 0.74 — Stable")
- **Sparkline (optional)**: Mini trend graph showing improvement over time
- **Explanation tooltip**: "Narrative Health shows how coherent and verified a story is, based on sources and updates"

### Technical Mapping

- **Homepage**: Show state label + color bar
- **Story Page**: Add "Coherence Index (Hₙ)" in sidebar for engaged users
- **Builder Page**: Full entropy metrics for contributors
- **Backend**: `health_score = 1 - normalized_entropy`

## User Flows

### Flow 1: Discover → Read → Contribute
1. User browses Homepage feed
2. Clicks story card → Story Page
3. Reads content, sees health metrics
4. Clicks "Go to Builder" → Builder Page
5. Contributes evidence or analysis

### Flow 2: Ask → Seed New Story
1. User opens Global Chat
2. Pastes link or asks question
3. Newstr Bot suggests actions
4. User creates new story or merges with existing
5. New story appears in feed

### Flow 3: Iterate
1. Contributors discuss in Builder
2. Evidence added, claims verified
3. Entropy decreases (Hₙ ↓)
4. Health score updates on Story Page
5. Ranking changes on Homepage

## Data Model Integration

Each screen interacts with these core entities:

- **story**: Title, summary, health_score, created_at, updated_at
- **thread**: Category, story_id, posts_count, views_count
- **artifact**: URL, type, metadata, verified_by
- **claim**: Statement, sources, verification_status
- **contributor**: Username, reputation_score, total_tips
- **entropy_log**: story_id, timestamp, entropy_value

## MVP 1 Implementation Notes

### Included in MVP 1:
✅ All three screen layouts
✅ Story cards with health metrics
✅ Basic threading system
✅ Artifact upload
✅ Tip/stake buttons (functional)
✅ Entropy visualization

### Phase 1.5 (Placeholders in MVP 1):
⏸️ Magazine Mode (layout toggle only)
⏸️ AI-generated abstracts
⏸️ AI Assists (buttons present, minimal functionality)
⏸️ Advanced cross-reference suggestions

### Not in MVP 1:
❌ Full conversational Newstr Bot
❌ Complex semantic similarity matching
❌ Automated contradiction detection
❌ Multi-language support

## Opening the Wireframes

1. **Online**: Upload to [app.diagrams.net](https://app.diagrams.net)
2. **Desktop**: Download [Draw.io Desktop](https://github.com/jgraph/drawio-desktop/releases)
3. **VS Code**: Install the [Draw.io Integration extension](https://marketplace.visualstudio.com/items?itemName=hediet.vscode-drawio)

## Color Coding

- **Blue (#dae8fc)**: Navigation, primary actions
- **Green (#d5e8d4)**: Health metrics, positive indicators
- **Yellow (#fff2cc)**: Important features, highlights
- **Purple (#e1d5e7)**: Backstage/Builder elements
- **Orange (#ffe6cc)**: Collaborative workspace

## Next Steps

1. Convert wireframes to high-fidelity mockups
2. Build component library in React/Tailwind
3. Implement data fetching hooks
4. Connect to backend API (server.py)
5. Deploy MVP 1 for alpha testing

## Questions?

Refer to the main project README or the Entropic Narrative Model (ENM) documentation in `services/gist.md`.
