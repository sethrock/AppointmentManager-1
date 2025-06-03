import { db } from '../db';
import { appointments, Appointment } from '@shared/schema';
import { log } from '../vite';
import fs from 'fs/promises';
import path from 'path';
import { validateImportData, cleanImportData } from './dataValidationService';
import { createAppointmentsBackup, restoreFromBackup } from './databaseBackupService';
import { updateAppointmentRevenue } from './revenueService';

interface ImportResult {
  success: boolean;
  backupTableName?: string;
  totalRecords: number;
  importedRecords: number;
  skippedRecords: number;
  errors: string[];
  validationResult?: any;
}

/**
 * Safely import appointments from JSON file with backup and validation
 */
export async function secureImportAppointments(filePath: string): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    totalRecords: 0,
    importedRecords: 0,
    skippedRecords: 0,
    errors: []
  };

  try {
    // Step 1: Read and parse the import file
    log('Reading import file...');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const importData = JSON.parse(fileContent);
    
    if (!Array.isArray(importData)) {
      throw new Error('Import file must contain an array of appointments');
    }

    result.totalRecords = importData.length;
    log(`Found ${result.totalRecords} records to import`);

    // Step 2: Validate the import data
    log('Validating import data...');
    const validationResult = validateImportData(importData);
    result.validationResult = validationResult;

    if (!validationResult.isValid) {
      result.errors.push(`Validation failed: ${validationResult.invalidRecords} invalid records`);
      validationResult.errors.forEach(error => {
        result.errors.push(`Record ${error.recordIndex} (ID: ${error.recordId}): ${error.errors.join(', ')}`);
      });
      
      // If there are too many errors, don't proceed
      if (validationResult.invalidRecords > validationResult.totalRecords * 0.1) {
        throw new Error('Too many validation errors (>10%). Import aborted for safety.');
      }
    }

    // Step 3: Create backup of current data
    log('Creating backup of current appointments...');
    const backupTableName = await createAppointmentsBackup();
    result.backupTableName = backupTableName;

    // Step 4: Clean and prepare data for import
    log('Cleaning and preparing data...');
    const cleanedData = cleanImportData(importData);

    // Step 5: Clear current appointments table
    log('Clearing current appointments table...');
    await db.delete(appointments);

    // Step 6: Import new data in batches
    log('Importing new data...');
    const batchSize = 50;
    let importedCount = 0;

    for (let i = 0; i < cleanedData.length; i += batchSize) {
      const batch = cleanedData.slice(i, i + batchSize);
      
      try {
        // Process each record in the batch
        for (const record of batch) {
          try {
            // Apply revenue calculations
            const recordWithRevenue = updateAppointmentRevenue(record as any);
            const finalRecord = { ...record, ...recordWithRevenue };
            
            // Insert the record
            await db.insert(appointments).values(finalRecord);
            importedCount++;
          } catch (recordError) {
            result.skippedRecords++;
            result.errors.push(`Failed to import record: ${recordError}`);
            log(`Skipped record due to error: ${recordError}`);
          }
        }
        
        log(`Imported batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(cleanedData.length / batchSize)}`);
      } catch (batchError) {
        result.errors.push(`Batch import error: ${batchError}`);
        log(`Batch import error: ${batchError}`);
      }
    }

    result.importedRecords = importedCount;
    result.success = importedCount > 0;

    if (result.success) {
      log(`Successfully imported ${result.importedRecords} appointments`);
      log(`Backup created: ${backupTableName}`);
    } else {
      // If import failed, restore from backup
      log('Import failed, restoring from backup...');
      await restoreFromBackup(backupTableName);
      throw new Error('Import failed and data was restored from backup');
    }

  } catch (error) {
    result.success = false;
    result.errors.push(`Import error: ${error}`);
    log(`Import error: ${error}`);
  }

  return result;
}

/**
 * Preview import without actually importing
 */
export async function previewImport(filePath: string): Promise<{
  totalRecords: number;
  validationResult: any;
  sampleRecords: any[];
}> {
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const importData = JSON.parse(fileContent);
    
    if (!Array.isArray(importData)) {
      throw new Error('Import file must contain an array of appointments');
    }

    const validationResult = validateImportData(importData);
    const cleanedData = cleanImportData(importData);
    
    return {
      totalRecords: importData.length,
      validationResult,
      sampleRecords: cleanedData.slice(0, 3) // Show first 3 records as preview
    };
  } catch (error) {
    throw new Error(`Preview error: ${error}`);
  }
}