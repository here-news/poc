# RE News Apps Framework

This directory contains all containerized applications in the RE News ecosystem, orchestrated through a unified multi-container framework.

## Directory Structure

```
apps/
├── docker-compose.yml          # Orchestration controller (run at port 7272)
├── nginx.conf                  # Reverse proxy routing configuration
├── .env.example                # Environment variables template
├── MULTI_CONTAINER_FRAMEWORK.md  # Detailed framework documentation
│
├── storychat/                  # Main chat UI application
│   ├── Dockerfile              # Container definition
│   ├── server.py               # FastAPI backend
│   ├── app/                    # React frontend source
│   └── ...
│
├── jimmylai/                   # Jimmy Lai Quest - Truth Market experiment
│   ├── Dockerfile              # Container definition
│   ├── app/main.py             # FastAPI backend
│   ├── frontend/               # React UI
│   └── ...
│
├── experiments/                # Experimental projects collection
│   └── ...
│
└── mini/                       # Minimal template for creating new apps
    ├── Dockerfile              # Template Dockerfile
    ├── README.md               # Template documentation
    └── ...
```

## Quick Start

### Start All Apps

```bash
cd /media/im3/plus/lab4/re_news/apps
docker-compose up --build

# Or in detached mode
docker-compose up -d --build
```

### Access Applications

- **Gateway**: http://localhost:7272/
- **StoryChat**: http://localhost:7272/storychat
- **Jimmy Lai Quest**: http://localhost:7272/jimmylai

### Stop All Apps

```bash
docker-compose down
```

## Application Index

### Production Apps

| App | Path | Port | Description |
|-----|------|------|-------------|
| **StoryChat** | `/storychat` | 7272 | Main chat interface for story exploration |
| **Jimmy Lai Quest** | `/jimmylai` | 8000 | Truth Market experiment focused on Jimmy Lai case |

### Development/Experimental

