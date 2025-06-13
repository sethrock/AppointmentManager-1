import { Appointment } from '@shared/schema';
import { log } from '../vite';
import { google, Auth, calendar_v3 } from 'googleapis';
import { storage } from '../storage';
import { formatDate, formatTime } from '../../client/src/lib/format';

// Calendar IDs for different appointment statuses
const CALENDARS = {
  // Main calendar for active appointments
  active: process.env.GOOGLE_CALENDAR_ID,
  // Archive calendar for completed/cancelled appointments
  archive: process.env.GOOGLE_ARCHIVE_CALENDAR_ID
};

// Time zone to use for calendar events
const TIME_ZONE = 'America/Los_Angeles'; // California timezone

// Initialize Google Auth
let auth: Auth.OAuth2Client | null = null;

/**
 * Initialize the Google API auth client
 */
export async function getAuthClient(): Promise<Auth.OAuth2Client | null> {
  try {
    // Check if we already have an auth client
    if (auth) return auth;
    
    // Get credentials from environment variables
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
    
    // Verify required credentials exist
    if (!clientId || !clientSecret || !refreshToken) {
      log('Missing Google API credentials in environment variables', 'calendarService');
      return null;
    }
    
    // Create a new OAuth client
    auth = new google.auth.OAuth2(
      clientId,
      clientSecret,
      'https://developers.google.com/oauthplayground' // Redirect URI used in oauthplayground
    );
    
    // Set credentials using refresh token
    auth.setCredentials({
      refresh_token: refreshToken
    });
    
    // Attempt to refresh the token immediately to validate it
    try {
      await auth.refreshAccessToken();
      log('Successfully refreshed Google OAuth token', 'calendarService');
    } catch (refreshError) {
      log(`Failed to refresh token: ${refreshError}`, 'calendarService');
      // Don't return null here, let's still try to use the client
    }
    
    return auth;
  } catch (error) {
    log(`Error initializing Google Auth: ${error}`, 'calendarService');
    return null;
  }
}

/**
 * Get Google Calendar API
 */
async function getCalendarAPI(): Promise<calendar_v3.Calendar | null> {
  try {
    const authClient = await getAuthClient();
    if (!authClient) return null;
    
    return google.calendar({ version: 'v3', auth: authClient });
  } catch (error) {
    log(`Error getting calendar API: ${error}`, 'calendarService');
    return null;
  }
}

/**
 * Get appropriate calendar ID based on appointment status
 */
function getCalendarId(status: string | null | undefined): string | null {
  // Check if we have calendar IDs
  if (!CALENDARS.active) {
    log('Missing Google Calendar ID in environment variables', 'calendarService');
    return null;
  }
  
  // Use archive calendar for completed or cancelled appointments
  if (status === 'Complete' || status === 'Cancel') {
    return CALENDARS.archive || CALENDARS.active;
  }
  
  // Default to active calendar
  return CALENDARS.active;
}

/**
 * Format date and time strings to RFC3339 format for Google Calendar
 * This function creates a date/time string for the specified local time,
 * correctly handling the timezone specified in the TIME_ZONE constant.
 */
function formatDateTime(dateStr: string, timeStr: string): string {
  // Format as YYYY-MM-DDTHH:MM:00
  // Google Calendar API expects this format with the timezone specified separately
  // in the event object, not in this string
  return `${dateStr}T${timeStr}:00`;
}

/**
 * Create an event in Google Calendar
 */
async function createCalendarEvent(
  appointment: Appointment, 
  calendarId: string
): Promise<string | null> {
  try {
    // Get Google Calendar API
    const calendar = await getCalendarAPI();
    if (!calendar) return null;
    
    // Format start and end dates/times
    const startDateTime = formatDateTime(
      appointment.startDate,
      appointment.startTime
    );
    
    // If end date/time is not specified, use start time + 1 hour as default
    const endDate = appointment.endDate || appointment.startDate;
    const endTime = appointment.endTime || (() => {
      const [hours, minutes] = appointment.startTime.split(':').map(Number);
      return `${hours + 1}:${minutes.toString().padStart(2, '0')}`;
    })();
    
    const endDateTime = formatDateTime(endDate, endTime);
    
    // Build the location string
    let location: string | undefined;
    if (appointment.callType === 'in-call') {
      location = 'Office';
    } else if (appointment.streetAddress) {
      const parts = [
        appointment.streetAddress,
        appointment.addressLine2,
        appointment.city,
        appointment.state,
        appointment.zipCode
      ].filter(Boolean);
      location = parts.join(', ');
    }
    
    // Format financial information
    const deposit = appointment.depositAmount ? `$${appointment.depositAmount}` : '$0';
    const paymentMethod = appointment.paymentProcessUsed || 'Not specified';
    const dueToProvider = appointment.dueToProvider || 
      ((appointment.grossRevenue || 0) - (appointment.depositAmount || 0));
    
    // Build a detailed description with all appointment information
    const description = `
APPOINTMENT DETAILS:
Client: ${appointment.clientName || 'Not specified'}
Phone: ${appointment.phoneNumber || 'Not provided'}
Revenue: $${appointment.grossRevenue || 0}
Marketing Channel: ${appointment.marketingChannel || 'Not specified'}

Location: ${appointment.callType === 'in-call' ? 'INCALL AT YOUR LOCATION' : 'OUTCALL TO CLIENT'}
${appointment.streetAddress ? `Address: ${[
  appointment.streetAddress,
  appointment.addressLine2,
  appointment.city,
  appointment.state,
  appointment.zipCode
].filter(Boolean).join(', ')}` : ''}
${appointment.outcallDetails ? `Location Notes: ${appointment.outcallDetails}` : ''}

Financial Details:
- Deposit Received: ${deposit} via ${paymentMethod}
- Balance Due: $${dueToProvider}
- Travel Expenses: $${appointment.travelExpense || 0}
- Hosting Expenses: $${appointment.hostingExpense || 0}

${appointment.hasClientNotes && appointment.clientNotes ? `Client Notes: ${appointment.clientNotes}` : 'No client notes provided'}

Set by: ${appointment.setBy}
    `.trim();
    
    // Create a summary that includes the disposition status as the first word
    const summary = `SCHEDULED: ${appointment.clientName || 'Client'} - ${appointment.callType === 'in-call' ? 'IN' : 'OUT'}`;
    
    // Create the event
    const event = {
      summary: summary,
      description: description,
      location,
      start: {
        dateTime: startDateTime,
        timeZone: TIME_ZONE
      },
      end: {
        dateTime: endDateTime,
        timeZone: TIME_ZONE
      },
      // Add attendees if the client has an email
      attendees: appointment.clientEmail ? [
        { email: appointment.clientEmail }
      ] : undefined
    };
    
    // Insert the event into the calendar
    const response = await calendar.events.insert({
      calendarId,
      requestBody: event as any
    });
    
    // Log success and return the event ID
    if (response.data && response.data.id) {
      log(`Created calendar event ${response.data.id} in calendar ${calendarId}`, 'calendarService');
      return response.data.id;
    }
    
    return null;
  } catch (error) {
    log(`Error creating calendar event: ${error}`, 'calendarService');
    return null;
  }
}

/**
 * Update an existing calendar event
 */
