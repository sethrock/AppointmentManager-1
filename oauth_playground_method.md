# Getting Google Refresh Token via OAuth Playground

Since the automated script had connection issues, let's use the OAuth Playground with your credentials:

## Your Credentials
- Client ID: `790341112586-4ii06fk8d5ggtlho1l9njhjcs0m3lvl4.apps.googleusercontent.com`
- Client Secret: (you'll need this from Google Cloud Console)

## Steps:

1. **Get your Client Secret**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Navigate to **APIs & Services** → **Credentials**
   - Click on your OAuth client ID
   - Copy the **Client Secret**

2. **Configure OAuth Playground**
   - Go to [OAuth 2.0 Playground](https://developers.google.com/oauthplayground)
   - Click the gear icon ⚙️ in the top right
   - Check ✓ **"Use your own OAuth credentials"**
   - Enter:
     - OAuth Client ID: `790341112586-4ii06fk8d5ggtlho1l9njhjcs0m3lvl4.apps.googleusercontent.com`
     - OAuth Client Secret: (paste your secret here)
   - Click "Close"

3. **Select Calendar Scopes**
   - In the left panel, find **Google Calendar API v3**
   - Check these scopes:
     - ✓ `https://www.googleapis.com/auth/calendar`
     - ✓ `https://www.googleapis.com/auth/calendar.events`

4. **Authorize and Get Token**
   - Click **"Authorize APIs"** button
   - Sign in with your Google account
   - Grant all requested permissions
   - You'll be redirected back to the playground
   - Click **"Exchange authorization code for tokens"**

5. **Copy Your Refresh Token**
   - In the response, you'll see:
   ```json
   {
     "access_token": "...",
     "refresh_token": "YOUR_REFRESH_TOKEN_HERE",
     "scope": "...",
     "token_type": "Bearer"
   }
   ```
   - Copy the value of `refresh_token`

## Important Notes:
- Since you've already published your app, this refresh token will be **persistent**
- Make sure you're using the same Google account that owns the calendars
- The refresh token will look something like: `1//0gLu...` (starts with 1//)

## After Getting the Token:
Let me know when you have the refresh token and I'll help you update the environment variables.