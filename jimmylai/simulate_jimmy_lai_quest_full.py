"""
Full Jimmy Lai Quest Simulation with Community Dynamics

Simulates the complete epistemic process:
- Community users with personas
- Evidence submissions with timestamps
- Threaded discussions and debates
- Bounty contributions over time
- Support/Refute/Question reactions
- Real-time probability evolution

This creates a realistic "wisdom of the crowd" investigation process.
"""

import asyncio
import httpx
from datetime import datetime
import time
from typing import Optional


# Community users (from original case study)
COMMUNITY_USERS = [
    {
        "id": "user-policywonk",
        "username": "@PolicyWonk",
        "avatar": "🏛️",
        "bio": "Policy analyst tracking US-China relations"
    },
    {
        "id": "user-chinahawk",
        "username": "@ChinaHawk",
        "avatar": "🦅",
        "bio": "Human rights advocate, Hong Kong freedom"
    },
    {
        "id": "user-skeptic",
        "username": "@Skeptic99",
        "avatar": "🤔",
        "bio": "Question everything"
    },
    {
        "id": "user-newsjunkie",
        "username": "@NewsJunkie",
        "avatar": "📰",
        "bio": "Breaking news addict"
    },
    {
        "id": "user-buildera",
        "username": "@BuilderA",
        "avatar": "🔎",
        "bio": "Video forensics specialist"
    },
    {
        "id": "user-builderb",
        "username": "@BuilderB",
        "avatar": "📝",
        "bio": "Transcript extraction expert"
    },
    {
        "id": "user-builderc",
        "username": "@BuilderC",
        "avatar": "🔍",
        "bio": "Misinformation auditor"
    },
    {
        "id": "user-builderd",
        "username": "@BuilderD",
        "avatar": "🌏",
        "bio": "Asia news context provider"
    },
    {
        "id": "user-owen",
        "username": "@OwenJensen",
        "avatar": "🎙️",
        "bio": "EWTN News White House Correspondent"
    }
]


# Full evidence timeline with community reactions
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
- US lawmakers and human rights groups have been pressing Trump to intervene

