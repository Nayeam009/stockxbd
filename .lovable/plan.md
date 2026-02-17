
# Phase 1: Health Check and Gap Analysis

## Complete Audit Results

---

### SECTION A: CRITICAL BUGS (Must Fix)

**1. ExchangeModule references non-existent table `cylinder_exchanges`**
- Location: `src/components/dashboard/modules/ExchangeModule.tsx` line 88
- The module queries `cylinder_exchanges` table, but this table is separate from `cylinder_exchange_requests` (the inter-shop exchange system). However, the ExchangeModule is **never mounted** in `Dashboard.tsx` -- there is no case in the `renderActiveModule()` switch statement that renders it, and it does not appear in either `AppSidebar.tsx` or `MobileBottomNav.tsx`. It is effectively dead code.

**2. OnlineDeliveryModule is dead code**
- Location: `src/components/dashboard/modules/OnlineDeliveryModule.tsx` (758 lines)
- Never imported or rendered in `Dashboard.tsx`. It was superseded by `MarketplaceOrdersModule` but never removed. This is 758 lines of dead weight in the bundle (though lazy-loaded, it still adds maintenance burden).

**3. VehicleCostModule is dead code (duplicated)**
- Location: `src/components/dashboard/modules/VehicleCostModule.tsx` (612 lines)
- Dashboard maps `vehicle-cost` to `UtilityExpenseModule` (line 319), which already contains the full Vehicle Cost tab. `VehicleCostModule.tsx` is a standalone duplicate that is never rendered.

**4. Analysis module receives empty data arrays**
- Location: `src/pages/Dashboard.tsx` lines 324-329
- The `AnalysisSearchReportModule` is passed `salesData={[]}`, `customers={[]}`, `stockData={[]}`, `drivers={[]}`. While the module internally fetches its own data via `useBusinessDiaryData()`, the `customers` and `stockData` props feed the **search results** (lines 236-261 in AnalysisSearchReportModule). This means searching for customers or stock in the Analysis module returns zero results despite data existing in the database.

**5. Analysis module navigation item uses wrong module ID**
- Location: `src/components/dashboard/modules/AnalysisSearchReportModule.tsx` line 208
- The "Online Delivery" navigation item uses `id: 'orders'` which does not match any Dashboard case. Should be `'marketplace-orders'`.

---

### SECTION B: DATA INTEGRITY ISSUES

**6. Business Diary fetches ALL transactions without owner scoping**
- Location: `src/hooks/useBusinessDiaryData.ts` lines 124-148
- `fetchSalesData()` queries `pos_transactions` without filtering by `owner_id`. RLS handles this at the database level, but the query fetches up to 500 records without a date filter, pulling historical data unnecessarily. The date-specific `useBusinessDiaryQueries.ts` hook (used by the Business Diary module itself) is correctly scoped, but the Analysis module uses the unscoped `useBusinessDiaryData` hook.

**7. Customer Management `fetchPayments` has no owner scope**
- Location: `src/components/dashboard/modules/CustomerManagementModule.tsx` lines 179-191
- `fetchPayments()` fetches ALL customer_payments without any filter. RLS protects it, but this will hit the 1000-row default limit for shops with high transaction volume.

**8. POS sale creates inventory updates without transactions**
- Location: `src/components/dashboard/modules/POSModule.tsx` lines 298-334
- Each inventory update (refill, package, stove, regulator, return cylinders) is a separate `await supabase.from().update()` call. If any update fails mid-sequence, the transaction is already recorded but inventory is partially updated. There is no rollback mechanism.

---

### SECTION C: MOBILE RESPONSIVENESS ISSUES

**9. POS product grid lacks min-width on 320px screens**
- Location: `src/components/pos/POSProductCard.tsx`
- Product cards use `p-2.5 rounded-lg` but the parent grid in POSModule (line 590+) doesn't enforce a minimum card width. On 320px screens with 2-column grid, cards can compress below readable size.

**10. POS Sticky Footer overlaps bottom nav on short screens**
- Location: `src/components/pos/POSStickyFooter.tsx` line 24
- Uses `bottom-[calc(64px+env(safe-area-inset-bottom))]` which is correct, but when the keyboard opens on mobile (customer phone input), the footer can overlap the input fields.

**11. Business Diary SummaryCards text truncation on 320px**
- Location: `src/components/dashboard/modules/BusinessDiaryModule.tsx` lines 91-109
- The 3-column grid of summary cards uses `text-[9px]` labels, but currency values (`text-sm sm:text-lg`) can still overflow on 320px width, especially for values above 99,999.

