# UX Design: Axiological Surface Visualization

## Design Philosophy

**Core Principle**: Make epistemic value tangible through visual hierarchy, clear attribution, and intuitive affordances.

**Goals**:
1. Show who contributed what value at a glance
2. Make source quality immediately visible
3. Display value attribution chain (Original Creator → Publisher → Curator)
3. Enable threaded discussions with visual depth
4. Preview artifacts (images, documents, videos) inline
5. Gamify truth-seeking through reputation tiers and badges

---

## Evidence Card Design (Enhanced)

```
┌──────────────────────────────────────────────────────────────────────┐
│ 📄 Evidence #1 · Oct 24, 2025 2:00 PM                        💰 $394 │
├──────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  🏛️  OFFICIAL STATEMENT                    ⭐⭐⭐⭐⭐ 0.95   │    │
│  │  U.S. Senate Official Letter                                 │    │
│  │  senate.gov/public/index.cfm/2025/10/risch-scott...         │    │
│  │                                                               │    │
│  │  [Senate seal thumbnail]                                      │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                        │
│  Senators Risch, Scott, and colleagues write official letter to      │
│  President Trump urging him to raise Jimmy Lai's case...             │
│                                                                        │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │ 💰 VALUE ATTRIBUTION                                         │     │
│  │                                                               │     │
│  │ 🏛️ U.S. Senate (Original)        40% · $157.60  [ESCROW]    │     │
│  │ 🌐 Senate.gov (Publisher)        10% · $39.40   [CREDIT]     │     │
│  │ 👤 user-policywonk (Curator)     40% · $157.60  ✓ Paid       │     │
│  │ 👥 Community Validators          10% · $39.40   📊 Split     │     │
│  └────────────────────────────────────────────────────────────┘     │
│                                                                        │
│  ┌─────────┐ ┌─────────┐ ┌─────────────┐                            │
│  │ Novelty │ │ Quality │ │ Truth Align │                            │
│  │  0.30   │ │  0.95   │ │    0.85     │                            │
│  └─────────┘ └─────────┘ └─────────────┘                            │
│                                                                        │
│  📊 Epistemic Value: 0.042 (4.2% of quest)                           │
│  💬 3 comments · 👍 12 upvotes · 👎 1 downvote                       │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ 💬 DISCUSSION THREAD                                          │   │
│  │                                                                │   │
│  │  👤 user-policywonk  [TRUSTED] 🥉              2 hours ago    │   │
│  │  ├─ Strong bipartisan pressure on Trump. This is             │   │
│  │  │  official policy now.                                      │   │
│  │  │                                                             │   │
│  │  │  └─ 👤 user-chinahawk  [CONTRIBUTOR] 🌱    1 hour ago     │   │
│  │  │     ├─ Finally! Senate is taking this seriously.          │   │
│  │  │     │  Lai has been detained 4 years!                     │   │
│  │  │     │                                                      │   │
│  │  │     └─ 👤 user-skeptic  [NOVICE]          30 mins ago     │   │
│  │  │        └─ Letters are nice, but will Trump                │   │
│  │  │           actually do it when face-to-face with Xi?       │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  [Add Comment] [Flag as Misinfo] [View Full Source]                  │
│                                                                        │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Key Visual Elements

### 1. Source Quality Badges

```
⭐⭐⭐⭐⭐ 0.95  Wire Service / Government Official
⭐⭐⭐⭐   0.80  Major Newspaper / Credentialed Journalist
⭐⭐⭐     0.60  Regional News / Verified Social Media
⭐⭐       0.40  Analysis / Secondary Source
⭐         0.20  Unverified / Social Media
```

### 2. Evidence Type Icons

```
🏛️  Official Statement (government_official)
📰  News Article (wire_service, major_newspaper)
🎬  Video Primary (verified_video)
📝  Transcript (transcript_extraction)
🐦  Social Media (social_media, verified_social_media)
🤖  AI Generated (ai_generated_content) [RED FLAG]
🔍  Analysis (analysis_piece)
```

### 3. User Reputation Tiers with Avatars

```
👤 [AUTHORITY]  🏆   Tier 5 · Multiplier 2.0x
👤 [EXPERT]     💎   Tier 4 · Multiplier 1.5x
👤 [TRUSTED]    🥉   Tier 3 · Multiplier 1.2x
👤 [CONTRIBUTOR] 🌱   Tier 2 · Multiplier 1.0x
👤 [NOVICE]     ⚪   Tier 1 · Multiplier 0.8x
```

### 4. Value Attribution Visual

```
┌────────────────────────────────────────────────┐
│ 💰 VALUE SPLIT ($394 total)                    │
├────────────────────────────────────────────────┤
│                                                 │
│  🏛️ U.S. Senate                                │
│  ████████████████░░░░░░░░░░ 40% · $157.60     │
│  [HELD IN ESCROW] Can claim or donate          │
│                                                 │
│  🌐 Senate.gov                                 │
│  ████░░░░░░░░░░░░░░░░░░░░░░ 10% · $39.40      │
│  [PUBLIC CREDIT] Non-monetary recognition      │
│                                                 │
│  👤 user-policywonk [TRUSTED]                  │
│  ████████████████░░░░░░░░░░ 40% · $157.60     │
│  ✓ PAID · Added to your account                │
│                                                 │
│  👥 Validators (12 upvotes)                    │
│  ████░░░░░░░░░░░░░░░░░░░░░░ 10% · $39.40      │
│  📊 $3.28 each · Distributed                   │
│                                                 │
└────────────────────────────────────────────────┘
```

### 5. Artifact Thumbnails

#### For URLs (Link Preview)
```
┌──────────────────────────────────────────┐
│ 🔗 senate.gov                             │
│                                           │
│ [Senate Seal Logo]                        │
│                                           │
│ Risch, Scott Write Letter to Trump       │
│ U.S. Senate Committee on Foreign...      │
│                                           │
│ ⭐⭐⭐⭐⭐ Official Government Source      │
└──────────────────────────────────────────┘
```

#### For Images
```
┌──────────────────────────────────────────┐
│ 🖼️ Image Evidence                        │
│                                           │
│ [Thumbnail Preview]                       │
│                                           │
│ Screenshot of Trump press conference      │
│ 📏 1920x1080 · 📅 Oct 30, 2025           │
│                                           │
│ [View Full Size] [Download]              │
└──────────────────────────────────────────┘
```

#### For Videos
```
┌──────────────────────────────────────────┐
│ 🎬 youtube.com/watch?v=g6GfiUnj5jE       │
│                                           │
│ [Video Thumbnail with ▶️ Play Button]    │
│                                           │
│ Trump Post-Meeting Press Gaggle           │
│ 📹 8:32 duration · 👁️ 2.3M views         │
│                                           │
│ ⭐⭐⭐⭐ Primary Source Video             │
│ [Watch on YouTube] [Transcript]          │
└──────────────────────────────────────────┘
```

---

## Tree-View Comments (Threaded Discussion)

```
💬 DISCUSSION (3 comments)

