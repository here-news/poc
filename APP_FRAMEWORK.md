# App Framework for Experimental Apps

## Overview

This framework allows experimental apps to self-register with the gateway and appear in the switcher automatically, without modifying configurations.

## Architecture

### 1. App Metadata (`app.json`)

Each app should include an `app.json` file in its root directory:

```json
{
  "id": "myapp",
  "name": "My Experimental App",
  "version": "1.0.0",
  "description": "Brief description of what this app does",
  "status": "active",
  "icon": "🔬",
  "routes": {
    "base": "/myapp",
    "app": "/myapp/app",
    "api": "/myapp/api"
  }
}
```

**Status values:**
- `active` - App is running and should appear in switcher
- `development` - App is in development, may be unstable
- `archived` - App is archived, won't appear in switcher

### 2. Beacon System

Apps send heartbeat signals to the gateway to indicate they're alive:

**Registration (on startup):**
```bash
POST http://gateway:3000/api/apps/register
Content-Type: application/json

{
  "id": "myapp",
  "name": "My App",
  "version": "1.0.0",
  "description": "What it does",
  "status": "active",
  "icon": "🔬",
  "routes": {...}
}
```

**Heartbeat (every 30 seconds):**
```bash
POST http://gateway:3000/api/apps/heartbeat
Content-Type: application/json

{
  "id": "myapp"
}
```

**Query active apps:**
```bash
GET http://gateway:3000/api/apps/active
```

Returns apps that have sent heartbeat within last 60 seconds.

### 3. App Template Structure

Based on `mini/`, apps should follow this structure:

```
myapp/
├── app/                 # Backend Python code
│   ├── main.py         # FastAPI application
│   ├── beacon.py       # Beacon client (copy from template)
│   └── ...
├── frontend/           # Frontend React/Vite app (optional)
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
├── Dockerfile          # Multi-stage build
├── docker-compose.yml  # Service definition
├── app.json           # App metadata
├── requirements.txt    # Python dependencies
└── README.md          # Documentation
```

### 4. Beacon Client Template

Create `app/beacon.py`:

```python
import httpx
import asyncio
import json
from pathlib import Path

class BeaconClient:
    def __init__(self, gateway_url="http://gateway:3000"):
        self.gateway_url = gateway_url
        self.app_metadata = self.load_metadata()
        self.running = False

    def load_metadata(self):
        """Load app.json metadata"""
        app_json_path = Path(__file__).parent.parent / "app.json"
        if app_json_path.exists():
            with open(app_json_path) as f:
                return json.load(f)
        raise FileNotFoundError("app.json not found")

    async def register(self):
        """Register app with gateway"""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.gateway_url}/api/apps/register",
                    json=self.app_metadata,
                    timeout=5.0
                )
                print(f"✓ Registered with gateway: {response.json()}")
            except Exception as e:
                print(f"✗ Failed to register: {e}")

    async def heartbeat_loop(self):
        """Send periodic heartbeats"""
        self.running = True
        while self.running:
            await asyncio.sleep(30)  # Every 30 seconds
            async with httpx.AsyncClient() as client:
                try:
                    await client.post(
                        f"{self.gateway_url}/api/apps/heartbeat",
                        json={"id": self.app_metadata["id"]},
                        timeout=5.0
                    )
                    print(f"♥ Heartbeat sent")
                except Exception as e:
                    print(f"✗ Heartbeat failed: {e}")

    async def start(self):
        """Start beacon service"""
        await self.register()
        asyncio.create_task(self.heartbeat_loop())

    def stop(self):
        """Stop beacon service"""
        self.running = False
```

### 5. Integrating Beacon in FastAPI

In your `app/main.py`:

```python
from fastapi import FastAPI
from contextlib import asynccontextmanager
from .beacon import BeaconClient

beacon = BeaconClient()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await beacon.start()
    yield
    # Shutdown
    beacon.stop()

app = FastAPI(lifespan=lifespan)

@app.get("/health")
async def health():
    return {"status": "healthy"}

# Your other routes...
```

### 6. Nginx Configuration

Add a generic location block in nginx.conf for all apps:

```nginx
# Dynamic app routing (catch-all for registered apps)
location ~ ^/([a-z0-9-]+)/ {
    set $app_name $1;
    proxy_pass http://$app_name:8000/;
    proxy_http_version 1.1;

    # WebSocket support
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;

    # Forward headers
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    proxy_buffering off;
}
```

### 7. Docker Compose Template

```yaml
version: '3.8'

services:
  myapp:
    build: .
    container_name: myapp
    ports:
      - "8000"  # Internal port, nginx will route
    environment:
      - GATEWAY_URL=http://gateway:3000
    networks:
      - apps_default
    restart: unless-stopped

networks:
  apps_default:
    external: true
```

### 8. Repository Management

**Single Repository Structure (Recommended):**
```
re_news/
├── apps/
│   ├── gateway/        # Gateway service
│   ├── storychat/      # Production app
│   ├── jimmylai/       # Production app
│   ├── experiments/    # Experimental apps
│   │   ├── myapp/
│   │   ├── another-app/
│   │   └── template/   # Copy this to start new app
│   ├── archived/       # Archived apps
│   │   └── old-experiment/
│   ├── docker-compose.yml
│   └── nginx.conf
└── docs/
```

**Benefits:**
- Single source of truth
- Shared infrastructure (nginx, gateway)
- Easy to move apps between experiments/, active/, and archived/
- No need for git submodules

**Git Strategy:**
- Main branch: Production apps only
- Feature branches: For experiments
- Archive old experiments by moving to `archived/` folder

## Quick Start

### Creating a New App

1. Copy the template:
```bash
cd /media/im3/plus/lab4/re_news/apps/experiments
cp -r template myapp
cd myapp
```

2. Update `app.json`:
```json
{
  "id": "myapp",
  "name": "My New App",
  "version": "0.1.0",
  "description": "What my app does",
  "status": "development",
  "icon": "🧪",
  "routes": {
    "base": "/myapp",
    "app": "/myapp/app"
  }
}
```

3. Build and run:
```bash
docker-compose build myapp
docker-compose up -d myapp
```

4. Your app will automatically:
   - Register with gateway
   - Send heartbeats every 30s
   - Appear in /switcher (if status="active")

### Archiving an App

1. Move to archived folder:
```bash
mv apps/experiments/myapp apps/archived/myapp
```

2. Update `app.json` status:
```json
{
  "status": "archived"
}
```

3. Stop the container:
```bash
docker-compose stop myapp
docker-compose rm myapp
```

## Current Implementation Status

- [x] Gateway beacon API endpoints
- [ ] Update switcher to use dynamic app list
- [ ] Create app template with beacon client
- [ ] Update nginx.conf for dynamic routing
- [ ] Create template/ directory
- [ ] Migrate jimmylai and storychat to use beacon system
- [ ] Document migration guide

## Next Steps

1. Complete switcher dynamic loading
2. Create `apps/experiments/template/` with beacon client
3. Test with a new experimental app
4. Document best practices
5. Add monitoring dashboard for registered apps
