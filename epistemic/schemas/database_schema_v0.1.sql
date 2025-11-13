-- ============================================================================
-- EPISTEMIC DATABASE SCHEMA v0.1
-- ============================================================================
-- PostgreSQL schema for unified epistemic community platform
-- Combines concerns (stories, events, etc.) with quest-based investigations
-- ============================================================================

-- ============================================================================
-- USERS & REPUTATION
-- ============================================================================

CREATE TABLE users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,

    -- Reputation system
    epistemic_reputation FLOAT DEFAULT 1.0 CHECK(epistemic_reputation >= 0),
    total_credits INTEGER DEFAULT 0 CHECK(total_credits >= 0),
    rank TEXT DEFAULT 'Novice' CHECK(rank IN ('Novice', 'Contributor', 'Expert', 'Master', 'Legend')),

    -- Stats
    evidence_submitted INTEGER DEFAULT 0,
    quests_participated INTEGER DEFAULT 0,
    comments_posted INTEGER DEFAULT 0,
    accuracy_rate FLOAT DEFAULT 0.5 CHECK(accuracy_rate BETWEEN 0 AND 1),

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    bio TEXT,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_users_reputation ON users(epistemic_reputation DESC);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

-- ============================================================================
-- CONCERNS (Unified content types)
-- ============================================================================

CREATE TABLE concerns (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK(type IN ('story', 'event', 'person', 'org', 'report', 'poll', 'quest')),
    title TEXT NOT NULL,
    description TEXT,

    -- Links
    neo4j_node_id TEXT,  -- Link to Neo4j entity
    parent_concern_id TEXT REFERENCES concerns(id),  -- For nested concerns

    -- Metrics
    heat_score FLOAT DEFAULT 0.0,  -- Trending algorithm score
    view_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,

    -- Metadata
    created_by TEXT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'archived', 'resolved', 'flagged')),

    -- Polymorphic metadata (JSONB for flexibility)
    metadata JSONB DEFAULT '{}'::jsonb
    -- Examples:
    -- For stories: {"url": "...", "source": "NYT", "published_at": "..."}
    -- For events: {"event_date": "...", "location": "..."}
    -- For polls: {"options": [...], "total_votes": 123}
);

CREATE INDEX idx_concerns_type ON concerns(type);
CREATE INDEX idx_concerns_heat_score ON concerns(heat_score DESC);
CREATE INDEX idx_concerns_created_at ON concerns(created_at DESC);
CREATE INDEX idx_concerns_status ON concerns(status);
CREATE INDEX idx_concerns_metadata ON concerns USING GIN(metadata);

-- ============================================================================
-- QUESTS (Epistemic investigations)
-- ============================================================================

CREATE TABLE quests (
    id TEXT PRIMARY KEY,
    concern_id TEXT REFERENCES concerns(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,

    -- Bounty
    total_bounty INTEGER DEFAULT 0 CHECK(total_bounty >= 0),
    platform_fee_percent FLOAT DEFAULT 10.0,  -- Platform takes 10%

    -- Status
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'converged', 'resolved', 'cancelled')),
    convergence_threshold FLOAT DEFAULT 0.75,  -- When to mark as converged

    -- Resolution
    winning_hypothesis_id TEXT,  -- Set when resolved
    converged_at TIMESTAMP,
    resolved_at TIMESTAMP,

    -- Metadata
    created_by TEXT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Metrics
    evidence_count INTEGER DEFAULT 0,
    participant_count INTEGER DEFAULT 0,
    entropy FLOAT DEFAULT 1.0,  -- Current uncertainty (0=certain, 1=max uncertainty)
    total_clarity_gain FLOAT DEFAULT 0.0  -- Cumulative ΔClarity
);

CREATE INDEX idx_quests_concern_id ON quests(concern_id);
CREATE INDEX idx_quests_status ON quests(status);
CREATE INDEX idx_quests_created_at ON quests(created_at DESC);
CREATE INDEX idx_quests_total_bounty ON quests(total_bounty DESC);

-- ============================================================================
-- HYPOTHESES
-- ============================================================================