**12. Exchange Module uses desktop Table layout**
- Location: `src/components/dashboard/modules/ExchangeModule.tsx` lines 386-437
- Uses HTML `<Table>` without any mobile card fallback. Columns would compress illegibly on small screens. However, since the module is dead code, this is moot unless it is revived.

---

### SECTION D: PERFORMANCE ISSUES

**13. useBusinessDiaryData fetches unbounded data on mount**
- Location: `src/hooks/useBusinessDiaryData.ts` lines 124-149, 401-423
- Fetches up to 500 POS transactions + 300 POB transactions + 200 staff payments + 200 vehicle costs + unlimited manual expenses on EVERY mount. No date range filter. This causes a noticeable delay when the Analysis module loads.

**14. UtilityExpenseModule creates its own realtime channel**
- Location: `src/components/dashboard/modules/UtilityExpenseModule.tsx` lines 192-203
- Subscribes to `staff`, `staff_payments`, `vehicles`, `vehicle_costs`, and `daily_expenses` tables in its own channel, separate from the unified `dashboard-master` channel. This creates duplicate subscriptions.

**15. Analysis module creates its own realtime channel**
- Location: `src/components/dashboard/modules/AnalysisSearchReportModule.tsx` lines 125-150
- Another separate channel (`analysis-realtime`) subscribing to 7 tables, duplicating the unified channel.

**16. CustomerManagementModule is 1908 lines in a single file**
- Location: `src/components/dashboard/modules/CustomerManagementModule.tsx`
- Contains all CRUD logic, memo recall search, invoice printing, and 4 different view modes in one monolithic component. This hurts code splitting and increases re-render scope.

---

### SECTION E: GAP ANALYSIS (Missing/Incomplete Features)

**17. ExchangeModule has no navigation entry**
- Not accessible from sidebar, bottom nav, or quick actions. Dead module.

**18. OnlineDeliveryModule superseded but not removed**
- 758 lines of unused code. The `MarketplaceOrdersModule` replaced it entirely.

**19. VehicleCostModule superseded but not removed**
- 612 lines of unused code. The `UtilityExpenseModule` contains this functionality.

**20. No "week" or "month" date range in Business Diary**
- The `dateRangeOption` type includes `'week' | 'month'` but only `'today'`, `'yesterday'`, and `'custom'` buttons are rendered in the UI (lines 389-395). Week/month ranges exist in the type but have no UI controls.

---

## IMPLEMENTATION PLAN (Priority Order)

### Priority 1: Fix Critical Bugs (Immediate)

| # | Fix | Files | Effort |
|---|-----|-------|--------|
| 1 | Fix Analysis module search -- pass real customer/stock data or use shared queries internally | `Dashboard.tsx`, `AnalysisSearchReportModule.tsx` | Medium |
| 2 | Fix Analysis nav item `'orders'` to `'marketplace-orders'` | `AnalysisSearchReportModule.tsx` | Trivial |
| 3 | Delete dead code: `OnlineDeliveryModule.tsx`, `VehicleCostModule.tsx`, `ExchangeModule.tsx` | 3 files deleted | Trivial |

### Priority 2: Data Integrity Hardening

| # | Fix | Files | Effort |
|---|-----|-------|--------|
| 4 | Add date-range filter to `useBusinessDiaryData` (default: last 30 days) | `useBusinessDiaryData.ts` | Medium |
| 5 | Add `.limit(500)` and owner-scoping to `fetchPayments` in Customer module | `CustomerManagementModule.tsx` | Low |
| 6 | Wrap POS inventory updates in a single RPC function for atomicity | New migration + `POSModule.tsx` | High |

### Priority 3: Performance Optimization

| # | Fix | Files | Effort |
|---|-----|-------|--------|
| 7 | Remove duplicate realtime channels in Utility/Analysis, use unified channel | `UtilityExpenseModule.tsx`, `AnalysisSearchReportModule.tsx` | Medium |
| 8 | Add Business Diary "This Week" and "This Month" date range buttons | `BusinessDiaryModule.tsx` | Low |

### Priority 4: Mobile Polish

| # | Fix | Files | Effort |
|---|-----|-------|--------|
| 9 | Enforce `min-w-[140px]` on POS product cards for 320px screens | `POSModule.tsx` | Trivial |
| 10 | Add `tabular-nums` and `max-w` overflow handling to Business Diary summary cards | `BusinessDiaryModule.tsx` | Trivial |

### Technical Notes

- **Dead code removal** (items 17-19) will reduce the codebase by ~1,800 lines and simplify the import graph
- **Atomic POS updates** (item 6) is the highest-effort fix but the most impactful for data integrity -- it requires a new Postgres function that handles sale + inventory + customer update in a single transaction
- **Realtime channel consolidation** (item 7) will reduce WebSocket connections from 4+ to 1 per dashboard session
