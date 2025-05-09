
import { Appointment, insertAppointmentSchema } from '@shared/schema';
import { storage } from '../storage';
import { log } from '../vite';
import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { transformAppointmentData } from './transformImportData';

/**
 * Import appointments from a JSON file
 * @param filePath Path to the JSON file containing appointment data
 * @returns Number of successfully imported appointments
 */
export async function importAppointmentsFromJson(filePath: string): Promise<{
  success: number;
  failed: number;
  errors: { index: number; errors: string[] }[];
}> {
  try {
    log(`Starting import from ${filePath}`, 'importService');
    
    // Read and parse the file
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const rawAppointmentsData = JSON.parse(fileContent);
    
    if (!Array.isArray(rawAppointmentsData)) {
      throw new Error('Import file must contain an array of appointments');
    }
    
    log(`Found ${rawAppointmentsData.length} appointments to import`, 'importService');
    
    // Transform the data to match our schema
    const appointmentsData = transformAppointmentData(rawAppointmentsData);
    log(`Transformed ${appointmentsData.length} appointments to match schema format`, 'importService');
    
    // Track import stats
    const result = {
      success: 0,
      failed: 0,
      errors: [] as { index: number; errors: string[] }[]
    };
    
    // Process each appointment
    for (let i = 0; i < appointmentsData.length; i++) {
      const appointmentData = appointmentsData[i];
      
      try {
        // Validate against schema
        const parsedData = insertAppointmentSchema.safeParse(appointmentData);
        
        if (!parsedData.success) {
          // Validation failed
          const validationError = fromZodError(parsedData.error);
          result.failed++;
          result.errors.push({
            index: i,
            errors: validationError.details.map(d => d.message)
          });
          continue;
        }
        
        // Save to database
        await storage.createAppointment(parsedData.data);
        result.success++;
        
        // Log progress periodically
        if (result.success % 10 === 0) {
          log(`Imported ${result.success} appointments so far`, 'importService');
        }
      } catch (error) {
        // Handle other errors
        result.failed++;
        result.errors.push({
          index: i,
          errors: [(error as Error).message]
        });
      }
    }
    
    log(`Import completed. Success: ${result.success}, Failed: ${result.failed}`, 'importService');
    return result;
  } catch (error) {
    log(`Error during import: ${error}`, 'importService');
    throw error;
  }
}

/**
 * Validate a JSON file against the appointment schema without importing
 * @param filePath Path to the JSON file to validate
 * @returns Validation results
 */
export async function validateImportFile(filePath: string): Promise<{
  valid: number;
  invalid: number;
  errors: { index: number; errors: string[] }[];
}> {
  try {
    // Read and parse the file
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const rawAppointmentsData = JSON.parse(fileContent);
    
    if (!Array.isArray(rawAppointmentsData)) {
      throw new Error('Import file must contain an array of appointments');
    }
    
    // Transform the data to match our schema
    const appointmentsData = transformAppointmentData(rawAppointmentsData);
    log(`Transformed ${appointmentsData.length} appointments for validation`, 'importService');
    
    // Track validation stats
    const result = {
      valid: 0,
      invalid: 0,
      errors: [] as { index: number; errors: string[] }[]
    };
    
    // Validate each appointment
    for (let i = 0; i < appointmentsData.length; i++) {
      const parsedData = insertAppointmentSchema.safeParse(appointmentsData[i]);
      
      if (parsedData.success) {
        result.valid++;
      } else {
        result.invalid++;
        const validationError = fromZodError(parsedData.error);
        result.errors.push({
          index: i,
          errors: validationError.details.map(d => d.message)
        });
      }
    }
    
    return result;
  } catch (error) {
    log(`Error during validation: ${error}`, 'importService');
    throw error;
  }
}
