# UX Redesign Plan - Simplified Submission + Story Chat

**Date**: 2025-10-08
**Status**: Planning

---

## 🎯 Vision

### Current Flow (Complex)
```
Homepage
├── Full chat interface
├── URL submission via chat
├── Story matching in chat
└── Navigate to story page
    └── Static story view (no chat)
```

### New Flow (Simplified)
```
Homepage
├── Simple input box (URL/text/file)
├── Submit button
└── Results list below
    ├── Story 1 [View Story →]
    ├── Story 2 [View Story →]
    └── Story 3 [View Story →]

Story Page
├── Story content (main area)
└── Collapsible chat sidebar
    ├── Collapsed by default
    ├── Click to expand
    └── Full chat interface for this story
```

---

## 📐 Homepage Redesign

### New Layout
```
┌────────────────────────────────────────────────────────────────────┐
│  Logo                                               [Profile]      │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌─────────────── Submit News Article ──────────────────────────┐ │
│  │ Paste news URL, text, or upload file...              [📎]   │ │
│  │                                                   [Submit ↑]  │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
├───────────────────────────────┬────────────────────────────────────┤
│  Recent Threads               │  Your Submissions                  │
│                               │                                    │
│  ┌──────────────────────────┐ │  ┌──────────────────────────────┐ │
│  │ 🟡 Pacific Palisades Fire│ │  │ ⏱️  Extracting...            │ │
│  │ California authorities   │ │  │  Pacific Palisades Fire      │ │
│  │ 📊 3 artifacts  ✓ 8 claims│ │  └──────────────────────────────┘ │
│  └──────────────────────────┘ │  ┌──────────────────────────────┐ │
│  ┌──────────────────────────┐ │  │ ✨ Created Investigation     │ │
│  │ 🟢 AI Safety Concerns    │ │  │  "Man arrested over..."      │ │
│  │ Investigation into AI... │ │  │  [View Story →]              │ │
│  │ 📊 5 artifacts  ✓ 12 claims│ │  └──────────────────────────────┘ │
│  └──────────────────────────┘ │                                    │
│  ┌──────────────────────────┐ │  ┌─── How it works ──────────────┐│
│  │ 🔵 Climate Policy Changes│ │  │ 🔍 1. Submit URL              ││
│  │ New regulations on...    │ │  │ 🔗 2. Match stories           ││
│  │ 📊 2 artifacts  ✓ 6 claims│ │  │ ✅ 3. Verify together         ││
│  └──────────────────────────┘ │  └───────────────────────────────┘│
│                               │                                    │
└───────────────────────────────┴────────────────────────────────────┘
```

### Features
- **Quick submission bar**: Compact input at top for easy access
- **Stories feed**: Main content showing all active investigations (left side)
- **Recent submissions**: Sidebar showing your extraction status (right side)
- **Live updates**: Real-time polling for extraction progress
- **File upload**: Ready for future (placeholder for now)
- **No chat clutter**: Chat moved to story pages where it's contextual

---

## 📐 StoryPage Redesign

### New Layout (Chat Collapsed)
```
┌──────────────────────────────────────────────────────┐
│  Logo                                     [Profile]  │
├──────────────────────────────────────────────────────┤
│                                                      │
│  🟡 DEVELOPING STORY      [Entropy: 0.45]           │
│                                                      │
│  Man arrested over deadly Pacific Palisades fire    │
│  ═════════════════════════════════════════════════   │
│                                                      │
│  ✓ 5/10 Verified   👥 3 Contributors               │
│                                                      │
│  Current Story Summary                               │
│  California authorities arrested a suspect...        │
│                                                      │
│  [Artifacts]  [Claims]  [Contributors]               │
│                                                      │
│                                                      │
│                                           [💬 Chat]  │ ← Floating button
└──────────────────────────────────────────────────────┘
```

