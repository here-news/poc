# Cloud Run Deployment Guide (Recommended for 24x7)

This guide covers migrating the HN4 webapp from Compute Engine to Cloud Run for 24x7 availability with minimal complexity.

## Why Cloud Run?

✅ **Built-in HA**: Automatic multi-instance deployment
✅ **Auto-scaling**: 0→1000+ instances based on traffic
✅ **Zero-downtime deploys**: Gradual rollout
✅ **Health checks**: Automatic monitoring
✅ **Cost-efficient**: Pay per request (~$45/month vs $90+ for MIG)
✅ **Fast deployment**: 5-10 minutes
✅ **Low maintenance**: Fully managed

## Prerequisites

- Google Cloud SDK installed and authenticated
- Project ID: Your GCP project
- Webapp code in working directory
- `.env` file with required variables

## Pre-Migration Checklist

### 1. Verify Dockerfile Works

The existing Dockerfile is Cloud Run compatible:

```bash
cd webapp

# Test build locally
docker build -t webapp .

# Test run locally
docker run --rm -p 9494:7272 --env-file .env webapp

# Test endpoint
curl http://localhost:9494/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-14T..."
}
```

### 2. Add Health Endpoint (if not exists)

In `server.py`, add:

```python
@app.get("/health")
async def health_check():
    """Health check endpoint for Cloud Run"""
    try:
        # Test Firestore connection
        firestore_ok = test_firestore_connection()

        # Test backend connection
        backend_ok = await test_backend_connection()

        return {
            "status": "healthy" if (firestore_ok and backend_ok) else "degraded",
            "timestamp": datetime.now().isoformat(),
            "firestore_connected": firestore_ok,
            "backend_accessible": backend_ok
        }
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}, 503
```

### 3. Review Environment Variables

Cloud Run needs these env vars:
- `OPENAI_API_KEY` (required)
- `GCS_BUCKET_NAME` (required)
- `FIRESTORE_PROJECT_ID` (optional, defaults to current project)
- `BACKEND_URL` (optional, defaults to story-engine-here URL)

See [environment.md](./environment.md) for full list.

### 4. Update Port Configuration

Cloud Run expects port from `PORT` env var. Update `server.py`:

```python
import os
import uvicorn

if __name__ == "__main__":
    port = int(os.getenv("PORT", 7272))  # Cloud Run sets PORT
    uvicorn.run(app, host="0.0.0.0", port=port)
```

## Deployment Steps

### Standard Deployment

```bash
cd webapp

gcloud run deploy webapp \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --port 7272 \
  --timeout 60 \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 1 \
  --max-instances 10
```

**Flags explained:**
- `--source .`: Deploy from current directory (Cloud Build)
- `--region us-central1`: Deploy to US Central region
- `--allow-unauthenticated`: Public access (adjust if auth needed)
- `--port 7272`: Container port (matches Dockerfile EXPOSE)
- `--timeout 60`: Request timeout (60 seconds)
- `--memory 1Gi`: Memory allocation per instance
- `--cpu 1`: CPU allocation per instance
- `--min-instances 1`: Always keep 1 instance running (no cold starts)
- `--max-instances 10`: Scale up to 10 instances under load

**Deployment time:** ~5-10 minutes

### Setting Environment Variables

**Option 1: Via CLI (for non-sensitive values)**
```bash
gcloud run services update webapp \
  --region us-central1 \
  --update-env-vars \
    GCS_BUCKET_NAME=your-bucket,\
    BACKEND_URL=https://story-engine-here-179431661561.us-central1.run.app
```

**Option 2: Via Secret Manager (for sensitive values)**

1. Create secret:
```bash
echo -n "sk-proj-..." | gcloud secrets create openai-api-key --data-file=-
```

2. Grant access to Cloud Run:
```bash
# Get service account email
SERVICE_ACCOUNT=$(gcloud run services describe webapp \
  --region us-central1 \
  --format='value(spec.template.spec.serviceAccountName)')

# Grant access
gcloud secrets add-iam-policy-binding openai-api-key \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/secretmanager.secretAccessor"
```

3. Reference in Cloud Run:
```bash
gcloud run services update webapp \
  --region us-central1 \
  --update-secrets OPENAI_API_KEY=openai-api-key:latest
```

### Deployment Output

Successful deployment shows:

```
Building and deploying container to Cloud Run...
✓ Building container
✓ Uploading sources
✓ Creating Revision
✓ Routing traffic
Done.
Service [webapp] revision [webapp-00001-xyz] has been deployed
and is serving 100 percent of traffic.
Service URL: https://webapp-abc123-uc.a.run.app
```

