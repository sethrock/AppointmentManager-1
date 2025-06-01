import { Appointment } from "../../shared/schema.js";

/**
 * Calculate recognized, deferred, and realized revenue based on appointment status and amounts
 */
export function calculateRevenue(appointment: Appointment): {
  recognizedRevenue: number;
  deferredRevenue: number;
  realizedRevenue: number;
} {
  const depositAmount = appointment.depositAmount || 0;
  const totalCollected = appointment.totalCollected || 0;
  const grossRevenue = appointment.grossRevenue || 0;
  const depositReturnAmount = appointment.depositReturnAmount || 0;
  const status = appointment.dispositionStatus?.toLowerCase();

  switch (status) {
    case 'scheduled':
    case 'reschedule':
      // For scheduled/rescheduled: recognized_revenue = projected_revenue, deferred_revenue = deposit_amount, realized_revenue = deposit_amount
      return {
        recognizedRevenue: grossRevenue,
        deferredRevenue: depositAmount,
        realizedRevenue: depositAmount
      };

    case 'complete':
      // For completed: realized_revenue = total_collected + deposit_amount, deferred_revenue = 0, recognized_revenue = projected_revenue
      return {
        recognizedRevenue: grossRevenue,
        deferredRevenue: 0,
        realizedRevenue: totalCollected + depositAmount
      };

    case 'cancel':
      // For cancelled: realized_revenue = deposit_amount - deposit_return_amount, deferred_revenue = deposit_amount, recognized_revenue = projected_revenue
      return {
        recognizedRevenue: grossRevenue,
        deferredRevenue: depositAmount,
        realizedRevenue: depositAmount - depositReturnAmount
      };

    default:
      // For initial creation: recognized_revenue = projected_revenue, deferred_revenue = deposit_amount, realized_revenue = deposit_amount
      return {
        recognizedRevenue: grossRevenue,
        deferredRevenue: depositAmount,
        realizedRevenue: depositAmount
      };
  }
}

/**
 * Update revenue fields for an appointment based on current data
 */
export function updateAppointmentRevenue(appointment: Appointment): Partial<Appointment> {
  const { recognizedRevenue, deferredRevenue, realizedRevenue } = calculateRevenue(appointment);
  
  return {
    recognizedRevenue,
    deferredRevenue,
    realizedRevenue
  };
}