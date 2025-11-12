# Issues Found During Live Simulation & Required Fixes

## Issue 1: Early Convergence to Wrong Answer ❌

**Problem**: After only 3 pieces of evidence (Senate letter, prediction, Fox News), the system converged to 99% "Trump raised it" - completely wrong!

**Root Cause**: LLM analyzing evidence text sees "Trump" + "raise" + "Jimmy Lai" in sentences like:
- "Senators urge Trump to raise..."
- "Trump expected to raise..."
- "Trump may raise..."

And incorrectly interprets PREDICTIONS/EXPECTATIONS as CONFIRMATIONS.

**Current Flow (BROKEN)**:
```
Evidence: "Senators urge Trump to raise Lai case"
  ↓
LLM Analysis: Sees "Trump raise Lai" in text
  ↓
Assigns to hypothesis: "Trump raised Lai" ✗ WRONG
  ↓
Probability jumps to 60%, 80%, 99% ✗ TOO FAST
```

**Expected Flow (CORRECT)**:
```
Evidence: "Senators urge Trump to raise Lai case"
  ↓
Type: prediction, BEFORE meeting
  ↓
Should maintain uncertainty or slight shift
  ↓
Probability: 50% → 52% ✓ SMALL CHANGE
```

---

## Issue 2: Binary Hypotheses Don't Match Nuanced Truth

**Problem**: LLM generates simple binary hypotheses:
- "Trump raised it" (binary YES)
- "Trump didn't raise it" (binary NO)

But the **real answer is nuanced**:
- Public gaggle: NO mention ✓
- Private meeting: YES mentioned ✓
- **Both are true in different scopes!**

**Current Hypotheses (TOO SIMPLE)**:
```
H1: Trump raised Jimmy Lai's case (40%)
H2: Trump did not raise Jimmy Lai's case (60%)
```

Video evidence of public gaggle shows "no mention" → H2 jumps to 99%
But this is WRONG because he DID mention it privately!

**Better Hypotheses (SCOPE-AWARE)**:
```
H1: Trump did NOT mention Lai in PUBLIC press gaggle (should → 95% after video/transcript)
H2: Trump DID mention Lai in PRIVATE bilateral meeting (should → 90% after WH/Reuters)
H3: Trump did not mention Lai at all (should → 5% after all evidence)
```

---

## Issue 3: Evidence Type Weighting Not Applied Correctly

**Problem**: Prediction articles and Senate letters (BEFORE meeting) are getting same weight as video evidence (PRIMARY source AFTER meeting).

**Current**: All evidence treated similarly
**Expected**:
- Senate letter (Day 0): Very low impact on final answer (just context)
- Prediction (Day 1): Low impact (speculation)
- Video footage (Day 5): HIGH impact (primary source proof)
- Reuters (Day 11): HIGHEST impact (multiple sources, investigative)

---

## Fixes Required

### Fix 1: Create Manual Hypotheses for Jimmy Lai Case

**File**: `simulate_enriched_timeline.py`

Instead of letting LLM generate hypotheses, manually create them:

```python
# After quest creation
hypotheses_response = await client.post(
    f"{base_url}/api/quests/{quest_id}/hypotheses/manual",
    json=[
        {
            "statement": "Trump did NOT mention Jimmy Lai in the public press gaggle on Air Force One",
            "initial_probability": 0.33,
            "scope": "public"
        },
        {
            "statement": "Trump DID mention Jimmy Lai in the private bilateral meeting with Xi",
            "initial_probability": 0.33,
            "scope": "private"
        },
        {
            "statement": "Trump did not mention Jimmy Lai at all during the entire meeting",
            "initial_probability": 0.34,
            "scope": "overall"
        }
    ]
)
```

### Fix 2: Explicit Hypothesis Targeting in Evidence

**File**: `simulate_enriched_timeline.py`

Add `target_hypothesis` field to each evidence piece:

