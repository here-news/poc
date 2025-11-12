"""
Simulate the Jimmy Lai Quest with Real Time-Lapse Evidence Stream

This script converts the hardcoded Trump/Jimmy Lai case study into the new
quest system, submitting evidence chronologically with LLM analysis to see
how hypotheses evolve and converge over time.
"""

import asyncio
import httpx
from datetime import datetime
import time


# Evidence timeline from case study
EVIDENCE_TIMELINE = [
    {
        "date": "2025-10-25 06:14",
        "type": "prediction",
        "url": "https://www.zaobao.com.sg/realtime/china/story20251025-7716503",
        "synopsis": """Prediction from Lianhe Zaobao (Singapore news): Trump expected to raise Jimmy Lai case with Xi during meeting.

Key claims:
- Sources suggest Trump will bring up imprisoned Hong Kong publisher Jimmy Lai
- Meeting scheduled for late October 2025
- Lai has been detained for 4 years on national security charges
- US lawmakers and human rights groups have been pressing Trump to intervene""",
        "submitted_by": "BuilderD"
    },
    {
        "date": "2025-10-30 15:04",
        "type": "denial_social",
        "url": "https://x.com/MichaelHXHX/status/1983912860645527656",
        "synopsis": """Chinese X user denies Trump mentioned Lai, with Grok AI auto-reply appearing to confirm.

Key claims:
- User claims Trump did NOT mention Jimmy Lai in meeting
- Grok AI responds confirming "no mention found"
- No video or official source cited
- Post in Chinese, translated context unclear

WARNING: Possible misinformation - Grok AI is known to hallucinate, no primary source verification""",
        "submitted_by": "BuilderC"
    },
    {
        "date": "2025-10-30 18:00",
        "type": "video_primary",
        "url": "https://www.youtube.com/watch?v=g6GfiUnj5jE&t=243s",
        "synopsis": """BREAKTHROUGH: Full press conference video footage analyzed frame-by-frame.

Findings from video analysis (timestamped 4:03-6:45):
- Trump discusses Xi meeting topics: trade, fentanyl, TikTok
- NO direct mention of "Jimmy Lai" name found in public segment
- NO discussion of Hong Kong political prisoners visible
- Video covers post-meeting press gaggle (on-camera portion)
- Does NOT cover closed-door private meeting contents

CRITICAL SCOPE DISTINCTION:
✓ Public/on-camera: No mention (high confidence)
⚠️ Private meeting: Unknown (no video access)

Video duration: 8:32, analyzed segments 0:00-8:32
Source: Official press pool footage, verified authentic""",
        "submitted_by": "BuilderA"
    },
    {
        "date": "2025-10-30 18:30",
        "type": "transcript_extraction",
        "url": "/artifacts/TRANSCRIPT_TRUMP_GAGGLE_EXCERPT.md",
        "synopsis": """Word-for-word transcript extracted from video footage confirms video analysis findings.

Transcript excerpt (relevant sections):
"We had a great meeting. We talked about trade, we talked about the fentanyl problem, we talked about TikTok, we talked about a lot of things. It was a very productive meeting."

[Full transcript reviewed - 2,847 words total]
- "Jimmy Lai" appears: 0 times
- "Hong Kong" appears: 0 times
- "political prisoner" appears: 0 times
- "human rights" appears: 0 times

CORROBORATES video analysis: NO public mention of Jimmy Lai.
Private meeting contents remain unknown.

Transcript extracted using speech-to-text + manual verification.
Accuracy: 98%+ (professional-grade transcription)""",
        "submitted_by": "BuilderB"
    },
    {
        "date": "2025-10-31 01:11",
        "type": "official_claim_unverified",
        "url": "https://x.com/owentjensen/status/1984065694896378145",
        "synopsis": """White House official claims Trump DID raise Jimmy Lai in PRIVATE portion of meeting.

Source: Owen Jensen (EWTN News White House Correspondent)
"A White House official tells me President Trump raised the case of jailed Hong Kong media mogul Jimmy Lai with Chinese President Xi Jinping during their meeting today."

CREDIBILITY ASSESSMENT:
✓ Jensen is credentialed WH press corps member
✓ Standard journalism practice for anonymous official sources
⚠️ Cannot independently verify private meeting contents
⚠️ Single source, no corroboration
⚠️ No documentation or transcript available

HYPOTHESIS SPLIT:
- Public segment: NO mention (CONFIRMED by video/transcript)
- Private meeting: Possibly YES (CLAIMED but UNVERIFIED)

Waiting for: Second source, official statement, or leaked documentation""",
        "submitted_by": "OwenJensen"
    }
]