**Save this URL** - this is your new webapp endpoint.

## Post-Deployment Verification

### 1. Health Check

```bash
curl https://webapp-abc123-uc.a.run.app/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "firestore_connected": true,
  "backend_accessible": true,
  "timestamp": "2025-10-14T..."
}
```

### 2. Test Full User Flow

1. **Load homepage:**
   ```bash
   curl https://webapp-abc123-uc.a.run.app/
   ```

2. **Submit extraction:**
   ```bash
   curl -X POST https://webapp-abc123-uc.a.run.app/api/extract \
     -H "Content-Type: application/json" \
     -d '{"url": "https://example.com/article"}'
   ```

3. **Check task status:**
   ```bash
   curl https://webapp-abc123-uc.a.run.app/api/task/{task_id}
   ```

### 3. Load Testing

Test auto-scaling under load:

```bash
# Install hey (HTTP load generator)
# Mac: brew install hey
# Linux: go install github.com/rakyll/hey@latest

# Send 1000 requests with 10 concurrent workers
hey -n 1000 -c 10 https://webapp-abc123-uc.a.run.app/health
```

**Expected**: Auto-scaling kicks in, all requests succeed

### 4. Monitor Logs

```bash
gcloud run services logs read webapp --region us-central1 --limit 50
```

Look for:
- ✅ No startup errors
- ✅ Firestore connection successful
- ✅ Backend API accessible
- ❌ No 5xx errors

## Custom Domain Setup

### 1. Map Custom Domain

```bash
gcloud run domain-mappings create \
  --service webapp \
  --region us-central1 \
  --domain app.your-domain.com
```

### 2. Update DNS

Add DNS records shown in output:
```
CNAME: app.your-domain.com → ghs.googlehosted.com
```

**Propagation time:** 5-30 minutes

### 3. Verify SSL Certificate

Cloud Run automatically provisions SSL certificate. Check status:

```bash
gcloud run domain-mappings describe \
  --domain app.your-domain.com \
  --region us-central1
```

Wait for `Status: ACTIVE` and `CertificateStatus: ACTIVE`

## Zero-Downtime Deployment

Cloud Run provides zero-downtime deploys by default:

1. **Gradual rollout**: New revision receives increasing traffic
2. **Health checks**: Only healthy instances serve traffic
3. **Graceful shutdown**: Old instances finish in-flight requests

### Deploy New Version

```bash
cd webapp
git pull  # Get latest code

gcloud run deploy webapp \
  --source . \
  --region us-central1 \
  --no-traffic  # Deploy without routing traffic (optional)
```

### Gradual Traffic Migration (Optional)

```bash
# Route 10% traffic to new revision
gcloud run services update-traffic webapp \
  --region us-central1 \
  --to-revisions webapp-00002-xyz=10

# Monitor for issues, then increase gradually
gcloud run services update-traffic webapp \
  --region us-central1 \
  --to-revisions webapp-00002-xyz=50

# Finally migrate 100%
gcloud run services update-traffic webapp \
  --region us-central1 \
  --to-latest
```

## Rollback

### View Revisions

```bash
gcloud run revisions list \
  --service webapp \
  --region us-central1 \
  --limit 10
```

### Rollback to Previous Revision

```bash
# Instant rollback
gcloud run services update-traffic webapp \
  --region us-central1 \
  --to-revisions webapp-00001-xyz=100
```

**Rollback time:** ~10 seconds

## Cost Optimization

### Reduce Cold Starts

Set minimum instances to keep warm:

```bash
gcloud run services update webapp \
  --region us-central1 \
  --min-instances 1
```

**Cost**: ~$5-10/month for 1 always-on instance
**Benefit**: No cold starts (instant response)

### Optimize Resource Allocation

Start with lower resources, scale up if needed:

```bash
# Reduce to 512Mi memory, 0.5 CPU
gcloud run services update webapp \
  --region us-central1 \
  --memory 512Mi \
  --cpu 0.5
```

**Test thoroughly** - ensure app still performs well.

### Monitor Costs

View Cloud Run costs:
```bash
gcloud billing accounts list
# View in Cloud Console → Billing → Reports
```

Filter by:
- Service: Cloud Run
- SKU: Request, CPU, Memory

## Monitoring & Alerts

### View Metrics

Cloud Console → Cloud Run → webapp → Metrics:
- **Request count**: Total requests
- **Request latency**: Response time percentiles
- **Container CPU**: CPU utilization
- **Container memory**: Memory usage
- **Container instances**: Active instance count

### Set Up Alerts

Create alert for high error rate:

```bash
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="Webapp Error Rate" \
  --condition-display-name="Error rate > 5%" \
  --condition-threshold-value=5 \
  --condition-threshold-duration=60s
```

### Logging

View logs in real-time:
```bash
gcloud run services logs tail webapp --region us-central1
```

Filter by severity:
```bash
gcloud run services logs read webapp \
  --region us-central1 \
  --filter="severity>=ERROR" \
  --limit 50
```

## Troubleshooting

### Deployment Fails: Build Error

**Error:** `failed to build: ...`

**Solutions:**
1. Test Docker build locally: `docker build -t webapp .`
2. Check Dockerfile syntax
3. Verify all dependencies in requirements.txt
4. Check build logs: `gcloud builds list --limit 5`

### Deployment Fails: Environment Variable

**Error:** `Cannot update environment variable`

**Solutions:**
1. Don't use `--set-env-vars` if using secrets
2. Update secrets separately with `--update-secrets`
3. Remove conflicting env var: `--remove-env-vars KEY`

### Service Returns 503

**Error:** Health checks failing

**Solutions:**
1. Check logs: `gcloud run services logs read webapp`
2. Verify health endpoint works: `curl YOUR_URL/health`
3. Check Firestore/backend connectivity
4. Increase startup timeout if needed

### Cold Start Issues

**Error:** First request slow (1-3 seconds)

**Solutions:**
1. Set `--min-instances 1` to keep warm
2. Optimize Docker image size
3. Use lighter base image (python:3.11-slim)
4. Consider startup CPU boost (premium feature)

### High Costs

**Issue:** Unexpected high bill

**Solutions:**
1. Check instance count: May be scaling too high
2. Reduce `--max-instances` if needed
3. Optimize code (reduce CPU time per request)
4. Review logs for runaway requests
5. Set budget alerts in Cloud Console

## Migration from Compute Engine

### Parallel Deployment (Recommended)

1. **Deploy to Cloud Run** (don't shut down CE yet):
   ```bash
   gcloud run deploy webapp --source . --region us-central1
   ```

2. **Test Cloud Run thoroughly**:
   - Health checks pass
   - Full user flow works
   - Load testing successful
   - Monitor for 24 hours

3. **Switch DNS** (if using custom domain):
   - Update CNAME from CE IP to Cloud Run URL
   - Or update load balancer backend

4. **Monitor traffic shift**:
   - Watch Cloud Run metrics
   - Check for errors
   - Verify performance acceptable

5. **Decommission CE** (after 48 hours of stable Cloud Run):
   ```bash
   gcloud compute instances stop webapp-instance
   # After 1 week with no issues:
   gcloud compute instances delete webapp-instance
   ```

### Cutover Deployment (Faster, More Risk)

1. Take snapshot of CE instance
2. Deploy to Cloud Run
3. Test quickly
4. Switch traffic immediately
5. Monitor closely for 4-6 hours
6. Roll back to CE if issues

**Recommended**: Parallel deployment for production

## Best Practices

1. **Always use `--min-instances 1`** for production (avoid cold starts)
2. **Set up monitoring alerts** before going live
3. **Test rollback** procedure before needing it
4. **Use Secret Manager** for sensitive env vars
5. **Enable Cloud Armor** if DDoS protection needed
6. **Monitor costs** weekly for first month
7. **Document your Cloud Run URL** and revision numbers
8. **Set up custom domain** for stability (Cloud Run URLs can change)

## Production Checklist

Before migrating production traffic:

- [ ] Health endpoint responds correctly
- [ ] Environment variables configured (including secrets)
- [ ] Min instances set to 1 (no cold starts)
- [ ] Custom domain mapped (if applicable)
- [ ] SSL certificate active
- [ ] Load testing passed (1000+ requests)
- [ ] Monitoring alerts configured
- [ ] Logs aggregated and searchable
- [ ] Rollback procedure tested
- [ ] Backend connectivity verified
- [ ] Cost budget set in Cloud Console

## Support

For Cloud Run issues:
- [Cloud Run documentation](https://cloud.google.com/run/docs)
- [Troubleshooting guide](https://cloud.google.com/run/docs/troubleshooting)
- Check [monitoring.md](./monitoring.md) for observability setup
- Review [environment.md](./environment.md) for configuration
