
# State & Design Consistency Audit — Optimization Roadmap

## Audit Findings Summary

After reading `UtilityExpenseModule.tsx` (883 lines), `SettingsModule.tsx` (970 lines), `CustomerManagementModule.tsx` (1913 lines), `POSModule.tsx`, `usePOSCart.ts`, `useSharedQueries.ts`, `moduleEvents.ts`, and `bangladeshConstants.ts`, here are the verified findings.

---

## Section 1: "Zombie" State Audit (useEffect vs useQuery)

### Finding 1A — UtilityExpenseModule: Full Zombie State (Confirmed)

`UtilityExpenseModule.tsx` lines 138-192 contain three `useCallback` fetch functions (`fetchStaffData`, `fetchVehicleData`, `fetchAllData`) and one `useEffect` that calls `fetchAllData()` on mount. This is classic zombie state:

```typescript
// Lines 138-192: Zombie pattern — direct useState + useCallback + useEffect
const [staffList, setStaffList] = useState<StaffWithPayments[]>([]);
const [vehicles, setVehicles] = useState<Vehicle[]>([]);
const [costs, setCosts] = useState<VehicleCost[]>([]);
const [loading, setLoading] = useState(true);

const fetchStaffData = useCallback(async () => { ... supabase queries ... setStaffList(...) }, []);
const fetchVehicleData = useCallback(async () => { ... supabase queries ... setVehicles(...) }, []);

useEffect(() => {
  fetchAllData(); // Zombie
  return () => { mountedRef.current = false; };
}, [fetchAllData]);
```

After mutations (add staff, pay staff, bonus, add vehicle, add cost), it calls `fetchStaffData()` or `fetchVehicleData()` directly — bypassing the shared cache entirely. The data in this module is isolated from every other module.

**Impact:** After paying a staff salary, the Business Diary and Dashboard don't update until the real-time subscription fires (up to 1.5s delay). After adding a new vehicle, nothing else knows about it.

**Note:** The vehicle cost `handleAddCost` DOES call `queryClient.invalidateQueries({ queryKey: sharedKeys.overview() })` (line 359) — that part was already fixed. But the module's own data is still zombie state.

### Finding 1B — CustomerManagementModule: Partially Migrated (Confirmed)

`CustomerManagementModule.tsx` correctly uses `useSharedCustomers()` from the shared query cache (line 115). Customer list data is NOT zombie.

However, two secondary data fetches are still zombie:
- `fetchPayments()` (lines 179-196): plain `useCallback` + direct `supabase` call, stored in local `useState`. Called manually when opening the history dialog.
- `fetchCustomerSalesHistory()` (lines 199-234): plain async function, stores in local `useState`.

These are acceptable since they are on-demand fetches for dialogs, not module-level data. Not a critical issue.

### Finding 1C — Event Bus → Cache Invalidation Mapping (Confirmed Working)

Verified in `moduleEvents.ts` (lines 125-166), the `useModuleEventSync` hook correctly maps:
- `sale-completed` → `sharedKeys.overview()` + `sharedKeys.customers()` + `sharedKeys.lpgBrands()` ✅
- `purchase-completed` → `sharedKeys.overview()` + `sharedKeys.lpgBrands()` ✅
- `inventory-updated` → `sharedKeys.lpgBrands()` + `sharedKeys.stoves()` + `sharedKeys.regulators()` ✅
- `customer-updated` → `sharedKeys.customers()` ✅
- `price-updated` → `sharedKeys.prices()` ✅

**Gap found:** The `expense-added` event type exists in the `ModuleEventType` union (line 14 of moduleEvents.ts) but has **no handler** in `useModuleEventSync`. When a manual expense is added via a module, no cache invalidation is triggered via the event bus. The real-time subscription to `daily_expenses` handles it with a 1.5s delay, but there's no instant path.

**Also gap:** `sharedKeys.stoves()` and `sharedKeys.regulators()` are NOT invalidated on `sale-completed`. If a stove or regulator is sold via POS, the inventory count in the Inventory module won't refresh until the 1.5s realtime subscription fires, not instantly.

---

## Section 2: UI Inconsistency Audit

### Finding 2A — Modules Missing PremiumModuleHeader

| Module | Current Header Pattern | Status |
|---|---|---|
| POS | Inline `div` with icon + `h1` | MISSING PremiumModuleHeader |
| Inventory | Inline `div` with gradient icon | MISSING |
| Business Diary | No header at all | MISSING |
| Customer Management | Inline custom `div` | MISSING |
| **Utility Expense** | Inline `div` (lines 414-430) | **STILL MISSING** |
| Settings | No module header (uses sidebar layout) | N/A — different pattern |
| Analytics | Uses PremiumModuleHeader | ✅ DONE |
| Product Pricing | Uses PremiumModuleHeader | ✅ DONE |

Note: The previous UI/UX plan said it added `PremiumModuleHeader` to UtilityExpenseModule, but looking at the actual code (lines 413-430), the old inline `div` pattern is still there. The plan was approved but based on the current code, it was not applied to Utility.

### Finding 2B — Sticky Header Coverage

