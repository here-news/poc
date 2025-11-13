# Personal Share Box & Activity Feed UX

**Adding a personal engagement layer to balance public concerns with individual contributions**

---

## Problem Statement

Current design shows only **public concerns** feed. Users have no:
- Quick way to share observations/evidence
- Visibility into their own contribution history
- Sense of personal progress/impact
- Immediate feedback on their activity

**Solution:** Add a **Personal Share Box** with **Activity Timeline** in the right pane (desktop) or as a tab (mobile).

---

## Desktop Layout: Dual-Pane Design

### **Left Pane: Public Concerns (Unchanged)**
- Hot topics, stories, quests, etc.
- Community-driven content
- Discovery and exploration

### **Right Pane: Personal Space (NEW)**

```
┌─────────────────────────────────────────────────────────┐
│ PERSONAL SPACE                                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ 💭 Share an observation, evidence, or question...   ││
│ │ ┌─────────────────────────────────────────────────┐││
│ │ │ What do you want to share?                      │││
│ │ │                                                 │││
│ │ │ [Textarea - auto-expands]                       │││
│ │ └─────────────────────────────────────────────────┘││
│ │                                                     ││
│ │ [🔗 Add URL] [📎 Attach file] [🎯 Link to quest]  ││
│ │                                                     ││
│ │ Type:  [ Evidence ] [ Question ] [ Opinion ]       ││
│ │                          [Cancel]  [Share →]       ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ ─────────────────────────────────────────────────────  │
│                                                         │
│ YOUR ACTIVITY (12)                         [See All →] │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ ✅ Your evidence was used in a quest!              ││
│ │ "Flight logs from 1997..." → Quest: Trump-Epstein  ││
│ │ 💎 EV: 0.85 | ↑ 45 | 💬 12 | 2h ago                ││
│ │ [View →]                                            ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ 🔥 Your comment got upvoted                         ││
│ │ "This is significant. The frequency..." +23 votes   ││
│ │ On evidence by @bob_investigator | 5h ago           ││
│ │ [View →]                                            ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ 💬 New reply to your comment                        ││
│ │ @frank replied: "Good point. I found Epstein's..."  ││
│ │ On Quest: Trump-Epstein Connection | 1d ago         ││
│ │ [View →]                                            ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ 💰 Quest payout received: +50 credits               ││
│ │ Quest "Trump-Epstein Connection" converged          ││
│ │ Your evidence contributed to winning hypothesis     ││
│ │ New balance: 1,290C | 2d ago                        ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Share Box Features

### **1. Input States**

#### **Collapsed (Default)**
```
┌─────────────────────────────────────────┐
│ 💭 What's on your mind?                 │
│ [Click to share...]                     │
└─────────────────────────────────────────┘
```

#### **Expanded (On Click)**
```
┌─────────────────────────────────────────┐
│ 💭 Share an observation, evidence...    │
│ ┌─────────────────────────────────────┐ │
│ │ [Textarea with placeholder]         │ │
│ │                                     │ │
│ │                                     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [🔗 Add URL] [📎 File] [🎯 Link Quest] │
│                                         │
│ Type: [ Evidence ] [ Question ]         │
│                  [Cancel] [Share →]     │
└─────────────────────────────────────────┘
```

### **2. Auto-Suggestion**

When user pastes a URL, AI suggests:
```
┌─────────────────────────────────────────┐
│ 💡 Detected: News article               │
│ "Trump mentions Epstein in interview"   │
│ Source: CNN | Published: Nov 12, 2025   │
│                                         │
│ 🎯 Related quests:                      │
│ • Trump-Epstein Connection              │
│ • Trump-Maxwell relationship            │
│                                         │
│ [Link to Quest] [Just Share]            │
└─────────────────────────────────────────┘
```

### **3. Share Types**

| Type | Use Case | Icon | Destination |
|------|----------|------|-------------|
| **Evidence** | Links, documents, facts | 📄 | Submitted to quest or creates new |
| **Question** | Unclear topics | ❓ | May trigger quest creation |
| **Opinion** | Commentary | 💭 | General discussion or comment |
| **Poll** | Quick vote | 📊 | Creates poll concern |

---

## Activity Timeline Types

### **Activity Card Format**

```
┌─────────────────────────────────────────┐
│ [Icon] [Activity Type]                  │
│ [Primary Text - what happened]          │
│ [Secondary Text - context/metrics]      │
│ [Timestamp] [Action Button →]           │
└─────────────────────────────────────────┘
```

### **Activity Types**

#### **1. Evidence Used** ✅
```
✅ Your evidence was accepted in a quest!
"Flight logs from 1997..." → Quest: Trump-Epstein
💎 EV: 0.85 | ↑ 45 | 💬 12 | 2h ago
```

#### **2. High Engagement** 🔥
```
🔥 Your comment is trending!
"This is significant..." got 45 upvotes
On evidence by @bob | Rank: #2 comment
```

#### **3. Quest Update** 🎯
```
🎯 Quest you're following converged!
"Trump-Epstein Connection" → H1 won (58%)
Your evidence aligned with winning hypothesis
```

#### **4. Payout Received** 💰
```
💰 Quest payout: +50 credits
Quest "Trump-Epstein" resolved
Your contribution: 8.5% of total value
New balance: 1,290C
```

#### **5. New Reply** 💬
```
💬 @frank replied to your comment
"Good point. I found Epstein's calendar..."
On Quest: Trump-Epstein | 3h ago
```

#### **6. Reputation Milestone** 🏆
```
🏆 Reputation milestone reached!
You're now an Expert (8.5 → 9.0)
Unlocked: Create quests, higher voting weight
```

#### **7. Badge Earned** 🎖️
```
🎖️ Badge earned: "Truth Seeker"
Submit 10 high-value evidence pieces
Rarity: Rare | +20 credits bonus
```

#### **8. Your Share Became Concern** 📢
```
📢 Your share became a trending concern!
"New Epstein documents..." → Story #5
🔥 Heat: 82.3 | 👁 1.2k views | 💬 23 comments
```

---

## Mobile Layout

### **Approach: Tabbed Navigation**

```
┌──────────────────────────────────────────┐
│ [≡] EPISTEMIC          [🔔 3] [👤]       │
├──────────────────────────────────────────┤
│ ┌──────────────────────────────────────┐ │ ← Share Box (collapsed)
│ │ 💭 What's happening?  [Tap to share] │ │   Subtle, not intrusive
│ └──────────────────────────────────────┘ │
├──────────────────────────────────────────┤
│ [📰 Feed]  [👤 Your Activity]            │ ← Tabs
├──────────────────────────────────────────┤
│                                          │
│ [Concern 1]                              │
│                                          │
│ [Concern 2]                              │
│                                          │
│ [Concern 3]                              │
│                                          │
└──────────────────────────────────────────┘
```

### **Share Box States (Mobile)**

#### **Collapsed**
```
┌──────────────────────────────────────┐
│ 💭 What's happening? [Tap to share] │
└──────────────────────────────────────┘
```
- Single line
- Subtle gray background
- Doesn't take much space

#### **Expanded (Full Screen Modal)**
```
┌──────────────────────────────────────┐
│ [✕] Share                            │
├──────────────────────────────────────┤
│                                      │
│ What do you want to share?           │
│ ┌────────────────────────────────┐   │
│ │                                │   │
│ │ [Textarea]                     │   │
│ │                                │   │
│ └────────────────────────────────┘   │
│                                      │
│ [🔗 URL] [📎 File] [🎯 Quest]       │
│                                      │
│ Type: Evidence / Question / Opinion  │
│                                      │
│ [Cancel]             [Share →]       │
│                                      │
└──────────────────────────────────────┘
```

---

## Information Hierarchy

### **Desktop Priority**
1. **Share Box** (20% of right pane, always visible)
2. **Recent Activity** (Top 4-5 items, 60% of pane)
3. **"See All" Link** (Bottom, 20%)

### **Mobile Priority**
1. **Share Box** (Collapsed, minimal space)
2. **Tab Switch** (Easy to access "Your Activity")
3. **Feed First** (Default view is public feed)

---

## Activity Card Interactions

### **Click Behavior**
```
User clicks activity card
    ↓
