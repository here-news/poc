# Infrastructure Migration Guide

## Overview

We've migrated from local Docker PostgreSQL and Aura Neo4j to remote infrastructure accessed via Yggdrasil IPv6 network.

## Changes Made

### 1. Database Infrastructure

**Before:**
- Local PostgreSQL container (`phi_here_db`)
- Neo4j Aura cloud service

**After:**
- Remote PostgreSQL on Yggdrasil network
- Remote Neo4j on Yggdrasil network
- Environment-aware configuration (auto-detects dev vs production)

### 2. Connection Details

#### Development (Local)
- PostgreSQL: `200:d9ce:5252:7e25:c770:1715:a84e:ab3a:5432`
- Neo4j: `200:d9ce:5252:7e25:c770:1715:a84e:ab3a:7687`

#### Production (Same Server)
- PostgreSQL: `localhost:5432`
- Neo4j: `localhost:7687`

### 3. Environment Detection

The application now automatically detects the environment and adjusts connection strings:

```python
# config.py automatically constructs URLs based on ENVIRONMENT variable:
# - ENVIRONMENT=development → Uses IPv6 address
# - ENVIRONMENT=production → Uses localhost
```

## Configuration Files Modified

### 1. `.env`
- Added `ENVIRONMENT` variable (development/production)
- Replaced single DATABASE_URL with components: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- Replaced single NEO4J_URI with components: `NEO4J_HOST`, `NEO4J_BOLT_PORT`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`
- Auto-construction of connection strings via field validators

### 2. `config.py`
- Added `@field_validator` for `database_url` - auto-constructs based on environment
- Added `@field_validator` for `neo4j_uri` - auto-constructs based on environment
- IPv6 addresses automatically wrapped in brackets for URL construction

### 3. `docker-compose.yml`
- Removed PostgreSQL service (using external database)
- Removed `depends_on` and healthcheck dependencies
- Added comments documenting external service locations

## Deployment Instructions

### For Development (Local)

1. **Verify Yggdrasil Connection**
   ```bash
   ping6 200:d9ce:5252:7e25:c770:1715:a84e:ab3a
   ```

2. **Test PostgreSQL Connection**
   ```bash
   psql -h 200:d9ce:5252:7e25:c770:1715:a84e:ab3a -p 5432 -U phi_user -d phi_here
   ```

3. **Update `.env`**
   ```bash
   # Ensure ENVIRONMENT=development
   ENVIRONMENT=development
   ```

4. **Rebuild and Start**
   ```bash
   docker compose down
   docker compose up -d --build
   ```

### For Production (Remote Server)

1. **Copy Production Config**
   ```bash
   cp .env.production.example .env
   ```

2. **Update `.env`**
   ```bash
   # Set ENVIRONMENT to production
   ENVIRONMENT=production

   # Update OAuth redirect URI for production domain
   GOOGLE_REDIRECT_URI=https://here.news/api/auth/callback

   # Set secure JWT secret
   JWT_SECRET_KEY=$(openssl rand -hex 32)
   ```

3. **Verify Local Services**
   ```bash
   # Test PostgreSQL on localhost
   psql -h localhost -p 5432 -U phi_user -d phi_here

   # Test Neo4j on localhost
   cypher-shell -a bolt://localhost:7687 -u neo4j -p 'ITai3wrEOWoOwh3XKltIkS612HyAu1A2wa5Xwx2XUA8='
   ```

4. **Deploy**
   ```bash
   docker compose down
   docker compose up -d --build
   ```

## Database Schemas

The PostgreSQL database contains multiple schemas:

- `public` - Webapp tables (users, chat_sessions, comments, event_submissions)
- `web_pages` - UWPS: pages
- `tasks` - UWPS: extraction_tasks, rogue_tasks
- `entities` - UWPS: canonical_entities, entity_aliases
- `transactions` - UWPS: preservation_transactions

## Troubleshooting

### Connection Refused

**Development:**
```bash
# Check Yggdrasil connectivity
ping6 200:d9ce:5252:7e25:c770:1715:a84e:ab3a

# Verify firewall allows connections to ports 5432, 7687
```

**Production:**
```bash
# Check local services are running
systemctl status postgresql
systemctl status neo4j

# Verify ports are listening
netstat -tlnp | grep -E '5432|7687'
```

### Invalid Environment Configuration

```bash
# Check config is loaded correctly
docker compose exec app python -c "from app.config import get_settings; s = get_settings(); print(f'ENV: {s.environment}\\nDB: {s.database_url}\\nNeo4j: {s.neo4j_uri}')"
```

### Database Migration

If tables don't exist in remote database:

```bash
# The app will auto-create tables on startup via init_db() in connection.py
# Or manually run:
docker compose exec app python -c "import asyncio; from app.database.connection import init_db; asyncio.run(init_db())"
```

## Rollback Procedure

If you need to rollback to local PostgreSQL:

1. Restore `docker-compose.yml` from git
2. Restore `.env` DATABASE_URL to use `postgres:5432`
3. Run `docker compose up -d --build`

## Security Notes

- Yggdrasil IPv6 addresses are only accessible within the Yggdrasil network
- Production uses localhost for minimal latency and maximum security
- Database passwords should be rotated in production
- JWT secret must be unique and secure in production
