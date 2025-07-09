# Getting a Persistent Google OAuth Refresh Token

## Step 1: Verify Your Google Cloud Project Settings

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project (or create a new one if needed)
3. Navigate to **APIs & Services** → **OAuth consent screen**
4. **IMPORTANT**: Check the "Publishing status"
   - If it shows "Testing", click **PUBLISH APP**
   - This is crucial - apps in "Testing" mode have tokens that expire after 7 days
   - When publishing, Google may ask for verification details - you can publish for "Internal" use if this is just for your organization

## Step 2: Create or Update OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID** (or use existing)
3. Choose **Web application**
4. Add authorized redirect URIs:
   - `https://developers.google.com/oauthplayground`
   - `http://localhost` (for our script method)
5. Save and copy your **Client ID** and **Client Secret**

## Step 3: Enable Required APIs

1. Go to **APIs & Services** → **Library**
2. Search and enable:
   - Google Calendar API
   - Gmail API (if using email features)

## Step 4: Generate Persistent Refresh Token

### Method A: Using Our Custom Script (Recommended for Persistence)

I'll create a Node.js script that properly handles the OAuth flow:

```javascript
// Save this as get_refresh_token.js
const { google } = require('googleapis');
const http = require('http');
const url = require('url');
const open = require('open');
const destroyer = require('server-destroy');

// Replace these with your credentials
const CLIENT_ID = 'YOUR_CLIENT_ID';
const CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
const REDIRECT_URI = 'http://localhost:3000/oauth2callback';

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// Scopes needed for calendar operations
const scopes = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events'
];

async function getRefreshToken() {
  return new Promise((resolve, reject) => {
    const authorizeUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes.join(' '),
      prompt: 'consent' // Force consent screen to ensure refresh token
    });
    
    const server = http.createServer(async (req, res) => {
      try {
        if (req.url.indexOf('/oauth2callback') > -1) {
          const qs = new url.URL(req.url, 'http://localhost:3000').searchParams;
          const code = qs.get('code');
          
          res.end('Authentication successful! You can close this window.');
          server.destroy();
          
          const { tokens } = await oauth2Client.getToken(code);
          resolve(tokens);
        }
      } catch (e) {
        reject(e);
      }
    }).listen(3000, () => {
      console.log('Opening browser for authentication...');
      open(authorizeUrl, { wait: false }).then(cp => cp.unref());
    });
    
    destroyer(server);
  });
}

getRefreshToken()
  .then(tokens => {
    console.log('\n✅ Success! Here are your tokens:\n');
    console.log('GOOGLE_REFRESH_TOKEN=' + tokens.refresh_token);
    console.log('\nThis refresh token is persistent and won\'t expire.');
    console.log('Make sure your app is in "Published" status in Google Cloud Console.');
  })
  .catch(console.error);
```

### Method B: Using OAuth Playground (Less Reliable)

If you must use the OAuth Playground:

1. Go to [OAuth 2.0 Playground](https://developers.google.com/oauthplayground)
2. Click the gear icon (⚙️) in the top right
3. Check "Use your own OAuth credentials"
4. Enter your Client ID and Client Secret
5. In the left panel, select:
   - Google Calendar API v3 → all scopes
6. Click "Authorize APIs"
7. Sign in and grant permissions
8. Click "Exchange authorization code for tokens"
9. Copy the refresh token

## Step 5: Verify Token Persistence

To ensure your token won't expire:

1. **App Publishing Status**: Must be "Published" not "Testing"
2. **Proper Scopes**: Use the exact scopes needed
3. **Force Consent**: Always use `prompt=consent` to get refresh token
4. **Verify Token**: Test immediately after generation

## Step 6: Update Your Environment Variables

Once you have the persistent refresh token:

```bash
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REFRESH_TOKEN=your_refresh_token
GOOGLE_CALENDAR_ID=your_primary_calendar_id
GOOGLE_ARCHIVE_CALENDAR_ID=your_archive_calendar_id
```

## Troubleshooting Token Expiration

If tokens keep expiring, check:

1. **Publishing Status**: #1 cause of expiring tokens
2. **Token Limits**: Google limits refresh tokens per client/user combination
3. **Revoked Access**: Check if access was revoked in Google Account settings
4. **API Quotas**: Ensure you're not hitting API limits

## Important Notes

- Tokens from apps in "Testing" mode expire after 7 days
- Published apps have persistent tokens that don't expire
- Each client/user combination can have ~50 refresh tokens
- Generating new tokens may invalidate old ones after the limit