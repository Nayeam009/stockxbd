
# Cross-Module Connectivity Audit: Repair Plan

## Executive Summary

After tracing all 10 modules through their data sources, hooks, RPC calls, and event wires, the system is **substantially solid**. The atomic `complete_pos_sale` RPC, unified React Query cache, and the `moduleEvents` bus form a strong backbone. However, there are **7 real gaps** across 4 categories that need to be fixed for commercial-grade reliability.

---

## Audit Results by Integration Point

### Integration Point 1: POS ↔ Inventory & Pricing

**Findings:**

- **Inventory decrement: WORKING.** The `complete_pos_sale` RPC correctly decrements `lpg_brands.refill_cylinder` or `package_cylinder` and increments `empty_cylinder` or `problem_cylinder` for returns. Uses `GREATEST(0, ...)` to prevent negative stock.
- **Real-time price fetching: WORKING.** `usePOSData` pulls from `useSharedProductPrices` which reads from `product_prices` table. `getLPGPrice()` correctly branches on `refill`/`package` and `wholesale`/`retail`.
- **Out-of-stock blocking: PARTIAL GAP (Gap #1).** `usePOSCart.addLPGToCart()` checks `stock = cylinderType === 'refill' ? brand.refill_cylinder : brand.package_cylinder` and blocks adding more than available. However, this check uses the **React Query cache snapshot**, not a live database check. If two staff members are selling simultaneously on different devices, the cache on Device A may be stale by the time they both click Checkout. The RPC itself uses `GREATEST(0, ...)` which silently succeeds even when stock is zero — it does not throw an error to the client when an oversell occurs. The client receives a success response even if the real stock was already 0.

**Gap #1 — Silent Oversell on Concurrent Sales**
- The `complete_pos_sale` RPC should raise an exception if the computed result of `refill_cylinder - quantity` would go below zero for any item, instead of silently using `GREATEST(0, ...)`.
- Fix: Add a pre-check inside the RPC before the UPDATE. If `refill_cylinder < qty`, raise `EXCEPTION 'Insufficient stock for %', brand_name`.

---

### Integration Point 2: Analytics ↔ Data Sources

**Findings:**

- **Business Diary data source: WORKING.** `useBusinessDiaryQueries.ts` aggregates directly from `pos_transactions`, `pob_transactions`, `daily_expenses`, `staff_payments`, `vehicle_costs`, and `customer_payments`. No mock data.
- **Analytics module data: PARTIAL GAP (Gap #2).** `AnalysisSearchReportModule` uses `useBusinessDiaryData` (the **legacy hook** in `src/hooks/useBusinessDiaryData.ts`) instead of the newer `useBusinessDiaryQueries`. The legacy hook has its own independent `useEffect` polling loop and a separate Supabase real-time subscription channel — duplicating what the unified `useUnifiedRealtime` already does. This creates two channels subscribing to the same tables, which can cause double-refresh storms and slightly out-of-sync data between the Diary and Analytics views.
- **Date filtering: WORKING.** Both `useBusinessSales` and `useBusinessExpenses` pass `startDate`/`endDate` directly to the Supabase query. The weekly boundary starts on Saturday (correct for Bangladesh context per architecture notes).
- **Dashboard KPI: PARTIAL GAP (Gap #3).** `Dashboard.tsx` builds its `analytics` object from `useSharedOverviewStats`, which reads from `inventory_summary` (a separate summary table synced by trigger). However, `analytics.monthlyRevenue`, `lastMonthRevenue`, and `monthlyGrowthPercent` are all hardcoded to `0` — the `get_monthly_revenue_stats` RPC exists in the database but is never called in the dashboard component.

**Gap #2 — Duplicate Real-time Subscription in Analytics**
- `AnalysisSearchReportModule` imports `useBusinessDiaryData` (legacy), which opens its own Supabase channel.
- Fix: Migrate the Analytics module to use `useBusinessSales` + `useBusinessExpenses` from `useBusinessDiaryQueries` (the TanStack Query version). The unified realtime channel in `useUnifiedRealtime` will handle refreshes automatically, removing the duplicate subscription.

**Gap #3 — Monthly Growth KPIs Missing on Dashboard**
- `monthlyRevenue`, `lastMonthRevenue`, and `monthlyGrowthPercent` are always `0` in the dashboard analytics object.
- Fix: Call `supabase.rpc('get_monthly_revenue_stats')` inside `useSharedOverviewStats` (or as a separate query) and populate these fields.

---

### Integration Point 3: Financial Integrity (Diary ↔ Expenses ↔ Shop)

**Findings:**

- **Utility Expenses → Daily Expenses: WORKING.** When a staff salary payment is saved in `UtilityExpenseModule`, a second `supabase.from("daily_expenses").insert(...)` call runs immediately after, auto-categorized as `"Staff"`. Same for vehicle costs, categorized as `"Transport"`. Both appear in the Business Diary expenses panel.
- **POB → Daily Expenses: WORKING.** The `InventoryPOBDrawer` similarly inserts a row into `daily_expenses` on every purchase completion, which feeds the diary.
- **Shop Configuration → POS Invoice: PARTIAL GAP (Gap #4).** The `InvoiceTemplate` component has hardcoded fallback values: `businessName = "Stock-X LPG"`, `businessPhone = "+880 1234-567890"`, `businessAddress = "Dhaka, Bangladesh"`. The `MyShopProfileModule` saves real values to the `shop_profiles` table, but the POS module never fetches these and passes them to the invoice. Every printed memo shows generic placeholder data.
- **Utility Expenses → Shared Cache Invalidation: GAP (Gap #5).** When `UtilityExpenseModule` inserts into `daily_expenses`, it does NOT call `queryClient.invalidateQueries` for the `sharedKeys.overview()` cache. The unified realtime channel does listen to `daily_expenses` changes, but only with a 1500ms debounce. More critically, the Utility module fetches its own data with `fetchStaffData()` and `fetchVehicleData()` in plain `useState` + `useEffect` — not TanStack Query — so the data is **not shared** with the diary's cache. After a staff payment, the Utility module correctly updates its own local state via refetch, but the Business Diary must wait for the realtime event.

**Gap #4 — POS Invoice Shows Placeholder Shop Name**
- Fix: Create a small `useShopProfile` hook (or reuse the existing query in `MyShopProfileModule`) that fetches `shop_profiles` for the current owner. Pass `shopProfile.shop_name`, `shopProfile.phone`, and `shopProfile.address` as props to `InvoiceTemplate` inside `POSModule`.

**Gap #5 — Utility Expense Module Not Using Shared Query Cache**
- The module uses direct `useState` fetching instead of TanStack Query, so its data is isolated.
- Fix: Migrate `UtilityExpenseModule`'s `fetchStaffData` and `fetchVehicleData` into `useQuery` hooks with appropriate query keys (e.g., `['staff', ownerId]`, `['vehicles', ownerId]`). After insert/update/delete actions, call `queryClient.invalidateQueries` on those keys.

---

### Integration Point 4: Customer Data Flow

**Findings:**

- **POS → Customers (instant sync): WORKING.** After `complete_pos_sale`, `POSModule` calls `queryClient.invalidateQueries({ queryKey: sharedKeys.customers() })`. The `CustomerManagementModule` uses `useSharedCustomers()` from the same cache, so new customers and updated dues appear immediately.
- **Transaction history from Customer profile: WORKING.** `CustomerManagementModule.fetchCustomerSalesHistory()` queries `pos_transactions` joined with `pos_transaction_items` filtered by `customer_id`. The `CustomerHistoryDialog` renders both the purchases tab and payments tab correctly.
- **Customer data in Business Diary: PARTIAL GAP (Gap #6).** `fetchSalesData` in `useBusinessDiaryQueries` fetches a separate `customers` query to build a `customerMap`. This means the diary does a redundant fetch of all customers every time the date range changes, independent of the shared `useSharedCustomers` cache.
- **Memo Recall (Customer module): WORKING.** Uses `search_all_entities` RPC to search by phone/memo number. Results display transaction details with reprint capability.

**Gap #6 — Business Diary Fetches Customers Redundantly**
- Fix: Refactor `fetchSalesData` to use the existing `useSharedCustomers` cache data by passing the customer map as a parameter from the hook level, removing the inline `supabase.from('customers').select(...)` inside the fetch function.

---

### Navigation Flow Audit

**Findings:**

- **Dashboard → Modules: WORKING.** The `DashboardOverview` KPI cards call `setActiveModule?.(moduleId)` on click. Quick Action buttons call `handleQuickAction(module)`.
- **Analytics → Inventory (click-through): GAP (Gap #7).** The `AnalysisSearchReportModule`'s top item lists (top selling products, top expense categories) render text-only cards. There is no click handler to navigate to the relevant module. For example, clicking "Bashundhara 12kg" in the top products list should navigate to `inventory`. Currently it does nothing.
- **Module event bus: WORKING.** `window.dispatchEvent(new CustomEvent('navigate-module', { detail: moduleId }))` is handled in `Dashboard.tsx`'s `useEffect` which calls `handleModuleChange`.
- **Search → Module navigation: WORKING.** The global search in Analytics uses the `search_all_entities` RPC and the results display a "Go to" button that calls `navigateToModule`.

**Gap #7 — Analytics Top-Items Cards Are Not Clickable**
- Fix: Add `onClick` handlers to the top-selling product rows in `AnalysisTopItems` component and top expense category rows, dispatching `navigate-module` events (e.g., `inventory` for products, `utility-expense` for staff costs).

---

## Complete Repair Plan (Prioritized)

### Priority 1 — Data Integrity (Business-Critical)

**Fix #1: Prevent Silent Oversell in `complete_pos_sale` RPC**
- File: New database migration
- Action: Add a stock availability check inside the RPC loop. Before `UPDATE lpg_brands SET refill_cylinder = GREATEST(0, ...)`, check `IF v_brand.refill_cylinder < qty THEN RAISE EXCEPTION ...`. Return a descriptive error that the POS can catch and display as a toast.

### Priority 2 — Financial Accuracy

**Fix #3: Wire Monthly Revenue Stats to Dashboard**
- Files: `src/hooks/useSharedQueries.ts`, `src/pages/Dashboard.tsx`
- Action: Add a `useQuery` call for `get_monthly_revenue_stats` RPC inside `useSharedOverviewStats` or as a separate hook. Map the result into the `analytics` object in `Dashboard.tsx`.

**Fix #4: Pull Shop Name/Phone into POS Invoice**
- Files: `src/components/dashboard/modules/POSModule.tsx`
- Action: Add a `useQuery` for `shop_profiles` at the top of `POSModule`. Pass `shopProfile?.shop_name`, `shopProfile?.phone`, and `shopProfile?.address` as `businessName`, `businessPhone`, and `businessAddress` props to `InvoiceTemplate` inside `InvoiceDialog`.

### Priority 3 — Performance & Cache Coherence

**Fix #2: Remove Duplicate Realtime Channel in Analytics**
- Files: `src/components/dashboard/modules/AnalysisSearchReportModule.tsx`
- Action: Replace `import { useBusinessDiaryData }` with `import { useBusinessSales, useBusinessExpenses, useBusinessDiaryRealtime }` from `@/hooks/queries`. Recompute the analytics aggregations from the TanStack Query hooks. Remove the standalone `useEffect` subscription loop.

**Fix #5: Migrate Utility Expense to TanStack Query**
- File: `src/components/dashboard/modules/UtilityExpenseModule.tsx`
- Action: Wrap `fetchStaffData` and `fetchVehicleData` in `useQuery` hooks. After each mutation (add/pay/delete), call `queryClient.invalidateQueries` on the appropriate keys and `sharedKeys.overview()`. This also gives the module access to the loading/error states that TanStack Query provides.

**Fix #6: Eliminate Redundant Customer Fetch in Business Diary**
- File: `src/hooks/queries/useBusinessDiaryQueries.ts`
- Action: Remove the inline `supabase.from('customers').select(...)` from `fetchSalesData`. Instead, accept a pre-built customer map as a parameter into the function, populated by the caller from `useSharedCustomers`.

### Priority 4 — UX & Navigation

**Fix #7: Make Analytics Top-Items Navigable**
- File: `src/components/analysis/AnalysisTopItems.tsx`
- Action: Add `onClick` prop support. Each top product row dispatches `navigate-module` → `inventory`. Each top expense category dispatches to `utility-expense` or `business-diary`. Add a subtle `cursor-pointer` style and a `ChevronRight` icon to each row.

---

## Summary Table

| # | Gap | Severity | Module(s) Affected | Type |
|---|-----|----------|-------------------|------|
| 1 | Silent oversell on concurrent sales | Critical | POS, Inventory | Database RPC |
| 2 | Duplicate realtime channel in Analytics | Medium | Analytics | State/Cache |
| 3 | Monthly revenue KPIs always show 0 | Medium | Dashboard | Missing RPC call |
| 4 | POS invoice shows hardcoded shop name | Medium | POS, My Shop | Data wiring |
| 5 | Utility Expense not in shared cache | Low | Utility, Diary | State migration |
| 6 | Business Diary fetches customers redundantly | Low | Diary, Customers | Performance |
| 7 | Analytics top-items not clickable | Low | Analytics | Navigation |

---

## What Is Already Correct (No Action Needed)

- POS inventory decrement via atomic RPC with rollback
- Real-time price fetching from `product_prices` in POS
- Client-side stock guard in `usePOSCart`
- New customers from POS appear instantly in Customer module
- Customer transaction history (purchases + payments) viewable from profile
- Utility expenses auto-sync to `daily_expenses`
- POB purchases auto-sync to `daily_expenses`
- Business Diary reads from live tables (no mock data)
- All modules use skeleton loaders (no blank screens)
- RLS policies enforce owner-scoped data isolation for all 9 core tables
- Unified realtime channel (single Supabase channel, tiered debounce)
- Cross-module event bus wired: POS → Customer, Diary, Dashboard

Once approved, these 7 fixes will be implemented in two batches:
- **Batch A (Database + Critical):** Fix #1 (RPC stock check)
- **Batch B (Frontend):** Fixes #2–7 (cache wiring, invoice, navigation)
