"""
SQLite database for Truth Market experiment.
File-based persistent storage for comments, actions, and probability tracking.
"""
import sqlite3
from pathlib import Path
from datetime import datetime
from typing import Optional, List, Dict, Any
import json

DATABASE_PATH = Path("./data/truthmarket.db")


def get_connection():
    """Get database connection"""
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DATABASE_PATH))
    conn.row_factory = sqlite3.Row  # Return rows as dictionaries
    return conn


def init_database():
    """Initialize database schema"""
    conn = get_connection()
    cursor = conn.cursor()

    # Quests table - main investigation units
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS quests (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            initial_evidence_url TEXT,
            initial_evidence_text TEXT,

            status TEXT DEFAULT 'active',
            created_by TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,

            converged_at TEXT,
            winning_hypothesis_id TEXT,
            winning_probability REAL,

            initial_bounty REAL DEFAULT 0.0,
            total_bounty REAL DEFAULT 0.0,
            platform_fee_percent REAL DEFAULT 10.0,

            view_count INTEGER DEFAULT 0,
            evidence_count INTEGER DEFAULT 0,
            participant_count INTEGER DEFAULT 0,

            story_id TEXT,
            case_id TEXT
        )
    """)

    # Hypotheses table - LLM-generated competing explanations
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS hypotheses (
            id TEXT PRIMARY KEY,
            quest_id TEXT NOT NULL,
            statement TEXT NOT NULL,

            current_probability REAL NOT NULL,
            initial_probability REAL NOT NULL,
            last_updated TEXT DEFAULT CURRENT_TIMESTAMP,

            generated_by TEXT DEFAULT 'llm',
            generation_prompt TEXT,
            confidence_score REAL,

            is_winner BOOLEAN DEFAULT FALSE,
            converged_at TEXT,

            FOREIGN KEY (quest_id) REFERENCES quests(id)
        )
    """)

    # Evidence submissions table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS evidence_submissions (
            id TEXT PRIMARY KEY,
            quest_id TEXT NOT NULL,
            submitted_by TEXT NOT NULL,

            source_url TEXT NOT NULL,
            source_type TEXT,
            synopsis TEXT,
            full_text TEXT,

            llm_analyzed BOOLEAN DEFAULT FALSE,
            llm_analysis_json TEXT,
            novelty_score REAL,

            clarity_contribution REAL DEFAULT 0.0,
            hypothesis_impacts TEXT,

            is_fork_trigger BOOLEAN DEFAULT FALSE,

            upvotes INTEGER DEFAULT 0,
            downvotes INTEGER DEFAULT 0,
            validated BOOLEAN DEFAULT FALSE,

            estimated_payout REAL DEFAULT 0.0,
            actual_payout REAL DEFAULT 0.0,
            paid_out BOOLEAN DEFAULT FALSE,

            source_credibility REAL DEFAULT 0.5,
            verification_level REAL DEFAULT 0.5,
            evidence_type_weight REAL DEFAULT 0.5,
            curator_reputation REAL DEFAULT 0.5,
            truth_alignment_score REAL DEFAULT 0.0,
            redundancy_penalty REAL DEFAULT 0.0,
            epistemic_value REAL DEFAULT 0.0,
            is_flagged_misinfo BOOLEAN DEFAULT FALSE,
            misinformation_penalty REAL DEFAULT 0.0,

            submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (quest_id) REFERENCES quests(id)
        )
    """)

    # Probability evolution log
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS probability_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            quest_id TEXT NOT NULL,
            hypothesis_id TEXT NOT NULL,

            probability_before REAL NOT NULL,
            probability_after REAL NOT NULL,
            delta REAL NOT NULL,

            trigger_type TEXT NOT NULL,
            trigger_id TEXT,
            trigger_description TEXT,

            entropy_before REAL,
            entropy_after REAL,

            calculated_by TEXT DEFAULT 'system',
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (quest_id) REFERENCES quests(id),
            FOREIGN KEY (hypothesis_id) REFERENCES hypotheses(id)
        )
    """)

    # Contributor rewards
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS contributor_rewards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            quest_id TEXT NOT NULL,
            user_id TEXT NOT NULL,

            evidence_ids TEXT,
            comment_count INTEGER DEFAULT 0,
            validation_actions INTEGER DEFAULT 0,

            base_reward REAL DEFAULT 0.0,
            clarity_bonus REAL DEFAULT 0.0,
            early_bird_bonus REAL DEFAULT 0.0,
            total_reward REAL DEFAULT 0.0,

            paid_out BOOLEAN DEFAULT FALSE,
            paid_at TEXT,

            FOREIGN KEY (quest_id) REFERENCES quests(id)
        )
    """)

    # Comments table - supports threaded discussions on evidence
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS comments (
            id TEXT PRIMARY KEY,
            evidence_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            text TEXT NOT NULL,
            parent_comment_id TEXT,
            reaction_type TEXT,
            timestamp TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (evidence_id) REFERENCES evidence_submissions(id),
            FOREIGN KEY (parent_comment_id) REFERENCES comments(id)
        )
    """)

    # Actions table - Support/Refute/Reply actions on evidence
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS actions (
            id TEXT PRIMARY KEY,
            answer_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            action_type TEXT NOT NULL,
            text TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Curator reputation table - Track user accuracy over time
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS curator_reputation (
            user_id TEXT PRIMARY KEY,

            -- Reputation score (0.0 to 1.0, starts at 0.5 for new users)
            reputation_score REAL DEFAULT 0.5,

            -- Track contribution statistics
            total_submissions INTEGER DEFAULT 0,
            correct_submissions INTEGER DEFAULT 0,
            flagged_misinfo_count INTEGER DEFAULT 0,

            -- Weighted accuracy (accounts for quest importance)
            weighted_accuracy REAL DEFAULT 0.5,

            -- Last updated timestamp
            last_updated TEXT DEFAULT CURRENT_TIMESTAMP,

            -- Metadata
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Probability snapshots - track hypothesis probabilities over time
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS probability_snapshots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ask_id TEXT NOT NULL,
            hypothesis_id TEXT NOT NULL,
            probability REAL NOT NULL,
            trigger_event TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Evidence votes - community quality signals
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS evidence_votes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            answer_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            vote_type TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            UNIQUE(answer_id, user_id)
        )
    """)

    # Bounty contributions - track funding
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS bounty_contributions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ask_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            amount REAL NOT NULL,
            timestamp TEXT NOT NULL
        )
    """)

    # Hypothesis forks - track when evidence triggers hypothesis branching
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS hypothesis_forks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            quest_id TEXT NOT NULL,
            evidence_id TEXT NOT NULL,
            trigger_reason TEXT,
            forked_hypotheses TEXT NOT NULL,
            forked_at TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            applied_at TEXT,
            FOREIGN KEY (quest_id) REFERENCES quests(id),
            FOREIGN KEY (evidence_id) REFERENCES evidence_submissions(id)
        )
    """)

    # Create indexes for common queries
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_quests_status ON quests(status)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_quests_created ON quests(created_at)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_hypotheses_quest ON hypotheses(quest_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_evidence_quest ON evidence_submissions(quest_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_evidence_submitted ON evidence_submissions(submitted_at)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_prob_events_quest ON probability_events(quest_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_comments_evidence ON comments(evidence_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_comment_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_actions_answer ON actions(answer_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_snapshots_ask ON probability_snapshots(ask_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_votes_answer ON evidence_votes(answer_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_forks_quest ON hypothesis_forks(quest_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_forks_status ON hypothesis_forks(status)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_forks_evidence ON hypothesis_forks(evidence_id)")

    conn.commit()
    conn.close()


# ============================================================================
# Comment Operations
# ============================================================================

def create_comment(
    evidence_id: str,
    user_id: str,
    text: str,
    parent_comment_id: Optional[str] = None,
    reaction_type: Optional[str] = None
) -> Dict[str, Any]:
    """Create a new comment on evidence"""
    conn = get_connection()
    cursor = conn.cursor()

    comment_id = f"c-{datetime.utcnow().timestamp()}"
    timestamp = datetime.utcnow().isoformat()

    cursor.execute("""
        INSERT INTO comments (id, evidence_id, user_id, text, parent_comment_id, reaction_type, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (comment_id, evidence_id, user_id, text, parent_comment_id, reaction_type, timestamp))

    conn.commit()
    conn.close()

    return {
        "id": comment_id,
        "evidence_id": evidence_id,
        "user_id": user_id,
        "text": text,
        "parent_comment_id": parent_comment_id,
        "reaction_type": reaction_type,
        "timestamp": timestamp
    }


