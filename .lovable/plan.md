
# Event Bus & Cache Synchronization — Precise Implementation Plan

## Full Audit Summary

After reading every relevant file in full, here is the exact current state before any changes:

### What Is ALREADY Working (No Action Required)

**`useModuleEventSync` in `moduleEvents.ts` — Already Wired in Dashboard:**
- `sale-completed` → invalidates `overview`, `customers`, `lpgBrands`, `stoves`, `regulators` ✅ (items 1 & 2 from the task brief are already done)
- `purchase-completed` → invalidates `overview`, `lpgBrands` ✅
- `inventory-updated` → invalidates `lpgBrands`, `stoves`, `regulators` ✅
- `customer-updated` → invalidates `customers` ✅
- `expense-added` → invalidates `overview` ✅ (added in the previous batch)

**`useModuleEventSync` is called inside `Dashboard.tsx` at line 128** — meaning all of the above event handlers are live and running whenever the dashboard is mounted.

**`UtilityExpenseModule.tsx` — Vehicle Cost already dispatches event:**
- Line 364: `dispatchModuleEvent('expense-added', { amount: newCost.amount, category: 'Transport' })` ✅

**`Dashboard.tsx` — navigate-module event listener is already set up:**
- Lines 172-184: Listens for `window.CustomEvent('navigate-module')` and calls `handleModuleChange(detail)` ✅

**`AnalysisTopItems.tsx` — Product clicks ALREADY navigate to Inventory:**
- Lines 20-23: `handleProductClick` dispatches `'navigate-module'` with `'inventory'` ✅
- Lines 26-31: `handleExpenseClick` dispatches to `'utility-expense'` or `'business-diary'` ✅

### What Is NOT Yet Done (The Real Gaps)

After the full audit, three gaps remain:

---

## Gap 1: Vehicle Cost & Staff Salary mutations missing `expense-added` dispatch

**Utility → Analytics sync is incomplete:**
- `handleAddCost` (vehicle costs): ✅ Already dispatches `expense-added` at line 364
- `handlePaySalary` (staff salary): ❌ Does NOT dispatch `expense-added`. Staff salary is also a `daily_expenses` insert, but when it's saved, the Analytics module's cached data is only refreshed via the 1-second Supabase realtime subscription, not instantly via the event bus.
- `handleGiveBonus` (staff bonus): ❌ Same problem — no `expense-added` dispatch.

**Impact:** After paying staff salary, if the user switches to Analytics immediately, the expense total may be stale for up to 1 second.

**Fix location:** `src/components/dashboard/modules/UtilityExpenseModule.tsx`

Find the `handlePaySalary` function and add after the successful `daily_expenses` insert:
```typescript
dispatchModuleEvent('expense-added', { amount: parseFloat(amount), category: 'Staff Salary' });
```

Find the `handleGiveBonus` function and add:
```typescript
dispatchModuleEvent('expense-added', { amount: parseFloat(bonusAmount), category: 'Staff Bonus' });
```

---

## Gap 2: Analytics "Top Selling Products" navigation is too coarse (navigates to Inventory, but doesn't filter by product)

**Current behavior:** Clicking any product in `AnalysisTopItems` navigates to `inventory`, but the Inventory module opens at its default state with no filter applied. The user still has to manually search.

**Why a "filter" is complex:** The Inventory module uses local `useState` for `lpgSearchQuery`, `stoveSearchQuery`, and `regulatorSearchQuery`. There is no URL parameter or global state for these. Passing the product name via the event bus would require `InventoryModule` to subscribe to an event and pre-fill its search — a significant architecture change.

**Best achievable approach (zero-regression):** Carry the product name in the `navigate-module` event as a sub-key using the existing event system's `stockx:navigate-module` event, and have `InventoryModule` listen for it to pre-fill its search. This is additive — one new event listener in `InventoryModule`, one change to `AnalysisTopItems`.

**Implementation:**

**Step 1 — Extend `navigate-module` payload in `moduleEvents.ts`:**

The `ModuleEventPayload['navigate-module']` type is currently `string`. Change to support both string and object:
```typescript
'navigate-module': string | { module: string; searchQuery?: string };
```

Also update `navigateToModule` and the convenience function to accept optional filter:
```typescript
export function navigateToModule(module: string, searchQuery?: string) {
  dispatchModuleEvent('navigate-module', searchQuery ? { module, searchQuery } : module);
}
```

**Step 2 — Update `Dashboard.tsx` navigate-module listener:**

The listener at lines 172-184 currently handles `e.detail` as a `string`. Update it to handle both:
```typescript
const handleNavigate = (e: CustomEvent) => {
  if (!e.detail) return;
  if (typeof e.detail === 'string') {
    handleModuleChange(e.detail);
  } else if (typeof e.detail === 'object' && e.detail.module) {
    handleModuleChange(e.detail.module);
    // Store filter for the destination module
    if (e.detail.searchQuery) {
      sessionStorage.setItem('pending-inventory-search', e.detail.searchQuery);
    }
  }
};
```

**Step 3 — Update `AnalysisTopItems.tsx`:**

Change `handleProductClick` from navigating generically to passing the product name:
```tsx
const handleProductClick = (productName: string) => {
  const payload = { module: 'inventory', searchQuery: productName };
  if (onNavigate) onNavigate('inventory'); // backward compat
  window.dispatchEvent(new CustomEvent('navigate-module', { detail: payload }));
};
```
And change the `onClick` in the product row from `onClick={handleProductClick}` to `onClick={() => handleProductClick(product.name)}`.

