import { google } from 'googleapis';

console.log('\n🔍 Google OAuth Debug Information\n');

// Check environment variables
console.log('Environment Variables:');
console.log('---------------------');
console.log(`GOOGLE_CLIENT_ID: ${process.env.GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Not set'}`);
console.log(`GOOGLE_CLIENT_SECRET: ${process.env.GOOGLE_CLIENT_SECRET ? '✅ Set' : '❌ Not set'}`);
console.log(`GOOGLE_REFRESH_TOKEN: ${process.env.GOOGLE_REFRESH_TOKEN ? '✅ Set' : '❌ Not set'}`);
console.log(`GOOGLE_CALENDAR_ID: ${process.env.GOOGLE_CALENDAR_ID ? '✅ Set' : '❌ Not set'}`);
console.log(`GOOGLE_ARCHIVE_CALENDAR_ID: ${process.env.GOOGLE_ARCHIVE_CALENDAR_ID ? '✅ Set' : '❌ Not set'}`);

// Show partial client ID for verification
if (process.env.GOOGLE_CLIENT_ID) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  console.log(`\nClient ID (first 20 chars): ${clientId.substring(0, 20)}...`);
}

// Test OAuth connection
console.log('\n\nTesting OAuth Connection:');
console.log('------------------------');

try {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
  });

  console.log('OAuth client created successfully');
  
  // Try to refresh the token
  console.log('\nAttempting to refresh access token...');
  const { credentials } = await oauth2Client.refreshAccessToken();
  
  if (credentials.access_token) {
    console.log('✅ Successfully refreshed access token!');
    console.log(`Access token expires in: ${Math.round((credentials.expiry_date - Date.now()) / 1000 / 60)} minutes`);
    
    // Try to list calendars
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    console.log('\nTesting calendar access...');
    
    const response = await calendar.calendarList.list();
    console.log(`\n✅ Calendar API working! Found ${response.data.items?.length || 0} calendars:`);
    
    response.data.items?.forEach((cal, index) => {
      console.log(`${index + 1}. ${cal.summary} (${cal.id})`);
    });
  }
} catch (error) {
  console.error('\n❌ Error:', error.message);
  
  if (error.message.includes('invalid_grant')) {
    console.log('\nPossible causes:');
    console.log('1. The refresh token was generated with different OAuth credentials');
    console.log('2. The refresh token was copied incorrectly');
    console.log('3. The Google account access was revoked');
    console.log('4. Redirect URI mismatch between token generation and current setup');
    
    console.log('\nTo fix:');
    console.log('1. Verify the Client ID matches: 790341112586-4ii06fk8d5ggtlho1l9njhjcs0m3lvl4.apps.googleusercontent.com');
    console.log('2. Make sure the Client Secret is correct');
    console.log('3. Generate a new refresh token using the exact same OAuth credentials');
  }
}

process.exit(0);