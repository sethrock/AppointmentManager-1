import { log } from '../vite';
import { getAuthClient } from './calendarService';
import { sendEmail } from './emailService';

/**
 * Test Google Calendar connection
 */
export async function testCalendarConnection(): Promise<boolean> {
  try {
    const auth = getAuthClient();
    if (!auth) {
      log('Failed to initialize Google auth client', 'testService');
      return false;
    }

    // Test getting token info - this will validate the refresh token
    const tokenInfo = await auth.getTokenInfo(auth.credentials.access_token || '');
    log(`Successfully connected to Google API (scopes: ${tokenInfo.scopes.join(', ')})`, 'testService');
    return true;
  } catch (error) {
    log(`Error testing calendar connection: ${error}`, 'testService');
    return false;
  }
}

/**
 * Test Gmail sending
 */
export async function testEmailSending(): Promise<boolean> {
  try {
    const to = process.env.NOTIFICATION_EMAIL || '';
    if (!to) {
      log('No notification email configured for testing', 'testService');
      return false;
    }

    const subject = 'Test Email from Appointment System';
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #2c3e50;">Email Test Successful</h2>
        <p>This is a test email from your appointment notification system.</p>
        <p>If you're receiving this, it means your email configuration is working correctly.</p>
        <p style="margin-top: 30px; font-size: 12px; color: #7f8c8d;">
          This is an automated message. Please do not reply to this email.
        </p>
      </div>
    `;

    return await sendEmail(to, subject, html);
  } catch (error) {
    log(`Error testing email sending: ${error}`, 'testService');
    return false;
  }
}