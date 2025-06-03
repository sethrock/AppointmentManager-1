import { db } from '../db';
import { appointments } from '@shared/schema';
import { log } from '../vite';
import fs from 'fs/promises';
import path from 'path';

/**
 * Create a complete backup of current appointments data
 */
export async function createAppointmentsBackup(): Promise<string> {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupTableName = `appointments_backup_${timestamp}`;
    
    // Create backup table with current data
    await db.execute(`CREATE TABLE ${backupTableName} AS SELECT * FROM appointments`);
    
    // Also export to JSON file for additional safety
    const currentData = await db.select().from(appointments);
    const backupFilePath = path.join(process.cwd(), 'server/data', `backup_${timestamp}.json`);
    
    await fs.writeFile(backupFilePath, JSON.stringify(currentData, null, 2));
    
    log(`Created backup table: ${backupTableName} and file: ${backupFilePath}`);
    return backupTableName;
  } catch (error) {
    log(`Error creating backup: ${error}`);
    throw error;
  }
}

/**
 * Restore appointments from backup table
 */
export async function restoreFromBackup(backupTableName: string): Promise<void> {
  try {
    // Clear current appointments
    await db.delete(appointments);
    
    // Restore from backup
    await db.execute(`INSERT INTO appointments SELECT * FROM ${backupTableName}`);
    
    log(`Restored appointments from backup: ${backupTableName}`);
  } catch (error) {
    log(`Error restoring from backup: ${error}`);
    throw error;
  }
}

/**
 * List available backup tables
 */
export async function listBackups(): Promise<string[]> {
  try {
    const result = await db.execute(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name LIKE 'appointments_backup_%'
      AND table_schema = current_schema()
    `);
    
    return result.rows.map(row => row.table_name as string);
  } catch (error) {
    log(`Error listing backups: ${error}`);
    return [];
  }
}