def get_comments_for_evidence(evidence_id: str) -> List[Dict[str, Any]]:
    """Get all comments for an evidence submission"""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT * FROM comments
        WHERE evidence_id = ?
        ORDER BY timestamp ASC
    """, (evidence_id,))

    comments = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return comments


# ============================================================================
# Action Operations (Support/Refute/Reply)
# ============================================================================

def create_action(
    answer_id: str,
    user_id: str,
    action_type: str,
    text: str
) -> Dict[str, Any]:
    """Create a new action (Support/Refute/Reply)"""
    conn = get_connection()
    cursor = conn.cursor()

    action_id = f"act-{datetime.utcnow().timestamp()}"
    timestamp = datetime.utcnow().isoformat()

    cursor.execute("""
        INSERT INTO actions (id, answer_id, user_id, action_type, text, timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (action_id, answer_id, user_id, action_type, text, timestamp))

    conn.commit()
    conn.close()

    # Also create as comment for display
    reaction_map = {"support": "support", "refute": "refute", "reply": "comment"}
    comment = create_comment(
        answer_id=answer_id,
        user_id=user_id,
        text=text,
        reaction_type=reaction_map.get(action_type, "comment")
    )

    return {
        "id": action_id,
        "answer_id": answer_id,
        "user_id": user_id,
        "action_type": action_type,
        "text": text,
        "timestamp": timestamp,
        "comment": comment
    }


