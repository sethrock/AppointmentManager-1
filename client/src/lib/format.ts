/**
 * Utility functions for formatting data in the application
 */

/**
 * Format a number as currency with $ sign and 2 decimal places
 */
export function formatCurrency(amount: number | undefined): string {
  if (amount === undefined) return "$0.00";
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Format a date string in a more user-friendly format
 * Converts 'YYYY-MM-DD' to 'Month DD, YYYY'
 */
export function formatDate(dateString: string | undefined): string {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateString;
  }
}

/**
 * Format a time string in 12-hour format
 * Converts '13:00' to '1:00 PM'
 */
export function formatTime(timeString: string | undefined): string {
  if (!timeString) return '';
  
  try {
    // Create a date object with the time string
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes);
    
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  } catch (error) {
    console.error("Error formatting time:", error);
    return timeString;
  }
}

/**
 * Format a phone number to (XXX) XXX-XXXX format
 */
export function formatPhoneNumber(phoneNumber: string | undefined): string {
  if (!phoneNumber) return '';
  
  // Remove all non-digit characters
  const digitsOnly = phoneNumber.replace(/\D/g, '');
  
  // Format as (XXX) XXX-XXXX if 10 digits
  if (digitsOnly.length === 10) {
    return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
  }
  
  // Return original if not 10 digits
  return phoneNumber;
}

/**
 * Truncate text with ellipsis if it exceeds the specified length
 */
export function truncateText(text: string | undefined, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  
  return text.slice(0, maxLength) + '...';
}
