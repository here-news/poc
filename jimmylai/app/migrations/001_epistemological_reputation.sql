-- Migration: Epistemological Reputation & Value Attribution Framework
-- Author: Claude
-- Date: 2025-11-07
-- Description: Adds evidence quality tracking, misinformation flagging, user reputation, and bounty distribution

-- ============================================================================
-- STEP 1: Enhance evidence_submissions table with quality metrics
-- ============================================================================

-- Source quality metrics
ALTER TABLE evidence_submissions ADD COLUMN source_credibility REAL DEFAULT 0.5;
ALTER TABLE evidence_submissions ADD COLUMN verification_level REAL DEFAULT 0.5;
ALTER TABLE evidence_submissions ADD COLUMN evidence_type_weight REAL DEFAULT 0.5;

-- Temporal relevance
ALTER TABLE evidence_submissions ADD COLUMN temporal_proximity REAL DEFAULT 0.5;
ALTER TABLE evidence_submissions ADD COLUMN temporal_context TEXT DEFAULT 'post_event';

-- Truth alignment (calculated after quest convergence)
ALTER TABLE evidence_submissions ADD COLUMN truth_alignment_score REAL DEFAULT 0.0;
ALTER TABLE evidence_submissions ADD COLUMN path_criticality REAL DEFAULT 0.0;
ALTER TABLE evidence_submissions ADD COLUMN redundancy_penalty REAL DEFAULT 0.0;

-- Final epistemic value (used for bounty distribution)
ALTER TABLE evidence_submissions ADD COLUMN epistemic_value REAL DEFAULT 0.0;

-- Misinformation tracking
ALTER TABLE evidence_submissions ADD COLUMN is_flagged_misinfo BOOLEAN DEFAULT FALSE;
ALTER TABLE evidence_submissions ADD COLUMN misinfo_multiplier REAL DEFAULT 1.0;

-- Retroactive quality adjustment
ALTER TABLE evidence_submissions ADD COLUMN quality_override TEXT;  -- 'confirmed', 'contradicted', etc.
ALTER TABLE evidence_submissions ADD COLUMN quality_override_reason TEXT;
ALTER TABLE evidence_submissions ADD COLUMN quality_override_at TEXT;

-- ============================================================================
-- STEP 2: Evidence flagging system
-- ============================================================================

CREATE TABLE IF NOT EXISTS evidence_flags (
    id TEXT PRIMARY KEY,
    evidence_id TEXT NOT NULL,
    quest_id TEXT NOT NULL,

    -- Who flagged
    flagged_by TEXT NOT NULL,
    flag_type TEXT NOT NULL,  -- 'unverified', 'contradicted', 'ai_hallucination', 'spam'
    flag_reason TEXT,
    supporting_evidence_ids TEXT,  -- JSON array of evidence that contradicts this
    flagged_at TEXT NOT NULL,

    -- Resolution
    resolution_status TEXT DEFAULT 'pending',  -- 'pending', 'confirmed_misinfo', 'cleared', 'disputed'
    resolved_by TEXT,  -- 'community_vote', 'expert', 'later_evidence', 'system'
    resolved_at TEXT,
    resolution_note TEXT,

    -- Community voting on flag
    votes_confirm INTEGER DEFAULT 0,
    votes_reject INTEGER DEFAULT 0,

    -- Impact
    evidence_multiplier REAL DEFAULT 0.0,  -- 0.0 = completely excluded
    bounty_eligibility BOOLEAN DEFAULT TRUE,

    FOREIGN KEY (evidence_id) REFERENCES evidence_submissions(id),
    FOREIGN KEY (quest_id) REFERENCES quests(id)
);

CREATE INDEX idx_evidence_flags_evidence ON evidence_flags(evidence_id);
CREATE INDEX idx_evidence_flags_status ON evidence_flags(resolution_status);

-- ============================================================================
-- STEP 3: User reputation system
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_reputation (
    user_id TEXT PRIMARY KEY,

    -- Submission track record
    total_submissions INTEGER DEFAULT 0,
    verified_accurate INTEGER DEFAULT 0,
    flagged_misinfo INTEGER DEFAULT 0,
    challenged_but_cleared INTEGER DEFAULT 0,

    -- Quality metrics
    accuracy_rate REAL DEFAULT 1.0,  -- verified_accurate / total_submissions
    credibility_score REAL DEFAULT 0.5,  -- Weighted by evidence quality
    average_epistemic_value REAL DEFAULT 0.0,

    -- Expertise
    expertise_domains TEXT,  -- JSON array like ["politics", "china", "journalism"]
    specialization_score REAL DEFAULT 0.0,

    -- Reputation tier
    tier TEXT DEFAULT 'novice',  -- 'novice', 'contributor', 'trusted', 'expert', 'authority'
    tier_multiplier REAL DEFAULT 1.0,  -- Affects bounty share

    -- Historical performance
    total_bounty_earned REAL DEFAULT 0.0,
    total_quests_participated INTEGER DEFAULT 0,
    convergence_contribution_rate REAL DEFAULT 0.0,  -- % of winning hypotheses they supported

    -- Social trust
    endorsed_by_experts TEXT,  -- JSON array of expert user_ids
    endorsement_count INTEGER DEFAULT 0,

    -- Metadata
    first_submission_at TEXT,
    last_submission_at TEXT,
    last_updated TEXT,

    -- Flags & penalties
    is_suspended BOOLEAN DEFAULT FALSE,
    suspension_reason TEXT,
    suspension_until TEXT
);

