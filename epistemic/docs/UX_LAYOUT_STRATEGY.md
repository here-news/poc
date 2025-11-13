# UX Layout Strategy - Adaptive Concern Views

**Problem:** Different concern types have different information priorities:
- **Entity concerns** (Who is Jimmy Lai?) → Need ontological intro first
- **Quest concerns** (Did Trump mention Jimmy Lai?) → Need evidence/convergence first

**Solution:** Adaptive layouts that prioritize content based on concern type.

---

## Layout Patterns by Concern Type

### **Pattern A: Entity-First Layout** (Person, Organization)

**Use When:** User needs to learn about an entity
**Primary Goal:** Educate user about who/what this is

```
┌──────────────────────────────────────────────────────────────┐
│ 👤 Who is Jimmy Lai?                                         │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ ENTITY CARD (Neo4j)                              [Edit]│ │
│ │ ──────────────────────────────────────────────────────│ │
│ │ [Photo]  Jimmy Lai Chee-ying (黎智英)                  │ │
│ │          Hong Kong media tycoon, pro-democracy activist│ │
│ │          Born: 1948 | Nationality: Hong Kong          │ │
│ │                                                        │ │
│ │ Founded: Apple Daily (蘋果日報) newspaper              │ │
│ │ Notable: Arrested 2020 under National Security Law    │ │
│ │ Status: Imprisoned since Dec 2020                      │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ KNOWLEDGE GRAPH                                        │ │
│ │ ──────────────────────────────────────────────────────│ │
│ │     [Apple Daily]                                      │ │
│ │           │                                            │ │
│ │     [Jimmy Lai] ─── [Hong Kong Democracy Movement]    │ │
│ │           │                                            │ │
│ │     [National Security Law]                            │ │
│ │                                                        │ │
│ │ Related entities: 12 people, 5 organizations          │ │
│ │ [Explore Full Graph →]                                 │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ ACTIVE DISCUSSIONS (3)                                 │ │
│ │ ──────────────────────────────────────────────────────│ │
│ │ 🎯 Quest: Did Trump mention Jimmy Lai to Xi?          │ │
│ │    Status: 🔄 Active | Bounty: 450C | Evidence: 18    │ │
│ │    Convergence: H1 (58%) vs H2 (42%)                  │ │
│ │    [View Quest →]                                      │ │
│ │                                                        │ │
│ │ 📊 Poll: Should Jimmy Lai be released?                │ │
│ │    Yes: 72% | No: 28% | 2.3k votes                    │ │
│ │    [View Poll →]                                       │ │
│ │                                                        │ │
│ │ 💬 Discussion: Jimmy Lai's impact on HK democracy     │ │
│ │    45 comments | Started 2d ago                        │ │
│ │    [View Discussion →]                                 │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ TIMELINE (Recent Events)                               │ │
│ │ ──────────────────────────────────────────────────────│ │
│ │ 2024-11-10: Trial continues on sedition charges        │ │
│ │ 2023-12-28: Convicted under National Security Law      │ │
│ │ 2020-12-11: Arrested and denied bail                   │ │
│ │ 2020-06-30: National Security Law enacted              │ │
│ │ [View Full Timeline →]                                  │ │
│ └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

**Information Hierarchy:**
1. **Entity Card** (80% visible) - Who is this person?
2. **Knowledge Graph** (60% visible) - How are they connected?
3. **Active Discussions** (40% visible) - What are people debating?
4. **Timeline** (20% visible) - What's the history?

**User Flow:**
```
Land → Read entity info → Explore graph → Choose a quest to dive into
```

---

### **Pattern B: Quest-First Layout** (Quest, Investigation)

**Use When:** User wants to know if something is true
**Primary Goal:** Show evidence and convergence status

```
┌──────────────────────────────────────────────────────────────┐
│ 🎯 Did Trump mention Jimmy Lai during meeting with Xi?      │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ QUEST STATUS                                  [Active]│ │
│ │ ──────────────────────────────────────────────────────│ │
│ │ 💰 Bounty: 450 credits | 🕐 Active: 3d 4h            │ │
│ │ 📊 Evidence: 18 submissions | 👥 Contributors: 12     │ │
│ │                                                        │ │
│ │ Convergence: ▓▓▓▓▓▓░░░░ 58% (Moderate confidence)    │ │
│ │ Entropy: 0.48 (Moderate uncertainty)                  │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ HYPOTHESES                                             │ │
│ │ ──────────────────────────────────────────────────────│ │
│ │ H1: Yes, Trump mentioned Jimmy Lai                     │ │
│ │ ████████████████████████████████░░░░░░░░ 58.3%        │ │
│ │ Supporting: 12 | Refuting: 3                           │ │
│ │                                                        │ │
│ │ H2: No mention, or only indirect reference             │ │
│ │ █████████████████░░░░░░░░░░░░░░░░░░░░░ 41.7%          │ │
│ │ Supporting: 8 | Refuting: 7                            │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ CONTEXT (Collapsible)                      [Expand ▼] │ │
│ │ ──────────────────────────────────────────────────────│ │
│ │ Background: Trump met with Xi Jinping at Mar-a-Lago   │ │
│ │ on Oct 30, 2024. Jimmy Lai is a Hong Kong activist... │ │
│ │                                                        │ │
│ │ Key entities:                                          │ │
│ │ • Donald Trump (US President 2017-2021, 2025-)        │ │
│ │ • Xi Jinping (China President)                         │ │
│ │ • Jimmy Lai (HK activist, imprisoned)                  │ │
│ │ [View Entity Graph →]                                  │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ EVIDENCE TIMELINE                      [Filter ▼] [⚙] │ │
│ │ ──────────────────────────────────────────────────────│ │
│ │ 📄 Flight logs show 7 trips (💎 EV: 0.85)             │ │
│ │    @bob_investigator | 2h ago | ↑45 ↓3 | 💬12        │ │
│ │    [Expand]                                            │ │
│ │                                                        │ │
│ │ 🎥 Interview: Trump says "acquaintance" (💎 EV: 0.62) │ │
│ │    @alice_chen | 5h ago | ↑23 ↓8 | 💬34              │ │
│ │    [Expand]                                            │ │
│ │                                                        │ │
│ │ [▼ Load 16 more evidence pieces...]                   │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                              │
│ [➕ Submit Evidence] [💰 Add Bounty] [💬 Discuss]         │
└──────────────────────────────────────────────────────────────┘
```

**Information Hierarchy:**
1. **Quest Status** (100% visible) - What's the current state?
2. **Hypotheses** (100% visible) - What are we investigating?
3. **Context** (Collapsed by default) - Background info if needed
4. **Evidence** (80% visible) - What's the proof?

**User Flow:**
```
Land → See hypotheses → Read evidence → Vote/comment → Submit own evidence
```

---

### **Pattern C: Hybrid Layout** (Story, Event)

**Use When:** Content + Quest both matter
**Primary Goal:** Understand what happened, then see debate

```
┌──────────────────────────────────────────────────────────────┐
│ 📰 Trump-Epstein Emails Released                             │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ STORY SUMMARY                                     [NY]│ │
│ │ ──────────────────────────────────────────────────────│ │
│ │ Newly released emails from 1997 reveal frequent       │ │
│ │ communication between Donald Trump and Jeffrey        │ │
│ │ Epstein, including plans for social gatherings...    │ │
│ │                                                        │ │
│ │ Source: New York Times | Published: Nov 12, 2024     │ │
│ │ [Read Full Article →]                                  │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ ACTIVE QUEST: Trump-Epstein Connection?      [🔄Active]│ │
│ │ ──────────────────────────────────────────────────────│ │
│ │ 💰 450C | Convergence: 58% | Evidence: 18             │ │
│ │                                                        │ │
│ │ H1: Close friends (58%) ████████████████░░░░          │ │
│ │ H2: Business only (42%) ████████████░░░░░░            │ │
│ │                                                        │ │
│ │ [View Full Quest →]   [Submit Evidence]               │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ KEY ENTITIES (Neo4j)                                   │ │
│ │ ──────────────────────────────────────────────────────│ │
│ │ [Donald Trump] ──── [Jeffrey Epstein]                 │ │
│ │                           │                            │ │
│ │                     [Ghislaine Maxwell]                │ │
│ │ [Explore Graph →]                                      │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ COMMUNITY DISCUSSION (89 comments)                     │ │
│ │ ──────────────────────────────────────────────────────│ │
│ │ Top comment: "This confirms the flight logs..." ↑67   │ │
│ │ [View All Comments →]                                  │ │
│ └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

