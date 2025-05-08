import { Appointment } from '@shared/schema';
import { log } from '../vite';
import { sendNewAppointmentNotification, sendStatusUpdateNotification } from './emailService';
import { handleAppointmentCreated, handleAppointmentUpdated } from './calendarService';

// Check if Google Calendar is properly configured
const isCalendarConfigured = (): boolean => {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REFRESH_TOKEN &&
    process.env.GOOGLE_CALENDAR_ID
  );
};

/**
 * Handle notifications for a new appointment
 * - Send email notification
 * - Create calendar event (if Google Calendar is configured)
 */
export async function handleNewAppointmentNotifications(appointment: Appointment): Promise<void> {
  try {
    // Attempt to send email notification
    const emailSent = await sendNewAppointmentNotification(appointment);
    log(`Email notification ${emailSent ? 'sent' : 'failed'} for new appointment ${appointment.id}`, 'notificationService');
    
    // Only attempt calendar integration if properly configured
    if (isCalendarConfigured()) {
      // Attempt to create calendar event
      const eventId = await handleAppointmentCreated(appointment);
      if (eventId) {
        // Update the appointment with the calendar event ID
        // This update will not trigger notifications again since we're implementing
        // this in storageService/routes directly
        log(`Created calendar event ${eventId} for appointment ${appointment.id}`, 'notificationService');
        return;
      }
    } else {
      log('Google Calendar integration not configured - skipping calendar event creation', 'notificationService');
    }
  } catch (error) {
    log(`Error in new appointment notifications: ${error}`, 'notificationService');
  }
}

/**
 * Handle notifications for an updated appointment
 * - Send status update email
 * - Update or move calendar event based on status (if Google Calendar is configured)
 */
export async function handleAppointmentStatusNotifications(
  appointment: Appointment,
  previousStatus: string | null
): Promise<void> {
  // Only proceed if the status has changed
  if (!appointment.dispositionStatus || appointment.dispositionStatus === previousStatus) {
    return;
  }
  
  try {
    // Send email notification about the status change
    const emailSent = await sendStatusUpdateNotification(
      appointment,
      appointment.dispositionStatus
    );
    log(`Email notification ${emailSent ? 'sent' : 'failed'} for status update to ${appointment.dispositionStatus}`, 'notificationService');
    
    // Only attempt calendar integration if properly configured
    if (isCalendarConfigured()) {
      // Handle calendar event update
      if (appointment.calendarEventId) {
        // Update or move the calendar event
        const eventId = await handleAppointmentUpdated(
          appointment,
          appointment.calendarEventId
        );
        
        if (eventId && eventId !== appointment.calendarEventId) {
          // If the event ID changed (moved to another calendar), update the appointment
          log(`Updated calendar event to ${eventId} for appointment ${appointment.id}`, 'notificationService');
        }
      } else {
        // No calendar event yet, create one
        const eventId = await handleAppointmentCreated(appointment);
        if (eventId) {
          log(`Created calendar event ${eventId} for appointment ${appointment.id}`, 'notificationService');
        }
      }
    } else {
      log('Google Calendar integration not configured - skipping calendar event update', 'notificationService');
    }
  } catch (error) {
    log(`Error in appointment status notifications: ${error}`, 'notificationService');
  }
}