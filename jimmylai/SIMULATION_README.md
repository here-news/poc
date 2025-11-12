# Jimmy Lai Quest Simulation

This simulation demonstrates the complete Truth Market quest flow using real evidence from the Trump/Jimmy Lai case study.

## What It Does

The simulation:
1. **Creates a quest** - "Did Trump mention Jimmy Lai in the October 2025 Trump-Xi meeting?"
2. **LLM generates hypotheses** - Binary hypotheses with initial probabilities
3. **Submits evidence chronologically** - 5 pieces of evidence over simulated time
4. **LLM analyzes each piece** - Extracts claims, assesses novelty, updates probabilities
5. **Tracks convergence** - Watches for hypothesis reaching ≥80% probability
6. **Shows evolution** - Displays how probabilities shift with each evidence submission

## Evidence Timeline

1. **Oct 25, 06:14** - Prediction (Lianhe Zaobao): Trump expected to raise Lai
2. **Oct 30, 15:04** - Denial (Social media + Grok AI): Claims no mention
3. **Oct 30, 18:00** - Video Evidence (YouTube): Press conference analysis - NO mention in public segment
4. **Oct 30, 18:30** - Transcript (Extracted): Word-for-word confirmation - NO mention
5. **Oct 31, 01:11** - Official Claim (WH source): Claims YES in private meeting (unverified)

## Prerequisites

1. **OpenAI API Key** configured in docker-compose.yml
2. **Server running** on http://localhost:8000
3. **Python dependencies** installed (httpx, asyncio)

## How to Run

### Option 1: Docker Compose (Recommended)

```bash
# Terminal 1: Start the server
cd /media/im3/plus/lab4/re_news/experiment3
docker-compose up --build

# Terminal 2: Run simulation
python simulate_jimmy_lai_quest.py --fast
```

### Option 2: Local Development

```bash
# Terminal 1: Start server locally
cd /media/im3/plus/lab4/re_news/experiment3
pip install -r requirements.txt
export OPENAI_API_KEY="sk-proj-..."
uvicorn app.main:app --reload --port 8000

# Terminal 2: Run simulation
python simulate_jimmy_lai_quest.py --fast
```

## Command Line Options

```bash
# Fast mode (1 second delays)
python simulate_jimmy_lai_quest.py --fast

# Normal mode (5-10 second delays for realistic timing)
python simulate_jimmy_lai_quest.py

# Custom server URL
python simulate_jimmy_lai_quest.py --url http://localhost:8000

# Help
python simulate_jimmy_lai_quest.py --help
```

## Expected Output

```
🎬 🎬 🎬 🎬 🎬 🎬 🎬 🎬 🎬 🎬
JIMMY LAI QUEST SIMULATION
Simulating real evidence stream with LLM analysis
🎬 🎬 🎬 🎬 🎬 🎬 🎬 🎬 🎬 🎬

================================================================================
STEP 1: Creating Quest - 'Did Trump mention Jimmy Lai?'
================================================================================

✓ Quest created: quest-1730...
  Title: Did Trump mention Jimmy Lai in the October 2025 Trump-Xi meeting?
  Bounty: $30.0

🤖 LLM Generated 2 Hypotheses:
  H1: Trump mentioned Jimmy Lai during the meeting
      Initial probability: 50.0%
  H2: Trump did not mention Jimmy Lai during the meeting
      Initial probability: 50.0%

================================================================================
CURRENT QUEST STATUS
================================================================================

Quest: Did Trump mention Jimmy Lai in the October 2025 Trump-Xi meeting?
Status: ACTIVE
Total Bounty: $30.0
Evidence Count: 0
Entropy: 1.000 (0=certain, 1=max uncertainty)

📊 Current Hypothesis Probabilities:

  H1: Trump mentioned Jimmy Lai during the meeting
      █████████████████████████░░░░░░░░░░░░░░░░░░░░░ 50.0%

  H2: Trump did not mention Jimmy Lai during the meeting
      █████████████████████████░░░░░░░░░░░░░░░░░░░░░ 50.0%

--------------------------------------------------------------------------------
EVIDENCE SUBMISSION: 2025-10-25 06:14
--------------------------------------------------------------------------------
Type: prediction
Source: https://www.zaobao.com.sg/realtime/china/story20251025-7716503
Submitted by: @BuilderD

Synopsis:
Prediction from Lianhe Zaobao (Singapore news): Trump expected to raise Jimmy Lai case with Xi during meeting.

Key claims:
- Sources suggest Trump will bring up imprisoned Hong Kong pu...

✓ Evidence submitted: ev-1730...

🤖 LLM Analysis:
  Novelty Score: 0.85/1.0
  Reasoning: This is new predictive information suggesting Trump will mention Lai.

  Key Claims Extracted:
    • Trump expected to raise Jimmy Lai case
    • Sources suggest Trump will bring up imprisoned Hong Kong publisher
    • Meeting scheduled for late October 2025

  Probability Updates:
    ↑ h-...: +0.15%
    ↓ h-...: -0.15%

[... continues with more evidence submissions ...]

🏆 QUEST CONVERGED!
   Winning hypothesis: h-...

💰 Reward Distribution:
   Total pool: $30.0
   To contributors (90%): $27.0
   Platform fee (10%): $3.0
```

## What to Observe

1. **Initial uncertainty** - Both hypotheses start at 50/50
2. **Prediction impact** - Early prediction shifts probability slightly
3. **False denial** - Social media denial with Grok AI (misinformation)
4. **Video breakthrough** - Primary source dramatically shifts probability
5. **Transcript confirmation** - Corroboration increases confidence
6. **Plot twist** - Anonymous official claim creates scope ambiguity
7. **Convergence** - One hypothesis reaches ≥80% threshold
8. **Final state** - Quest marked as converged, rewards ready for distribution

## Key Features Demonstrated

✅ **LLM Hypothesis Generation** - Automatic binary hypothesis creation
✅ **Evidence Analysis** - Claim extraction, novelty scoring
✅ **Bayesian Updates** - Probability shifts based on evidence strength
✅ **Entropy Tracking** - Uncertainty decreases as evidence accumulates
✅ **Convergence Detection** - Automatic resolution at 80% threshold
✅ **Audit Trail** - All probability changes logged
✅ **Scope Awareness** - Distinguishes between public vs private meeting

## Troubleshooting

### "Connection refused"
- Make sure server is running on port 8000
- Check `docker-compose up` logs for errors

### "OpenAI API error"
- Verify OPENAI_API_KEY is set in docker-compose.yml
- Check API key has sufficient credits

### "LLM service unavailable"
- Server will work without LLM but won't generate hypotheses
- Evidence submissions will still be recorded

### "No hypotheses generated"
- Check server logs for OpenAI API errors
- Verify API key is valid and has credits

## Next Steps

After running the simulation:
1. Open browser to http://localhost:8000
2. View quest on homepage
3. Click into quest detail page
4. See hypothesis probability evolution
5. View evidence timeline with LLM analysis

## Files

- `simulate_jimmy_lai_quest.py` - Simulation script
- `app/llm_service.py` - LLM analysis engine
- `app/database.py` - Quest database schema
- `app/main.py` - API endpoints with LLM integration