| Directory | Purpose |
|-----------|---------|
| **experiments/** | Collection of experimental projects and prototypes |
| **mini/** | Minimal template for creating new containerized apps |

## Creating a New App

To add a new application to the framework:

### Step 1: Copy Template

```bash
cd /media/im3/plus/lab4/re_news/apps
cp -r mini/ mynewapp/
cd mynewapp/
```

### Step 2: Customize Your App

- Update `Dockerfile` with your app's dependencies
- Modify `app.py` or create your app structure
- Update the internal port if needed

### Step 3: Add to `docker-compose.yml`

Add a new service entry:

```yaml
  mynewapp:
    build: ./mynewapp
    container_name: mynewapp
    expose:
      - "9000"  # Your app's internal port
    environment:
      - BASE_PATH=/mynewapp
    restart: unless-stopped
    networks:
      - re_news_network
```

Don't forget to add to nginx's `depends_on`:

```yaml
nginx:
  depends_on:
    - storychat
    - jimmylai
    - mynewapp  # Add here
```

### Step 4: Add Nginx Route

Edit `nginx.conf` and add a new location block:

```nginx
location /mynewapp {
    rewrite ^/mynewapp/(.*) /$1 break;
    rewrite ^/mynewapp$ / break;

    proxy_pass http://mynewapp:9000;
    proxy_http_version 1.1;

    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Prefix /mynewapp;

    proxy_buffering off;
}
```

Also update the landing page HTML in nginx.conf to include your app in the list.

### Step 5: Update App's Dockerfile

Ensure your app's Dockerfile CMD includes the `--root-path` flag:

```dockerfile
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "9000", "--root-path", "/mynewapp"]
```

For Flask apps:
```dockerfile
CMD ["flask", "run", "--host=0.0.0.0", "--port=9000"]
```
And configure Flask to handle the prefix in your app code.

### Step 6: Build and Test

```bash
docker-compose up --build mynewapp
```

Visit: http://localhost:7272/mynewapp

## Architecture Benefits

### Single Entry Point
- All apps accessible through port 7272
- Clean URL structure with path-based routing
- Easy to remember and share URLs

### Isolation
- Each app runs in its own container
- Independent dependencies and versions
- Failure in one app doesn't affect others

### Scalability
- Easy to add/remove apps
- Can scale individual services independently
- Load balancing ready (nginx upstream)

### Development Workflow
- Individual services can be restarted: `docker-compose restart storychat`
- View logs per service: `docker-compose logs -f jimmylai`
- Hot reload with volume mounts (configured in docker-compose.yml)

## Common Commands

### View Running Services
```bash
docker-compose ps
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f storychat
docker-compose logs -f jimmylai
docker-compose logs -f nginx
```

### Restart a Service
```bash
docker-compose restart storychat
```

### Rebuild a Service
```bash
docker-compose up -d --build storychat
```

### Shell into a Container
```bash
docker-compose exec storychat bash
docker-compose exec jimmylai sh
```

### Stop Everything
```bash
docker-compose down
```

### Remove Volumes (Reset)
```bash
docker-compose down -v
```

## Environment Variables

Create a `.env` file in the `apps/` directory:

```bash
cp .env.example .env
```

Then edit `.env` with your configuration:

```
OPENAI_API_KEY=your_key_here
DATABASE_URL=postgresql://user:pass@host:5432/db
```

Individual apps can also have their own `.env` files in their directories.

## Networking

All services are connected via the `re_news_network` bridge network:

- Services can communicate with each other using container names
- Example: `storychat` can reach `jimmylai` at `http://jimmylai:8000`
- External access only through nginx on port 7272

## Port Mapping

| Service | Internal Port | External Access |
|---------|--------------|-----------------|
| nginx | 80 | localhost:7272 |
| storychat | 7272 | via nginx at /storychat |
| jimmylai | 8000 | via nginx at /jimmylai |

Internal ports are not exposed to the host - only nginx's port 7272 is exposed.

## Troubleshooting

### Port Conflict
If port 7272 is in use, change the nginx port mapping in `docker-compose.yml`:

```yaml
nginx:
  ports:
    - "8080:80"  # Change 7272 to any available port
```

### Service Won't Start
Check logs:
```bash
docker-compose logs [service_name]
```

Check if the build succeeded:
```bash
docker-compose build [service_name]
```

### Nginx 502 Bad Gateway
Usually means the backend service isn't running or isn't responding:

1. Check if service is up: `docker-compose ps`
2. Check service logs: `docker-compose logs [service_name]`
3. Verify port in `docker-compose.yml` matches nginx.conf
4. Ensure `--root-path` in Dockerfile matches nginx prefix

### Static Files Not Loading
Ensure your FastAPI app is configured to handle the root_path:

```python
app = FastAPI(root_path=os.getenv("BASE_PATH", ""))
```

## Best Practices

1. **Use mini/ as template** - Don't modify mini/ directly, copy it for new apps
2. **Consistent naming** - Use lowercase, no special chars in app names
3. **Document your app** - Add README.md in each app directory
4. **Environment vars** - Never commit secrets, use .env files
5. **Health checks** - Add health check endpoints to your apps
6. **Logging** - Use structured logging (JSON) for easier parsing
7. **Testing** - Test individually before adding to main compose file

## Migration from Standalone Containers

If you have apps running standalone:

1. Stop the standalone container: `docker stop [container]`
2. Move the app to `apps/` directory
3. Add to `docker-compose.yml` and `nginx.conf`
4. Update paths/URLs in your app code
5. Test with: `docker-compose up --build [app_name]`

## Further Reading

- [MULTI_CONTAINER_FRAMEWORK.md](./MULTI_CONTAINER_FRAMEWORK.md) - Detailed framework documentation
- [Docker Compose Docs](https://docs.docker.com/compose/)
- [Nginx Reverse Proxy Guide](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)

## Support

For issues:
1. Check this README
2. Review logs: `docker-compose logs -f`
3. Check framework docs: `MULTI_CONTAINER_FRAMEWORK.md`
4. Review individual app READMEs
