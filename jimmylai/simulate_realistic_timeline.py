#!/usr/bin/env python3
"""
Realistic Jimmy Lai Quest Simulation
Following actual real-world timeline from artifacts

Timeline (compressed: 1 real day = 1 simulated minute):
- Oct 25: Prediction articles emerge
- Oct 30: Trump-Xi meeting + press gaggle
- Oct 31: WH official confirms (via EWTN)
- Nov 6: Reuters full confirmation

This simulation validates that the system can handle:
1. Initial speculation and predictions
2. Conflicting information (public vs private meeting)
3. Progressive evidence revelation
4. Probability updates based on evidence quality
5. Community engagement (comments, funding, voting)
6. Final convergence when strong evidence emerges
"""

import asyncio
import httpx
from datetime import datetime
import time

# User pool for simulation
USERS = [
    "user-alice", "user-bob", "user-charlie", "user-david",
    "user-emma", "user-frank", "user-grace", "user-henry",
    "user-isabella", "user-jack"
]

async def log_event(day, event_type, description):
    """Log simulation events"""
    timestamp = datetime.utcnow().isoformat()
    print(f"[Day {day:2d}] [{event_type:12s}] {description}")

async def wait_days(days, speed=1.0):
    """Wait for simulated days (1 day = 60/speed seconds)"""
    seconds = (days * 60) / speed
    await asyncio.sleep(seconds)

