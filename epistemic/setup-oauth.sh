#!/bin/bash
# OAuth Setup Script for Epistemic App
# This script creates OAuth 2.0 credentials for the Epistemic app

set -e

PROJECT_ID="here2-474221"
CLIENT_NAME="epistemic-web-client"

echo "=========================================="
echo "Epistemic OAuth Setup"
echo "=========================================="
echo ""
echo "Project: $PROJECT_ID"
echo ""

# Set the project
echo "Setting GCP project..."
gcloud config set project $PROJECT_ID

echo ""
echo "Note: OAuth consent screen must be configured manually via:"
echo "https://console.cloud.google.com/apis/credentials/consent?project=$PROJECT_ID"
echo ""
echo "Required OAuth consent screen settings:"
echo "  - User Type: External"
echo "  - App name: Epistemic"
echo "  - Scopes: email, profile, openid"
echo ""
read -p "Have you configured the OAuth consent screen? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Please configure the OAuth consent screen first, then re-run this script."
    exit 1
fi

echo ""
echo "Creating OAuth 2.0 client..."
echo ""
echo "The client will be configured with:"
echo "  JavaScript origins:"
echo "    - http://localhost:7272"
echo "    - https://here.news"
echo ""
echo "  Redirect URIs:"
echo "    - http://localhost:7272/epistemic/api/auth/callback"
echo "    - https://here.news/epistemic/api/auth/callback"
echo ""

# Unfortunately, gcloud doesn't have a direct command to create OAuth clients
# We need to use the REST API or do it manually

echo "=========================================="
echo "Manual OAuth Client Creation Required"
echo "=========================================="
echo ""
echo "Unfortunately, gcloud CLI doesn't support creating OAuth clients directly."
echo "Please create the OAuth client manually:"
echo ""
echo "1. Go to: https://console.cloud.google.com/apis/credentials?project=$PROJECT_ID"
echo "2. Click: + CREATE CREDENTIALS > OAuth client ID"
echo "3. Application type: Web application"
echo "4. Name: Epistemic Web Client"
echo "5. Authorized JavaScript origins:"
echo "   - http://localhost:7272"
echo "   - https://here.news"
echo "6. Authorized redirect URIs:"
echo "   - http://localhost:7272/epistemic/api/auth/callback"
echo "   - https://here.news/epistemic/api/auth/callback"
echo "7. Click CREATE"
echo "8. Copy the Client ID and Client Secret"
echo ""
echo "Then run: ./configure-oauth-env.sh <CLIENT_ID> <CLIENT_SECRET>"
echo ""
