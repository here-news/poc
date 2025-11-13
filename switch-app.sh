#!/bin/bash
#
# Switch Active App at /app
#
# Usage: ./switch-app.sh [storychat|jimmylai]
#
# This script swaps nginx config to route /app, /api, /assets, /ws to the selected app

set -e

APP=$1
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_DIR="$SCRIPT_DIR"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

show_usage() {
    echo ""
    echo "Usage: $0 [storychat|jimmylai|epistemic]"
    echo ""
    echo "Examples:"
    echo "  $0 storychat    # Make storychat active at /app"
    echo "  $0 jimmylai     # Make jimmylai active at /app"
    echo "  $0 epistemic    # Make epistemic active at /app"
    echo ""
    exit 1
}

# Validate argument
if [ -z "$APP" ]; then
    echo -e "${RED}Error: App name required${NC}"
    show_usage
fi

if [[ "$APP" != "storychat" && "$APP" != "jimmylai" && "$APP" != "epistemic" ]]; then
    echo -e "${RED}Error: Unknown app '$APP'${NC}"
    echo -e "${YELLOW}Available apps: storychat, jimmylai, epistemic${NC}"
    show_usage
fi

# Check if config file exists
CONFIG_FILE="$CONFIG_DIR/nginx.conf.$APP"
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}Error: Config file not found: $CONFIG_FILE${NC}"
    exit 1
fi

# Show current active app
CURRENT_TARGET=""
if [ -L "$CONFIG_DIR/nginx.conf" ]; then
    CURRENT_TARGET=$(readlink "$CONFIG_DIR/nginx.conf" | sed 's/.*nginx.conf.//')
fi

if [ -n "$CURRENT_TARGET" ]; then
    echo -e "${YELLOW}Current active app: $CURRENT_TARGET${NC}"
fi

# Check if already active
if [ "$CURRENT_TARGET" == "$APP" ]; then
    echo -e "${GREEN}✓ $APP is already active at /app${NC}"
    exit 0
fi

# Switch config
echo -e "${YELLOW}🔄 Switching to $APP...${NC}"

# Remove existing symlink or file
rm -f "$CONFIG_DIR/nginx.conf"

# Create new symlink
ln -sf "nginx.conf.$APP" "$CONFIG_DIR/nginx.conf"

echo -e "${YELLOW}📝 Config updated: nginx.conf -> nginx.conf.$APP${NC}"

# Restart nginx container
echo -e "${YELLOW}🔄 Restarting nginx...${NC}"
cd "$SCRIPT_DIR"
docker-compose restart nginx

echo ""
echo -e "${GREEN}✅ Success! $APP is now active at:${NC}"
echo -e "   ${GREEN}http://localhost:7272/app${NC}"
echo -e "   ${GREEN}http://localhost:7272/api/${NC}"
echo ""
echo -e "${YELLOW}📌 Namespaced routes still work:${NC}"
echo -e "   http://localhost:7272/storychat/"
echo -e "   http://localhost:7272/jimmylai/"
echo -e "   http://localhost:7272/epistemic/"
echo ""
