# Google OAuth Setup Guide

This guide walks you through setting up Google OAuth for the Epistemic app.

## Prerequisites

- Google Cloud Console access
- A Google Cloud project (or create a new one)

## Step 1: Go to Google Cloud Console

1. Navigate to https://console.cloud.google.com/
2. Select or create a project for your application

## Step 2: Enable Google+ API

1. Go to **APIs & Services** > **Library**
2. Search for "Google+ API"
3. Click **Enable**

## Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** > **OAuth consent screen**
2. Select **External** user type (or Internal if you have Google Workspace)
3. Click **Create**
4. Fill in the required fields:
   - **App name**: Epistemic
   - **User support email**: Your email
   - **Developer contact information**: Your email
5. Click **Save and Continue**
6. **Scopes**: Click **Add or Remove Scopes**
   - Select: `.../auth/userinfo.email`
   - Select: `.../auth/userinfo.profile`
   - Select: `openid`
7. Click **Save and Continue**
8. **Test users** (for development): Add your test email addresses
9. Click **Save and Continue**
10. Review and click **Back to Dashboard**

## Step 4: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **+ CREATE CREDENTIALS** > **OAuth client ID**
3. Select **Application type**: Web application
4. **Name**: Epistemic Web Client
5. **Authorized JavaScript origins**:
   - Add: `http://localhost:7272`
   - Add: `http://200:d9ce:5252:7e25:c770:1715:a84e:ab3a:7272` (your server)
6. **Authorized redirect URIs**:
   - Add: `http://localhost:7272/epistemic/api/auth/callback`
   - Add: `http://200:d9ce:5252:7e25:c770:1715:a84e:ab3a:7272/epistemic/api/auth/callback`
7. Click **Create**
8. **IMPORTANT**: Save the **Client ID** and **Client Secret** that appear

## Step 5: Configure Environment Variables

1. Copy `.env.example` to `.env` in the epistemic folder:
   ```bash
   cd epistemic
   cp .env.example .env
   ```

2. Edit `.env` and add your credentials:
   ```bash
   GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret-here
   GOOGLE_REDIRECT_URI=http://localhost:7272/epistemic/api/auth/callback

   # Generate a random secret key for JWT
   JWT_SECRET_KEY=$(openssl rand -hex 32)
   ```

3. For production, update `GOOGLE_REDIRECT_URI` to your production URL

## Step 6: Test OAuth Flow

1. Start the epistemic app:
   ```bash
   cd ~/poc
   docker compose up --build -d epistemic
   ```

2. Visit: `http://localhost:7272/epistemic/`

3. The login flow:
   - Click "Sign in with Google" button (to be added to frontend)
   - You'll be redirected to Google consent screen
   - Grant permissions
   - You'll be redirected back to the app, now logged in

## Security Notes

### Development
- Use `http://localhost` for local development
- OAuth works fine over HTTP on localhost

### Production
- **MUST use HTTPS** in production
- Update all URLs to use `https://`
- Set secure cookie flag in production
- Never commit `.env` to git (it's in .gitignore)

## Troubleshooting

### "redirect_uri_mismatch" error
- Check that the redirect URI in your code matches exactly what's in Google Console
- Include the protocol (`http://` or `https://`)
- No trailing slashes

### "Error 400: invalid_client"
- Double-check your Client ID and Client Secret
- Make sure you're using Web application credentials, not other types

### "Access blocked: This app's request is invalid"
- Complete the OAuth consent screen configuration
- Add your email to test users if using External user type

### Can't test with other users
- If using External user type in development, app is limited to test users
- Either add them as test users, or publish the app (requires verification for production)

## Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Sign-In for server-side apps](https://developers.google.com/identity/sign-in/web/backend-auth)
