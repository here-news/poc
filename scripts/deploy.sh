#!/bin/bash
# Deploy webapp - pulls latest code, copies secrets, runs docker-compose
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEBAPP_DIR="$(dirname "$SCRIPT_DIR")"
INFRA_DIR="$WEBAPP_DIR/../infra"
SECRETS_DIR="$INFRA_DIR/secrets"

echo "🚀 Deploying webapp..."

# Check webapp directory exists (should be current location)
if [ ! -d "$WEBAPP_DIR" ]; then
    echo "❌ Webapp directory not found: $WEBAPP_DIR"
    exit 1
fi

# Pull latest code
cd "$WEBAPP_DIR"
echo "📥 Pulling latest changes..."
git pull

# Copy secrets (remove existing to handle symlinks)
echo "🔐 Copying secrets..."
rm -f "$WEBAPP_DIR/.env"
cp "$SECRETS_DIR/.env.webapp" "$WEBAPP_DIR/.env"

# Stop old containers if running
echo "🛑 Stopping existing webapp containers..."
sudo docker compose down 2>/dev/null || true

# Build and start
echo "🏗️  Building and starting webapp..."
GIT_COMMIT=$(git rev-parse HEAD)
echo "📝 Building with commit: $GIT_COMMIT"
sudo docker compose build --build-arg GIT_COMMIT=$GIT_COMMIT
sudo docker compose up -d

echo ""
echo "✅ Webapp deployed successfully!"
echo ""
echo "📋 Useful commands:"
echo "   Logs:    sudo docker logs phi_here --tail 50 -f"
echo "   Status:  sudo docker compose ps"
echo "   Stop:    sudo docker compose down"