CREATE TABLE hypotheses (
    id TEXT PRIMARY KEY,
    quest_id TEXT REFERENCES quests(id) ON DELETE CASCADE,
    statement TEXT NOT NULL,
    scope TEXT,  -- e.g., 'before_2000', 'business_only', etc.

    -- Probability tracking
    initial_probability FLOAT NOT NULL CHECK(initial_probability BETWEEN 0 AND 1),
    current_probability FLOAT NOT NULL CHECK(current_probability BETWEEN 0 AND 1),

    -- Resolution
    is_winner BOOLEAN DEFAULT FALSE,

    -- Metadata
    generated_by TEXT,  -- 'llm', 'user', 'system'
    generation_prompt TEXT,  -- LLM prompt used
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_hypotheses_quest_id ON hypotheses(quest_id);
CREATE INDEX idx_hypotheses_is_winner ON hypotheses(is_winner);

-- ============================================================================
-- EVIDENCE SUBMISSIONS
-- ============================================================================

CREATE TABLE evidence_submissions (
    id TEXT PRIMARY KEY,
    quest_id TEXT REFERENCES quests(id) ON DELETE CASCADE,
    submitted_by TEXT REFERENCES users(id),

    -- Source
    source_url TEXT NOT NULL,
    source_type TEXT CHECK(source_type IN ('news_article', 'academic_paper', 'court_document',
                                           'video', 'audio', 'social_media', 'government_doc', 'other')),
    synopsis TEXT,  -- User-provided summary

    -- Epistemic quality scores (0-1 scale)
    source_credibility FLOAT CHECK(source_credibility BETWEEN 0 AND 1),
    verification_level FLOAT CHECK(verification_level BETWEEN 0 AND 1),
    evidence_type_weight FLOAT CHECK(evidence_type_weight BETWEEN 0 AND 1),
    curator_reputation FLOAT CHECK(curator_reputation BETWEEN 0 AND 1),
    novelty_score FLOAT CHECK(novelty_score BETWEEN 0 AND 1),
    clarity_contribution FLOAT,  -- ΔClarity (can be negative)
    truth_alignment_score FLOAT CHECK(truth_alignment_score BETWEEN 0 AND 1),  -- After resolution
    redundancy_penalty FLOAT DEFAULT 0.0,
    misinformation_penalty FLOAT DEFAULT 0.0,

    -- Final epistemic value (product of all factors)
    epistemic_value FLOAT CHECK(epistemic_value BETWEEN 0 AND 1),

    -- Payouts
    estimated_payout INTEGER,  -- Before resolution
    actual_payout INTEGER,     -- After resolution

    -- Flags
    is_flagged_misinfo BOOLEAN DEFAULT FALSE,
    is_fork_trigger BOOLEAN DEFAULT FALSE,  -- Evidence that triggered hypothesis fork
    llm_analyzed BOOLEAN DEFAULT FALSE,

    -- Metadata
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    analyzed_at TIMESTAMP
);

CREATE INDEX idx_evidence_quest_id ON evidence_submissions(quest_id);
CREATE INDEX idx_evidence_submitted_by ON evidence_submissions(submitted_by);
CREATE INDEX idx_evidence_epistemic_value ON evidence_submissions(epistemic_value DESC);
CREATE INDEX idx_evidence_submitted_at ON evidence_submissions(submitted_at DESC);

-- ============================================================================
-- COMMUNITY INTERACTIONS
-- ============================================================================

CREATE TABLE comments (
    id TEXT PRIMARY KEY,
    evidence_id TEXT REFERENCES evidence_submissions(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id),
    parent_comment_id TEXT REFERENCES comments(id),  -- For threading

    text TEXT NOT NULL,
    reaction_type TEXT CHECK(reaction_type IN ('support', 'refute', 'question', 'neutral')),

    -- Voting
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    vote_score INTEGER DEFAULT 0,  -- upvotes - downvotes

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_comments_evidence_id ON comments(evidence_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_comment_id);
CREATE INDEX idx_comments_vote_score ON comments(vote_score DESC);

CREATE TABLE votes (
    id TEXT PRIMARY KEY,
    target_id TEXT NOT NULL,  -- evidence_id or comment_id
    target_type TEXT NOT NULL CHECK(target_type IN ('evidence', 'comment')),
    user_id TEXT REFERENCES users(id),
    vote_type TEXT NOT NULL CHECK(vote_type IN ('up', 'down')),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(target_id, user_id)
);

CREATE INDEX idx_votes_target ON votes(target_id, target_type);
CREATE INDEX idx_votes_user_id ON votes(user_id);

-- ============================================================================
-- POLLS
-- ============================================================================

CREATE TABLE polls (
    id TEXT PRIMARY KEY,
    concern_id TEXT REFERENCES concerns(id),
    question TEXT NOT NULL,

    -- Options stored as JSONB: [{"text": "Yes", "votes": 42}, {"text": "No", "votes": 38}]
    options JSONB NOT NULL,

    total_votes INTEGER DEFAULT 0,
    is_multiple_choice BOOLEAN DEFAULT FALSE,

    -- Quest escalation
    escalated_to_quest_id TEXT REFERENCES quests(id),
    escalation_threshold INTEGER DEFAULT 100,  -- Votes needed to suggest escalation

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'closed', 'escalated'))
);

CREATE INDEX idx_polls_concern_id ON polls(concern_id);
CREATE INDEX idx_polls_status ON polls(status);

CREATE TABLE poll_votes (
    id TEXT PRIMARY KEY,
    poll_id TEXT REFERENCES polls(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id),
    option_index INTEGER NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(poll_id, user_id)  -- One vote per user per poll
);

CREATE INDEX idx_poll_votes_poll_id ON poll_votes(poll_id);
CREATE INDEX idx_poll_votes_user_id ON poll_votes(user_id);