async function updateCalendarEvent(
  appointment: Appointment,
  eventId: string,
  calendarId: string
): Promise<string | null> {
  try {
    // Get Google Calendar API
    const calendar = await getCalendarAPI();
    if (!calendar) return null;
    
    // Format start and end dates/times - using updated ones if available
    const startDate = appointment.updatedStartDate || appointment.startDate;
    const startTime = appointment.updatedStartTime || appointment.startTime;
    const startDateTime = formatDateTime(startDate, startTime);
    
    // If end date/time is not specified, use start time + 1 hour as default
    const endDate = appointment.updatedEndDate || appointment.endDate || startDate;
    const endTime = appointment.updatedEndTime || appointment.endTime || (() => {
      const [hours, minutes] = startTime.split(':').map(Number);
      return `${hours + 1}:${minutes.toString().padStart(2, '0')}`;
    })();
    
    const endDateTime = formatDateTime(endDate, endTime);
    
    // Build the location string
    let location: string | undefined;
    if (appointment.callType === 'in-call') {
      location = 'Office';
    } else if (appointment.streetAddress) {
      const parts = [
        appointment.streetAddress,
        appointment.addressLine2,
        appointment.city,
        appointment.state,
        appointment.zipCode
      ].filter(Boolean);
      location = parts.join(', ');
    }
    
    // Format financial information
    const deposit = appointment.depositAmount ? `$${appointment.depositAmount}` : '$0';
    const paymentMethod = appointment.paymentProcessUsed || 'Not specified';
    const dueToProvider = appointment.dueToProvider || 
      ((appointment.grossRevenue || 0) - (appointment.depositAmount || 0));
    
    // Build a detailed description with all appointment information
    let description = '';
    
    if (appointment.dispositionStatus === 'Reschedule') {
      description = `
RESCHEDULED APPOINTMENT:
Client: ${appointment.clientName || 'Not specified'}
Phone: ${appointment.phoneNumber || 'Not provided'}

ORIGINAL SCHEDULE:
Date: ${formatDate(appointment.startDate)}
Time: ${formatTime(appointment.startTime)} - ${formatTime(appointment.endTime || '')}

NEW SCHEDULE:
Date: ${formatDate(appointment.updatedStartDate || '')}
Time: ${formatTime(appointment.updatedStartTime || '')} - ${formatTime(appointment.updatedEndTime || '')}
Duration: ${appointment.callDuration || 1} hour(s)
Revenue: $${appointment.grossRevenue || 0}

Location: ${appointment.callType === 'in-call' ? 'INCALL AT YOUR LOCATION' : 'OUTCALL TO CLIENT'}
${appointment.streetAddress ? `Address: ${[
  appointment.streetAddress,
  appointment.addressLine2,
  appointment.city,
  appointment.state,
  appointment.zipCode
].filter(Boolean).join(', ')}` : ''}
${appointment.outcallDetails ? `Location Notes: ${appointment.outcallDetails}` : ''}

Financial Details:
- Deposit Received: ${deposit} via ${paymentMethod}
- Balance Due: $${dueToProvider}
- Travel Expenses: $${appointment.travelExpense || 0}
- Hosting Expenses: $${appointment.hostingExpense || 0}

${appointment.hasClientNotes && appointment.clientNotes ? `Client Notes: ${appointment.clientNotes}` : 'No client notes provided'}

Set by: ${appointment.setBy}
      `.trim();
    } else if (appointment.dispositionStatus === 'Complete') {
      description = `
APPOINTMENT COMPLETED:
Client: ${appointment.clientName || 'Not specified'}
Phone: ${appointment.phoneNumber || 'Not provided'}
Date: ${formatDate(appointment.startDate)}
Time: ${formatTime(appointment.startTime)} - ${formatTime(appointment.endTime || '')}
Duration: ${appointment.callDuration || 1} hour(s)

Financial Summary:
- Total Collected: $${appointment.totalCollected || 0}
- Cash Payment: $${appointment.totalCollectedCash || 0}
- Digital Payment: $${appointment.totalCollectedDigital || 0}
- Payment Method: ${appointment.paymentProcessor || 'Not specified'}
- Payment Notes: ${appointment.paymentNotes || 'None'}

Appointment Outcome:
- See client again: ${appointment.seeClientAgain ? 'YES' : 'NO'}
- Notes: ${appointment.appointmentNotes || 'None'}

Set by: ${appointment.setBy}
      `.trim();
    } else if (appointment.dispositionStatus === 'Cancel') {
      const applyToFutureBooking = appointment.cancellationDetails && 
        (appointment.cancellationDetails.includes("apply") || 
         appointment.cancellationDetails.includes("credit") || 
         appointment.cancellationDetails.includes("honor"))
        ? "YES" : "NO";
        
      description = `
APPOINTMENT CANCELLED:
Client: ${appointment.clientName || 'Not specified'}
Phone: ${appointment.phoneNumber || 'Not provided'}
Original Date: ${formatDate(appointment.startDate)}
Original Time: ${formatTime(appointment.startTime)} - ${formatTime(appointment.endTime || '')}

Cancellation Information:
- Cancelled by: ${appointment.whoCanceled === 'client' ? 'Client' : 'Provider'}
- Reason: ${appointment.cancellationDetails || 'Not specified'}
- Deposit status: ${deposit} ${appointment.depositReceivedBy ? 'received by ' + appointment.depositReceivedBy : ''}

Financial Resolution:
- Deposit amount: ${deposit}
- Applied to future booking: ${applyToFutureBooking}
- Refunded: ${(appointment.totalCollected || 0) > 0 ? `YES - $${appointment.totalCollected}` : 'NO'}

Set by: ${appointment.setBy}
      `.trim();
    } else {
      // Default appointment information
      description = `
APPOINTMENT DETAILS:
Client: ${appointment.clientName || 'Not specified'}
Phone: ${appointment.phoneNumber || 'Not provided'}
Revenue: $${appointment.grossRevenue || 0}
Marketing Channel: ${appointment.marketingChannel || 'Not specified'}

Location: ${appointment.callType === 'in-call' ? 'INCALL AT YOUR LOCATION' : 'OUTCALL TO CLIENT'}
${appointment.streetAddress ? `Address: ${[
  appointment.streetAddress,
  appointment.addressLine2,
  appointment.city,
  appointment.state,
  appointment.zipCode
].filter(Boolean).join(', ')}` : ''}
${appointment.outcallDetails ? `Location Notes: ${appointment.outcallDetails}` : ''}

Financial Details:
- Deposit Received: ${deposit} via ${paymentMethod}
- Balance Due: $${dueToProvider}
- Travel Expenses: $${appointment.travelExpense || 0}
- Hosting Expenses: $${appointment.hostingExpense || 0}

${appointment.hasClientNotes && appointment.clientNotes ? `Client Notes: ${appointment.clientNotes}` : 'No client notes provided'}

Set by: ${appointment.setBy}
      `.trim();
    }
    
    // Create a summary that includes the disposition status as the first word
    let summary = '';
    if (appointment.dispositionStatus === 'Reschedule') {
      summary = `RESCHEDULED: ${appointment.clientName || 'Client'} - moved to ${formatDate(appointment.updatedStartDate || '')}`;
    } else if (appointment.dispositionStatus === 'Complete') {
      summary = `COMPLETE: ${appointment.clientName || 'Client'} - ${formatDate(appointment.startDate)}`;
    } else if (appointment.dispositionStatus === 'Cancel') {
      summary = `CANCEL: ${appointment.clientName || 'Client'} - ${formatDate(appointment.startDate)}`;
    } else {
      summary = `SCHEDULED: ${appointment.clientName || 'Client'} - ${appointment.callType === 'in-call' ? 'IN' : 'OUT'}`;
    }
    
    // Create the updated event
    const event = {
      summary: summary,
      description: description,
      location,
      start: {
        dateTime: startDateTime,
        timeZone: TIME_ZONE
      },
      end: {
        dateTime: endDateTime,
        timeZone: TIME_ZONE
      },
      // Add attendees if the client has an email
      attendees: appointment.clientEmail ? [
        { email: appointment.clientEmail }
      ] : undefined
    };
    
    // Update the event in the calendar
    const response = await calendar.events.update({
      calendarId,
      eventId,
      requestBody: event as any
    });
    
    // Log success and return the event ID
    if (response.data && response.data.id) {
      log(`Updated calendar event ${response.data.id} in calendar ${calendarId}`, 'calendarService');
      return response.data.id;
    }
    
    return null;
  } catch (error) {
    log(`Error updating calendar event: ${error}`, 'calendarService');
    return null;
  }
}

