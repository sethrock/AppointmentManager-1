import { InsertAppointment } from '@shared/schema';

/**
 * Transform raw JSON data from the old system to match our schema
 */
export function transformAppointmentData(inputData: any[]): any[] {
  return inputData.map(item => {
    // Create a new object with transformed data
    const transformed: any = {
      ...item,
      // Fix phoneNumber format (convert from number to string)
      phoneNumber: item.phoneNumber !== undefined ? String(item.phoneNumber) : null,
      
      // Fix callType format (convert "Out" to "out-call" and "In" to "in-call")
      callType: item.callType === "Out" ? "out-call" : 
                item.callType === "In" ? "in-call" : item.callType,
      
      // Fix zipCode format (convert from number to string)
      zipCode: item.zipCode !== undefined ? String(item.zipCode) : null,
      
      // Fix addressLine2 (convert from number to string if needed)
      addressLine2: item.addressLine2 !== null && typeof item.addressLine2 === 'number' ? 
                   String(item.addressLine2) : item.addressLine2,
      
      // Fix date format (extract just the date part from ISO format)
      startDate: item.startDate ? item.startDate.split('T')[0] : null,
      endDate: item.endDate ? item.endDate.split('T')[0] : null,
      updatedStartDate: item.updatedStartDate ? item.updatedStartDate.split('T')[0] : null,
      updatedEndDate: item.updatedEndDate ? item.updatedEndDate.split('T')[0] : null,
      
      // Fix time format (remove seconds from time)
      startTime: item.startTime ? item.startTime.split(':').slice(0, 2).join(':') : null,
      endTime: item.endTime ? item.endTime.split(':').slice(0, 2).join(':') : null,
      updatedStartTime: item.updatedStartTime ? item.updatedStartTime.split(':').slice(0, 2).join(':') : null,
      updatedEndTime: item.updatedEndTime ? item.updatedEndTime.split(':').slice(0, 2).join(':') : null,
      
      // Fix hasClientNotes (convert from "Yes"/"No" to boolean)
      hasClientNotes: item.hasClientNotes === "Yes",
      
      // Fix numeric fields with NaN values
      hostingExpense: isNaN(item.hostingExpense) ? 0 : item.hostingExpense,
      travelExpense: isNaN(item.travelExpense) ? 0 : item.travelExpense,
      grossRevenue: isNaN(item.grossRevenue) ? 0 : item.grossRevenue,
      depositAmount: isNaN(item.depositAmount) ? 0 : item.depositAmount,
      
      // Ensure seeClientAgain is a boolean
      seeClientAgain: typeof item.seeClientAgain === 'string' ? 
                       item.seeClientAgain === 'Yes' : item.seeClientAgain,
      
      // Ensure all numeric values that should be strings are converted
      totalCollectedCash: typeof item.totalCollectedCash === 'number' ? 
                         String(item.totalCollectedCash) : item.totalCollectedCash,
      totalCollectedDigital: typeof item.totalCollectedDigital === 'number' ? 
                            String(item.totalCollectedDigital) : item.totalCollectedDigital
    };
    
    return transformed;
  });
}