┌─ 👤 user-policywonk  [TRUSTED] 🥉              2 hours ago
│   Strong bipartisan pressure on Trump. This is official policy now.
│
│   👍 8  👎 0  💬 Reply
│
├──┌─ 👤 user-chinahawk  [CONTRIBUTOR] 🌱         1 hour ago
│  │   Finally! Senate is taking this seriously. Lai has been
│  │   detained 4 years!
│  │
│  │   👍 5  👎 0  💬 Reply
│  │
│  └──┌─ 👤 user-skeptic  [NOVICE] ⚪             30 mins ago
│     │   Letters are nice, but will Trump actually do it when
│     │   face-to-face with Xi?
│     │
│     │   👍 3  👎 1  💬 Reply
│
└─ 👤 user-buildera  [EXPERT] 💎                  45 mins ago
    This sets the official U.S. position before the meeting.
    Good strategic timing.

    👍 12  👎 0  💬 Reply
```

---

## Full Quest Page Layout

```
┌────────────────────────────────────────────────────────────────────┐
│ ← Back to Quests                                    [Share] [Flag]  │
├────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  🏆 CONVERGED                                                       │
│                                                                      │
│  Did Trump raise Jimmy Lai's case with Xi Jinping?                 │
│                                                                      │
│  💰 Total Bounty: $10,423 · 🔬 9 Evidence · 👥 8 Contributors      │
│  📅 Created Oct 24, 2025 · ✅ Converged Nov 6, 2025                │
│                                                                      │
├────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  📊 HYPOTHESES & OUTCOME                                            │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ 🏆 WINNER · 81.3% confidence                                  │ │
│  │                                                                │ │
│  │ "Trump did raise Jimmy Lai's case with Xi Jinping            │ │
│  │  during their meeting"                                        │ │
│  │                                                                │ │
│  │ ████████████████████████████████████████████░░░░░ 81.3%      │ │
│  │                                                                │ │
│  │ 💡 Winning Evidence: Reuters confirmation with 3 sources      │ │
│  │ 💰 Bounty Pool: $8,542 distributed to supporters              │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ "Trump did not raise Jimmy Lai's case" · 18.7%               │ │
│  │ ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 18.7%       │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                      │
├────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  💰 AXIOLOGICAL SURFACE (Value Distribution)                        │
│                                                                      │
│  Total Pool: $10,423 → Platform Fee (10%): $1,042                  │
│  Distributed: $9,381                                                │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ 📊 Top Contributors by Epistemic Value                        │ │
│  ├──────────────────────────────────────────────────────────────┤ │
│  │                                                                │ │
│  │ 1. 👤 user-buildera [EXPERT] 💎           $1,850 (19.7%)     │ │
│  │    Evidence: Reuters article + video analysis                 │ │
│  │    Epistemic value: 0.217                                     │ │
│  │                                                                │ │
│  │ 2. 🏛️ U.S. Senate [EXTERNAL]              $1,575 (16.8%)     │ │
│  │    Evidence: Official letter (via user-policywonk)            │ │
│  │    Status: Held in escrow                                     │ │
│  │                                                                │ │
│  │ 3. 👤 user-owen [TRUSTED] 🥉              $1,200 (12.8%)     │ │
│  │    Evidence: White House official confirmation                │ │
│  │    Epistemic value: 0.098                                     │ │
│  │                                                                │ │
│  │ 4. 📰 Reuters [EXTERNAL]                   $1,088 (11.6%)     │ │
│  │    Evidence: Investigative article (via user-buildera)        │ │
│  │    Status: Claimable by organization                          │ │
│  │                                                                │ │
│  │ 5. 👤 user-sebastian [CONTRIBUTOR] 🌱      $925 (9.9%)       │ │
│  │    Evidence: Family confirmation                              │ │
│  │    Epistemic value: 0.072                                     │ │
│  │                                                                │ │
│  │ [View Full Distribution] [Download CSV]                       │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                      │
├────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  🔍 EVIDENCE TIMELINE                                               │
│                                                                      │
│  [Filter: All | Primary Sources | Secondary | Flagged]             │
│  [Sort: Chronological | Epistemic Value | Controversy]             │
│                                                                      │
│  [Evidence cards appear here as designed above...]                  │
│                                                                      │
└────────────────────────────────────────────────────────────────────┘
```

---

## Color Palette & Visual Language

### Source Credibility Colors
```
🟢 Green (0.8-1.0)   - Highly credible (Reuters, Government)
🔵 Blue (0.6-0.79)   - Credible (Major newspapers, journalists)
🟡 Yellow (0.4-0.59) - Moderate (Regional news, verified social)
🟠 Orange (0.2-0.39) - Questionable (Unverified, anonymous)
🔴 Red (0.0-0.19)    - Low credibility (AI-generated, spam)
```

### Value Attribution Colors
```
🟣 Purple - Original Creator (Senate, Reuters journalists)
🔵 Blue   - Publisher/Platform (senate.gov, reuters.com)
🟢 Green  - Curator (Truth Market user who found it)
🟡 Yellow - Validators (Community upvoters)
```

### Reputation Tier Colors
```
🏆 Gold    - Authority (Tier 5)
💎 Diamond - Expert (Tier 4)
🥉 Bronze  - Trusted (Tier 3)
🌱 Green   - Contributor (Tier 2)
⚪ White   - Novice (Tier 1)
```

---

## Interactive Elements

### Hover States

**Evidence Card**:
- Shows full value attribution breakdown
- Displays source quality metrics
- Previews artifact thumbnails

**User Avatar**:
- Shows reputation stats
- Displays contribution history
- Links to user profile

**Comment Thread**:
- Highlights branch on hover
- Shows reply depth visually
- Collapses/expands branches

### Click Actions

- **Evidence Card** → Opens evidence detail modal with full source
- **Artifact Thumbnail** → Opens artifact in lightbox/player
- **Value Attribution** → Shows detailed calculation breakdown
- **User Avatar** → Opens user profile/reputation page
- **Comment** → Focuses reply box
- **Flag Button** → Opens misinformation reporting modal

---

## Mobile Responsive Design

- Stack value attribution horizontally
- Collapse comment threads by default
- Use bottom sheet for evidence details
- Swipe left on evidence card to flag
- Pull to refresh evidence timeline

---

## Implementation Priority

1. ✅ Evidence cards with source badges
2. ✅ Tree-view comments with threading
3. ✅ User avatars with reputation tiers
4. ✅ Artifact thumbnails (URL previews, images, videos)
5. ✅ Value attribution labels
6. ✅ Axiological surface dashboard
7. ✅ Interactive filtering and sorting

This UX makes the axiological framework **tangible, visual, and engaging**!
