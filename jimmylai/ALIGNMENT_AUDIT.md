# Alignment Audit: Epistemic Framework ↔ Implementation ↔ UX

## Current State Analysis

### ✅ What We Have

#### 1. **Design Documents**
- ✅ `EPISTEMOLOGICAL_REPUTATION_FRAMEWORK.md` - Complete value calculation framework
- ✅ `RECURSIVE_VALUE_ATTRIBUTION.md` - Multi-level value chain design
- ✅ `UX_DESIGN_AXIOLOGICAL_SURFACE.md` - Comprehensive UI mockups
- ✅ `001_epistemological_reputation.sql` - Database schema migration
- ✅ `epistemic_value_calculator.py` - Core calculation service

#### 2. **Backend Services**
- ✅ Database schema (existing): `quests`, `hypotheses`, `evidence_submissions`, `probability_events`
- ✅ LLM analysis: Novelty score, clarity delta calculations
- ✅ Probability service: Bayesian updates, convergence detection
- ✅ WebSocket manager: Real-time updates

#### 3. **Frontend Components**
- ✅ Quest detail page: Evidence timeline, hypothesis cards
- ✅ Basic evidence display: Synopsis, source URL, submitted by
- ✅ WebSocket integration: Live updates

---

## 🔴 Critical Gaps

### Gap 1: Database Schema Not Applied
**Issue**: New tables from `001_epistemological_reputation.sql` not created in database

**Impact**:
- ❌ No evidence quality metrics stored
- ❌ No user reputation tracking
- ❌ No misinformation flagging
- ❌ No value attribution records
- ❌ No bounty distribution tracking

**Files Needed**:
```
✓ Migration SQL exists
✗ Migration not run on database
✗ No migration runner script
```

**Fix Required**:
1. Create migration runner
2. Apply schema changes to database
3. Update `database.py` with helper functions

---

### Gap 2: Evidence Quality Calculation Not Integrated
**Issue**: `epistemic_value_calculator.py` exists but not called anywhere

**Impact**:
- ❌ Evidence submitted without quality scoring
- ❌ No source credibility assessment
- ❌ No truth alignment calculation
- ❌ No epistemic value stored

**Current Flow**:
```
Evidence Submitted
    ↓
LLM analyzes novelty + clarity
    ↓
Database stores: novelty_score, clarity_contribution
    ↓
❌ STOPS HERE - no quality metrics calculated
```

**Should Be**:
```
Evidence Submitted
    ↓
LLM analyzes novelty + clarity
    ↓
EpistemicValueCalculator.calculate_epistemic_value()
    ↓
Database stores: source_credibility, verification_level,
                 evidence_type_weight, epistemic_value
```

**Fix Required**:
- Integrate calculator into `/api/quests/{quest_id}/evidence` endpoint
- Call after LLM analysis completes
- Store quality metrics in database

---

### Gap 3: Recursive Value Attribution Not Implemented
**Issue**: Multi-level value chain design exists but no backend implementation

**Impact**:
- ❌ All bounty goes to curator (Truth Market user)
- ❌ Original creators (Senate, Reuters) not attributed
- ❌ Publishers not recognized
- ❌ Validators not rewarded

**Current**: `user-policywonk` gets 100% for sharing Senate letter

**Should Be**:
- 40% → U.S. Senate (held in escrow)
- 10% → Senate.gov (public credit)
- 40% → user-policywonk (curator)
- 10% → Community validators

**Fix Required**:
1. Create `value_attribution_service.py`
2. LLM enhancement to identify original creator
3. Database records for external beneficiaries
4. Attribution calculation at quest convergence

---

### Gap 4: User Reputation System Not Active
**Issue**: User reputation tables defined but no calculation logic

**Impact**:
- ❌ All users treated equally regardless of track record
- ❌ No reputation multipliers applied
- ❌ No tier badges
- ❌ No retroactive adjustments

**Current**: Every user starts and stays at default reputation

**Should Be**:
- Track submission accuracy
- Calculate credibility scores
- Assign tier (Novice → Contributor → Trusted → Expert → Authority)
- Apply tier multipliers to bounty shares

**Fix Required**:
1. Create `user_reputation_service.py`
2. Update reputation on evidence submission
3. Recalculate on convergence
4. Retroactive adjustments when evidence contradicted

---

### Gap 5: Misinformation Flagging Not Built
**Issue**: Evidence flags table exists but no UI or backend logic

**Impact**:
- ❌ Chinese X post with Grok AI can't be flagged
- ❌ No community verification
- ❌ Misinformation still earns bounty

**Current**: Evidence submitted → stays forever, no flags

**Should Be**:
- Users can flag evidence as misinfo
- Community votes on flags
- LLM assists verification
- Flagged evidence gets `epistemic_value = 0`

