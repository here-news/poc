from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from datetime import datetime
from typing import Optional, Literal, List, Dict
from pydantic import BaseModel
from contextlib import asynccontextmanager
import os
from openai import OpenAI

from .db import TruthMarketDB
from .models import Story, Case, Ask, Answer, Source, Builder
from .receipts import generate_receipt, apply_payouts, calculate_overall_clarity
from .seed_data import create_seed_data
from .dynamics import compute_ask_dynamics
from .hypotheses import generate_hypotheses_for_ask
from . import database as sqldb
from .llm_service import get_llm_service
from .beacon import BeaconClient

# Load OpenAI API key from environment
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
openai_client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

# Initialize LLM service
llm_service = get_llm_service()

# Initialize beacon client
beacon = BeaconClient(
    gateway_url=os.getenv("GATEWAY_URL", "http://gateway:3000")
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup: Register with gateway and start heartbeats
    await beacon.start()
    yield
    # Shutdown: Stop heartbeats
    beacon.stop()


app = FastAPI(
    lifespan=lifespan,
    title="Truth Market Experiment",
    description="Recursive journalism prototype with ΔClarity tracking",
    version="0.2.0",
)

# CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database
db = TruthMarketDB(data_dir="./data")


def recalculate_ask_clarity(ask: Ask) -> Ask:
    """Recalculate clarity for an ask based on its resolutions"""
    ask.clarity = calculate_overall_clarity(ask)
    return ask

# Initialize with seed data on startup
@app.on_event("startup")
async def startup_event():
    # Initialize SQLite database
    print("Initializing SQLite database...")
    sqldb.init_database()

    # Initialize seed data
    # Disabled: Old seed data system (Trump/Jimmy Lai hardcoded case)
    # Use simulate_jimmy_lai_quest.py to run simulation instead
    # stories = db.get_all_stories()
    # if not stories:
    #     print("No data found. Creating seed data...")
    #     create_seed_data(db)


# Static UI (built by Vite into /app/ui)
ui_dir = Path(__file__).parent.parent / "ui"
if ui_dir.exists():
    app.mount("/static", StaticFiles(directory=str(ui_dir)), name="static")
    # Mount assets directory for Vite-built files
    assets_dir = ui_dir / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")


@app.get("/")
async def root():
    index_path = ui_dir / "index.html"
    if index_path.exists():
        return FileResponse(index_path)
    return JSONResponse({"message": "Truth Market Experiment API", "docs": "/docs"})


@app.get("/api/hello")
async def api_hello():
    return {"message": "Hello from FastAPI", "status": "ok"}


# ============================================================================
# Stories
# ============================================================================

@app.get("/api/stories")
async def get_stories():
    """Get all stories"""
    stories = db.get_all_stories()
    # Recalculate clarity for all asks
    for story in stories:
        for case in story.cases:
            for ask in case.asks:
                recalculate_ask_clarity(ask)
    return stories


@app.get("/api/stories/{story_id}")
async def get_story(story_id: str):
    """Get a specific story"""
    story = db.get_story(story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    # Recalculate clarity for all asks
    for case in story.cases:
        for ask in case.asks:
            recalculate_ask_clarity(ask)
    return story


# ============================================================================
# Cases
# ============================================================================

@app.get("/api/stories/{story_id}/cases")
async def get_cases(story_id: str):
    """Get all cases for a story"""
    story = db.get_story(story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    return story.cases


@app.get("/api/stories/{story_id}/cases/{case_id}")
async def get_case(story_id: str, case_id: str):
    """Get a specific case"""
    case = db.get_case(story_id, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case


# ============================================================================
# Asks
# ============================================================================

@app.get("/api/stories/{story_id}/cases/{case_id}/asks")
async def get_asks(story_id: str, case_id: str):
    """Get all asks for a case"""
    case = db.get_case(story_id, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case.asks


@app.get("/api/stories/{story_id}/cases/{case_id}/asks/{ask_id}")
async def get_ask(story_id: str, case_id: str, ask_id: str):
    """Get a specific ask"""
    ask = db.get_ask(story_id, case_id, ask_id)
    if not ask:
        raise HTTPException(status_code=404, detail="Ask not found")
    return recalculate_ask_clarity(ask)


@app.get("/api/stories/{story_id}/cases/{case_id}/asks/{ask_id}/dynamics")
async def get_ask_dynamics(story_id: str, case_id: str, ask_id: str):
    """
    Get investigation dynamics (entropy & tension) for an Ask.

    Returns:
        - entropy (H): Uncertainty level [0-1], 0=clear, 1=uncertain
        - tension (Θ): Community urgency [0-100]
        - phase: Current investigation phase (ignition/storm/breakthrough/resolution/decay)
        - clarity_per_scope: Belief values for each scope
        - tension_components: Breakdown of tension calculation
    """
    ask = db.get_ask(story_id, case_id, ask_id)
    if not ask:
        raise HTTPException(status_code=404, detail="Ask not found")

    # Get all sources to analyze tension components
    all_sources = db.get_all_sources()
    ask_sources = [s for s in all_sources if any(s.id in a.source_ids for a in ask.answers)]

    # Compute dynamics
    snapshot = compute_ask_dynamics(
        answers=ask.answers,
        sources=ask_sources,
        resolutions=ask.resolutions,
        bounty_contributions=ask.bounty_contributions
    )

    return snapshot


@app.get("/api/stories/{story_id}/cases/{case_id}/asks/{ask_id}/hypotheses")
async def get_ask_hypotheses(story_id: str, case_id: str, ask_id: str):
    """
    Get competing hypotheses for an Ask with probability distributions.

    Returns a list of hypotheses, each with:
        - id: Hypothesis identifier
        - statement: The hypothesis statement
        - probability: Confidence level (0-100)
        - supporting_evidence: List of evidence supporting this hypothesis
        - refuting_evidence: List of evidence against this hypothesis
        - context_evidence: List of contextual evidence
        - comment_count: Number of comments discussing this

    TODO: Replace with actual LLM synthesis based on evidence analysis
    """
    ask = db.get_ask(story_id, case_id, ask_id)
    if not ask:
        raise HTTPException(status_code=404, detail="Ask not found")

    # Generate hypotheses based on evidence
    # TODO: Add LLM-based synthesis in hypotheses.py
    hypotheses = generate_hypotheses_for_ask(ask, ask.answers)

    return hypotheses


@app.get("/api/stories/{story_id}/cases/{case_id}/asks/{ask_id}/hypotheses/{hypothesis_id}/trajectory")
async def get_hypothesis_trajectory_endpoint(
    story_id: str, case_id: str, ask_id: str, hypothesis_id: str
):
    """
    Get probability trajectory for a specific hypothesis over time.

    Returns a list of trajectory points showing how the hypothesis probability
    evolved as new evidence arrived:
        - timestamp: When the probability changed
        - probability: The probability value at that point (0-100)
        - event: Description of what triggered the change
    """
    ask = db.get_ask(story_id, case_id, ask_id)
    if not ask:
        raise HTTPException(status_code=404, detail="Ask not found")

    from .hypotheses import get_hypothesis_trajectory
    trajectory = get_hypothesis_trajectory(ask_id, hypothesis_id)

    return trajectory


class FundRequest(BaseModel):
    builder_id: str
    amount: float


@app.post("/api/stories/{story_id}/cases/{case_id}/asks/{ask_id}/fund")
async def fund_ask(story_id: str, case_id: str, ask_id: str, request: FundRequest):
    """Fund an ask bounty"""
    try:
        db.fund_ask(story_id, case_id, ask_id, request.builder_id, request.amount)
        ask = db.get_ask(story_id, case_id, ask_id)
        builder = db.get_builder(request.builder_id)
        return {"success": True, "ask": ask, "builder": builder}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# Answers
# ============================================================================

class SubmitAnswerRequest(BaseModel):
    builder_id: str
    source_url: str
    synopsis: Optional[str] = ""


@app.post("/api/stories/{story_id}/cases/{case_id}/asks/{ask_id}/answers")
async def submit_answer(
    story_id: str, case_id: str, ask_id: str, request: SubmitAnswerRequest
):
    """Submit an answer to an ask"""
    # Create a new source
    source = Source(
        id=f"source-{datetime.utcnow().timestamp()}",
        url=request.source_url,
        title=request.source_url,
        timestamp=datetime.utcnow(),
        type="secondary",
        modality="article",
        status="pending",
    )
    db.create_source(source)

    # Create answer with estimated clarity gain
    answer = Answer(
        id=f"ans-{datetime.utcnow().timestamp()}",
        ask_id=ask_id,
        builder_id=request.builder_id,
        source_ids=[source.id],
        synopsis=request.synopsis,
        clarity_gain=6,  # Default gain
        novelty="medium",
        validated=False,
        submitted_at=datetime.utcnow(),
    )

    db.create_answer(story_id, case_id, ask_id, answer)
    ask = db.get_ask(story_id, case_id, ask_id)

    return {"success": True, "answer": answer, "ask": ask}


class VoteRequest(BaseModel):
    user_id: str
    vote_type: Literal["up", "down"]


@app.post("/api/stories/{story_id}/cases/{case_id}/asks/{ask_id}/answers/{answer_id}/vote")
async def vote_on_answer(
    story_id: str, case_id: str, ask_id: str, answer_id: str, request: VoteRequest
):
    """Vote on an answer (upvote or downvote)"""
    ask = db.get_ask(story_id, case_id, ask_id)
    if not ask:
        raise HTTPException(status_code=404, detail="Ask not found")

    # Find the answer
    answer = next((a for a in ask.answers if a.id == answer_id), None)
    if not answer:
        raise HTTPException(status_code=404, detail="Answer not found")

    # Check if user already voted
    if request.user_id in answer.voters:
        raise HTTPException(status_code=400, detail="User already voted on this answer")

    # Apply vote
    if request.vote_type == "up":
        answer.upvotes += 1
        answer.vote_score += 1
    else:
        answer.downvotes += 1
        answer.vote_score -= 1

    answer.voters.append(request.user_id)

    # Save back
    db.update_ask(story_id, case_id, ask)

    return {
        "success": True,
        "answer_id": answer_id,
        "upvotes": answer.upvotes,
        "downvotes": answer.downvotes,
        "vote_score": answer.vote_score
    }


# ============================================================================
# Community Users
# ============================================================================

@app.get("/api/users")
async def get_users():
    """Get all community users"""
    # For now, return from seed data directly
    # TODO: Add proper db methods
    from .seed_data import get_community_users
    return get_community_users()


# ============================================================================
# Builders (Legacy)
# ============================================================================

@app.get("/api/builders")
async def get_builders():
    """Get all builders"""
    return db.get_all_builders()


@app.get("/api/builders/{builder_id}")
async def get_builder(builder_id: str):
    """Get a specific builder"""
    builder = db.get_builder(builder_id)
    if not builder:
        raise HTTPException(status_code=404, detail="Builder not found")
    return builder


# ============================================================================
# Sources
# ============================================================================

@app.get("/api/sources")
async def get_sources():
    """Get all sources"""
    return db.get_all_sources()


@app.get("/api/sources/{source_id}")
async def get_source(source_id: str):
    """Get a specific source"""
    source = db.get_source(source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    return source


# ============================================================================
# Receipts
# ============================================================================

@app.get("/api/stories/{story_id}/cases/{case_id}/asks/{ask_id}/receipt")
async def get_receipt(story_id: str, case_id: str, ask_id: str):
    """Generate and return a receipt for an ask"""
    ask = db.get_ask(story_id, case_id, ask_id)
    if not ask:
        raise HTTPException(status_code=404, detail="Ask not found")

    builders = db.get_all_builders()
    receipt = generate_receipt(ask, builders)

    return receipt


@app.post("/api/stories/{story_id}/cases/{case_id}/asks/{ask_id}/resolve")
async def resolve_ask(story_id: str, case_id: str, ask_id: str):
    """Resolve an ask and apply payouts"""
    ask = db.get_ask(story_id, case_id, ask_id)
    if not ask:
        raise HTTPException(status_code=404, detail="Ask not found")

    if ask.status == "resolved":
        raise HTTPException(status_code=400, detail="Ask already resolved")

    builders = db.get_all_builders()

    # Apply payouts
    payouts = apply_payouts(ask, builders, db)

    # Update ask status
    ask.status = "resolved"
    db.update_ask(story_id, case_id, ask)

    # Generate receipt
    receipt = generate_receipt(ask, builders)

    return {"success": True, "payouts": payouts, "receipt": receipt}


# ============================================================================
# Community Interactions - SQLite Backed
# ============================================================================

@app.get("/api/evidence/{evidence_id}/comments")
async def get_comments(evidence_id: str):
    """Get all comments for evidence"""
    comments = sqldb.get_comments_for_evidence(evidence_id)
    return comments


class PostActionRequest(BaseModel):
    answer_id: str
    user_id: str
    action_type: Literal["support", "refute", "reply"]
    text: str


@app.post("/api/actions")
async def post_action(request: PostActionRequest):
    """Post a Support/Refute/Reply action on evidence"""
    try:
        action = sqldb.create_action(
            answer_id=request.answer_id,
            user_id=request.user_id,
            action_type=request.action_type,
            text=request.text
        )
        return {"success": True, "action": action}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class VoteOnEvidenceRequest(BaseModel):
    answer_id: str
    user_id: str
    vote_type: Literal["up", "down"]


@app.post("/api/evidence/vote")
async def vote_evidence(request: VoteOnEvidenceRequest):
    """Vote on evidence"""
    success = sqldb.vote_on_evidence(
        answer_id=request.answer_id,
        user_id=request.user_id,
        vote_type=request.vote_type
    )

    if not success:
        raise HTTPException(status_code=400, detail="User already voted on this evidence")

    votes = sqldb.get_vote_counts(request.answer_id)
    return {"success": True, "votes": votes}


@app.get("/api/answers/{answer_id}/votes")
async def get_evidence_votes(answer_id: str):
    """Get vote counts for evidence"""
    votes = sqldb.get_vote_counts(answer_id)
    return votes


class AddBountyRequest(BaseModel):
    ask_id: str
    user_id: str
    amount: float


@app.post("/api/bounty/add")
async def add_bounty(request: AddBountyRequest):
    """Add bounty contribution"""
    contribution_id = sqldb.add_bounty_contribution(
        ask_id=request.ask_id,
        user_id=request.user_id,
        amount=request.amount
    )

    total_bounty = sqldb.get_total_bounty(request.ask_id)

    return {"success": True, "contribution_id": contribution_id, "total_bounty": total_bounty}


@app.get("/api/asks/{ask_id}/bounty")
async def get_bounty_total(ask_id: str):
    """Get total bounty for an ask"""
    total = sqldb.get_total_bounty(ask_id)
    return {"total": total}


# ============================================================================
# Quest API - New Schema
# ============================================================================

class CreateQuestRequest(BaseModel):
    title: str
    description: str
    initial_bounty: float = 0.0
    initial_evidence_url: Optional[str] = None
    initial_evidence_text: Optional[str] = None
    user_id: str = "user-current"


@app.post("/api/quests")
async def create_quest(request: CreateQuestRequest):
    """Create a new clarity quest with LLM-generated hypotheses"""
    try:
        quest = sqldb.create_quest(
            title=request.title,
            description=request.description,
            created_by=request.user_id,
            initial_bounty=request.initial_bounty,
            initial_evidence_url=request.initial_evidence_url,
            initial_evidence_text=request.initial_evidence_text
        )

        # Generate initial hypotheses using LLM
        if llm_service.is_available():
            print(f"🤖 Generating hypotheses for quest {quest['id']}")

            # Prepare evidence text
            evidence_text = None
            if request.initial_evidence_text:
                evidence_text = request.initial_evidence_text
            elif request.initial_evidence_url:
                evidence_text = f"Evidence from: {request.initial_evidence_url}"

            # Generate hypotheses
            hypotheses_data = llm_service.generate_binary_hypotheses(
                quest_title=request.title,
                quest_description=request.description,
                initial_evidence=evidence_text
            )

            # Create hypothesis records in database
            for hyp_data in hypotheses_data:
                sqldb.create_hypothesis(
                    quest_id=quest["id"],
                    statement=hyp_data["statement"],
                    initial_probability=hyp_data["probability"],
                    generated_by="llm",
                    generation_prompt=f"Quest: {request.title}\nReasoning: {hyp_data.get('reasoning', 'N/A')}"
                )

            print(f"✓ Created {len(hypotheses_data)} hypotheses for quest {quest['id']}")

            # Get the created hypotheses
            quest["hypotheses"] = sqldb.get_hypotheses(quest["id"])
        else:
            print(f"⚠️  LLM service unavailable - quest created without hypotheses")
            quest["hypotheses"] = []

        return {"success": True, "quest": quest}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/quests")
async def get_quests(status: Optional[str] = None, limit: int = 100):
    """Get all quests with optional status filter"""
    quests = sqldb.get_all_quests(status=status, limit=limit)

    # Enrich with hypothesis data
    for quest in quests:
        hypotheses = sqldb.get_hypotheses(quest["id"])
        quest["hypotheses"] = hypotheses

        # Add leading hypothesis info
        if hypotheses:
            leading = max(hypotheses, key=lambda h: h["current_probability"])
            quest["leading_hypothesis"] = {
                "statement": leading["statement"],
                "probability": leading["current_probability"]
            }

            # Calculate entropy
            probs = [h["current_probability"] for h in hypotheses]
            entropy = calculate_entropy(probs)
            quest["entropy"] = entropy
        else:
            quest["leading_hypothesis"] = None
            quest["entropy"] = 1.0

    return quests


@app.get("/api/quests/{quest_id}")
async def get_quest(quest_id: str):
    """Get quest details with hypotheses and evidence"""
    quest = sqldb.get_quest(quest_id)
    if not quest:
        raise HTTPException(status_code=404, detail="Quest not found")

    # Get hypotheses
    hypotheses = sqldb.get_hypotheses(quest_id)
    quest["hypotheses"] = hypotheses

    # Get evidence
    evidence = sqldb.get_evidence(quest_id)
    quest["evidence"] = evidence

    # Calculate entropy
    if hypotheses:
        probs = [h["current_probability"] for h in hypotheses]
        quest["entropy"] = calculate_entropy(probs)

    # Increment view count
    # TODO: Add view tracking

    return quest


class SubmitEvidenceRequest(BaseModel):
    source_url: str
    synopsis: Optional[str] = None
    source_type: Optional[str] = None
    user_id: str = "user-current"
    submitted_at: Optional[str] = None  # For simulations to set custom timestamps


@app.post("/api/quests/{quest_id}/evidence")
async def submit_quest_evidence(quest_id: str, request: SubmitEvidenceRequest):
    """Submit evidence for a quest with LLM analysis and probability updates"""
    try:
        from app.services.probability_service import get_probability_service, Hypothesis, Evidence as ProbEvidence

        # Get quest details
        quest = sqldb.get_quest(quest_id)
        if not quest:
            raise HTTPException(status_code=404, detail="Quest not found")

        # Submit evidence to DB
        evidence = sqldb.submit_evidence(
            quest_id=quest_id,
            submitted_by=request.user_id,
            source_url=request.source_url,
            synopsis=request.synopsis,
            source_type=request.source_type,
            submitted_at=request.submitted_at  # Pass custom timestamp if provided
        )

        # 🔥 BROADCAST: New evidence submitted
        from app.services.websocket_manager import get_connection_manager
        ws_manager = get_connection_manager()
        await ws_manager.broadcast(quest_id, "evidence_submitted", {
            "evidence": evidence,
            "timestamp": datetime.utcnow().isoformat()
        })

        # 📊 CALCULATE INITIAL EPISTEMIC QUALITY METRICS
        from app.services.epistemic_value_calculator import get_epistemic_calculator
        conn = sqldb.get_connection()
        epistemic_calc = get_epistemic_calculator(conn)

        # Get intrinsic quality metrics (source credibility, verification, type weight)
        source_credibility = epistemic_calc.get_source_credibility(
            request.source_type or "news_article",
            request.source_url
        )
        verification_level = epistemic_calc.get_verification_level(
            request.source_type or "news_article",
            request.synopsis or ""
        )
        evidence_type_weight = epistemic_calc.get_evidence_type_weight(
            request.source_type or "news_article"
        )

        # Get curator reputation
        curator_reputation = epistemic_calc.get_curator_reputation(request.user_id)

        # Update evidence with initial epistemic metrics
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE evidence_submissions
            SET source_credibility = ?,
                verification_level = ?,
                evidence_type_weight = ?,
                curator_reputation = ?
            WHERE id = ?
        """, (source_credibility, verification_level, evidence_type_weight, curator_reputation, evidence["id"]))
        conn.commit()

        print(f"📊 Epistemic Quality Metrics:")
        print(f"   Source Credibility: {source_credibility:.2f} ({request.source_type or 'news_article'})")
        print(f"   Verification Level: {verification_level:.2f}")
        print(f"   Evidence Type Weight: {evidence_type_weight:.2f}")
        print(f"   Curator Reputation: {curator_reputation:.2f} (user: {request.user_id})")

        # Analyze evidence impact using ENHANCED LLM with context
        if llm_service.is_available() and request.synopsis:
            print(f"🤖 Analyzing evidence {evidence['id']} with contextual reasoning...")

            # Get current hypotheses
            hypotheses_db = sqldb.get_hypotheses(quest_id)

            if hypotheses_db:
                # Get all previous evidence for context
                conn = sqldb.get_connection()
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT id, synopsis, source_type, source_url, submitted_at, novelty_score
                    FROM evidence_submissions
                    WHERE quest_id = ? AND id != ?
                    ORDER BY submitted_at
                """, (quest_id, evidence['id']))

                previous_evidence_rows = cursor.fetchall()

                # Use enhanced analyzer with full context
                from app.services.enhanced_llm_analyzer import (
                    get_enhanced_analyzer,
                    AnalysisContext,
                    Evidence as ContextEvidence,
                    Hypothesis as ContextHypothesis
                )

                enhanced_analyzer = get_enhanced_analyzer()

                # Build context
                context = AnalysisContext(
                    quest_title=quest['title'],
                    quest_description=quest['description'],
                    current_hypotheses=[
                        ContextHypothesis(
                            id=h["id"],
                            statement=h["statement"],
                            current_probability=h["current_probability"],
                            scope=None  # TODO: Extract from DB if stored
                        )
                        for h in hypotheses_db
                    ],
                    previous_evidence=[
                        ContextEvidence(
                            id=row[0],
                            synopsis=row[1],
                            evidence_type=row[2],
                            evidence_url=row[3],
                            submitted_at=row[4],
                            novelty_score=row[5] or 0.5
                        )
                        for row in previous_evidence_rows
                    ],
                    new_evidence=ContextEvidence(
                        id=evidence['id'],
                        synopsis=request.synopsis,
                        evidence_type=request.source_type or "news_article",
                        evidence_url=request.source_url,
                        submitted_at=evidence['submitted_at'],
                        novelty_score=0.5
                    ),
                    key_event_date="2025-10-30T00:00:00"  # Trump-Xi meeting date
                )

                # Get enhanced analysis
                analysis = enhanced_analyzer.analyze_evidence_with_context(context)

                print(f"📊 Enhanced Analysis:")
                print(f"   Novelty: {analysis.get('novelty_score', 0.5):.2f}")
                print(f"   Quality: {analysis.get('evidence_quality', 'unknown')}")
                print(f"   Temporal: {analysis.get('temporal_context', 'unknown')}")
                print(f"   Target: {analysis.get('target_hypothesis_id', 'none')}")
                if 'reasoning' in analysis:
                    print(f"   Reasoning: {analysis['reasoning'][:200]}...")

                # Update evidence record with enhanced analysis
                cursor.execute("""
                    UPDATE evidence_submissions
                    SET llm_analyzed = TRUE,
                        novelty_score = ?
                    WHERE id = ?
                """, (analysis.get("novelty_score", 0.5), evidence["id"]))
                conn.commit()

                # 🍴 CHECK FOR HYPOTHESIS FORK TRIGGER
                if analysis.get("scope_refinement_needed"):
                    print(f"🍴 Hypothesis fork detected by LLM, analyzing...")

                    # Get all evidence including the new one
                    cursor.execute("""
                        SELECT id, synopsis, source_type, source_url, submitted_at, novelty_score
                        FROM evidence_submissions
                        WHERE quest_id = ?
                        ORDER BY submitted_at
                    """, (quest_id,))
                    all_evidence_rows = cursor.fetchall()

                    all_evidence = [
                        ContextEvidence(
                            id=row[0],
                            synopsis=row[1],
                            evidence_type=row[2],
                            evidence_url=row[3],
                            submitted_at=row[4],
                            novelty_score=row[5] or 0.5
                        )
                        for row in all_evidence_rows
                    ]

                    # Ask enhanced analyzer to suggest fork
                    forked_hypotheses = enhanced_analyzer.suggest_hypothesis_refinement(
                        quest_title=quest['title'],
                        current_hypotheses=context.current_hypotheses,
                        all_evidence=all_evidence
                    )

                    if forked_hypotheses:
                        print(f"✨ Hypothesis fork triggered: {len(forked_hypotheses)} branched hypotheses")
                        for i, new_hyp in enumerate(forked_hypotheses, 1):
                            print(f"   {i}. [{new_hyp.get('scope', 'general')}] {new_hyp['statement'][:60]}... ({new_hyp['initial_probability']*100:.1f}%)")

                        # TODO: Full fork implementation:
                        # 1. Present to user for approval (manual mode)
                        # 2. Or auto-apply (simulation mode)
                        # 3. Migrate probability mass from old hypotheses to forked ones
                        # 4. Update database with new hypothesis set
                        # 5. Continue analysis with forked hypotheses

                        print(f"🔬 FORK TRIGGERED: This evidence revealed new dimensions of truth!")
                        print(f"📝 Fork event logged for quest {quest_id}")

                        # Store fork event in database
                        import json
                        cursor.execute("""
                            INSERT INTO hypothesis_forks
                            (quest_id, evidence_id, trigger_reason, forked_hypotheses, forked_at)
                            VALUES (?, ?, ?, ?, ?)
                        """, (
                            quest_id,
                            evidence["id"],
                            analysis.get("reasoning", "Scope conflict detected"),
                            json.dumps(forked_hypotheses),
                            datetime.utcnow().isoformat()
                        ))
                        conn.commit()

                        # Mark this evidence as fork trigger for higher bounty consideration
                        cursor.execute("""
                            UPDATE evidence_submissions
                            SET is_fork_trigger = TRUE
                            WHERE id = ?
                        """, (evidence["id"],))
                        conn.commit()
                        print(f"✓ Evidence marked as FORK TRIGGER for bounty consideration")

                        # 🔥 BROADCAST: Hypothesis fork event (visible to community!)
                        await ws_manager.broadcast(quest_id, "hypothesis_fork", {
                            "evidence_id": evidence["id"],
                            "submitter_id": request.user_id,
                            "reason": analysis.get("reasoning", "Scope conflict detected"),
                            "old_hypotheses": [
                                {"id": h.id, "statement": h.statement, "probability": h.current_probability}
                                for h in context.current_hypotheses
                            ],
                            "forked_hypotheses": forked_hypotheses,
                            "timestamp": datetime.utcnow().isoformat()
                        })
                        print(f"📡 Broadcast fork event to all connected clients")

                # Use enhanced analysis to determine target hypothesis
                target_hyp_id = analysis.get("target_hypothesis_id")

                # If LLM didn't pick one, use first hypothesis as fallback
                if not target_hyp_id:
                    target_hyp_id = hypotheses_db[0]["id"]
                    print(f"   ⚠️ No clear target, using default hypothesis")

                # Convert to service layer objects
                hypotheses_objs = [
                    Hypothesis(
                        id=h["id"],
                        quest_id=quest_id,
                        hypothesis_text=h["statement"],
                        probability=h["current_probability"],
                        created_by=h.get("generated_by", "system"),
                        created_at=h.get("last_updated", datetime.utcnow().isoformat())
                    )
                    for h in hypotheses_db
                ]

                evidence_obj = ProbEvidence(
                    id=evidence["id"],
                    quest_id=quest_id,
                    hypothesis_id=target_hyp_id,
                    evidence_url=request.source_url,
                    evidence_type=request.source_type or "news_article",
                    synopsis=request.synopsis,
                    novelty_score=analysis["novelty_score"],
                    submitted_by=request.user_id,
                    submitted_at=evidence["submitted_at"]
                )

                # Use ProbabilityService to update probabilities
                prob_service = get_probability_service()
                update_result = prob_service.update_probabilities(
                    hypotheses_objs,
                    evidence_obj,
                    analysis
                )

                print(f"📊 Probability Update: ΔClarity={update_result.delta_clarity:.3f}")

                # Save updated probabilities to DB
                for hyp in update_result.updated_hypotheses:
                    sqldb.update_hypothesis_probability(
                        hypothesis_id=hyp.id,
                        new_probability=hyp.probability,
                        trigger_type="evidence_submitted",
                        trigger_id=evidence["id"],
                        event_timestamp=evidence.get("submitted_at")  # Use evidence timestamp
                    )
                    print(f"   {hyp.hypothesis_text[:60]}... → {hyp.probability*100:.1f}%")

                # Store delta clarity
                cursor.execute("""
                    UPDATE evidence_submissions
                    SET clarity_contribution = ?
                    WHERE id = ?
                """, (update_result.delta_clarity, evidence["id"]))
                conn.commit()

                # Calculate partial epistemic value (without truth_alignment which requires winner)
                # Formula: source_credibility × curator_reputation × verification × type_weight × novelty × clarity_multiplier × (1 - misinfo_penalty)
                novelty_score = analysis.get("novelty_score", 0.5)
                clarity_multiplier = max(0.1, 1.0 + update_result.delta_clarity)

                # Get misinformation penalty (0.0 if not flagged)
                cursor.execute("""
                    SELECT misinformation_penalty
                    FROM evidence_submissions
                    WHERE id = ?
                """, (evidence["id"],))
                result = cursor.fetchone()
                misinformation_penalty = result[0] if result else 0.0

                partial_epistemic_value = (
                    source_credibility *
                    curator_reputation *
                    verification_level *
                    evidence_type_weight *
                    novelty_score *
                    clarity_multiplier *
                    (1.0 - misinformation_penalty)
                )

                cursor.execute("""
                    UPDATE evidence_submissions
                    SET epistemic_value = ?
                    WHERE id = ?
                """, (partial_epistemic_value, evidence["id"]))
                conn.commit()

                print(f"💎 Partial Epistemic Value: {partial_epistemic_value:.4f}")
                print(f"   = {source_credibility:.2f} (source) × {curator_reputation:.2f} (curator) × {verification_level:.2f} (verif) × {evidence_type_weight:.2f} (type) × {novelty_score:.2f} (novelty) × {clarity_multiplier:.2f} (clarity) × {(1.0 - misinformation_penalty):.2f} (misinfo)")

                # 🔥 BROADCAST: Probability update to all connected clients
                from app.services.websocket_manager import get_connection_manager
                ws_manager = get_connection_manager()
                await ws_manager.broadcast(quest_id, "probability_update", {
                    "hypotheses": [
                        {
                            "id": h.id,
                            "statement": h.hypothesis_text,
                            "probability": h.probability
                        }
                        for h in update_result.updated_hypotheses
                    ],
                    "delta_clarity": update_result.delta_clarity,
                    "evidence_id": evidence["id"],
                    "timestamp": datetime.utcnow().isoformat()
                })

                # Check for convergence using service
                converged, winner_id = prob_service.check_convergence(update_result.updated_hypotheses)

                # Handle un-convergence: if quest was converged but no longer meets threshold, revert to active
                if not converged and quest["status"] == "converged":
                    print(f"⚠️  UNCONVERGED! New evidence pushed probabilities below threshold")
                    cursor.execute("""
                        UPDATE quests
                        SET status = 'active',
                            converged_at = NULL,
                            winning_hypothesis_id = NULL
                        WHERE id = ?
                    """, (quest_id,))
                    conn.commit()

                    # Clear winner flag from all hypotheses
                    cursor.execute("""
                        UPDATE hypotheses
                        SET is_winner = FALSE
                        WHERE quest_id = ?
                    """, (quest_id,))
                    conn.commit()

                    # Broadcast un-convergence
                    await ws_manager.broadcast(quest_id, "quest_unconverged", {
                        "message": "New evidence has challenged the previous consensus",
                        "timestamp": datetime.utcnow().isoformat()
                    })

                # Handle convergence: mark as converged if threshold reached
                if converged and quest["status"] == "active":
                    winner = next(h for h in update_result.updated_hypotheses if h.id == winner_id)
                    print(f"🏆 CONVERGENCE! {winner.hypothesis_text} reached {winner.probability:.1%}")

                    # Mark quest as converged
                    cursor.execute("""
                        UPDATE quests
                        SET status = 'converged',
                            converged_at = ?,
                            winning_hypothesis_id = ?
                        WHERE id = ?
                    """, (datetime.utcnow().isoformat(), winner_id, quest_id))
                    conn.commit()

                    # Mark winning hypothesis
                    cursor.execute("""
                        UPDATE hypotheses
                        SET is_winner = TRUE
                        WHERE id = ?
                    """, (winner_id,))
                    conn.commit()

                    # Calculate final epistemic values now that we know the winner
                    print(f"📊 Calculating epistemic values for all evidence...")
                    epistemic_calc.save_epistemic_values(quest_id)

                    # Update curator reputations based on truth alignment
                    print(f"👤 Updating curator reputations based on evidence quality...")
                    epistemic_calc.update_curator_reputations(quest_id)

                    # TODO: Trigger payout calculation
                    print(f"💰 TODO: Calculate and distribute payouts")

                    # 🔥 BROADCAST: Quest convergence
                    await ws_manager.broadcast(quest_id, "quest_converged", {
                        "winner_id": winner_id,
                        "winner_statement": winner.hypothesis_text,
                        "winner_probability": winner.probability,
                        "timestamp": datetime.utcnow().isoformat()
                    })

                evidence["analysis"] = {
                    "novelty_score": analysis["novelty_score"],
                    "delta_clarity": update_result.delta_clarity,
                    "entropy_before": update_result.entropy_before,
                    "entropy_after": update_result.entropy_after,
                    "reasoning": update_result.reasoning,
                    "converged": converged
                }
            else:
                print(f"⚠️  No hypotheses found for quest {quest_id}")
        else:
            if not llm_service.is_available():
                print(f"⚠️  LLM service unavailable - evidence submitted without analysis")
            elif not request.synopsis:
                print(f"⚠️  No synopsis provided - skipping LLM analysis")

        return {"success": True, "evidence": evidence}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/quests/{quest_id}/hypotheses")
async def get_quest_hypotheses(quest_id: str):
    """Get all hypotheses for a quest"""
    hypotheses = sqldb.get_hypotheses(quest_id)
    return hypotheses


@app.get("/api/quests/{quest_id}/evidence")
async def get_quest_evidence(quest_id: str):
    """Get all evidence for a quest"""
    evidence = sqldb.get_evidence(quest_id)
    return evidence


@app.get("/api/quests/{quest_id}/epistemic-scoreboard")
async def get_epistemic_scoreboard(quest_id: str):
    """Get epistemic quality scores for all evidence in a quest, ranked by value"""
    try:
        conn = sqldb.get_connection()
        cursor = conn.cursor()

        # Check if quest exists
        cursor.execute("SELECT id, status, total_bounty, platform_fee_percent FROM quests WHERE id = ?", (quest_id,))
        quest = cursor.fetchone()
        if not quest:
            raise HTTPException(status_code=404, detail="Quest not found")

        quest_data = {
            "id": quest[0],
            "status": quest[1],
            "total_bounty": quest[2],
            "platform_fee_percent": quest[3]
        }

        # Get all evidence with epistemic scores, ordered by epistemic value descending
        cursor.execute("""
            SELECT
                id,
                submitted_by,
                source_url,
                source_type,
                synopsis,
                submitted_at,
                source_credibility,
                verification_level,
                evidence_type_weight,
                curator_reputation,
                novelty_score,
                clarity_contribution,
                truth_alignment_score,
                redundancy_penalty,
                misinformation_penalty,
                epistemic_value,
                estimated_payout,
                actual_payout,
                is_flagged_misinfo
            FROM evidence_submissions
            WHERE quest_id = ?
            ORDER BY epistemic_value DESC
        """, (quest_id,))

        evidence_rows = cursor.fetchall()
        evidence_list = []
        total_epistemic_value = 0.0

        for row in evidence_rows:
            ev = {
                "id": row[0],
                "submitted_by": row[1],
                "source_url": row[2],
                "source_type": row[3],
                "synopsis": row[4][:100] + "..." if row[4] and len(row[4]) > 100 else row[4],
                "submitted_at": row[5],
                "quality_scores": {
                    "source_credibility": row[6],
                    "verification_level": row[7],
                    "evidence_type_weight": row[8],
                    "curator_reputation": row[9],
                    "novelty_score": row[10],
                    "clarity_contribution": row[11],
                    "truth_alignment_score": row[12],
                    "redundancy_penalty": row[13],
                    "misinformation_penalty": row[14]
                },
                "epistemic_value": row[15],
                "estimated_payout": row[16],
                "actual_payout": row[17],
                "is_flagged_misinfo": row[18]
            }
            evidence_list.append(ev)
            total_epistemic_value += row[15] if row[15] else 0.0

        # Calculate payout percentages
        available_bounty = quest_data["total_bounty"] * (1 - quest_data["platform_fee_percent"] / 100.0)
        for ev in evidence_list:
            if total_epistemic_value > 0:
                ev["payout_share_percent"] = (ev["epistemic_value"] / total_epistemic_value) * 100
                ev["estimated_payout"] = (ev["epistemic_value"] / total_epistemic_value) * available_bounty
            else:
                ev["payout_share_percent"] = 0.0
                ev["estimated_payout"] = 0.0

        return {
            "quest": quest_data,
            "total_epistemic_value": total_epistemic_value,
            "available_bounty": available_bounty,
            "evidence": evidence_list
        }

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/quests/{quest_id}/hypothesis-trajectory")
async def get_hypothesis_trajectory(quest_id: str):
    """Get probability evolution over time for all hypotheses"""
    try:
        conn = sqldb.get_connection()
        cursor = conn.cursor()

        # Check if quest exists
        cursor.execute("SELECT id FROM quests WHERE id = ?", (quest_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Quest not found")

        # Get all hypotheses
        cursor.execute("""
            SELECT id, statement, current_probability, is_winner
            FROM hypotheses
            WHERE quest_id = ?
            ORDER BY current_probability DESC
        """, (quest_id,))

        hypotheses_rows = cursor.fetchall()
        hypotheses = []

        for row in hypotheses_rows:
            hyp_id = row[0]

            # Get probability events for this hypothesis
            cursor.execute("""
                SELECT
                    probability_before,
                    probability_after,
                    trigger_type,
                    trigger_id,
                    timestamp
                FROM probability_events
                WHERE quest_id = ? AND hypothesis_id = ?
                ORDER BY timestamp ASC
            """, (quest_id, hyp_id))

            events = []
            for event_row in cursor.fetchall():
                events.append({
                    "old_probability": event_row[0],
                    "new_probability": event_row[1],
                    "trigger_type": event_row[2],
                    "trigger_id": event_row[3],
                    "timestamp": event_row[4]
                })

            hypotheses.append({
                "id": hyp_id,
                "statement": row[1],
                "current_probability": row[2],
                "is_winner": row[3],
                "probability_history": events
            })

        return {
            "quest_id": quest_id,
            "hypotheses": hypotheses
        }

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/quests/{quest_id}")
async def delete_quest(quest_id: str):
    """Delete a quest and all associated data (hypotheses, evidence, probability events)"""
    try:
        conn = sqldb.get_connection()
        cursor = conn.cursor()

        # Check if quest exists
        cursor.execute("SELECT id FROM quests WHERE id = ?", (quest_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Quest not found")

        # Delete in order (respecting foreign key constraints)
        cursor.execute("DELETE FROM probability_events WHERE quest_id = ?", (quest_id,))
        cursor.execute("DELETE FROM contributor_rewards WHERE quest_id = ?", (quest_id,))
        cursor.execute("DELETE FROM evidence_submissions WHERE quest_id = ?", (quest_id,))
        cursor.execute("DELETE FROM hypotheses WHERE quest_id = ?", (quest_id,))
        cursor.execute("DELETE FROM quests WHERE id = ?", (quest_id,))

        conn.commit()

        return {"success": True, "message": f"Quest {quest_id} deleted"}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/quests/{quest_id}/trajectory")
async def get_quest_trajectory(quest_id: str):
    """Get probability evolution for all hypotheses"""
    conn = sqldb.get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            hypothesis_id,
            probability_after as probability,
            trigger_description as event,
            timestamp
        FROM probability_events
        WHERE quest_id = ?
        ORDER BY timestamp ASC
    """, (quest_id,))

    events = [dict(row) for row in cursor.fetchall()]
    conn.close()

    # Group by hypothesis
    trajectory = {}
    for event in events:
        h_id = event["hypothesis_id"]
        if h_id not in trajectory:
            trajectory[h_id] = []
        trajectory[h_id].append({
            "probability": event["probability"],
            "event": event["event"],
            "timestamp": event["timestamp"]
        })

    return trajectory


# ============================================================================
# Comments API
# ============================================================================

class CreateCommentRequest(BaseModel):
    evidence_id: str
    user_id: str
    text: str
    parent_comment_id: Optional[str] = None
    reaction_type: Optional[str] = None  # "support", "refute", "question"


@app.post("/api/comments")
async def create_comment(request: CreateCommentRequest):
    """Create a new comment on evidence"""
    comment = sqldb.create_comment(
        evidence_id=request.evidence_id,
        user_id=request.user_id,
        text=request.text,
        parent_comment_id=request.parent_comment_id,
        reaction_type=request.reaction_type
    )

    # Get quest_id for this evidence to broadcast
    conn = sqldb.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT quest_id FROM evidence_submissions WHERE id = ?", (request.evidence_id,))
    row = cursor.fetchone()
    if row:
        quest_id = row[0]
        # 🔥 BROADCAST: New comment added
        from app.services.websocket_manager import get_connection_manager
        ws_manager = get_connection_manager()
        await ws_manager.broadcast(quest_id, "comment_added", {
            "comment": comment,
            "evidence_id": request.evidence_id,
            "timestamp": datetime.utcnow().isoformat()
        })

    return comment


@app.get("/api/evidence/{evidence_id}/comments")
async def get_evidence_comments(evidence_id: str):
    """Get all comments for an evidence submission"""
    comments = sqldb.get_comments_for_evidence(evidence_id)
    return comments


# ============================================================================
# Bounty Contributions API
# ============================================================================

class AddBountyRequest(BaseModel):
    user_id: str
    amount: float
    message: Optional[str] = None


@app.post("/api/quests/{quest_id}/bounty")
async def add_bounty(quest_id: str, request: AddBountyRequest):
    """Add funds to quest bounty pool"""
    conn = sqldb.get_connection()
    cursor = conn.cursor()

    # Verify quest exists
    cursor.execute("SELECT total_bounty FROM quests WHERE id = ?", (quest_id,))
    result = cursor.fetchone()
    if not result:
        conn.close()
        raise HTTPException(status_code=404, detail="Quest not found")

    current_bounty = result[0]
    new_bounty = current_bounty + request.amount

    # Update quest bounty
    cursor.execute("""
        UPDATE quests
        SET total_bounty = ?
        WHERE id = ?
    """, (new_bounty, quest_id))

    conn.commit()
    conn.close()

    # 🔥 BROADCAST: Bounty added
    from app.services.websocket_manager import get_connection_manager
    ws_manager = get_connection_manager()
    await ws_manager.broadcast(quest_id, "bounty_added", {
        "user_id": request.user_id,
        "amount": request.amount,
        "new_total": new_bounty,
        "message": request.message,
        "timestamp": datetime.utcnow().isoformat()
    })

    return {
        "quest_id": quest_id,
        "previous_bounty": current_bounty,
        "added_amount": request.amount,
        "new_bounty": new_bounty,
        "contributor": request.user_id,
        "message": request.message
    }


def calculate_entropy(probabilities: List[float]) -> float:
    """Calculate Shannon entropy of probability distribution"""
    import math

    if not probabilities:
        return 1.0

    entropy = 0.0
    for p in probabilities:
        if p > 0:
            entropy -= p * math.log2(p)

    # Normalize to 0-1 scale
    max_entropy = math.log2(len(probabilities)) if len(probabilities) > 1 else 1.0
    normalized = entropy / max_entropy if max_entropy > 0 else 0.0

    return normalized


# ============================================================================
# WebSocket for Real-Time Updates
# ============================================================================

@app.websocket("/ws/quests/{quest_id}")
async def websocket_quest_updates(websocket: WebSocket, quest_id: str):
    """
    WebSocket endpoint for real-time quest updates

    Clients connect to this endpoint to receive live updates for a specific quest:
    - New evidence submissions
    - Probability updates
    - New comments
    - Bounty contributions
    - Quest convergence
    """
    from app.services.websocket_manager import get_connection_manager

    manager = get_connection_manager()
    await manager.connect(websocket, quest_id)

    try:
        # Keep connection alive and listen for client messages (if any)
        while True:
            try:
                # Accept any client messages (ping/pong, etc.)
                data = await websocket.receive_text()
                # Echo back for heartbeat
                await websocket.send_json({"type": "pong"})
            except WebSocketDisconnect:
                break
            except Exception as e:
                print(f"WebSocket error: {e}")
                break
    finally:
        await manager.disconnect(websocket, quest_id)


# Catch-all route for React SPA (must be LAST route)
@app.get("/{full_path:path}")
async def serve_react_app(full_path: str):
    """Serve React app for all frontend routes (SPA catch-all)"""
    # Don't intercept API routes or static assets
    if full_path.startswith("api/") or full_path.startswith("static/") or full_path.startswith("assets/"):
        raise HTTPException(status_code=404, detail="Not found")

    # Serve index.html for all other routes (React Router handles routing)
    index_path = ui_dir / "index.html"
    if index_path.exists():
        return FileResponse(index_path)

    return JSONResponse({"error": "Frontend not built"}, status_code=404)

