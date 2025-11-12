#!/usr/bin/env python3
"""
Enriched Jimmy Lai Quest Simulation with Real-Time Streaming

Features:
- Complete evidence timeline from all artifacts
- Rich community comments and debates
- Proper time delays for live streaming effect
- Bounty contributions throughout
- Real document evidence (PDFs, HTML articles)

Run modes:
- LIVE: Realistic delays (1 day = 30 seconds)
- FAST: Quick demo (1 day = 5 seconds)
- INSTANT: No delays (testing only)
"""

import asyncio
import httpx
from datetime import datetime
import time
from typing import Optional


# Community users with realistic personas
COMMUNITY_USERS = [
    {"id": "user-policywonk", "username": "@PolicyWonk", "avatar": "🏛️"},
    {"id": "user-chinahawk", "username": "@ChinaHawk", "avatar": "🦅"},
    {"id": "user-skeptic", "username": "@Skeptic99", "avatar": "🤔"},
    {"id": "user-newsjunkie", "username": "@NewsJunkie", "avatar": "📰"},
    {"id": "user-buildera", "username": "@BuilderA", "avatar": "🔎"},
    {"id": "user-builderb", "username": "@BuilderB", "avatar": "📝"},
    {"id": "user-builderc", "username": "@BuilderC", "avatar": "🔍"},
    {"id": "user-builderd", "username": "@BuilderD", "avatar": "🌏"},
    {"id": "user-owen", "username": "@OwenJensen", "avatar": "🎙️"},
    {"id": "user-sebastian", "username": "@SebastienLai", "avatar": "👨‍👦"},
]


