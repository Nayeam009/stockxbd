
# Driver Management — Full Implementation Plan

## Audit Summary: What's Already Done

After reading every file in full:

| Requirement | Status |
|---|---|
| `tax_rate` + `currency_symbol` in `shop_profiles` | Done — columns exist |
| Settings "Financial Preferences" form | Done — `case 'business'` fully implemented |
| POS reads tax/currency dynamically | Done — `shopSettings` query at line 70-77 |
| `POSPaymentDrawer` uses prop not hardcoded `৳` | Done — `currencySymbol = '৳'` prop default |
| `POSStickyFooter` uses prop not hardcoded `৳` | Done — same |
| POS `processing` state blocks double-clicks | Done — `disabled={disabled || processing}` |
| `navigator.onLine` offline check | Done — lines 268-275 in `handleCompleteSale` |
| Stock race condition friendly toast | Done — `Insufficient stock for` parser |
| `expense-added` event from salary/bonus | Done — lines 240, 277 |

**The only real gap: Driver Assignment UI and POS integration.** Everything else was completed in previous batches.

---

## What Needs to Be Built

### Gap: Driver Module + POS Assignment

The `staff` table has a `role` column where users can have "Driver" role. The `pos_transactions` table has a `driver_id uuid` column that is always `null`. The `complete_pos_sale` RPC has no `p_driver_id` parameter.

---

## Implementation Plan

### Step 1 — Database: Add `p_driver_id` to `complete_pos_sale` RPC

The `complete_pos_sale` function needs one new optional parameter. This requires a SQL migration to replace the function signature.

The change is:
- Add `p_driver_id uuid DEFAULT NULL` as a new parameter
- In the `INSERT INTO pos_transactions` block, add `driver_id` to the column list
- Add `p_driver_id` to the values list

This is a pure additive change — all existing callers work unchanged since the parameter has a `DEFAULT NULL`.

---

### Step 2 — New Component: `DriversModule.tsx`

Create `src/components/dashboard/modules/DriversModule.tsx` — a focused module that:

1. **Lists all staff with role "Driver"** from the `staff` table using a `useQuery` hook
2. **Shows assignment stats**: how many transactions each driver has been assigned to today (from `pos_transactions` where `driver_id = staff.id AND DATE(created_at) = TODAY`)
3. **Card-based layout** (mobile-first): each driver card shows name, phone, status badge (active today / idle), and a count of deliveries today
4. **No separate page/route** — accessed via `?module=drivers` in the existing dashboard switch

The Driver card UI:
```
┌─────────────────────────────┐
│ [Avatar] Ahmed Rahman        │
│          Driver • 📞01234    │
│          Today: 3 deliveries │
│ [Active Today]               │
└─────────────────────────────┘
```

5. **"Mark as Available" / "Mark as Busy" toggle** — updates a local status (no DB change needed, just UI state for the session)

---

### Step 3 — POS Payment Drawer: Add Driver Selector

Modify `POSPaymentDrawer.tsx` to include an optional driver selector:

- Add a new `drivers` prop (list of active driver staff members)
- Add `selectedDriverId` + `onDriverChange` props
- Render a `Select` dropdown **after the Payment Method** section labeled "Assign Driver (Optional)"
- If no drivers exist, skip rendering the selector entirely (graceful degradation)

The UI:
```
Payment Method: [Cash] [bKash] [Nagad] [Rocket]
──────────────────────────────────────────────
Assign Driver (Optional):
[ Select driver... ▼ ]
  • Ahmed Rahman
  • Karim Uddin
  • No driver
──────────────────────────────────────────────
Amount Paid: [input]
```

---

### Step 4 — POSModule: Wire Driver Data + Pass to Drawer

In `POSModule.tsx`:

1. Add a `useQuery` to fetch active driver staff: `supabase.from('staff').select('*').eq('role', 'Driver').eq('is_active', true).order('name')`
2. Add state: `const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null)`
3. Pass `drivers`, `selectedDriverId`, `onDriverChange` to `POSPaymentDrawer`
4. Pass `p_driver_id: selectedDriverId` to the `complete_pos_sale` RPC call
5. Reset `selectedDriverId` on `cart.resetCart()`

---

### Step 5 — Dashboard: Register `drivers` Module

In `src/pages/Dashboard.tsx`, add `case "drivers":` to `renderActiveModule()`:

```typescript
case "drivers":
  return <DriversModule />;
```

---

### Step 6 — Sidebar: Add Drivers Nav Item

In `src/components/dashboard/AppSidebar.tsx`, add a "Drivers" nav item between `utility-expense` and `analysis-search`:

```typescript
{ id: 'drivers', titleKey: 'drivers', icon: Truck, roles: ['owner', 'manager'] },
```

And add the translation key `'drivers'` → "Drivers" to the language context.

---

### Step 7 — Business Diary: Show Driver Attribution

In `src/components/diary/SaleEntryCard.tsx`, if a `driver_id` is present in the sale, show a small badge "Delivery: [Driver Name]" below the "Sold by" line. This requires:
- The `BusinessDiaryModule.tsx` to join `pos_transactions` with `staff` on `driver_id`
- Add `driver_name` to the diary sale data shape

---

## File Change Summary

| # | File | Change | Type |
|---|---|---|---|
| 1 | DB migration | Add `p_driver_id` to `complete_pos_sale` RPC | SQL |
| 2 | `src/components/dashboard/modules/DriversModule.tsx` | **NEW** — Driver list + daily assignment stats | New file |
| 3 | `src/components/pos/POSPaymentDrawer.tsx` | Add driver selector `Select` + new props | Modify |
| 4 | `src/components/dashboard/modules/POSModule.tsx` | Fetch drivers, add state, pass to drawer, pass to RPC | Modify |
| 5 | `src/pages/Dashboard.tsx` | Add `case "drivers"` to module router | Modify |
| 6 | `src/components/dashboard/AppSidebar.tsx` | Add Drivers nav item (Truck icon) | Modify |
| 7 | `src/components/dashboard/MobileBottomNav.tsx` | Add Drivers to "More" items | Modify |

**Zero new dependencies. Uses existing `supabase`, `useQuery`, `Select`, `Card` from the design system.**

---

## Risk Assessment

| Change | Risk | Mitigation |
|---|---|---|
| RPC migration | Low — additive parameter with DEFAULT NULL | All existing callers unaffected |
| `DriversModule.tsx` | Zero — new file, no impact on existing code | None needed |
| `POSPaymentDrawer` driver selector | Low — only shows if `drivers.length > 0` | Graceful degradation |
| Dashboard case addition | Zero — additive switch case | None needed |
| Sidebar item | Zero — additive array entry | None needed |
