/**
 * One-time backfill: recalculate all appointment financial fields per metric dictionary.
 * Run: npx tsx server/scripts/backfillAppointmentFinancials.ts
 */
import { neon } from "@neondatabase/serverless";
import ws from "ws";
import { neonConfig } from "@neondatabase/serverless";
import { computeAppointmentFinancials } from "../../shared/appointmentFinancials.js";

neonConfig.webSocketConstructor = ws;

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const sql = neon(process.env.DATABASE_URL);

  const rows = await sql`
    SELECT id, projected_revenue, deposit_amount, total_collected_cash, total_collected_digital,
           travel_expense, hosting_expense, disposition_status, deposit_return_amount,
           expense_reimbursement_amount
    FROM appointments
    ORDER BY id
  `;

  let updated = 0;
  for (const row of rows) {
    const financials = computeAppointmentFinancials({
      grossRevenue: Number(row.projected_revenue) || 0,
      depositAmount: Number(row.deposit_amount) || 0,
      totalCollectedCash: Number(row.total_collected_cash) || 0,
      totalCollectedDigital: Number(row.total_collected_digital) || 0,
      travelExpense: Number(row.travel_expense) || 0,
      hostingExpense: Number(row.hosting_expense) || 0,
      dispositionStatus: row.disposition_status,
      depositReturnAmount: Number(row.deposit_return_amount) || 0,
      expenseReimbursementAmount: Number(row.expense_reimbursement_amount) || 0,
    });

    await sql`
      UPDATE appointments SET
        total_expenses = ${financials.totalExpenses},
        due_to_provider = ${financials.dueToProvider},
        total_collected = ${financials.totalCollected},
        overage_amount = ${financials.overageAmount},
        underpayment_amount = ${financials.underpaymentAmount},
        recognized_revenue = ${financials.recognizedRevenue},
        deferred_revenue = ${financials.deferredRevenue},
        realized_revenue = ${financials.realizedRevenue},
        updated_at = NOW()
      WHERE id = ${row.id}
    `;
    updated++;
  }

  console.log(`Backfilled ${updated} appointments.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});