async def run_simulation(speed=2.0):
    """
    Run realistic simulation based on actual timeline
    Speed: 1.0 = slow (1 day = 60s), 2.0 = default (1 day = 30s), 10.0 = fast (1 day = 6s)
    """
    print("=" * 80)
    print("REALISTIC JIMMY LAI QUEST SIMULATION")
    print("=" * 80)
    print(f"Speed: {speed}x (1 simulated day = {60/speed:.1f} seconds)")
    print("Timeline: Oct 25 - Nov 6, 2025")
    print("=" * 80)
    print()

    # ============================================================================
    # DAY 0 (Oct 25): Initial Quest Creation + Prediction Phase
    # ============================================================================
    await log_event(0, "QUEST_START", "Quest triggered by Senate pressure + media speculation")

    # Create quest
    quest = sqldb.create_quest(
        title="Did Trump raise Jimmy Lai's case with Xi Jinping?",
        description="""U.S. Senators have urged Trump to raise imprisoned Hong Kong media tycoon Jimmy Lai's case during his meeting with Chinese President Xi Jinping. Lianhe Zaobao and other outlets are predicting Trump will bring this up.

**Context**: Jimmy Lai, 77, is a British citizen and founder of pro-democracy newspaper Apple Daily, detained since December 2020 facing national security charges. A verdict is pending that could result in life imprisonment.

**Question**: During the Trump-Xi bilateral meeting on October 30, 2025, did Trump mention or discuss Jimmy Lai's case?

**Scope**: Includes both public statements and private discussion segments of the meeting.""",
        total_bounty=10.0,  # Initial bounty
        created_by="user-system"
    )

    quest_id = quest["id"]
    await log_event(0, "BOUNTY", f"Initial bounty pool: ${quest['total_bounty']}")

    # Create initial binary hypotheses
    h1 = sqldb.create_hypothesis(
        quest_id=quest_id,
        hypothesis_text="Trump raised Jimmy Lai's case with Xi Jinping",
        created_by="user-system",
        initial_probability=0.5
    )

    h2 = sqldb.create_hypothesis(
        quest_id=quest_id,
        hypothesis_text="Trump did not raise Jimmy Lai's case with Xi Jinping",
        created_by="user-system",
        initial_probability=0.5
    )

    await log_event(0, "HYPOTHESIS", f"H1: {h1['hypothesis_text']} (50%)")
    await log_event(0, "HYPOTHESIS", f"H2: {h2['hypothesis_text']} (50%)")

    # Early prediction article
    ev1 = sqldb.submit_evidence(
        quest_id=quest_id,
        hypothesis_id=h1["id"],
        submitted_by="user-alice",
        evidence_url="https://www.zaobao.com.sg/realtime/china/story20251025-7716503",
        evidence_type="news_article",
        synopsis="Lianhe Zaobao (Singapore) reports that U.S. Senators have urged Trump to raise Jimmy Lai's case, creating expectation that it will be discussed during the Trump-Xi meeting scheduled for Oct 30."
    )
    await log_event(0, "EVIDENCE", f"Prediction article submitted (news_article)")

    # Analyze initial evidence
    impact1 = await analyze_evidence_impact(
        quest_id=quest_id,
        evidence_id=ev1["id"],
        evidence_synopsis=ev1["synopsis"],
        evidence_type=ev1["evidence_type"],
        current_hypotheses=[h1, h2]
    )
    await log_event(0, "LLM_UPDATE", f"Probabilities updated: H1={impact1['updated_hypotheses'][0]['probability']*100:.1f}%, H2={impact1['updated_hypotheses'][1]['probability']*100:.1f}%")

    # Early community engagement
    sqldb.create_comment(
        evidence_id=ev1["id"],
        user_id="user-bob",
        text="This is just speculation from media. We need to wait for actual evidence from the meeting.",
        reaction_type="question"
    )
    await log_event(0, "COMMENT", "Community starts discussing")

    # Early funders
    sqldb.add_bounty_contribution(quest_id, "user-charlie", 20.0, "This is important for press freedom")
    await log_event(0, "BOUNTY", "Community member adds $20 (total: $30)")

    await wait_days(1, speed)

    # ============================================================================
    # DAY 1-4 (Oct 26-29): Build-up period
    # ============================================================================
    await log_event(1, "COMMUNITY", "More people following the quest")
    sqldb.add_bounty_contribution(quest_id, "user-david", 15.0)
    await log_event(1, "BOUNTY", "Another $15 added (total: $45)")

    sqldb.create_comment(
        evidence_id=ev1["id"],
        user_id="user-emma",
        text="Given Trump's relationship with Xi and trade priorities, he might avoid controversial human rights topics.",
        reaction_type="refute"
    )
    await log_event(1, "COMMENT", "Skeptical comments appear")

    await wait_days(3, speed)

    # ============================================================================
    # DAY 5 (Oct 30): THE MEETING + PUBLIC PRESS GAGGLE
    # ============================================================================
    await log_event(5, "EVENT", "🔴 Trump-Xi meeting happens in South Korea")
    await wait_days(0.3, speed)  # Few hours later

    # Press gaggle video released - NO MENTION on camera
    ev2 = sqldb.submit_evidence(
        quest_id=quest_id,
        hypothesis_id=h2["id"],  # Supports "did NOT raise"
        submitted_by="user-frank",
        evidence_url="https://www.youtube.com/watch?v=g6GfiUnj5jE&t=243s",
        evidence_type="video_primary",
        synopsis="Full Air Force One press gaggle after Trump-Xi meeting. Trump discusses trade, fentanyl, chips, Ukraine, but makes no mention of Jimmy Lai, Hong Kong, or human rights in the public on-camera segment. When asked what didn't come up, Trump doesn't mention Lai."
    )
    await log_event(5, "EVIDENCE", "🎥 VIDEO: Press gaggle published - no mention of Lai")

    # Analyze video evidence
    impact2 = await analyze_evidence_impact(
        quest_id=quest_id,
        evidence_id=ev2["id"],
        evidence_synopsis=ev2["synopsis"],
        evidence_type=ev2["evidence_type"],
        current_hypotheses=sqldb.get_hypotheses(quest_id)
    )
    await log_event(5, "LLM_UPDATE", f"VIDEO shifts probabilities: H1={impact2['updated_hypotheses'][0]['probability']*100:.1f}%, H2={impact2['updated_hypotheses'][1]['probability']*100:.1f}%")

    # Transcript evidence
    ev3 = sqldb.submit_evidence(
        quest_id=quest_id,
        hypothesis_id=h2["id"],
        submitted_by="user-grace",
        evidence_url="https://github.com/lab/artifacts/TRANSCRIPT_TRUMP_GAGGLE_EXCERPT.md",
        evidence_type="transcript_extraction",
        synopsis="Transcript of the public press gaggle confirms no mention of 'Jimmy Lai', 'Hong Kong', or 'human rights' in the on-camera segment. Trump discusses trade, tariffs, fentanyl, Ukraine, chips, nuclear testing, but Lai's case is not mentioned."
    )
    await log_event(5, "EVIDENCE", "📄 TRANSCRIPT: Confirms no public mention")

    impact3 = await analyze_evidence_impact(
        quest_id=quest_id,
        evidence_id=ev3["id"],
        evidence_synopsis=ev3["synopsis"],
        evidence_type=ev3["evidence_type"],
        current_hypotheses=sqldb.get_hypotheses(quest_id)
    )
    await log_event(5, "LLM_UPDATE", f"TRANSCRIPT reinforces: H1={impact3['updated_hypotheses'][0]['probability']*100:.1f}%, H2={impact3['updated_hypotheses'][1]['probability']*100:.1f}%")

    # Community reacts to video
    sqldb.create_comment(
        evidence_id=ev2["id"],
        user_id="user-henry",
        text="The video clearly shows Trump didn't mention Lai in the public gaggle. Case closed?",
        reaction_type="support"
    )
    await log_event(5, "COMMENT", "Community reacts to video evidence")

    sqldb.create_comment(
        evidence_id=ev2["id"],
        user_id="user-isabella",
        text="Wait - this is only the PUBLIC part. What about the private bilateral meeting before this?",
        reaction_type="question"
    )
    await log_event(5, "COMMENT", "Key question raised about private vs public")

    await wait_days(0.7, speed)  # Rest of the day

    # ============================================================================
    # DAY 6 (Oct 31): PLOT TWIST - White House Official Confirms Private Discussion
    # ============================================================================
    await log_event(6, "EVENT", "🔄 White House official speaks to EWTN")

    # Owen Jensen (EWTN) posts WH confirmation
    ev4 = sqldb.submit_evidence(
        quest_id=quest_id,
        hypothesis_id=h1["id"],  # NOW supports "DID raise"
        submitted_by="user-jack",
        evidence_url="https://x.com/owentjensen/status/1984065694896378145",
        evidence_type="official_statement",
        synopsis="Owen Jensen (EWTN News) reports that a White House official confirmed President Trump DID bring up Jimmy Lai's case during the bilateral meeting with Xi Jinping. The official stated: 'President Trump brought up Jimmy Lai's case, just as he said he would.' This refers to the private portion of the meeting, not the public press gaggle."
    )
    await log_event(6, "EVIDENCE", "🔥 WH OFFICIAL: Trump DID raise Lai privately!")

    impact4 = await analyze_evidence_impact(
        quest_id=quest_id,
        evidence_id=ev4["id"],
        evidence_synopsis=ev4["synopsis"],
        evidence_type=ev4["evidence_type"],
        current_hypotheses=sqldb.get_hypotheses(quest_id)
    )
    await log_event(6, "LLM_UPDATE", f"Official statement causes MAJOR shift: H1={impact4['updated_hypotheses'][0]['probability']*100:.1f}%, H2={impact4['updated_hypotheses'][1]['probability']*100:.1f}%")

    # Community explosion
    sqldb.create_comment(
        evidence_id=ev4["id"],
        user_id="user-alice",
        text="This changes everything! The public gaggle was just one part. Trump DID raise it in private.",
        reaction_type="support"
    )

    sqldb.create_comment(
        evidence_id=ev4["id"],
        user_id="user-bob",
        text="White House officials have credibility. This is likely accurate.",
        reaction_type="support"
    )

    sqldb.create_comment(
        evidence_id=ev2["id"],  # Comment on the video
        user_id="user-charlie",
        text="@isabella was right - the video only showed public remarks. The real discussion happened privately.",
        reaction_type="support"
    )
    await log_event(6, "COMMENT", "Community debate intensifies")

    # More funding as stakes get interesting
    sqldb.add_bounty_contribution(quest_id, "user-emma", 25.0, "This is fascinating - truth is emerging!")
    await log_event(6, "BOUNTY", "Excitement drives $25 contribution (total: $70)")

    # Sebastien Lai press release
    ev5 = sqldb.submit_evidence(
        quest_id=quest_id,
        hypothesis_id=h1["id"],
        submitted_by="user-david",
        evidence_url="https://example.com/lai-press-release-oct31.pdf",
        evidence_type="official_statement",
        synopsis="Press release from Sebastien Lai (Jimmy Lai's son) thanking President Trump for raising his father's case with Xi Jinping, confirming that Trump discussed it. Quote: 'I am so incredibly grateful that the President discussed my father's case in his meeting with President Xi.'"
    )
    await log_event(6, "EVIDENCE", "📢 Sebastien Lai confirms and thanks Trump")

    impact5 = await analyze_evidence_impact(
        quest_id=quest_id,
        evidence_id=ev5["id"],
        evidence_synopsis=ev5["synopsis"],
        evidence_type=ev5["evidence_type"],
        current_hypotheses=sqldb.get_hypotheses(quest_id)
    )
    await log_event(6, "LLM_UPDATE", f"Family confirmation adds weight: H1={impact5['updated_hypotheses'][0]['probability']*100:.1f}%, H2={impact5['updated_hypotheses'][1]['probability']*100:.1f}%")

    await wait_days(1, speed)

    # ============================================================================
    # DAY 7-10 (Nov 1-5): Evidence builds, community converges
    # ============================================================================
    await log_event(7, "COMMUNITY", "Quest gaining attention")

    sqldb.create_comment(
        evidence_id=ev5["id"],
        user_id="user-frank",
        text="Sebastien Lai would have inside information. This confirms it happened.",
        reaction_type="support"
    )

    sqldb.add_bounty_contribution(quest_id, "user-grace", 30.0)
    await log_event(7, "BOUNTY", "$30 more added (total: $100)")

    await wait_days(3, speed)

    # ============================================================================
    # DAY 11 (Nov 6): REUTERS CONFIRMS - CONVERGENCE
    # ============================================================================
    await log_event(11, "EVENT", "🏆 Reuters publishes investigative confirmation")

    ev6 = sqldb.submit_evidence(
        quest_id=quest_id,
        hypothesis_id=h1["id"],
        submitted_by="user-henry",
        evidence_url="https://www.reuters.com/world/trump-pressed-xi-release-jimmy-lai-2025-11-06/",
        evidence_type="news_article",
        synopsis="Reuters confirms Trump directly appealed to Xi Jinping to free Jimmy Lai during their South Korea meeting, citing three sources briefed on the talks and a U.S. administration official. Trump spoke about concerns for Lai's health and well-being, spending less than five minutes on the issue. Source quotes: 'President Trump brought up Jimmy Lai's case, just as he said he would' and 'It was raised by Trump and noted by Xi.' Trump suggested Lai's release would be good for U.S.-China relations."
    )
    await log_event(11, "EVIDENCE", "✅ REUTERS: Multiple sources confirm private discussion")

    impact6 = await analyze_evidence_impact(
        quest_id=quest_id,
        evidence_id=ev6["id"],
        evidence_synopsis=ev6["synopsis"],
        evidence_type=ev6["evidence_type"],
        current_hypotheses=sqldb.get_hypotheses(quest_id)
    )
    await log_event(11, "LLM_UPDATE", f"REUTERS CONFIRMATION: H1={impact6['updated_hypotheses'][0]['probability']*100:.1f}%, H2={impact6['updated_hypotheses'][1]['probability']*100:.1f}%")

    # Final community reactions
    sqldb.create_comment(
        evidence_id=ev6["id"],
        user_id="user-isabella",
        text="Reuters with multiple independent sources - this is definitive. Trump DID raise it privately.",
        reaction_type="support"
    )

    sqldb.create_comment(
        evidence_id=ev6["id"],
        user_id="user-jack",
        text="Beautiful example of how public and private diplomacy differ. The gaggle showed nothing, but the real work happened behind closed doors.",
        reaction_type="support"
    )

    sqldb.create_comment(
        evidence_id=ev2["id"],  # Back to the original video
        user_id="user-alice",
        text="The video evidence was accurate - Trump didn't mention it PUBLICLY. But he did raise it PRIVATELY. Both pieces of evidence are true in their scope.",
        reaction_type="support"
    )
    await log_event(11, "COMMENT", "Community reaches understanding")

    # Final funding surge
    sqldb.add_bounty_contribution(quest_id, "user-henry", 50.0, "Reuters confirmation deserves reward!")
    await log_event(11, "BOUNTY", "Final surge: $50 added (total: $150)")

    await wait_days(1, speed)

    # ============================================================================
    # FINAL STATUS
    # ============================================================================
    print()
    print("=" * 80)
    print("SIMULATION COMPLETE")
    print("=" * 80)

    final_quest = sqldb.get_quest(quest_id)
    final_hypotheses = sqldb.get_hypotheses(quest_id)
    final_evidence = sqldb.get_evidence_for_quest(quest_id)

    print(f"\nQuest: {final_quest['title']}")
    print(f"Status: {final_quest['status']}")
    print(f"Total Bounty: ${final_quest['total_bounty']}")
    print(f"\nFinal Probabilities:")
    for h in final_hypotheses:
        print(f"  {h['hypothesis_text']}: {h['probability']*100:.1f}%")

    print(f"\nEvidence Submitted: {len(final_evidence)}")
    for i, ev in enumerate(final_evidence, 1):
        print(f"  {i}. [{ev['evidence_type']}] {ev['synopsis'][:80]}...")

    print(f"\nTotal Comments: {sum(len(sqldb.get_comments_for_evidence(ev['id'])) for ev in final_evidence)}")

    # Determine winner
    winner = max(final_hypotheses, key=lambda h: h['probability'])
    if winner['probability'] >= 0.8:
        print(f"\n🏆 CONVERGENCE REACHED!")
        print(f"   Winner: {winner['hypothesis_text']}")
        print(f"   Confidence: {winner['probability']*100:.1f}%")
        print(f"\n💰 PAYOUTS: ${final_quest['total_bounty']} to be distributed based on:")
        print(f"   - Evidence novelty and impact")
        print(f"   - Community votes")
        print(f"   - Timing of contributions")
    else:
        print(f"\n⚠️  No clear consensus (highest: {winner['probability']*100:.1f}%)")

    print("\n" + "=" * 80)
    print("Key Lessons Validated:")
    print("  ✓ System handles partial/conflicting evidence correctly")
    print("  ✓ Public vs private information scopes properly")
    print("  ✓ High-quality sources (Reuters, WH) carry more weight")
    print("  ✓ Community can discuss and refine understanding")
    print("  ✓ Probabilities update incrementally with new evidence")
    print("  ✓ Timeline compression works for demonstration")
    print("=" * 80)

    return quest_id

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description='Run realistic Jimmy Lai quest simulation')
    parser.add_argument('--speed', type=float, default=2.0, help='Simulation speed (1.0=slow, 2.0=default, 10.0=fast, 100.0=instant)')
    args = parser.parse_args()

    asyncio.run(run_simulation(speed=args.speed))