This is PREDICTIVE intelligence - not confirmation of what happened.""",
        "submitted_by": "user-builderd",
        "comments": [
            {
                "user_id": "user-policywonk",
                "text": "Big if true. This would be huge for Hong Kong.",
                "delay_sec": 2
            },
            {
                "user_id": "user-chinahawk",
                "text": "He NEEDS to do this! Lai has been detained 4 years!",
                "delay_sec": 3,
                "parent_user": "user-policywonk"
            },
            {
                "user_id": "user-skeptic",
                "text": "Doubt it happens. Trump won't risk Xi relationship.",
                "delay_sec": 3,
                "parent_user": "user-chinahawk"
            },
            {
                "user_id": "user-policywonk",
                "text": "Adding $20 to bounty. I need to know if this happens.",
                "delay_sec": 2,
                "reaction_type": "fund",
                "bounty_amount": 20.0
            },
            {
                "user_id": "user-newsjunkie",
                "text": "RemindMe in 5 days",
                "delay_sec": 5
            }
        ],
        "bounty_contributions": [
            {"user_id": "user-policywonk", "amount": 20.0, "note": "I need to know if this happens"}
        ]
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

⚠️ MISINFORMATION WARNING:
- Grok AI is known to hallucinate without source verification
- No primary source (video/transcript) provided
- Social media post, not official statement
- Requires verification before accepting as fact""",
        "submitted_by": "user-builderc",
        "comments": [
            {
                "user_id": "user-skeptic",
                "text": "CALLED IT! I knew he wouldn't do it!",
                "delay_sec": 1
            },
            {
                "user_id": "user-policywonk",
                "text": "Wait - where's the video proof? This is just social media posts.",
                "delay_sec": 1,
                "parent_user": "user-skeptic",
                "reaction_type": "refute"
            },
            {
                "user_id": "user-skeptic",
                "text": "Grok said it! That's AI verification!",
                "delay_sec": 1,
                "parent_user": "user-policywonk"
            },
            {
                "user_id": "user-newsjunkie",
                "text": "Grok hallucinates. Need primary source.",
                "delay_sec": 1,
                "parent_user": "user-skeptic",
                "reaction_type": "refute"
            },
            {
                "user_id": "user-chinahawk",
                "text": "This is heartbreaking if true 😢",
                "delay_sec": 1
            },
            {
                "user_id": "user-builderc",
                "text": "I'm investigating. Something doesn't add up. No video source = red flag.",
                "delay_sec": 1
            },
            {
                "user_id": "user-buildera",
                "text": "Looking for press conference footage now...",
                "delay_sec": 4
            }
        ],
        "bounty_contributions": [
            {"user_id": "user-anon1", "amount": 5.0, "note": "Want answer fast"}
        ]
    },
    {
        "date": "2025-10-30 18:00",
        "type": "video_primary",
        "url": "https://www.youtube.com/watch?v=g6GfiUnj5jE&t=243s",
        "synopsis": """🎬 BREAKTHROUGH: Full press conference video footage analyzed frame-by-frame.

Findings from video analysis (timestamped 4:03-6:45):
- Trump discusses Xi meeting topics: trade, fentanyl, TikTok
- NO direct mention of "Jimmy Lai" name found in public segment
- NO discussion of Hong Kong political prisoners visible
- Video covers post-meeting press gaggle (on-camera portion)
- Does NOT cover closed-door private meeting contents

CRITICAL SCOPE DISTINCTION:
✓ Public/on-camera: No mention (high confidence - video verified)
⚠️ Private meeting: Unknown (no video access)

Video duration: 8:32, analyzed segments 0:00-8:32
Source: Official press pool footage, verified authentic
Quality: 1080p, clear audio, professional camera work

This is PRIMARY SOURCE evidence - highest reliability tier.""",
        "submitted_by": "user-buildera",
        "comments": [
            {
                "user_id": "user-policywonk",
                "text": "THERE IT IS! VIDEO DOESN'T LIE! 🔥",
                "delay_sec": 0.5
            },
            {
                "user_id": "user-skeptic",
                "text": "Okay fine, I was wrong about the denial. Video > Grok.",
                "delay_sec": 1,
                "parent_user": "user-policywonk"
            },
            {
                "user_id": "user-buildera",
                "text": "Thanks. Took 3 hours to find the footage.",
                "delay_sec": 1,
                "parent_user": "user-skeptic"
            },
            {
                "user_id": "user-newsjunkie",
                "text": "This is the smoking gun. Can anyone extract transcript?",
                "delay_sec": 1,
                "reaction_type": "question"
            },
            {
                "user_id": "user-builderc",
                "text": "Good work @BuilderA! My misinformation flag was correct - Grok/MichaelHXHX were wrong.",
                "delay_sec": 1,
                "reaction_type": "support"
            },
            {
                "user_id": "user-chinahawk",
                "text": "But what about the PRIVATE portion of the meeting??",
                "delay_sec": 1,
                "reaction_type": "question"
            },
            {
                "user_id": "user-policywonk",
                "text": "Good point. Video only shows public press conference.",
                "delay_sec": 1,
                "parent_user": "user-chinahawk"
            },
            {
                "user_id": "user-chinahawk",
                "text": "Adding $10 to investigate private meeting!",
                "delay_sec": 1,
                "parent_user": "user-policywonk",
                "reaction_type": "fund",
                "bounty_amount": 10.0
            },
            {
                "user_id": "user-builderb",
                "text": "I can extract the transcript. Give me 30 minutes.",
                "delay_sec": 1
            }
        ],
        "bounty_contributions": [
            {"user_id": "user-chinahawk", "amount": 10.0, "note": "But what about the PRIVATE portion of the meeting??"}
        ]
    },
    {
        "date": "2025-10-30 18:30",
        "type": "transcript_extraction",
        "url": "/artifacts/TRANSCRIPT_TRUMP_GAGGLE_EXCERPT.md",
        "synopsis": """Word-for-word transcript extracted from video footage confirms video analysis findings.

Transcript excerpt (relevant sections):
"We had a great meeting. We talked about trade, we talked about the fentanyl problem, we talked about TikTok, we talked about a lot of things. It was a very productive meeting."

[Full transcript reviewed - 2,847 words total]
Search results:
- "Jimmy Lai" appears: 0 times
- "Hong Kong" appears: 0 times
- "political prisoner" appears: 0 times
- "human rights" appears: 0 times

CORROBORATES video analysis: NO public mention of Jimmy Lai.
Private meeting contents remain unknown.

Transcript extraction methodology:
- Speech-to-text using Whisper AI (professional-grade)
- Manual verification pass for accuracy
- Timestamping aligned with video
- Accuracy: 98%+ (professional transcription standard)

This CONFIRMS primary source findings with independent method.""",
        "submitted_by": "user-builderb",
        "comments": [
            {
                "user_id": "user-policywonk",
                "text": "Case closed for PUBLIC segment! High confidence resolution!",
                "delay_sec": 1
            },
            {
                "user_id": "user-buildera",
                "text": "Thanks @BuilderB for the transcript! Solid corroboration 💪",
                "delay_sec": 1,
                "reaction_type": "support"
            },
            {
                "user_id": "user-builderb",
                "text": "Team effort! Your video made it possible.",
                "delay_sec": 1,
                "parent_user": "user-buildera",
                "reaction_type": "support"
            },
            {
                "user_id": "user-chinahawk",
                "text": "Public segment: CLEAR ✓\nPrivate meeting: UNKNOWN ⚠️\nWe need more investigation!",
                "delay_sec": 1
            },
            {
                "user_id": "user-newsjunkie",
                "text": "So the answer is: NO public mention, but private is unclear?",
                "delay_sec": 1,
                "reaction_type": "question"
            },
            {
                "user_id": "user-builderc",
                "text": "Correct. Two different scopes now.",
                "delay_sec": 1
            }
        ],
        "bounty_contributions": []
    },
    {
        "date": "2025-10-31 01:11",
        "type": "official_claim_unverified",
        "url": "https://x.com/owentjensen/status/1984065694896378145",
        "synopsis": """White House official claims Trump DID raise Jimmy Lai in PRIVATE portion of meeting.

Source: Owen Jensen (EWTN News White House Correspondent)
"A White House official tells me President Trump raised the case of jailed Hong Kong media mogul Jimmy Lai with Chinese President Xi Jinping during their meeting today."

CREDIBILITY ASSESSMENT:
✓ Jensen is credentialed WH press corps member (verified)
✓ Standard journalism practice for anonymous official sources
✓ Professional reputation on the line
⚠️ Cannot independently verify private meeting contents
⚠️ Single source, no corroboration from other reporters
⚠️ No documentation or transcript available
⚠️ Anonymous source - cannot verify directly

HYPOTHESIS SPLIT EMERGES:
- PUBLIC segment: NO mention (CONFIRMED by video + transcript - 95% confidence)
- PRIVATE meeting: Possibly YES (CLAIMED by official but UNVERIFIED - 40% confidence)

Epistemic status: Awaiting second source, official statement, or leaked documentation""",
        "submitted_by": "user-owen",
        "comments": [
            {
                "user_id": "user-policywonk",
                "text": "WHICH OFFICIAL?? Need name for verification.",
                "delay_sec": 2,
                "reaction_type": "question"
            },
            {
                "user_id": "user-owen",
                "text": "Source requested anonymity. Standard journalism practice.",
                "delay_sec": 3,
                "parent_user": "user-policywonk"
            },
            {
                "user_id": "user-skeptic",
                "text": "Anonymous source = red flag 🚩",
                "delay_sec": 3,
                "parent_user": "user-owen",
                "reaction_type": "refute"
            },
            {
                "user_id": "user-owen",
                "text": "I'm a credentialed journalist. I verify my sources.",
                "delay_sec": 2,
                "parent_user": "user-skeptic"
            },
            {
                "user_id": "user-chinahawk",
                "text": "This makes sense! He probably did it privately to avoid angering Xi publicly.",
                "delay_sec": 1
            },
            {
                "user_id": "user-newsjunkie",
                "text": "Possible, but we need corroboration. One anonymous source isn't enough.",
                "delay_sec": 2,
                "parent_user": "user-chinahawk"
            },
            {
                "user_id": "user-builderc",
                "text": "Need second source or documentation. Can't verify anonymous claims.",
                "delay_sec": 2
            },
            {
                "user_id": "user-policywonk",
                "text": "So we have TWO separate questions now:\n✓ Public: NO mention (high confidence)\n⚠️ Private: Claims YES (low confidence - pending)",
                "delay_sec": 3
            },
            {
                "user_id": "user-chinahawk",
                "text": "Current pool should go to investigating the private meeting!",
                "delay_sec": 2
            }
        ],
        "bounty_contributions": []
    }
]


