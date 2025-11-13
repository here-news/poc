#!/bin/bash
# OAuth Configuration Helper for Epistemic
# This script guides you through manual OAuth setup with exact values

PROJECT_ID="here2-474221"

echo "=========================================="
echo "Epistemic OAuth Configuration Guide"
echo "=========================================="
echo ""
echo "Project: $PROJECT_ID"
echo ""
echo "📋 STEP 1: Configure OAuth Consent Screen"
echo "=========================================="
echo ""
echo "Open this URL:"
echo "https://console.cloud.google.com/apis/credentials/consent?project=$PROJECT_ID"
echo ""
echo "Settings to use:"
echo "  • User Type: External"
echo "  • App name: Epistemic"
echo "  • User support email: (your email)"
echo "  • Developer contact: (your email)"
echo ""
echo "Scopes to add:"
echo "  • .../auth/userinfo.email"
echo "  • .../auth/userinfo.profile"
echo "  • openid"
echo ""
read -p "Press Enter when OAuth consent screen is configured..."
echo ""

echo "📋 STEP 2: Create OAuth Client ID"
echo "=========================================="
echo ""
echo "Open this URL:"
echo "https://console.cloud.google.com/apis/credentials?project=$PROJECT_ID"
echo ""
echo "Click: + CREATE CREDENTIALS → OAuth client ID"
echo ""
echo "⚙️  Configuration:"
echo "-------------------"
echo "Application type: Web application"
echo "Name: Epistemic Web Client"
echo ""
echo "Authorized JavaScript origins:"
echo "  http://localhost:7272"
echo "  https://here.news"
echo ""
echo "Authorized redirect URIs:"
echo "  http://localhost:7272/epistemic/api/auth/callback"
echo "  https://here.news/epistemic/api/auth/callback"
echo ""
read -p "Press Enter when you've clicked CREATE..."
echo ""

echo "📋 STEP 3: Save Credentials"
echo "=========================================="
echo ""
read -p "Enter your Client ID: " CLIENT_ID
read -p "Enter your Client Secret: " CLIENT_SECRET
echo ""

# Create .env file
cat > .env <<EOF
# Google OAuth Configuration
GOOGLE_CLIENT_ID=$CLIENT_ID
GOOGLE_CLIENT_SECRET=$CLIENT_SECRET
GOOGLE_REDIRECT_URI=http://localhost:7272/epistemic/api/auth/callback

# JWT Configuration (generate new secret for production!)
JWT_SECRET_KEY=$(openssl rand -hex 32)
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440

# Database
DATABASE_URL=sqlite:///./epistemic.db

# App Configuration
BASE_PATH=/epistemic
GATEWAY_URL=http://gateway:3000
EOF

echo "✅ Created .env file with your credentials!"
echo ""
echo "📝 Next steps:"
echo "1. Review the .env file: cat .env"
echo "2. Rebuild the epistemic container:"
echo "   cd ~/poc"
echo "   docker compose up --build -d epistemic"
echo "3. Test OAuth login at: http://localhost:7272/epistemic/"
echo ""
echo "🔒 Security notes:"
echo "  • Never commit .env to git (already in .gitignore)"
echo "  • For production (here.news), create a separate OAuth client"
echo "  • Or update GOOGLE_REDIRECT_URI to: https://here.news/epistemic/api/auth/callback"
echo ""
