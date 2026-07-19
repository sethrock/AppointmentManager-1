# Golden Appointment Workbook

> **Naming note (July 2026):** Dashboard metrics now use CPA cash-basis labels — Gross Cash Collections (was Money We Control), Booked Contract Value (was Projected Gross), Completed Engagement Collections, Nonrefundable Deposits Retained, Excess Collections, Uncollected Contract Balance. DB columns unchanged.

**Session 3 deliverable**  
**Generated:** 2026-06-29 from live Neon database (121 appointments)  
**Machine-readable data:** [golden-appointment-workbook.json](./golden-appointment-workbook.json)  
**Reference:** [metric-dictionary.md](./metric-dictionary.md)

---

## Executive summary

| Metric | Expected (dictionary) | Currently stored (legacy) | Delta |
|--------|----------------------|---------------------------|-------|
| **Projected Gross** | $443,000 | Recognized Revenue sum: $443,200 | ~aligned |
| **Money We Control** | $385,926 | Realized Revenue sum: $559,491 | **+$173,565 overstated** |
| **Completed Revenue** | $351,511 | — | not surfaced on dashboard |
| **Cancel Revenue Kept** | $28,600 | — | not surfaced on dashboard |

**Session 4 backfill complete:** 0 field mismatches across 121 appointments (2026-06-29). Previously 58 of 121 (48%) had mismatches before `appointmentFinancials` module and backfill.

### Top priority fixes from this workbook

1. Unify `totalCollected = deposit + cash + digital` on create **and** update.
2. Auto-calculate `overageAmount` and `underpaymentAmount` on complete.
3. Replace dashboard legacy cards (recognized/realized/deferred) with Money We Control + Projected Gross.
4. Flag underpayment in UI when `totalCollected < projectedRevenue` on complete appointments.

---

## Database snapshot

| Status | Count |
|--------|-------|
| Complete | 83 |
| Cancel | 31 |
| Scheduled (null status) | 5 |
| Reschedule | 2 |
| **Total** | **121** |

---

## Sample appointments (15 stratified)

### 1. ID 103 — Complete, exact pay ✓

| | Value |
|--|-------|
| Client | Shawn Baldwin |
| Projected | $3,000 |
| Deposit | $500 |
| Cash / Digital | $0 / $2,500 |
| **Expected total collected** | **$3,000** |
| Stored total collected | $3,000 |
| Overage / Underpayment | $0 / $0 |
| **Mismatch** | None |

---

### 2. ID 214 — Complete with overage ⚠️

| | Value |
|--|-------|
| Client | Andrew Haley |
| Projected | $3,000 |
| Deposit | $500 |
| Cash / Digital | $0 / $10,750 |
| **Expected total collected** | **$11,250** |
| Stored total collected | $10,750 (missing $500 deposit) |
| **Expected overage** | **$8,250** |
| **Mismatch** | `total_collected` excludes deposit |

---

### 3. ID 175 — Complete underpayment 🚩

| | Value |
|--|-------|
| Client | Stephen Davenport |
| Projected | $5,000 |
| Deposit | $0 |
| Cash / Digital | $2,000 / $0 |
| **Expected total collected** | **$2,000** |
| **Expected underpayment** | **$3,000** |
| Stored total collected | $2,000 (matches, but no underpayment flag exists) |
| **Action** | Flag as underpayment in UI |

---

### 4. ID 199 — Scheduled / open ✓

| | Value |
|--|-------|
| Client | Gus Castaneda |
| Projected | $2,200 |
| Deposit | $515 |
| **Money We Control contribution** | $515 |
| **Projected Gross contribution** | $2,200 |
| Unearned pipeline on this deal | $1,685 |
| **Mismatch** | None on core fields |

---

### 5. ID 179 — Reschedule ✓

| | Value |
|--|-------|
| Client | Jeff 'JJ' Johnson |
| Projected | $4,000 |
| Deposit | $4,000 (full amount upfront) |
| Due Upon Arrival | $0 |
| **Money We Control contribution** | $4,000 |
| Stored total collected | $0 (DB inconsistent — deposit not reflected) |

---

### 6. ID 119 — Cancel, keep deposit ✓

| | Value |
|--|-------|
| Client | James/jim Leale Jr |
| Deposit | $1,000 |
| Deposit return | $0 |
| **Cancel revenue kept** | **$1,000** |
| Note | Has $1,000 digital on cancelled record — review data entry |

---