**Fix Required**:
1. API endpoint: `POST /api/evidence/{id}/flag`
2. UI: Flag button on evidence cards
3. Community voting mechanism
4. Auto-exclusion from bounty calculation

---

### Gap 6: Bounty Distribution Algorithm Not Implemented
**Issue**: Bounty calculation logic not written

**Impact**:
- ❌ Quest converges but no payouts calculated
- ❌ No value-based distribution
- ❌ No transparency on earnings

**Current**: `bounty_payouts` table empty, no distribution happens

**Should Be**:
When quest converges:
1. Calculate epistemic value for all evidence
2. Normalize to sum = 1.0
3. Distribute bounty proportionally
4. Apply user tier multipliers
5. Handle recursive attribution
6. Record in `bounty_payouts` table

**Fix Required**:
1. Create `bounty_distribution_service.py`
2. Trigger on quest convergence
3. Store payout records
4. Broadcast to UI

---

### Gap 7: UX Components Not Implemented
**Issue**: Comprehensive UX design exists but frontend unchanged

**Impact**:
- ❌ No source quality badges
- ❌ No value attribution panels
- ❌ No tree-view comments
- ❌ No artifact thumbnails
- ❌ No user avatars with tier badges
- ❌ No axiological surface dashboard

**Current**: Basic list of evidence with text

**Should Be**: Rich cards with badges, value splits, threaded comments, thumbnails

**Fix Required**:
1. Create reusable components: `SourceBadge`, `UserAvatar`, `ValueAttributionPanel`, `TreeComment`
2. Enhance `QuestDetailPage.tsx` with new components
3. Add `AxiologicalSurfaceDashboard.tsx`
4. Implement link preview service for thumbnails

---

## 📋 Implementation Alignment Matrix

| Feature | Design Doc | DB Schema | Backend Service | Frontend UI | Status |
|---------|-----------|-----------|-----------------|-------------|--------|
| **Evidence Quality Scoring** | ✅ | ✅ | ✅ (not integrated) | ❌ | 🟡 Partial |
| **Source Credibility Tiers** | ✅ | ✅ | ✅ (standalone) | ❌ | 🟡 Partial |
| **Recursive Value Attribution** | ✅ | ✅ | ❌ | ❌ | 🔴 Not Started |
| **User Reputation System** | ✅ | ✅ | ❌ | ❌ | 🔴 Not Started |
| **Misinformation Flagging** | ✅ | ✅ | ❌ | ❌ | 🔴 Not Started |
| **Bounty Distribution** | ✅ | ✅ | ❌ | ❌ | 🔴 Not Started |
| **Axiological Surface Viz** | ✅ | ✅ | ❌ | ❌ | 🔴 Not Started |
| **Tree-View Comments** | ✅ | ❌ | ❌ | ❌ | 🔴 Not Started |
| **Source Quality Badges** | ✅ | ✅ | ✅ | ❌ | 🟡 Partial |
| **Value Attribution UI** | ✅ | ✅ | ❌ | ❌ | 🔴 Not Started |
| **User Tier Avatars** | ✅ | ✅ | ❌ | ❌ | 🔴 Not Started |
| **Artifact Thumbnails** | ✅ | ❌ | ❌ | ❌ | 🔴 Not Started |

---

## 🎯 Priority Implementation Roadmap

### Phase 1: Foundation (Week 1) - CRITICAL
**Goal**: Make epistemic value calculation work end-to-end

1. ✅ Run database migration (`001_epistemological_reputation.sql`)
2. ✅ Integrate `epistemic_value_calculator.py` into evidence submission
3. ✅ Store quality metrics on every evidence
4. ✅ Create basic bounty distribution service
5. ✅ Test with Jimmy Lai quest simulation

**Success Metric**: Evidence shows epistemic value in database

---

### Phase 2: Value Attribution (Week 2) - HIGH PRIORITY
**Goal**: Implement recursive value chains

1. ✅ Create `value_attribution_service.py`
2. ✅ Enhance LLM to identify original creators
3. ✅ Store attribution records
4. ✅ Calculate splits (Original → Publisher → Curator → Validators)
5. ✅ Test Senate letter attribution

**Success Metric**: Senate and Reuters show in bounty distribution

---

### Phase 3: Reputation & Flagging (Week 3) - HIGH PRIORITY
**Goal**: Enable quality control mechanisms

1. ✅ Create `user_reputation_service.py`
2. ✅ Track submission accuracy
3. ✅ Calculate tier assignments
4. ✅ Build misinformation flagging API
5. ✅ Add flag button to UI

**Success Metric**: Grok AI post can be flagged and zeroed out

---

