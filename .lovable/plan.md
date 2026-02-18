
# Hard-Wired Real-Time Connectivity — Implementation Plan

## Audit: What Already Exists vs. What Needs Building

### Already Complete (No Rework Needed)
- **Global `customers` listener** in `useUnifiedRealtime`: the `{ event: '*', table: 'customers' }` listener already fires on any INSERT/UPDATE/DELETE regardless of `customer_type`. This correctly invalidates `sharedKeys.customers()` which feeds both the retail AND wholesale views — no additional listener required.
- **`saleType` wired to `POSCustomerLookup`**: already passed as a prop, cross-type warning already renders.
- **Wholesale/Retail views**: already built, credit progress bar renders for wholesale.

### What Needs Building — 3 Targeted Changes

---

## Change 1: "View Ledger" Button on Wholesale Customer Cards

**File:** `src/components/dashboard/modules/CustomerManagementModule.tsx`

**Where:** The wholesale customer card loop (lines ~1204-1255), inside the `filtered.map(c => ...)` block — specifically inside the `isWholesale` conditional section.

**What:** Add a "View Ledger" button next to the History button. When clicked it:
1. Stores the customer name in `sessionStorage` under the key `'pending-diary-filter'` (this key is already read by `BusinessDiaryModule` on mount at line 237-242 — zero new wiring needed)
2. Dispatches `window.dispatchEvent(new CustomEvent('navigate-module', { detail: 'business-diary' }))` — the same pattern used by `handleNavigateToSource` in `BusinessDiaryModule`

**UI:** A `BookOpen` icon button (`h-8 w-8`) with a purple tint, labelled "Ledger" on tablet+, shown only when `isWholesale === true`.

**Why this works out of the box:** `BusinessDiaryModule` already reads `sessionStorage.getItem('pending-diary-filter')` in a `useEffect` on mount (line 236-242), sets it as `searchQuery`, and the `filteredSales` memo already filters by `s.customerName.includes(query)`. The customer name stored in sessionStorage will instantly filter the diary to that wholesale account's transactions.

---

## Change 2: Optimistic UI for Payment Settlement

**File:** `src/components/dashboard/modules/CustomerManagementModule.tsx`

**Where:** The `handleSettleAccount` function (~lines 408-461).

**What:** Before the `await supabase.from('customer_payments').insert(...)` call, immediately apply an optimistic update to the React Query cache using `queryClient.setQueryData`:

```typescript
// OPTIMISTIC UPDATE — fires instantly before server responds
queryClient.setQueryData(sharedKeys.customers(), (old: SharedCustomer[] | undefined) => {
  if (!old) return old;
  return old.map(c => {
    if (c.id !== selectedCustomer.id) return c;
    const newDue = Math.max(0, c.total_due - amount);
    return {
      ...c,
      total_due: newDue,
      billing_status: newDue === 0 && Math.max(0, c.cylinders_due - cylinders) === 0 ? 'clear' : 'pending',
      cylinders_due: Math.max(0, c.cylinders_due - cylinders),
    };
  });
});
```

If the server call fails, roll back by calling `queryClient.invalidateQueries({ queryKey: sharedKeys.customers() })` in the error handler — this refetches the true server state.

**Why this is safe:** The `customers` cache is the single source of truth. The optimistic write makes the credit bar and due badge update in under 100ms (before the Supabase round trip). The Postgres CDC `customers` listener in `useUnifiedRealtime` will fire within 500ms and issue a normal invalidation anyway, confirming the new value from the server.

**Import needed:** `SharedCustomer` from `@/hooks/useSharedQueries` (already imported via `sharedKeys`).

---

## Change 3: POS "Smart Context" — Per-Customer Realtime Subscription

**File:** `src/components/pos/POSCustomerLookup.tsx`

**What:** When a customer is in `status === 'found'`, subscribe to that specific customer's row using Supabase Realtime with a `filter` predicate. If that row changes while the POS is open (e.g., a manager updates the credit limit in the back office), fire a `toast` notification and call `onCustomerChange` with the refreshed data.

**Implementation:**

```typescript
// Add inside the component, after existing hooks:
useEffect(() => {
  if (status !== 'found' || !customer?.id) return;

  const channel = supabase
    .channel(`pos-customer-${customer.id}`)
    .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'customers', filter: `id=eq.${customer.id}` },
      (payload) => {
        const updated = payload.new as Customer;
        // Update the customer in the POS state
        onCustomerChange({
          ...customerState,
          customer: updated,
        });
        // Flash a toast
        toast({
          title: "Customer Updated",
          description: `${updated.name}'s account was updated. Credit limit: ৳${(updated.credit_limit || 0).toLocaleString()}`,
        });
      }
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, [status, customer?.id]);
```

**Why it's scoped:** The `filter: 'id=eq.${customer.id}'` predicate means only that specific customer's row triggers the handler — no unnecessary events. The channel is torn down and rebuilt whenever `customer.id` changes (new customer selected) or when the POS clears the customer (`status` changes away from `'found'`).

**No import changes needed:** `supabase` and `toast` are already imported at the top of `POSCustomerLookup.tsx`.

---

## File Change Summary

| # | File | Section | Change | Lines Touched |
|---|---|---|---|---|
| 1 | `CustomerManagementModule.tsx` | Wholesale card action buttons | Add "View Ledger" button with sessionStorage hand-off + navigate-module event | ~1241-1251 |
| 2 | `CustomerManagementModule.tsx` | `handleSettleAccount` function | Add optimistic `setQueryData` before server call + rollback on error | ~408-461 |
| 3 | `POSCustomerLookup.tsx` | After existing hooks | Add per-customer realtime subscription with toast notification | After line 136 |

**Zero database changes. Zero new dependencies. Zero new files.**

---

## Technical Architecture Diagram

```text
[Wholesale Customer Card]
       |
       |-- History btn → opens dialog (existing)
       |-- Settle btn  → optimistic update → server → CDC confirms (NEW path)
       |-- Ledger btn  → sessionStorage('pending-diary-filter', name)
                         + navigate-module('business-diary')
                         → BusinessDiaryModule reads key on mount
                         → filteredSales auto-filters by customer name

[POS — Customer Found]
       |
       |-- Per-customer Supabase channel (filter: id=eq.{id})
       |-- UPDATE event → toast "Account Updated" + refresh customer state
       |-- Channel torn down on customer change / deselect
```

---

## Mobile UX Notes

- The "View Ledger" button uses `h-8 w-8` (32px touch target) matching the existing History button size
- On mobile (`sm:hidden`), the text label is hidden — only the `BookOpen` icon shows to preserve card width
- On tablet+ (`hidden sm:inline`), "Ledger" text appears alongside the icon
- The optimistic update makes the credit bar animate smoothly — Tailwind `transition-all` is already on the progress bar `div`
- The per-customer toast is non-intrusive (top-right, auto-dismiss) and uses the existing `toast` utility

---

## Why NOT to Add a Separate "Global Dashboard Metrics Listener"

The task asks to invalidate `['customers', 'retail']` and `['customers', 'wholesale']` as separate keys. However, the existing architecture uses a **single unified key** `sharedKeys.customers()` = `['shared', 'customers']` for all customers regardless of type — and filters client-side. Adding separate retail/wholesale keys would:

1. **Double the Supabase network calls** (two fetches instead of one)
2. **Break the existing POS customer lookup** (which uses the unified key)
3. **Create cache desync** between the POS and Customer module

The current unified key approach is the correct architecture. The retail/wholesale split happens at the React layer (`.filter(c => c.customer_type === 'retail')`), not at the data-fetch layer. This is intentional and correct.
