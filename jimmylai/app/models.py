"""
Data models for the Truth Market prototype.
Inspired by CASE_STUDY_TRUMP_JIMMY_LAI.md - focus on clarity trajectories,
scope-aware resolution, and builder attribution.
"""
from datetime import datetime
from typing import List, Optional, Literal
from pydantic import BaseModel, Field


class CommunityUser(BaseModel):
    """Community member - contributor, funder, commentator"""
    id: str
    username: str
    avatar: str = "👤"  # emoji or URL
    role: Literal["contributor", "funder", "journalist", "commentator", "mixed"] = "mixed"
    reputation: int = 0
    total_funded: float = 0.0
    total_earned: float = 0.0
    bio: str = ""
    joined_at: datetime = Field(default_factory=datetime.utcnow)


class Comment(BaseModel):
    """Threaded comment/reaction on evidence"""
    id: str
    user_id: str
    parent_comment_id: Optional[str] = None  # For threading (replies)
    text: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    reaction_type: Literal["comment", "fund", "refute", "support", "question"] = "comment"


class Source(BaseModel):
    """Evidence source with modality tracking"""
    id: str
    url: str
    title: str
    timestamp: datetime
    type: Literal["primary", "secondary"]  # Primary = direct evidence, Secondary = reporting
    modality: Literal["video", "transcript", "article", "social_post", "document"]
    language: str = "en"
    status: Literal["reachable", "unreachable", "pending"] = "pending"


class ClarityEvent(BaseModel):
    """Track ΔClarity over time - the 'truth race' trajectory"""
    timestamp: datetime
    clarity_before: int
    clarity_after: int
    delta: int
    trigger: str  # e.g., "answer_submitted", "source_validated", "contradiction_detected"
    builder_id: Optional[str] = None


class Answer(BaseModel):
    """Builder's answer to an Ask"""
    id: str
    ask_id: str
    builder_id: str = "anon"  # Reference to CommunityUser.id
    source_ids: List[str] = []  # References to Source objects
    synopsis: str = ""
    clarity_gain: int = 0  # ΔClarity contributed by this answer
    novelty: Literal["high", "medium", "low"] = "medium"
    validated: bool = False
    submitted_at: datetime = Field(default_factory=datetime.utcnow)
    payout: float = 0.0  # Credits earned
    payout_preview: float = 0.0  # Live calculation before resolution
    comments: List[Comment] = []  # Threaded community reactions

    # Voting system - community quality signals
    upvotes: int = 0
    downvotes: int = 0
    vote_score: int = 0  # upvotes - downvotes (for sorting)
    voters: List[str] = []  # List of user_ids who voted (prevent double-voting)

    # Attachment system - for evidence that builds on other evidence
    parent_answer_id: Optional[str] = None  # Link to parent evidence
    attachment_type: Literal["corroboration", "refutation", "context", "extraction"] = "corroboration"


class ScopeResolution(BaseModel):
    """Scope-aware resolution - can be partial (e.g., public vs private)"""
    scope: str  # e.g., "public_on_camera", "private_meeting", "overall"
    statement: str
    clarity: int
    confidence: Literal["high", "medium", "low"]
    status: Literal["resolved", "pending", "disputed"]


class BountyContribution(BaseModel):
    """Track who funded the bounty and when"""
    contributor_id: str
    amount: float
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    note: str = ""  # "Initial seed", "After video evidence", etc.


class Ask(BaseModel):
    """Central question in the Truth Market"""
    id: str
    case_id: str
    question: str
    description: str = ""
    clarity: int = 0
    bounty: float = 0.0
    deadline: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    followers: int = 0
    status: Literal["open", "resolved", "extended", "refunded"] = "open"

    # Scope-aware resolutions
    resolutions: List[ScopeResolution] = []

    # Clarity trajectory
    clarity_events: List[ClarityEvent] = []

    # Answers
    answers: List[Answer] = []

    # Bounty funding history
    bounty_contributions: List[BountyContribution] = []


class Case(BaseModel):
    """A Case within a Story - specific investigative thread"""
    id: str
    story_id: str
    title: str
    description: str = ""
    clarity: int = 0  # Aggregate clarity across all Asks
    urgency: str = ""  # e.g., "2d", "18h"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Associated artifacts
    case_study_path: Optional[str] = None  # Link to markdown case study

    asks: List[Ask] = []


class Story(BaseModel):
    """Top-level Story - the overarching narrative"""
    id: str
    title: str
    description: str = ""
    resonance: int = 0  # Public interest metric
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    entities: List[str] = []  # e.g., ["Donald Trump", "Xi Jinping", "Jimmy Lai"]
    tags: List[str] = []

    cases: List[Case] = []


class Builder(BaseModel):
    """User who contributes answers"""
    id: str
    username: str = "anon"
    credits: float = 100.0
    total_clarity_contributed: int = 0
    answers_submitted: int = 0
    badges: List[str] = []
    specialization: Optional[str] = None  # transcriber, translator, fact_checker, etc.
    reputation: int = 0  # Can be used for validation trust level
    joined_at: datetime = Field(default_factory=datetime.utcnow)


class Receipt(BaseModel):
    """Resolution record - the 'receipt' for a resolved Ask"""
    ask_id: str
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    final_clarity: int
    total_bounty: float

    # Builder contributions and payouts
    builder_contributions: List[dict]  # {builder_id, clarity_gain, payout}

    # Timeline
    clarity_trajectory: List[ClarityEvent]

    # Sources used
    source_ids: List[str]

    # Resolution statements (scope-aware)
    resolutions: List[ScopeResolution]
