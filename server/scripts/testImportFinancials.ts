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
  contractPrice: 3000,
  clientDeposit: 500,
  cashCollections: 0,
  electronicCollections: 10750,
  travelExpense: 100,
  hostingExpense: 0,
  dispositionStatus: "Complete",
  // Stale JSON values that must be ignored:
  totalClientCollections: 10750,
  providerBalanceDue: 2500,
  totalDirectCosts: 0,
  excessCollections: 8250,
};

console.log("applyAppointmentFinancials — Bugbot case");
const applied = applyAppointmentFinancials(bugbotRecord);
assert(applied.totalClientCollections === 11250, `totalClientCollections = 11250 (got ${applied.totalClientCollections})`);
assert(applied.excessCollections === 8250, `excessCollections = 8250 (got ${applied.excessCollections})`);
assert(applied.providerBalanceDue === 2500, `providerBalanceDue = 2500 (got ${applied.providerBalanceDue})`);
assert(applied.totalDirectCosts === 100, `totalDirectCosts = 100 (got ${applied.totalDirectCosts})`);

console.log("\nprepareImportRecord — strips stale JSON and recomputes");
const staleTotalCollected = bugbotRecord.totalClientCollections;
const prepared = prepareImportRecord(bugbotRecord);
assert(prepared.totalClientCollections !== staleTotalCollected, `stale totalClientCollections ${staleTotalCollected} was overwritten (got ${prepared.totalClientCollections})`);
assert(prepared.totalClientCollections === 11250, `prepared totalClientCollections = 11250 (got ${prepared.totalClientCollections})`);
assert(prepared.providerBalanceDue === 2500, `prepared providerBalanceDue = 2500 (got ${prepared.providerBalanceDue})`);
assert(prepared.totalDirectCosts === 100, `prepared totalDirectCosts = 100 (got ${prepared.totalDirectCosts})`);

// Underpayment case
const underpay = prepareImportRecord({
  contractPrice: 5000,
  clientDeposit: 0,
  cashCollections: 2000,
  electronicCollections: 0,
  dispositionStatus: "Complete",
  totalClientCollections: 2000,
  uncollectedContractBalance: 0,
});
assert(underpay.uncollectedContractBalance === 3000, `underpayment = 3000 (got ${underpay.uncollectedContractBalance})`);
assert(underpay.totalClientCollections === 2000, `underpay totalClientCollections = 2000`);

// Cancel case
const cancel = prepareImportRecord({
  contractPrice: 3000,
  clientDeposit: 500,
  depositRefundedToClient: 100,
  dispositionStatus: "Cancel",
  totalClientCollections: 0,
  realizedRevenue: 400,
});
assert(cancel.totalClientCollections === 500, `cancel totalClientCollections = deposit (got ${cancel.totalClientCollections})`);
assert(cancel.realizedRevenue === 400, `cancel realizedRevenue = 400 (got ${cancel.realizedRevenue})`);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);