Navigate to relevant location:
    - Evidence activity → Quest detail page (scroll to evidence)
    - Comment reply → Quest page (scroll to comment thread)
    - Quest update → Quest detail (show final state)
    - Payout → User profile (transaction history)
```

### **Swipe Actions (Mobile)**
```
Swipe Right: Mark as read ✓
Swipe Left: Archive/Hide 🗑️
Long Press: Quick actions menu
```

---

## Smart Sharing Flow

### **Scenario 1: Share with URL**

```
1. User pastes URL
2. AI fetches metadata (title, source, published date)
3. AI searches for related quests
4. Suggests linking to quest or creating new share
5. User confirms
6. Share posted + optionally submitted as evidence
```

### **Scenario 2: Share becomes Quest**

```
1. User shares: "Did Biden mention climate in State of Union?"
2. System detects question format
3. Suggests: "Create a quest for this?"
4. User approves
5. LLM generates hypotheses
6. Quest created with user's share as context
```

### **Scenario 3: Share becomes Poll**

```
1. User shares: "Do you think AI will replace programmers?"
2. System detects poll-like question
3. Suggests: "Turn this into a poll?"
4. Auto-generates options: Yes/No/Partially
5. Poll created and appears in concerns feed
```

---

## Gamification Elements

### **Activity Stats (Top of Personal Pane)**

```
┌─────────────────────────────────────────────────────┐
│ YOUR STATS TODAY                                    │
│ ───────────────────────────────────────────────────│
│ 📊 +45 rep  💰 +120C  ↑ 23 upvotes  💬 5 comments  │
└─────────────────────────────────────────────────────┘
```

### **Streak Tracker**

```
🔥 5-day streak!
Share evidence daily to maintain your streak
Next milestone: 7 days → +50C bonus
```

### **Progress Bars**

```
Next Rank: Expert → Master
────────────────────░░░ 85%
+0.7 rep needed (submit 2-3 more high-value evidence)
```

---

## Visual Design

### **Color Coding**

| Activity Type | Color | Reasoning |
|---------------|-------|-----------|
| Evidence used | Green | Success, contribution accepted |
| High engagement | Orange | Trending, hot activity |
| Quest update | Blue | Informational |
| Payout | Gold | Monetary reward |
| Reply | Indigo | Social interaction |
| Milestone | Purple | Achievement |

### **Icons**

```
✅ Evidence accepted
🔥 Trending/Hot
🎯 Quest-related
💰 Credits earned
💬 Social (comments/replies)
🏆 Milestone
🎖️ Badge
📢 Content promoted
```

---

## Implementation Notes

### **Data Model**

```typescript
interface Activity {
  id: string;
  user_id: string;
  type: 'evidence_used' | 'comment_upvoted' | 'quest_update' |
        'payout' | 'reply' | 'milestone' | 'badge' | 'promoted';