**Information Hierarchy:**
1. **Story Summary** (100% visible) - What's the news?
2. **Active Quest** (60% visible) - What's the investigation?
3. **Entities** (40% visible) - Who's involved?
4. **Discussion** (20% visible) - What's the conversation?

---

## Implementation Strategy

### **Adaptive Component System**

```typescript
// Concern detail page
interface ConcernDetailProps {
  concern: Concern;
}

function ConcernDetail({ concern }: ConcernDetailProps) {
  // Route to appropriate layout based on type
  switch (concern.type) {
    case 'person':
    case 'org':
      return <EntityFirstLayout concern={concern} />;

    case 'quest':
      return <QuestFirstLayout concern={concern} />;

    case 'story':
    case 'event':
      return <HybridLayout concern={concern} />;

    case 'poll':
      return <PollLayout concern={concern} />;

    default:
      return <GenericLayout concern={concern} />;
  }
}
```

### **Layout Components**

```typescript
// Pattern A: Entity First
function EntityFirstLayout({ concern }) {
  return (
    <div className="entity-layout">
      <EntityCard entity={concern.neo4j_node} />     {/* 80% visible */}
      <KnowledgeGraphPreview entity={concern.neo4j_node} /> {/* 60% */}
      <RelatedQuests concernId={concern.id} />       {/* 40% */}
      <TimelineWidget concernId={concern.id} />      {/* 20% */}
    </div>
  );
}

// Pattern B: Quest First
function QuestFirstLayout({ concern }) {
  const quest = concern.activeQuest;

  return (
    <div className="quest-layout">
      <QuestStatus quest={quest} />                  {/* 100% visible */}
      <HypothesesView quest={quest} />               {/* 100% */}
      <ContextPanel concern={concern} collapsed />   {/* Collapsed */}
      <EvidenceTimeline quest={quest} />             {/* 80% */}
    </div>
  );
}

// Pattern C: Hybrid
function HybridLayout({ concern }) {
  return (
    <div className="hybrid-layout">
      <StoryCard story={concern.metadata} />         {/* 100% visible */}
      <ActiveQuestPreview concernId={concern.id} />  {/* 60% */}
      <EntityGraph concernId={concern.id} />         {/* 40% */}
      <DiscussionPreview concernId={concern.id} />   {/* 20% */}
    </div>
  );
}
```

