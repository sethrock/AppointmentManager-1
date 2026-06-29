import { Appointment } from "../../shared/schema.js";
import { computeAppointmentFinancials } from "../../shared/appointmentFinancials.js";

/**
 * @deprecated Use computeAppointmentFinancials from shared/appointmentFinancials.ts
 */
export function calculateRevenue(appointment: Appointment): {
  recognizedRevenue: number;
  deferredRevenue: number;
  realizedRevenue: number;
} {
  const f = computeAppointmentFinancials(appointment);
  return {
    recognizedRevenue: f.recognizedRevenue,
    deferredRevenue: f.deferredRevenue,
    realizedRevenue: f.realizedRevenue,
  };
}

/**
 * @deprecated Use computeAppointmentFinancials from shared/appointmentFinancials.ts
 */
export function updateAppointmentRevenue(appointment: Appointment): Partial<Appointment> {
  const f = computeAppointmentFinancials(appointment);
  return {
    recognizedRevenue: f.recognizedRevenue,
    deferredRevenue: f.deferredRevenue,
    realizedRevenue: f.realizedRevenue,
    overageAmount: f.overageAmount,
    underpaymentAmount: f.underpaymentAmount,
  };
}