def get_actions_for_answer(answer_id: str) -> List[Dict[str, Any]]:
    """Get all actions for an answer"""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT * FROM actions
        WHERE answer_id = ?
        ORDER BY timestamp DESC
    """, (answer_id,))

    actions = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return actions


# ============================================================================
# Probability Tracking
# ============================================================================

def record_probability_snapshot(
    ask_id: str,
    hypothesis_id: str,
    probability: float,
    trigger_event: str
) -> int:
    """Record a probability snapshot"""
    conn = get_connection()
    cursor = conn.cursor()

    timestamp = datetime.utcnow().isoformat()

    cursor.execute("""
        INSERT INTO probability_snapshots (ask_id, hypothesis_id, probability, trigger_event, timestamp)
        VALUES (?, ?, ?, ?, ?)
    """, (ask_id, hypothesis_id, probability, trigger_event, timestamp))

    snapshot_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return snapshot_id


def get_probability_trajectory(ask_id: str, hypothesis_id: str) -> List[Dict[str, Any]]:
    """Get probability trajectory for a hypothesis"""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT probability, trigger_event as event, timestamp
        FROM probability_snapshots
        WHERE ask_id = ? AND hypothesis_id = ?
        ORDER BY timestamp ASC
    """, (ask_id, hypothesis_id))

    trajectory = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return trajectory


# ============================================================================
# Evidence Voting
# ============================================================================

def vote_on_evidence(answer_id: str, user_id: str, vote_type: str) -> bool:
    """Vote on evidence (upvote/downvote)"""
    conn = get_connection()
    cursor = conn.cursor()

    timestamp = datetime.utcnow().isoformat()

    try:
        cursor.execute("""
            INSERT INTO evidence_votes (answer_id, user_id, vote_type, timestamp)
            VALUES (?, ?, ?, ?)
        """, (answer_id, user_id, vote_type, timestamp))
        conn.commit()
        success = True
    except sqlite3.IntegrityError:
        # User already voted
        success = False

    conn.close()
    return success


