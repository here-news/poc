# Getting Started with RE News Apps Framework

Welcome to the restructured RE News multi-app framework! This guide will get you up and running in 5 minutes.

## What Changed?

We've reorganized the project into a clean, scalable multi-container architecture:

### New Structure

```
/media/im3/plus/lab4/re_news/apps/     ← All containerized apps live here
├── docker-compose.yml                  ← Central orchestration
├── nginx.conf                          ← Reverse proxy routing
├── README.md                           ← Full documentation
├── storychat/                          ← (was: webapp/)
├── jimmylai/                           ← (was: product/experiment3/)
├── experiments/                        ← (was: archive/experiments-v2/)
└── mini/                               ← (was: product/mini/) Template for new apps
```

### Benefits

✅ **Single Port** - All apps via `localhost:7272`
✅ **Clean URLs** - `/storychat`, `/jimmylai`, etc.
✅ **Easy Scaling** - Add new apps in minutes
✅ **Isolated** - Each app runs independently
✅ **Template Ready** - Copy `mini/` to start new apps

## Quick Start

### 1. Start the Framework

```bash
cd /media/im3/plus/lab4/re_news/apps
docker-compose up --build
```

### 2. Access Your Apps

Open your browser:

- **Gateway**: http://localhost:7272/
- **StoryChat**: http://localhost:7272/storychat
- **Jimmy Lai Quest**: http://localhost:7272/jimmylai

### 3. View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f storychat
docker-compose logs -f jimmylai
```

### 4. Stop Everything

```bash
docker-compose down
```

## Create Your First New App

### Using the Mini Template

```bash
cd /media/im3/plus/lab4/re_news/apps

# 1. Copy the template
cp -r mini/ myapp/

# 2. Add to docker-compose.yml
# (See README.md for full instructions)

# 3. Add nginx route
# (See README.md for configuration)

# 4. Build and run
docker-compose up --build myapp
```

Visit: http://localhost:7272/myapp

## Environment Setup

### Configure API Keys

```bash
# Copy environment template
cp .env.example .env

# Edit with your keys
nano .env
```

Example `.env`:
```
OPENAI_API_KEY=sk-...your-key-here
```

## Common Tasks

### Restart a Service

```bash
docker-compose restart storychat
```

### Rebuild After Code Changes

```bash
docker-compose up -d --build storychat
```

### Check Service Status

```bash
docker-compose ps
```

### Shell into Container

```bash
docker-compose exec storychat bash
docker-compose exec jimmylai sh
```

## Troubleshooting

### "Port 7272 already in use"

Edit `docker-compose.yml` and change the port:

```yaml
nginx:
  ports:
    - "8080:80"  # Change to any available port
```

### "502 Bad Gateway"

Check if the service is running:

```bash
docker-compose ps
docker-compose logs [service-name]
```

### Static Files Not Loading

Ensure your Dockerfile has the correct `--root-path`:

```dockerfile
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--root-path", "/myapp"]
```

## Application Overview

### StoryChat (Port 7272)

**Path**: `/storychat`
**Description**: Main chat interface for story exploration
**Tech**: FastAPI + React + Vite
**Location**: `apps/storychat/`

### Jimmy Lai Quest (Port 8000)

**Path**: `/jimmylai`
**Description**: Truth Market experiment focused on Jimmy Lai case
**Tech**: FastAPI + React + SQLite
**Location**: `apps/jimmylai/`
**API Docs**: http://localhost:7272/jimmylai/docs

### Experiments Collection

**Location**: `apps/experiments/`
**Description**: Experimental projects and prototypes
**Status**: Not containerized yet (reference only)

### Mini Template

**Location**: `apps/mini/`
**Description**: Minimal template for creating new apps
**Usage**: Copy this folder to bootstrap new applications

## Next Steps

1. **Read the full README**: `apps/README.md`
2. **Review framework docs**: `apps/MULTI_CONTAINER_FRAMEWORK.md`
3. **Check individual app docs**:
   - `apps/storychat/README.md`
   - `apps/jimmylai/README.md`
4. **Create your first app** using the `mini/` template

## File Reference

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Defines all services and orchestration |
| `nginx.conf` | Reverse proxy routing configuration |
| `.env` | Environment variables (create from `.env.example`) |
| `README.md` | Comprehensive documentation |
| `MULTI_CONTAINER_FRAMEWORK.md` | Framework architecture details |
| `GETTING_STARTED.md` | This quick start guide |

## Architecture Diagram

```
┌─────────────────────────────────────┐
│     Browser: localhost:7272         │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│    Nginx Reverse Proxy (Port 80)   │
│    - /storychat  → storychat:7272   │
│    - /jimmylai   → jimmylai:8000    │
└────┬──────────────────────┬─────────┘
     │                      │
     ▼                      ▼
┌──────────┐         ┌──────────┐
│StoryChat │         │JimmyLai  │
│Container │         │Container │
└──────────┘         └──────────┘
```

## Production Deployment

For production deployment:

1. Set up SSL/TLS certificates (Let's Encrypt)
2. Configure domain names in nginx
3. Enable nginx caching for static assets
4. Set up proper logging and monitoring
5. Use secrets management (not .env files)
6. Consider Kubernetes for orchestration at scale

See `MULTI_CONTAINER_FRAMEWORK.md` for production considerations.

## Support

- **Documentation**: `README.md` in this directory
- **Framework Details**: `MULTI_CONTAINER_FRAMEWORK.md`
- **Docker Compose**: https://docs.docker.com/compose/
- **Nginx**: https://nginx.org/en/docs/

## Tips

💡 **Tip 1**: Always test new apps individually before adding to production compose file
💡 **Tip 2**: Use meaningful container names for easier debugging
💡 **Tip 3**: Keep the `mini/` template clean as a reference
💡 **Tip 4**: Document your app in its own README.md
💡 **Tip 5**: Use environment variables for all configuration

Happy building! 🚀