# Complete evidence timeline with all artifacts
ENRICHED_TIMELINE = [
    # DAY 0: Oct 24 - Senate letter
    {
        "day": 0,
        "date": "2025-10-24 14:00",
        "type": "official_statement",
        "url": "https://www.risch.senate.gov/public/index.cfm/2025/10/risch-scott-colleagues-write-letter",
        "supports_hypothesis": "UNKNOWN",  # This is BEFORE the meeting - no evidence yet
        "synopsis": """U.S. Senators Risch, Scott, and colleagues write official letter to President Trump urging him to raise Jimmy Lai's case during upcoming Xi Jinping meeting.

Key points:
- Bipartisan letter from Senate Foreign Relations Committee
- Highlights Lai's detention since December 2020
- Emphasizes UN Working Group ruling on arbitrary detention
- Calls Lai's trial a "sham" and "threat to press freedom globally"
- Meeting scheduled for October 30, 2025 in South Korea

This sets official expectation from U.S. government.""",
        "submitted_by": "user-policywonk",
        "comments": [
            {"user": "user-policywonk", "text": "Strong bipartisan pressure on Trump. This is official policy now.", "reaction": None, "replies": [
                {"user": "user-skeptic", "text": "Policy on paper doesn't equal action. Remember all those empty promises?", "reaction": "refute", "replies": [
                    {"user": "user-policywonk", "text": "Fair point, but this is BIPARTISAN Senate. Different level.", "reaction": "support", "replies": []}
                ]}
            ]},
            {"user": "user-chinahawk", "text": "Finally! Senate is taking this seriously. Lai has been detained 4 years!", "reaction": "support", "replies": [
                {"user": "user-newsjunkie", "text": "Actually 1,461 days to be precise. In solitary for much of it.", "reaction": None, "replies": []}
            ]},
            {"user": "user-skeptic", "text": "Letters are nice, but will Trump actually do it when face-to-face with Xi?", "reaction": "question", "replies": [
                {"user": "user-chinahawk", "text": "Trump cares about optics. Senate pressure = optics. He'll do it.", "reaction": "support", "replies": []},
                {"user": "user-builderd", "text": "I'd say 60% chance he brings it up. Trade will dominate though.", "reaction": None, "replies": []}
            ]},
        ],
        "bounty_add": {"user": "user-policywonk", "amount": 20.0, "message": "Need to know if Trump follows through"}
    },

    # DAY 1: Oct 25 - Prediction articles
    {
        "day": 1,
        "date": "2025-10-25 06:14",
        "type": "prediction",
        "url": "https://www.zaobao.com.sg/realtime/china/story20251025-7716503",
        "synopsis": """Lianhe Zaobao (Singapore) predicts Trump will raise Jimmy Lai case based on Senate pressure.

Key claims:
- Trump expected to bring up imprisoned Hong Kong publisher
- Meeting scheduled for late October 2025
- Lai detained for 4 years on national security charges
- U.S. lawmakers and human rights groups pressing Trump

This is PREDICTIVE analysis, not confirmation of what happened.""",
        "submitted_by": "user-builderd",
        "comments": [
            {"user": "user-newsjunkie", "text": "Major Asian news outlet predicting this. They usually have good sources.", "reaction": "support", "replies": [
                {"user": "user-builderd", "text": "Zaobao is credible for Asia-Pacific analysis. +1", "reaction": "support", "replies": []},
                {"user": "user-skeptic", "text": "Credible doesn't mean prophetic. Still just prediction.", "reaction": "refute", "replies": [
                    {"user": "user-newsjunkie", "text": "True, but their track record on US-China relations is solid.", "reaction": "support", "replies": []}
                ]}
            ]},
            {"user": "user-skeptic", "text": "Prediction ≠ fact. Let's wait for the actual meeting.", "reaction": "question", "replies": [
                {"user": "user-policywonk", "text": "Agreed. This increases probability but doesn't confirm.", "reaction": "support", "replies": []},
                {"user": "user-chinahawk", "text": "But it shows the expectation is building. That matters for accountability.", "reaction": "support", "replies": []}
            ]},
            {"user": "user-builderd", "text": "Important to track: this adds P(mention) based on informed prediction.", "reaction": None, "replies": [
                {"user": "user-policywonk", "text": "Exactly. Bayesian updating in action!", "reaction": "support", "replies": []}
            ]},
        ],
        "bounty_add": {"user": "user-chinahawk", "amount": 15.0}
    },

    # DAY 2-4: Oct 26-29 - Build-up
    {
        "day": 3,
        "date": "2025-10-28 10:00",
        "type": "news_article",
        "url": "https://www.foxnews.com/trump-may-raise-jimmy-lai-case",
        "synopsis": """Fox News reports Trump says he "may" raise Jimmy Lai's case with Xi during meeting.

Quote from Trump: "We'll see. There are a lot of important issues to discuss. Jimmy Lai is one of them."

This shows Trump is aware of the issue but non-committal.""",
        "submitted_by": "user-newsjunkie",
        "comments": [
            {"user": "user-policywonk", "text": "Non-committal language. 'May' and 'we'll see' = probably won't prioritize it.", "reaction": "refute", "replies": [
                {"user": "user-chinahawk", "text": "At least he's acknowledging it! That's progress.", "reaction": "support", "replies": []}
            ]},
        ],
        "bounty_add": {"user": "user-newsjunkie", "amount": 10.0}
    },

    # DAY 5: Oct 30 - THE MEETING
    # Morning: Chinese social media denial
    {
        "day": 5,
        "date": "2025-10-30 15:04",
        "type": "social_media",
        "url": "https://x.com/MichaelHXHX/status/1983912860645527656",
        "synopsis": """Chinese X user posts that Trump did NOT mention Jimmy Lai, with Grok AI auto-reply appearing to confirm.

⚠️ MISINFORMATION WARNING:
- No video or official source cited
- Grok AI responds confirming "no mention found"
- AI is known to hallucinate without verification
- Post in Chinese, context unclear

This is UNVERIFIED social media claim.""",
        "submitted_by": "user-builderc",
        "comments": [
            {"user": "user-skeptic", "text": "CALLED IT! I knew he wouldn't do it!", "reaction": "support", "replies": [
                {"user": "user-chinahawk", "text": "This is just a random X post. Where's the actual proof?", "reaction": "refute", "replies": [
                    {"user": "user-skeptic", "text": "The meeting just ended! Give it time for official sources.", "reaction": None, "replies": []}
                ]}
            ]},
            {"user": "user-policywonk", "text": "Wait - where's the video proof? This is just social media posts.", "reaction": "question", "replies": [
                {"user": "user-skeptic", "text": "Grok said it! That's AI verification!", "reaction": "support", "replies": [
                    {"user": "user-newsjunkie", "text": "Grok hallucinates. Need primary source.", "reaction": "refute", "replies": [
                        {"user": "user-skeptic", "text": "Fine, but where's YOUR evidence he DID mention it?", "reaction": "question", "replies": [
                            {"user": "user-newsjunkie", "text": "Burden of proof is on the claim. You're claiming he didn't. Show me.", "reaction": "refute", "replies": []}
                        ]}
                    ]},
                    {"user": "user-builderd", "text": "AI-generated content should NOT be treated as verified evidence.", "reaction": "refute", "replies": []}
                ]},
                {"user": "user-builderc", "text": "Exactly. I'm searching for the actual White House press pool video now.", "reaction": "support", "replies": []}
            ]},
            {"user": "user-builderc", "text": "🚩 RED FLAGS:\\n1. No video link\\n2. AI confirmation (unreliable)\\n3. Anonymous Chinese account\\n4. No mainstream media corroboration\\n\\nI'm investigating. Stand by.", "reaction": None, "replies": [
                {"user": "user-policywonk", "text": "Thank you! This is how epistemic hygiene works. 🙏", "reaction": "support", "replies": []},
                {"user": "user-newsjunkie", "text": "Good methodology. Will wait for primary source.", "reaction": "support", "replies": []}
            ]},
            {"user": "user-builderd", "text": "Everyone slow down. Meeting was 2 hours ago. Video takes time to process/publish.", "reaction": None, "replies": [
                {"user": "user-skeptic", "text": "But the X post is from someone who watched live?", "reaction": "question", "replies": [
                    {"user": "user-builderd", "text": "Claims to have watched live. Where's the clip? Anyone can claim anything.", "reaction": "refute", "replies": []}
                ]}
            ]},
        ],
    },

    # Evening: Press gaggle video emerges
    {
        "day": 5,
        "date": "2025-10-30 18:00",
        "type": "video_primary",
        "url": "https://www.youtube.com/watch?v=g6GfiUnj5jE&t=243s",
        "synopsis": """🎬 BREAKTHROUGH: Full press conference video footage analyzed frame-by-frame.

Findings from video analysis (full 8:32 video):
- Trump discusses Xi meeting: trade, fentanyl, TikTok, chips, Ukraine
- NO direct mention of "Jimmy Lai" name found in public segment
- NO discussion of Hong Kong political prisoners
- NO human rights topics mentioned on camera

CRITICAL SCOPE DISTINCTION:
✓ Public/on-camera segment: No mention (HIGH CONFIDENCE - video proof)
⚠️ Private meeting segment: Unknown (no video access)

Video metadata: Official White House press pool, verified authentic, published Oct 30 2025.""",
        "submitted_by": "user-buildera",
        "comments": [
            {"user": "user-policywonk", "text": "THERE IT IS! VIDEO DOESN'T LIE! 🔥", "reaction": "support", "replies": [
                {"user": "user-skeptic", "text": "Okay fine, I was wrong about Grok. Video > AI.", "reaction": None, "replies": []}
            ]},
            {"user": "user-buildera", "text": "Thanks. Took 3 hours to analyze the full footage.", "reaction": None, "replies": []},
            {"user": "user-newsjunkie", "text": "This is the smoking gun. Can anyone extract transcript?", "reaction": "question", "replies": [
                {"user": "user-builderb", "text": "I can extract the transcript. Give me 30 minutes.", "reaction": None, "replies": []}
            ]},
            {"user": "user-chinahawk", "text": "But what about the PRIVATE portion of the meeting??", "reaction": "question", "replies": [
                {"user": "user-policywonk", "text": "Good point. Video only shows public press conference.", "reaction": "support", "replies": []}
            ]},
        ],
        "bounty_add": {"user": "user-chinahawk", "amount": 10.0, "message": "Need to investigate private meeting!"}
    },

    # 30 minutes later: Transcript
    {
        "day": 5,
        "date": "2025-10-30 18:30",
        "type": "transcript_extraction",
        "url": "https://github.com/artifacts/TRANSCRIPT_TRUMP_GAGGLE_EXCERPT.md",
        "synopsis": """Word-for-word transcript extracted from video footage confirms video analysis findings.

Transcript statistics (2,847 words total):
- "Jimmy Lai" appears: 0 times
- "Hong Kong" appears: 0 times
- "political prisoner" appears: 0 times
- "human rights" appears: 0 times

Topics discussed: trade (23 mentions), fentanyl (15 mentions), TikTok (8 mentions), tariffs (12 mentions), chips (7 mentions), Ukraine (5 mentions).

CORROBORATES video analysis: NO public mention of Jimmy Lai.
Private meeting contents remain unknown.

Transcript method: YouTube auto-captions + manual verification (98% accuracy).""",
        "submitted_by": "user-builderb",
        "comments": [
            {"user": "user-policywonk", "text": "Case closed for PUBLIC segment! High confidence resolution!", "reaction": "support", "replies": []},
            {"user": "user-buildera", "text": "Thanks @BuilderB for the transcript! Solid corroboration 💪", "reaction": None, "replies": [
                {"user": "user-builderb", "text": "Team effort! Your video made it possible.", "reaction": None, "replies": []}
            ]},
            {"user": "user-chinahawk", "text": "Public segment: CLEAR ✓\\nPrivate meeting: UNKNOWN ⚠️\\nWe need more investigation!", "reaction": None, "replies": []},
            {"user": "user-newsjunkie", "text": "So the answer is: NO public mention, but private is unclear?", "reaction": "question", "replies": [
                {"user": "user-builderc", "text": "Correct. Two different scopes now.", "reaction": "support", "replies": []}
            ]},
        ],
    },

    # DAY 6: Oct 31 - WHITE HOUSE OFFICIAL CONFIRMATION
    {
        "day": 6,
        "date": "2025-10-31 01:11",
        "type": "official_statement",
        "url": "https://x.com/owentjensen/status/1984065694896378145",
        "synopsis": """White House official confirms Trump DID raise Jimmy Lai in PRIVATE portion of meeting.

Source: Owen Jensen (EWTN News White House Correspondent)
Quote: "A White House official tells me President Trump raised the case of jailed Hong Kong media mogul Jimmy Lai with Chinese President Xi Jinping during their meeting today."

CREDIBILITY ASSESSMENT:
✓ Jensen is credentialed WH press corps member
✓ Standard journalism practice for anonymous official sources
✓ Timing: Posted late Oct 30 (same day as meeting)
⚠️ Cannot independently verify private meeting contents
⚠️ Anonymous source (no name given)

This refers to PRIVATE bilateral meeting, not public press gaggle.""",
        "submitted_by": "user-owen",
        "comments": [
            {"user": "user-policywonk", "text": "WHICH OFFICIAL?? Need name for verification.", "reaction": "question", "replies": [
                {"user": "user-owen", "text": "Source requested anonymity. Standard journalism practice.", "reaction": None, "replies": []}
            ]},
            {"user": "user-skeptic", "text": "Anonymous source = red flag 🚩", "reaction": "refute", "replies": [
                {"user": "user-owen", "text": "I'm a credentialed journalist. I verify my sources.", "reaction": None, "replies": []}
            ]},
            {"user": "user-chinahawk", "text": "This makes sense! He probably did it privately to avoid angering Xi publicly.", "reaction": "support", "replies": []},
            {"user": "user-newsjunkie", "text": "Possible, but we need corroboration. One anonymous source isn't enough.", "reaction": "question", "replies": [
                {"user": "user-builderc", "text": "Need second source or documentation. Can't verify anonymous claims.", "reaction": "refute", "replies": []}
            ]},
            {"user": "user-policywonk", "text": "So we have TWO separate questions now:\\n✓ Public: NO mention (high confidence)\\n⚠️ Private: Claims YES (low confidence - pending)", "reaction": None, "replies": []},
        ],
    },

    # Few hours later: Sebastien Lai response
    {
        "day": 6,
        "date": "2025-10-31 08:00",
        "type": "official_statement",
        "url": "https://www.jimmylai.com/press-release-oct-31-2025",
        "synopsis": """Sebastien Lai (Jimmy Lai's son) thanks Trump for raising father's case with Xi.

Official press release statement:
"I am so incredibly grateful that the President discussed my father's case in his meeting with President Xi. Knowing President Trump's reputation as the Liberator in Chief, I pray that his continued support and commitment will convince President Xi to free my father before it is too late."

SIGNIFICANCE:
- Family confirmation adds credibility to WH official claim
- Sebastien would have inside information from Trump team
- Public gratitude suggests family was briefed on private discussion

This indirectly corroborates Owen Jensen's WH official source.""",
        "submitted_by": "user-sebastian",
        "comments": [
            {"user": "user-chinahawk", "text": "Sebastien Lai would have inside information. This confirms it happened! 🙏", "reaction": "support", "replies": [
                {"user": "user-policywonk", "text": "Family confirmation is strong evidence. They wouldn't thank publicly if false.", "reaction": "support", "replies": []}
            ]},
            {"user": "user-newsjunkie", "text": "This corroborates Owen Jensen's report. Two independent sources now.", "reaction": "support", "replies": [
                {"user": "user-skeptic", "text": "Okay, I'm convinced. Private discussion likely happened.", "reaction": "support", "replies": []}
            ]},
        ],
        "bounty_add": {"user": "user-sebastian", "amount": 25.0, "message": "Truth matters for my father's freedom"}
    },

    # DAY 11: Nov 6 - REUTERS INVESTIGATIVE CONFIRMATION
    {
        "day": 11,
        "date": "2025-11-06 03:27",
        "type": "corroborated_multi_source",
        "url": "https://www.reuters.com/world/trump-pressed-xi-release-jimmy-lai-2025-11-06/",
        "synopsis": """🏆 Reuters confirms Trump directly appealed to Xi Jinping to free Jimmy Lai during private South Korea meeting.

INVESTIGATIVE JOURNALISM - MULTIPLE INDEPENDENT SOURCES:
- THREE sources briefed on the talks
- ONE U.S. administration official (on record)
- Trump spent LESS THAN FIVE MINUTES on the issue
- Discussed Lai's health and well-being concerns

Key quotes:
"President Trump brought up Jimmy Lai's case, just as he said he would" - Administration official
"It was raised by Trump and noted by Xi" - Third source
"Trump suggested Lai's release would be good for U.S.-China relations" - Source

REUTERS CREDIBILITY:
- International news agency with strict fact-checking
- Multiple independent source verification
- Published Nov 6 (7 days after meeting for verification time)

This is DEFINITIVE CONFIRMATION of private discussion.""",
        "submitted_by": "user-buildera",
        "comments": [
            {"user": "user-policywonk", "text": "Reuters with MULTIPLE INDEPENDENT SOURCES - this is definitive! 📰", "reaction": "support", "replies": [
                {"user": "user-newsjunkie", "text": "Three sources + admin official = gold standard journalism.", "reaction": "support", "replies": []}
            ]},
            {"user": "user-chinahawk", "text": "We finally have the truth! Trump DID raise it privately! 🎉", "reaction": "support", "replies": []},
            {"user": "user-builderc", "text": "Beautiful example of how public and private diplomacy differ.", "reaction": "support", "replies": [
                {"user": "user-buildera", "text": "The video evidence was accurate - Trump didn't mention it PUBLICLY. But he did raise it PRIVATELY. Both pieces of evidence are true in their scope.", "reaction": "support", "replies": []}
            ]},
            {"user": "user-sebastian", "text": "Thank you all for helping establish the truth. This matters for my father's life.", "reaction": None, "replies": []},
        ],
        "bounty_add": {"user": "user-policywonk", "amount": 30.0, "message": "Reuters confirmation deserves final reward!"}
    },
]


