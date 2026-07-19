export type FinancialInput = {
  contractPrice?: number | null;
  clientDeposit?: number | null;
  cashCollections?: number | null;
  electronicCollections?: number | null;
  travelExpense?: number | null;
  hostingExpense?: number | null;
  dispositionStatus?: string | null;
  depositRefundedToClient?: number | null;
  expenseReimbursementToClient?: number | null;
};

export interface ComputedFinancials {
  totalDirectCosts: number;
  providerBalanceDue: number;
  totalClientCollections: number;
  excessCollections: number;
  uncollectedContractBalance: number;
  hasUncollectedBalance: boolean;
  nonrefundableDepositsRetained: number;
  grossCashCollectionsContribution: number;
  completedEngagementCollections: number;
  /** @deprecated Legacy column — maps to contract price */
  recognizedRevenue: number;
  /** @deprecated Legacy column — maps to gross cash collections contribution */
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
  const contractPrice = n(input.contractPrice);
  const deposit = n(input.clientDeposit);
  const cash = n(input.cashCollections);
  const electronic = n(input.electronicCollections);
  const depositRefunded = n(input.depositRefundedToClient);
  const status = input.dispositionStatus;

  const totalDirectCosts = n(input.travelExpense) + n(input.hostingExpense);
  const providerBalanceDue = contractPrice - deposit;
  const totalClientCollections = deposit + cash + electronic;

  const excessCollections =
    status === "Complete" ? Math.max(0, totalClientCollections - contractPrice) : 0;
  const uncollectedContractBalance =
    status === "Complete" ? Math.max(0, contractPrice - totalClientCollections) : 0;

  let nonrefundableDepositsRetained = 0;
  let grossCashCollectionsContribution = 0;
  let completedEngagementCollections = 0;

  if (status === "Complete") {
    grossCashCollectionsContribution = totalClientCollections;
    completedEngagementCollections = totalClientCollections;
  } else if (status === "Cancel") {
    nonrefundableDepositsRetained = deposit - depositRefunded;
    grossCashCollectionsContribution = nonrefundableDepositsRetained;
  } else {
    // Scheduled, Reschedule, or unset
    grossCashCollectionsContribution = deposit;
  }

  return {
    totalDirectCosts,
    providerBalanceDue,
    totalClientCollections,
    excessCollections,
    uncollectedContractBalance,
    hasUncollectedBalance: uncollectedContractBalance > 0,
    nonrefundableDepositsRetained,
    grossCashCollectionsContribution,
    completedEngagementCollections,
    recognizedRevenue: contractPrice,
    realizedRevenue: grossCashCollectionsContribution,
    deferredRevenue: 0,
  };
}

export interface DashboardMetrics {
  grossCashCollections: number;
  bookedContractValue: number;
  completedEngagementCollections: number;
  nonrefundableDepositsRetained: number;
  uncollectedBalanceCount: number;
  excessCollectionsCount: number;
}

export function computeDashboardMetrics(
  appointments: FinancialInput[],
): DashboardMetrics {
  let grossCashCollections = 0;
  let bookedContractValue = 0;
  let completedEngagementCollections = 0;
  let nonrefundableDepositsRetained = 0;
  let uncollectedBalanceCount = 0;
  let excessCollectionsCount = 0;

  for (const apt of appointments) {
    const f = computeAppointmentFinancials(apt);
    grossCashCollections += f.grossCashCollectionsContribution;
    bookedContractValue += n(apt.contractPrice);
    if (apt.dispositionStatus === "Complete") {
      completedEngagementCollections += f.completedEngagementCollections;
      if (f.hasUncollectedBalance) uncollectedBalanceCount++;
      if (f.excessCollections > 0) excessCollectionsCount++;
    }
    if (apt.dispositionStatus === "Cancel") {
      nonrefundableDepositsRetained += f.nonrefundableDepositsRetained;
    }
  }

  return {
    grossCashCollections,
    bookedContractValue,
    completedEngagementCollections,
    nonrefundableDepositsRetained,
    uncollectedBalanceCount,
    excessCollectionsCount,
  };
}

/** DB columns always derived from user-input fields — never trust import JSON for these */
export const COMPUTED_FINANCIAL_KEYS = [
  "totalDirectCosts",
  "providerBalanceDue",
  "totalClientCollections",
  "excessCollections",
  "uncollectedContractBalance",
  "recognizedRevenue",
  "deferredRevenue",
  "realizedRevenue",
] as const;

export type AppointmentFinancialFields = {
  totalDirectCosts: number;
  providerBalanceDue: number;
  totalClientCollections: number;
  excessCollections: number;
  uncollectedContractBalance: number;
  recognizedRevenue: number;
  deferredRevenue: number;
  realizedRevenue: number;
};

export function applyAppointmentFinancials(
  input: FinancialInput,
): AppointmentFinancialFields {
  const f = computeAppointmentFinancials(input);
  return {
    totalDirectCosts: f.totalDirectCosts,
    providerBalanceDue: f.providerBalanceDue,
    totalClientCollections: f.totalClientCollections,
    excessCollections: f.excessCollections,
    uncollectedContractBalance: f.uncollectedContractBalance,
    recognizedRevenue: f.recognizedRevenue,
    deferredRevenue: f.deferredRevenue,
    realizedRevenue: f.realizedRevenue,
  };
}

/**
 * Strip stale computed fields from an import record, then re-apply unified financials.
 */
export function prepareImportRecord<T extends Record<string, unknown>>(
  record: T,
): Omit<T, (typeof COMPUTED_FINANCIAL_KEYS)[number]> & AppointmentFinancialFields {
  const stripped = { ...record };
  for (const key of COMPUTED_FINANCIAL_KEYS) {
    delete stripped[key];
  }
  // Strip legacy camelCase keys from older transforms/imports
  const legacyKeys = [
    "totalExpenses",
    "dueToProvider",
    "totalCollected",
    "overageAmount",
    "underpaymentAmount",
    "grossRevenue",
    "depositAmount",
    "totalCollectedCash",
    "totalCollectedDigital",
    "depositReturnAmount",
    "expenseReimbursementAmount",
  ] as const;
  for (const key of legacyKeys) {
    delete stripped[key];
  }
  const financials = applyAppointmentFinancials(stripped as FinancialInput);
  return { ...stripped, ...financials };
}

export type CollectionStatus = "uncollected" | "exact" | "excess" | "none";

/** Single display source for per-appointment total client collections (deposit + cash + electronic). */
export function getAppointmentTotalClientCollections(input: FinancialInput): number {
  return computeAppointmentFinancials(input).totalClientCollections;
}

export function getCollectionStatus(
  input: FinancialInput,
): CollectionStatus {
  if (input.dispositionStatus !== "Complete") return "none";
  const f = computeAppointmentFinancials(input);
  if (f.hasUncollectedBalance) return "uncollected";
  if (f.excessCollections > 0) return "excess";
  if (f.totalClientCollections === n(input.contractPrice)) return "exact";
  return "none";
}
