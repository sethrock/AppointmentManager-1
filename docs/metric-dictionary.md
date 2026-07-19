# Metric Dictionary

**Appointment Scheduling Platform — Cash-Basis / Management Accounting Definitions**  
**Version:** 2.0  
**Last updated:** July 2026  
**Status:** Approved (CPA cash-basis rename)

This document is the single source of truth for what every financial field means, how it is calculated, and how it appears on the dashboard. Language is **cash-basis / management accounting** (collections, not GAAP accrual revenue recognition). All code (`shared/appointmentFinancials.ts`, `server/storage.ts`, dashboard, analytics) must align with these definitions.

**Database column names** remain snake_case matching the Replit export (`attached_assets/Database_exports_7.19.26`). TypeScript identifiers and UI labels use CPA cash-basis names.

---

## Principles

1. **Gross Cash Collections** is actual cash collected under agency control — not quoted contract prices.
2. **Booked Contract Value** is the sum of contract prices (pipeline) — valuable for planning, not the same as cash on hand.
3. **Provider Balance Due** never includes travel or hosting costs.
4. **Excess Collections** is auto-calculated on completion — users do not enter it.
5. **Cancellation refunds** are split: deposit refunded to client vs expense reimbursement to client.
6. **`inOutGoesTo`** identifies who pays travel/hosting costs — not who receives the deposit.

---

## Canonical glossary (UI → TS → DB)

| UI label | TypeScript identifier | DB column (export) |
|---------|----------------------|--------------------|
| Gross Cash Collections | `grossCashCollections` | computed only |
| Booked Contract Value | `bookedContractValue` | computed only |
| Contract Price | `contractPrice` | `projected_revenue` |
| Total Client Collections | `totalClientCollections` | `total_collected` |
| Completed Engagement Collections | `completedEngagementCollections` | computed only |
| Nonrefundable Deposits Retained | `nonrefundableDepositsRetained` | computed only |
| Excess Collections | `excessCollections` | `overage_amount` |
| Uncollected Contract Balance | `uncollectedContractBalance` | `underpayment_amount` |
| Provider Balance Due | `providerBalanceDue` | `due_to_provider` |
| Total Direct Costs | `totalDirectCosts` | `total_expenses` |
| Client Deposit | `clientDeposit` | `deposit_amount` |
| Deposit Refunded to Client | `depositRefundedToClient` | `deposit_return_amount` |
| Expense Reimbursement to Client | `expenseReimbursementToClient` | `expense_reimbursement_amount` |
| Cash Collections | `cashCollections` | `total_collected_cash` |
| Electronic Collections | `electronicCollections` | `total_collected_digital` |
| Lifetime Gross Cash Collections (client) | `lifetimeGrossCashCollections` | `total_revenue` |

Legacy DB columns `recognized_revenue` / `deferred_revenue` / `realized_revenue` remain for export compatibility and are deprecated.

---

## Core Booking Fields (user-entered)

| Field | DB column | Description |
|-------|-----------|-------------|
| **Contract Price** | `projected_revenue` (`contractPrice`) | The quoted appointment price agreed with the client. |
| **Client Deposit** | `deposit_amount` | Upfront money collected from the client at booking. |
| **Travel Expense** | `travel_expense` | Expected or actual travel costs (flights, Uber, gas, etc.). |
| **Hosting Expense** | `hosting_expense` | Expected or actual venue/hosting costs. |
| **IN/OUT Goes To** | `in_out_goes_to` | Who is responsible for paying travel/hosting: `agency` or `provider`. |
| **Deposit Received By** | `deposit_received_by` | Who physically received the deposit (agency or provider) — informational; does not change formulas. |

---

## Derived Booking Fields (auto-calculated)

| Metric | Formula | Example |
|--------|---------|---------|
| **Provider Balance Due** | `contractPrice − clientDeposit` | $5,000 − $1,000 = **$4,000** |
| **Total Direct Costs** | `travelExpense + hostingExpense` | $200 + $150 = **$350** |
| **Booking identity check** | `clientDeposit + providerBalanceDue = contractPrice` | $1,000 + $4,000 = $5,000 ✓ |

