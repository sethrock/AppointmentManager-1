import type { Appointment } from "./schema";

export type FinancialInput = Pick<
  Appointment,
  | "grossRevenue"
  | "depositAmount"
  | "totalCollectedCash"
  | "totalCollectedDigital"
  | "travelExpense"
  | "hostingExpense"
  | "dispositionStatus"
  | "depositReturnAmount"
  | "expenseReimbursementAmount"
>;

export interface ComputedFinancials {
  totalExpenses: number;
  dueToProvider: number;
  totalCollected: number;
  overageAmount: number;
  underpaymentAmount: number;
  isUnderpayment: boolean;
  cancelRevenueKept: number;
  moneyWeControlContribution: number;
  completedRevenue: number;
  /** @deprecated Legacy column — maps to projected revenue */
  recognizedRevenue: number;
  /** @deprecated Legacy column — maps to money-we-control contribution */
  realizedRevenue: number;
  /** @deprecated Legacy column — zeroed; use dashboard aggregates instead */
  deferredRevenue: number;
}

function n(value: number | null | undefined): number {
  return Number(value) || 0;
}

export function computeAppointmentFinancials(
  input: FinancialInput,
): ComputedFinancials {
  const projected = n(input.grossRevenue);
  const deposit = n(input.depositAmount);
  const cash = n(input.totalCollectedCash);
  const digital = n(input.totalCollectedDigital);
  const depositReturn = n(input.depositReturnAmount);
  const status = input.dispositionStatus;

  const totalExpenses = n(input.travelExpense) + n(input.hostingExpense);
  const dueToProvider = projected - deposit;
  const totalCollected = deposit + cash + digital;

  const overageAmount =
    status === "Complete" ? Math.max(0, totalCollected - projected) : 0;
  const underpaymentAmount =
    status === "Complete" ? Math.max(0, projected - totalCollected) : 0;

  let cancelRevenueKept = 0;
  let moneyWeControlContribution = 0;
  let completedRevenue = 0;

  if (status === "Complete") {
    moneyWeControlContribution = totalCollected;
    completedRevenue = totalCollected;
  } else if (status === "Cancel") {
    cancelRevenueKept = deposit - depositReturn;
    moneyWeControlContribution = cancelRevenueKept;
  } else {
    // Scheduled, Reschedule, or unset
    moneyWeControlContribution = deposit;
  }

  return {
    totalExpenses,
    dueToProvider,
    totalCollected,
    overageAmount,
    underpaymentAmount,
    isUnderpayment: underpaymentAmount > 0,
    cancelRevenueKept,
    moneyWeControlContribution,
    completedRevenue,
    recognizedRevenue: projected,
    realizedRevenue: moneyWeControlContribution,
    deferredRevenue: 0,
  };
}

export interface DashboardMetrics {
  moneyWeControl: number;
  projectedGross: number;
  completedRevenue: number;
  cancelRevenueKept: number;
  underpaymentCount: number;
  overageCount: number;
}

export function computeDashboardMetrics(
  appointments: FinancialInput[],
): DashboardMetrics {
  let moneyWeControl = 0;
  let projectedGross = 0;
  let completedRevenue = 0;
  let cancelRevenueKept = 0;
  let underpaymentCount = 0;
  let overageCount = 0;

  for (const apt of appointments) {
    const f = computeAppointmentFinancials(apt);
    moneyWeControl += f.moneyWeControlContribution;
    projectedGross += n(apt.grossRevenue);
    if (apt.dispositionStatus === "Complete") {
      completedRevenue += f.completedRevenue;
      if (f.isUnderpayment) underpaymentCount++;
      if (f.overageAmount > 0) overageCount++;
    }
    if (apt.dispositionStatus === "Cancel") {
      cancelRevenueKept += f.cancelRevenueKept;
    }
  }

  return {
    moneyWeControl,
    projectedGross,
    completedRevenue,
    cancelRevenueKept,
    underpaymentCount,
    overageCount,
  };
}

export type CollectionStatus = "underpayment" | "exact" | "overage" | "none";

export function getCollectionStatus(
  input: FinancialInput,
): CollectionStatus {
  if (input.dispositionStatus !== "Complete") return "none";
  const f = computeAppointmentFinancials(input);
  if (f.isUnderpayment) return "underpayment";
  if (f.overageAmount > 0) return "overage";
  if (f.totalCollected === n(input.grossRevenue)) return "exact";
  return "none";
}