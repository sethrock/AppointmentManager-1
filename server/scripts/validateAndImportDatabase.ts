import { db } from '../db';
import { appointments } from '@shared/schema';
import fs from 'fs/promises';
import path from 'path';

interface ValidationResult {
  isValid: boolean;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  errors: string[];
  fieldMismatches: string[];
}

async function validateAndImportDatabase() {
  console.log('Starting database validation and import process...');
  
  try {
    // Step 1: Read the import file
    const filePath = path.join(process.cwd(), 'server/data/6.2.25_database.json');
    console.log(`Reading file: ${filePath}`);
    
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const importData = JSON.parse(fileContent);
    
    if (!Array.isArray(importData)) {
      throw new Error('Import file must contain an array of appointments');
    }

    console.log(`Found ${importData.length} records to validate`);

    // Step 2: Validate data structure
    const validation = validateDataStructure(importData);
    console.log('Validation results:', validation);

    if (!validation.isValid) {
      console.log('Validation failed with errors:', validation.errors);
      return validation;
    }

    // Step 3: Create backup
    console.log('Creating backup of current data...');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupTableName = `appointments_backup_${timestamp}`;
    
    await db.execute(`CREATE TABLE ${backupTableName} AS SELECT * FROM appointments`);
    console.log(`Backup created: ${backupTableName}`);

    // Step 4: Transform and clean data
    console.log('Transforming data...');
    const cleanedData = transformData(importData);

    // Step 5: Clear and import
    console.log('Clearing current appointments...');
    await db.delete(appointments);

    console.log('Importing new data...');
    let importedCount = 0;
    const errors = [];

    for (const record of cleanedData) {
      try {
        await db.insert(appointments).values(record);
        importedCount++;
      } catch (error) {
        errors.push(`Failed to import record ID ${record.id}: ${error}`);
        console.error(`Import error for record:`, error);
      }
    }

    console.log(`Import completed: ${importedCount} records imported, ${errors.length} errors`);
    
    return {
      success: true,
      backupTableName,
      totalRecords: importData.length,
      importedRecords: importedCount,
      errors
    };

  } catch (error) {
    console.error('Import process failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

function validateDataStructure(data: any[]): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    totalRecords: data.length,
    validRecords: 0,
    invalidRecords: 0,
    errors: [],
    fieldMismatches: []
  };

  // Required fields check
  const requiredFields = ['set_by', 'provider', 'marketing_channel', 'call_type', 'start_date', 'start_time'];
  
  data.forEach((record, index) => {
    const missingFields = requiredFields.filter(field => !record[field]);
    
    if (missingFields.length > 0) {
      result.invalidRecords++;
      result.isValid = false;
      result.errors.push(`Record ${index}: Missing required fields: ${missingFields.join(', ')}`);
    } else {
      result.validRecords++;
    }
  });

  return result;
}

function transformData(data: any[]): any[] {
  return data.map(record => {
    // Transform field names from snake_case to camelCase
    const transformed = {
      setBy: record.set_by,
      provider: record.provider,
      marketingChannel: record.marketing_channel,
      clientName: record.client_name,
      phoneNumber: record.phone_number?.toString(),
      clientUsesEmail: record.client_uses_email || false,
      clientEmail: record.client_email,
      callType: record.call_type,
      streetAddress: record.street_address,
      addressLine2: record.address_line_2,
      city: record.city,
      state: record.state,
      zipCode: record.zip_code?.toString(),
      outcallDetails: record.outcall_details,
      startDate: record.start_date,
      startTime: record.start_time,
      endDate: record.end_date,
      endTime: record.end_time,
      callDuration: record.call_duration,
      grossRevenue: record.projected_revenue,
      travelExpense: record.travel_expense || 0,
      hostingExpense: record.hosting_expense || 0,
      inOutGoesTo: record.in_out_goes_to,
      totalExpenses: record.total_expenses || 0,
      depositAmount: record.deposit_amount || 0,
      depositReceivedBy: record.deposit_received_by,
      paymentProcessUsed: record.payment_process_used,
      dueToProvider: record.due_to_provider || 0,
      hasClientNotes: record.has_client_notes || false,
      clientNotes: record.client_notes,
      dispositionStatus: record.disposition_status,
      totalCollectedCash: record.total_collected_cash || 0,
      totalCollectedDigital: record.total_collected_digital || 0,
      totalCollected: record.total_collected || 0,
      recognizedRevenue: record.recognized_revenue || 0,
      deferredRevenue: record.deferred_revenue || 0,
      realizedRevenue: record.realized_revenue || 0,
      paymentProcessor: record.payment_processor,
      paymentNotes: record.payment_notes,
      seeClientAgain: record.see_client_again || false,
      appointmentNotes: record.appointment_notes,
      updatedStartDate: record.updated_start_date,
      updatedStartTime: record.updated_start_time,
      updatedEndDate: record.updated_end_date,
      updatedEndTime: record.updated_end_time,
      whoCanceled: record.who_canceled,
      cancellationDetails: record.cancellation_details,
      depositReturnAmount: record.deposit_return_amount || 0,
      depositReturned: record.deposit_returned || false,
      calendarEventId: record.calendar_event_id
    };

    // Remove null values and clean up data
    Object.keys(transformed).forEach(key => {
      if (transformed[key] === null || transformed[key] === 'null') {
        transformed[key] = null;
      }
    });

    return transformed;
  });
}

// Run the validation and import
validateAndImportDatabase()
  .then(result => {
    console.log('Final result:', result);
    process.exit(0);
  })
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });