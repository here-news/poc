#!/usr/bin/env python3
"""
Simple migration - just add the essential tables/columns we need now
"""
import sqlite3
import sys

sys.path.insert(0, '/app')
from app import database as db

def run_migration():
    conn = db.get_connection()
    cursor = conn.cursor()

    print("🔧 Applying essential migration...\n")

    # Step 1: Add columns to evidence_submissions
    columns_to_add = [
        ("source_credibility", "REAL DEFAULT 0.5"),
        ("verification_level", "REAL DEFAULT 0.5"),
        ("evidence_type_weight", "REAL DEFAULT 0.5"),
        ("temporal_proximity", "REAL DEFAULT 0.5"),
        ("epistemic_value", "REAL DEFAULT 0.0"),
        ("is_flagged_misinfo", "BOOLEAN DEFAULT FALSE"),
        ("truth_alignment_score", "REAL DEFAULT 0.0"),
    ]

    for col_name, col_type in columns_to_add:
        try:
            cursor.execute(f"ALTER TABLE evidence_submissions ADD COLUMN {col_name} {col_type}")
            print(f"✅ Added column: {col_name}")
        except sqlite3.OperationalError as e:
            if "duplicate column" in str(e).lower():
                print(f"⏭️  Column already exists: {col_name}")
            else:
                print(f"❌ Error adding {col_name}: {e}")

    # Step 2: Create source_credibility_registry table
    try:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS source_credibility_registry (
                id TEXT PRIMARY KEY,
                source_name TEXT NOT NULL UNIQUE,
                source_domain TEXT,
                source_type TEXT NOT NULL,
                base_credibility REAL NOT NULL,
                verification_level REAL NOT NULL,
                evidence_type_weight REAL NOT NULL,
                historical_accuracy_rate REAL DEFAULT 0.5,
                times_cited INTEGER DEFAULT 0,
                times_contradicted INTEGER DEFAULT 0,
                description TEXT,
                added_by TEXT DEFAULT 'system',
                added_at TEXT,
                last_updated TEXT,
                is_verified BOOLEAN DEFAULT FALSE,
                is_blacklisted BOOLEAN DEFAULT FALSE,
                blacklist_reason TEXT
            )
        """)
        print("✅ Created table: source_credibility_registry")
    except Exception as e:
        print(f"❌ Error creating source_credibility_registry: {e}")

    # Step 3: Insert initial source credibility data
    try:
        cursor.executemany("""
            INSERT OR IGNORE INTO source_credibility_registry
            (id, source_name, source_type, base_credibility, verification_level, evidence_type_weight, added_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        """, [
            ('src-reuters', 'Reuters', 'wire_service', 0.90, 0.95, 0.85),
            ('src-ap', 'Associated Press', 'wire_service', 0.90, 0.95, 0.85),
            ('src-verified-video', 'Verified Video', 'primary_source', 0.90, 1.0, 0.90),
            ('src-government', 'Government Official', 'official_statement', 0.95, 0.90, 0.85),
            ('src-journalist', 'Credentialed Journalist', 'professional', 0.75, 0.75, 0.70),
            ('src-social', 'Anonymous Social Media', 'social_media', 0.25, 0.20, 0.20),
        ])
        print("✅ Inserted source credibility data")
    except Exception as e:
        print(f"⚠️  Error inserting data: {e}")

    # Step 4: Create bounty_payouts table
    try:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS bounty_payouts (
                id TEXT PRIMARY KEY,
                quest_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                evidence_ids TEXT NOT NULL,
                evidence_count INTEGER DEFAULT 0,
                total_epistemic_value REAL NOT NULL,
                value_share_percent REAL NOT NULL,
                user_tier_multiplier REAL DEFAULT 1.0,
                base_payout REAL NOT NULL,
                tier_bonus REAL DEFAULT 0.0,
                total_payout REAL NOT NULL,
                quest_total_bounty REAL NOT NULL,
                calculated_at TEXT NOT NULL,
                paid_at TEXT,
                payment_status TEXT DEFAULT 'pending',
                calculation_breakdown TEXT,
                FOREIGN KEY (quest_id) REFERENCES quests(id)
            )
        """)
        print("✅ Created table: bounty_payouts")
    except Exception as e:
        print(f"❌ Error creating bounty_payouts: {e}")

    conn.commit()
    conn.close()

    print("\n✅ Migration complete!")

if __name__ == "__main__":
    run_migration()
