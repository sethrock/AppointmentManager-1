# Metric Dictionary

**Appointment Scheduling Platform — Financial Definitions**  
**Version:** 1.0  
**Last updated:** June 2026  
**Status:** Approved (Session 1)

This document is the single source of truth for what every financial field means, how it is calculated, and how it appears on the dashboard. All code (`server/storage.ts`, `revenueService`, dashboard, analytics) must align with these definitions.

---

## Principles

1. **Money We Control** is actual cash received — not quoted prices.
2. **Projected Gross** is quoted pipeline — valuable for planning, not the same as cash on hand.
3. **Due to Provider Upon Arrival** never includes travel or hosting expenses.
4. **Overage** is auto-calculated on completion — users do not enter it.
5. **Cancellation refunds** are split: service deposit return vs expense reimbursement.
6. **`inOutGoesTo`** identifies who pays travel/hosting expenses — not who receives the deposit.

---

## Core Booking Fields (user-entered)

| Field | DB column | Description |
|-------|-----------|-------------|
| **Projected Revenue** | `projected_revenue` (`grossRevenue`) | The quoted appointment price agreed with the client. |
| **Deposit Amount** | `deposit_amount` | Upfront money collected from the client at booking. |
| **Travel Expense** | `travel_expense` | Expected or actual travel costs (flights, Uber, gas, etc.). |
| **Hosting Expense** | `hosting_expense` | Expected or actual venue/hosting costs. |
| **IN/OUT Goes To** | `in_out_goes_to` | Who is responsible for paying travel/hosting: `agency` or `provider`. |
| **Deposit Received By** | `deposit_received_by` | Who physically received the deposit (agency or provider) — informational; does not change formulas. |

---

## Derived Booking Fields (auto-calculated)

| Metric | Formula | Example |
|--------|---------|---------|
| **Due to Provider Upon Arrival** | `projectedRevenue − depositAmount` | $5,000 − $1,000 = **$4,000** |
| **Total Expenses** | `travelExpense + hostingExpense` | $200 + $150 = **$350** |
| **Booking identity check** | `depositAmount + dueToProvider = projectedRevenue` | $1,000 + $4,000 = $5,000 ✓ |

**Notes:**

- Expenses do not affect Due to Provider Upon Arrival.
- `inOutGoesTo` determines who bears travel/hosting cost operationally; it is not yet wired into reports (implementation pending).

---

## Completion Fields (disposition = Complete)

Entered at completion:

| Field | DB column | Description |
|-------|-----------|-------------|
| **Cash Collected** | `total_collected_cash` | Cash received at or after the appointment. |
| **Digital Collected** | `total_collected_digital` | Card, transfer, or other non-cash payment at completion. |

Auto-calculated:

| Metric | Formula | Example |
|--------|---------|---------|
| **Total Collected** | `depositAmount + totalCollectedCash + totalCollectedDigital` | $1,000 + $1,000 + $4,000 = **$6,000** |
| **Overage Amount** | `max(0, totalCollected − projectedRevenue)` | $6,000 − $5,000 = **$1,000** |
| **Underpayment Amount** | `max(0, projectedRevenue − totalCollected)` | $5,000 − $2,000 = **$3,000** |
| **Is Underpayment** | `underpaymentAmount > 0` | UI warning flag on complete appointments |
| **Completed Revenue** | `totalCollected` | **$6,000** |

Overage and underpayment are mutually exclusive (one, the other, or neither).

**Overage example (full walkthrough):**

| Field | Value |
|-------|-------|
| Projected Revenue | $5,000 |
| Deposit Amount | $1,000 |
| Due to Provider Upon Arrival | $4,000 |
| Cash at completion | $1,000 |
| Digital at completion | $4,000 |
| Total Collected | $6,000 |
| Overage Amount | $1,000 (surplus — no user input required) |

When the client pays exactly the projected total, overage = $0.

---

## Cancellation Fields (disposition = Cancel)

Entered at cancellation:

| Field | DB column | Description |
|-------|-----------|-------------|
| **Deposit Return Amount** | `deposit_return_amount` | Portion of the **service deposit** returned to the client. |
| **Expense Reimbursement Amount** | `expense_reimbursement_amount` *(new — not in schema yet)* | Travel/hosting prepayments returned to the client (e.g. airfare, venue deposit). |

Auto-calculated:

| Metric | Formula | Example |
|--------|---------|---------|
| **Cancel Revenue Kept** | `depositAmount − depositReturnAmount` | $1,000 − $500 = **$500** |
| **Total Cash Returned to Client** | `depositReturnAmount + expenseReimbursementAmount` | $500 + $200 = **$700** |

**Notes:**

- Cancel Revenue Kept is service-deposit revenue only.
- Expense reimbursement is a separate outflow (pass-through of prepayments), not service revenue.
- Example: Client cancels 2 days out — full $500 service deposit refunded, but $200 airfare reimbursement is tracked separately.

