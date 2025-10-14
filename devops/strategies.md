# Deployment Strategies for 24x7 Availability

This document compares different deployment strategies for the HN4 webapp to achieve 24x7 availability.

## Overview

For a consumer-facing application, 24x7 availability requires:
1. **Multiple instances** - No single point of failure
2. **Health monitoring** - Detect failures automatically
3. **Auto-healing** - Replace failed instances
4. **Load balancing** - Distribute traffic evenly
5. **Zero-downtime deploys** - Update without interruption

## Strategy Comparison

### Option 1: Cloud Run (Recommended) ⭐

**Description**: Deploy as serverless container on Cloud Run

**Pros:**
- ✅ **Built-in HA**: Automatic multi-instance, load balancing
- ✅ **Auto-scaling**: 0→1000+ instances based on traffic
- ✅ **Zero-downtime deploys**: Gradual rollout with traffic splitting
- ✅ **Health checks**: Automatic with configurable thresholds
- ✅ **Cost-efficient**: Pay only for requests (idle = ~$0)
- ✅ **Low maintenance**: Fully managed, no VM management
- ✅ **Fast deployment**: 5-10 minutes
- ✅ **Global load balancing**: Multi-region support
- ✅ **Integrated monitoring**: Cloud Logging/Monitoring included

**Cons:**
- ⚠️ Cold starts (first request after idle): 1-3 seconds
- ⚠️ Stateless only (no local disk persistence)
- ⚠️ 60-minute max request timeout
- ⚠️ Limited to HTTP/HTTPS

**Cost Estimate** (moderate traffic):
- 1M requests/month: ~$40-60
- 10M requests/month: ~$200-300
- Idle periods: ~$0 (vs $30-50/month for VM)

**Best For:**
- Most web applications
- Variable traffic patterns
- Teams wanting minimal ops overhead
- Cost-sensitive deployments

**Setup Time**: 15-30 minutes

---

### Option 2: Managed Instance Group (MIG)

**Description**: Multiple VMs with auto-healing and load balancing

**Pros:**
- ✅ **True high availability**: Multiple instances across zones
- ✅ **Auto-healing**: Failed instances replaced automatically
- ✅ **Auto-scaling**: Scale based on CPU, memory, or custom metrics
- ✅ **Load balancer**: Global/regional distribution
- ✅ **Zero-downtime deploys**: Rolling updates
- ✅ **Full VM control**: Can run any workload
- ✅ **Stateful support**: Can attach persistent disks

**Cons:**
- ❌ **Higher cost**: Always-on VMs (~$100-300/month minimum for 2-3 instances)
- ⚠️ **More complex**: Requires instance template, health checks, load balancer setup
- ⚠️ **Slower deploys**: 10-20 minutes for rolling updates
- ⚠️ **Maintenance**: OS patches, Docker updates

**Cost Estimate**:
- 2x e2-medium instances: ~$60/month
- Load balancer: ~$20/month
- Total: ~$80-100/month minimum

**Best For:**
- Large-scale applications (>100K requests/day)
- Predictable, steady traffic
- Need for persistent state
- Custom networking requirements

**Setup Time**: 2-4 hours (initial), 30 minutes (updates)

---

### Option 3: Google Kubernetes Engine (GKE)

**Description**: Container orchestration on managed Kubernetes

**Pros:**
- ✅ **Maximum control**: Fine-grained resource management
- ✅ **Multi-service**: Easy to run multiple services
- ✅ **Advanced features**: Service mesh, canary deployments, A/B testing
- ✅ **Vendor portability**: Standard Kubernetes (can move to other clouds)
- ✅ **Auto-scaling**: Horizontal pod autoscaling + node autoscaling
- ✅ **Rolling updates**: Zero-downtime deploys

**Cons:**
- ❌ **High complexity**: Steep learning curve (Kubernetes, kubectl, manifests)
- ❌ **High cost**: Cluster management fee (~$75/month) + nodes (~$150+/month)
- ❌ **Overkill**: Too much for single-app deployment
- ⚠️ **Maintenance**: Cluster upgrades, node management, monitoring setup

**Cost Estimate**:
- GKE control plane: $75/month
- 3x e2-medium nodes: ~$180/month
- Load balancer: ~$20/month
- Total: ~$275+/month minimum

**Best For:**
- Microservices architecture (5+ services)
- Teams already using Kubernetes
- Need for advanced deployment patterns
- High traffic (millions of requests/day)

**Setup Time**: 4-8 hours (initial), 1 hour (updates)

---

### Option 4: Single Compute Engine (Current Setup)

**Description**: Docker on single VM with manual management

**Pros:**
- ✅ **Simple**: Easy to understand and debug
- ✅ **Full control**: Direct access to VM
- ✅ **Low initial complexity**: No load balancer/orchestration
- ✅ **Cheap**: ~$30-50/month for single instance

**Cons:**
- ❌ **No HA**: Single point of failure (downtime during VM crash/maintenance)
- ❌ **Manual scaling**: Can't handle traffic spikes
- ❌ **Downtime on deploys**: Service interruption during updates
- ❌ **No auto-healing**: Requires manual intervention if crashed
- ❌ **Limited monitoring**: Manual setup needed

