# Epistemic App Architecture

## Overview
Modular FastAPI application for epistemological truth-seeking with user authentication and timeline management.

## Module Structure

```
epistemic/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app entry point
│   ├── config.py               # Configuration management
│   ├── beacon.py               # Gateway registration
│   ├── auth/                   # Authentication module
│   │   ├── __init__.py
│   │   ├── google_oauth.py     # Google OAuth implementation
│   │   ├── session.py          # Session management
│   │   └── middleware.py       # Auth middleware
│   ├── models/                 # Data models
│   │   ├── __init__.py
│   │   ├── user.py             # User model
│   │   ├── concern.py          # Concern/timeline entry model
│   │   └── quest.py            # Quest model
│   ├── routers/                # API route handlers
│   │   ├── __init__.py
│   │   ├── auth.py             # Auth endpoints (/api/auth/*)
│   │   ├── timeline.py         # Timeline endpoints (/api/timeline/*)
│   │   ├── concerns.py         # Concerns endpoints (/api/concerns/*)
│   │   └── quests.py           # Quests endpoints (/api/quests/*)
│   ├── services/               # Business logic
│   │   ├── __init__.py
│   │   ├── user_service.py     # User management logic
│   │   └── timeline_service.py # Timeline management logic
│   └── database/               # Database layer
│       ├── __init__.py
│       ├── connection.py       # DB connection management
│       └── repositories/       # Data access layer
│           ├── __init__.py
│           ├── user_repo.py
│           └── timeline_repo.py
├── requirements.txt
├── mockup.html
└── mockup-data.json
```

## Technology Stack

### Authentication
- **Google OAuth 2.0** via `authlib` library
- Session management with JWT tokens
- Secure cookie-based sessions

### Database
- **SQLite** for development (easy setup, no external dependencies)
- Schema migrations ready for PostgreSQL in production
- SQLAlchemy ORM for database abstraction

### API Structure
- **RESTful API** following FastAPI best practices
- OpenAPI documentation auto-generated
- Pydantic models for request/response validation

## Authentication Flow

1. **Login**:
   - User clicks "Sign in with Google"
   - Redirect to Google OAuth consent screen
   - Google redirects back with authorization code
   - Backend exchanges code for user info
   - Create/update user in database
   - Issue JWT session token

2. **Session Management**:
   - JWT token stored in httpOnly cookie
   - Token includes user_id, email, exp timestamp
   - Middleware validates token on protected routes

3. **Logout**:
   - Clear session cookie
   - Optional: blacklist token (for production)

## API Endpoints

### Authentication
- `GET /api/auth/login` - Initiate Google OAuth flow
- `GET /api/auth/callback` - OAuth callback handler
- `GET /api/auth/logout` - Clear session
- `GET /api/auth/me` - Get current user info

### Timeline (User's Personal Feed)
- `GET /api/timeline` - Get user's timeline entries
- `POST /api/timeline` - Create new timeline entry
- `PUT /api/timeline/{id}` - Update timeline entry
- `DELETE /api/timeline/{id}` - Delete timeline entry

### Concerns (Public Feed)
- `GET /api/concerns` - List all concerns (public)
- `GET /api/concerns/{id}` - Get concern details
- `POST /api/concerns` - Create new concern (authenticated)

### Quests
- `GET /api/quests` - List all quests
- `GET /api/quests/{id}` - Get quest details

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    picture TEXT,
    google_id TEXT UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);
```

### Timeline Entries Table
```sql
CREATE TABLE timeline_entries (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    link TEXT,
    type TEXT, -- 'share', 'comment', 'evidence'
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Concerns Table (extends mockup data)
```sql
CREATE TABLE concerns (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT, -- 'entity-first', 'quest-first', 'hybrid'
    creator_id TEXT,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (creator_id) REFERENCES users(id)
);
```

## Configuration

Environment variables:
```bash
# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:7272/epistemic/api/auth/callback

# JWT
JWT_SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440

# Database
DATABASE_URL=sqlite:///./epistemic.db

# App
BASE_PATH=/epistemic
GATEWAY_URL=http://gateway:3000
```

## Implementation Phases

### Phase 1: Module Structure (Current)
- [x] Create modular directory structure
- [ ] Set up configuration management
- [ ] Create base models with Pydantic

### Phase 2: Google OAuth Setup
- [ ] Configure Google Cloud Console project
- [ ] Set up OAuth credentials
- [ ] Implement OAuth flow
- [ ] Add session management

### Phase 3: Database Layer
- [ ] Set up SQLite database
- [ ] Create SQLAlchemy models
- [ ] Implement repositories
- [ ] Add database migrations

### Phase 4: User Timeline API
- [ ] Implement timeline POST endpoint
- [ ] Add timeline GET endpoint
- [ ] Connect to frontend

### Phase 5: Frontend Integration
- [ ] Add login button and user menu
- [ ] Connect personal share box to API
- [ ] Show user's timeline history
- [ ] Handle authentication states

## Security Considerations

1. **HTTPS Required**: OAuth requires HTTPS in production
2. **CSRF Protection**: Use state parameter in OAuth flow
3. **Token Security**: httpOnly cookies, secure flag in production
4. **Input Validation**: Pydantic models validate all inputs
5. **SQL Injection**: SQLAlchemy ORM prevents SQL injection
6. **Rate Limiting**: Consider adding rate limits to POST endpoints
