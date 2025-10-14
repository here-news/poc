# DevOps Guide - HN4 WebApp (Consumer-Facing)

This directory contains documentation for deploying and maintaining the consumer-facing HN4 web application.

## Current Architecture

**Role**: Consumer-facing gateway + React frontend
**Technology**: FastAPI (Python) + React + Vite
**Current Deployment**: Docker on Google Compute Engine
**Port**: 9494 (external), 7272 (internal)
**Dependencies**:
- story-engine-here (Cloud Run backend)
- Firestore (task storage)
- Cloud Pub/Sub (job queuing)

## Documentation Structure

- **[strategies.md](./strategies.md)** - Deployment strategy comparison for 24x7 availability
- **[compute-engine.md](./compute-engine.md)** - Current Compute Engine deployment (existing)
- **[cloud-run.md](./cloud-run.md)** - Migration to Cloud Run (recommended)
- **[managed-instance-group.md](./managed-instance-group.md)** - High availability on Compute Engine
- **[kubernetes.md](./kubernetes.md)** - GKE deployment (advanced)
- **[monitoring.md](./monitoring.md)** - Health checks, alerts, and observability
- **[environment.md](./environment.md)** - Configuration reference

## Quick Links

### Current Deployment (Compute Engine)
```bash
# SSH to instance
gcloud compute ssh webapp-instance --zone us-central1-a

# Deploy new version
cd ~/webapp
git pull
docker-compose down
docker-compose up --build -d
```

### Health Check
```bash
curl https://your-webapp-url.com/health
```

## 24x7 Availability Requirements

Consumer-facing applications need:

### ✅ High Availability
- **Target uptime**: 99.9% (8.76 hours downtime/year)
- **Load balancing**: Distribute traffic across multiple instances
- **Auto-healing**: Restart failed instances automatically
- **Zero-downtime deploys**: Update without service interruption

### ✅ Scalability
- **Auto-scaling**: Handle traffic spikes
- **Resource limits**: Prevent resource exhaustion
- **Performance**: Low latency response times

### ✅ Reliability
- **Health checks**: Detect and replace unhealthy instances
- **Graceful shutdown**: Finish in-flight requests before stopping
- **Error handling**: Retry failed requests
- **Circuit breaking**: Prevent cascading failures

### ✅ Monitoring
- **Uptime monitoring**: Alert on downtime
- **Performance metrics**: Track response times
- **Error tracking**: Log and alert on errors
- **User metrics**: Monitor active users, page loads

## Deployment Strategy Comparison

| Feature | Compute Engine (Current) | Cloud Run (Recommended) | Managed Instance Group | GKE (Advanced) |
|---------|--------------------------|-------------------------|------------------------|----------------|
| **Complexity** | Low | Very Low | Medium | High |
| **Cost** | Fixed (running 24/7) | Pay-per-request | Fixed (multiple VMs) | High (cluster + nodes) |
| **Auto-scaling** | ❌ Manual | ✅ Automatic | ✅ Automatic | ✅ Automatic |
| **Zero-downtime deploys** | ❌ Requires setup | ✅ Built-in | ✅ Rolling updates | ✅ Rolling updates |
| **Health checks** | ❌ Manual setup | ✅ Built-in | ✅ Built-in | ✅ Built-in |
| **Load balancing** | ❌ Single instance | ✅ Built-in | ✅ Built-in | ✅ Built-in |
| **Setup time** | 30 min | 15 min | 2 hours | 4+ hours |
| **Maintenance** | Medium | Low | Medium | High |
| **Best for** | Simple, low-traffic | Most use cases | Large-scale, predictable | Multi-service, complex |

**Recommendation**: Migrate to **Cloud Run** for simplicity, cost-efficiency, and built-in HA features.

## Quick Start by Strategy

### Option 1: Cloud Run (Recommended)
```bash
cd webapp
gcloud run deploy webapp \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --port 7272
```

### Option 2: Managed Instance Group (High Availability)
```bash
# Create instance template with auto-restart
gcloud compute instance-templates create webapp-template \
  --machine-type e2-medium \
  --metadata-from-file startup-script=startup.sh

# Create managed instance group with auto-healing
gcloud compute instance-groups managed create webapp-mig \
  --template webapp-template \
  --size 2 \
  --zone us-central1-a \
  --health-check webapp-health
```

### Option 3: Current Compute Engine (Improved)
```bash
# Add auto-restart systemd service
sudo systemctl enable webapp
sudo systemctl start webapp

# Set up external monitoring with UptimeRobot
```

## Monitoring Essentials

### Health Endpoint
Implement in `server.py`:
```python
@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "firestore_connected": check_firestore(),
        "backend_accessible": check_backend()
    }
```

### Uptime Monitoring
- **UptimeRobot** (free): https://uptimerobot.com
- **Google Cloud Monitoring**: Built-in with Cloud Run/MIG
- **Pingdom**: Premium option

### Alert Channels
- Email: Critical alerts
- Slack: Real-time notifications
- PagerDuty: On-call rotations (if team grows)

## Deployment Checklist

Before any deployment:

- [ ] Test locally with `docker-compose up`
- [ ] Verify health endpoint responds
- [ ] Check backend connectivity (story-engine-here)
- [ ] Review git changes
- [ ] Backup current deployment (snapshot/image)
- [ ] Plan rollback strategy
- [ ] Schedule during low-traffic period (if not zero-downtime)
- [ ] Monitor for 10-15 minutes after deployment
- [ ] Test critical user flows (submit URL, view results)

## Common Issues

### Instance Becomes Unresponsive
**Symptoms:** Health checks fail, site doesn't load

**Solutions:**
1. Check CPU/memory usage: `docker stats`
2. Review logs: `docker logs webapp`
3. Restart container: `docker-compose restart`
4. If on Compute Engine: Reboot VM

### Backend Connection Failures
**Symptoms:** Extraction fails, timeout errors

**Solutions:**
1. Verify story-engine-here is running
2. Check Firestore connection
3. Test backend directly: `curl https://story-engine-here.../health`
4. Review network/firewall rules

### High Latency
**Symptoms:** Slow page loads, timeouts

**Solutions:**
1. Enable caching (Redis, CDN)
2. Optimize React build (code splitting)
3. Scale backend (Cloud Run auto-scales)
4. Add load balancer with CDN

## Support

For deployment issues:
- Review strategy-specific guides in this directory
- Check [monitoring.md](./monitoring.md) for observability
- Consult [environment.md](./environment.md) for configuration
- Test with [testing checklist](./strategies.md#testing)

## Migration Path

If migrating from Compute Engine to Cloud Run:

1. Read [cloud-run.md](./cloud-run.md) for detailed steps
2. Set up Cloud Run deployment (parallel to existing)
3. Test Cloud Run deployment thoroughly
4. Switch DNS/load balancer to Cloud Run
5. Monitor for 24 hours
6. Decommission Compute Engine instance

**Estimated migration time**: 2-4 hours
**Recommended window**: Low-traffic period

## Version History

- **Current**: Docker on Compute Engine (single instance)
- **Proposed**: Cloud Run deployment (HA + auto-scaling)
- **Future**: Multi-region deployment for global availability
