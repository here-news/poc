"""
Seed data based on CASE_STUDY_TRUMP_JIMMY_LAI.md
Creates initial stories, cases, asks, sources, and answers.
WITH FULL COMMUNITY SIMULATION - real users, threaded comments, funding events
"""
from datetime import datetime, timedelta
from .models import (
    Story, Case, Ask, Answer, Source, Builder,
    ClarityEvent, ScopeResolution, BountyContribution,
    CommunityUser, Comment
)


# Global users cache for API access
_community_users = []


def get_community_users():
    """Return all community users (for API endpoint)"""
    return _community_users


def create_seed_data(db):
    """Initialize database with case study data"""

    # ============================================================================
    # COMMUNITY USERS - The cast of characters
    # ============================================================================

    user_policywonk = CommunityUser(
        id="user-policywonk",
        username="@PolicyWonk",
        avatar="🏛️",
        role="mixed",
        reputation=85,
        total_funded=20.0,
        bio="Policy analyst tracking US-China relations"
    )

    user_chinahawk = CommunityUser(
        id="user-chinahawk",
        username="@ChinaHawk",
        avatar="🦅",
        role="mixed",
        reputation=72,
        total_funded=10.0,
        bio="Human rights advocate, Hong Kong freedom"
    )

    user_skeptic = CommunityUser(
        id="user-skeptic",
        username="@Skeptic99",
        avatar="🤔",
        role="commentator",
        reputation=45,
        bio="Question everything"
    )

    user_newsjunkie = CommunityUser(
        id="user-newsjunkie",
        username="@NewsJunkie",
        avatar="📰",
        role="commentator",
        reputation=60,
        bio="Breaking news addict"
    )

    user_buildera = CommunityUser(
        id="user-buildera",
        username="@BuilderA",
        avatar="🔎",
        role="contributor",
        reputation=92,
        total_earned=24.0,
        bio="Video forensics specialist"
    )

    user_builderb = CommunityUser(
        id="user-builderb",
        username="@BuilderB",
        avatar="📝",
        role="contributor",
        reputation=88,
        total_earned=19.0,
        bio="Transcript extraction expert"
    )

    user_builderc = CommunityUser(
        id="user-builderc",
        username="@BuilderC",
        avatar="🔍",
        role="contributor",
        reputation=75,
        total_earned=9.0,
        bio="Misinformation auditor"
    )

    user_builderd = CommunityUser(
        id="user-builderd",
        username="@BuilderD",
        avatar="🌏",
        role="contributor",
        reputation=68,
        total_earned=8.0,
        bio="Asia news context provider"
    )

    user_owen = CommunityUser(
        id="user-owen",
        username="@OwenJensen",
        avatar="🎙️",
        role="journalist",
        reputation=80,
        bio="EWTN News White House Correspondent"
    )

    user_anon1 = CommunityUser(
        id="user-anon1",
        username="@Anonymous_1",
        avatar="👤",
        role="funder",
        total_funded=5.0,
    )

    user_anon2 = CommunityUser(
        id="user-anon2",
        username="@Anonymous_2",
        avatar="👤",
        role="funder",
        total_funded=5.0,
    )

    # Legacy builders (for backwards compatibility)
    builder_anon = Builder(
        id="builder-anon",
        username="anonymous",
        credits=100.0,
        specialization="fact_checker",
        badges=["fact_checker"],
    )
    builder_a = Builder(
        id="builder-a",
        username="BuilderA - The Transcriber",
        credits=124.0,
        total_clarity_contributed=47,
        answers_submitted=3,
        specialization="transcriber",
        reputation=89,
        badges=["transcriber", "primary_source_hunter"],
    )
    builder_b = Builder(
        id="builder-b",
        username="BuilderB - Data Analyst",
        credits=119.0,
        total_clarity_contributed=38,
        answers_submitted=2,
        specialization="data_scraper",
        reputation=75,
        badges=["data_scraper"],
    )
    builder_c = Builder(
        id="builder-c",
        username="BuilderC - Fact Guardian",
        credits=109.0,
        total_clarity_contributed=22,
        answers_submitted=4,
        specialization="fact_checker",
        reputation=68,
        badges=["fact_checker", "contradiction_detective"],
    )
    builder_d = Builder(
        id="builder-d",
        username="BuilderD - Context Provider",
        credits=108.0,
        total_clarity_contributed=15,
        answers_submitted=3,
        specialization="translator",
        reputation=55,
        badges=["translator"],
    )

    for builder in [builder_anon, builder_a, builder_b, builder_c, builder_d]:
        db.create_builder(builder)

    # Create sources from the case study
    sources = [
        Source(
            id="s1",
            url="https://www.zaobao.com.sg/realtime/china/story20251025-7716503",
            title="Lianhe Zaobao: Trump expected to raise Jimmy Lai",
            timestamp=datetime(2025, 10, 25, 6, 14),
            type="secondary",
            modality="article",
            language="zh",
            status="reachable",
        ),
        Source(
            id="s2",
            url="https://x.com/MichaelHXHX/status/1983912860645527656",
            title="X post denying mention (with Grok auto-reply)",
            timestamp=datetime(2025, 10, 30, 15, 4),
            type="secondary",
            modality="social_post",
            language="zh",
            status="reachable",
        ),
        Source(
            id="s3",
            url="https://www.youtube.com/watch?v=g6GfiUnj5jE&t=243s",
            title="Full press gaggle video (YouTube)",
            timestamp=datetime(2025, 10, 30, 18, 0),
            type="primary",
            modality="video",
            language="en",
            status="reachable",
        ),
        Source(
            id="s4",
            url="/artifacts/TRANSCRIPT_TRUMP_GAGGLE_EXCERPT.md",
            title="Transcript excerpt (public on-camera segment)",
            timestamp=datetime(2025, 10, 30, 18, 30),
            type="primary",
            modality="transcript",
            language="en",
            status="reachable",
        ),
        Source(
            id="s5",
            url="https://x.com/owentjensen/status/1984065694896378145",
            title="Owen Jensen (EWTN): WH official confirmation",
            timestamp=datetime(2025, 10, 31, 1, 11),
            type="secondary",
            modality="social_post",
            language="en",
            status="reachable",
        ),
    ]

    for source in sources:
        db.create_source(source)

    # STORY: US-China Relations (ongoing coverage)
    story1 = Story(
        id="story-us-china",
        title="US-China Relations",
        description="Tracking key developments in US-China geopolitics, diplomacy, trade, and human rights",
        resonance=86,
        entities=["United States", "China", "Donald Trump", "Xi Jinping"],
        tags=["geopolitics", "diplomacy", "trade", "human-rights"],
        created_at=datetime(2025, 10, 1, 0, 0),
    )
    db.create_story(story1)

    # CASE: Trump-Xi October Meeting
    case1 = Case(
        id="case-trump-xi-oct",
        story_id="story-us-china",
        title="Trump-Xi October Meeting",
        description="Investigating what was discussed in the October 2025 Trump-Xi meeting",
        clarity=72,
        urgency="1d 6h",
        case_study_path="/static/cases/CASE_STUDY_TRUMP_JIMMY_LAI.md",
        created_at=datetime(2025, 10, 25, 0, 0),
    )
    db.create_case("story-us-china", case1)

    # ASK: Did Trump mention Jimmy Lai?
    ask1 = Ask(
        id="ask-jimmy-lai",
        case_id="case-trump-xi-oct",
        question="Did Trump mention Jimmy Lai during their October meeting?",
        description="Investigating whether imprisoned Hong Kong publisher Jimmy Lai was discussed (public vs private portions)",
        clarity=72,
        bounty=60.0,
        deadline=datetime.utcnow() + timedelta(days=1, hours=6),
        created_at=datetime(2025, 10, 25, 0, 0),
        followers=24,
        status="open",
    )

    # Add scope-aware resolutions
    ask1.resolutions = [
        ScopeResolution(
            scope="public_on_camera",
            statement="No direct mention of 'Jimmy Lai' found in the on-camera transcript.",
            clarity=72,
            confidence="high",
            status="resolved",
        ),
        ScopeResolution(
            scope="private_meeting",
            statement="Insufficient evidence to confirm/deny private-portion mention; awaiting corroboration.",
            clarity=35,
            confidence="low",
            status="pending",
        ),
    ]

    # Add bounty contribution history (WITH COMMUNITY DYNAMICS)
    ask1.bounty_contributions = [
        BountyContribution(
            contributor_id="system",
            amount=30.0,
            timestamp=datetime(2025, 10, 25, 0, 0),
            note="Initial seed funding",
        ),
        BountyContribution(
            contributor_id="user-policywonk",
            amount=20.0,
            timestamp=datetime(2025, 10, 25, 6, 24),  # 10 min after prediction
            note="Adding $20 to bounty. I need to know if this happens.",
        ),
        BountyContribution(
            contributor_id="user-anon1",
            amount=5.0,
            timestamp=datetime(2025, 10, 27, 12, 0),  # During the wait
            note="Want answer fast",
        ),
        BountyContribution(
            contributor_id="user-anon2",
            amount=5.0,
            timestamp=datetime(2025, 10, 28, 18, 0),  # During the wait
            note="",
        ),
        BountyContribution(
            contributor_id="user-chinahawk",
            amount=10.0,
            timestamp=datetime(2025, 10, 30, 18, 5),  # 5 min after video evidence!
            note="But what about the PRIVATE portion of the meeting??",
        ),
    ]

    db.create_ask("story-us-china", "case-trump-xi-oct", ask1)

    # ============================================================================
    # EVIDENCE + COMMUNITY REACTIONS - The Drama Unfolds
    # ============================================================================

    # Answer 1: Prediction (Oct 25, 6:14 UTC) - @BuilderD posts
    answer4 = Answer(
        id="ans-4",
        ask_id="ask-jimmy-lai",
        builder_id="user-builderd",
        source_ids=["s1"],
        synopsis="Prediction from Lianhe Zaobao: Trump expected to raise Jimmy Lai case with Xi during meeting",
        clarity_gain=5,
        novelty="medium",
        validated=True,
        submitted_at=datetime(2025, 10, 25, 6, 14),
        payout=8.0,
        payout_preview=45.0,  # If resolved at this point
    )

    # Community reactions - branching thread
    answer4.comments = [
        Comment(
            id="c4-1",
            user_id="user-policywonk",
            text="Big if true. This would be huge for Hong Kong.",
            timestamp=datetime(2025, 10, 25, 6, 16),  # 2min later
        ),
        Comment(
            id="c4-2",
            user_id="user-chinahawk",
            parent_comment_id="c4-1",  # Reply to PolicyWonk
            text="He NEEDS to do this! Lai has been detained 4 years!",
            timestamp=datetime(2025, 10, 25, 6, 19),  # 5min later
        ),
        Comment(
            id="c4-3",
            user_id="user-skeptic",
            parent_comment_id="c4-2",  # Reply to ChinaHawk
            text="Doubt it happens. Trump won't risk Xi relationship.",
            timestamp=datetime(2025, 10, 25, 6, 22),  # 8min later
        ),
        Comment(
            id="c4-4",
            user_id="user-policywonk",
            text="Adding $20 to bounty. I need to know if this happens.",
            timestamp=datetime(2025, 10, 25, 6, 24),  # 10min later
            reaction_type="fund",
        ),
        Comment(
            id="c4-5",
            user_id="user-newsjunkie",
            text="RemindMe in 5 days",
            timestamp=datetime(2025, 10, 25, 6, 29),  # 15min later
        ),
    ]

    db.create_answer("story-us-china", "case-trump-xi-oct", "ask-jimmy-lai", answer4)

    # Answer 2: Denial + Grok (Oct 30, 15:04 UTC) - @BuilderC flags contradiction
    answer3 = Answer(
        id="ans-3",
        ask_id="ask-jimmy-lai",
        builder_id="user-builderc",
        source_ids=["s2"],
        synopsis="Denial detected: Chinese X user + Grok AI claim Trump didn't mention Lai (misinformation flagged)",
        clarity_gain=6,
        novelty="medium",
        validated=True,
        submitted_at=datetime(2025, 10, 30, 15, 4),
        payout=9.0,
        payout_preview=27.0,
    )

    # Community erupts - HOT DEBATE with refutations
    answer3.comments = [
        Comment(
            id="c3-1",
            user_id="user-skeptic",
            text="CALLED IT! I knew he wouldn't do it!",
            timestamp=datetime(2025, 10, 30, 15, 5),  # 1min later
        ),
        Comment(
            id="c3-2",
            user_id="user-policywonk",
            parent_comment_id="c3-1",  # Refutes skeptic
            text="Wait - where's the video proof? This is just social media posts.",
            timestamp=datetime(2025, 10, 30, 15, 6),  # 2min
            reaction_type="refute",
        ),
        Comment(
            id="c3-3",
            user_id="user-skeptic",
            parent_comment_id="c3-2",  # Defends position
            text="Grok said it! That's AI verification!",
            timestamp=datetime(2025, 10, 30, 15, 7),  # 3min
        ),
        Comment(
            id="c3-4",
            user_id="user-newsjunkie",
            parent_comment_id="c3-3",  # Corrects skeptic
            text="Grok hallucinates. Need primary source.",
            timestamp=datetime(2025, 10, 30, 15, 8),  # 4min
            reaction_type="refute",
        ),
        Comment(
            id="c3-5",
            user_id="user-chinahawk",
            text="This is heartbreaking if true 😢",
            timestamp=datetime(2025, 10, 30, 15, 9),  # 5min
        ),
        Comment(
            id="c3-6",
            user_id="user-builderc",
            text="I'm investigating. Something doesn't add up. No video source = red flag.",
            timestamp=datetime(2025, 10, 30, 15, 10),  # 6min
        ),
        Comment(
            id="c3-7",
            user_id="user-buildera",
            text="Looking for press conference footage now...",
            timestamp=datetime(2025, 10, 30, 15, 14),  # 10min
        ),
    ]

    db.create_answer("story-us-china", "case-trump-xi-oct", "ask-jimmy-lai", answer3)

    # Answer 3: Video Evidence DROPS (Oct 30, 18:00 UTC) - @BuilderA breakthrough!
    answer1 = Answer(
        id="ans-1",
        ask_id="ask-jimmy-lai",
        builder_id="user-buildera",
        source_ids=["s3"],
        synopsis="Video evidence: Full press conference footage analyzed - no mention of Jimmy Lai found in public segment",
        clarity_gain=18,
        novelty="high",
        validated=True,
        submitted_at=datetime(2025, 10, 30, 18, 0),
        payout=24.0,
        payout_preview=33.0,
    )

    # Community ERUPTS - celebration + new questions
    answer1.comments = [
        Comment(
            id="c1-1",
            user_id="user-policywonk",
            text="THERE IT IS! VIDEO DOESN'T LIE! 🔥",
            timestamp=datetime(2025, 10, 30, 18, 0, 30),  # 30sec later
        ),
        Comment(
            id="c1-2",
            user_id="user-skeptic",
            parent_comment_id="c1-1",
            text="Okay fine, I was wrong about the denial. Video > Grok.",
            timestamp=datetime(2025, 10, 30, 18, 1),  # 1min
        ),
        Comment(
            id="c1-3",
            user_id="user-buildera",
            parent_comment_id="c1-2",
            text="Thanks. Took 3 hours to find the footage.",
            timestamp=datetime(2025, 10, 30, 18, 2),  # 2min
        ),
        Comment(
            id="c1-4",
            user_id="user-newsjunkie",
            text="This is the smoking gun. Can anyone extract transcript?",
            timestamp=datetime(2025, 10, 30, 18, 1),  # 1min
            reaction_type="question",
        ),
        Comment(
            id="c1-5",
            user_id="user-builderc",
            text="Good work @BuilderA! My misinformation flag was correct - Grok/MichaelHXHX were wrong.",
            timestamp=datetime(2025, 10, 30, 18, 2),  # 2min
            reaction_type="support",
        ),
        Comment(
            id="c1-6",
            user_id="user-chinahawk",
            text="But what about the PRIVATE portion of the meeting??",
            timestamp=datetime(2025, 10, 30, 18, 3),  # 3min
            reaction_type="question",
        ),
        Comment(
            id="c1-7",
            user_id="user-policywonk",
            parent_comment_id="c1-6",
            text="Good point. Video only shows public press conference.",
            timestamp=datetime(2025, 10, 30, 18, 4),  # 4min
        ),
        Comment(
            id="c1-8",
            user_id="user-chinahawk",
            parent_comment_id="c1-7",
            text="Adding $10 to investigate private meeting!",
            timestamp=datetime(2025, 10, 30, 18, 5),  # 5min
            reaction_type="fund",
        ),
        Comment(
            id="c1-9",
            user_id="user-builderb",
            text="I can extract the transcript. Give me 30 minutes.",
            timestamp=datetime(2025, 10, 30, 18, 6),  # 6min
        ),
    ]

    db.create_answer("story-us-china", "case-trump-xi-oct", "ask-jimmy-lai", answer1)

    # Answer 4: Transcript Confirmation (Oct 30, 18:30 UTC) - @BuilderB delivers
    # ATTACHED to video evidence (answer1)
    answer2 = Answer(
        id="ans-2",
        ask_id="ask-jimmy-lai",
        builder_id="user-builderb",
        source_ids=["s4"],
        synopsis="Transcript extracted: Word-for-word record confirms no mention of Jimmy Lai",
        clarity_gain=14,
        novelty="high",
        validated=True,
        submitted_at=datetime(2025, 10, 30, 18, 30),
        payout=19.0,
        payout_preview=19.0,
        parent_answer_id="ans-1",  # ATTACHED to video
        attachment_type="extraction",  # Extracted data from video
    )

    # Celebration + teamwork recognized
    answer2.comments = [
        Comment(
            id="c2-1",
            user_id="user-policywonk",
            text="Case closed for PUBLIC segment! 72% is resolution threshold!",
            timestamp=datetime(2025, 10, 30, 18, 31),  # 1min
        ),
        Comment(
            id="c2-2",
            user_id="user-buildera",
            text="Thanks @BuilderB for the transcript! Solid corroboration 💪",
            timestamp=datetime(2025, 10, 30, 18, 32),  # 2min
            reaction_type="support",
        ),
        Comment(
            id="c2-3",
            user_id="user-builderb",
            parent_comment_id="c2-2",
            text="Team effort! Your video made it possible.",
            timestamp=datetime(2025, 10, 30, 18, 33),  # 3min
            reaction_type="support",
        ),
        Comment(
            id="c2-4",
            user_id="user-chinahawk",
            text="Public segment: CLEAR ✓\nPrivate meeting: UNKNOWN ⚠️\nWe need more investigation!",
            timestamp=datetime(2025, 10, 30, 18, 34),  # 4min
        ),
        Comment(
            id="c2-5",
            user_id="user-newsjunkie",
            text="So the answer is: NO public mention, but private is unclear?",
            timestamp=datetime(2025, 10, 30, 18, 35),  # 5min
            reaction_type="question",
        ),
        Comment(
            id="c2-6",
            user_id="user-builderc",
            text="Correct. Two different scopes now.",
            timestamp=datetime(2025, 10, 30, 18, 36),  # 6min
        ),
    ]

    db.create_answer("story-us-china", "case-trump-xi-oct", "ask-jimmy-lai", answer2)

    # Answer 5: Owen Jensen's WH Claim (Oct 31, 01:11 UTC) - PLOT TWIST!
    answer5 = Answer(
        id="ans-5",
        ask_id="ask-jimmy-lai",
        builder_id="user-owen",
        source_ids=["s5"],
        synopsis="WH official claim re: private portion - awaiting corroboration",
        clarity_gain=0,  # Pending validation
        novelty="high",
        validated=False,
        submitted_at=datetime(2025, 10, 31, 1, 11),
        payout=0.0,
        payout_preview=0.0,
    )

    # Community DIVIDES - credibility debate
    answer5.comments = [
        Comment(
            id="c5-1",
            user_id="user-policywonk",
            text="WHICH OFFICIAL?? Need name for verification.",
            timestamp=datetime(2025, 10, 31, 1, 13),  # 2min
            reaction_type="question",
        ),
        Comment(
            id="c5-2",
            user_id="user-owen",
            parent_comment_id="c5-1",
            text="Source requested anonymity. Standard journalism practice.",
            timestamp=datetime(2025, 10, 31, 1, 16),  # 5min
        ),
        Comment(
            id="c5-3",
            user_id="user-skeptic",
            parent_comment_id="c5-2",
            text="Anonymous source = red flag 🚩",
            timestamp=datetime(2025, 10, 31, 1, 19),  # 8min
            reaction_type="refute",
        ),
        Comment(
            id="c5-4",
            user_id="user-owen",
            parent_comment_id="c5-3",
            text="I'm a credentialed journalist. I verify my sources.",
            timestamp=datetime(2025, 10, 31, 1, 21),  # 10min
        ),
        Comment(
            id="c5-5",
            user_id="user-chinahawk",
            text="This makes sense! He probably did it privately to avoid angering Xi publicly.",
            timestamp=datetime(2025, 10, 31, 1, 14),  # 3min
        ),
        Comment(
            id="c5-6",
            user_id="user-newsjunkie",
            parent_comment_id="c5-5",
            text="Possible, but we need corroboration. One anonymous source isn't enough.",
            timestamp=datetime(2025, 10, 31, 1, 16),  # 5min
        ),
        Comment(
            id="c5-7",
            user_id="user-builderc",
            text="Need second source or documentation. Can't verify anonymous claims.",
            timestamp=datetime(2025, 10, 31, 1, 18),  # 7min
        ),
        Comment(
            id="c5-8",
            user_id="user-policywonk",
            text="So we have TWO separate questions now:\n✓ Public: NO mention (72% resolved)\n⚠️ Private: Claims YES (35% pending)",
            timestamp=datetime(2025, 10, 31, 1, 21),  # 10min
        ),
        Comment(
            id="c5-9",
            user_id="user-chinahawk",
            text="Current pool ($70) should go to investigating the private meeting!",
            timestamp=datetime(2025, 10, 31, 1, 23),  # 12min
        ),
    ]

    db.create_answer("story-us-china", "case-trump-xi-oct", "ask-jimmy-lai", answer5)

    # Populate global users cache for API
    global _community_users
    _community_users = [
        user_policywonk, user_chinahawk, user_skeptic, user_newsjunkie,
        user_buildera, user_builderb, user_builderc, user_builderd,
        user_owen, user_anon1, user_anon2
    ]

    print("Seed data created successfully!")
    print(f"- 1 story (US-China Relations)")
    print(f"- 1 case (Trump-Xi October Meeting)")
    print(f"- 1 ask (Did Trump mention Jimmy Lai?)")
    print(f"- {len(db.get_all_sources())} sources")
    print(f"- {len(_community_users)} community users")
