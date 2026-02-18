
# "Shop Owner Day" Workflow Simulation: Broken Links Report

## Executive Summary

After tracing the full code path for each of the 5 simulated workflow steps, the system is **largely functional** but has **4 real broken links** and **3 UX friction points**. The core POS→Inventory→Diary data flow works. The gaps are concentrated in missing integration points between Settings, Inventory→Pricing discovery, the payment method routing in POS, and a low-stock alert gap on the Dashboard.

---

## PHASE 1: Morning Setup

### Step 1: Settings → "Change Currency to USD / Tax Rate 5%"

**CRITICAL BREAK: Currency and Tax Rate settings do not exist.**

- The Settings module (`SettingsModule.tsx`) contains: Account (Profile, Theme, Language), Notifications, Security, Team & Business, and Advanced/Printer.
- There is **no "Currency" setting** anywhere. The app hardcodes `৳` (Taka) via `BANGLADESHI_CURRENCY_SYMBOL` in `src/lib/bangladeshConstants.ts` (line 3). This constant is imported in 15+ components — POS, Dashboard, Diary, Analytics — and cannot be changed through any UI.
- There is **no "Tax Rate" setting** anywhere. The POS cart (`usePOSCart.ts`) calculates `total = subtotal - discount` with no tax multiplication step. There is no `taxRate` field in `shop_profiles` or anywhere in the database schema.

**Finding: Settings → Currency/Tax is fully missing logic. The simulation request cannot be completed.**

**Gap #A — No Currency/Tax Infrastructure**
- No `tax_rate` column on `shop_profiles`
- No `currency` column on `shop_profiles`
- No context or global state that would propagate either value to POS/Pricing
- This is a **Missing Logic** gap, not a broken link — the feature simply doesn't exist yet.

---

### Step 2: Inventory → Add "Premium Widget" → See it in Product Pricing immediately

**PARTIAL BREAK: The sync works but with a critical product name mismatch.**

- When a new LPG brand is added via the POB drawer (`InventoryPOBDrawer`), `syncLpgBrandToPricing()` is called from `useInventoryPricingSync.ts`.
- `syncLpgBrandToPricing` creates a `product_prices` entry with the name format: `"${brandName} LP Gas ${weight} Cylinder (${size}) ${variant}"` (line 102).
- The `ProductPricingModule` uses `getGroupedBrands()` from `useProductPricingData` which groups by `lpg_brands.name` via a `normalizeBrandName` function.
- The **mismatch**: `lpg_brands.name = "Premium Widget"` but `product_prices.product_name = "Premium Widget LP Gas 12kg Cylinder (22mm) Refill"`. These don't match unless the code explicitly uses `brand_id` as the join key.
- Checking the code: `getProductsForBrandGroup` filters by `brand_id` (line in useProductPricingData summary), so the join IS on `brand_id` not on name — **this part works correctly**.
- **BUT**: The `product_prices` entry is created with `company_price: 0`, `retail_price: 0` — these are $0 placeholders. The owner must then manually navigate to Pricing and fill in the prices. There is no toast or visual indicator in the Inventory module pointing the user to do this.
- **UX Fail**: No notification to the owner that "A new pricing entry has been created for Premium Widget. Set its prices in Product Pricing."

**Gap #B — No Cross-Module Guidance After Inventory Add**
- After POB checkout, the success toast says "Purchase completed" but doesn't guide the user to set a price in Pricing.
- The Pricing module *will* show the item (correctly via `brand_id`), but only after the user manually navigates there.

---

## PHASE 2: The Trading Day

### Step 3: POS → Search "Premium Widget" + 5% Tax Calculation

**BREAK: POS has no tax calculation. Tax = 0 always.**

- `usePOSCart.ts` lines 41-49: `total = Math.max(0, subtotal - discount)`. No `* (1 + taxRate/100)` multiplier.
- Since `tax_rate` doesn't exist in the database or context, the POS will never apply tax.
- The `InvoiceTemplate` likely also shows no tax line item (not a separate break, just a consequence of the same missing logic).

**Finding: 5% tax simulation = FAIL. The total will always show pre-tax amount.**

**POS Search — WORKS:**
- `filteredBrands` in `POSModule.tsx` lines 211-217 filters by `mouthSize`, `weight`, and `productSearch` (case-insensitive name match).
- Custom items ("Premium Widget" is not an LPG brand) would appear as custom add — the user would need to use the "+ Custom Item" button, not the LPG brand grid. There is no generic "product" search in POS that spans all non-LPG inventory types.