### Phase 4: Rich UX (Week 4) - MEDIUM PRIORITY
**Goal**: Visualize epistemic value in UI

1. ✅ Create reusable components (badges, avatars, panels)
2. ✅ Enhance evidence cards with value attribution
3. ✅ Add source quality indicators
4. ✅ Implement tree-view comments
5. ✅ Build axiological surface dashboard

**Success Metric**: Users can see value distribution visually

---

### Phase 5: Polish & Features (Week 5) - LOW PRIORITY
**Goal**: Add nice-to-have enhancements

1. ⏸️ Artifact thumbnails (link previews)
2. ⏸️ Video embedding
3. ⏸️ Advanced filtering
4. ⏸️ Mobile responsive design
5. ⏸️ Reputation profile pages

---

## 🔧 Immediate Action Items (Next 24 Hours)

### 1. Apply Database Migration
```bash
# Create migration runner
python app/run_migrations.py

# Verify tables created
sqlite3 data/truthmarket.db ".tables"
```

### 2. Integrate Epistemic Value Calculator
**File**: `app/main.py` (line ~715)

```python
# After LLM analysis completes:
from app.services.epistemic_value_calculator import get_epistemic_calculator

calculator = get_epistemic_calculator(conn)
quality = calculator.calculate_epistemic_value(
    evidence["id"],
    quest_id,
    None  # Quest not converged yet
)

# Store quality metrics
cursor.execute("""
    UPDATE evidence_submissions
    SET source_credibility = ?,
        verification_level = ?,
        evidence_type_weight = ?,
        epistemic_value = ?
    WHERE id = ?
""", (
    quality.source_credibility,
    quality.verification_level,
    quality.evidence_type_weight,
    quality.epistemic_value,
    evidence["id"]
))
conn.commit()
```

### 3. Create Bounty Distribution Service
**File**: `app/services/bounty_distribution_service.py` (NEW)

```python
def calculate_bounty_distribution(quest_id: str):
    """Calculate and record bounty payouts when quest converges"""
    # Get all evidence epistemic values
    # Normalize to sum = 1.0
    # Apply user reputation multipliers
    # Handle recursive attribution (Senate, Reuters)
    # Store in bounty_payouts table
    # Return distribution breakdown
```

### 4. Add Value Display to UI
**File**: `frontend/src/components/QuestDetailPage.tsx`

```tsx
// In evidence card:
{evidence.epistemic_value && (
  <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
    <div className="text-xs font-bold text-purple-700 mb-1">
      💰 EPISTEMIC VALUE
    </div>
    <div className="text-2xl font-bold text-purple-900">
      {(evidence.epistemic_value * 100).toFixed(1)}%
    </div>
    <div className="text-xs text-purple-600 mt-1">
      of quest value (~${((evidence.epistemic_value * quest.total_bounty) || 0).toFixed(0)})
    </div>
  </div>
)}
```

---

## 🎯 Validation Checklist

When implementation is aligned, we should be able to:

### Evidence Submission
- ✅ Evidence gets source credibility score (0.0-1.0)
- ✅ Evidence gets verification level score
- ✅ Evidence gets epistemic value calculated
- ✅ LLM identifies original creator (Senate, Reuters)
- ✅ Value attribution chain stored

### Quest Convergence
- ✅ All evidence epistemic values recalculated with truth alignment
- ✅ Bounty distribution calculated
- ✅ Senate gets 40% of their evidence value
- ✅ Reuters can claim their attribution
- ✅ Curators get 40% share
- ✅ Validators get 10% split

### User Experience
- ✅ Evidence cards show source badges (⭐⭐⭐⭐⭐)
- ✅ Value attribution panel visible
- ✅ User avatars show tier badges (🏆 💎 🥉)
- ✅ Axiological surface dashboard shows top contributors
- ✅ Flag button allows misinformation reporting

### Data Integrity
- ✅ Chinese X post flagged → epistemic_value = 0
- ✅ Reuters article → highest value
- ✅ Video analysis → high value (user-created)
- ✅ Senate letter → split attribution
- ✅ All values sum to total bounty

---

## Summary of Gaps

**Critical Gaps** (blocks core functionality):
1. 🔴 Database migration not applied
2. 🔴 Epistemic value calculator not integrated
3. 🔴 Bounty distribution not implemented

**High Priority Gaps** (missing key features):
4. 🔴 Recursive value attribution not built
5. 🔴 User reputation system not active
6. 🔴 Misinformation flagging not functional

**Medium Priority Gaps** (UX polish):
7. 🔴 Rich UI components not implemented
8. 🔴 Axiological surface dashboard missing
9. 🔴 Tree-view comments not added

**Next Step**: Start Phase 1 - Apply migration and integrate epistemic value calculator into evidence submission flow.
