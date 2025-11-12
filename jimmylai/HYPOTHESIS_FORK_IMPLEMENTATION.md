# Hypothesis Fork Implementation

## Summary

Implemented visible "hypothesis fork" events to make epistemological breakthroughs transparent to the community, enabling proper axiological judgment for bounty distribution.

## The Problem: Hidden Breakthroughs

**Original Issue**: Hypothesis refinement happened silently in the backend. The community couldn't see when evidence triggered a breakthrough, making it impossible to properly value that contribution.

**Impact on Bounty Distribution**:
- Evidence that reveals new dimensions of truth is worth MORE
- But if the community can't see the fork happening, they can't judge its value
- Axiological judgment requires visibility into epistemic leaps

## Solution: "Fork" as First-Class Event

Renamed "hypothesis refinement" → "hypothesis fork" with full community visibility.

### Why "Fork" is Better than "Split" or "Refine":

1. **Community Understanding**: Developers know "fork" from git (intentional branching)
2. **Positive Framing**: Fork = discovery, not destruction
3. **Preserves Both**: Both branches continue (public NO + private YES)
4. **Breakthrough Signal**: "This evidence forked the hypothesis!" = clear value signal

## Implementation

### 1. Database Schema

**Table**: `hypothesis_forks`
```sql
CREATE TABLE hypothesis_forks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quest_id TEXT NOT NULL,
    evidence_id TEXT NOT NULL,
    trigger_reason TEXT,
    forked_hypotheses TEXT NOT NULL,
    forked_at TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    applied_at TEXT,
    FOREIGN KEY (quest_id) REFERENCES quests(id),
    FOREIGN KEY (evidence_id) REFERENCES evidence_submissions(id)
)
```

**Evidence Flag**: `is_fork_trigger BOOLEAN` - marks evidence that triggered a fork for higher bounty consideration

### 2. Backend Event Broadcasting

When LLM detects scope conflict:
```python
# Mark evidence as fork trigger
cursor.execute("""
    UPDATE evidence_submissions
    SET is_fork_trigger = TRUE
    WHERE id = ?
""", (evidence["id"],))

# Broadcast fork event to all connected clients
await ws_manager.broadcast(quest_id, "hypothesis_fork", {
    "evidence_id": evidence["id"],
    "submitter_id": request.user_id,
    "reason": "Scope conflict detected",
    "old_hypotheses": [...],
    "forked_hypotheses": [...],
    "timestamp": datetime.utcnow().isoformat()
})
```

### 3. Frontend Fork Banner

Prominent visual banner when fork occurs:

```
┌─────────────────────────────────────────────────────────────┐
│ 🍴 HYPOTHESIS FORK TRIGGERED!                              │
│ Evidence by @builder revealed new dimensions of truth      │
│                                                             │
│ Previous hypotheses:          🌿 Forked into:              │
│ • Trump raised Lai's case     • [public] Trump did NOT     │
│                                 mention Lai publicly        │
│                               • [private] Trump DID mention │
│                                 Lai in private meeting     │
└─────────────────────────────────────────────────────────────┘
```

**Features**:
- Auto-appears when fork event broadcast received
- Shows before/after comparison
- Highlights scope distinctions ([public], [private])
- Auto-hides after 10 seconds (or manual dismiss)
- Purple gradient (stands out from other events)

## User Flow Example: Jimmy Lai Case

### Evidence #1-5: Normal Updates
- Probabilities shift smoothly
- No fork triggered
- Standard UI updates

### Evidence #6: Video Transcript (Public NO)
```
📊 Probability Update:
"Trump did NOT raise it" → 85%
```
No fork yet (only shows public segment)

### Evidence #7: WH Official (Private YES)

**Backend**:
```
🍴 Hypothesis fork detected by LLM, analyzing...
✨ Hypothesis fork triggered: 3 branched hypotheses
   1. [public] Trump did NOT mention Lai in public press gaggle (95%)
   2. [private] Trump DID mention Lai in private bilateral meeting (60%)
   3. [overall] Trump did not mention Lai at all (5%)
🔬 FORK TRIGGERED: This evidence revealed new dimensions of truth!
✓ Evidence marked as FORK TRIGGER for bounty consideration
📡 Broadcast fork event to all connected clients
```

