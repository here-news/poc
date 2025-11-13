#!/bin/bash
# Automated OAuth Client Creation using Google Cloud APIs
set -e

PROJECT_ID="here2-474221"
CLIENT_NAME="Epistemic Web Client"

echo "=========================================="
echo "Creating OAuth 2.0 Client for Epistemic"
echo "=========================================="
echo ""

# Get access token
echo "Getting access token..."
ACCESS_TOKEN=$(gcloud auth application-default print-access-token)

# Create OAuth client using REST API
echo "Creating OAuth client..."
RESPONSE=$(curl -s -X POST \
  "https://iap.googleapis.com/v1/projects/${PROJECT_ID}/brands/-/identityAwareProxyClients" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "'"${CLIENT_NAME}"'",
    "type": "WEB",
    "redirectUris": [
      "http://localhost:7272/epistemic/api/auth/callback",
      "https://here.news/epistemic/api/auth/callback"
    ],
    "javascriptOrigins": [
      "http://localhost:7272",
      "https://here.news"
    ]
  }')

echo "Response:"
echo "$RESPONSE" | jq '.'

if echo "$RESPONSE" | jq -e '.name' > /dev/null 2>&1; then
    echo ""
    echo "✅ OAuth client created successfully!"
    echo ""
    CLIENT_ID=$(echo "$RESPONSE" | jq -r '.name' | awk -F'/' '{print $NF}')
    echo "Client ID: $CLIENT_ID"
    echo ""
    echo "⚠️  Note: You'll need to get the Client Secret from the Google Cloud Console:"
    echo "https://console.cloud.google.com/apis/credentials?project=${PROJECT_ID}"
else
    echo ""
    echo "❌ Failed to create OAuth client"
    echo "You may need to:"
    echo "1. Configure the OAuth consent screen first"
    echo "2. Enable the IAP API"
    echo ""
    echo "Manual setup URL:"
    echo "https://console.cloud.google.com/apis/credentials?project=${PROJECT_ID}"
fi