def get_vote_counts(answer_id: str) -> Dict[str, int]:
    """Get vote counts for evidence"""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT vote_type, COUNT(*) as count
        FROM evidence_votes
        WHERE answer_id = ?
        GROUP BY vote_type
    """, (answer_id,))

    votes = {"upvotes": 0, "downvotes": 0}
    for row in cursor.fetchall():
        if row["vote_type"] == "up":
            votes["upvotes"] = row["count"]
        elif row["vote_type"] == "down":
            votes["downvotes"] = row["count"]

    conn.close()
    return votes


# ============================================================================
# Bounty Tracking
# ============================================================================

def add_bounty_contribution(ask_id: str, user_id: str, amount: float) -> int:
    """Add bounty contribution"""
    conn = get_connection()
    cursor = conn.cursor()

    timestamp = datetime.utcnow().isoformat()

    cursor.execute("""
        INSERT INTO bounty_contributions (ask_id, user_id, amount, timestamp)
        VALUES (?, ?, ?, ?)
    """, (ask_id, user_id, amount, timestamp))

    contribution_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return contribution_id


def get_total_bounty(ask_id: str) -> float:
    """Get total bounty for an ask"""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT SUM(amount) as total
        FROM bounty_contributions
        WHERE ask_id = ?
    """, (ask_id,))

    result = cursor.fetchone()
    conn.close()

    return result["total"] if result["total"] else 0.0


# ============================================================================
# Quest Operations (New Schema)
# ============================================================================

