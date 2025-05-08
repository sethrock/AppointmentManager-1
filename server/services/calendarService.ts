import { google } from 'googleapis';
import { Appointment } from '@shared/schema';
import { log } from '../vite';

// Configure OAuth2 client
const oAuth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  process.env.GMAIL_REDIRECT_URI
);

// Set refresh token
oAuth2Client.setCredentials({
  refresh_token: process.env.GMAIL_REFRESH_TOKEN,
});

// Create calendar API client
const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

// Calendar IDs (these will come from environment variables)
const ACTIVE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ACTIVE_ID || 'primary';
const COMPLETED_CALENDAR_ID = process.env.GOOGLE_CALENDAR_COMPLETED_ID || 'primary';

/**
 * Format date and time strings to RFC3339 format for Google Calendar
 */
function formatDateTime(dateStr: string, timeStr: string): string {
  // Parse date (YYYY-MM-DD) and time (HH:MM)
  const [year, month, day] = dateStr.split('-').map(n => parseInt(n));
  const [hours, minutes] = timeStr.split(':').map(n => parseInt(n));
  
  // Create date object (month is 0-indexed in JavaScript)
  const date = new Date(year, month - 1, day, hours, minutes);
  
  // Return in RFC3339 format
  return date.toISOString();
}

/**
 * Create an event in Google Calendar
 */
export async function createCalendarEvent(
  appointment: Appointment, 
  isCompleteOrCancelled: boolean = false
): Promise<string | null> {
  try {
    // Determine which calendar to use
    const calendarId = isCompleteOrCancelled ? COMPLETED_CALENDAR_ID : ACTIVE_CALENDAR_ID;
    
    // Format event dates
    const startDateTime = formatDateTime(
      appointment.startDate, 
      appointment.startTime
    );
    
    // Calculate end time (use end time if provided, otherwise add 1 hour)
    let endDateTime: string;
    if (appointment.endDate && appointment.endTime) {
      endDateTime = formatDateTime(appointment.endDate, appointment.endTime);
    } else {
      const endDate = new Date(new Date(startDateTime).getTime() + 60 * 60 * 1000); // Add 1 hour
      endDateTime = endDate.toISOString();
    }
    
    // Create event details
    const eventSummary = `${appointment.clientName} - ${appointment.provider}`;
    let eventDescription = `Type: ${appointment.callType === 'in-call' ? 'In-Call' : 'Out-Call'}\n`;
    
    if (appointment.clientEmail) {
      eventDescription += `Email: ${appointment.clientEmail}\n`;
    }
    
    if (appointment.phoneNumber) {
      eventDescription += `Phone: ${appointment.phoneNumber}\n`;
    }
    
    // Add location details for out-call
    let eventLocation: string | undefined = undefined;
    if (appointment.callType === 'out-call' && appointment.streetAddress) {
      eventLocation = `${appointment.streetAddress}, ${appointment.city}, ${appointment.state} ${appointment.zipCode}`;
      
      // Add address details to description
      eventDescription += `\nLocation:\n${appointment.streetAddress}\n`;
      if (appointment.addressLine2) eventDescription += `${appointment.addressLine2}\n`;
      eventDescription += `${appointment.city}, ${appointment.state} ${appointment.zipCode}\n`;
      
      if (appointment.outcallDetails) {
        eventDescription += `\nDetails: ${appointment.outcallDetails}\n`;
      }
    }
    
    // Add disposition status if available
    if (appointment.dispositionStatus) {
      eventDescription += `\nStatus: ${appointment.dispositionStatus}\n`;
      
      // Add status-specific details
      if (appointment.dispositionStatus === 'Complete' && appointment.totalCollected) {
        eventDescription += `\nTotal Collected: $${appointment.totalCollected}\n`;
        if (appointment.appointmentNotes) {
          eventDescription += `Notes: ${appointment.appointmentNotes}\n`;
        }
      } else if (appointment.dispositionStatus === 'Cancel' && appointment.whoCanceled) {
        eventDescription += `\nCanceled by: ${appointment.whoCanceled}\n`;
        if (appointment.cancellationDetails) {
          eventDescription += `Reason: ${appointment.cancellationDetails}\n`;
        }
      }
    }
    
    // Create the event
    const event = {
      summary: eventSummary,
      description: eventDescription,
      location: eventLocation,
      start: {
        dateTime: startDateTime,
        timeZone: 'America/New_York', // Use appropriate timezone
      },
      end: {
        dateTime: endDateTime,
        timeZone: 'America/New_York', // Use appropriate timezone
      },
      attendees: [
        appointment.clientEmail ? { email: appointment.clientEmail } : null,
      ].filter(Boolean),
    };
    
    // Insert the event
    const result = await calendar.events.insert({
      calendarId,
      requestBody: event,
    });
    
    log(`Event created: ${result.data.htmlLink}`, 'calendarService');
    return result.data.id || null;
  } catch (error) {
    log(`Error creating calendar event: ${error}`, 'calendarService');
    return null;
  }
}

/**
 * Update an existing calendar event
 */