  title: string;           // "Your evidence was used in a quest!"
  description: string;     // Details
  reference_id: string;    // quest_id, evidence_id, etc.
  reference_type: string;  // 'quest', 'evidence', 'comment'

  metrics?: {
    upvotes?: number;
    comments?: number;
    credits?: number;
    epistemic_value?: number;
  };

  created_at: Date;
  is_read: boolean;
  is_archived: boolean;
}

interface Share {
  id: string;
  user_id: string;
  text: string;
  type: 'evidence' | 'question' | 'opinion' | 'poll';

  url?: string;            // Attached link
  attached_file?: string;
  linked_quest_id?: string;

  metadata?: {
    title?: string;        // From URL scraping
    source?: string;
    preview_image?: string;
  };

  status: 'draft' | 'shared' | 'promoted' | 'used_as_evidence';
  promoted_to_concern_id?: string;
  used_in_evidence_id?: string;

  created_at: Date;
  updated_at: Date;
}
```

---

## Benefits

### **For Users**
✅ **Immediate engagement** - Share from homepage without navigating
✅ **Personal progress tracking** - See impact of contributions
✅ **Feedback loop** - Know when evidence is used or upvoted
✅ **Gamification** - Streaks, stats, milestones
✅ **Context switching** - Easy toggle between public/personal

### **For Platform**
✅ **Increased submissions** - Lower friction to share
✅ **Better content quality** - Smart suggestions link to quests
✅ **User retention** - Activity feed creates "fear of missing out"
✅ **Network effects** - Replies/comments bring users back
✅ **Content discovery** - Shares can bubble up to concerns

---

## Next Steps

1. **Create interactive mockup** with share box and activity feed
2. **User test** the desktop dual-pane layout
3. **Validate** mobile collapsed/expanded states
4. **Test** smart suggestion accuracy (URL → quest matching)
5. **Iterate** on activity card priorities

---

**Status:** Design Proposal
**Last Updated:** November 2025
**Related Docs:** DESIGN_v0.1.md, UX_LAYOUT_STRATEGY.md