/**
 * Move an event from one calendar to another
 */
async function moveEventToCalendar(
  eventId: string,
  sourceCalendarId: string,
  destinationCalendarId: string
): Promise<string | null> {
  try {
    // Don't move if source and destination are the same
    if (sourceCalendarId === destinationCalendarId) {
      return eventId;
    }
    
    // Get Google Calendar API
    const calendar = await getCalendarAPI();
    if (!calendar) return null;
    
    // First, get the event from the source calendar
    const eventResponse = await calendar.events.get({
      calendarId: sourceCalendarId,
      eventId
    });
    
    if (!eventResponse.data) {
      log(`Event ${eventId} not found in calendar ${sourceCalendarId}`, 'calendarService');
      return null;
    }
    
    // Insert event into destination calendar
    const insertResponse = await calendar.events.insert({
      calendarId: destinationCalendarId,
      requestBody: eventResponse.data as any
    });
    
    if (!insertResponse.data || !insertResponse.data.id) {
      log(`Failed to insert event into destination calendar ${destinationCalendarId}`, 'calendarService');
      return null;
    }
    
    // Delete event from source calendar
    await calendar.events.delete({
      calendarId: sourceCalendarId,
      eventId
    });
    
    // Log success and return the new event ID
    log(`Moved event from calendar ${sourceCalendarId} to ${destinationCalendarId}`, 'calendarService');
    return insertResponse.data.id;
  } catch (error) {
    log(`Error moving calendar event: ${error}`, 'calendarService');
    return null;
  }
}

