# Routing Strategy

## Current Issue

The nginx reverse proxy requires manually adding location blocks for each app's routes. This defeats the purpose of the dynamic beacon-based app framework, as new apps or new routes in existing apps require nginx config changes.

## Current App Routes

### Storychat Routes
- `/storychat/*` - Namespaced routes (work via nginx)
- `/story/*` - Story detail pages (explicit nginx rule)
- `/builder/*` - Builder interface (explicit nginx rule)
- `/result/*` - Result pages (explicit nginx rule)
- `/entity/*` - Entity pages (explicit nginx rule)

### JimmyLai Routes
- `/jimmylai/*` - Namespaced routes (work via nginx)

## Recommended Solutions

### Option 1: Enforce Namespaced Routes (Recommended)

**Pros:**
- Works with current nginx setup
- Simple and predictable
- Each app has clear boundaries
- No config changes needed for new apps

**Cons:**
- Requires updating storychat frontend to use namespaced routes
- URLs become longer

**Implementation:**
```nginx
# Only two rules needed:
location /storychat/ { ... }
location /jimmylai/ { ... }
```

All storychat routes become:
- `/storychat/builder/...`
- `/storychat/result/...`
- `/storychat/entity/...`

### Option 2: Route Registration in app.json

Apps declare their routes in `app.json`:

```json
{
  "id": "storychat",
  "routes": {
    "base": "/storychat",
    "app": "/storychat/app",
    "api": "/storychat/api",
    "frontend_routes": [
      "/builder/*",
      "/result/*",
      "/entity/*",
      "/story/*"
    ]
  }
}
```

Gateway generates nginx config dynamically and triggers reload.

**Pros:**
- Apps can declare their own routes
- Automatic nginx configuration

**Cons:**
- Complex implementation
- Requires nginx config generation
- Needs privileged access to reload nginx

### Option 3: Application-Level Reverse Proxy

Replace nginx with a FastAPI/Python-based reverse proxy that:
- Reads app registry from beacon system
- Routes based on registered patterns
- No config file needed

**Pros:**
- Fully dynamic routing
- Python-based, easier to maintain
- Can handle complex routing logic

**Cons:**
- Performance overhead
- More moving parts
- May be overkill for current needs

## Current Status

Using **hybrid approach**:
- Apps use their namespace prefix (`/storychat/`, `/jimmylai/`)
- Legacy storychat routes (`/builder/*`, `/story/*`) have explicit nginx rules
- API routes go to gateway (`/api/*`) or app-specific APIs (`/storychat/api/*`)

## Action Items

1. **Short term**: Add explicit nginx rules for storychat's non-namespaced routes (DONE)
2. **Medium term**: Update storychat frontend to use namespaced routes
3. **Long term**: Implement route registration in app.json + dynamic nginx config generation

## For New Apps

**Rule:** All new apps MUST use their namespace prefix for all routes.

Example for a new app "myapp":
- ✅ `/myapp/` - Homepage
- ✅ `/myapp/detail/123` - Detail page
- ✅ `/myapp/api/data` - API endpoint
- ❌ `/detail/123` - NO! Conflicts with other apps
- ❌ `/api/data` - NO! Use namespaced API routes

This ensures the app works without nginx config changes.