**Gap #C — POS Custom Item UX is Hidden**
- Non-LPG items (generic products like "Premium Widget") require clicking the small "+" custom add card, which has no search. A non-technical owner may not find it.

---

### Step 4: Checkout → Inventory decrements → Business Diary appears

**WORKS — With one nuance.**

- POS checkout calls `complete_pos_sale` RPC atomically. Confirmed: LPG `refill_cylinder` decrements by quantity sold.
- After sale, `queryClient.invalidateQueries` fires for `sharedKeys.lpgBrands()` with `refetchType: 'active'` — inventory updates **immediately** in the same session.
- `notifySaleCompleted` fires the cross-module event bus, which triggers Business Diary query invalidation via `useModuleEventSync`.
- Business Diary (`useBusinessSales`) re-fetches, and the new transaction appears.

**One nuance — Payment Method hardcoded to 'cash':**
- `POSModule.tsx` line 305: `p_payment_method: 'cash'` is hardcoded. The `POSPaymentDrawer` shows "bKash", "Nagad" options in the UI but the value passed to the RPC is always `'cash'`. 

This is **Gap #D — CRITICAL:** If the customer pays via bKash, it's recorded as cash in `pos_transactions.payment_method`. The Business Diary's "Cash vs Digital" breakdown will be wrong. Revenue will appear to always be cash.

---

## PHASE 3: End of Day

### Step 5: Utility Expense → Electricity Bill → Net Profit in Analytics

**WORKS — but with a 1.5-second delay.**

- `UtilityExpenseModule.handleAddVehicleCost` (or equivalent for utility bills) inserts into `daily_expenses`.
- Immediately after, `queryClient.invalidateQueries({ queryKey: sharedKeys.overview() })` is called (line 245, confirmed in code).
- The unified realtime channel in `useUnifiedRealtime` also listens to `daily_expenses` with a `normal` (1500ms) debounce.
- `AnalysisSearchReportModule` uses `useBusinessExpenses` from TanStack Query, which is invalidated by the `moduleEvents` bus via `useModuleEventSync`.

**Finding: Analytics Net Profit WILL update, but with up to ~1.5 seconds delay. Not a broken link — acceptable UX.**

**One gap**: The Utility module uses direct `fetchStaffData()`/`fetchVehicleData()` in `useState` + `useEffect` — not TanStack Query. So after paying an electricity bill via the vehicle cost dialog, the Utility module itself refreshes via `fetchAllData()` (local refetch), but the `sharedKeys.overview()` invalidation is only done for staff salary (line 245). Vehicle costs insert into `daily_expenses` but the `sharedKeys.overview()` invalidation call is **missing** for vehicle cost saves. The Dashboard "Today's Expenses" KPI card may not update until the realtime subscription fires.

**Gap #E — Vehicle Cost Does Not Invalidate Overview Cache Immediately**

---

### Step 6: Dashboard → "Total Sales" and "Low Stock" alerts

**Total Sales — WORKS:**
- `overviewStats.todayRevenue` comes from `get_today_sales_total()` RPC → `SUM(total) FROM pos_transactions WHERE DATE(created_at) = CURRENT_DATE`.
- After POS sale, `sharedKeys.overview()` is invalidated → refetches RPC → Dashboard KPI updates.

**Low Stock Alerts — PARTIAL BREAK:**
- `DashboardOverview.tsx` line 176: Shows a banner only when `analytics.cylinderStockHealth === 'critical'`.
- `cylinderStockHealth` is set in `Dashboard.tsx` lines 187-200: It's always `'good' as const` — it's a hardcoded value! The Dashboard builds the `analytics` object from `overviewStats` but line 198 shows: `cylinderStockHealth: 'good' as const`.
- There is no logic that checks if any brand's `refill_cylinder < threshold` and sets this to `'critical'`.

**Gap #F — CRITICAL: Low Stock Alert Logic Is Hardcoded to 'good'. It Never Fires.**

The critical stock banner is dead code. No matter how low the stock goes, it never shows.

---

## BROKEN LINKS REPORT (Prioritized)

### Critical Breaks (Data Integrity)

| # | Break | Location | Impact |
|---|-------|----------|--------|
| D | Payment method always saved as 'cash' in DB, regardless of bKash/Nagad selection | `POSModule.tsx` line 305 | Cash vs digital revenue reporting is permanently incorrect |
| F | Low stock alert never fires — `cylinderStockHealth` hardcoded to `'good'` | `Dashboard.tsx` line 198 | Owner never gets warned about empty shelves |

### UX Fails (No Reload Required, but Confusing)

