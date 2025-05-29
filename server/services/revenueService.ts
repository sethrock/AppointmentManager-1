import { Appointment } from "../../shared/schema.js";

/**
 * Calculate recognized and deferred revenue based on appointment status and amounts
 */
export function calculateRevenue(appointment: Appointment): {
  recognizedRevenue: number;
  deferredRevenue: number;
} {
  const depositAmount = appointment.depositAmount || 0;
  const totalCollected = appointment.totalCollected || 0;
  const status = appointment.dispositionStatus?.toLowerCase();

  switch (status) {
    case 'scheduled':
    case 'rescheduled':
      // Only recognize deposit for scheduled/rescheduled (service not delivered yet)
      return {
        recognizedRevenue: depositAmount,
        deferredRevenue: 0
      };

    case 'complete':
      // Recognize full revenue (deposit + collected) for completed appointments
      return {
        recognizedRevenue: depositAmount + totalCollected,
        deferredRevenue: 0
      };

    case 'cancel':
      // Defer deposit for cancelled appointments
      return {
        recognizedRevenue: 0,
        deferredRevenue: depositAmount
      };

    default:
      // No revenue recognition for pending/null status
      return {
        recognizedRevenue: 0,
        deferredRevenue: 0
      };
  }
}

/**
 * Update revenue fields for an appointment based on current data
 */
export function updateAppointmentRevenue(appointment: Appointment): Partial<Appointment> {
  const { recognizedRevenue, deferredRevenue } = calculateRevenue(appointment);
  
  return {
    recognizedRevenue,
    deferredRevenue
  };
}