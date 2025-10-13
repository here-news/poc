# Diagnostic Scripts

Utility scripts for checking data coverage and entity status in the webapp.

## Scripts

### check_data_coverage.py
Checks data completeness across recent stories:
- Artifacts with/without domains
- Entities with/without Wikidata thumbnails
- Organizations with/without context metadata (role, domain)

**Usage**: `python3 scripts/check_data_coverage.py`

**Requirements**: Webapp must be running on localhost:7272

### check_entity_status.py
Checks which entities from story markup exist in Neo4j:
- Identifies entities present in markup but missing from database
- Shows metadata coverage (thumbnails, QIDs, context) for existing entities

**Usage**: `python3 scripts/check_entity_status.py`

**Requirements**: Webapp must be running on localhost:7272

### find_missing_media_outlets.py
Scans stories for media outlet entities that need to be created:
- Finds domain-like entities in markup (e.g., `[[litera.hu]]`)
- Checks which exist as Organization entities in Neo4j
- Identifies which need to be created with proper media outlet metadata

**Usage**: `python3 scripts/find_missing_media_outlets.py`

**Requirements**: Webapp must be running on localhost:7272

## Notes

- All scripts use Python 3 standard library (no additional dependencies)
- Scripts are read-only and do not modify data
- Hardcoded to localhost:7272 - update URLs for other environments
