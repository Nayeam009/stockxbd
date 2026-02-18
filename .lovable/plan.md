
# QA Connectivity Simulation Report

## Publication Status (Confirmed Live)

Before analysing each scenario, the database publication was queried directly:

```
supabase_realtime publication contains:
  customers          ✓ (added in previous session)
  customer_payments  ✓ (added in previous session)
  pos_transactions   ✓ (added in previous session)
  community_orders   ✓
  orders             ✓
  products           ✓
  ... (6 others)
```

Both tables that matter for this test are enrolled. Real-time events will fire.

---

## Scenario 1: POS Sale → Customer Due Update

### Full Trace

**Step 1 — POS completes sale (credit)**

`handleCompleteSale` in `POSModule.tsx` calls `supabase.rpc('complete_pos_sale', { ..., p_remaining_due: 5000 })`.

**Step 2 — Database atomically (confirmed from live RPC source):**

```sql
-- Step 1: INSERT into pos_transactions  ← triggers realtime event A
-- Step 3: UPDATE lpg_brands             ← triggers realtime event B
-- Step 5: UPDATE customers SET total_due = COALESCE(total_due,0) + 5000
           WHERE id = p_customer_id      ← triggers realtime event C
```

All three happen inside a single database function call with `SECURITY DEFINER`. If any step fails, the entire call raises an EXCEPTION and rolls back atomically.

**Step 3 — Two parallel real-time paths fire on the second tab:**

| Event | Handler in `useUnifiedRealtime` | Action |
|---|---|---|
| `pos_transactions INSERT` (event A) | Line 354–361 | `invalidateWithDebounce(sharedKeys.customers(), 'critical')` — 500ms debounce |
| `customers UPDATE` (event C) | Line 371–374 | `invalidateWithDebounce(sharedKeys.customers(), 'normal')` — 1500ms debounce |

**Step 4 — On the same device only (same tab group):**

`notifySaleCompleted()` dispatches a `window` CustomEvent that `useModuleEvent('sale-completed')` in `CustomerManagementModule.tsx` catches at line 195–198, calling `queryClient.invalidateQueries({ queryKey: sharedKeys.customers(), refetchType: 'active' })` **immediately** (0ms debounce, same browser process).

**Step 5 — `useSharedCustomers()` refetches from the database and re-renders.**

The `customers` array in `CustomerManagementModule.tsx` is derived directly from `sharedCustomers` at line 131–146. No local state copy — it is always the React Query cache value. The UI re-renders with the new `total_due`.

### Verdict: PASS

- **Same device (two tabs):** The window event fires instantly (0ms). Customer X's due card updates within ~100ms.
- **Different devices:** The `pos_transactions INSERT` event fires to the second device's `useUnifiedRealtime` within ~500ms. The `customers UPDATE` event fires within ~1500ms as a reconciliation signal.
- **Database state:** Always correct — the RPC updates `customers.total_due` inside the same atomic transaction as the sale.

---

## Scenario 2: Business Diary "Income" Entry → Customer Due Drop

This scenario requires careful analysis because the Business Diary does **not** have a "create income linked to a customer" UI in the same way as the settlement flow. There are two possible interpretations:

### Interpretation A — Using the "Settle" button in the Customer Module (correct flow)

The "Income from Customer X" path in the system flows through `handleSettleAccount`:

1. **Optimistic update** — React Query cache is patched instantly at line 441–447. Customer X moves from Due to Paid tab on the **same device** in 0ms.
2. `INSERT into customer_payments` — database records the ৳2,000 collection. This fires a `customer_payments INSERT` real-time event.
3. `UPDATE customers SET total_due = 3000` — database updates the balance. This fires a `customers UPDATE` real-time event.

**On a second device/tab:**
- `customer_payments INSERT` → `sharedKeys.overview()` and `sharedKeys.todayStats()` invalidate (500ms). **Note: `sharedKeys.customers()` is NOT invalidated by this event.**
- `customers UPDATE` → `sharedKeys.customers()` invalidates (1500ms). Customer X balance updates on the second device.

**Verdict for Interpretation A: PASS** — Due drops to ৳3,000 on the same device instantly (optimistic), on second device within 1500ms via `customers UPDATE` event.