/**
 * Handle appointment creation (create new calendar event)
 */
export async function handleAppointmentCreated(appointment: Appointment): Promise<string | null> {
  try {
    // Determine which calendar to use
    const calendarId = getCalendarId(appointment.dispositionStatus);
    if (!calendarId) return null;
    
    // Create the event in the calendar
    const eventId = await createCalendarEvent(appointment, calendarId);
    
    if (eventId) {
      // Update the appointment with the calendar event ID
      await storage.updateCalendarEventId(appointment.id, eventId);
      return eventId;
    }
    
    return null;
  } catch (error) {
    log(`Error handling appointment creation: ${error}`, 'calendarService');
    return null;
  }
}

/**
 * Handle appointment update (based on disposition status)
 */
export async function handleAppointmentUpdated(
  appointment: Appointment,
  currentEventId: string
): Promise<string | null> {
  try {
    // Determine source and destination calendars
    const currentCalendarId = CALENDARS.active;
    const targetCalendarId = getCalendarId(appointment.dispositionStatus);
    
    if (!currentCalendarId || !targetCalendarId) return null;
    
    // Check if we need to move the event to a different calendar
    if (currentCalendarId !== targetCalendarId) {
      // Move event to the appropriate calendar based on status
      const newEventId = await moveEventToCalendar(
        currentEventId,
        currentCalendarId,
        targetCalendarId
      );
      
      if (newEventId && newEventId !== currentEventId) {
        // Update the appointment with the new calendar event ID
        await storage.updateCalendarEventId(appointment.id, newEventId);
        return newEventId;
      }
    } else {
      // Just update the event in the current calendar
      const updatedEventId = await updateCalendarEvent(
        appointment,
        currentEventId,
        currentCalendarId
      );
      
      if (updatedEventId) {
        return updatedEventId;
      }
    }
    
    return null;
  } catch (error) {
    log(`Error handling appointment update: ${error}`, 'calendarService');
    return null;
  }
}