### New Layout (Chat Expanded)
```
┌──────────────────────────────────────────────────────┐
│  Logo                                     [Profile]  │
├──────────────────────────────────────┬───────────────┤
│                                      │               │
│  🟡 DEVELOPING STORY                 │  Chat [×]     │
│                                      │───────────────│
│  Man arrested over deadly Pacific    │               │
│  ═══════════════════════════════     │ User:         │
│                                      │ Tell me more  │
│  ✓ 5/10 Verified   👥 3 Contributors│               │
│                                      │ Assistant:    │
│  Current Story Summary               │ This story is │
│  California authorities arrested...  │ about...      │
│                                      │               │
│  [Artifacts]  [Claims]  [Contributors│               │
│                                      │ ┌───────────┐ │
│                                      │ │ Type...   │ │
│                                      │ └───────────┘ │
│                                      │         [↑]   │
└──────────────────────────────────────┴───────────────┘
```

### Features
- **Collapsible sidebar**: Hidden by default
- **Floating chat button**: Bottom-right when collapsed
- **Context-aware chat**: Chat knows current story
- **Sticky chat**: Stays open as user scrolls
- **Width**: ~400px when expanded
- **Animation**: Smooth slide in/out

---

## 🏗️ Component Architecture

### New Components

1. **`app/SimplifiedHome.tsx`** (new)
   - Simple submission interface
   - Input box for URL/text/file
   - Submit button
   - Results list

2. **`app/components/SubmissionInput.tsx`** (new)
   - Unified input component
   - Handles URL, text, file upload
   - Auto-submit on URL paste
   - File upload button (future)

3. **`app/components/SubmissionResult.tsx`** (new)
   - Single result card
   - Shows status (extracting/created/matched)
   - Link to story page
   - Stats preview

4. **`app/components/StoryChatSidebar.tsx`** (new)
   - Collapsible chat sidebar
   - Floating button when collapsed
   - Full chat interface when expanded
   - Context: knows current story

5. **`app/hooks/useSubmissions.ts`** (new)
   - Manages submission state
   - Tracks multiple submissions
   - Polling for each task
   - Results aggregation

### Modified Components

6. **`app/StoryPage.tsx`** (modify)
   - Add StoryChatSidebar
   - Adjust layout for sidebar
   - Pass story context to chat

7. **`app/App.tsx`** (modify)
   - Route to SimplifiedHome instead of current home
   - Keep existing routes

---

## 🔄 Data Flow

### Submission Flow
```
User enters URL in input box
  ↓
Click submit button
  ↓
Create task via /api/seed
  ↓
Add to submissions list (state)
  ↓
Poll task status
  ↓
Update submission status:
  - "Extracting..."
  - "✨ Created new investigation"
  - "🔗 Added to existing (X% match)"
  ↓
Show [View Story →] button
  ↓
User clicks → Navigate to /story/{id}
```

### Story Chat Flow
```
User on /story/{id}
  ↓
Click chat button (bottom-right)
  ↓
Sidebar slides in (400px)
  ↓
Chat knows story_id from context
  ↓
User asks questions about story
  ↓
Chat responses with story context
  ↓
User can collapse sidebar anytime
```

---

## 📦 State Management

### useSubmissions Hook
```typescript
interface Submission {
  id: string
  url: string
  task_id?: string
  status: 'pending' | 'extracting' | 'completed' | 'failed'
  preview?: URLPreview
  story_match?: {
    story_id: string
    is_new: boolean
    match_score: number
    matched_story_title: string
  }
  created_at: Date
}

interface UseSubmissionsReturn {
  submissions: Submission[]
  submitUrl: (url: string) => Promise<void>
  submitText: (text: string) => Promise<void>
  submitFile: (file: File) => Promise<void>
  clearSubmissions: () => void
}
```

### StoryChatSidebar State
```typescript
interface StoryChatSidebarProps {
  storyId: string
  storyTitle: string
  isOpen: boolean
  onToggle: () => void
}
```

---

## 🎨 Design Specs

### Homepage Input Box
- **Width**: 600px centered
- **Height**: 60px
- **Border**: 2px solid blue-300
- **Border radius**: 12px
- **Placeholder**: "Paste news URL, text, or upload file..."
- **File button**: 📎 icon, right side
- **Submit button**: Below input, primary blue, "Submit ↑"