export async function updateCalendarEvent(
  eventId: string,
  appointment: Appointment,
  calendarId: string = ACTIVE_CALENDAR_ID
): Promise<boolean> {
  try {
    // Format event dates (use updated dates if available)
    const startDateTime = formatDateTime(
      appointment.updatedStartDate || appointment.startDate, 
      appointment.updatedStartTime || appointment.startTime
    );
    
    // Calculate end time (use end time if provided, otherwise add 1 hour)
    let endDateTime: string;
    const endDate = appointment.updatedEndDate || appointment.endDate;
    const endTime = appointment.updatedEndTime || appointment.endTime;
    
    if (endDate && endTime) {
      endDateTime = formatDateTime(endDate, endTime);
    } else {
      const end = new Date(new Date(startDateTime).getTime() + 60 * 60 * 1000); // Add 1 hour
      endDateTime = end.toISOString();
    }
    
    // Create event details
    const eventSummary = `${appointment.clientName} - ${appointment.provider}`;
    let eventDescription = `Type: ${appointment.callType === 'in-call' ? 'In-Call' : 'Out-Call'}\n`;
    
    if (appointment.clientEmail) {
      eventDescription += `Email: ${appointment.clientEmail}\n`;
    }
    
    if (appointment.phoneNumber) {
      eventDescription += `Phone: ${appointment.phoneNumber}\n`;
    }
    
    // Add location details for out-call
    let eventLocation: string | undefined = undefined;
    if (appointment.callType === 'out-call' && appointment.streetAddress) {
      eventLocation = `${appointment.streetAddress}, ${appointment.city}, ${appointment.state} ${appointment.zipCode}`;
      
      // Add address details to description
      eventDescription += `\nLocation:\n${appointment.streetAddress}\n`;
      if (appointment.addressLine2) eventDescription += `${appointment.addressLine2}\n`;
      eventDescription += `${appointment.city}, ${appointment.state} ${appointment.zipCode}\n`;
      
      if (appointment.outcallDetails) {
        eventDescription += `\nDetails: ${appointment.outcallDetails}\n`;
      }
    }
    
    // Add disposition status if available
    if (appointment.dispositionStatus) {
      eventDescription += `\nStatus: ${appointment.dispositionStatus}\n`;
      
      // Add status-specific details
      if (appointment.dispositionStatus === 'Complete' && appointment.totalCollected) {
        eventDescription += `\nTotal Collected: $${appointment.totalCollected}\n`;
        if (appointment.appointmentNotes) {
          eventDescription += `Notes: ${appointment.appointmentNotes}\n`;
        }
      } else if (appointment.dispositionStatus === 'Cancel' && appointment.whoCanceled) {
        eventDescription += `\nCanceled by: ${appointment.whoCanceled}\n`;
        if (appointment.cancellationDetails) {
          eventDescription += `Reason: ${appointment.cancellationDetails}\n`;
        }
      }
    }
    
    // Update the event
    const event = {
      summary: eventSummary,
      description: eventDescription,
      location: eventLocation,
      start: {
        dateTime: startDateTime,
        timeZone: 'America/New_York', // Use appropriate timezone
      },
      end: {
        dateTime: endDateTime,
        timeZone: 'America/New_York', // Use appropriate timezone
      },
      attendees: [
        appointment.clientEmail ? { email: appointment.clientEmail } : null,
      ].filter(Boolean),
    };
    
    // Update the event
    await calendar.events.update({
      calendarId,
      eventId,
      requestBody: event,
    });
    
    log(`Event updated: ${eventId}`, 'calendarService');
    return true;
  } catch (error) {
    log(`Error updating calendar event: ${error}`, 'calendarService');
    return false;
  }
}

/**
 * Move an event from one calendar to another
 */
export async function moveEventToCalendar(
  eventId: string,
  sourceCalendarId: string = ACTIVE_CALENDAR_ID,
  destinationCalendarId: string = COMPLETED_CALENDAR_ID
): Promise<string | null> {
  try {
    // First, get the event from the source calendar
    const event = await calendar.events.get({
      calendarId: sourceCalendarId,
      eventId,
    });
    
    if (!event.data) {
      throw new Error('Event not found');
    }
    
    // Create the event in the destination calendar
    const result = await calendar.events.insert({
      calendarId: destinationCalendarId,
      requestBody: event.data,
    });
    
    // Delete the event from the source calendar
    await calendar.events.delete({
      calendarId: sourceCalendarId,
      eventId,
    });
    
    log(`Event moved from ${sourceCalendarId} to ${destinationCalendarId}`, 'calendarService');
    return result.data.id || null;
  } catch (error) {
    log(`Error moving calendar event: ${error}`, 'calendarService');
    return null;
  }
}

/**
 * Handle appointment creation (create new calendar event)
 */
export async function handleAppointmentCreated(appointment: Appointment): Promise<string | null> {
  return createCalendarEvent(appointment);
}

/**
 * Handle appointment update (based on disposition status)
 */
export async function handleAppointmentUpdated(
  appointment: Appointment,
  previousEventId?: string
): Promise<string | null> {
  const isCompleteOrCancelled = 
    appointment.dispositionStatus === 'Complete' || 
    appointment.dispositionStatus === 'Cancel';
  
  // If the appointment is complete/cancelled and we have a previous event ID,
  // move it to the completed calendar
  if (isCompleteOrCancelled && previousEventId) {
    return moveEventToCalendar(
      previousEventId,
      ACTIVE_CALENDAR_ID,
      COMPLETED_CALENDAR_ID
    );
  } 
  // If rescheduled and we have a previous event ID, update the existing event
  else if (appointment.dispositionStatus === 'Reschedule' && previousEventId) {
    await updateCalendarEvent(previousEventId, appointment);
    return previousEventId;
  } 
  // Otherwise, create a new event in the appropriate calendar
  else {
    return createCalendarEvent(appointment, isCompleteOrCancelled);
  }
}