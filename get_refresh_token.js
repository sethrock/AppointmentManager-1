const { google } = require('googleapis');
const http = require('http');
const url = require('url');
const open = require('open');
const destroyer = require('server-destroy');
const readline = require('readline');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function getCredentials() {
  return new Promise((resolve) => {
    console.log('\n🔑 Google OAuth Token Generator\n');
    console.log('This script will generate a persistent refresh token for Google Calendar integration.\n');
    
    rl.question('Enter your Google Client ID: ', (clientId) => {
      rl.question('Enter your Google Client Secret: ', (clientSecret) => {
        resolve({ clientId, clientSecret });
      });
    });
  });
}

async function main() {
  try {
    const { clientId, clientSecret } = await getCredentials();
    const REDIRECT_URI = 'http://localhost:3000/oauth2callback';
    
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      REDIRECT_URI
    );
    
    // Scopes needed for calendar operations
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ];
    
    console.log('\n📋 Generating authorization URL...\n');
    
    const authorizeUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes.join(' '),
      prompt: 'consent' // Force consent screen to ensure refresh token
    });
    
    console.log('Your browser will open to authorize access.');
    console.log('If it doesn\'t open automatically, visit this URL:');
    console.log('\n' + authorizeUrl + '\n');
    
    // Start local server to handle callback
    const server = http.createServer(async (req, res) => {
      try {
        if (req.url.indexOf('/oauth2callback') > -1) {
          const qs = new url.URL(req.url, 'http://localhost:3000').searchParams;
          const code = qs.get('code');
          
          if (!code) {
            res.end('Error: No authorization code received.');
            server.destroy();
            rl.close();
            return;
          }
          
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
                <h1 style="color: #4CAF50;">✅ Authentication Successful!</h1>
                <p>You can close this window and return to your terminal.</p>
              </body>
            </html>
          `);
          
          server.destroy();
          
          console.log('\n🔄 Exchanging authorization code for tokens...\n');
          
          const { tokens } = await oauth2Client.getToken(code);
          
          if (!tokens.refresh_token) {
            console.error('❌ No refresh token received. This usually happens when:');
            console.error('1. The app has already been authorized (revoke access and try again)');
            console.error('2. The "access_type" wasn\'t set to "offline"');
            console.error('\nTo revoke access: https://myaccount.google.com/permissions');
          } else {
            console.log('✅ SUCCESS! Here are your tokens:\n');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('Add these to your environment variables:\n');
            console.log(`GOOGLE_CLIENT_ID=${clientId}`);
            console.log(`GOOGLE_CLIENT_SECRET=${clientSecret}`);
            console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            console.log('⚠️  IMPORTANT: For persistent tokens, ensure your Google Cloud app is PUBLISHED, not in Testing mode!');
            console.log('📍 Go to Google Cloud Console → APIs & Services → OAuth consent screen → Publishing status\n');
          }
          
          rl.close();
        }
      } catch (e) {
        console.error('Error:', e.message);
        server.destroy();
        rl.close();
      }
    }).listen(3000, () => {
      console.log('Local server started on http://localhost:3000');
      console.log('Opening browser for authentication...\n');
      
      // Try to open browser
      open(authorizeUrl, { wait: false }).then(cp => cp.unref()).catch(() => {
        console.log('Could not open browser automatically. Please visit the URL above.');
      });
    });
    
    destroyer(server);
    
  } catch (error) {
    console.error('Error:', error.message);
    rl.close();
  }
}

// Run the script
main();