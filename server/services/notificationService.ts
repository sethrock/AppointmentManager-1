import { Appointment } from '@shared/schema';
import { log } from '../vite';
import { sendNewAppointmentNotification, sendStatusUpdateNotification } from './emailService';
import { handleAppointmentCreated, handleAppointmentUpdated } from './calendarService';

/**
 * Handle notifications for a new appointment
 * - Send email notification
 * - Create calendar event
 */
export async function handleNewAppointmentNotifications(appointment: Appointment): Promise<void> {
  try {
    // Attempt to send email notification
    const emailSent = await sendNewAppointmentNotification(appointment);
    log(`Email notification ${emailSent ? 'sent' : 'failed'} for new appointment ${appointment.id}`, 'notificationService');
    
    // Attempt to create calendar event
    const eventId = await handleAppointmentCreated(appointment);
    if (eventId) {
      // Update the appointment with the calendar event ID
      // This update will not trigger notifications again since we're implementing
      // this in storageService/routes directly
      log(`Created calendar event ${eventId} for appointment ${appointment.id}`, 'notificationService');
      return;
    }
  } catch (error) {
    log(`Error in new appointment notifications: ${error}`, 'notificationService');
  }
}

/**
 * Handle notifications for an updated appointment
 * - Send status update email
 * - Update or move calendar event based on status
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
  } catch (error) {
    log(`Error in appointment status notifications: ${error}`, 'notificationService');
  }
}