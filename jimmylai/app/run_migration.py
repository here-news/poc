#!/usr/bin/env python3
"""
Run database migration for epistemological reputation framework
"""
import sqlite3
from pathlib import Path
import sys

# Add app to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app import database as db

def run_migration():
    """Apply migration 001_epistemological_reputation.sql"""

    migration_file = Path(__file__).parent / "migrations" / "001_epistemological_reputation.sql"

    if not migration_file.exists():
        print(f"❌ Migration file not found: {migration_file}")
        return False

    print(f"📋 Reading migration from {migration_file}")
    with open(migration_file, 'r') as f:
        migration_sql = f.read()

    # Split into individual statements, handling multi-line properly
    statements = []
    current_statement = []

    for line in migration_sql.split('\n'):
        line = line.strip()

        # Skip comment lines
        if line.startswith('--') or not line:
            continue

        current_statement.append(line)

        # End of statement
        if line.endswith(';'):
            stmt = ' '.join(current_statement).strip()
            if stmt and stmt != 'COMMIT;':
                statements.append(stmt[:-1])  # Remove trailing semicolon
            current_statement = []

    conn = db.get_connection()
    cursor = conn.cursor()

    print(f"🔧 Applying {len(statements)} SQL statements...\n")

    success_count = 0
    error_count = 0

    for i, statement in enumerate(statements, 1):
        try:
            cursor.execute(statement)
            success_count += 1

            # Extract table name for feedback
            if 'CREATE TABLE' in statement.upper():
                table_name = statement.split('CREATE TABLE')[1].split('(')[0].strip().replace('IF NOT EXISTS', '').strip()
                print(f"✅ Created table: {table_name}")
            elif 'ALTER TABLE' in statement.upper():
                parts = statement.split('ALTER TABLE')[1].split('ADD COLUMN')
                if len(parts) > 1:
                    table_name = parts[0].strip()
                    column = parts[1].split()[0].strip()
                    print(f"✅ Added column {column} to {table_name}")
            elif 'INSERT' in statement.upper():
                if success_count % 5 == 0:  # Only show every 5th insert
                    print(f"✅ Inserted initial data ({success_count} statements)")

        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
                # Column or table already exists, skip
                pass
            else:
                print(f"⚠️  Statement {i}: {e}")
                error_count += 1
        except Exception as e:
            print(f"❌ Error in statement {i}: {e}")
            print(f"   Statement: {statement[:100]}...")
            error_count += 1

    conn.commit()
    conn.close()

    print(f"\n{'='*60}")
    print(f"Migration Complete!")
    print(f"✅ Successful: {success_count}")
    if error_count > 0:
        print(f"⚠️  Errors: {error_count}")
    print(f"{'='*60}\n")

    # Verify new tables exist
    verify_tables()

    return error_count == 0

def verify_tables():
    """Verify that new tables were created"""
    print("🔍 Verifying new tables...\n")

    expected_tables = [
        'evidence_flags',
        'user_reputation',
        'reputation_events',
        'bounty_payouts',
        'verification_votes',
        'source_credibility_registry',
        'axiological_surface'
    ]

    conn = db.get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    existing_tables = [row[0] for row in cursor.fetchall()]

    for table in expected_tables:
        if table in existing_tables:
            # Count rows
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            print(f"✅ {table} (rows: {count})")
        else:
            print(f"❌ {table} - NOT FOUND")

    # Check new columns in evidence_submissions
    print(f"\n🔍 Verifying new columns in evidence_submissions...\n")

    cursor.execute("PRAGMA table_info(evidence_submissions)")
    columns = [row[1] for row in cursor.fetchall()]

    expected_columns = [
        'source_credibility',
        'verification_level',
        'evidence_type_weight',
        'temporal_proximity',
        'epistemic_value',
        'is_flagged_misinfo'
    ]

    for col in expected_columns:
        if col in columns:
            print(f"✅ {col}")
        else:
            print(f"❌ {col} - NOT FOUND")

    conn.close()

if __name__ == "__main__":
    print("\n" + "="*60)
    print("DATABASE MIGRATION: Epistemological Reputation Framework")
    print("="*60 + "\n")

    success = run_migration()

    if success:
        print("\n🎉 Migration completed successfully!")
    else:
        print("\n⚠️  Migration completed with some errors")

    sys.exit(0 if success else 1)
