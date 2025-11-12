# App Template

This is a template for creating new experimental apps in the RE News multi-app framework.

## Features

- ✅ **Auto-Registration**: Automatically registers with gateway on startup
- ✅ **Heartbeat System**: Sends heartbeats every 30s to stay visible in switcher
- ✅ **FastAPI Backend**: Modern async Python framework
- ✅ **Minimal Setup**: Just copy, configure, and run
- ✅ **Docker Ready**: Fully containerized with docker-compose

## Quick Start

### 1. Copy the Template

```bash
cd /media/im3/plus/lab4/re_news/apps/experiments
cp -r template myapp
cd myapp
```

### 2. Configure Your App

Edit `app.json`:

```json
{
  "id": "myapp",
  "name": "My Experimental App",
  "version": "0.1.0",
  "description": "What my app does",
  "status": "active",
  "icon": "🧪",
  "routes": {
    "base": "/myapp",
    "app": "/myapp/app",
    "api": "/myapp/api"
  }
}
```

**Status Options:**
- `development` - App is in development (shows in switcher)
- `active` - Production-ready app (shows in switcher)
- `archived` - Archived app (hidden from switcher)

### 3. Customize Your App

Edit `app/main.py` and add your routes:

```python
@app.get("/myroute")
async def my_route():
    return {"message": "Hello from my app!"}
```

### 4. Build and Run

From the parent `apps/` directory:

```bash
docker-compose build myapp
docker-compose up -d myapp
```

### 5. Verify It's Working

Your app will:
1. ✅ Auto-register with the gateway
2. ✅ Appear in the switcher at http://localhost:7272/switcher
3. ✅ Be accessible at http://localhost:7272/myapp/

Check logs:
```bash
docker logs myapp
```

You should see:
```
🚀 Starting beacon for My Experimental App
✓ Registered with gateway: {...}
✓ Beacon started - sending heartbeats every 30s
♥ Heartbeat #1 sent successfully
```

## Project Structure

```
myapp/
├── app/
│   ├── main.py       # Your FastAPI app
│   └── beacon.py     # Beacon client (don't modify)
├── app.json          # App metadata
├── Dockerfile        # Container definition
├── docker-compose.yml # Service configuration
├── requirements.txt   # Python dependencies
└── README.md         # This file
```

## App Metadata (app.json)

| Field | Description | Example |
|-------|-------------|---------|
| `id` | Unique app identifier (alphanumeric + dashes) | `"my-app"` |
| `name` | Display name | `"My Experimental App"` |
| `version` | Semantic version | `"0.1.0"` |
| `description` | Brief description | `"What it does"` |
| `status` | App lifecycle status | `"active"` |
| `icon` | Emoji icon | `"🧪"` |
| `routes.base` | Base route path | `"/myapp"` |
| `routes.app` | Main app route | `"/myapp/app"` |
| `routes.api` | API routes prefix | `"/myapp/api"` |

## Beacon System

The beacon client handles:
- **Registration**: Registers app metadata with gateway on startup
- **Heartbeats**: Sends heartbeat every 30 seconds
- **Auto-Discovery**: Apps automatically appear in switcher when running

The switcher shows apps that have sent a heartbeat within the last 60 seconds.

## Adding Dependencies

Edit `requirements.txt`:

```txt
fastapi==0.110.0
uvicorn[standard]==0.30.0
httpx==0.28.1
# Add your dependencies below
requests==2.31.0
pandas==2.2.0
```

Then rebuild:
```bash
docker-compose build myapp
docker-compose up -d myapp
```

## Troubleshooting

### App not appearing in switcher

1. Check if container is running:
   ```bash
   docker ps | grep myapp
   ```

2. Check logs for registration:
   ```bash
   docker logs myapp | grep -E "Registered|Heartbeat"
   ```

3. Check gateway is running:
   ```bash
   docker ps | grep gateway
   ```

4. Verify app.json `status` is `"active"` or `"development"`

### Gateway connection failed

If you see `Failed to register with gateway`:

1. Verify gateway is running
2. Check docker network:
   ```bash
   docker network inspect apps_default
   ```
3. Verify `GATEWAY_URL` environment variable

### Heartbeats failing

If heartbeats fail but registration succeeded:
- Gateway may be restarting
- Heartbeats will resume automatically
- App will re-register if needed

## Archiving an App

To archive an app:

1. Update `app.json`:
   ```json
   {
     "status": "archived"
   }
   ```

2. Stop the container:
   ```bash
   docker-compose stop myapp
   docker-compose rm myapp
   ```

3. Move to archived folder:
   ```bash
   mv apps/experiments/myapp apps/archived/myapp
   ```

## Advanced: Frontend

To add a React frontend, see `apps/jimmylai/frontend/` for reference:

1. Create `frontend/` directory with Vite/React
2. Update Dockerfile to build frontend
3. Serve static files from FastAPI

## Resources

- Framework docs: `../APP_FRAMEWORK.md`
- FastAPI docs: https://fastapi.tiangolo.com/
- Docker Compose: https://docs.docker.com/compose/

## License

MIT
