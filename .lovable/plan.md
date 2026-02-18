
# QA Audit Report: Memo Recall & Settlement Flow

## Test 1 — Memo Recall: Is It Joining the Correct Table?

### Finding: The code is correct — but the prompt references the wrong table

The prompt says *"ensure the search bar joins with the `orders` table"*. After auditing the live code and the database, the correct table is **`pos_transactions`**, not `orders`. Here is why:

- Every POS sale generates a `transaction_number` in the format `TXN-20260218-0002` (confirmed via live DB query showing 5 real transactions).
- The `orders` table is the old legacy orders system used by the community marketplace, not the walk-in POS. It stores `order_number`, not `transaction_number`.
- The memo search correctly queries `pos_transactions` with `.ilike('transaction_number', '%TXN-...%')`.

**Verdict: Memo search is working on the correct table. No fix needed here.**

---

## Test 2 — Settlement Flow: 3-Part Audit

### Part A — Does the money appear in Analytics (Today's Income)?

**Finding: Partially working. Today's Income updates. Monthly Analytics does NOT.**

The `get_today_sales_total` RPC (which powers the Dashboard overview KPI) includes this:

```sql
(SELECT SUM(cp.amount)
 FROM customer_payments cp
 JOIN customers c ON c.id = cp.customer_id
 WHERE c.owner_id = get_owner_id()
   AND DATE(cp.payment_date) = CURRENT_DATE) AS payment_total
```

This correctly picks up the settlement payment — **Today's Income KPI will update after settlement**.

However, the `get_monthly_revenue_stats` RPC only sums `pos_transactions` — it does **not** include `customer_payments`. This means:

- Monthly Revenue card on the Dashboard will NOT reflect settlement income
- The Analytics module's monthly trend chart will NOT reflect it either

**This is a genuine bug.** A settlement of ৳10,000 collected today will appear in Today's Income but NOT in the monthly total — creating a discrepancy.

**Fix required: Update `get_monthly_revenue_stats` to include `customer_payments` in its monthly sum.**

### Part B — Does the Customer's "Due" drop to 0?

**Finding: Works correctly.**

The `handleSettleAccount` function uses an optimistic update pattern:
1. Instantly updates the React Query cache — customer moves from "Due" tab to "Paid" tab immediately (zero UI delay)
2. Inserts into `customer_payments` table
3. Updates `customers.total_due`, `cylinders_due`, `billing_status` in DB
4. On error: rolls back by invalidating the cache

**Verdict: Due drop works correctly. No fix needed.**

### Part C — Does the transaction appear in Business Diary?

**Finding: Works correctly.**

The Business Diary's `useBusinessDiaryQueries.ts` fetches `customer_payments` with:
```typescript
.gte('payment_date', startDate)
.lte('payment_date', endDate)
```

The settlement inserts `payment_date: new Date().toISOString().split('T')[0]` (e.g. `"2026-02-18"`). The column type is `timestamp with time zone` so the string is cast correctly. The Business Diary real-time subscription also listens to `customer_payments` INSERT events and invalidates the query immediately.

**Verdict: Business Diary updates correctly. No fix needed.**

---

## The One Genuine Bug: Monthly Stats RPC Missing Settlement Income

### Root Cause

`get_monthly_revenue_stats` only aggregates `pos_transactions`:

```sql
-- Current (incomplete):
SELECT SUM(total) FROM pos_transactions
WHERE owner_id = get_owner_id() AND is_voided = false
  AND created_at >= DATE_TRUNC('month', ...)
```

It should also add `customer_payments` for the same period:

```sql
-- Fixed version:
WITH pos_revenue AS (
  SELECT 
    COALESCE(SUM(CASE WHEN DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE) THEN total ELSE 0 END), 0) as current_month,
    COALESCE(SUM(CASE WHEN DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') THEN total ELSE 0 END), 0) as last_month
  FROM pos_transactions
  WHERE owner_id = get_owner_id() AND is_voided = false
    AND created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
),
payment_revenue AS (
  SELECT 
    COALESCE(SUM(CASE WHEN DATE_TRUNC('month', cp.payment_date::timestamp) = DATE_TRUNC('month', CURRENT_DATE) THEN cp.amount ELSE 0 END), 0) as current_month,
    COALESCE(SUM(CASE WHEN DATE_TRUNC('month', cp.payment_date::timestamp) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') THEN cp.amount ELSE 0 END), 0) as last_month
  FROM customer_payments cp
  JOIN customers c ON c.id = cp.customer_id
  WHERE c.owner_id = get_owner_id()
    AND cp.payment_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
)
SELECT 
  (p.current_month + r.current_month) AS current_month,
  (p.last_month + r.last_month) AS last_month,
  CASE WHEN (p.last_month + r.last_month) > 0 
    THEN ROUND((((p.current_month + r.current_month) - (p.last_month + r.last_month)) / (p.last_month + r.last_month)) * 100, 1)
    ELSE 0 
  END as growth_percent
FROM pos_revenue p, payment_revenue r;
```

### Implementation Plan

**1 database migration. 0 frontend code changes.**

The fix is a single `CREATE OR REPLACE FUNCTION` statement to update the `get_monthly_revenue_stats` RPC to include `customer_payments` in the monthly aggregation, joining through the `customers` table to scope by `owner_id`.

After this migration:
- The Dashboard monthly revenue card will include settlement income
- The Analytics module monthly trend chart will include settlement income
- Both `current_month` and `last_month` aggregations will be accurate

**No React Query invalidation changes needed** — the existing `refetchInterval: 120 * 1000` on the shared overview stats will pick up the updated RPC result automatically. The `sharedKeys.overview()` invalidation that already fires on `customer_payments` INSERT (in `useSharedQueries.ts` line 377-380) ensures the next poll immediately reflects the correct monthly total.

### File/Migration Change Summary

| # | Type | Change | Impact |
|---|---|---|---|
| 1 | DB Migration | Update `get_monthly_revenue_stats` RPC to include `customer_payments` | Monthly revenue KPI now counts settlement income |

**Zero frontend changes. Zero RLS changes. Zero new tables.**