### 7. ID 122 — Cancel, full deposit return ✓

| | Value |
|--|-------|
| Client | Steven Davenport |
| Deposit | $500 |
| Deposit return | $500 |
| **Cancel revenue kept** | **$0** |
| **Money We Control contribution** | $0 |

---

### 8. ID 192 — Cancel, partial return ✓

| | Value |
|--|-------|
| Client | Craig |
| Deposit | $500 |
| Deposit return | $100 |
| **Cancel revenue kept** | **$400** |
| Travel expense | $300 (expense reimbursement field not yet in schema) |

---

### 9. ID 121 — Complete, zero deposit ✓

| | Value |
|--|-------|
| Client | Big Mike |
| Projected | $1,400 |
| Deposit | $0 |
| Cash | $1,400 |
| **Total collected** | $1,400 — exact pay |

---

### 10. ID 259 — High value cancel ✓

| | Value |
|--|-------|
| Client | Randy Roth |
| Projected | $32,000 |
| Deposit | $10,000 |
| Deposit return | $0 |
| **Cancel revenue kept** | **$10,000** |
| Travel + Hosting | $1,500 + $1,500 |

---

### 11. ID 99 — DB mismatch (deposit dropped) 🔴

| | Value |
|--|-------|
| Client | Dhasharath Shrivathsa |
| Projected | $3,000 |
| Deposit | $3,000 |
| Digital at complete | $3,000 |
| **Expected total collected** | **$6,000** |
| Stored total collected | $3,000 |
| **Expected overage** | $3,000 |
| **Mismatch** | Deposit not included in stored `total_collected` |

---

### 12–15. Additional coverage

| ID | Client | Status | Projected | Expected TC | Stored TC | Overage | Underpay | Match |
|----|--------|--------|-----------|-------------|-----------|---------|----------|-------|
| 96 | Dhasharath | Complete | $10,000 | $13,000 | $13,000 | $3,000 | $0 | ✓ |
| 97 | Shawn Baldwin | Complete | $5,500 | $7,000 | $7,000 | $1,500 | $0 | ✓ |
| 98 | Shawn Baldwim | Complete | $6,500 | $6,600 | $6,600 | $100 | $0 | ✓ |
| 100 | Dhasharath | Complete | $2,000 | $4,000 | $2,000 | $2,000 | $0 | 🔴 |

---

## Mismatch patterns

| Pattern | Count (approx) | Root cause | Fix |
|---------|----------------|------------|-----|
| `total_collected` missing deposit on complete | ~40+ | `updateAppointment` sums cash+digital only | Always include deposit |
| Legacy realized revenue inflated | Dashboard-wide | Double-counts deposit in some paths | Replace with Money We Control |
| No overage field | All overage deals | Field doesn't exist | Add `overage_amount` auto-calc |
| No underpayment flag | ID 175, others | Not implemented | Add `underpayment_amount` + UI flag |
| Cancel with cash/digital present | Few | Data entry on cancelled records | Validation rule at cancel |

---

## Underpayment rule (confirmed)

When disposition = **Complete**:

```
underpaymentAmount = max(0, projectedRevenue − totalCollected)
isUnderpayment      = underpaymentAmount > 0
```

**Example (ID 175):** Projected $5,000, collected $2,000 → underpayment **$3,000** → show warning badge on appointment detail and list.

Overage and underpayment are mutually exclusive on a given appointment (one or the other, or neither).

---

## Dashboard targets after code fix

| Card | Correct value (all 121 appointments) |
|------|--------------------------------------|
| **Money We Control** | $385,926 |
| **Projected Gross** | $443,000 |
| **Completed Revenue** | $351,511 |
| **Cancel Revenue Kept** | $28,600 |

Current dashboard shows Recognized ($443,200) and Realized ($559,491) — **Realized overstates cash by ~$173k** due to inconsistent deposit handling and legacy formulas.

---

## Session 4 — complete (2026-06-29)

- `shared/appointmentFinancials.ts` — single calculation module
- Schema columns: `overage_amount`, `underpayment_amount`, `expense_reimbursement_amount`
- Backfill: `npm run db:backfill-financials` (121 appointments)
- Dashboard: Money We Control, Projected Gross, Completed Revenue, Cancel Revenue Kept
- UI: `CollectionStatusBadge` for underpayment / overage / paid-in-full
- Post-backfill dashboard: Money We Control $385,926 | Projected Gross $443,000 | 11 underpayments | 37 overages