### Submission Result Cards
- **Width**: 600px centered
- **Padding**: 16px
- **Border**: 1px solid slate-200
- **Border radius**: 8px
- **Margin**: 8px bottom
- **Status icons**:
  - ⏱️ Extracting (with spinner)
  - ✨ New investigation
  - 🔗 Added to existing
  - ❌ Failed

### Story Chat Sidebar
- **Width**: 400px
- **Height**: 100vh - header
- **Position**: Fixed right
- **Background**: white
- **Border left**: 1px solid slate-200
- **Shadow**: Large shadow when open
- **Animation**: 300ms ease-in-out
- **Z-index**: 50

### Chat Floating Button
- **Size**: 56px circle
- **Position**: Fixed bottom-right (24px from edges)
- **Background**: Gradient blue to purple
- **Icon**: 💬
- **Shadow**: lg
- **Hover**: Scale 1.1

---

## 🧪 Implementation Phases

### Phase 1: Simplified Homepage (2-3 hours)
- [x] Plan UX redesign
- [ ] Create `SimplifiedHome.tsx`
- [ ] Create `SubmissionInput.tsx`
- [ ] Create `SubmissionResult.tsx`
- [ ] Create `useSubmissions.ts` hook
- [ ] Update routing in `App.tsx`
- [ ] Test submission flow

### Phase 2: Story Chat Sidebar (2-3 hours)
- [ ] Create `StoryChatSidebar.tsx`
- [ ] Add collapse/expand animation
- [ ] Add floating chat button
- [ ] Integrate chat hook with story context
- [ ] Update `StoryPage.tsx` layout
- [ ] Test chat functionality

### Phase 3: File Upload (Future)
- [ ] Add file upload UI
- [ ] Create `/api/upload` endpoint
- [ ] Handle PDF/image extraction
- [ ] Show file preview in results

### Phase 4: Polish (1 hour)
- [ ] Animations and transitions
- [ ] Responsive design
- [ ] Loading states
- [ ] Error handling
- [ ] Documentation

---

## 🎯 User Experience Improvements

### Before vs After

| Aspect | Before | After |
|--------|--------|-------|
| **Homepage** | Complex chat interface | Simple input box |
| **Submission** | Type in chat, confusing | Clear submit button |
| **Results** | Hidden in chat history | Visible list with status |
| **Story chat** | Not available | Contextual sidebar |
| **Cognitive load** | High (what to do?) | Low (clear flow) |
| **Mobile friendly** | No | Yes (collapsible chat) |

---

## 📋 Migration Checklist

### Code to Move
- [ ] Move chat logic from HomePage to StoryChatSidebar
- [ ] Extract submission logic to useSubmissions
- [ ] Update chat context to include story_id
- [ ] Remove chat UI from current homepage

### New Routes
- Keep existing: `/` → SimplifiedHome
- Keep existing: `/story/:id` → StoryPage (with chat sidebar)
- Keep existing: `/build/:id` → BuildPage

### Backward Compatibility
- All existing URLs still work
- Story pages still accessible
- No database changes needed
- Can deploy incrementally

---

## ✅ Acceptance Criteria

### Homepage
- [ ] User can paste URL in input box
- [ ] Submit button triggers extraction
- [ ] Results appear below input
- [ ] Status updates in real-time
- [ ] "View Story" button navigates correctly
- [ ] File upload button present (disabled for now)

### Story Chat Sidebar
- [ ] Chat button visible when collapsed
- [ ] Sidebar slides in smoothly
- [ ] Chat interface fully functional
- [ ] Chat context includes story_id
- [ ] Can collapse/expand freely
- [ ] Mobile responsive

---

## 🚀 Ready to Implement?

This redesign will:
- ✅ Simplify homepage UX dramatically
- ✅ Make submission flow crystal clear
- ✅ Add contextual chat to story pages
- ✅ Prepare for file upload feature
- ✅ Improve mobile experience
- ✅ Reduce cognitive load

**Estimated Time**: 4-6 hours total
**Breaking Changes**: None (all backward compatible)
**Risk Level**: Low (incremental changes)

---

**Next Step**: Shall we start with Phase 1 (Simplified Homepage)?