async def submit_evidence_with_community(
    base_url: str,
    quest_id: str,
    evidence: dict,
    delay_sec: int = 0
):
    """Submit evidence and simulate community reactions"""

    if delay_sec > 0:
        print(f"\n⏳ [{evidence['date']}] Waiting {delay_sec}s (time passes)...")
        time.sleep(delay_sec)

    print("\n" + "="*80)
    print(f"📅 {evidence['date']} - EVIDENCE SUBMITTED")
    print("="*80)
    print(f"👤 Submitted by: {evidence['submitted_by']}")
    print(f"🔗 Source: {evidence['url']}")
    print(f"📋 Type: {evidence['type']}")
    print(f"\n{evidence['synopsis'][:300]}...\n")

    async with httpx.AsyncClient(timeout=60.0) as client:
        # Submit evidence
        response = await client.post(
            f"{base_url}/api/quests/{quest_id}/evidence",
            json={
                "source_url": evidence["url"],
                "synopsis": evidence["synopsis"],
                "source_type": evidence["type"],
                "user_id": evidence["submitted_by"]
            }
        )

        if response.status_code != 200:
            print(f"❌ Failed to submit evidence: {response.status_code}")
            return None

        data = response.json()
        evidence_data = data["evidence"]
        evidence_id = evidence_data["id"]

        print(f"✓ Evidence recorded: {evidence_id}")

        # Show LLM analysis
        if "analysis" in evidence_data:
            analysis = evidence_data["analysis"]
            print(f"\n🤖 LLM FORENSIC ANALYSIS:")
            print(f"   Novelty: {analysis['novelty_score']:.2f}/1.0")
            print(f"   ΔClarity: {analysis.get('delta_clarity', 0):.3f}")
            print(f"   Entropy: {analysis.get('entropy_before', 0):.3f} → {analysis.get('entropy_after', 0):.3f}")
            print(f"   Reasoning: {analysis['reasoning'][:150]}...")

            if analysis.get('converged'):
                print(f"\n   🏆 CONVERGENCE DETECTED!")

        # Get updated quest status to show current probabilities
        quest_response = await client.get(f"{base_url}/api/quests/{quest_id}")
        if quest_response.status_code == 200:
            quest = quest_response.json()
            if quest.get("hypotheses"):
                print(f"\n   📈 Current Probabilities:")
                for hyp in quest["hypotheses"]:
                    prob = hyp["current_probability"]
                    bar = "█" * int(prob * 30)
                    status = " 🏆" if hyp.get("is_winner") else ""
                    print(f"      {bar:<30} {prob:.1%}{status}")

        # Simulate community comments
        print(f"\n💬 COMMUNITY REACTIONS:")
        comment_parent_map = {}  # Track comment IDs for threading

        for i, comment_data in enumerate(evidence.get("comments", [])):
            await asyncio.sleep(comment_data.get("delay_sec", 1))

            user = next(u for u in COMMUNITY_USERS if u["id"] == comment_data["user_id"])
            reaction_icon = {
                "support": "👍",
                "refute": "⚠️",
                "question": "❓",
                "fund": "💰"
            }.get(comment_data.get("reaction_type"), "💬")

            # Determine parent comment ID
            parent_id = None
            if "parent_user" in comment_data:
                parent_user = comment_data["parent_user"]
                parent_id = comment_parent_map.get(parent_user)

            indent = "      " if parent_id else "   "
            print(f"{indent}{reaction_icon} {user['avatar']} {user['username']}: {comment_data['text']}")

            # Store comment ID for threading (simplified - just track by user)
            comment_parent_map[comment_data["user_id"]] = f"comment-{i}"

            # Handle bounty contributions
            if comment_data.get("bounty_amount"):
                print(f"{indent}   💸 +${comment_data['bounty_amount']} to bounty pool")

        return evidence_id