### Interpretation B — Adding an expense/income directly in Business Diary UI

The Business Diary's "Add Expense" dialog only creates entries in `daily_expenses`. It has **no "Add Income from Customer" dialog** — the diary is read-only for income; it only displays what was already recorded by POS and Customer Settlement.

There is no UI flow in Business Diary that:
- Takes a ৳2,000 figure
- Links it to Customer X
- Reduces Customer X's `total_due`

**Verdict for Interpretation B: The scenario as literally described cannot be executed** — the Business Diary module does not have a standalone "add income linked to a customer" form. The equivalent action exists only in the Customer Module (Settle button) or POS (payment at sale time).

---

## Gap Found: `customer_payments INSERT` Does Not Invalidate `sharedKeys.customers()`

During the audit, a specific gap was found in `useUnifiedRealtime` at lines 376–382:

```typescript
// Current code — INCOMPLETE:
.on('postgres_changes',
  { event: 'INSERT', schema: 'public', table: 'customer_payments' },
  () => {
    invalidateWithDebounce(sharedKeys.overview(), 'critical');
    invalidateWithDebounce(sharedKeys.todayStats(), 'critical');
    // ← sharedKeys.customers() is NOT invalidated here
  }
)
```

When a settlement is made from **a different device**, the sequence is:
1. `customers UPDATE` fires → `sharedKeys.customers()` invalidates at 1500ms ✓
2. `customer_payments INSERT` fires → does NOT invalidate `sharedKeys.customers()` ✗ (redundant, but this means cross-device consistency relies solely on the `customers UPDATE` event)

This is a latent risk: if the `customers UPDATE` real-time event is ever delayed or dropped (e.g., brief WebSocket reconnect), there is no fallback from `customer_payments INSERT` to trigger a customer list refresh. Adding `sharedKeys.customers()` to the `customer_payments INSERT` handler would add a second safety net with no performance cost (the debounce collapses duplicate calls automatically).

---

## Summary

| Scenario | Database | Real-Time Event | UI Update | Verdict |
|---|---|---|---|---|
| POS credit sale → Customer due increases | ✓ RPC step 5 updates `customers.total_due` atomically | ✓ `pos_transactions INSERT` + `customers UPDATE` both enrolled in publication | ✓ Same device: instant (0ms window event). Cross-device: 500ms via critical debounce | **PASS** |
| Settlement → Customer due decreases | ✓ `handleSettleAccount` directly updates `customers.total_due` | ✓ `customer_payments INSERT` + `customers UPDATE` enrolled | ✓ Same device: instant (optimistic). Cross-device: 1500ms via `customers UPDATE` event | **PASS** |
| Business Diary "Add Income linked to Customer X" | N/A — this UI does not exist | N/A | N/A | **FEATURE DOES NOT EXIST** |

## The One Fix: Add Customer Safety Net to `customer_payments` Handler

**File:** `src/hooks/useSharedQueries.ts`  
**Lines:** 376–382

```typescript
// BEFORE:
.on('postgres_changes',
  { event: 'INSERT', schema: 'public', table: 'customer_payments' },
  () => {
    invalidateWithDebounce(sharedKeys.overview(), 'critical');
    invalidateWithDebounce(sharedKeys.todayStats(), 'critical');
  }
)

// AFTER (add one line):
.on('postgres_changes',
  { event: 'INSERT', schema: 'public', table: 'customer_payments' },
  () => {
    invalidateWithDebounce(sharedKeys.overview(), 'critical');
    invalidateWithDebounce(sharedKeys.todayStats(), 'critical');
    invalidateWithDebounce(sharedKeys.customers(), 'critical'); // ← safety net
  }
)
```

This ensures that even if the `customers UPDATE` event is delayed, the `customer_payments INSERT` event (which always fires) will also trigger a customer list refresh. The debounce system collapses both signals into a single refetch automatically.

**Change summary:**

| # | File | Change | Lines |
|---|---|---|---|
| 1 | `src/hooks/useSharedQueries.ts` | Add `sharedKeys.customers()` invalidation to `customer_payments INSERT` handler | +1 line |

**Zero database migrations. Zero new hooks. Zero schema changes.**
