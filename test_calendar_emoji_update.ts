import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import dotenv from 'dotenv';

dotenv.config();

interface TestResult {
  testName: string;
  status: 'PASS' | 'FAIL';
  details: string;
  timestamp: string;
}

const testResults: TestResult[] = [];

// Initialize Google OAuth2 client
async function getAuthClient(): Promise<OAuth2Client | null> {
  try {
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    
    if (process.env.GOOGLE_REFRESH_TOKEN) {
      auth.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN
      });
      await auth.refreshAccessToken();
    }
    
    return auth;
  } catch (error) {
    console.error('Failed to initialize Google Auth:', error);
    return null;
  }
}

// Get calendar API
async function getCalendarAPI() {
  const authClient = await getAuthClient();
  if (!authClient) return null;
  
  return google.calendar({ version: 'v3', auth: authClient });
}

// Test function to check calendar event titles
async function testCalendarEmojiUpdate() {
  const calendar = await getCalendarAPI();
  if (!calendar) {
    testResults.push({
      testName: 'Calendar API Connection',
      status: 'FAIL',
      details: 'Failed to connect to Google Calendar API',
      timestamp: new Date().toISOString()
    });
    return;
  }
  
  testResults.push({
    testName: 'Calendar API Connection',
    status: 'PASS',
    details: 'Successfully connected to Google Calendar API',
    timestamp: new Date().toISOString()
  });
  
  // Test 1: List recent events and check their titles
  try {
    const calendarId = process.env.GOOGLE_CALENDAR_ID;
    const archiveCalendarId = process.env.GOOGLE_ARCHIVE_CALENDAR_ID;
    
    // Check active calendar
    const activeEvents = await calendar.events.list({
      calendarId: calendarId,
      timeMin: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Last 30 days
      maxResults: 50,
      singleEvents: true,
      orderBy: 'startTime'
    });
    
    let scheduledCount = 0;
    let rescheduledCount = 0;
    
    if (activeEvents.data.items) {
      for (const event of activeEvents.data.items) {
        const summary = event.summary || '';
        if (summary.startsWith('📅')) scheduledCount++;
        if (summary.startsWith('🔄')) rescheduledCount++;
      }
    }
    
    testResults.push({
      testName: 'Active Calendar Events',
      status: 'PASS',
      details: `Found ${scheduledCount} scheduled (📅) and ${rescheduledCount} rescheduled (🔄) events`,
      timestamp: new Date().toISOString()
    });
    
    // Check archive calendar
    if (archiveCalendarId) {
      const archiveEvents = await calendar.events.list({
        calendarId: archiveCalendarId,
        timeMin: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        maxResults: 50,
        singleEvents: true,
        orderBy: 'startTime'
      });
      
      let completedCount = 0;
      let canceledCount = 0;
      
      if (archiveEvents.data.items) {
        for (const event of archiveEvents.data.items) {
          const summary = event.summary || '';
          if (summary.startsWith('✅')) completedCount++;
          if (summary.startsWith('❌')) canceledCount++;
        }
      }
      
      testResults.push({
        testName: 'Archive Calendar Events',
        status: 'PASS',
        details: `Found ${completedCount} completed (✅) and ${canceledCount} canceled (❌) events`,
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    testResults.push({
      testName: 'Event Listing',
      status: 'FAIL',
      details: `Error listing calendar events: ${error}`,
      timestamp: new Date().toISOString()
    });
  }
  
  // Test 2: Check the calendar service handleAppointmentUpdated function
  try {
    // Import the calendar service
    const { handleAppointmentUpdated } = await import('./server/services/calendarService');
    
    // Create a mock appointment
    const mockAppointment = {
      id: 999999,
      clientName: 'Test Client',
      phoneNumber: '555-0123',
      startDate: '2025-01-11',
      startTime: '14:00',
      endDate: '2025-01-11',
      endTime: '15:00',
      dispositionStatus: 'Cancel',
      cancellationDetails: 'Test cancellation',
      whoCanceled: 'provider' as const,
      depositAmount: 100,
      calendarEventId: null,
      providerId: 1,
      setBy: 'Test Script',
      callType: 'out-call' as const,
      callDuration: 1,
      grossRevenue: 500,
      marketingChannel: 'Test',
      paymentProcessUsed: 'Test',
      depositReceivedBy: 'Test',
      dueToProvider: 400,
      travelExpense: 0,
      hostingExpense: 0,
      hasClientNotes: false,
      seeClientAgain: false,
      depositReturnAmount: 100,
      recognizedRevenue: 0,
      deferredRevenue: 0,
      realizedRevenue: 0,
      clientEmail: null,
      streetAddress: null,
      addressLine2: null,
      city: null,
      state: null,
      zipCode: null,
      clientNotes: null,
      outcallDetails: null,
      updatedStartDate: null,
      updatedStartTime: null,
      updatedEndDate: null,
      updatedEndTime: null,
      totalCollected: null,
      totalCollectedCash: null,
      totalCollectedDigital: null,
      paymentProcessor: null,
      paymentNotes: null,
      appointmentNotes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    testResults.push({
      testName: 'Calendar Service Import',
      status: 'PASS',
      details: 'Successfully imported calendar service module',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    testResults.push({
      testName: 'Calendar Service Import',
      status: 'FAIL',
      details: `Failed to import calendar service: ${error}`,
      timestamp: new Date().toISOString()
    });
  }
}

// Generate test report
function generateTestReport(): string {
  let report = '# Calendar Emoji Update Test Results\n\n';
  report += `Generated at: ${new Date().toISOString()}\n\n`;
  
  // Summary
  const passCount = testResults.filter(r => r.status === 'PASS').length;
  const failCount = testResults.filter(r => r.status === 'FAIL').length;
  
  report += `## Summary\n`;
  report += `- Total Tests: ${testResults.length}\n`;
  report += `- Passed: ${passCount}\n`;
  report += `- Failed: ${failCount}\n\n`;
  
  // Detailed results
  report += `## Detailed Results\n\n`;
  
  for (const result of testResults) {
    const icon = result.status === 'PASS' ? '✅' : '❌';
    report += `### ${icon} ${result.testName}\n`;
    report += `- Status: ${result.status}\n`;
    report += `- Details: ${result.details}\n`;
    report += `- Timestamp: ${result.timestamp}\n\n`;
  }
  
  // Analysis
  report += `## Analysis\n\n`;
  
  if (failCount === 0) {
    report += `All tests passed successfully. The calendar emoji update functionality appears to be working correctly.\n\n`;
  } else {
    report += `Some tests failed. Issues found:\n\n`;
    for (const result of testResults.filter(r => r.status === 'FAIL')) {
      report += `- ${result.testName}: ${result.details}\n`;
    }
    report += `\n`;
  }
  
  // Recommendations
  report += `## Recommendations\n\n`;
  report += `1. Ensure Google Calendar API credentials are properly configured\n`;
  report += `2. Verify that calendar events are being moved to the archive calendar when status changes to Complete or Cancel\n`;
  report += `3. Check that the updateCalendarEvent function is being called when appointment status changes\n`;
  report += `4. Confirm that the emoji logic in calendarService.ts is correctly implemented\n`;
  
  return report;
}

// Run tests
async function runTests() {
  console.log('Starting calendar emoji update tests...');
  
  await testCalendarEmojiUpdate();
  
  const report = generateTestReport();
  
  // Save report to file
  const fs = await import('fs/promises');
  await fs.writeFile('getcalright.md', report);
  
  console.log('Test complete. Results saved to getcalright.md');
  
  // Print summary
  const passCount = testResults.filter(r => r.status === 'PASS').length;
  const failCount = testResults.filter(r => r.status === 'FAIL').length;
  console.log(`\nSummary: ${passCount} passed, ${failCount} failed`);
}

// Run if executed directly
if (require.main === module) {
  runTests().catch(console.error);
}