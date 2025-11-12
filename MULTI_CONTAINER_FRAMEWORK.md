# Multi-Container Framework Setup

This document explains the unified multi-container architecture that allows you to host multiple applications through a single port using path-based routing.

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│         Browser Requests                         │
│  localhost:7272/webapp                           │
│  localhost:7272/experiment3                      │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│     Nginx Reverse Proxy (Port 80→7272)          │
│  - Path-based routing                            │
│  - WebSocket support                             │
│  - Load balancing ready                          │
└─────┬──────────────────────┬────────────────────┘
      │                      │
      ▼                      ▼
┌─────────────┐      ┌──────────────────┐
│   Webapp    │      │   Experiment3     │
│  Port 7272  │      │   Port 8000       │
│  (FastAPI)  │      │   (FastAPI)       │
└─────────────┘      └──────────────────┘
```

## Quick Start

### 1. Start All Services

From the `/media/im3/plus/lab4/re_news/` directory:

```bash
# Build and start all containers
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build
```

### 2. Access Applications

- **Gateway Landing Page**: http://localhost:7272/
- **Main Webapp**: http://localhost:7272/webapp
- **Experiment3 (Truth Market)**: http://localhost:7272/experiment3

### 3. Stop All Services

```bash
docker-compose down
```

## File Structure

```
/media/im3/plus/lab4/re_news/
├── docker-compose.yml          # Main orchestration file
├── nginx.conf                  # Reverse proxy configuration
├── webapp/                     # Main web application
│   ├── Dockerfile              # Updated with --root-path
│   └── server.py               # FastAPI app
└── product/
    └── experiment3/            # Truth Market experiment
        ├── Dockerfile          # Updated with --root-path
        └── app/main.py         # FastAPI app
```

## Adding New Applications

To add a new application (e.g., `experiment4`):

### Step 1: Update `docker-compose.yml`

Add a new service:

```yaml
  experiment4:
    build: ./product/experiment4
    container_name: experiment4
    expose:
      - "9000"  # Internal port
    environment:
      - BASE_PATH=/experiment4
    restart: unless-stopped
    networks:
      - re_news_network
```

### Step 2: Update `nginx.conf`

Add a new location block:

```nginx
location /experiment4 {
    rewrite ^/experiment4/(.*) /$1 break;
    rewrite ^/experiment4$ / break;

    proxy_pass http://experiment4:9000;
    proxy_http_version 1.1;

    # WebSocket support
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;

    # Forward headers
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Prefix /experiment4;

    proxy_buffering off;
}
```

### Step 3: Update Your App's Dockerfile

Add `--root-path` flag to uvicorn command:

```dockerfile
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "9000", "--root-path", "/experiment4"]
```

### Step 4: Rebuild and Restart

```bash
docker-compose up -d --build
```

## Key Features

### Path-Based Routing
- All apps accessible through single port (7272)
- Clean URL structure: `/webapp`, `/experiment3`, etc.
- No port conflicts between services

### WebSocket Support
- Full WebSocket support for real-time features
- Configured in nginx with `Upgrade` headers

### Isolation
- Each service runs in its own container
- Independent scaling and resource management
- Shared network for inter-service communication

### Development Friendly
- Individual services can be restarted independently
- Logs separated by service: `docker-compose logs webapp`
- Volume mounts for live development

## Troubleshooting

### Port Already in Use
If port 7272 is already in use, update the port mapping in `docker-compose.yml`:

```yaml
nginx:
  ports:
    - "8080:80"  # Change 7272 to 8080 or any available port
```

### Service Not Accessible
Check if service is running:
```bash
docker-compose ps
```

Check nginx logs:
```bash
docker-compose logs nginx
```

Check specific service logs:
```bash
docker-compose logs webapp
docker-compose logs experiment3
```

### Static Files Not Loading
Ensure `--root-path` is correctly set in Dockerfile CMD and matches nginx prefix.

### WebSocket Connection Failed
Verify WebSocket headers in nginx config and that your app supports WebSockets properly.

## Environment Variables

Each service can have its own environment variables:

```yaml
# In docker-compose.yml
environment:
  - OPENAI_API_KEY=${OPENAI_API_KEY}
  - DATABASE_URL=${DATABASE_URL}
  - BASE_PATH=/experiment3
```

Or use `.env` files:

```yaml
env_file:
  - ./webapp/.env
```

## Production Considerations

### Security
- [ ] Add SSL/TLS certificates (Let's Encrypt)
- [ ] Configure rate limiting in nginx
- [ ] Set up authentication/authorization
- [ ] Use secrets management for API keys

### Performance
- [ ] Enable nginx caching for static assets
- [ ] Configure upstream load balancing
- [ ] Set appropriate worker processes
- [ ] Monitor resource usage

### Monitoring
- [ ] Set up logging aggregation
- [ ] Add health check endpoints
- [ ] Configure alerting
- [ ] Use container orchestration (Kubernetes) for scale

## Advanced Configuration

### Custom Domain Routing

Instead of paths, you can route by subdomain:

```nginx
server {
    server_name webapp.example.com;
    location / {
        proxy_pass http://webapp:7272;
    }
}

server {
    server_name experiment3.example.com;
    location / {
        proxy_pass http://experiment3:8000;
    }
}
```

### Load Balancing

For multiple instances of the same service:

```nginx
upstream webapp_backend {
    server webapp1:7272;
    server webapp2:7272;
    server webapp3:7272;
}

location /webapp {
    proxy_pass http://webapp_backend;
}
```

## Migration from Individual Containers

If you were running containers separately:

1. **Stop old containers**: `docker stop webapp experiment3`
2. **Remove old containers**: `docker rm webapp experiment3`
3. **Start unified setup**: `docker-compose up -d --build`
4. **Update bookmarks/links** to use new paths

## API Documentation

Each service has its own API documentation:

- Webapp API: http://localhost:7272/webapp/docs
- Experiment3 API: http://localhost:7272/experiment3/docs

## Support

For issues or questions:
- Check container logs: `docker-compose logs -f [service_name]`
- Restart specific service: `docker-compose restart [service_name]`
- Rebuild after changes: `docker-compose up -d --build [service_name]`