def create_quest(
    title: str,
    description: str,
    created_by: str,
    initial_bounty: float = 0.0,
    initial_evidence_url: Optional[str] = None,
    initial_evidence_text: Optional[str] = None
) -> Dict[str, Any]:
    """Create a new clarity quest"""
    conn = get_connection()
    cursor = conn.cursor()

    quest_id = f"quest-{datetime.utcnow().timestamp()}"
    timestamp = datetime.utcnow().isoformat()

    cursor.execute("""
        INSERT INTO quests (
            id, title, description, created_by, initial_bounty, total_bounty,
            initial_evidence_url, initial_evidence_text, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (quest_id, title, description, created_by, initial_bounty, initial_bounty,
          initial_evidence_url, initial_evidence_text, timestamp))

    conn.commit()
    conn.close()

    return {
        "id": quest_id,
        "title": title,
        "description": description,
        "created_by": created_by,
        "initial_bounty": initial_bounty,
        "total_bounty": initial_bounty,
        "status": "active",
        "created_at": timestamp
    }


def get_quest(quest_id: str) -> Optional[Dict[str, Any]]:
    """Get quest by ID"""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM quests WHERE id = ?", (quest_id,))
    quest = cursor.fetchone()
    conn.close()

    return dict(quest) if quest else None


def get_all_quests(status: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
    """Get all quests with optional status filter"""
    conn = get_connection()
    cursor = conn.cursor()

    if status:
        cursor.execute("""
            SELECT * FROM quests
            WHERE status = ?
            ORDER BY created_at DESC
            LIMIT ?
        """, (status, limit))
    else:
        cursor.execute("""
            SELECT * FROM quests
            ORDER BY created_at DESC
            LIMIT ?
        """, (limit,))

    quests = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return quests


def update_quest_stats(quest_id: str):
    """Update quest statistics"""
    conn = get_connection()
    cursor = conn.cursor()

    # Count evidence
    cursor.execute("SELECT COUNT(*) as count FROM evidence_submissions WHERE quest_id = ?", (quest_id,))
    evidence_count = cursor.fetchone()["count"]

    # Count unique participants
    cursor.execute("SELECT COUNT(DISTINCT submitted_by) as count FROM evidence_submissions WHERE quest_id = ?", (quest_id,))
    participant_count = cursor.fetchone()["count"]

    # Update quest
    cursor.execute("""
        UPDATE quests
        SET evidence_count = ?, participant_count = ?
        WHERE id = ?
    """, (evidence_count, participant_count, quest_id))

    conn.commit()
    conn.close()


# ============================================================================
# Hypothesis Operations
# ============================================================================

def create_hypothesis(
    quest_id: str,
    statement: str,
    initial_probability: float,
    generated_by: str = "llm",
    generation_prompt: Optional[str] = None
) -> Dict[str, Any]:
    """Create a new hypothesis"""
    conn = get_connection()
    cursor = conn.cursor()

    hypothesis_id = f"h-{datetime.utcnow().timestamp()}"
    timestamp = datetime.utcnow().isoformat()

    cursor.execute("""
        INSERT INTO hypotheses (
            id, quest_id, statement, current_probability, initial_probability,
            generated_by, generation_prompt, last_updated
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (hypothesis_id, quest_id, statement, initial_probability, initial_probability,
          generated_by, generation_prompt, timestamp))

    conn.commit()
    conn.close()

    return {
        "id": hypothesis_id,
        "quest_id": quest_id,
        "statement": statement,
        "current_probability": initial_probability,
        "initial_probability": initial_probability,
        "generated_by": generated_by
    }


def get_hypotheses(quest_id: str) -> List[Dict[str, Any]]:
    """Get all hypotheses for a quest"""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT * FROM hypotheses
        WHERE quest_id = ?
        ORDER BY current_probability DESC
    """, (quest_id,))

    hypotheses = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return hypotheses


def update_hypothesis_probability(
    hypothesis_id: str,
    new_probability: float,
    trigger_type: str,
    trigger_id: Optional[str] = None,
    event_timestamp: Optional[str] = None  # For simulations to set custom timestamp
) -> None:
    """Update hypothesis probability and log event"""
    conn = get_connection()
    cursor = conn.cursor()

    # Get current probability
    cursor.execute("SELECT current_probability, quest_id FROM hypotheses WHERE id = ?", (hypothesis_id,))
    result = cursor.fetchone()
    old_probability = result["current_probability"]
    quest_id = result["quest_id"]

    # Use custom timestamp if provided, otherwise use current time
    timestamp = event_timestamp if event_timestamp else datetime.utcnow().isoformat()

    # Update hypothesis
    cursor.execute("""
        UPDATE hypotheses
        SET current_probability = ?, last_updated = ?
        WHERE id = ?
    """, (new_probability, timestamp, hypothesis_id))

    # Log probability event
    cursor.execute("""
        INSERT INTO probability_events (
            quest_id, hypothesis_id, probability_before, probability_after,
            delta, trigger_type, trigger_id, timestamp
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (quest_id, hypothesis_id, old_probability, new_probability,
          new_probability - old_probability, trigger_type, trigger_id,
          timestamp))

    conn.commit()
    conn.close()


# ============================================================================
# Evidence Submission Operations
# ============================================================================

def submit_evidence(
    quest_id: str,
    submitted_by: str,
    source_url: str,
    synopsis: Optional[str] = None,
    source_type: Optional[str] = None,
    submitted_at: Optional[str] = None  # Allow custom timestamp for simulations
) -> Dict[str, Any]:
    """Submit new evidence"""
    conn = get_connection()
    cursor = conn.cursor()

    evidence_id = f"ev-{datetime.utcnow().timestamp()}"
    timestamp = submitted_at if submitted_at else datetime.utcnow().isoformat()

    cursor.execute("""
        INSERT INTO evidence_submissions (
            id, quest_id, submitted_by, source_url, synopsis, source_type, submitted_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (evidence_id, quest_id, submitted_by, source_url, synopsis, source_type, timestamp))

    conn.commit()
    conn.close()

    # Update quest stats
    update_quest_stats(quest_id)

    return {
        "id": evidence_id,
        "quest_id": quest_id,
        "submitted_by": submitted_by,
        "source_url": source_url,
        "synopsis": synopsis,
        "submitted_at": timestamp
    }


def get_evidence(quest_id: str) -> List[Dict[str, Any]]:
    """Get all evidence for a quest"""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT * FROM evidence_submissions
        WHERE quest_id = ?
        ORDER BY submitted_at DESC
    """, (quest_id,))

    evidence = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return evidence
