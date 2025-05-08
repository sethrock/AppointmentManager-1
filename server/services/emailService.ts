import nodemailer from 'nodemailer';
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

/**
 * Send an email notification
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  try {
    // Get access token
    const accessToken = await oAuth2Client.getAccessToken();

    // Create transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.GMAIL_EMAIL,
        clientId: process.env.GMAIL_CLIENT_ID,
        clientSecret: process.env.GMAIL_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN,
        accessToken: accessToken?.token || '',
      },
    });

    // Send email
    const result = await transporter.sendMail({
      from: `"Appointment Manager" <${process.env.GMAIL_EMAIL}>`,
      to,
      subject,
      html,
    });

    log(`Email sent: ${result.messageId}`, 'emailService');
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
  return `
    <h1>New Appointment Created</h1>
    <p>A new appointment has been scheduled:</p>
    <ul>
      <li><strong>Client:</strong> ${appointment.clientName}</li>
      <li><strong>Provider:</strong> ${appointment.provider}</li>
      <li><strong>Date:</strong> ${appointment.startDate}</li>
      <li><strong>Time:</strong> ${appointment.startTime}${
    appointment.endTime ? ` - ${appointment.endTime}` : ''
  }</li>
      <li><strong>Type:</strong> ${
        appointment.callType === 'in-call' ? 'In-Call' : 'Out-Call'
      }</li>
    </ul>
    ${
      appointment.callType === 'out-call' && appointment.streetAddress
        ? `
    <h2>Location:</h2>
    <p>
      ${appointment.streetAddress}<br>
      ${appointment.addressLine2 ? appointment.addressLine2 + '<br>' : ''}
      ${appointment.city}, ${appointment.state} ${appointment.zipCode}
    </p>
    `
        : ''
    }
    <p>Please log in to the Appointment Manager for more details.</p>
  `;
}

/**
 * Generate email content for appointment status update
 */
export function generateStatusUpdateEmail(
  appointment: Appointment,
  newStatus: string
): string {
  let statusSpecificDetails = '';

  switch (newStatus) {
    case 'Reschedule':
      statusSpecificDetails = `
        <h2>New Schedule:</h2>
        <ul>
          <li><strong>Date:</strong> ${appointment.updatedStartDate}</li>
          <li><strong>Time:</strong> ${appointment.updatedStartTime}${
        appointment.updatedEndTime ? ` - ${appointment.updatedEndTime}` : ''
      }</li>
        </ul>
      `;
      break;
    case 'Complete':
      statusSpecificDetails = `
        <h2>Completion Details:</h2>
        <ul>
          <li><strong>Total Collected:</strong> $${appointment.totalCollected || 0}</li>
        </ul>
      `;
      break;
    case 'Cancel':
      statusSpecificDetails = `
        <h2>Cancellation Details:</h2>
        <p>Canceled by: ${appointment.whoCanceled || 'Not specified'}</p>
        ${
          appointment.cancellationDetails
            ? `<p>Reason: ${appointment.cancellationDetails}</p>`
            : ''
        }
      `;
      break;
  }

  return `
    <h1>Appointment Status Updated</h1>
    <p>An appointment has been updated to: <strong>${newStatus}</strong></p>
    <h2>Appointment Details:</h2>
    <ul>
      <li><strong>Client:</strong> ${appointment.clientName}</li>
      <li><strong>Provider:</strong> ${appointment.provider}</li>
      <li><strong>Original Date:</strong> ${appointment.startDate}</li>
      <li><strong>Original Time:</strong> ${appointment.startTime}${
    appointment.endTime ? ` - ${appointment.endTime}` : ''
  }</li>
    </ul>
    ${statusSpecificDetails}
    <p>Please log in to the Appointment Manager for more details.</p>
  `;
}

/**
 * Send notification for a new appointment
 */
export async function sendNewAppointmentNotification(
  appointment: Appointment
): Promise<boolean> {
  // Get notification recipient (admin email)
  const adminEmail = process.env.ADMIN_EMAIL || process.env.GMAIL_EMAIL;
  
  // Check if we have a recipient and client email
  if (!adminEmail) {
    log('No admin email configured for notifications', 'emailService');
    return false;
  }

  // Email subject
  const subject = `New Appointment: ${appointment.clientName} - ${appointment.startDate}`;
  
  // Email content
  const html = generateNewAppointmentEmail(appointment);
  
  // Send to admin
  const adminEmailSent = await sendEmail(adminEmail, subject, html);
  
  // Also send to client if email is available
  let clientEmailSent = false;
  if (appointment.clientEmail) {
    const clientSubject = `Your Appointment Confirmation - ${appointment.startDate}`;
    clientEmailSent = await sendEmail(appointment.clientEmail, clientSubject, html);
  }
  
  return adminEmailSent || clientEmailSent;
}

/**
 * Send notification for appointment status change
 */
export async function sendStatusUpdateNotification(
  appointment: Appointment,
  newStatus: string
): Promise<boolean> {
  // Get notification recipient (admin email)
  const adminEmail = process.env.ADMIN_EMAIL || process.env.GMAIL_EMAIL;
  
  // Check if we have a recipient
  if (!adminEmail) {
    log('No admin email configured for notifications', 'emailService');
    return false;
  }

  // Email subject
  const subject = `Appointment ${newStatus}: ${appointment.clientName} - ${appointment.startDate}`;
  
  // Email content
  const html = generateStatusUpdateEmail(appointment, newStatus);
  
  // Send to admin
  const adminEmailSent = await sendEmail(adminEmail, subject, html);
  
  // Also send to client if email is available
  let clientEmailSent = false;
  if (appointment.clientEmail) {
    const clientSubject = `Your Appointment Has Been ${newStatus}d`;
    clientEmailSent = await sendEmail(appointment.clientEmail, clientSubject, html);
  }
  
  return adminEmailSent || clientEmailSent;
}