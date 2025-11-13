# App Switching Guide

This system allows you to switch which app is active at `/app`, `/api`, `/assets`, and `/ws/` routes.

## Quick Start

### Using Makefile (Easiest)
```bash
make use-storychat    # Switch to storychat
make use-jimmylai     # Switch to jimmylai
make status           # Check current active app
```

### Using Script Directly
```bash
./switch-app.sh storychat
./switch-app.sh jimmylai
```

## How It Works

1. **Multiple nginx configs**: Each app has its own config file
   - `nginx.conf.storychat` - Routes `/app` → storychat
   - `nginx.conf.jimmylai` - Routes `/app` → jimmylai

2. **Symlink switching**: `nginx.conf` is a symlink to the active config
   ```bash
   nginx.conf -> nginx.conf.storychat  # storychat is active
   ```

3. **Nginx restart**: After switching, nginx restarts (~2 seconds)

## Routes Overview

### Dynamic Routes (change with switch)
- `/app` - Active app's main page
- `/api/` - Active app's API
- `/assets/` - Active app's static assets
- `/ws/` - Active app's WebSocket endpoints

### Static Routes (always available)
- `/` - Gateway homepage
- `/switcher` - App switcher page
- `/storychat/` - Storychat (namespaced)
- `/jimmylai/` - Jimmylai (namespaced)

### Legacy Routes (storychat only)
- `/builder/`, `/result/`, `/entity/`, `/story/` - Storychat pages

## Adding a New App

1. **Create nginx config variant**:
   ```bash
   cp nginx.conf.storychat nginx.conf.newapp
   ```

2. **Update the "ACTIVE APP" section**:
   ```nginx
   # ========================================
   # ACTIVE APP: NEWAPP at /app
   # ========================================
   location /app {
       proxy_pass http://newapp:9000/;
       # ... headers
   }

   location /assets/ {
       proxy_pass http://newapp:9000/assets/;
   }

   location /api/ {
       proxy_pass http://newapp:9000/api/;
   }
   ```

3. **Add namespaced route**:
   ```nginx
   location /newapp/ {
       proxy_pass http://newapp:9000/;
   }
   ```

4. **Update switch script**:
   Edit `switch-app.sh` to recognize the new app name

5. **Update Makefile**:
   ```makefile
   use-newapp: ## Switch to newapp at /app
   	@./switch-app.sh newapp
   ```

## Advantages Over Cookie Routing

✅ **Predictable** - `/app` always shows same content for everyone
✅ **Shareable** - URLs work when sent to others
✅ **Debuggable** - Just check which config is active
✅ **Simple** - No dynamic routing complexity
✅ **Explicit** - You know exactly what's active

## Disadvantages

⚠️ **Manual switching** - Need to run a command
⚠️ **Nginx restart** - ~2 second downtime when switching
⚠️ **Single active app** - Can't have different apps for different users

## Troubleshooting

### Check current active app
```bash
make status
# or
readlink nginx.conf
```

### Manually switch config
```bash
ln -sf nginx.conf.jimmylai nginx.conf
docker-compose restart nginx
```

### Validate nginx config
```bash
docker exec re_news_gateway nginx -t
```

### View nginx logs
```bash
docker logs re_news_gateway
```

## File Structure
```
apps/
├── nginx.conf                  # Symlink to active config
├── nginx.conf.storychat        # Storychat variant
├── nginx.conf.jimmylai         # Jimmylai variant
├── switch-app.sh               # Switch script
├── Makefile                    # Quick commands
└── APP_SWITCHING_GUIDE.md      # This file
```
