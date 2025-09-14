import { InsertProvider } from "@shared/schema";

/**
 * Parse CSV text into an array of objects
 */
export function parseCSV(csvText: string): Record<string, string>[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length === 0) return [];
  
  // Parse headers
  const headers = parseCSVLine(lines[0]);
  const results: Record<string, string>[] = [];
  
  // Parse each data row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines
    
    const values = parseCSVLine(line);
    if (values.length !== headers.length) {
      throw new Error(`Row ${i + 1}: Expected ${headers.length} columns but got ${values.length}`);
    }
    
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index];
    });
    
    results.push(row);
  }
  
  return results;
}

/**
 * Parse a single CSV line, handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let insideQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote mode
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      // End of field
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add last field
  values.push(current.trim());
  
  return values;
}

/**
 * Generate CSV from an array of providers
 */
export function generateCSV(providers: any[]): string {
  if (providers.length === 0) {
    return 'firstName,lastName,email,phone,jobTitle,department,employmentType,status,startDate,endDate,photoUrl\n';
  }
  
  const headers = [
    'firstName',
    'lastName', 
    'email',
    'phone',
    'jobTitle',
    'department',
    'employmentType',
    'status',
    'startDate',
    'endDate',
    'photoUrl'
  ];
  
  const rows = [headers.join(',')];
  
  for (const provider of providers) {
    const row = headers.map(header => {
      const value = provider[header] || '';
      return escapeCSVValue(String(value));
    });
    rows.push(row.join(','));
  }
  
  return rows.join('\n');
}

/**
 * Escape CSV value if it contains special characters
 */
function escapeCSVValue(value: string): string {
  // Check if value needs escaping
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    // Escape quotes by doubling them
    const escaped = value.replace(/"/g, '""');
    return `"${escaped}"`;
  }
  
  return value;
}

/**
 * Validate a provider row from CSV
 */
export function validateProviderRow(row: Record<string, string>, rowNumber: number): {
  valid: boolean;
  errors: Array<{ field: string; message: string }>;
  data?: Partial<InsertProvider>;
} {
  const errors: Array<{ field: string; message: string }> = [];
  
  // Required fields
  if (!row.firstName?.trim()) {
    errors.push({ field: 'firstName', message: 'First name is required' });
  }
  
  if (!row.lastName?.trim()) {
    errors.push({ field: 'lastName', message: 'Last name is required' });
  }
  
  // Validate email format if provided
  if (row.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(row.email)) {
      errors.push({ field: 'email', message: 'Invalid email format' });
    }
  }
  
  // Validate phone format if provided
  if (row.phone) {
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
    if (!phoneRegex.test(row.phone)) {
      errors.push({ field: 'phone', message: 'Invalid phone format' });
    }
  }
  
  // Validate employment type
  const validEmploymentTypes = ['Full-time', 'Part-time', 'Contract', 'Intern', 'Consultant'];
  if (row.employmentType && !validEmploymentTypes.includes(row.employmentType)) {
    errors.push({ 
      field: 'employmentType', 
      message: `Must be one of: ${validEmploymentTypes.join(', ')}` 
    });
  }
  
  // Validate status
  const validStatuses = ['Active', 'Inactive', 'On Leave', 'Terminated'];
  if (row.status && !validStatuses.includes(row.status)) {
    errors.push({ 
      field: 'status', 
      message: `Must be one of: ${validStatuses.join(', ')}` 
    });
  }
  
  // Validate dates
  if (row.startDate) {
    const startDate = new Date(row.startDate);
    if (isNaN(startDate.getTime())) {
      errors.push({ field: 'startDate', message: 'Invalid date format (use YYYY-MM-DD)' });
    }
  }
  
  if (row.endDate) {
    const endDate = new Date(row.endDate);
    if (isNaN(endDate.getTime())) {
      errors.push({ field: 'endDate', message: 'Invalid date format (use YYYY-MM-DD)' });
    }
    
    // Check if end date is after start date
    if (row.startDate) {
      const startDate = new Date(row.startDate);
      if (!isNaN(startDate.getTime()) && endDate < startDate) {
        errors.push({ field: 'endDate', message: 'End date must be after start date' });
      }
    }
  }
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  // Prepare clean data
  const data: Partial<InsertProvider> = {
    firstName: row.firstName.trim(),
    lastName: row.lastName.trim(),
    email: row.email?.trim() || null,
    phone: row.phone?.trim() || null,
    jobTitle: row.jobTitle?.trim() || null,
    department: row.department?.trim() || null,
    employmentType: row.employmentType?.trim() || 'Full-time',
    status: row.status?.trim() || 'Active',
    startDate: row.startDate ? new Date(row.startDate).toISOString() : null,
    endDate: row.endDate ? new Date(row.endDate).toISOString() : null,
    photoUrl: row.photoUrl?.trim() || null
  };
  
  return { valid: true, errors: [], data };
}

/**
 * Generate sample CSV template
 */
export function generateSampleCSV(): string {
  const headers = 'firstName,lastName,email,phone,jobTitle,department,employmentType,status,startDate,endDate,photoUrl';
  const sampleRows = [
    'John,Doe,john.doe@example.com,+1234567890,Software Engineer,Engineering,Full-time,Active,2024-01-15,,',
    'Jane,Smith,jane.smith@example.com,+0987654321,Product Manager,Product,Full-time,Active,2023-06-01,,',
    'Bob,Johnson,bob.j@example.com,,Designer,Design,Contract,Active,2024-03-01,2025-03-01,',
    'Alice,Williams,,+1112223333,HR Manager,Human Resources,Full-time,On Leave,2022-09-15,,',
  ];
  
  return [headers, ...sampleRows].join('\n');
}