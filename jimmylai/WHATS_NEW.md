# What's New - Receipts & Dynamics

## Fixed: Clarity Calculation

### Before
- Clarity = sum of all answer gains
- Result: 115% (impossible!)

### After
- Clarity = weighted average of scope resolutions
- Public segment (resolved): 72% confidence
- Private segment (pending): 35% confidence
- **Overall: 72%** (resolved scope wins)

Formula:
```
resolved_scopes * 1.0 + pending_scopes * 0.5
```

This matches the case study!

---

## New: Bounty Pool Tracker

Shows who funded the bounty and when:

```
💰 TOTAL BOUNTY POOL: $60

Funding History:
• Oct 25: +$30 (🏛️ Platform) - "Initial seed funding"
• Oct 25: +$20 (👤 Anonymous) - "Early supporter"
• Oct 25: +$10 (👨‍💻 BuilderC) - "Staked on investigation"

Contributors: 3
Reserved: $6 (10% treasury)
```

### Why This Matters
- **Transparency**: See exactly who funded what
- **Social proof**: More contributors = more interest
- **Timing**: Early funders vs. late arrivals
- **Stakes**: Someone staking their own credits shows confidence

---

## New: Live Payout Preview

Shows what contributors would earn if resolved now:

```
If Resolved Now:

🥇 BuilderA: $24 (40% of pool)
   +18 clarity points

🥈 BuilderB: $19 (32% of pool)
   +14 clarity points

🥉 BuilderC: $9 (15% of pool)
   +6 clarity points

🏅 BuilderD: $8 (13% of pool)
   +5 clarity points

Total distributed: $60
Treasury reserve: $6
```

### Why This Matters
- **Preview expectations**: Contributors see potential earnings
- **Incentive clarity**: Higher ΔClarity = bigger payout
- **Fair distribution**: Proportional to contribution
- **Live updates**: Changes as new evidence arrives

---

## New: "Add to Pool" CTA

```
┌────────────────────────────────┐
│ Want this resolved faster?     │
│ Larger bounties attract more   │
│ contributors                   │
│                                │
│ [Add $50] [Add $100]           │
└────────────────────────────────┘
```

### The Loop
1. Question opens with $30 seed
2. People see interesting question
3. Some add $20, $50 to bounty
4. Higher bounty attracts more contributors
5. More contributors = faster resolution
6. Resolution triggers payouts
7. Winners share receipts → social proof
8. Cycle continues

---

## The Complete Flow

### Act 1: Question Opens (Oct 25)
```
Did Trump mention Lai?
Pool: $30 (system seed)
Clarity: 20% (no evidence)
```

### Act 2: Early Funding (Oct 25)
```
Anonymous adds $20: "Want to know!"
BuilderC stakes $10: "I'll find out"
Pool: $60
```

### Act 3: Video Evidence (Oct 30)
```
BuilderA submits video: +18 clarity
Preview payout: $24
Pool remains: $60
```

### Act 4: Transcript Confirms (Oct 30)
```
BuilderB submits transcript: +14 clarity
Clarity hits 72% → Resolution threshold!
Preview payout: $19
```

### Act 5: Resolution (Oct 30)
```
🧾 RECEIPT GENERATED
Public segment resolved (72%)

Payouts distributed:
→ BuilderA: $24 ✓
→ BuilderB: $19 ✓
→ BuilderC: $9 ✓
→ BuilderD: $8 ✓
→ Treasury: $6 ✓

Pool exhausted: $0
```

### Act 6: Plot Twist (Oct 31)
```
WH official claim arrives
Private segment still unclear
Current pool: $0
Status: OPEN for more funding
```

### Act 7: New Funding Needed
```
"Want private segment resolved?"
[Add $50] [Add $100]
```

---

## UI Changes

### 1. Timeline → Shows Story
```
#1 Prediction
#2 Denial + AI
#3 Video drops!
#4 Transcript confirms
#5 WH claim (plot twist!)
```

### 2. Pool Tracker → Shows Funding
```
Who funded: System, Anon, BuilderC
When: Oct 25
How much: $30, $20, $10
Why: "Staked on investigation"
```

### 3. Payout Preview → Shows Incentives
```
If resolved now:
🥇 $24 (40%)
🥈 $19 (32%)
🥉 $9 (15%)
```

### 4. Resolution Status → Shows Progress
```
Public: ✓ 72% RESOLVED
Private: ⚠️ 35% PENDING
Add bounty to continue investigation
```

---

## The Emotional Payoff

### Before
"72% confident" (static number, boring)

### After
**The Journey**:
1. See question: "Did he?"
2. See funding: "3 people care, $60 bounty"
3. See timeline: "Oh! Denial, then video proof!"
4. See payouts: "$24 for video evidence, $19 for transcript"
5. See gap: "But private meeting still unknown!"
6. Feel tension: "I want to know! Should I add to bounty?"

---

## Next Steps (Not Yet Done)

### 1. Clickable "Add to Pool"
Right now it's a button but doesn't work. Need to:
- Open modal
- Let user input amount
- Deduct from their credits
- Add to pool history
- Update payout preview

### 2. Resolution Modal
When clarity hits threshold, show big celebration:
```
🎉 RESOLVED!
Public segment clear: Trump did NOT mention Lai publicly

💵 PAYOUTS
→ BuilderA: $24
→ BuilderB: $19
...

[Share Receipt] [View Story]
```

### 3. Follow/Notify
"Follow this question" → get notified when:
- New evidence arrives
- Bounty increases
- Resolution happens

### 4. Social Sharing
"Share this timeline" → Twitter card showing the 5-act drama

---

## The Core Insight

**People don't just want answers.**
**They want to see:**

1. **How the answer emerged** (timeline)
2. **Who made it happen** (contributors)
3. **What they earned** (payouts)
4. **What's still unknown** (gap = opportunity)

Make the **economics visible**.
Make the **process dramatic**.
Make the **incentives clear**.

That's the product.