---

## Smart Context Panel

For **quest-first layouts**, add a **collapsible context panel** that appears when user needs background:

```
┌────────────────────────────────────────┐
│ CONTEXT                     [Expand ▼]│ ← Collapsed by default
│────────────────────────────────────────│
│ 🔍 Don't know the background?          │
│ [Show Context]                         │
└────────────────────────────────────────┘

                ↓ User clicks

┌────────────────────────────────────────┐
│ CONTEXT                  [Collapse ▲] │
│────────────────────────────────────────│
│ Background:                            │
│ • Who is Jimmy Lai? [View Entity →]   │
│ • Trump-Xi Meeting [View Event →]     │
│                                        │
│ Timeline:                              │
│ • Oct 30: Trump-Xi meeting             │
│ • 2020: Jimmy Lai arrested             │
│                                        │
│ Knowledge Graph:                       │
│ [Interactive graph here]               │
└────────────────────────────────────────┘
```

**Benefits:**
- ✅ Quest info stays primary for users who know context
- ✅ Background available on-demand for users who need it
- ✅ Prevents cluttering quest view with entity info

---

## Navigation Flow

### **Entity → Quest Flow**
```
User: "Who is Jimmy Lai?"
→ Lands on entity page
→ Reads bio (Pattern A)
→ Sees "Active Quest: Did Trump mention him?"
→ Clicks quest
→ Navigates to quest page (Pattern B)
```

### **Quest → Entity Flow**
```
User: "Did Trump mention Jimmy Lai?"
→ Lands on quest page (Pattern B)
→ Sees hypothesis and evidence
→ Clicks "Show Context" panel
→ Sees "Who is Jimmy Lai?" link
→ Opens entity card in modal OR navigates to entity page
```

---

## Mobile Considerations

On mobile, use **tabbed navigation** instead of trying to show everything:

```
┌─────────────────────────────────────┐
│ 🎯 Did Trump mention Jimmy Lai?     │
├─────────────────────────────────────┤
│ [Quest] [Context] [Entities] [Chat]│ ← Tabs
├─────────────────────────────────────┤
│                                     │
│ QUEST TAB (selected):               │
│ • Status                            │
│ • Hypotheses                        │
│ • Evidence                          │
│                                     │
└─────────────────────────────────────┘
```

---

## Summary

### **Key Insight**
Different concern types have different **mental models**:
- **Entity**: "Teach me about X"
- **Quest**: "Show me the evidence for Y"
- **Story**: "What happened? What do people think?"

### **Solution**
**Adaptive layouts** that prioritize content based on user intent:
- Entity concerns → Ontology first, discussions second
- Quest concerns → Evidence first, context on-demand
- Story concerns → Summary first, quest preview second

### **Benefits**
✅ Each concern type gets optimal UX
✅ No awkward "one size fits all" layout
✅ Users get what they need without scrolling
✅ Clear information hierarchy per use case

---

**Next Steps:**
1. Create detailed mockups for each pattern
2. User test the adaptive approach
3. Implement layout routing logic
4. Build collapsible context panel component