**Frontend**:
- 🍴 Banner appears at top of page
- Shows transformation: 1 binary hypothesis → 3 scoped hypotheses
- Community sees: "This is a breakthrough moment!"
- Evidence gets highlighted as fork trigger

### Community Response
- Users recognize this as high-value contribution
- Bounty system weights fork triggers higher
- Axiological judgment now possible (visible breakthrough)

## Technical Architecture

### Event Flow:
```
Evidence Submission
        ↓
Enhanced LLM Analysis
        ↓
Detects scope_refinement_needed=True
        ↓
Calls suggest_hypothesis_refinement()
        ↓
LLM: "Public NO + Private YES = complementary, not contradictory"
        ↓
Stores in hypothesis_forks table
        ↓
Sets is_fork_trigger=TRUE on evidence
        ↓
WebSocket broadcast: "hypothesis_fork"
        ↓
Frontend: Show purple banner
        ↓
Community: "Wow, this evidence forked the hypothesis!"
```

## Files Modified

### Backend
1. **`app/database.py`**:
   - Renamed table: `hypothesis_refinement_suggestions` → `hypothesis_forks`
   - Added field: `trigger_reason`
   - Renamed column: `is_breakthrough` → `is_fork_trigger`
   - Added indexes for fork queries

2. **`app/main.py`** (lines 800-883):
   - Changed terminology throughout: "refinement" → "fork"
   - Added `submitter_id` to broadcast payload
   - Enhanced console output: "🍴 FORK TRIGGERED"
   - Changed WebSocket event: `hypothesis_refinement` → `hypothesis_fork`

### Frontend
3. **`frontend/src/hooks/useQuestWebSocket.ts`**:
   - Added event type: `hypothesis_fork`
   - Added handler: `onHypothesisFork`
   - Routing in switch statement

4. **`frontend/src/components/QuestDetailPage.tsx`**:
   - Added state: `forkEvent`
   - Added handler: Shows banner + auto-hide after 10s
   - Added UI: Purple gradient banner with before/after comparison

## Bounty Implications

### Before Fork Visibility:
```
Evidence #7 submission → Probability changes → No visible breakthrough
Community: "Just another piece of evidence" → Normal bounty weight
```

### After Fork Visibility:
```
Evidence #7 submission → 🍴 FORK BANNER APPEARS → Clear breakthrough signal
Community: "This evidence revealed new truth!" → Higher bounty weight
```

### Future Bounty Formula:
```python
base_payout = novelty_score * clarity_contribution
if evidence.is_fork_trigger:
    fork_multiplier = 1.5  # 50% bonus for fork triggers
    payout = base_payout * fork_multiplier
```

## Epistemological Impact

### Transparency Hierarchy:

**Level 1**: Backend only (no visibility)
- ❌ Community can't judge value
- ❌ No axiological assessment possible

**Level 2**: Logged but not broadcast
- ⚠️ Data exists but hidden
- ⚠️ Requires manual query to discover

**Level 3**: **Broadcast + UI visualization** ✅ (Current)
- ✅ Community sees breakthrough in real-time
- ✅ Axiological judgment enabled
- ✅ Proper bounty distribution possible

### Truth Representation:

**Before**:
```
Binary: "Trump raised it" = 79.8%
Lost nuance: Public NO, Private YES collapsed into single value
```

**After**:
```
Fork Event → Community sees:
├─ [public] Trump did NOT mention Lai (95%)
└─ [private] Trump DID mention Lai (90%)
Preserved nuance: Both truths visible
```

## Testing Status

- ✅ Database schema updated
- ✅ Backend event broadcasting implemented
- ✅ Frontend WebSocket handler added
- ✅ UI fork banner created
- ✅ Docker rebuilt successfully
- ⏳ End-to-end test pending (requires OPENAI_API_KEY)

## Next Steps

1. Test with Jimmy Lai simulation (with LLM enabled)
2. Verify fork detection at Evidence #7
3. Confirm UI banner appears correctly
4. Implement fork multiplier in bounty calculation
5. Add fork history view (see all forks in a quest)

## Key Insight

**Epistemology → Axiology → Economics**

- **Epistemology**: System detects multi-dimensional truth (fork)
- **Axiology**: Community sees breakthrough (value judgment)
- **Economics**: Bounty system rewards appropriately (fair distribution)

This chain only works if the middle step (visibility) exists. Fork events make the invisible visible, enabling proper value assessment.