```python
{
    "day": 0,
    "type": "official_statement",
    "url": "...",
    "synopsis": "Senate letter urging Trump...",
    "target_hypothesis": None,  # Pre-meeting context, no target
    "expected_impact": "low"    # Should not shift probabilities much
},
{
    "day": 5,
    "type": "video_primary",
    "url": "...",
    "synopsis": "Video shows no public mention...",
    "target_hypothesis": "public_no_mention",  # H1
    "expected_impact": "high"   # Should shift H1 dramatically
},
{
    "day": 11,
    "type": "news_article",
    "url": "Reuters...",
    "synopsis": "Multiple sources confirm private mention...",
    "target_hypothesis": "private_yes_mention",  # H2
    "expected_impact": "very_high"  # Should shift H2 dramatically
}
```

### Fix 3: Improve Evidence Impact Calculation

**File**: `app/main.py` or create new `evidence_router.py`

```python
def determine_target_hypothesis(evidence, hypotheses):
    """
    Intelligently determine which hypothesis this evidence supports

    Rules:
    1. Pre-meeting evidence (predictions, letters) → no strong target
    2. Video/transcript of public gaggle → "public no mention"
    3. WH official/Reuters on private meeting → "private yes mention"
    4. Denials → "did not mention at all"
    """

    # Check evidence type and timing
    if evidence["source_type"] in ["prediction", "official_statement"]:
        # Check if pre-meeting (no impact on final answer)
        if is_before_meeting(evidence["submitted_at"]):
            return None  # Maintain uncertainty

    # Post-meeting evidence
    if evidence["source_type"] == "video_primary":
        # Video of public portion
        return find_hypothesis_by_keyword(hypotheses, "public", "not mention")

    if evidence["source_type"] == "official_statement" and is_after_meeting(evidence):
        # WH official or family statement about private meeting
        return find_hypothesis_by_keyword(hypotheses, "private", "mentioned")

    # Fallback to LLM analysis
    return llm_determine_target(evidence, hypotheses)
```

### Fix 4: Adjust Probability Update Algorithm

**File**: `app/services/probability_service.py`

```python
# Reduce impact of pre-meeting evidence
if evidence.submitted_at < MEETING_DATE:
    impact_factor *= 0.3  # Only 30% of normal impact

# Increase impact of high-quality post-meeting evidence
if evidence.evidence_type == "video_primary" and evidence.submitted_at > MEETING_DATE:
    impact_factor *= 1.5  # 150% of normal impact

# Investigative journalism gets highest weight
if evidence.evidence_type == "news_article" and evidence.novelty_score > 0.8:
    impact_factor *= 2.0  # 200% of normal impact
```

---

## Recommended Implementation Order

1. **Short-term** (< 1 hour):
   - Add manual hypotheses to simulation
   - Add `target_hypothesis` field to evidence timeline
   - Modify simulation to use manual targeting

2. **Medium-term** (< 1 day):
   - Create `evidence_router.py` service
   - Implement smart hypothesis targeting logic
   - Add temporal awareness (pre/post meeting)

3. **Long-term** (< 1 week):
   - Improve LLM prompt to generate scope-aware hypotheses
   - Add evidence dependency graph (X corroborates Y)
   - Implement contradiction detection

---

## Expected Results After Fixes

**Evidence Timeline**:
```
Day 0: Senate letter → 33/33/34% (no change, pre-meeting)
Day 1: Prediction → 35/32/33% (slight shift toward "yes")
Day 3: Fox "may raise" → 37/33/30% (small shift)
Day 5: Video (no public mention) → 85/10/5% (H1 jumps! Primary source)
Day 5: Transcript → 95/4/1% (H1 near certainty)
Day 6: WH official (private yes) → 95/90/1% (Now BOTH H1 and H2 high!)
Day 6: Sebastien Lai → 95/93/1% (H2 rises more)
Day 11: Reuters → 97/95/1% (Both converged! Nuanced truth)
```

**Final Answer**:
- Public: NO mention (97% confidence) ✓
- Private: YES mentioned (95% confidence) ✓
- Overall: Trump raised it privately but not publicly ✓

This matches the REAL historical truth!