From code inspection:
- **POS**: POSSaleTable and POSReturnTable — no sticky header on the table column labels. Mobile users scroll and lose context.
- **Customer Management**: The `Table` component at lines ~800-950 has `TableHeader` but no `sticky top-0` class on it.
- **Utility Expense**: The staff list and vehicle list use card-based layouts, not tables — sticky headers are not applicable.
- **Inventory**: The filter bar (`sticky top-0 z-10 bg-background/95 backdrop-blur-sm`) was added by the previous plan — confirmed present.

### Finding 2C — Touch Target Heights

The primary issue is in **POSPaymentDrawer** and **POSModule** action buttons. The `h-12` standard (48px) is partially applied:
- POS "Proceed to Pay" footer button: Uses `h-14` — exceeds standard ✅
- POS payment method selector buttons in `POSPaymentDrawer`: Uses `py-3` (variable height based on content) — not explicitly `h-12`
- Utility Expense "Add Staff", "Pay", "Bonus" buttons: Use default `Button` size with no `h-12` override — 40px height (below 44px minimum)
- Settings section buttons: Use `min-h-[64px]` (line 79) ✅ 

---

## Section 3: Missing Link — Tax & Currency

### Finding 3A — No Currency/Tax Infrastructure (Confirmed)

- `BANGLADESHI_CURRENCY_SYMBOL = '৳'` is hardcoded in `bangladeshConstants.ts` line 3 and imported in 15+ components
- `usePOSCart.ts` line 46-48: `total = Math.max(0, subtotal - discount)` — no tax multiplier
- The `shop_profiles` table has no `tax_rate` or `currency_symbol` columns (confirmed from schema)
- `complete_pos_sale` RPC receives `p_total` as a pre-calculated value — tax would need to be applied client-side before calling the RPC, OR the RPC could apply it server-side

### Finding 3B — Implementation Path for Tax & Currency

The cleanest implementation:
1. Add `tax_rate NUMERIC DEFAULT 0` and `currency_symbol TEXT DEFAULT '৳'` to `shop_profiles`
2. Create a `useShopSettings` hook that fetches these values once and caches them
3. Update `usePOSCart` to accept a `taxRate` parameter and compute `tax = subtotal * taxRate/100`, then `total = subtotal - discount + tax`
4. Add a "Tax & Currency" sub-section to `SettingsModule.tsx`
5. Pass `currencySymbol` from the context to all components currently importing `BANGLADESHI_CURRENCY_SYMBOL`

---

## Optimization Roadmap (Numbered, Prioritized)

### Priority 1 — Data Integrity & Real-time Correctness

**Item 1: Fix Stove/Regulator cache on sale-completed event**
- File: `src/lib/moduleEvents.ts`
- Add `queryClient.invalidateQueries({ queryKey: sharedKeys.stoves() })` and `sharedKeys.regulators()` to the `sale-completed` handler in `useModuleEventSync`.
- Currently when a stove is sold, the stove quantity card in Inventory shows stale data for up to 1.5 seconds.

**Item 2: Add expense-added event handler to event bus**
- File: `src/lib/moduleEvents.ts`
- The `expense-added` event is defined in the type system but has no handler in `useModuleEventSync`. Add:
  ```typescript
  const unsubExpense = subscribeToModuleEvent('expense-added', () => {
    queryClient.invalidateQueries({ queryKey: sharedKeys.overview() });
  });
  ```
- Also dispatch this event from `UtilityExpenseModule` after each successful `daily_expenses` insert.

### Priority 2 — Migrate Utility Expense to TanStack Query (Zombie Removal)

**Item 3: Migrate UtilityExpenseModule staff & vehicle data to useQuery**
- File: `src/components/dashboard/modules/UtilityExpenseModule.tsx`
- Replace `useState<StaffWithPayments[]>` + `fetchStaffData` useCallback + `useEffect` with:
  ```typescript
  const { data: staffData = [], isLoading: staffLoading, refetch: refetchStaff } = useQuery({
    queryKey: ['utility', 'staff', ownerId],
    queryFn: fetchStaffWithPayments,
    staleTime: 2 * 60 * 1000,
  });
  ```
- Replace `useState<Vehicle[]>` + `fetchVehicleData` with a parallel `useQuery`.
- After mutations (add/pay/delete), call `queryClient.invalidateQueries({ queryKey: ['utility', 'staff'] })` instead of calling the fetch functions directly.
- This removes 3 `useState` variables, the `mountedRef`, the `fetchAllData` function, and the orphan `useEffect`.

### Priority 3 — Apply Tax & Currency Infrastructure

**Item 4: Database schema — add tax_rate and currency_symbol to shop_profiles**
- Migration: `ALTER TABLE shop_profiles ADD COLUMN tax_rate NUMERIC DEFAULT 0; ADD COLUMN currency_symbol TEXT DEFAULT '৳';`
- No data loss risk — both columns default to existing behavior.

**Item 5: Create useShopSettings hook**
- New file: `src/hooks/useShopSettings.ts`
- Single `useQuery` for `shop_profiles` owned by current user
- Returns `{ taxRate, currencySymbol, bkashNumber, nagadNumber, rocketNumber }` — consolidates all shop config reads scattered across POSModule, MyShopProfileModule, InvoiceTemplate

