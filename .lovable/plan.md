
# Connectivity Repair Report: Customer Management Real-Time Audit

## Executive Finding

After a complete audit of the live code, database functions, RLS policies, real-time subscriptions, and the Postgres publication table, **the root cause is singular and definitive:**

The `customers` table and `customer_payments` table are **NOT enrolled in the `supabase_realtime` publication.** This means Supabase cannot broadcast any `postgres_changes` events for these tables to the frontend, regardless of how many `.on('postgres_changes', ...)` listeners are registered in the React code.

Every other piece of the system — the React hooks, the query invalidation logic, the RLS policies — is already correctly implemented. The data flow architecture is sound. The real-time transport layer is simply missing the tables it needs to listen to.

---

## Section 1 — POS → Customer Connection: WORKING CORRECTLY

The prompt asks: "Does `complete_pos_sale` explicitly UPDATE the `customers` table?"

**Answer: Yes, it does.** The RPC contains this block at step 5:

```sql
-- Step 5 inside complete_pos_sale:
IF p_customer_id IS NOT NULL AND p_remaining_due > 0 THEN
  UPDATE customers SET
    total_due = COALESCE(total_due, 0) + p_remaining_due,
    billing_status = 'pending',
    last_order_date = now()
  WHERE id = p_customer_id AND owner_id = v_owner_id;
ELSIF p_customer_id IS NOT NULL THEN
  UPDATE customers SET last_order_date = now()
  WHERE id = p_customer_id AND owner_id = v_owner_id;
END IF;
```

The database mutation is correct. The customer's `total_due` does increment when a credit sale is made. The problem is the **Customer module never hears about it** because the real-time event for the `customers` table UPDATE is never delivered to the frontend.

---

## Section 2 — Diary → Customer Connection: WORKING CORRECTLY

The prompt asks: "Is there a missing Trigger on `business_diary` that should auto-update the customer balance?"

**Answer: No trigger is needed, and none is missing.** The settlement flow in `handleSettleAccount` does the following in sequence:

1. Optimistic update to React Query cache (instant UI tab switch)
2. `INSERT` into `customer_payments` — records the collection
3. `UPDATE` on `customers` table — decrements `total_due`, `cylinders_due`, sets `billing_status`

This is a direct, explicit update. No trigger is required because the frontend performs the UPDATE itself. The payment flow is architecturally correct.

---

## Section 3 — The Actual Root Cause: Missing Realtime Enrollment

The `useUnifiedRealtime` hook (in `useSharedQueries.ts`, lines 331-407) registers listeners on the `supabase_realtime` channel for `customers` and `customer_payments`:

```typescript
// Line 371-374 — Listener exists:
.on('postgres_changes',
  { event: '*', schema: 'public', table: 'customers' },
  () => invalidateWithDebounce(sharedKeys.customers(), 'normal')
)

// Line 376-382 — Listener exists:
.on('postgres_changes',
  { event: 'INSERT', schema: 'public', table: 'customer_payments' },
  () => {
    invalidateWithDebounce(sharedKeys.overview(), 'critical');
    invalidateWithDebounce(sharedKeys.todayStats(), 'critical');
  }
)
```

These listeners are correctly written. However, a database query against the `pg_publication_tables` view reveals the actual publication contents:

```
supabase_realtime publication currently contains:
  - community_orders ✓
  - community_post_comments ✓
  - community_posts ✓
  - customer_cylinder_profiles ✓
  - cylinder_exchange_requests ✓
  - cylinder_exchanges ✓
  - orders ✓
  - products ✓
```

**`customers` is NOT in the publication. `customer_payments` is NOT in the publication. `pos_transactions` is NOT in the publication.**

This is why the Customer module never receives real-time updates. The `.on('postgres_changes')` handlers in `useUnifiedRealtime` are registered correctly on the frontend but Postgres is never told to broadcast those table changes. The listeners are waiting for events that are never sent.

---

## Section 4 — What Is Already Working (No Changes Needed)

**React Query Keys:** The key `sharedKeys.customers()` resolves to `['shared', 'customers']`. This is the single authoritative key used by:
- `useSharedCustomers()` — the data fetcher
- `CustomerManagementModule.tsx` — the consumer
- `handleSettleAccount` optimistic update
- `useModuleEvent('sale-completed')` invalidation
- `useModuleEvent('customer-updated')` invalidation
- `useUnifiedRealtime` — the real-time listener (currently deaf due to missing publication)

**No separate `['customers', 'wholesale']` or `['customers', 'retail']` keys exist.** The module filters the single shared cache client-side. No key changes are needed.