async def create_quest(base_url: str):
    """Create the initial quest"""
    print("\n" + "="*80)
    print("STEP 1: Creating Quest - 'Did Trump mention Jimmy Lai?'")
    print("="*80)

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{base_url}/api/quests",
            json={
                "title": "Did Trump mention Jimmy Lai in the October 2025 Trump-Xi meeting?",
                "description": """Context: Jimmy Lai is an imprisoned Hong Kong publisher and pro-democracy activist who has been detained since 2020 on national security charges. US lawmakers and human rights groups have been urging Trump to raise Lai's case with Chinese President Xi Jinping.

Question: During their October 2025 meeting, did Trump mention or discuss Jimmy Lai with Xi?

Scope considerations:
- The meeting had both PUBLIC (press conference) and PRIVATE portions
- Public statements can be verified via video/transcript
- Private discussions require official confirmation or leaks

This is a testable claim with verifiable evidence (video, transcripts, official statements).""",
                "initial_bounty": 30.0,
                "initial_evidence_text": None,
                "user_id": "system"
            }
        )

        if response.status_code == 200:
            data = response.json()
            quest = data["quest"]
            print(f"\n✓ Quest created: {quest['id']}")
            print(f"  Title: {quest['title']}")
            print(f"  Bounty: ${quest['total_bounty']}")

            if quest.get("hypotheses"):
                print(f"\n🤖 LLM Generated {len(quest['hypotheses'])} Hypotheses:")
                for i, hyp in enumerate(quest["hypotheses"], 1):
                    print(f"  H{i}: {hyp['statement']}")
                    print(f"      Initial probability: {hyp['current_probability']:.1%}")

            return quest["id"]
        else:
            print(f"❌ Failed to create quest: {response.status_code}")
            print(response.text)
            return None


async def submit_evidence(base_url: str, quest_id: str, evidence: dict, delay_sec: int = 0):
    """Submit a piece of evidence and show LLM analysis"""

    if delay_sec > 0:
        print(f"\n⏳ Waiting {delay_sec} seconds (simulating real-time gap)...")
        time.sleep(delay_sec)

    print("\n" + "-"*80)
    print(f"EVIDENCE SUBMISSION: {evidence['date']}")
    print("-"*80)
    print(f"Type: {evidence['type']}")
    print(f"Source: {evidence['url']}")
    print(f"Submitted by: @{evidence['submitted_by']}")
    print(f"\nSynopsis:\n{evidence['synopsis'][:200]}...")

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            f"{base_url}/api/quests/{quest_id}/evidence",
            json={
                "source_url": evidence["url"],
                "synopsis": evidence["synopsis"],
                "source_type": evidence["type"],
                "user_id": f"user-{evidence['submitted_by'].lower()}"
            }
        )

        if response.status_code == 200:
            data = response.json()
            evidence_data = data["evidence"]

            print(f"\n✓ Evidence submitted: {evidence_data['id']}")

            if "analysis" in evidence_data:
                analysis = evidence_data["analysis"]
                print(f"\n🤖 LLM Analysis:")
                print(f"  Novelty Score: {analysis['novelty_score']:.2f}/1.0")
                print(f"  Reasoning: {analysis['reasoning']}")

                if analysis["key_claims"]:
                    print(f"\n  Key Claims Extracted:")
                    for claim in analysis["key_claims"]:
                        print(f"    • {claim}")

                if analysis["probability_deltas"]:
                    print(f"\n  Probability Updates:")
                    for hyp_id, delta in analysis["probability_deltas"].items():
                        direction = "↑" if delta > 0 else "↓"
                        print(f"    {direction} {hyp_id}: {delta:+.2%}")

            return evidence_data["id"]
        else:
            print(f"❌ Failed to submit evidence: {response.status_code}")
            print(response.text)
            return None


