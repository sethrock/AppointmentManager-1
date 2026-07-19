import { Appointment, insertAppointmentSchema } from '@shared/schema';
import { log } from '../logger';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';

interface ValidationResult {
  isValid: boolean;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  errors: Array<{
    recordIndex: number;
    recordId?: number;
    errors: string[];
  }>;
  fieldMismatches: string[];
}

/**
 * Validate imported data structure against current schema
 */
export function validateImportData(data: any[]): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    totalRecords: data.length,
    validRecords: 0,
    invalidRecords: 0,
    errors: [],
    fieldMismatches: []
  };

  // Check for required schema fields in the data
  const schemaFields = [
    'set_by', 'provider', 'marketing_channel', 'call_type', 
    'start_date', 'start_time'
  ];
  
  const sampleRecord = data[0] || {};
  const dataFields = Object.keys(sampleRecord);
  
  // Check for missing required fields
  const missingFields = schemaFields.filter(field => !dataFields.includes(field));
  if (missingFields.length > 0) {
    result.fieldMismatches.push(`Missing required fields: ${missingFields.join(', ')}`);
  }

  // Validate each record
  data.forEach((record, index) => {
    try {
      // Transform field names to match schema
      const transformedRecord = transformFieldNames(record);
      
      // Basic validation for required fields
      const requiredFields = ['setBy', 'provider', 'marketingChannel', 'callType', 'startDate', 'startTime'];
      const missingRequired = requiredFields.filter(field => !transformedRecord[field]);
      
      if (missingRequired.length > 0) {
        throw new Error(`Missing required fields: ${missingRequired.join(', ')}`);
      }
      
      result.validRecords++;
    } catch (error) {
      result.invalidRecords++;
      result.isValid = false;
      
      let errorMessages: string[] = [];
      if (error instanceof z.ZodError) {
        errorMessages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
      } else {
        errorMessages = [String(error)];
      }
      
      result.errors.push({
        recordIndex: index,
        recordId: record.id,
        errors: errorMessages
      });
    }
  });

  return result;
}

/**
 * Transform field names from imported data to match current schema
 */
function transformFieldNames(record: any): any {
  const fieldMapping: Record<string, string> = {
    'set_by': 'setBy',
    'marketing_channel': 'marketingChannel',
    'client_name': 'clientName',
    'phone_number': 'phoneNumber',
    'client_uses_email': 'clientUsesEmail',
    'client_email': 'clientEmail',
    'call_type': 'callType',
    'street_address': 'streetAddress',
    'address_line_2': 'addressLine2',
    'zip_code': 'zipCode',
    'outcall_details': 'outcallDetails',
    'start_date': 'startDate',
    'start_time': 'startTime',
    'end_date': 'endDate',
    'end_time': 'endTime',
    'call_duration': 'callDuration',
    'client_id': 'clientId',
    'projected_revenue': 'contractPrice',
    'travel_expense': 'travelExpense',
    'hosting_expense': 'hostingExpense',
    'in_out_goes_to': 'inOutGoesTo',
    'total_expenses': 'totalDirectCosts',
    'deposit_amount': 'clientDeposit',
    'deposit_received_by': 'depositReceivedBy',
    'payment_process_used': 'paymentProcessUsed',
    'due_to_provider': 'providerBalanceDue',
    'has_client_notes': 'hasClientNotes',
    'client_notes': 'clientNotes',
    'disposition_status': 'dispositionStatus',
    'total_collected_cash': 'cashCollections',
    'total_collected_digital': 'electronicCollections',
    'total_collected': 'totalClientCollections',
    'recognized_revenue': 'recognizedRevenue',
    'deferred_revenue': 'deferredRevenue',
    'realized_revenue': 'realizedRevenue',
    'payment_processor': 'paymentProcessor',
    'payment_notes': 'paymentNotes',
    'see_client_again': 'seeClientAgain',
    'appointment_notes': 'appointmentNotes',
    'updated_start_date': 'updatedStartDate',
    'updated_start_time': 'updatedStartTime',
    'updated_end_date': 'updatedEndDate',
    'updated_end_time': 'updatedEndTime',
    'who_canceled': 'whoCanceled',
    'cancellation_details': 'cancellationDetails',
    'deposit_return_amount': 'depositRefundedToClient',
    'expense_reimbursement_amount': 'expenseReimbursementToClient',
    'overage_amount': 'excessCollections',
    'underpayment_amount': 'uncollectedContractBalance',
    'deposit_returned': 'depositReturned',
    'calendar_event_id': 'calendarEventId',
    'created_at': 'createdAt',
    'updated_at': 'updatedAt'
  };

  const transformed: any = {};
  
  Object.keys(record).forEach(key => {
    const mappedKey = fieldMapping[key] || key;
    let value = record[key];
    
    // Handle specific data transformations
    if (key === 'phone_number' && typeof value === 'number') {
      value = value.toString();
    }
    if (key === 'zip_code' && typeof value === 'number') {
      value = value.toString();
    }
    
    transformed[mappedKey] = value;
  });

  return transformed;
}

/**
 * Clean and prepare data for import
 */
export function cleanImportData(data: any[]): any[] {
  return data.map(record => {
    const cleaned = { ...record };
    
    // Remove the original id to let the database generate new ones
    delete cleaned.id;
    
    // Transform field names
    const transformed = transformFieldNames(cleaned);
    
    // Clean up data types and null values
    Object.keys(transformed).forEach(key => {
      if (transformed[key] === 'null' || transformed[key] === 'NULL') {
        transformed[key] = null;
      }
      
      // Convert string 'false'/'true' to boolean for boolean fields
      const booleanFields = ['clientUsesEmail', 'hasClientNotes', 'seeClientAgain', 'depositReturned'];
      if (booleanFields.includes(key) && typeof transformed[key] === 'string') {
        transformed[key] = transformed[key].toLowerCase() === 'true';
      }

      // Drizzle timestamp columns require Date instances, not ISO strings
      const timestampFields = ['createdAt', 'updatedAt'];
      if (timestampFields.includes(key)) {
        if (typeof transformed[key] === 'string' && transformed[key]) {
          const parsed = new Date(transformed[key]);
          transformed[key] = Number.isNaN(parsed.getTime()) ? null : parsed;
        } else if (transformed[key] == null) {
          delete transformed[key];
        }
      }
    });

    // Never import stale client FKs — remigrate/link after appointment import
    transformed.clientId = null;
    
    return transformed;
  });
}