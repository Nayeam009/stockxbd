
# Retail / Wholesale Integration — Sync Repair Plan

## Audit Summary

After tracing all paths — the real-time subscription channel, the `complete_pos_sale` RPC, the Dashboard KPI aggregation, and every data flow between POS and the Customer module — here is the precise finding for each check.

---

## Check 1: Real-Time Subscription — PASS (No Repair Needed)

**Finding:** The `useUnifiedRealtime()` hook in `src/hooks/useSharedQueries.ts` (lines 370-373) listens to ALL rows on the `customers` table unconditionally:

```typescript
.on('postgres_changes',
  { event: '*', schema: 'public', table: 'customers' },
  () => invalidateWithDebounce(sharedKeys.customers(), 'normal')
)
```

**Analysis:** The Postgres CDC (`postgres_changes`) event fires on ANY row change in the `customers` table regardless of column values. There is no `filter: 'customer_type=eq.retail'` predicate. This means a `customer_type = 'wholesale'` update triggers `sharedKeys.customers()` invalidation identically to a retail update.

**Verdict:** CLEAN. Both the Dashboard and the Wholesale module share the same `sharedKeys.customers()` React Query cache. A single `postgres_changes` event on any customer row — retail or wholesale — invalidates the entire `customers` cache, causing all consumers (POS, CustomerManagementModule retail view, CustomerManagementModule wholesale view) to refetch in parallel within the 1500ms debounce window.

**However — one secondary gap exists:** The `pos_transactions` listener in `useUnifiedRealtime` only invalidates `overview` and `todayStats`. It does NOT invalidate `customers`. The gap path is:

```
POS sale → complete_pos_sale RPC updates customer.total_due → 
customers table row changes → 
postgres_changes fires on 'customers' table → 
customers cache invalidated ✅ (this leg works)
```

But the event path through `moduleEvents` also fires `notifySaleCompleted`, which in `CustomerManagementModule.tsx` (line 173-176) directly calls:
```typescript
queryClient.invalidateQueries({ queryKey: sharedKeys.customers(), refetchType: 'active' })
```

So the customer balance updates through **two parallel paths** after a POS sale — both the Postgres CDC and the module event bus. This is belt-and-suspenders. The Customer Balance display updates correctly.

---

## Check 2: POS → Wholesale Customer Due Update — PASS (No Repair Needed)

**Finding:** The `complete_pos_sale` RPC (lines in the DB functions) updates `total_due` using:

```sql
UPDATE customers SET
  total_due = COALESCE(total_due, 0) + p_remaining_due,
  billing_status = 'pending',
  last_order_date = now()
WHERE id = p_customer_id AND owner_id = v_owner_id;
```

The WHERE clause only uses `id` and `owner_id` — there is no `customer_type` filter. The RPC is completely agnostic to customer type. A wholesale customer's `total_due` is updated identically to a retail customer's.

**POS UI Balance Refresh Path:**

1. `complete_pos_sale` RPC runs → `customers` row updated
2. Supabase realtime fires `postgres_changes` on `customers` table
3. `useUnifiedRealtime` debounces and calls `queryClient.invalidateQueries(sharedKeys.customers())`
4. `POSCustomerLookup` is fed from `usePOSData` → `useSharedCustomers` → same cache key
5. The customer badge showing "Due: ৳X,XXX" on the customer lookup card updates within 1500ms

**Verdict:** CLEAN. The wholesale customer's `total_due` updates correctly through both the RPC and the realtime listener.

---

## Check 3: Dashboard KPI Aggregation — PARTIAL GAP FOUND

**Finding:** The Dashboard's "Total Receivables" figure is NOT shown as a direct KPI on the `DashboardOverview` component at all. The KPI cards show:
- Today's Sale (revenue from POS)
- Today's Expense
- Today's Profit
- Active Orders count

**The `totalAmountDue` figure lives exclusively in `CustomerManagementModule.tsx` (line 405):**

```typescript
const totalAmountDue = dueCustomers.reduce((sum, c) => sum + Number(c.total_due), 0);
```

where `dueCustomers = customers.filter(c => c.total_due > 0 || c.cylinders_due > 0)` — this filters ALL customers with dues, irrespective of `customer_type`. So the "Total Due" shown inside the Customer module is correct and includes both retail AND wholesale dues.

**The gap:** `useDashboardData.ts` at line 197 fetches customers for the dashboard overview with a reduced query:

```typescript
supabase.from('customers').select('id, name, phone, address, total_due').order('name').limit(200)
```