CREATE INDEX idx_user_reputation_tier ON user_reputation(tier);
CREATE INDEX idx_user_reputation_credibility ON user_reputation(credibility_score DESC);

-- ============================================================================
-- STEP 4: Reputation event history (audit trail)
-- ============================================================================

CREATE TABLE IF NOT EXISTS reputation_events (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    quest_id TEXT,
    evidence_id TEXT,

    -- Event details
    event_type TEXT NOT NULL,  -- 'evidence_submitted', 'evidence_validated', 'flagged_misinfo',
                                -- 'tier_upgrade', 'retroactive_downgrade', 'expert_endorsement'
    old_value REAL,
    new_value REAL,
    delta REAL,

    -- Context
    reason TEXT,
    triggered_by TEXT,  -- user_id or 'system'
    metadata TEXT,  -- JSON with additional context

    timestamp TEXT NOT NULL,

    FOREIGN KEY (user_id) REFERENCES user_reputation(user_id),
    FOREIGN KEY (quest_id) REFERENCES quests(id),
    FOREIGN KEY (evidence_id) REFERENCES evidence_submissions(id)
);

CREATE INDEX idx_reputation_events_user ON reputation_events(user_id);
CREATE INDEX idx_reputation_events_type ON reputation_events(event_type);
CREATE INDEX idx_reputation_events_timestamp ON reputation_events(timestamp DESC);

-- ============================================================================
-- STEP 5: Bounty distribution (axiological surface payout)
-- ============================================================================

CREATE TABLE IF NOT EXISTS bounty_payouts (
    id TEXT PRIMARY KEY,
    quest_id TEXT NOT NULL,
    user_id TEXT NOT NULL,

    -- Evidence contributions
    evidence_ids TEXT NOT NULL,  -- JSON array of evidence_id
    evidence_count INTEGER DEFAULT 0,

    -- Value calculation
    total_epistemic_value REAL NOT NULL,  -- Sum of epistemic_value for all evidence
    value_share_percent REAL NOT NULL,    -- Percentage of total quest value
    user_tier_multiplier REAL DEFAULT 1.0,

    -- Payout amounts
    base_payout REAL NOT NULL,
    tier_bonus REAL DEFAULT 0.0,
    total_payout REAL NOT NULL,

    -- Quest context
    quest_total_bounty REAL NOT NULL,
    quest_platform_fee REAL NOT NULL,

    -- Status
    calculated_at TEXT NOT NULL,
    paid_at TEXT,
    payment_status TEXT DEFAULT 'pending',  -- 'pending', 'paid', 'disputed', 'withheld'
    payment_txid TEXT,

    -- Breakdown (for transparency)
    calculation_breakdown TEXT,  -- JSON with detailed calculation

    FOREIGN KEY (quest_id) REFERENCES quests(id),
    FOREIGN KEY (user_id) REFERENCES user_reputation(user_id)
);

CREATE INDEX idx_bounty_payouts_quest ON bounty_payouts(quest_id);
CREATE INDEX idx_bounty_payouts_user ON bounty_payouts(user_id);
CREATE INDEX idx_bounty_payouts_status ON bounty_payouts(payment_status);

-- ============================================================================
-- STEP 6: Community verification votes
-- ============================================================================

CREATE TABLE IF NOT EXISTS verification_votes (
    id TEXT PRIMARY KEY,
    evidence_id TEXT NOT NULL,
    voter_user_id TEXT NOT NULL,

    -- Vote type
    vote_type TEXT NOT NULL,  -- 'upvote', 'downvote', 'flag_misinfo', 'validate_quality'
    vote_weight REAL DEFAULT 1.0,  -- Based on voter's reputation

    -- Justification
    comment TEXT,
    supporting_sources TEXT,  -- JSON array of URLs

    voted_at TEXT NOT NULL,

    -- Prevent duplicate votes
    UNIQUE(evidence_id, voter_user_id, vote_type),

    FOREIGN KEY (evidence_id) REFERENCES evidence_submissions(id),
    FOREIGN KEY (voter_user_id) REFERENCES user_reputation(user_id)
);

CREATE INDEX idx_verification_votes_evidence ON verification_votes(evidence_id);
CREATE INDEX idx_verification_votes_voter ON verification_votes(voter_user_id);

