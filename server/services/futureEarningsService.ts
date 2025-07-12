import { Appointment } from "@shared/schema";
import { storage } from "../storage";
import { startOfDay, addDays, addWeeks, addMonths, endOfDay } from "date-fns";

interface FutureEarningsOptions {
  timeframe: string;
  provider?: string;
  includeRescheduled: boolean;
}

interface EarningsSummary {
  projectedRevenue: number;
  expectedDeposits: number;
  netProjectedIncome: number;
  appointmentCount: number;
  averageValue: number;
  confidenceScore: number;
}

interface ProviderEarnings {
  provider: string;
  projectedRevenue: number;
  appointmentCount: number;
  averageValue: number;
}

interface DateEarnings {
  date: string;
  projectedRevenue: number;
  appointmentCount: number;
}

interface FutureEarningsResult {
  timeframe: string;
  summary: EarningsSummary;
  byProvider: ProviderEarnings[];
  byDate: DateEarnings[];
}

/**
 * Calculate future earnings based on scheduled appointments
 */
export async function calculateFutureEarnings(options: FutureEarningsOptions): Promise<FutureEarningsResult> {
  const { timeframe, provider, includeRescheduled } = options;
  
  // Get all appointments
  const appointments = await storage.getAppointments();
  
  // Calculate date range based on timeframe
  const today = startOfDay(new Date());
  let endDate: Date;
  
  switch (timeframe) {
    case 'today':
      endDate = endOfDay(today);
      break;
    case '1week':
      endDate = endOfDay(addDays(today, 7));
      break;
    case '2weeks':
      endDate = endOfDay(addWeeks(today, 2));
      break;
    case '3weeks':
      endDate = endOfDay(addWeeks(today, 3));
      break;
    case '1month':
      endDate = endOfDay(addMonths(today, 1));
      break;
    case 'all':
    default:
      endDate = new Date('2099-12-31'); // Far future date
      break;
  }
  
  // Filter appointments based on criteria
  const futureAppointments = appointments.filter(apt => {
    // Check if appointment has a valid future date
    if (!apt.startDate) return false;
    const aptDate = new Date(apt.startDate);
    if (isNaN(aptDate.getTime())) return false;
    if (aptDate < today) return false;
    if (timeframe !== 'all' && aptDate > endDate) return false;
    
    // Filter by provider if specified
    if (provider && apt.provider !== provider) return false;
    
    // Filter by status - include scheduled and optionally rescheduled
    const validStatuses = ['Scheduled', null, undefined];
    if (includeRescheduled) {
      validStatuses.push('Reschedule');
    }
    
    // Check if dispositionStatus is valid
    const isValidStatus = validStatuses.includes(apt.dispositionStatus as any);
    
    return isValidStatus;
  });
  
  // Calculate summary metrics
  const summary = calculateSummaryMetrics(futureAppointments);
  
  // Calculate by provider breakdown
  const byProvider = calculateProviderBreakdown(futureAppointments);
  
  // Calculate by date breakdown
  const byDate = calculateDateBreakdown(futureAppointments);
  
  return {
    timeframe,
    summary,
    byProvider,
    byDate
  };
}

/**
 * Calculate summary metrics for future appointments
 */
function calculateSummaryMetrics(appointments: Appointment[]): EarningsSummary {
  const projectedRevenue = appointments.reduce((sum, apt) => sum + (apt.grossRevenue || 0), 0);
  const expectedDeposits = appointments.reduce((sum, apt) => sum + (apt.depositAmount || 0), 0);
  const expectedExpenses = appointments.reduce((sum, apt) => sum + (apt.expenseAmount || 0), 0);
  const netProjectedIncome = projectedRevenue - expectedExpenses;
  const appointmentCount = appointments.length;
  const averageValue = appointmentCount > 0 ? projectedRevenue / appointmentCount : 0;
  
  // Calculate confidence score based on appointment attributes
  const confidenceScore = calculateConfidenceScore(appointments);
  
  return {
    projectedRevenue,
    expectedDeposits,
    netProjectedIncome,
    appointmentCount,
    averageValue,
    confidenceScore
  };
}

/**
 * Calculate earnings breakdown by provider
 */
function calculateProviderBreakdown(appointments: Appointment[]): ProviderEarnings[] {
  const providerMap = new Map<string, { revenue: number; count: number }>();
  
  appointments.forEach(apt => {
    const providerName = apt.provider || 'Unknown';
    const current = providerMap.get(providerName) || { revenue: 0, count: 0 };
    providerMap.set(providerName, {
      revenue: current.revenue + (apt.grossRevenue || 0),
      count: current.count + 1
    });
  });
  
  return Array.from(providerMap.entries())
    .map(([provider, data]) => ({
      provider,
      projectedRevenue: data.revenue,
      appointmentCount: data.count,
      averageValue: data.count > 0 ? data.revenue / data.count : 0
    }))
    .sort((a, b) => b.projectedRevenue - a.projectedRevenue);
}

/**
 * Calculate earnings breakdown by date
 */
function calculateDateBreakdown(appointments: Appointment[]): DateEarnings[] {
  const dateMap = new Map<string, { revenue: number; count: number }>();
  
  appointments.forEach(apt => {
    if (!apt.startDate) return;
    const date = new Date(apt.startDate);
    if (isNaN(date.getTime())) return;
    
    const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    const current = dateMap.get(dateKey) || { revenue: 0, count: 0 };
    dateMap.set(dateKey, {
      revenue: current.revenue + (apt.grossRevenue || 0),
      count: current.count + 1
    });
  });
  
  return Array.from(dateMap.entries())
    .map(([date, data]) => ({
      date,
      projectedRevenue: data.revenue,
      appointmentCount: data.count
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Calculate confidence score based on appointment attributes
 * Score is between 0 and 1, considering factors like:
 * - How many appointments have been rescheduled
 * - Deposit status
 * - Historical completion rates (could be enhanced with actual data)
 */
function calculateConfidenceScore(appointments: Appointment[]): number {
  if (appointments.length === 0) return 0;
  
  let totalScore = 0;
  
  appointments.forEach(apt => {
    let aptScore = 1.0;
    
    // Reduce score for rescheduled appointments
    if (apt.dispositionStatus === 'Reschedule') {
      aptScore *= 0.8;
    }
    
    // Reduce score based on number of reschedules
    if (apt.reschedule_occurrences && apt.reschedule_occurrences > 0) {
      aptScore *= Math.max(0.5, 1 - (apt.reschedule_occurrences * 0.1));
    }
    
    // Increase score if deposit is paid
    if (apt.depositPaidStatus === 'Paid') {
      aptScore *= 1.1;
    }
    
    // Cap score at 1.0
    aptScore = Math.min(1.0, aptScore);
    
    totalScore += aptScore;
  });
  
  return totalScore / appointments.length;
}