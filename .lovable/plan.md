
# QA End-to-End Audit Report & Fix Plan

## Scenario Recap
Manager settles "Jamuna Gas Ltd" (a wholesale customer) with a 50,000 BDT credit collection via `handleSettleAccount`. This writes to two tables:
1. `customer_payments` — INSERT (the payment record)
2. `customers` — UPDATE (reduced `total_due`)

---

## Checkpoint 1: POS "Current Due" Auto-Update — PASS

**Trace:**
```
handleSettleAccount
  → supabase.customers.UPDATE (total_due -= 50,000)
  → Supabase Postgres CDC fires on 'customers' table
  → useUnifiedRealtime listener (line 371-373, useSharedQueries.ts)
      → invalidateWithDebounce(sharedKeys.customers(), 'normal') [1500ms]
  → ALSO: per-customer channel in POSCustomerLookup.tsx
      → filter: id=eq.{customer.id}
      → UPDATE event fires
      → onCustomerChange called with updated customer row
      → Toast: "Customer Updated"
```

**Verdict: TWO independent refresh paths exist.** The POS balance updates via the targeted per-customer subscription within ~100ms (no debounce on that channel). The shared cache also invalidates within 1500ms as a fallback. No fix needed.

---

## Checkpoint 2: Dashboard "Today's Collection" KPI — FAIL

**Root Cause — 3 layers of the problem:**

**Layer 1: The RPC only reads `pos_transactions`**

The `get_today_sales_total` SQL function (used by `useOverviewStats`) is:
```sql
SELECT COALESCE(SUM(total), 0)
FROM pos_transactions
WHERE owner_id = get_owner_id()
  AND DATE(created_at) = CURRENT_DATE
  AND is_voided = false;
```
A 50,000 BDT customer payment lands in `customer_payments`, not `pos_transactions`. The KPI reads only `pos_transactions`. The 50,000 BDT is **invisible** to the Dashboard "Today's Sale" card.

**Layer 2: `useDashboardRealtime` has no `customer_payments` listener**

In `src/hooks/useDashboardQueries.ts` (lines 178-215), the `useDashboardRealtime` hook listens to: `pos_transactions`, `lpg_brands`, `customers`, `community_orders`, `daily_expenses`. There is **no listener for `customer_payments`**. Even if the RPC were fixed, the Dashboard would never know to re-fetch.

**Layer 3: `useUnifiedRealtime` also has no `customer_payments` listener**

In `src/hooks/useSharedQueries.ts` (lines 331-399), the consolidated real-time channel also has no subscription for `customer_payments` inserts.

**Fix — 2 changes:**

### Fix A: Update `get_today_sales_total` RPC to include customer payments

The RPC needs a new version that sums both `pos_transactions` AND `customer_payments` for today. We create an updated SQL function via migration:

```sql
CREATE OR REPLACE FUNCTION public.get_today_sales_total()
RETURNS numeric
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (
      SELECT SUM(total) FROM pos_transactions
      WHERE owner_id = get_owner_id()
        AND DATE(created_at) = CURRENT_DATE
        AND is_voided = false
    ), 0
  )
  +
  COALESCE(
    (
      SELECT SUM(amount) FROM customer_payments
      WHERE owner_id = get_owner_id()
        AND payment_date = CURRENT_DATE
    ), 0
  );
$$;
```

Wait — we need to check if `customer_payments` has an `owner_id` column. Looking at the network request, the `customer_payments` query doesn't show `owner_id` in the select. We resolve this by joining through `customers`:

```sql
CREATE OR REPLACE FUNCTION public.get_today_sales_total()
RETURNS numeric
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(pos_total, 0) + COALESCE(payment_total, 0)
  FROM (
    SELECT
      (SELECT SUM(total) FROM pos_transactions
       WHERE owner_id = get_owner_id()
         AND DATE(created_at) = CURRENT_DATE
         AND is_voided = false) AS pos_total,
      (SELECT SUM(cp.amount)
       FROM customer_payments cp
       JOIN customers c ON c.id = cp.customer_id
       WHERE c.owner_id = get_owner_id()
         AND cp.payment_date = CURRENT_DATE) AS payment_total
  ) sub;
$$;
```

### Fix B: Add `customer_payments` listener to `useUnifiedRealtime` in `useSharedQueries.ts`

After the `customers` listener block (around line 370-373), add:

```typescript
// Customer payments (settlement receipts) — invalidate overview so Dashboard KPI refreshes
.on('postgres_changes',
  { event: 'INSERT', schema: 'public', table: 'customer_payments' },
  () => {
    invalidateWithDebounce(sharedKeys.overview(), 'critical');
    invalidateWithDebounce(sharedKeys.todayStats(), 'critical');
  }
)
```

This ensures: INSERT into `customer_payments` → overview cache invalidates → `get_today_sales_total` re-executes → Dashboard KPI shows updated total.

---

## Checkpoint 3: Business Diary "Customer Payment" Entry — PASS (with caveat)

**Trace:**
```
handleSettleAccount
  → supabase.customer_payments.INSERT
  → Supabase CDC fires on 'customer_payments' table
  → useBusinessDiaryRealtime (line 652, useBusinessDiaryQueries.ts)
      .on('postgres_changes', { table: 'customer_payments' }, debouncedInvalidate)
      → invalidates ['business-diary-sales', date, endDate] [1000ms debounce]
  → fetchSalesData re-runs
      → queries customer_payments with .gte('payment_date', startDate)
      → creates SaleEntry with source: 'Customer Payment', productName: 'Due Payment Received'
  → BusinessDiaryModule re-renders with new entry ✅
```

**Caveat:** This only works if the Business Diary module is currently mounted (i.e., the user is viewing it). If the user is on the Customer module, the `useBusinessDiaryRealtime` hook is **not mounted** because the diary component is lazy-loaded and unmounted. The data will be correct when the user navigates there — the staleTime is 30s, so a fresh fetch occurs on mount. This is acceptable behaviour (no silent staleness).

**Verdict: PASS** — entry labelled "Due Payment Received" with `source: 'Customer Payment'` appears correctly.

---

## Summary: Only 1 Real Fix Required

| Checkpoint | Status | Fix Required |
|---|---|---|
| POS "Current Due" auto-update | PASS — dual path (per-customer realtime + shared cache) | None |
| Dashboard "Today's Collection" KPI | **FAIL — `customer_payments` not in RPC** | Update `get_today_sales_total` RPC + add `customer_payments` listener to `useUnifiedRealtime` |
| Business Diary "Customer Payment" entry | PASS — `customer_payments` listener exists in diary realtime hook | None |

---

## Files to Change

| # | File | Change |
|---|---|---|
| 1 | Database migration (SQL) | Update `get_today_sales_total` to SUM both `pos_transactions` and `customer_payments` via JOIN |
| 2 | `src/hooks/useSharedQueries.ts` | Add `customer_payments INSERT` listener that invalidates `overview` and `todayStats` keys |

**Zero new dependencies. Zero new files. One migration, one listener addition.**