**Notes:**

- Direct costs do not affect Provider Balance Due.
- `inOutGoesTo` determines who bears travel/hosting cost operationally; it is not yet wired into reports (implementation pending).

---

## Completion Fields (disposition = Complete)

Entered at completion:

| Field | DB column | Description |
|-------|-----------|-------------|
| **Cash Collections** | `total_collected_cash` | Cash received at or after the appointment. |
| **Electronic Collections** | `total_collected_digital` | Card, transfer, or other non-cash payment at completion. |

Auto-calculated:

| Metric | Formula | Example |
|--------|---------|---------|
| **Total Client Collections** | `clientDeposit + cashCollections + electronicCollections` | $1,000 + $1,000 + $4,000 = **$6,000** |
| **Excess Collections** | `max(0, totalClientCollections − contractPrice)` | $6,000 − $5,000 = **$1,000** |
| **Uncollected Contract Balance** | `max(0, contractPrice − totalClientCollections)` | $5,000 − $2,000 = **$3,000** |
| **Has Uncollected Balance** | `uncollectedContractBalance > 0` | UI warning flag on complete appointments |
| **Completed Engagement Collections** | `totalClientCollections` | **$6,000** |

Excess collections and uncollected contract balance are mutually exclusive (one, the other, or neither).

---

## Cancellation Fields (disposition = Cancel)

Entered at cancellation:

| Field | DB column | Description |
|-------|-----------|-------------|
| **Deposit Refunded to Client** | `deposit_return_amount` | Portion of the **service deposit** returned to the client. |
| **Expense Reimbursement to Client** | `expense_reimbursement_amount` | Travel/hosting prepayments returned to the client (e.g. airfare, venue deposit). |

Auto-calculated:

| Metric | Formula | Example |
|--------|---------|---------|
| **Nonrefundable Deposits Retained** | `clientDeposit − depositRefundedToClient` | $1,000 − $500 = **$500** |
| **Total Cash Returned to Client** | `depositRefundedToClient + expenseReimbursementToClient` | $500 + $200 = **$700** |

**Notes:**

- Nonrefundable Deposits Retained is service-deposit collections only.
- Expense reimbursement is a separate outflow (pass-through of prepayments), not engagement collections.

---

## Dashboard Metrics

### Primary headline — Gross Cash Collections

**Question answered:** "How much actual cash do we control right now?"

```
GrossCashCollections =
  SUM(Scheduled/Rescheduled): clientDeposit where deposit was received
+ SUM(Complete): totalClientCollections (= deposit + cash + electronic)
+ SUM(Cancel): clientDeposit − depositRefundedToClient
```

This is **not** booked contract value. It is real money under agency control (cash-basis).

### Secondary — Booked Contract Value

**Question answered:** "How much business have we booked?"

```
BookedContractValue = SUM(contractPrice) across all appointments
```

### Additional dashboard cards

| Card | Formula | Purpose |
|------|---------|---------|
| **Completed Engagement Collections** | `SUM(totalClientCollections)` where status = Complete | Collections from finished engagements only |
| **Nonrefundable Deposits Retained** | `SUM(clientDeposit − depositRefundedToClient)` where status = Cancel | Net service deposits retained on cancellations |

---

## Schema / Implementation Status

| Change | Status |
|--------|--------|
| Add `overage_amount` / `underpayment_amount` / `expense_reimbursement_amount` | Done |
| Unify `total_collected` = deposit + cash + digital on create **and** update | Done |
| Single calculation module (`shared/appointmentFinancials.ts`) | Done |
| Secure import recomputes all derived financial fields | Done |
| CPA cash-basis UI + TypeScript identifier rename | Done |
| Wire `inOutGoesTo` into expense attribution reports | Pending (Medium) |
| Deprecate recognized/deferred/realized revenue fields | Pending (Medium) |

---

## Related Documents

- [appointment-lifecycle.md](./appointment-lifecycle.md) — money flow by disposition status
- [golden-appointment-workbook.md](./golden-appointment-workbook.md) — reconciliation workbook
- [golden-appointment-workbook.json](./golden-appointment-workbook.json) — machine-readable workbook data
