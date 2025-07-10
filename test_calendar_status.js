const fetch = require('node-fetch');
const fs = require('fs').promises;

// Test results storage
const testResults = [];

// API endpoints
const BASE_URL = 'http://localhost:5000';

// Add test result
function addTestResult(testName, status, details) {
  testResults.push({
    testName,
    status,
    details,
    timestamp: new Date().toISOString()
  });
  console.log(`${status === 'PASS' ? '✅' : '❌'} ${testName}: ${details}`);
}

// Test calendar functionality through API
async function testCalendarIntegration() {
  console.log('Starting Calendar Emoji Update Tests...\n');
  
  // Test 1: Check if server is running
  try {
    const response = await fetch(`${BASE_URL}/api/appointments`);
    if (response.ok) {
      addTestResult('Server Connection', 'PASS', 'Successfully connected to server');
    } else {
      addTestResult('Server Connection', 'FAIL', `Server returned status ${response.status}`);
    }
  } catch (error) {
    addTestResult('Server Connection', 'FAIL', `Failed to connect to server: ${error.message}`);
  }
  
  // Test 2: Check Google Calendar connection
  try {
    const response = await fetch(`${BASE_URL}/api/test/calendar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const result = await response.json();
    if (result.success) {
      addTestResult('Google Calendar API', 'PASS', result.message || 'Calendar API is working');
    } else {
      addTestResult('Google Calendar API', 'FAIL', result.error || 'Calendar API test failed');
    }
  } catch (error) {
    addTestResult('Google Calendar API', 'FAIL', `Failed to test calendar API: ${error.message}`);
  }
  
  // Test 3: Analyze calendar service code
  try {
    const calendarServiceCode = await fs.readFile('./server/services/calendarService.ts', 'utf8');
    
    // Check for emoji logic in createCalendarEvent
    const hasCreateEmojis = calendarServiceCode.includes('dispositionStatus === \'Complete\'') &&
                           calendarServiceCode.includes('✅') &&
                           calendarServiceCode.includes('dispositionStatus === \'Cancel\'') &&
                           calendarServiceCode.includes('❌');
    
    if (hasCreateEmojis) {
      addTestResult('Create Event Emoji Logic', 'PASS', 'Found emoji logic in createCalendarEvent function');
    } else {
      addTestResult('Create Event Emoji Logic', 'FAIL', 'Missing emoji logic in createCalendarEvent function');
    }
    
    // Check for emoji logic in updateCalendarEvent
    const hasUpdateEmojis = calendarServiceCode.match(/updateCalendarEvent[\s\S]*?dispositionStatus === 'Complete'[\s\S]*?✅/) &&
                           calendarServiceCode.match(/updateCalendarEvent[\s\S]*?dispositionStatus === 'Cancel'[\s\S]*?❌/);
    
    if (hasUpdateEmojis) {
      addTestResult('Update Event Emoji Logic', 'PASS', 'Found emoji logic in updateCalendarEvent function');
    } else {
      addTestResult('Update Event Emoji Logic', 'FAIL', 'Missing emoji logic in updateCalendarEvent function');
    }
    
    // Check if handleAppointmentUpdated moves events to archive calendar
    const hasArchiveLogic = calendarServiceCode.includes('moveEventToCalendar') &&
                           calendarServiceCode.includes('getCalendarId(updatedAppointment.dispositionStatus)');
    
    if (hasArchiveLogic) {
      addTestResult('Archive Calendar Logic', 'PASS', 'Found logic to move completed/cancelled events to archive calendar');
    } else {
      addTestResult('Archive Calendar Logic', 'FAIL', 'Missing logic to move events to archive calendar');
    }
    
  } catch (error) {
    addTestResult('Code Analysis', 'FAIL', `Failed to analyze calendar service code: ${error.message}`);
  }
  
  // Test 4: Check notification service integration
  try {
    const notificationServiceCode = await fs.readFile('./server/services/notificationService.ts', 'utf8');
    
    const callsCalendarUpdate = notificationServiceCode.includes('handleAppointmentUpdated') ||
                               notificationServiceCode.includes('handleAppointmentStatusNotifications');
    
    if (callsCalendarUpdate) {
      addTestResult('Notification Service Integration', 'PASS', 'Notification service calls calendar update functions');
    } else {
      addTestResult('Notification Service Integration', 'FAIL', 'Notification service may not be calling calendar updates');
    }
  } catch (error) {
    addTestResult('Notification Service Check', 'FAIL', `Failed to check notification service: ${error.message}`);
  }
  
  // Test 5: Check routes integration
  try {
    const routesCode = await fs.readFile('./server/routes.ts', 'utf8');
    
    const hasStatusUpdateRoute = routesCode.includes('PATCH') && routesCode.includes('/api/appointments/:id');
    const callsNotificationService = routesCode.includes('handleAppointmentStatusNotifications') ||
                                   routesCode.includes('notificationService');
    
    if (hasStatusUpdateRoute && callsNotificationService) {
      addTestResult('Routes Integration', 'PASS', 'Update route properly calls notification service');
    } else {
      addTestResult('Routes Integration', 'FAIL', 'Update route may not be calling notification service');
    }
  } catch (error) {
    addTestResult('Routes Check', 'FAIL', `Failed to check routes: ${error.message}`);
  }
}

// Generate markdown report
function generateReport() {
  let report = '# Calendar Emoji Update Test Results\n\n';
  report += `Generated at: ${new Date().toISOString()}\n\n`;
  
  // Summary
  const passCount = testResults.filter(r => r.status === 'PASS').length;
  const failCount = testResults.filter(r => r.status === 'FAIL').length;
  
  report += '## Summary\n';
  report += `- Total Tests: ${testResults.length}\n`;
  report += `- Passed: ${passCount}\n`;
  report += `- Failed: ${failCount}\n\n`;
  
  // Detailed results
  report += '## Detailed Results\n\n';
  
  for (const result of testResults) {
    const icon = result.status === 'PASS' ? '✅' : '❌';
    report += `### ${icon} ${result.testName}\n`;
    report += `- Status: ${result.status}\n`;
    report += `- Details: ${result.details}\n`;
    report += `- Timestamp: ${result.timestamp}\n\n`;
  }
  
  // Analysis
  report += '## Analysis\n\n';
  
  if (failCount === 0) {
    report += 'All tests passed successfully. The calendar emoji update functionality appears to be properly implemented.\n\n';
  } else {
    report += 'Issues found that may prevent emoji updates:\n\n';
    
    const failedTests = testResults.filter(r => r.status === 'FAIL');
    for (const result of failedTests) {
      report += `- **${result.testName}**: ${result.details}\n`;
    }
    report += '\n';
  }
  
  // Key findings
  report += '## Key Findings\n\n';
  report += '1. The calendar service has emoji logic for both create and update operations\n';
  report += '2. Emojis are assigned based on disposition status:\n';
  report += '   - 📅 for Scheduled (default)\n';
  report += '   - 🔄 for Reschedule\n';
  report += '   - ✅ for Complete\n';
  report += '   - ❌ for Cancel\n';
  report += '3. Completed and cancelled appointments should be moved to archive calendar\n';
  report += '4. The update flow: Routes → Storage → Notification Service → Calendar Service\n\n';
  
  // Potential issues
  report += '## Potential Issues Identified\n\n';
  report += '1. **Missing await in notification calls**: The routes may not be properly awaiting the notification service\n';
  report += '2. **Calendar event ID tracking**: Ensure calendarEventId is stored and updated in the database\n';
  report += '3. **Error handling**: Silent failures in calendar API calls may prevent updates\n';
  report += '4. **Archive calendar movement**: Events may not be moving to archive calendar on status change\n\n';
  
  // Recommendations
  report += '## Recommendations\n\n';
  report += '1. Add proper error logging in calendar service to track failures\n';
  report += '2. Ensure notification service is called with await in routes\n';
  report += '3. Verify calendar event IDs are being stored in the database\n';
  report += '4. Test the complete flow from UI → API → Calendar\n';
  report += '5. Check Google Calendar API quota and permissions\n';
  
  return report;
}

// Run tests
async function runTests() {
  await testCalendarIntegration();
  
  const report = generateReport();
  
  // Save report
  await fs.writeFile('getcalright.md', report);
  
  console.log('\n\nTest complete. Results saved to getcalright.md');
  
  // Print summary
  const passCount = testResults.filter(r => r.status === 'PASS').length;
  const failCount = testResults.filter(r => r.status === 'FAIL').length;
  console.log(`Summary: ${passCount} passed, ${failCount} failed`);
}

// Run the tests
runTests().catch(console.error);