async def check_quest_status(base_url: str, quest_id: str):
    """Check current quest status and hypothesis probabilities"""
    print("\n" + "="*80)
    print("CURRENT QUEST STATUS")
    print("="*80)

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(f"{base_url}/api/quests/{quest_id}")

        if response.status_code == 200:
            quest = response.json()

            print(f"\nQuest: {quest['title']}")
            print(f"Status: {quest['status'].upper()}")
            print(f"Total Bounty: ${quest['total_bounty']}")
            print(f"Evidence Count: {quest['evidence_count']}")
            print(f"Entropy: {quest.get('entropy', 0):.3f} (0=certain, 1=max uncertainty)")

            if quest.get("hypotheses"):
                print(f"\n📊 Current Hypothesis Probabilities:")
                for i, hyp in enumerate(quest["hypotheses"], 1):
                    prob = hyp["current_probability"]
                    bar_length = int(prob * 50)
                    bar = "█" * bar_length + "░" * (50 - bar_length)

                    status = ""
                    if hyp.get("is_winner"):
                        status = " 🏆 WINNER"
                    elif prob >= 0.8:
                        status = " ⚠️ CONVERGING"

                    print(f"\n  H{i}: {hyp['statement'][:80]}...")
                    print(f"      {bar} {prob:.1%}{status}")

            if quest["status"] == "converged":
                print(f"\n🏆 QUEST CONVERGED!")
                print(f"   Converged at: {quest.get('converged_at')}")
                print(f"   Winning hypothesis: {quest.get('winning_hypothesis_id')}")
                print(f"\n💰 Reward Distribution:")
                print(f"   Total pool: ${quest['total_bounty']}")
                print(f"   To contributors (90%): ${quest['total_bounty'] * 0.9:.2f}")
                print(f"   Platform fee (10%): ${quest['total_bounty'] * 0.1:.2f}")
        else:
            print(f"❌ Failed to get quest status: {response.status_code}")


async def run_simulation(base_url: str = "http://localhost:8000", fast_mode: bool = False):
    """Run the complete simulation"""

    print("\n" + "🎬 " * 20)
    print("JIMMY LAI QUEST SIMULATION")
    print("Simulating real evidence stream with LLM analysis")
    print("🎬 " * 20)

    # Step 1: Create quest
    quest_id = await create_quest(base_url)
    if not quest_id:
        return

    await check_quest_status(base_url, quest_id)

    # Step 2: Submit evidence chronologically
    delays = [5, 10, 8, 5, 10] if not fast_mode else [1, 1, 1, 1, 1]

    for evidence, delay in zip(EVIDENCE_TIMELINE, delays):
        await submit_evidence(base_url, quest_id, evidence, delay_sec=delay)
        await check_quest_status(base_url, quest_id)

    # Step 3: Final summary
    print("\n" + "="*80)
    print("SIMULATION COMPLETE!")
    print("="*80)

    await check_quest_status(base_url, quest_id)

    print("\n📈 Evidence Timeline Summary:")
    for i, ev in enumerate(EVIDENCE_TIMELINE, 1):
        print(f"  {i}. [{ev['date']}] {ev['type']} - @{ev['submitted_by']}")

    print(f"\n✅ Successfully simulated {len(EVIDENCE_TIMELINE)} evidence submissions")
    print(f"🤖 LLM analyzed each piece and updated hypothesis probabilities")
    print(f"📊 Check convergence status above")


if __name__ == "__main__":
    import sys

    # Parse args
    base_url = "http://localhost:8000"
    fast_mode = "--fast" in sys.argv

    if "--help" in sys.argv:
        print("""
Usage: python simulate_jimmy_lai_quest.py [OPTIONS]

Options:
  --fast        Run in fast mode (1 sec delays instead of 5-10 sec)
  --url URL     Specify API base URL (default: http://localhost:8000)
  --help        Show this help message

Example:
  python simulate_jimmy_lai_quest.py --fast
        """)
        sys.exit(0)

    # Check for custom URL
    if "--url" in sys.argv:
        idx = sys.argv.index("--url")
        if idx + 1 < len(sys.argv):
            base_url = sys.argv[idx + 1]

    print(f"Using API at: {base_url}")
    print(f"Fast mode: {fast_mode}")

    # Run simulation
    asyncio.run(run_simulation(base_url, fast_mode))