**Item 6: Wire tax into usePOSCart**
- File: `src/hooks/usePOSCart.ts`
- Accept `taxRate: number = 0` as a parameter
- Add `tax = Math.round((subtotal - discount) * taxRate / 100)` calculation
- Update `total = subtotal - discount + tax`
- Expose `tax` from the hook's return value

**Item 7: Add Tax & Currency section to SettingsModule**
- File: `src/components/dashboard/modules/SettingsModule.tsx`
- Add a "Business Settings" section with:
  - Tax Rate input (0-99%, defaults to 0%)
  - Currency Symbol input (defaults to ৳)
  - Saves to `shop_profiles` table

**Item 8: Update InvoiceTemplate to show tax line**
- File: `src/components/invoice/InvoiceTemplate.tsx`
- Accept `taxRate` and `taxAmount` props
- Show a "Tax (X%): ৳Y" line between Subtotal and Total when `taxRate > 0`

### Priority 4 — UI Header Standardization (Complete the Previous Plan)

**Item 9: Apply PremiumModuleHeader to UtilityExpenseModule**
- File: `src/components/dashboard/modules/UtilityExpenseModule.tsx`
- Replace lines 413-430 (inline `div` with Wallet icon + h2 title) with `<PremiumModuleHeader>`.
- The previous plan approved this but the code still shows the old inline pattern.

**Item 10: Apply PremiumModuleHeader to POSModule**
- File: `src/components/dashboard/modules/POSModule.tsx`
- The POS module currently uses an inline header. Apply `PremiumModuleHeader` with `ShoppingCart` icon.
- The previous plan approved this — verify it was applied and apply if not.

### Priority 5 — Touch Target & Table Header Polish

**Item 11: Sticky table header in CustomerManagementModule**
- File: `src/components/dashboard/modules/CustomerManagementModule.tsx`
- Add `className="sticky top-0 z-10 bg-card"` to the `<TableHeader>` element in the customer list table.
- This keeps Name / Phone / Status / Due / Actions labels visible during scroll on mobile.

**Item 12: h-12 touch targets on Utility Expense action buttons**
- File: `src/components/dashboard/modules/UtilityExpenseModule.tsx`
- Add `className="h-12"` to the "Add Staff", "Pay Salary", "Give Bonus", "Add Cost", and "Add Vehicle" buttons.
- Current default Button height is 40px, below the 44px minimum for touch targets.

---

## Complete File Change Summary

| Item | File(s) | Type | Risk |
|---|---|---|---|
| 1 | `src/lib/moduleEvents.ts` | Add 2 lines to event handler | Zero |
| 2 | `src/lib/moduleEvents.ts` | Add expense-added handler | Zero |
| 3 | `src/components/dashboard/modules/UtilityExpenseModule.tsx` | Migrate 3 useState to useQuery | Low |
| 4 | New migration SQL | Schema: 2 new nullable columns | Zero |
| 5 | New `src/hooks/useShopSettings.ts` | New hook (additive) | Zero |
| 6 | `src/hooks/usePOSCart.ts` | Add tax parameter + calculation | Low |
| 7 | `src/components/dashboard/modules/SettingsModule.tsx` | Add Business Settings section | Low |
| 8 | `src/components/invoice/InvoiceTemplate.tsx` | Add optional tax line | Low |
| 9 | `src/components/dashboard/modules/UtilityExpenseModule.tsx` | Replace inline header div | Zero |
| 10 | `src/components/dashboard/modules/POSModule.tsx` | Apply/verify PremiumModuleHeader | Zero |
| 11 | `src/components/dashboard/modules/CustomerManagementModule.tsx` | Add sticky class to TableHeader | Zero |
| 12 | `src/components/dashboard/modules/UtilityExpenseModule.tsx` | Add h-12 to action buttons | Zero |

**Total: 9 existing files + 1 new hook + 1 database migration. Zero new dependencies.**

---

## What Is Already Correct (No Action Needed)

- `sale-completed` → `sharedKeys.overview()` + `customers()` + `lpgBrands()`: Working correctly
- `purchase-completed` → `sharedKeys.overview()` + `lpgBrands()`: Working correctly  
- `customer-updated` → `sharedKeys.customers()`: Working correctly
- `price-updated` → `sharedKeys.prices()`: Working correctly
- CustomerManagementModule: Uses `useSharedCustomers()` correctly — NOT zombie state
- Vehicle cost saves already call `queryClient.invalidateQueries(sharedKeys.overview())`: Confirmed at line 359
- Staff salary saves already call `queryClient.invalidateQueries(sharedKeys.overview())`: Confirmed at line 245
- Inventory filter bar: Already has `sticky top-0 z-10` from previous plan
- Settings section buttons: Already use `min-h-[64px]` (exceeds 44px standard)
- Unified realtime channel: Single `stock-x-unified` channel with correct tiered debounce
- Monthly revenue stats: Correctly fetched via `get_monthly_revenue_stats` RPC in `fetchOverviewStats`