| # | UX Fail | Location | Impact |
|---|---------|----------|--------|
| B | No guidance after adding inventory to set price | POB Drawer success handler | Owner doesn't know to go to Pricing to set prices for new brand |
| C | Non-LPG items invisible in POS search | `POSModule.tsx` filteredBrands logic | Generic items require hidden custom add path |
| E | Vehicle costs don't immediately refresh Dashboard KPI | `UtilityExpenseModule.tsx` vehicle cost save handler | 1.5s delay before Dashboard "Total Expenses" updates |

### Missing Logic (Feature Does Not Exist)

| # | Missing Feature | Impact |
|---|-----------------|--------|
| A | No Currency or Tax Rate settings | POS always uses ৳ and 0% tax; simulation requirement cannot be fulfilled |

---

## 3-Step Fix Plan

### Step 1 (Critical — Fix Payment Method Routing in POS)

**File: `src/components/dashboard/modules/POSModule.tsx`**

The `POSPaymentDrawer` already has payment method selection in its UI (it shows bKash/Nagad buttons), but the actual selected value is never wired back to the RPC call. The fix:
- Add a `paymentMethod` state (`useState<'cash' | 'bkash' | 'nagad' | 'rocket'>('cash')`) to `POSModule`.
- Pass it as a prop to `POSPaymentDrawer` with an `onPaymentMethodChange` callback.
- Replace the hardcoded `p_payment_method: 'cash'` on line 305 with the state variable.

This is a **2-file change** (`POSModule.tsx` + `POSPaymentDrawer.tsx`) with zero database changes needed. The `payment_method` enum already includes `bkash`, `nagad`, `rocket` in the schema.

---

### Step 2 (Critical — Fix Low Stock Alert Logic)

**File: `src/pages/Dashboard.tsx`**

The `analytics` object is built from `overviewStats` (lines 187-203). The fix:
- Use `overviewStats.inventory.total_refill` and `overviewStats.inventory.total_package` to compute a real stock health status.
- Replace the hardcoded `cylinderStockHealth: 'good' as const` with actual logic:
  ```js
  cylinderStockHealth: (() => {
    const total_full = overviewStats?.inventory?.total_full || 0;
    const total_empty = overviewStats?.inventory?.total_empty || 0;
    if (total_full === 0) return 'critical';
    if (total_empty > total_full) return 'critical';
    if (total_full < 10) return 'warning';
    return 'good';
  })()
  ```
- This is a **1-file, 5-line change** that activates the already-built alert banner UI in `DashboardOverview`.

---

### Step 3 (UX — Fix Vehicle Cost Cache Invalidation + Add Cross-Module Guidance)

**Part A — File: `src/components/dashboard/modules/UtilityExpenseModule.tsx`**

Add `queryClient.invalidateQueries({ queryKey: sharedKeys.overview() })` to the vehicle cost save handler (same as already done for staff salary on line 245). This ensures Dashboard "Today's Expenses" updates instantly after a fuel fill.

**Part B — File: `src/inventory/InventoryPOBDrawer.tsx` (or POB checkout success handler)**

After a successful POB purchase that creates new inventory, show a toast with a navigation action:
```tsx
toast({
  title: "Stock Added",
  description: "Set selling prices in Product Pricing",
  action: <ToastAction onClick={() => navigateToModule('product-pricing')}>Set Prices →</ToastAction>
})
```

This uses the existing `navigate-module` event bus to guide the owner to complete the workflow without manual navigation.

---

## Summary: What Works vs. What Needs Fixing

| Workflow Step | Status | Notes |
|---|---|---|
| Settings → Currency/Tax | MISSING | Feature does not exist in codebase |
| Inventory → Pricing sync | WORKS | $0 placeholder, but entry is created correctly |
| POS search | WORKS | LPG brands only; custom items need separate path |
| POS + 5% Tax calc | MISSING | No tax infrastructure exists |
| POS Checkout → Inventory | WORKS | Atomic RPC, instant cache invalidation |
| POS → Business Diary | WORKS | Via moduleEvents bus |
| **POS Payment Method** | **BROKEN** | **Always saves as 'cash' in DB** |
| Utility Expense → Diary | WORKS | 1.5s delay, acceptable |
| Vehicle Cost → Dashboard | UX FAIL | Missing `invalidateQueries` call |
| **Low Stock Alert** | **BROKEN** | **Hardcoded 'good', never fires** |
| Monthly Revenue KPIs | WORKS | Wired in previous fix batch |
| POS Invoice → Shop Name | WORKS | Wired in previous fix batch |