**The Cross-Module Event Bus:** `moduleEvents.ts` already has `notifySaleCompleted` dispatching `'sale-completed'` and `CustomerManagementModule.tsx` already listens with `useModuleEvent('sale-completed', ...)` to invalidate the customers cache. This works now because it uses `window.dispatchEvent` (not Supabase Realtime) as its transport.

**No `useCustomerSocket` hook is needed.** The existing `useUnifiedRealtime` hook already centralises all real-time subscriptions in one place. Adding another hook would create a duplicate subscription for the same tables.

---

## The Fix: One Database Migration

Adding the three missing tables to the `supabase_realtime` publication is a single SQL statement. No frontend code changes are needed at all.

```sql
ALTER PUBLICATION supabase_realtime 
  ADD TABLE public.customers,
             public.customer_payments,
             public.pos_transactions;
```

**Effect after this migration:**

| Event | Before Fix | After Fix |
|---|---|---|
| POS credit sale → `customers.total_due` increases | Customer module stays stale until 3-min cache expires | `useUnifiedRealtime` fires within 500ms, refreshes Customer list |
| Settlement → `customers.total_due` decreases | Optimistic update works, but no cross-device sync | DB change triggers real-time event → all tabs/devices update |
| `customer_payments` INSERT | Dashboard overview misses the event | `sharedKeys.overview()` and `sharedKeys.todayStats()` invalidate within 500ms |
| POS sale INSERT (`pos_transactions`) | Customer module misses the new sale-completed signal | Real-time INSERT event fires, customers cache invalidated |

---

## Full Connectivity Chain After Fix

```text
POS Sale (complete_pos_sale RPC)
  ├── pos_transactions INSERT → supabase_realtime [NOW FIXED]
  │     └── useUnifiedRealtime handler
  │           ├── invalidate sharedKeys.overview() [500ms]
  │           ├── invalidate sharedKeys.todayStats() [500ms]
  │           └── invalidate sharedKeys.customers() [500ms] ← Customer module refreshes
  │
  ├── customers UPDATE (total_due += remaining_due) → supabase_realtime [NOW FIXED]
  │     └── useUnifiedRealtime handler
  │           └── invalidate sharedKeys.customers() [1500ms]
  │
  └── moduleEvents 'sale-completed' dispatch (window event, same device)
        └── CustomerManagementModule useModuleEvent handler
              └── invalidateQueries sharedKeys.customers() [immediate]

Settlement (handleSettleAccount)
  ├── Optimistic update → React Query cache patched instantly
  ├── customer_payments INSERT → supabase_realtime [NOW FIXED]
  │     └── useUnifiedRealtime handler
  │           ├── invalidate sharedKeys.overview() [500ms]
  │           └── invalidate sharedKeys.todayStats() [500ms]
  │
  └── customers UPDATE (total_due -= amount) → supabase_realtime [NOW FIXED]
        └── useUnifiedRealtime handler
              └── invalidate sharedKeys.customers() [1500ms]
              (optimistic update already applied — 1500ms serves as a reconciliation step)
```

---

## Implementation Plan

**1 migration. 0 frontend changes. 0 new hooks.**

The migration adds `customers`, `customer_payments`, and `pos_transactions` to the `supabase_realtime` Postgres publication. After this:

- Every UPDATE to `customers.total_due` (from POS sale or settlement) fires a real-time event
- Every INSERT into `customer_payments` fires a real-time event
- Every INSERT into `pos_transactions` fires a real-time event
- All existing `.on('postgres_changes', ...)` handlers in `useUnifiedRealtime` that were silently deaf will begin receiving events

The 3-minute stale time (`STALE_TIMES.customers = 3 * 60 * 1000`) on `useSharedCustomers` remains as a background fallback. Real-time events will now trigger invalidation well within that window, making the effective update latency approximately 500–1500ms instead of 3 minutes.

**Why no `useCustomerSocket` hook:** The current architecture correctly places all Supabase real-time subscriptions in one consolidated hook (`useUnifiedRealtime`) that lives in `Dashboard.tsx`. Splitting this into a per-module socket hook would create duplicate Supabase channels and increase connection overhead. The unified channel is the correct pattern.

**Why no SQL triggers needed:** Triggers auto-update derived data when a related row changes. In this system, the settlement flow explicitly updates `customers.total_due` directly in `handleSettleAccount`. The POS RPC explicitly updates `customers.total_due` in step 5 of `complete_pos_sale`. Both are direct, intentional mutations — triggers would be redundant and harder to debug.
