import { z } from "zod";

/**
 * Common validation patterns for form fields
 */

// US Phone number validation
export const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
export const phoneSchema = z.string().regex(phoneRegex, {
  message: "Please enter a valid phone number, e.g. (555) 555-5555",
});

// Email validation
export const emailSchema = z.string().email({
  message: "Please enter a valid email address",
});

// ZIP code validation (US)
export const zipCodeRegex = /^\d{5}(-\d{4})?$/;
export const zipCodeSchema = z.string().regex(zipCodeRegex, {
  message: "Please enter a valid ZIP code (e.g., 12345 or 12345-6789)",
});

// Currency validation (positive number with up to 2 decimal places)
export const currencySchema = z.number().nonnegative({
  message: "Amount must be a positive number",
});

// Duration validation (positive number with 0.5 increments)
export const durationSchema = z.number().nonnegative({
  message: "Duration must be a positive number",
}).refine((val) => {
  const remainder = val % 0.5;
  return remainder === 0;
}, {
  message: "Duration must be in increments of 0.5 hours",
});

// Date validation (YYYY-MM-DD format)
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
  message: "Date must be in YYYY-MM-DD format",
}).refine((val) => {
  const date = new Date(val);
  return !isNaN(date.getTime());
}, {
  message: "Please enter a valid date",
});

// Time validation (HH:MM format)
export const timeSchema = z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
  message: "Time must be in HH:MM format (24-hour)",
});

/**
 * Helper function to validate date is not in the past
 */
export function isNotInPast(dateString: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const date = new Date(dateString);
  date.setHours(0, 0, 0, 0);
  
  return date >= today;
}

/**
 * Helper function to validate an end date/time comes after a start date/time
 */
export function isAfterStartDateTime(
  startDate: string,
  startTime: string,
  endDate: string,
  endTime: string
): boolean {
  const start = new Date(`${startDate}T${startTime}`);
  const end = new Date(`${endDate}T${endTime}`);
  
  return end > start;
}

/**
 * Helper function to calculate the duration between two date/times in hours
 */
export function calculateDuration(
  startDate: string,
  startTime: string,
  endDate: string,
  endTime: string
): number {
  const start = new Date(`${startDate}T${startTime}`);
  const end = new Date(`${endDate}T${endTime}`);
  
  const durationMs = end.getTime() - start.getTime();
  const durationHours = durationMs / (1000 * 60 * 60);
  
  // Round to nearest 0.5
  return Math.round(durationHours * 2) / 2;
}

/**
 * Custom validation for the appointment form with any business logic
 */
export function validateAppointmentDates(
  startDate: string | undefined,
  endDate: string | undefined
): string | null {
  if (!startDate) {
    return "Start date is required";
  }
  
  if (!isNotInPast(startDate)) {
    return "Start date cannot be in the past";
  }
  
  if (endDate && !isNotInPast(endDate)) {
    return "End date cannot be in the past";
  }
  
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (end < start) {
      return "End date cannot be before start date";
    }
  }
  
  return null;
}