**Step 4 — Update `InventoryModule.tsx`:**

At mount/route-change, check `sessionStorage` for a pending search and apply it:
```typescript
useEffect(() => {
  const pending = sessionStorage.getItem('pending-inventory-search');
  if (pending) {
    setLpgSearchQuery(pending);
    sessionStorage.removeItem('pending-inventory-search');
  }
}, []);
```

This is a clean, low-risk approach: the filter is applied via sessionStorage handoff, no new dependencies, no prop drilling.

---

## Gap 3: Customer "Last Purchase" is not clickable to navigate to Business Diary

**Current behavior:**
- In the **Paid Customers desktop table** (line 1724-1727): `last_order_date` is shown as plain text — `format(new Date(customer.last_order_date), 'MMM dd, yyyy')`. Not clickable.
- In the **Paid Customers mobile card** (line 1680-1683): `last_order_date` shown in a `<span>`. Not clickable.
- In the **Due Customers view**: No "last purchase" field is displayed at all in the card/table.

**The ask:** Make "Last Purchase" clickable to open Business Diary filtered by that customer.

**Implementation approach:** The Business Diary module (`BusinessDiaryModule.tsx`) currently has a local `searchQuery` state that filters its sales/expense lists. There's no URL parameter for this filter.

Best approach — same sessionStorage handoff pattern:
- Store `{ customerId: string, customerName: string }` in sessionStorage under `'pending-diary-filter'`
- Navigate to `'business-diary'`
- `BusinessDiaryModule` checks sessionStorage on mount and pre-fills its `searchQuery` with the customer's name

**Files to change:**

**`CustomerManagementModule.tsx`** — 4 locations:
1. Paid customers mobile card — make the "Last: ..." span into a clickable `<button>`:
```tsx
{customer.last_order_date ? (
  <button
    className="text-xs text-primary underline-offset-2 hover:underline cursor-pointer touch-manipulation"
    onClick={(e) => {
      e.stopPropagation();
      sessionStorage.setItem('pending-diary-filter', customer.name);
      window.dispatchEvent(new CustomEvent('navigate-module', { detail: 'business-diary' }));
    }}
  >
    Last: {format(new Date(customer.last_order_date), 'MMM dd, yyyy')}
  </button>
) : (
  <span>No orders yet</span>
)}
```

2. Paid customers desktop table — `last_order_date` `TableCell` (line 1724-1727):
```tsx
<TableCell>
  {customer.last_order_date ? (
    <button
      className="text-sm text-primary underline-offset-2 hover:underline cursor-pointer"
      onClick={() => {
        sessionStorage.setItem('pending-diary-filter', customer.name);
        window.dispatchEvent(new CustomEvent('navigate-module', { detail: 'business-diary' }));
      }}
    >
      {format(new Date(customer.last_order_date), 'MMM dd, yyyy')}
    </button>
  ) : (
    <span className="text-muted-foreground">N/A</span>
  )}
</TableCell>
```

**`BusinessDiaryModule.tsx`** — Add one `useEffect` at mount:
```typescript
useEffect(() => {
  const pending = sessionStorage.getItem('pending-diary-filter');
  if (pending) {
    setSearchQuery(pending);
    sessionStorage.removeItem('pending-diary-filter');
  }
}, []);
```

---

## Complete File Change Summary

| # | File | Change | Risk |
|---|---|---|---|
| 1 | `src/components/dashboard/modules/UtilityExpenseModule.tsx` | Add `dispatchModuleEvent('expense-added', ...)` to `handlePaySalary` and `handleGiveBonus` | Zero — additive |
| 2 | `src/lib/moduleEvents.ts` | Extend `navigate-module` payload type to support `{ module, searchQuery? }` and update `navigateToModule` helper | Low — type change |
| 3 | `src/pages/Dashboard.tsx` | Update navigate-module event listener to handle object payload, storing search query in sessionStorage | Low |
| 4 | `src/components/analysis/AnalysisTopItems.tsx` | Pass product name to `handleProductClick`, dispatch object payload | Zero — additive |
| 5 | `src/components/dashboard/modules/InventoryModule.tsx` | Read `pending-inventory-search` from sessionStorage on mount | Zero — additive |
| 6 | `src/components/dashboard/modules/CustomerManagementModule.tsx` | Make "Last Purchase" date clickable (2 locations: mobile card + desktop table) | Zero — additive |
| 7 | `src/components/dashboard/modules/BusinessDiaryModule.tsx` | Read `pending-diary-filter` from sessionStorage on mount to pre-fill search | Zero — additive |

**Total: 7 files. Zero database changes. Zero new dependencies. Zero new components.**

---

## What Is NOT Changing (Already Correct)

- `useModuleEventSync` in Dashboard — already handles `sale-completed` → Inventory + Customers + Diary sync ✅
- Vehicle cost `expense-added` dispatch — already present in `handleAddCost` ✅
- `navigate-module` listener in Dashboard — already handles string payloads ✅
- `AnalysisTopItems` product and expense click navigation — already dispatches `navigate-module` ✅
- The `stockx:navigate-module` event bus prefix vs plain `navigate-module` CustomEvent: Dashboard uses `window.addEventListener('navigate-module')` (plain) and `AnalysisTopItems` dispatches `new CustomEvent('navigate-module')` (also plain). The `dispatchModuleEvent` helper dispatches `stockx:navigate-module` (prefixed). Dashboard only listens on the plain version. This is intentional — the plain version is used for UI navigation, the prefixed version is used for cache sync. No change needed.
