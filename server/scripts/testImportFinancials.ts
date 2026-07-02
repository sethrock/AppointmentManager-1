/**
 * Regression test: secure import must apply full financial fields (Bugbot PR #3).
 * Run: npx tsx server/scripts/testImportFinancials.ts
 */
import {
  applyAppointmentFinancials,
  prepareImportRecord,
} from "../../shared/appointmentFinancials.js";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ ${message}`);
  }
}

// Bugbot scenario: ID 214 — deposit missing from JSON total_collected
const bugbotRecord = {
  grossRevenue: 3000,
  depositAmount: 500,
  totalCollectedCash: 0,
  totalCollectedDigital: 10750,
  travelExpense: 100,
  hostingExpense: 0,
  dispositionStatus: "Complete",
  // Stale JSON values that must be ignored:
  totalCollected: 10750,
  dueToProvider: 2500,
  totalExpenses: 0,
  overageAmount: 8250,
};

console.log("applyAppointmentFinancials — Bugbot case");
const applied = applyAppointmentFinancials(bugbotRecord);
assert(applied.totalCollected === 11250, `totalCollected = 11250 (got ${applied.totalCollected})`);
assert(applied.overageAmount === 8250, `overageAmount = 8250 (got ${applied.overageAmount})`);
assert(applied.dueToProvider === 2500, `dueToProvider = 2500 (got ${applied.dueToProvider})`);
assert(applied.totalExpenses === 100, `totalExpenses = 100 (got ${applied.totalExpenses})`);

console.log("\nprepareImportRecord — strips stale JSON and recomputes");
const prepared = prepareImportRecord(bugbotRecord);
assert(prepared.totalCollected === 11250, `prepared totalCollected = 11250 (got ${prepared.totalCollected})`);
assert(prepared.dueToProvider === 2500, `prepared dueToProvider = 2500 (got ${prepared.dueToProvider})`);
assert(prepared.totalExpenses === 100, `prepared totalExpenses = 100 (got ${prepared.totalExpenses})`);
assert(
  (prepared as typeof bugbotRecord).totalCollected !== 10750 || prepared.totalCollected === 11250,
  "stale JSON totalCollected (10750) was overwritten",
);

// Underpayment case
const underpay = prepareImportRecord({
  grossRevenue: 5000,
  depositAmount: 0,
  totalCollectedCash: 2000,
  totalCollectedDigital: 0,
  dispositionStatus: "Complete",
  totalCollected: 2000,
  underpaymentAmount: 0,
});
assert(underpay.underpaymentAmount === 3000, `underpayment = 3000 (got ${underpay.underpaymentAmount})`);
assert(underpay.totalCollected === 2000, `underpay totalCollected = 2000`);

// Cancel case
const cancel = prepareImportRecord({
  grossRevenue: 3000,
  depositAmount: 500,
  depositReturnAmount: 100,
  dispositionStatus: "Cancel",
  totalCollected: 0,
  realizedRevenue: 400,
});
assert(cancel.totalCollected === 500, `cancel totalCollected = deposit (got ${cancel.totalCollected})`);
assert(cancel.realizedRevenue === 400, `cancel realizedRevenue = 400 (got ${cancel.realizedRevenue})`);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);