---

## Dashboard Metrics

### Primary headline — Money We Control

**Question answered:** "How much actual cash do we have right now?"

```
MoneyWeControl =
  SUM(Scheduled/Rescheduled): depositAmount where deposit was received
+ SUM(Complete): totalCollected (= deposit + cash + digital)
+ SUM(Cancel): depositAmount − depositReturnAmount
```

| Appointment | Status | Calculation | Contributes |
|-------------|--------|-------------|-------------|
| Client A | Scheduled | $1,000 deposit received | $1,000 |
| Client B | Complete | $1,000 + $4,000 cash + $1,000 digital | $6,000 |
| Client C | Cancel | $500 deposit − $500 returned | $0 |
| **Total** | | | **$7,000** |

This is **not** projected quotes. It is real money under agency control.

### Secondary — Projected Gross

**Question answered:** "How much business have we booked?"

```
ProjectedGross = SUM(projectedRevenue) across all appointments
```

Uses quoted prices regardless of status. Scheduled, complete, and cancelled appointments all count.

| Appointment | Status | Projected Revenue |
|-------------|--------|-------------------|
| Client A | Scheduled | $5,000 |
| Client B | Complete | $5,000 |
| Client C | Cancel | $2,000 |
| **Total** | | **$12,000** |

### Additional dashboard cards

| Card | Formula | Purpose |
|------|---------|---------|
| **Completed Revenue** | `SUM(totalCollected)` where status = Complete | Revenue from finished appointments only |
| **Cancel Revenue Kept** | `SUM(depositAmount − depositReturnAmount)` where status = Cancel | Net service deposit retained on cancellations |
| **Unearned Pipeline** *(optional)* | `SUM(projectedRevenue)` on scheduled/rescheduled minus deposits already received on those deals | Booked business not yet fully collected |

### Why both headline and projected gross matter

| | Money We Control | Projected Gross |
|--|------------------|-----------------|
| **Measures** | Actual cash received | Total quoted pipeline |
| **Scheduled deal ($5k quote, $1k deposit)** | $1,000 | $5,000 |
| **Use for** | Spending, operations, cash decisions | Capacity, growth, booking health |

---

## Scheduled Appointments — Asset vs Liability (conceptual)

When an appointment is booked at $5,000 with $1,000 deposit:

- The **full $5,000 projected** represents booked business (shown in Projected Gross).
- The **$1,000 deposit** is cash in hand (shown in Money We Control).
- The **$4,000 not yet collected** is pipeline / unearned — the service has not been delivered; the client could still cancel.

The app should surface this gap without requiring formal accounting liability terminology.

---

## Fields to Deprecate / Replace

The app currently auto-calculates `recognizedRevenue`, `deferredRevenue`, and `realizedRevenue` in `server/services/revenueService.ts`. These do not match business vocabulary and should be replaced with:

| Old field | Replace with |
|-----------|--------------|
| `recognizedRevenue` | Remove or map to **Projected Revenue** per appointment |
| `deferredRevenue` | Remove |
| `realizedRevenue` | Map to **Total Collected** or contribution to **Money We Control** |
| Dashboard "Recognized/Realized/Deferred" cards | **Money We Control**, **Projected Gross**, **Completed Revenue**, **Cancel Revenue Kept** |

---

## Schema Changes Required

| Change | Priority |
|--------|----------|
| Add `overage_amount` (auto-calculated) | High |
| Add `underpayment_amount` (auto-calculated) + UI flag | High |
| Add `expense_reimbursement_amount` (cancel flow) | High |
| Unify `totalCollected` = deposit + cash + digital on create **and** update | High |
| Single calculation module (`appointmentFinancials.ts`) | High |
| Wire `inOutGoesTo` into expense attribution reports | Medium |
| Deprecate recognized/deferred/realized revenue fields | Medium |

---

## Known Code Bugs (as of audit)

| Location | Issue |
|----------|-------|
| `server/storage.ts` `createAppointment` | `totalCollected` includes deposit |
| `server/storage.ts` `updateAppointment` | `totalCollected` excludes deposit — **inconsistent** |
| `server/services/revenueService.ts` | `realizedRevenue` on complete adds deposit to `totalCollected` again — **double-count risk** |
| `server/services/futureEarningsService.ts` | References nonexistent `expenseAmount` — should be `totalExpenses` |
| `client/src/pages/dashboard.tsx` | UI manually adds deposit + cash + digital — may disagree with DB |
| `inOutGoesTo` | Captured in form, never used in calculations |

---

## Related Documents

- [appointment-lifecycle.md](./appointment-lifecycle.md) — money flow by disposition status (Session 2)
- [golden-appointment-workbook.md](./golden-appointment-workbook.md) — Session 3 reconciliation (121 live appointments)
- [golden-appointment-workbook.json](./golden-appointment-workbook.json) — machine-readable workbook data