-- ============================================================================
-- CREDITS & TRANSACTIONS
-- ============================================================================

CREATE TABLE credit_transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),

    amount INTEGER NOT NULL,  -- Can be negative for spending
    balance_after INTEGER NOT NULL,

    reason TEXT NOT NULL CHECK(reason IN ('evidence_reward', 'quest_payout', 'comment_upvote',
                                         'bounty_contribution', 'accuracy_bonus', 'referral',
                                         'purchase', 'withdrawal', 'admin_adjustment')),

    -- References
    reference_id TEXT,  -- quest_id, evidence_id, etc.
    reference_type TEXT,  -- 'quest', 'evidence', etc.

    description TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_created_at ON credit_transactions(created_at DESC);
CREATE INDEX idx_credit_transactions_reason ON credit_transactions(reason);

-- ============================================================================
-- PROBABILITY TRACKING (Time-series)
-- ============================================================================

CREATE TABLE probability_events (
    id TEXT PRIMARY KEY,
    quest_id TEXT REFERENCES quests(id) ON DELETE CASCADE,
    hypothesis_id TEXT REFERENCES hypotheses(id) ON DELETE CASCADE,

    probability_before FLOAT NOT NULL,
    probability_after FLOAT NOT NULL,

    trigger_type TEXT NOT NULL CHECK(trigger_type IN ('evidence_submitted', 'evidence_upvoted',
                                                      'hypothesis_added', 'manual_adjustment')),
    trigger_id TEXT,  -- evidence_id, etc.
    trigger_description TEXT,

    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_probability_events_quest_id ON probability_events(quest_id);
CREATE INDEX idx_probability_events_hypothesis_id ON probability_events(hypothesis_id);
CREATE INDEX idx_probability_events_timestamp ON probability_events(timestamp);

-- ============================================================================
-- HYPOTHESIS FORKS (When quests split into more specific questions)
-- ============================================================================

CREATE TABLE hypothesis_forks (
    id TEXT PRIMARY KEY,
    quest_id TEXT REFERENCES quests(id),
    evidence_id TEXT REFERENCES evidence_submissions(id),  -- Trigger evidence

    trigger_reason TEXT,  -- Why the fork happened
    forked_hypotheses JSONB,  -- Array of new hypotheses created

    forked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_hypothesis_forks_quest_id ON hypothesis_forks(quest_id);

-- ============================================================================
-- BADGES & ACHIEVEMENTS
-- ============================================================================

CREATE TABLE badges (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    icon_url TEXT,

    -- Requirements
    requirement_type TEXT CHECK(requirement_type IN ('evidence_count', 'reputation_level',
                                                     'accuracy_rate', 'quest_wins', 'special')),
    requirement_value FLOAT,

    rarity TEXT CHECK(rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary'))
);

CREATE TABLE user_badges (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    badge_id TEXT REFERENCES badges(id),

    awarded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, badge_id)
);

CREATE INDEX idx_user_badges_user_id ON user_badges(user_id);

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- Top contributors by reputation
CREATE VIEW top_contributors AS
SELECT
    u.id,
    u.username,
    u.epistemic_reputation,
    u.total_credits,
    u.rank,
    u.evidence_submitted,
    u.accuracy_rate
FROM users u
WHERE u.is_active = TRUE
ORDER BY u.epistemic_reputation DESC;

-- Active quests with stats
CREATE VIEW active_quests_summary AS
SELECT
    q.id,
    q.title,
    q.total_bounty,
    q.evidence_count,
    q.participant_count,
    q.entropy,
    q.created_at,
    c.title AS concern_title,
    c.type AS concern_type
FROM quests q
LEFT JOIN concerns c ON q.concern_id = c.id
WHERE q.status = 'active'
ORDER BY q.total_bounty DESC;

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Update quest evidence count when evidence is submitted
CREATE OR REPLACE FUNCTION update_quest_evidence_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE quests
    SET evidence_count = evidence_count + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.quest_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_quest_evidence_count
AFTER INSERT ON evidence_submissions
FOR EACH ROW
EXECUTE FUNCTION update_quest_evidence_count();

-- Update user's total credits on transaction
CREATE OR REPLACE FUNCTION update_user_credits()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users
    SET total_credits = NEW.balance_after
    WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_credits
AFTER INSERT ON credit_transactions
FOR EACH ROW
EXECUTE FUNCTION update_user_credits();

-- ============================================================================
-- SAMPLE DATA (Optional, for testing)
-- ============================================================================

-- Insert sample users
INSERT INTO users (id, username, email, password_hash, epistemic_reputation, rank) VALUES
('user-alice', 'alice_chen', 'alice@example.com', 'hashed_password', 8.5, 'Expert'),
('user-bob', 'bob_investigator', 'bob@example.com', 'hashed_password', 9.2, 'Master'),
('user-carol', 'carol_reporter', 'carol@example.com', 'hashed_password', 7.9, 'Contributor');

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