This `total_due` data populates the `Customer[]` array used only by `analytics.totalCustomers`, `analytics.activeCustomers`, and `analytics.lostCustomers` — none of which are broken down by `customer_type`. The `get_customer_stats` RPC exists in the database (confirmed via `types.ts`) but is NOT called anywhere in the codebase. It would return a combined `total_due_amount` for all customers, making it the correct aggregation function to use.

**Verdict:** The dashboard does not show a "Total Receivables" KPI by design — the current KPIs are revenue/expense/profit/orders. No filter accidentally excludes wholesale from the `totalAmountDue` calculation because that calculation is done in `CustomerManagementModule` on the complete unfiltered customer list. However, the `useDashboardData` overview fetch at line 197 does NOT select `customer_type`, which means if someone were to add a type-segmented KPI to the Dashboard later, the data would be missing.

---

## Repair Plan — 2 Issues, 1 Enhancement

### Issue 1 (Minor): `useDashboardData` overview query missing `customer_type`
**Risk:** If a "Retail Due vs Wholesale Due" KPI is ever added to `DashboardOverview`, it would silently show `undefined` because the column isn't fetched.
**Fix:** Add `customer_type` to the reduced select in line 197 of `src/hooks/useDashboardData.ts`:
```typescript
// BEFORE:
supabase.from('customers').select('id, name, phone, address, total_due').order('name').limit(200)

// AFTER:
supabase.from('customers').select('id, name, phone, address, total_due, customer_type').order('name').limit(200)
```

### Issue 2 (Critical): `pos_transactions` realtime listener does NOT trigger `customers` cache invalidation
**Risk:** In an edge case where `notifySaleCompleted` module event fails to fire (e.g., the component is unmounted), the `customers` cache is stale until the Postgres CDC fires. This is currently mitigated by the dual-path (CDC fires anyway), but the `useUnifiedRealtime` hook should also explicitly invalidate `customers` when a new `pos_transactions` row is inserted, to make the refresh reliable without depending on the module event bus.

**Fix:** In `src/hooks/useSharedQueries.ts`, add `customers` invalidation to the `pos_transactions` listener:
```typescript
// BEFORE (lines 354-360):
.on('postgres_changes',
  { event: '*', schema: 'public', table: 'pos_transactions' },
  () => {
    invalidateWithDebounce(sharedKeys.overview(), 'critical');
    invalidateWithDebounce(sharedKeys.todayStats(), 'critical');
  }
)

// AFTER:
.on('postgres_changes',
  { event: 'INSERT', schema: 'public', table: 'pos_transactions' },
  () => {
    invalidateWithDebounce(sharedKeys.overview(), 'critical');
    invalidateWithDebounce(sharedKeys.todayStats(), 'critical');
    invalidateWithDebounce(sharedKeys.customers(), 'critical'); // NEW
  }
)
```

Note: scoped to `INSERT` only (not `*`) because a new sale creates a new row — no need to re-fetch customers on UPDATE/DELETE of transactions.

### Enhancement (No Risk): Add `get_customer_stats` RPC call to the Dashboard Overview
The `get_customer_stats` database RPC already exists and returns `{ total_customers, customers_with_due, total_due_amount }` — a single server-side aggregation of ALL customers across both types. This can optionally be called in `useSharedOverviewStats` to add a "Total Receivables" KPI card to the Dashboard, showing the combined retail+wholesale outstanding amount without any additional filtering risk.

---

## Summary Table

| # | Component | Path | Status | Action |
|---|---|---|---|---|
| 1 | `useUnifiedRealtime` → `customers` listener | DB CDC → cache invalidation | **PASS** — fires on all rows regardless of `customer_type` | None |
| 2 | `complete_pos_sale` RPC | Wholesale customer `total_due` update | **PASS** — no customer_type filter in WHERE | None |
| 3 | POS → Customer balance UI refresh | `notifySaleCompleted` + CDC dual-path | **PASS** — two independent refresh paths | Add CDC as primary (Issue 2) |
| 4 | `totalAmountDue` in CustomerManagementModule | Filters `total_due > 0`, no type filter | **PASS** — correctly includes retail+wholesale | None |
| 5 | `useDashboardData` overview customer fetch | `select('id, name, phone, address, total_due')` | **GAP** — `customer_type` not fetched | Fix column select (Issue 1) |
| 6 | `useUnifiedRealtime` → `pos_transactions` → `customers` | CDC path | **GAP** — new sale doesn't directly invalidate customers via realtime | Add invalidation (Issue 2) |

### Files to Change

| # | File | Line | Change |
|---|---|---|---|
| 1 | `src/hooks/useDashboardData.ts` | 197 | Add `customer_type` to reduced select |
| 2 | `src/hooks/useSharedQueries.ts` | 354-360 | Add `customers` cache invalidation on `pos_transactions INSERT` |
