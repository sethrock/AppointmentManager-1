import fs from 'fs';
import { Pool } from 'pg';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function importDatabase() {
  console.log('Starting secure database import...');
  
  try {
    // Read and parse the JSON file
    const data = JSON.parse(fs.readFileSync('./server/data/6.2.25_database.json', 'utf8'));
    console.log(`Found ${data.length} records to import`);

    // Validate data structure
    const requiredFields = ['set_by', 'provider', 'marketing_channel', 'call_type', 'start_date', 'start_time'];
    let validRecords = 0;
    let invalidRecords = 0;
    const errors = [];

    data.forEach((record, index) => {
      const missing = requiredFields.filter(field => !record[field]);
      if (missing.length > 0) {
        invalidRecords++;
        errors.push(`Record ${index}: Missing ${missing.join(', ')}`);
      } else {
        validRecords++;
      }
    });

    console.log(`Validation: ${validRecords} valid, ${invalidRecords} invalid records`);
    
    if (invalidRecords > 0) {
      console.log('First 5 errors:', errors.slice(0, 5));
      if (invalidRecords > data.length * 0.1) {
        throw new Error('Too many validation errors (>10%). Aborting import.');
      }
    }

    // Clear current appointments
    console.log('Clearing current appointments table...');
    await pool.query('DELETE FROM appointments');

    // Import records
    console.log('Importing records...');
    let imported = 0;
    const importErrors = [];

    for (const record of data) {
      try {
        // Transform field names and clean data
        const transformed = {
          set_by: record.set_by,
          provider: record.provider,
          marketing_channel: record.marketing_channel,
          client_name: record.client_name,
          phone_number: record.phone_number?.toString(),
          client_uses_email: record.client_uses_email || false,
          client_email: record.client_email,
          call_type: record.call_type,
          street_address: record.street_address,
          address_line_2: record.address_line_2,
          city: record.city,
          state: record.state,
          zip_code: record.zip_code?.toString(),
          outcall_details: record.outcall_details,
          start_date: record.start_date,
          start_time: record.start_time,
          end_date: record.end_date,
          end_time: record.end_time,
          call_duration: record.call_duration,
          projected_revenue: record.projected_revenue,
          travel_expense: record.travel_expense || 0,
          hosting_expense: record.hosting_expense || 0,
          in_out_goes_to: record.in_out_goes_to,
          total_expenses: record.total_expenses || 0,
          deposit_amount: record.deposit_amount || 0,
          deposit_received_by: record.deposit_received_by,
          payment_process_used: record.payment_process_used,
          due_to_provider: record.due_to_provider || 0,
          has_client_notes: record.has_client_notes || false,
          client_notes: record.client_notes,
          disposition_status: record.disposition_status,
          total_collected_cash: record.total_collected_cash || 0,
          total_collected_digital: record.total_collected_digital || 0,
          total_collected: record.total_collected || 0,
          recognized_revenue: record.recognized_revenue || 0,
          deferred_revenue: record.deferred_revenue || 0,
          realized_revenue: record.realized_revenue || 0,
          payment_processor: record.payment_processor,
          payment_notes: record.payment_notes,
          see_client_again: record.see_client_again || false,
          appointment_notes: record.appointment_notes,
          updated_start_date: record.updated_start_date,
          updated_start_time: record.updated_start_time,
          updated_end_date: record.updated_end_date,
          updated_end_time: record.updated_end_time,
          who_canceled: record.who_canceled,
          cancellation_details: record.cancellation_details,
          deposit_return_amount: record.deposit_return_amount || 0,
          deposit_returned: record.deposit_returned || false,
          calendar_event_id: record.calendar_event_id
        };

        // Build SQL query
        const fields = Object.keys(transformed).join(', ');
        const values = Object.values(transformed);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
        
        await pool.query(
          `INSERT INTO appointments (${fields}) VALUES (${placeholders})`,
          values
        );
        
        imported++;
      } catch (error) {
        importErrors.push(`Record ${record.id}: ${error.message}`);
      }
    }

    console.log(`Import completed: ${imported} records imported`);
    console.log(`Errors: ${importErrors.length}`);
    
    if (importErrors.length > 0) {
      console.log('First 3 import errors:', importErrors.slice(0, 3));
    }

    // Verify final count
    const result = await pool.query('SELECT COUNT(*) FROM appointments');
    console.log(`Final appointment count: ${result.rows[0].count}`);

    return {
      success: true,
      imported,
      errors: importErrors.length,
      totalRecords: data.length
    };

  } catch (error) {
    console.error('Import failed:', error.message);
    return { success: false, error: error.message };
  } finally {
    await pool.end();
  }
}

importDatabase()
  .then(result => {
    console.log('Import result:', result);
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Script error:', error);
    process.exit(1);
  });