-- ============================================================================
-- STEP 7: Source credibility registry
-- ============================================================================

CREATE TABLE IF NOT EXISTS source_credibility_registry (
    id TEXT PRIMARY KEY,

    -- Source identification
    source_name TEXT NOT NULL UNIQUE,  -- 'Reuters', 'Associated Press', 'random-x-user'
    source_domain TEXT,  -- 'reuters.com', 'twitter.com'
    source_type TEXT NOT NULL,  -- 'wire_service', 'newspaper', 'social_media', 'government'

    -- Credibility metrics
    base_credibility REAL NOT NULL,  -- 0.0 - 1.0
    verification_level REAL NOT NULL,  -- 0.0 - 1.0
    evidence_type_weight REAL NOT NULL,  -- 0.0 - 1.0

    -- Performance tracking
    historical_accuracy_rate REAL DEFAULT 0.5,
    times_cited INTEGER DEFAULT 0,
    times_contradicted INTEGER DEFAULT 0,

    -- Metadata
    description TEXT,
    added_by TEXT DEFAULT 'system',
    added_at TEXT,
    last_updated TEXT,

    -- Status
    is_verified BOOLEAN DEFAULT FALSE,
    is_blacklisted BOOLEAN DEFAULT FALSE,
    blacklist_reason TEXT
);

CREATE INDEX idx_source_credibility_type ON source_credibility_registry(source_type);
CREATE INDEX idx_source_credibility_score ON source_credibility_registry(base_credibility DESC);

-- ============================================================================
-- STEP 8: Axiological surface snapshots (for each quest)
-- ============================================================================

CREATE TABLE IF NOT EXISTS axiological_surface (
    id TEXT PRIMARY KEY,
    quest_id TEXT NOT NULL,

    -- Snapshot metadata
    snapshot_at TEXT NOT NULL,
    quest_status TEXT NOT NULL,  -- 'active', 'converged'
    winning_hypothesis_id TEXT,

    -- Aggregate metrics
    total_evidence_count INTEGER DEFAULT 0,
    verified_evidence_count INTEGER DEFAULT 0,
    flagged_misinfo_count INTEGER DEFAULT 0,
    total_epistemic_value REAL DEFAULT 0.0,

    -- Distribution stats
    gini_coefficient REAL,  -- Inequality of value distribution
    top_contributor_share REAL,  -- % of value from top contributor
    avg_epistemic_value REAL,

    -- Evidence ranking
    evidence_rankings TEXT,  -- JSON array of {evidence_id, rank, epistemic_value}

    FOREIGN KEY (quest_id) REFERENCES quests(id)
);

CREATE INDEX idx_axiological_surface_quest ON axiological_surface(quest_id);

-- ============================================================================
-- STEP 9: Initial data - Source credibility tiers
-- ============================================================================

INSERT OR IGNORE INTO source_credibility_registry (id, source_name, source_type, base_credibility, verification_level, evidence_type_weight, added_at) VALUES
    ('src-reuters', 'Reuters', 'wire_service', 0.90, 0.95, 0.85, CURRENT_TIMESTAMP),
    ('src-ap', 'Associated Press', 'wire_service', 0.90, 0.95, 0.85, CURRENT_TIMESTAMP),
    ('src-afp', 'AFP', 'wire_service', 0.90, 0.95, 0.85, CURRENT_TIMESTAMP),
    ('src-nyt', 'New York Times', 'major_newspaper', 0.85, 0.90, 0.80, CURRENT_TIMESTAMP),
    ('src-wapo', 'Washington Post', 'major_newspaper', 0.85, 0.90, 0.80, CURRENT_TIMESTAMP),
    ('src-wsj', 'Wall Street Journal', 'major_newspaper', 0.85, 0.90, 0.80, CURRENT_TIMESTAMP),
    ('src-verified-video', 'Verified Video', 'primary_source', 0.90, 1.0, 0.90, CURRENT_TIMESTAMP),
    ('src-government-official', 'Government Official', 'official_statement', 0.95, 0.90, 0.85, CURRENT_TIMESTAMP),
    ('src-credentialed-journalist', 'Credentialed Journalist', 'professional', 0.75, 0.75, 0.70, CURRENT_TIMESTAMP),
    ('src-transcript', 'Transcript Extraction', 'secondary_analysis', 0.60, 0.70, 0.60, CURRENT_TIMESTAMP),
    ('src-verified-social', 'Verified Social Media', 'social_media', 0.55, 0.50, 0.50, CURRENT_TIMESTAMP),
    ('src-anonymous-social', 'Anonymous Social Media', 'social_media', 0.25, 0.20, 0.20, CURRENT_TIMESTAMP),
    ('src-ai-generated', 'AI Generated Content', 'synthetic', 0.15, 0.10, 0.10, CURRENT_TIMESTAMP);

COMMIT;