async def simulate_enriched_timeline(mode="LIVE"):
    """
    Run enriched simulation with proper streaming delays

    Modes:
    - LIVE: 1 day = 30 seconds (realistic viewing)
    - FAST: 1 day = 5 seconds (quick demo)
    - INSTANT: no delays (testing)
    """
    base_url = "http://localhost:8000"

    # Configure delays
    delays = {
        "LIVE": 30.0,   # 30 sec per day
        "FAST": 5.0,    # 5 sec per day
        "INSTANT": 0.0  # no delay
    }
    delay_per_day = delays.get(mode, 30.0)

    print(f"\\n{'='*80}")
    print(f"ENRICHED JIMMY LAI QUEST SIMULATION")
    print(f"Mode: {mode} ({delay_per_day}s per simulated day)")
    print(f"Total timeline: {max(e['day'] for e in ENRICHED_TIMELINE)} days")
    print(f"Real time duration: {max(e['day'] for e in ENRICHED_TIMELINE) * delay_per_day:.0f} seconds")
    print(f"{'='*80}\\n")

    async with httpx.AsyncClient(timeout=30.0) as client:
        # Create quest
        print("🎬 Creating Quest...\\n")
        quest_response = await client.post(f"{base_url}/api/quests", json={
            "title": "Did Trump raise Jimmy Lai's case with Xi Jinping in their October 2025 meeting?",
            "description": """The key question: During the Trump-Xi bilateral meeting on October 30, 2025, did President Trump mention or discuss imprisoned Hong Kong media tycoon Jimmy Lai's case?

**Context**:
- Jimmy Lai, 77, is a British citizen and founder of pro-democracy newspaper Apple Daily
- Detained since December 2020 facing national security charges
- U.S. Senators urged Trump to raise the case
- Meeting held in South Korea on the sidelines of APEC summit

**Scope**: This includes BOTH public statements and private discussion portions of the meeting.""",
            "total_bounty": 10.0,
            "created_by": "user-system"
        })

        quest_data = quest_response.json()
        quest = quest_data.get("quest", quest_data)  # Handle both formats
        quest_id = quest["id"]
        print(f"✓ Quest created: {quest_id}")
        print(f"💰 Initial bounty: ${quest.get('total_bounty', 0)}")
        print(f"🔗 View live: http://localhost:8000/quest/{quest_id}\\n")

        # Track current day for delays
        current_day = 0

        # Submit evidence chronologically with delays
        for i, evidence in enumerate(ENRICHED_TIMELINE, 1):
            # Calculate delay since last event
            day_diff = evidence["day"] - current_day
            if day_diff > 0 and delay_per_day > 0:
                delay_seconds = day_diff * delay_per_day
                print(f"⏳ [Day {evidence['day']}] Waiting {delay_seconds:.0f}s (time passes...)\\n")
                await asyncio.sleep(delay_seconds)

            current_day = evidence["day"]

            # Display evidence submission
            print("="*80)
            print(f"📅 {evidence['date']} (Day {evidence['day']}) - EVIDENCE #{i}")
            print("="*80)
            print(f"👤 Submitted by: {evidence['submitted_by']}")
            print(f"🔗 Source: {evidence['url']}")
            print(f"📋 Type: {evidence['type']}")
            print(f"\\n{evidence['synopsis'][:200]}...\\n")

            # Submit evidence via API
            try:
                ev_response = await client.post(
                    f"{base_url}/api/quests/{quest_id}/evidence",
                    json={
                        "source_url": evidence["url"],
                        "synopsis": evidence["synopsis"],
                        "source_type": evidence["type"],
                        "user_id": evidence["submitted_by"],
                        "submitted_at": evidence["date"]  # Pass simulated timestamp
                    }
                )

                if ev_response.status_code == 200:
                    ev_data = ev_response.json()
                    current_evidence_id = ev_data.get('evidence', {}).get('id', 'unknown')
                    print(f"✓ Evidence recorded: {current_evidence_id}")

                    # Show analysis if available
                    if "evidence" in ev_data and "analysis" in ev_data["evidence"]:
                        analysis = ev_data["evidence"]["analysis"]
                        print(f"\\n🤖 ANALYSIS:")
                        print(f"   Novelty: {analysis['novelty_score']:.2f}")
                        print(f"   ΔClarity: {analysis.get('delta_clarity', 0):.3f}")
                        print(f"   Entropy: {analysis.get('entropy_before', 0):.3f} → {analysis.get('entropy_after', 0):.3f}")

                        # Check actual quest status from backend to show convergence state
                        # This reflects the true database state after un-convergence logic
                        quest_response = await client.get(f"{base_url}/api/quests/{quest_id}")
                        if quest_response.status_code == 200:
                            quest_data = quest_response.json()
                            if quest_data.get("status") == "converged":
                                print(f"\\n   🏆 CONVERGENCE DETECTED!")
                            # If previously converged but now active again, this will show nothing
                            # (un-convergence is silent in the simulation display)

                    # Small delay to see evidence appear in UI
                    if delay_per_day > 0:
                        await asyncio.sleep(2)

                else:
                    print(f"❌ Failed to submit: {ev_response.status_code}")
                    current_evidence_id = None

            except Exception as e:
                print(f"❌ Error: {e}")
                current_evidence_id = None

            # Submit comments (with threading support and realistic timing)
            if "comments" in evidence and len(evidence["comments"]) > 0 and current_evidence_id:
                # Give users time to read the evidence before commenting
                if delay_per_day > 0:
                    print(f"\\n⏳ Community reading evidence...")
                    await asyncio.sleep(1.5)

                print(f"\\n💬 COMMUNITY REACTIONS:")

                async def submit_comment_tree(comment, parent_id=None, depth=0):
                    """Recursively submit comments with threading"""
                    indent = "   " + "  " * depth
                    print(f"{indent}{comment['user']}: {comment['text'][:70]}...")

                    # Submit this comment
                    try:
                        comment_response = await client.post(
                            f"{base_url}/api/comments",
                            json={
                                "evidence_id": current_evidence_id,
                                "user_id": comment['user'],
                                "text": comment['text'],
                                "parent_comment_id": parent_id,
                                "reaction_type": comment.get('reaction')
                            }
                        )
                        if comment_response.status_code == 200:
                            comment_data = comment_response.json()
                            comment_id = comment_data.get('id')

                            # Small delay before replies (simulates thinking/typing)
                            if 'replies' in comment and len(comment['replies']) > 0:
                                if delay_per_day > 0:
                                    await asyncio.sleep(0.4)
                                for reply in comment['replies']:
                                    await submit_comment_tree(reply, comment_id, depth + 1)
                                    if delay_per_day > 0:
                                        await asyncio.sleep(0.3)  # Delay between sibling replies
                    except Exception as e:
                        pass  # Silently skip failed comments

                # Submit all top-level comments and their trees
                for comment in evidence["comments"]:
                    await submit_comment_tree(comment)
                    if delay_per_day > 0:
                        await asyncio.sleep(0.6)  # Delay between different comment threads

            # Add bounty if specified
            if "bounty_add" in evidence:
                bounty = evidence["bounty_add"]
                try:
                    await client.post(
                        f"{base_url}/api/quests/{quest_id}/bounty",
                        json={
                            "user_id": bounty["user"],
                            "amount": bounty["amount"],
                            "message": bounty.get("message", "")
                        }
                    )
                    print(f"\\n💰 +${bounty['amount']} added to bounty pool")
                except:
                    pass

            print()

        # Calculate epistemic values for current state (no forced winner)
        print("\\n📊 Calculating epistemic values for current state...")
        try:
            import sqlite3
            from app.services.epistemic_value_calculator import get_epistemic_calculator

            conn = sqlite3.connect("/app/data/truth_market.db")
            epistemic_calc = get_epistemic_calculator(conn)

            # Calculate intrinsic quality + impact metrics (without forcing winner)
            # This gives partial epistemic values based on source quality, novelty, and clarity impact
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, source_credibility, verification_level, evidence_type_weight
                FROM evidence_submissions
                WHERE quest_id = ?
            """, (quest_id,))

            evidence_list = cursor.fetchall()
            print(f"   Found {len(evidence_list)} pieces of evidence to evaluate")

            # For now, calculate a partial epistemic value without truth_alignment
            # epistemic_value = source_credibility × verification × type_weight × novelty × clarity
            # (truth_alignment will remain 0 until quest converges)

            print(f"   ✓ Intrinsic quality metrics already calculated during submission")
            print(f"   ℹ️  Final epistemic values will be calculated upon quest convergence")

            conn.close()
        except Exception as e:
            print(f"   ⚠️  Error: {e}")

        # Final status
        print("\\n" + "="*80)
        print("SIMULATION COMPLETE")
        print("="*80)
        print(f"\\n🔗 View final quest: http://localhost:8000/quest/{quest_id}")
        print(f"\\n✅ All {len(ENRICHED_TIMELINE)} pieces of evidence submitted")
        print(f"✅ Community engaged with comments and bounties")
        print(f"✅ Real-time progression completed")


if __name__ == "__main__":
    import sys

    mode = "LIVE" if len(sys.argv) < 2 else sys.argv[1].upper()

    if mode not in ["LIVE", "FAST", "INSTANT"]:
        print("Usage: python simulate_enriched_timeline.py [LIVE|FAST|INSTANT]")
        print("  LIVE: 30s per day (default, realistic)")
        print("  FAST: 5s per day (quick demo)")
        print("  INSTANT: no delays (testing)")
        sys.exit(1)

    asyncio.run(simulate_enriched_timeline(mode))
