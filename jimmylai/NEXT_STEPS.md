# Next Steps: Integration & Full System Test

## What We've Built (Validated ✓)

### Core Services
1. **ProbabilityService** ✓ - Bayesian updates, entropy calculation, convergence detection
2. **PayoutService** ✓ - Fair reward distribution with breakthrough bonus

### Test Coverage
- Jimmy Lai evidence sequence (3 pieces of evidence)
- Probability updates: 50% → 59% → 35/65% → 12/88% (converged!)
- Payout distribution: $60 pool + $20 bonus = $80 total distributed fairly

## Next: Integrate Services into API Endpoints

### Step 1: Update Evidence Submission API

**File**: `/app/main.py`
**Endpoint**: `POST /api/quests/{quest_id}/evidence`

**Current**: Stores evidence in DB
**New**: Store evidence → Call ProbabilityService → Check convergence → Trigger payout if converged

```python
@app.post("/api/quests/{quest_id}/evidence")
async def submit_evidence(quest_id: str, request: SubmitEvidenceRequest):
    # 1. Store evidence
    evidence = sqldb.submit_evidence(...)

    # 2. Get LLM analysis
    from app.llm_service import get_llm_service
    llm = get_llm_service()
    analysis = llm.analyze_evidence(...)

    # 3. Update probabilities using ProbabilityService
    from app.services.probability_service import get_probability_service
    prob_service = get_probability_service()

    hypotheses = sqldb.get_hypotheses(quest_id)
    update = prob_service.update_probabilities(hypotheses, evidence, analysis)

    # 4. Save updated probabilities to DB
    for h in update.updated_hypotheses:
        sqldb.update_hypothesis_probability(h.id, h.probability)

    # 5. Check convergence
    converged, winner_id = prob_service.check_convergence(update.updated_hypotheses)

    if converged:
        # 6. Trigger payout
        await trigger_quest_resolution(quest_id, winner_id)

    return {
        "evidence": evidence,
        "updated_hypotheses": update.updated_hypotheses,
        "converged": converged
    }
```

### Step 2: Implement Resolution Endpoint

**File**: `/app/main.py`
**Endpoint**: `POST /api/quests/{quest_id}/resolve`

```python
async def trigger_quest_resolution(quest_id: str, winning_hypothesis_id: str):
    from app.services.payout_service import get_payout_service

    # 1. Mark quest as converged
    sqldb.update_quest_status(quest_id, "CONVERGED")

    # 2. Get all evidence contributions
    evidence_list = sqldb.get_evidence_for_quest(quest_id)

    # 3. Build EvidenceContribution objects
    contributions = []
    for ev in evidence_list:
        # Get delta clarity from probability_updates table
        delta_clarity = get_delta_clarity_for_evidence(ev["id"])

        contribution = EvidenceContribution(
            evidence_id=ev["id"],
            user_id=ev["submitted_by"],
            evidence_type=ev["evidence_type"],
            delta_clarity=delta_clarity,
            novelty_score=ev["novelty_score"],
            community_votes=get_vote_count(ev["id"]),
            submitted_at=ev["submitted_at"],
            triggered_convergence=(ev["id"] == final_evidence_id)
        )
        contributions.append(contribution)

    # 4. Calculate payouts
    payout_service = get_payout_service()
    quest = sqldb.get_quest(quest_id)
    result = payout_service.calculate_payouts(
        quest_id,
        quest["total_bounty"],
        contributions
    )

    # 5. Store payouts in DB
    for payout in result.payouts:
        sqldb.create_payout(
            quest_id=quest_id,
            user_id=payout.user_id,
            evidence_id=payout.evidence_id,
            amount=payout.total_amount,
            breakdown=payout.breakdown
        )

    # 6. Generate resolution receipt
    receipt = generate_resolution_receipt(quest_id, result)
    sqldb.store_resolution(quest_id, receipt)

    return result
```

### Step 3: Add Database Schema for Tracking

Run migration:

```sql
-- Track probability updates for delta clarity
CREATE TABLE probability_updates (
    id TEXT PRIMARY KEY,
    quest_id TEXT NOT NULL,
    evidence_id TEXT NOT NULL,
    hypothesis_id TEXT NOT NULL,
    probability_before REAL NOT NULL,
    probability_after REAL NOT NULL,
    delta_clarity REAL NOT NULL,
    timestamp TEXT NOT NULL
);

-- Track payouts
CREATE TABLE payouts (
    id TEXT PRIMARY KEY,
    quest_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    evidence_id TEXT,
    amount REAL NOT NULL,
    breakdown JSON NOT NULL,
    timestamp TEXT NOT NULL
);
```

### Step 4: Run Full Simulation to Validate

**Test**: Run Jimmy Lai simulation end-to-end
**Expected**:
1. Evidence 1 (prediction) → 59% probability
2. Evidence 2 (video) → 35/65% split
3. Evidence 3 (transcript) → 88% CONVERGENCE
4. Auto-trigger payout calculation
5. Distribute $74 ($54 from pool + $20 bonus)
6. Display receipt with transparency

### Step 5: Build Frontend Integration

**Component**: `QuestDetailPage.tsx`
**New Features**:
- Real-time probability bar chart
- "Quest Converged!" banner when ≥80%
- Payout table showing contributor rewards
- Resolution receipt modal

## Run Integration Test

```bash
# Copy updated services to container
docker cp app/services/ truth-market-experiment:/app/app/

# Rebuild with new endpoints
docker-compose down && docker-compose up -d --build

# Run full simulation
docker exec truth-market-experiment python3 /app/simulate_jimmy_lai_quest_full.py

# Check results
curl http://localhost:8000/api/quests/{quest_id}/status
curl http://localhost:8000/api/quests/{quest_id}/payouts
```

## Success Criteria

✓ Evidence submission triggers probability update
✓ Convergence auto-detected at 80%
✓ Payouts calculated fairly and transparently
✓ Receipt shows full breakdown
✓ Frontend displays live probability updates
✓ All tests pass end-to-end

Ready to implement?
