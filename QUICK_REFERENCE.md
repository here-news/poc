# Quick Reference - App Switching

## Switch Active App

```bash
# Use Makefile (easiest)
make use-jimmylai
make use-storychat

# Or use script directly
./switch-app.sh jimmylai
./switch-app.sh storychat

# Check current active app
make status
```

## Current URLs

### When jimmylai is active:
- `http://localhost:7272/app` → Jimmylai homepage
- `http://localhost:7272/api/` → Jimmylai API
- `http://localhost:7272/quest/{id}` → Quest detail pages
- `http://localhost:7272/assets/` → Jimmylai assets

### When storychat is active:
- `http://localhost:7272/app` → Storychat homepage
- `http://localhost:7272/api/` → Storychat API
- `http://localhost:7272/assets/` → Storychat assets

### Always Available:
- `http://localhost:7272/` → Gateway homepage
- `http://localhost:7272/switcher` → App switcher
- `http://localhost:7272/storychat/` → Storychat (namespaced)
- `http://localhost:7272/jimmylai/` → Jimmylai (namespaced)

## What Changed?

### ✅ Fixed
- Removed cookie-based routing (was causing bugs)
- Added explicit app switching via config files
- Added `/quest/` route for jimmylai
- Added database persistence for jimmylai
- Simplified debugging (just check symlink)

### 📁 New Files
- `nginx.conf.storychat` - Storychat config variant
- `nginx.conf.jimmylai` - Jimmylai config variant
- `switch-app.sh` - Switching script
- `Makefile` - Quick commands
- `APP_SWITCHING_GUIDE.md` - Full documentation
- `QUICK_REFERENCE.md` - This file

### 🔄 Modified Files
- `nginx.conf` → Now a symlink to active config
- `docker-compose.yml` → Added jimmylai data volume

## Troubleshooting

```bash
# Check which app is active
readlink nginx.conf

# Restart nginx
make restart-nginx

# Validate nginx config
docker exec re_news_gateway nginx -t

# View logs
docker logs re_news_gateway
docker logs jimmylai
docker logs storychat
```
