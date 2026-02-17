
# Phase 1 (Post-Fixes): Health Check and Gap Analysis

## Status of Previous Fixes

All changes from Phases 1-4 are confirmed integrated:
- Dead code removed (OnlineDeliveryModule, VehicleCostModule, ExchangeModule)
- Atomic POS sale via `complete_pos_sale` RPC -- working
- Business Diary date filters (30-day lookback) applied to staff_payments and vehicle_costs
- `customer_payments` RLS tightened with owner scoping via customers join
- Mobile bottom nav reordered (Inventory promoted)
- POS product cards wrapped in `React.memo` with `min-w-[140px]`
- Business Diary mobile FAB added
- Analysis module uses server-side `search_all_entities` RPC

---

## REMAINING ISSUES FOUND

### CRITICAL (Bugs / Data Integrity)

**1. Analysis module still creates a duplicate realtime channel**
- File: `AnalysisSearchReportModule.tsx` lines 130-145
- Creates its own `analysis-realtime` channel subscribing to 7 tables, duplicating the unified `dashboard-master` channel in `useSharedQueries.ts`
- Fix: Remove the local channel; rely on unified realtime + TanStack Query cache invalidation that already covers these tables

**2. Utility Expense module still creates a duplicate realtime channel**
- File: `UtilityExpenseModule.tsx` lines 192-203
- Creates `utility-expense-realtime` channel subscribing to 5 tables
- Fix: Same approach -- remove local channel, use shared cache invalidation

**3. `fetchPayments` in CustomerManagement is still unbounded**
- File: `CustomerManagementModule.tsx` lines 179-191
- Fetches ALL `customer_payments` with no date filter or limit
- For shops with high volume, this will hit the 1000-row default Supabase limit silently, causing missing payment records
- Fix: Add `.limit(500)` and a 90-day lookback filter

**4. CustomerManagementModule is 1,908 lines in a single file**
- Not a bug, but a maintainability and performance concern
- Every state change in any sub-feature (search, settle, history, memo recall) triggers re-renders across the entire 1,908-line component
- Fix: Extract into sub-components (CustomerList, CustomerSettleDialog, CustomerHistoryPanel, MemoRecallSearch) -- deferred to a dedicated refactor phase

---

### PERFORMANCE

**5. Business Diary summary cards lack `tabular-nums` on currency values**
- File: `BusinessDiaryModule.tsx` (SummaryCard component)
- Currency values without `tabular-nums` cause layout shifts as digits change width (e.g., "1" vs "8")
- Fix: Add `tabular-nums` class to the value text elements in the summary cards

**6. POS product grid container has no overflow safety on 320px**
- File: `POSModule.tsx` line ~500 (product grid)
- While individual cards now have `min-w-[140px]`, the grid container uses `grid-cols-2 sm:grid-cols-3` without `overflow-x-auto`. On 320px screens, two 140px cards + gap = 288px which fits, but if padding pushes it, cards can clip
- Fix: Add `overflow-x-auto` as a safety net on the grid wrapper

---

### MOBILE RESPONSIVENESS

**7. POS Sticky Footer z-index conflict with Business Diary FAB**
- Both use `z-40`. If a user navigates between modules quickly, both can briefly coexist in the DOM (due to React transitions). No visual conflict since they're on different modules, but aligning z-indices to a consistent scale improves robustness
- Status: Low priority, no action needed

**8. Business Diary summary grid overflows on 320px screens**
- The 3-column grid of summary cards uses `grid-cols-3` which gives ~96px per card at 320px after padding. Currency values above 99,999 overflow
- Fix: Add `text-ellipsis overflow-hidden` to the value containers and ensure `tabular-nums` is applied

---

### GAP ANALYSIS (Missing Features)

**9. No remaining dead/empty modules**
- All dashboard switch cases map to live, functional components
- All navigation items (sidebar + bottom nav + "More" menu) point to valid modules
- The `ExchangeModule`, `OnlineDeliveryModule`, and `VehicleCostModule` dead code was successfully removed in Phase 1

**10. Analysis module report generators use raw Supabase queries without owner scoping**
- File: `AnalysisSearchReportModule.tsx` lines 355-400
- `generateDailySalesReport()`, `generateStockReport()`, etc. query tables directly without adding `owner_id` filters
- RLS handles this at the database level, so this is not a security issue, but the queries could return unexpected results if RLS policies change
- Fix: Low priority -- RLS is the correct enforcement layer here

---

## IMPLEMENTATION PLAN (Priority Order)

| # | Fix | File | Effort |
|---|-----|------|--------|
| 1 | Remove duplicate `analysis-realtime` channel, rely on unified realtime | `AnalysisSearchReportModule.tsx` | Low |
| 2 | Remove duplicate `utility-expense-realtime` channel, rely on unified realtime | `UtilityExpenseModule.tsx` | Low |
| 3 | Add `.limit(500)` and 90-day lookback to `fetchPayments` | `CustomerManagementModule.tsx` | Trivial |
| 4 | Add `tabular-nums` and overflow handling to Business Diary summary cards | `BusinessDiaryModule.tsx` | Trivial |
| 5 | Add `overflow-x-auto` safety to POS product grid wrapper | `POSModule.tsx` | Trivial |

### Technical Notes

**Items 1-2 (Realtime consolidation):**
The unified `dashboard-master` channel in `useSharedQueries.ts` already subscribes to `pos_transactions`, `lpg_brands`, `customers`, `community_orders`, and `daily_expenses`. It invalidates TanStack Query caches with debounced tiers. The Analysis and Utility modules should simply use `useEffect` listeners on cache invalidation (which they already do via `useBusinessDiaryData`) instead of maintaining separate WebSocket channels. This reduces active WebSocket connections from 3+ to 1 per dashboard session.

**Item 3 (fetchPayments):**
```typescript
const { data } = await supabase
  .from('customer_payments')
  .select('*')
  .gte('payment_date', subDays(new Date(), 90).toISOString())
  .order('payment_date', { ascending: false })
  .limit(500);
```

**Item 4 (tabular-nums):**
Add `tabular-nums` CSS class to the currency value elements in `SummaryCard` to prevent layout shifts when numbers change.
