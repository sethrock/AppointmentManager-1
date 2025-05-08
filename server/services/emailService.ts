import nodemailer from 'nodemailer';
import { Appointment } from '@shared/schema';
import { log } from '../vite';
import { formatDate, formatTime } from '../../client/src/lib/format';

// Create reusable transporter object using SMTP transport
const createTransporter = () => {
  // We need to get credentials from environment variables
  // These will be set using the ask_secrets tool when needed
  const email = process.env.GMAIL_EMAIL;
  const password = process.env.GMAIL_APP_PASSWORD;
  
  if (!email || !password) {
    log('Gmail credentials not found in environment variables', 'emailService');
    return null;
  }
  
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: email,
      pass: password
    }
  });
};

/**
 * Send an email notification
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  try {
    const transporter = createTransporter();
    if (!transporter) {
      return false;
    }
    
    const from = process.env.GMAIL_EMAIL;
    
    // Set up email options
    const mailOptions = {
      from: `"Appointment System" <${from}>`,
      to,
      subject,
      html
    };
    
    // Send email
    await transporter.sendMail(mailOptions);
    log(`Email sent to ${to}`, 'emailService');
    return true;
  } catch (error) {
    log(`Error sending email: ${error}`, 'emailService');
    return false;
  }
}

/**
 * Generate email content for new appointment
 */
export function generateNewAppointmentEmail(appointment: Appointment): string {
  const timeInfo = `${formatDate(appointment.startDate)} at ${formatTime(appointment.startTime)}`;
  const provider = appointment.provider;
  
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: #2c3e50;">New Appointment Scheduled</h2>
      <p>A new appointment has been scheduled with ${provider}.</p>
      
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #2c3e50;">Appointment Details</h3>
        <p><strong>Provider:</strong> ${provider}</p>
        <p><strong>Date & Time:</strong> ${timeInfo}</p>
        <p><strong>Client:</strong> ${appointment.clientName || 'Not specified'}</p>
        <p><strong>Type:</strong> ${appointment.callType === 'in-call' ? 'In-Call' : 'Out-Call'}</p>
      </div>
      
      <p>Please log in to the appointment management system to view the full details.</p>
      
      <p style="margin-top: 30px; font-size: 12px; color: #7f8c8d;">
        This is an automated message. Please do not reply to this email.
      </p>
    </div>
  `;
}

/**
 * Generate email content for appointment status update
 */
export function generateStatusUpdateEmail(
  appointment: Appointment,
  status: string
): string {
  const timeInfo = `${formatDate(appointment.startDate)} at ${formatTime(appointment.startTime)}`;
  const provider = appointment.provider;
  
  let statusMessage = '';
  let statusColor = '';
  
  switch (status) {
    case 'Complete':
      statusMessage = 'has been marked as completed';
      statusColor = '#27ae60'; // Green
      break;
    case 'Reschedule':
      statusMessage = 'has been rescheduled';
      statusColor = '#f39c12'; // Orange
      break;
    case 'Cancel':
      statusMessage = 'has been cancelled';
      statusColor = '#e74c3c'; // Red
      break;
    default:
      statusMessage = 'has been updated';
      statusColor = '#3498db'; // Blue
  }
  
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: #2c3e50;">Appointment Status Update</h2>
      <p>Your appointment with ${provider} on ${timeInfo} ${statusMessage}.</p>
      
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: ${statusColor};">Status: ${status}</h3>
        
        ${status === 'Reschedule' && appointment.updatedStartDate ? `
          <p><strong>New Date & Time:</strong> ${formatDate(appointment.updatedStartDate)} at ${formatTime(appointment.updatedStartTime || '')}</p>
        ` : ''}
        
        ${status === 'Cancel' && appointment.whoCanceled ? `
          <p><strong>Cancelled by:</strong> ${appointment.whoCanceled === 'client' ? 'Client' : 'Provider'}</p>
          ${appointment.cancellationDetails ? `<p><strong>Reason:</strong> ${appointment.cancellationDetails}</p>` : ''}
        ` : ''}
      </div>
      
      <p>Please log in to the appointment management system for more details.</p>
      
      <p style="margin-top: 30px; font-size: 12px; color: #7f8c8d;">
        This is an automated message. Please do not reply to this email.
      </p>
    </div>
  `;
}

/**
 * Send notification for a new appointment
 */
export async function sendNewAppointmentNotification(
  appointment: Appointment
): Promise<boolean> {
  try {
    // First determine who to send the email to
    let recipientEmail = process.env.NOTIFICATION_EMAIL; // Default notification email
    
    // If client has email and wants to receive notifications
    if (appointment.clientEmail && appointment.clientUsesEmail) {
      recipientEmail = appointment.clientEmail;
    }
    
    if (!recipientEmail) {
      log('No recipient email found for appointment notification', 'emailService');
      return false;
    }
    
    const subject = 'New Appointment Scheduled';
    const html = generateNewAppointmentEmail(appointment);
    
    return await sendEmail(recipientEmail, subject, html);
  } catch (error) {
    log(`Error sending new appointment notification: ${error}`, 'emailService');
    return false;
  }
}

/**
 * Send notification for appointment status change
 */
export async function sendStatusUpdateNotification(
  appointment: Appointment,
  status: string
): Promise<boolean> {
  try {
    // Determine who to send the email to
    let recipientEmail = process.env.NOTIFICATION_EMAIL; // Default notification email
    
    // If client has email and wants to receive notifications
    if (appointment.clientEmail && appointment.clientUsesEmail) {
      recipientEmail = appointment.clientEmail;
    }
    
    if (!recipientEmail) {
      log('No recipient email found for status update notification', 'emailService');
      return false;
    }
    
    const subject = `Appointment ${status} Notification`;
    const html = generateStatusUpdateEmail(appointment, status);
    
    return await sendEmail(recipientEmail, subject, html);
  } catch (error) {
    log(`Error sending status update notification: ${error}`, 'emailService');
    return false;
  }
}