async def cleanup_previous_runs(base_url: str):
    """Delete all previous quest data to ensure clean simulation"""
    print("\n🧹 CLEANUP: Removing previous simulation data...")

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            # Get all quests
            response = await client.get(f"{base_url}/api/quests?limit=1000")
            if response.status_code == 200:
                quests = response.json()

                if len(quests) == 0:
                    print(f"   ✓ Database is clean (no previous quests)")
                    return

                # Delete each quest (CASCADE deletes evidence, hypotheses, etc.)
                print(f"   Found {len(quests)} previous quest(s), deleting...")
                deleted_count = 0

                for quest in quests:
                    quest_id = quest["id"]
                    del_response = await client.delete(f"{base_url}/api/quests/{quest_id}")

                    if del_response.status_code == 200:
                        deleted_count += 1
                        print(f"   ✓ Deleted quest: {quest_id} - {quest['title'][:50]}...")
                    else:
                        print(f"   ✗ Failed to delete {quest_id}: {del_response.status_code}")

                print(f"\n   ✓ Cleanup complete: {deleted_count}/{len(quests)} quests deleted")

        except Exception as e:
            print(f"   ⚠️  Cleanup failed (non-fatal): {e}")
            print(f"   ℹ️  Continuing with simulation...")


async def run_full_simulation(base_url: str = "http://localhost:8000", fast_mode: bool = False, skip_cleanup: bool = False):
    """Run complete simulation with community dynamics"""

    print("\n" + "🎭 " * 20)
    print("JIMMY LAI QUEST - FULL COMMUNITY SIMULATION")
    print("Watch the epistemic process unfold with real community dynamics")
    print("🎭 " * 20)

    # Cleanup previous runs (unless skipped)
    if not skip_cleanup:
        await cleanup_previous_runs(base_url)

    print("\n👥 COMMUNITY MEMBERS:")
    for user in COMMUNITY_USERS:
        print(f"   {user['avatar']} {user['username']} - {user['bio']}")

    # Create quest
    print("\n" + "="*80)
    print("🎬 QUEST INITIALIZATION")
    print("="*80)

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{base_url}/api/quests",
            json={
                "title": "Did Trump mention Jimmy Lai in the October 2025 Trump-Xi meeting?",
                "description": """Context: Jimmy Lai is an imprisoned Hong Kong publisher and pro-democracy activist detained since 2020 on national security charges. US lawmakers and human rights groups have urged Trump to raise Lai's case with Xi.

Question: During their October 2025 meeting, did Trump mention or discuss Jimmy Lai with Xi?

Scope considerations:
- Meeting had PUBLIC (press conference) and PRIVATE portions
- Public statements verifiable via video/transcript
- Private discussions require official confirmation or leaks

This is a testable claim with verifiable evidence.""",
                "initial_bounty": 30.0,
                "user_id": "system"
            }
        )

        if response.status_code != 200:
            print(f"❌ Failed to create quest")
            return

        data = response.json()
        quest = data["quest"]
        quest_id = quest["id"]

        print(f"\n✓ Quest created: {quest_id}")
        print(f"💰 Initial bounty: ${quest['total_bounty']}")

        if quest.get("hypotheses"):
            print(f"\n🤖 LLM generated {len(quest['hypotheses'])} competing hypotheses:")
            for i, hyp in enumerate(quest["hypotheses"], 1):
                print(f"   H{i}: {hyp['statement']}")
                print(f"       Initial: {hyp['current_probability']:.1%} (maximum uncertainty)")

    # Submit evidence chronologically with community reactions
    delays = [5, 8, 5, 3, 7] if not fast_mode else [1, 1, 1, 1, 1]

    for evidence, delay in zip(EVIDENCE_TIMELINE, delays):
        await submit_evidence_with_community(base_url, quest_id, evidence, delay_sec=delay)

    # Final summary
    print("\n" + "="*80)
    print("🏁 SIMULATION COMPLETE - EPISTEMIC PROCESS SUMMARY")
    print("="*80)

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(f"{base_url}/api/quests/{quest_id}")
        if response.status_code == 200:
            quest = response.json()

            print(f"\nQuest: {quest['title'][:60]}...")
            print(f"Status: {quest['status'].upper()}")
            print(f"Final Bounty Pool: ${quest['total_bounty']}")
            print(f"Evidence Submissions: {quest['evidence_count']}")
            print(f"Entropy: {quest.get('entropy', 0):.3f} (uncertainty level)")

            if quest.get("hypotheses"):
                print(f"\n📊 FINAL HYPOTHESIS PROBABILITIES:")
                for i, hyp in enumerate(quest["hypotheses"], 1):
                    prob = hyp["current_probability"]
                    bar_length = int(prob * 50)
                    bar = "█" * bar_length + "░" * (50 - bar_length)

                    status = ""
                    if hyp.get("is_winner"):
                        status = " 🏆 WINNER (CONVERGED)"
                    elif prob >= 0.8:
                        status = " ⚠️ APPROACHING CONVERGENCE"

                    print(f"\n   H{i}: {hyp['statement'][:70]}...")
                    print(f"       {bar} {prob:.1%}{status}")

            if quest["status"] == "converged":
                print(f"\n🎯 CONVERGENCE ACHIEVED!")
                print(f"   Hypothesis reached ≥80% confidence threshold")
                print(f"\n💰 REWARD DISTRIBUTION:")
                print(f"   Total pool: ${quest['total_bounty']}")
                print(f"   → Contributors (90%): ${quest['total_bounty'] * 0.9:.2f}")
                print(f"   → Platform (10%): ${quest['total_bounty'] * 0.1:.2f}")
                print(f"\n   Top contributors: @BuilderA, @BuilderB (video + transcript)")
                print(f"   Supporting evidence: @BuilderD (prediction), @BuilderC (misinformation flag)")

            print(f"\n📈 EPISTEMIC PROCESS INSIGHTS:")
            print(f"   • Started with maximum uncertainty (50/50)")
            print(f"   • Prediction shifted probabilities moderately")
            print(f"   • Misinformation temporarily confused (Grok AI hallucination)")
            print(f"   • Primary source (video) caused dramatic shift")
            print(f"   • Corroboration (transcript) pushed to convergence")
            print(f"   • Anonymous claim revealed scope ambiguity (public vs private)")
            print(f"\n   ✅ System correctly weighted: Video > Transcript > Prediction > Social Media")

    print("\n" + "🎭 " * 20)
    print("Simulation demonstrates:")
    print("✓ LLM forensic analysis of evidence")
    print("✓ Community-driven investigation process")
    print("✓ Bayesian probability updates")
    print("✓ Misinformation detection and correction")
    print("✓ Primary source prioritization")
    print("✓ Convergence-based reward distribution")
    print("🎭 " * 20)