**Cost Estimate**:
- 1x e2-medium instance: ~$30/month
- No load balancer: $0
- Total: ~$30-40/month

**Best For:**
- Development/staging environments
- Very low traffic (<1000 requests/day)
- Proof of concept
- **NOT recommended for production 24x7**

**Availability**: ~95% (downtime during deploys, maintenance, crashes)

---

### Option 5: Compute Engine + Auto-Restart

**Description**: Single VM with systemd auto-restart and monitoring

**Pros:**
- ✅ **Better than Option 4**: Auto-restarts on crashes
- ✅ **Simple monitoring**: Basic health checks
- ✅ **Low cost**: ~$30-50/month
- ✅ **Easy migration**: Upgrade from current setup

**Cons:**
- ⚠️ **Still single instance**: No HA during VM maintenance/reboots
- ⚠️ **Downtime on deploys**: ~30-60 seconds during updates
- ❌ **No load balancing**: Can't scale horizontally
- ❌ **Manual failover**: Requires intervention for VM-level issues

**Cost Estimate**: ~$30-40/month (same as Option 4)

**Best For:**
- Budget-constrained deployments
- Low-medium traffic (<10K requests/day)
- Acceptable brief downtime windows
- Incremental improvement from current setup

**Availability**: ~98% (brief downtime during deploys)

---

## Recommendation Matrix

| Your Scenario | Recommended Strategy |
|---------------|---------------------|
| **Budget < $100/month, variable traffic** | Cloud Run |
| **Budget > $100/month, steady high traffic** | Managed Instance Group |
| **Multiple services, need advanced features** | GKE |
| **Very low traffic, dev/staging** | Single Compute Engine |
| **Current setup, need incremental improvement** | Auto-restart + Monitoring |

## Migration Path Recommendation

**Phase 1: Immediate (Week 1)**
1. Add health endpoint to webapp
2. Set up external monitoring (UptimeRobot)
3. Configure auto-restart (systemd)
4. **Result**: 98% availability, ~$0 additional cost

**Phase 2: Production-Ready (Week 2-3)**
1. Deploy to Cloud Run (parallel to existing)
2. Test thoroughly (load testing, user acceptance)
3. Switch DNS to Cloud Run
4. **Result**: 99.9% availability, ~$40-60/month

**Phase 3: Scale (Month 2+)**
- Monitor traffic patterns
- Optimize costs (adjust Cloud Run min instances)
- Consider multi-region if needed
- **Result**: Global availability, optimized costs

## Testing Checklist

Before deploying any strategy, test:

### Health & Monitoring
- [ ] Health endpoint responds correctly
- [ ] External monitoring configured (UptimeRobot, etc.)
- [ ] Alerts configured (email, Slack)
- [ ] Logs aggregated (Cloud Logging)

### Functionality
- [ ] Homepage loads
- [ ] URL submission works
- [ ] Task status updates correctly
- [ ] Backend API calls succeed
- [ ] Error handling works (invalid URLs, timeouts)

### Performance
- [ ] Page load time < 2 seconds
- [ ] API response time < 1 second
- [ ] No memory leaks (run for 24 hours)
- [ ] CPU usage acceptable under load

### Deployment
- [ ] Zero-downtime deploy works (or acceptable downtime)
- [ ] Rollback procedure tested
- [ ] Multiple consecutive deploys succeed
- [ ] No data loss during deploy

### Availability
- [ ] Service restarts automatically after crash
- [ ] Load balancer distributes traffic (if applicable)
- [ ] Graceful shutdown (finish in-flight requests)
- [ ] Traffic spike handling (if auto-scaling)

## Cost Comparison (Real Numbers)

**Scenario**: 1 million requests/month, average 100ms response time

| Strategy | Monthly Cost | Setup Cost (time) | Availability |
|----------|-------------|-------------------|--------------|
| Single Compute Engine | $35 | 30 min | 95% |
| CE + Auto-restart | $35 | 2 hours | 98% |
| Cloud Run | $45 | 30 min | 99.9% |
| Managed Instance Group (2 instances) | $90 | 4 hours | 99.9% |
| GKE (3 nodes) | $280 | 8 hours | 99.95% |

**Verdict**: Cloud Run offers best cost/availability ratio for most use cases.

## Next Steps

1. **Review your requirements**:
   - Budget constraints?
   - Traffic patterns?
   - Acceptable downtime?
   - Team expertise?

2. **Choose strategy** based on matrix above

3. **Read detailed guide**:
   - [cloud-run.md](./cloud-run.md) for Cloud Run migration
   - [managed-instance-group.md](./managed-instance-group.md) for MIG setup
   - [compute-engine.md](./compute-engine.md) for improved CE setup

4. **Test in staging** before production

5. **Monitor closely** for first 24-48 hours after migration

## Support

Questions? Check:
- [monitoring.md](./monitoring.md) for health checks and alerts
- [environment.md](./environment.md) for configuration
- Strategy-specific guides for detailed steps