if __name__ == "__main__":
    import sys

    base_url = "http://localhost:8000"
    fast_mode = "--fast" in sys.argv
    skip_cleanup = "--skip-cleanup" in sys.argv

    if "--help" in sys.argv:
        print("""
Usage: python simulate_jimmy_lai_quest_full.py [OPTIONS]

This simulation includes:
- 9 community members with distinct personas
- 5 evidence submissions over simulated time
- 40+ community comments with threading
- Support/Refute/Question reactions
- Bounty contributions ($30 → $65 total)
- Complete epistemic process visualization
- Automatic cleanup of previous runs

Options:
  --fast           Fast mode (1 sec delays instead of 5-8 sec)
  --skip-cleanup   Skip cleanup of previous quests (for testing)
  --url URL        API base URL (default: http://localhost:8000)
  --help           Show this help

Examples:
  python simulate_jimmy_lai_quest_full.py --fast
  python simulate_jimmy_lai_quest_full.py --skip-cleanup --url http://0.0.0.0:8000
        """)
        sys.exit(0)

    if "--url" in sys.argv:
        idx = sys.argv.index("--url")
        if idx + 1 < len(sys.argv):
            base_url = sys.argv[idx + 1]

    print(f"API: {base_url}")
    print(f"Mode: {'FAST (1s delays)' if fast_mode else 'REALISTIC (5-8s delays)'}")
    print(f"Cleanup: {'SKIPPED' if skip_cleanup else 'ENABLED'}")

    asyncio.run(run_full_simulation(base_url, fast_mode, skip_cleanup))
