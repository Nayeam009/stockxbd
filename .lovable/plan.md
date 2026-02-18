
# StockX BD — QA Vulnerability Report

## Scope of Audit
7 files read in full, 3 database queries executed, 2 RPC bodies inspected. The findings below are verified against actual code, not theoretical.

---

## Section 1: POS "Unhappy Path" Simulation

### Finding 1.1 — Network Failure on "Pay" Press
**Severity: Medium | Status: Partially Handled**

**What the code does:**
In `POSModule.tsx`, the `handleCompleteSale` function starts with `setProcessing(true)` and the `finally` block always calls `setProcessing(false)`. The Proceed button receives `disabled={disabled || processing}` from `POSStickyFooter.tsx`. The payment confirm buttons also check `disabled={processing}`.

**The gap — No retry mechanism:**
When the network cuts mid-call, the `supabase.rpc('complete_pos_sale', ...)` will throw a network error. The `catch` block fires, showing a toast with the error message (e.g., "Failed to fetch"). `setProcessing(false)` is called in `finally`. This is correct basic error handling.

**However, there is no retry mechanism.** The cart data is preserved (no `resetCart()` is called on error), so the user CAN press pay again manually. But:
1. The toast just says "Error" and the raw error message — on mobile a "network error" toast is confusing to non-technical staff.
2. The `generate_transaction_number` RPC has already run before the main RPC call (line 274). If the transaction number was generated but the main RPC failed, the next retry will generate a new number. The old number is orphaned but harmless.
3. There is no auto-retry with exponential backoff.

**The real offline risk:** If the `supabase.auth.getUser()` call on line 270 fails (offline), the user sees a cryptic error. The cart is safe but the UX is poor.

**What needs to be fixed:**
- Show a specific "No internet connection — your cart is safe, try again" toast when the error is a network/fetch error.
- Use `navigator.onLine` to detect this case before calling the RPC.

---

### Finding 1.2 — Stock Race Condition
**Severity: Low | Status: SOLVED at Database Level**

**What the code does:**
The `complete_pos_sale` RPC has a **two-phase approach**:
1. **PRE-CHECK** (lines in the RPC): Before any `INSERT`/`UPDATE`, it loops through all items and checks stock with a `SELECT ... FOR UPDATE` implicit lock. If `refill_cylinder < qty`, it raises `RAISE EXCEPTION 'Insufficient stock for % (Refill). Available: %, Requested: %'`.
2. Only after all checks pass does it proceed to deduct inventory.

**This is correctly handled.** The RPC runs inside a single database transaction. PostgreSQL's `RAISE EXCEPTION` causes an automatic rollback of the entire transaction.

**What the second staff member sees:**
The `catch` block in `handleCompleteSale` fires with the PostgreSQL error message:  `"Insufficient stock for Bashundhara 12kg (Refill). Available: 0, Requested: 1"`. This is shown in a toast as `description: error.message`. The message is readable but technical. It could be formatted more user-friendly (e.g. "Out of Stock: Bashundhara 12kg") — but functionally it works correctly with no data corruption.

**Minor gap:** The toast title is just "Error" — it should say "Sale Failed — Out of Stock" for faster comprehension by staff.

---

### Finding 1.3 — Cross-Brand Returns
**Severity: Low | Status: WORKING, but with a UX gap**

**What the code does:**
In `usePOSCart.ts`, the `addReturnCylinder` function (lines 207-229) adds a return item using the selected brand's `id`, `name`, and `color`. It is completely independent of what is in the sale cart. A staff member can:
- Sell "Total LPG" refill
- Add "Jamuna" as a return cylinder

**This is allowed by design** — the custom knowledge specifies this as a valid use case for offline shops.

**The RPC handles it correctly:**
In `complete_pos_sale`, the return items loop (section 4) does `UPDATE lpg_brands SET empty_cylinder = empty_cylinder + qty WHERE id = return_brand_id`. This is brand-specific — "Jamuna" empties increment Jamuna's count, not Total's. The `inventory_summary` sync trigger also runs correctly per-brand.

**The UX gap:** There is no warning shown when sale brand ≠ return brand (unlike the online ordering system which blocks it). For offline POS this is intentional, but a subtle yellow info badge "Cross-brand return" on the return table would improve audit clarity.

---

## Section 2: "Zombie" Data Audit

### Finding 2.1 — Driver Assignment UI
**Severity: Medium | Status: GAP CONFIRMED**

**Database:** The `orders` table has a `driver_id uuid` column (confirmed by query). The `pos_transactions` table also has `driver_id uuid`. The `staff` table has roles including "Driver".

**UI Reality:**
- `POSModule.tsx`: No driver assignment UI anywhere in 648 lines.
- `UtilityExpenseModule.tsx`: Staff can be added with role "Driver" and paid, but cannot be assigned to deliveries.
- `BusinessDiaryModule.tsx`: Sales cards show "who sold" based on `created_by` (owner/manager/staff), not driver.
- The `complete_pos_sale` RPC signature does not include a `p_driver_id` parameter at all.

**Impact:** 
- `driver_id` on `pos_transactions` is always `null`.
- "Who delivered" tracking is impossible in the current system.
- The `get_daily_sales_by_driver` type of report cannot be built without a UI to assign drivers.
- The custom knowledge mentions "Driver" as a role who collects money and returns empty cylinders, but this workflow has no technical implementation yet.

**What needs to be built:** A driver selector in the POS payment flow (shown after "Confirm"), and passing `driver_id` to the RPC.

---

### Finding 2.2 — Tax Rate and Currency Symbol
**Severity: Low | Status: SOLVED (but with a stale UI residual)**

**Database confirmation:** `shop_profiles` table DOES have both `tax_rate` (numeric, default 0) and `currency_symbol` (text, default '৳'). Both columns exist.

**Code status:**
- `POSModule.tsx` lines 70-82: Fetches `tax_rate` and `currency_symbol` from `shop_profiles`. ✅
- `usePOSCart.ts`: Accepts `taxRate` param and calculates `tax = (subtotal - discount) * taxRate / 100`. ✅
- `SettingsModule.tsx` lines 662-726: `case 'business'` renders the full Financial Preferences form with inputs and save button. ✅

**Residual issue — `POSPaymentDrawer.tsx` and `POSStickyFooter.tsx`:**
Both still import and use `BANGLADESHI_CURRENCY_SYMBOL` (the hardcoded `৳` constant from `bangladeshConstants.ts`), NOT the dynamic `currencySymbol` fetched from the database.

Specifically:
- `POSPaymentDrawer.tsx` line 14: `import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";`
- Line 62: `{BANGLADESHI_CURRENCY_SYMBOL}{total.toLocaleString()}` (Total Bill display)
- Line 138: `{BANGLADESHI_CURRENCY_SYMBOL}{(total - paidAmount).toLocaleString()}` (Remaining Due)
- Line 175: `` `Save Partial (৳${paidAmount.toLocaleString()} paid)` `` — hardcoded `৳` inline
- `POSStickyFooter.tsx` line 34: `{BANGLADESHI_CURRENCY_SYMBOL}{total.toLocaleString()}`

The invoice/memo template DOES correctly receive `currencySymbol` from `POSModule.tsx` (line 356 of the transaction data). But the payment drawer UI and sticky footer show the hardcoded symbol.

---

## Section 3: Performance Bottleneck Check

### Finding 3.1 — Unified Real-time Subscription Analysis
**Severity: Low | Status: WELL IMPLEMENTED, one minor gap**

**Channel architecture:**
`useUnifiedRealtime()` in `useSharedQueries.ts` creates exactly **one** Supabase channel (`'stock-x-unified'`) listening to 9 tables. This is the correct architecture — using a single channel is far more efficient than 9 separate channels.

**Debounce tiers — ARE they working?**
Yes. The implementation uses a `debounceRefs` ref (`useRef<Record<string, NodeJS.Timeout | null>>`) that stores a separate timer per query key. When 50 changes arrive simultaneously:
1. Each change event calls `invalidateWithDebounce(queryKey, tier)`
2. The function cancels the existing timer for that key (`clearTimeout(debounceRefs.current[key])`)
3. Sets a new timer with the tier delay (500ms critical, 1500ms normal, 3000ms low)
4. Result: only ONE invalidation fires per key, no matter how many events arrived during the debounce window

This is correct. 50 simultaneous `lpg_brands` changes would trigger exactly 1 query invalidation after 1500ms.

**The React re-render count:**
Each query invalidation causes React Query to mark the cache as stale and trigger a background refetch. The components that subscribe via `useSharedLPGBrands()`, `useSharedCustomers()` etc. only re-render when the NEW data arrives (not when the cache is marked stale). This is efficient.

**Potential bottleneck on low-end Android:**
The 9 table listeners in one channel means the Supabase WebSocket receives all `postgres_changes` events. The JavaScript event handler runs for each event. At 50 events/second, this is 50 JS function calls — negligible on any device.

**The actual bottleneck risk** is not in the subscription, but in the **refetch itself**. When `overview` is invalidated:
- `fetchOverviewStats()` fires 5 parallel RPCs simultaneously
- Each RPC hits PostgreSQL
- On a slow network, all 5 results return together and trigger a single re-render of `DashboardOverview`

This is acceptable. The real performance risk is not in the debounce but in having `refetchInterval: 60 * 1000` on `useSharedOverviewStats()` (line 288). This means even without realtime events, the overview refetches every minute, triggering 5 RPC calls. On a slow 3G connection this could cause noticeable lag as all KPIs briefly flicker to their loading state.

**Minor gap — no `filter` in the Supabase channel:**
The channel uses no `filter: 'owner_id=eq.xxx'` clause. This means it receives ALL changes from ALL users on ALL rows of each table. The PostgreSQL RLS policies ensure the subsequent query only returns the user's data, but the WebSocket receives every change event in the system. For a multi-tenant system with many shops, this is inefficient. For a single-shop deployment, it is harmless.

---

## Summary Table

| # | Finding | Severity | Status | Effort to Fix |
|---|---|---|---|---|
| 1.1 | Network failure shows cryptic toast; no offline-aware retry | Medium | Gap | Small — 10 lines |
| 1.2 | Race condition stock oversell | Low | Solved (DB level) | None |
| 1.3 | Cross-brand returns — no audit warning | Low | Intentional / Minor UX | Small |
| 2.1 | Driver assignment has no UI — `driver_id` always null | Medium | Gap | Large — new feature |
| 2.2 | `POSPaymentDrawer` and `POSStickyFooter` still use hardcoded `৳` | Low | Residual | Small — 4 lines |
| 3.1 | Overview `refetchInterval` causes 5 RPCs every 60s; no channel filter | Low | Architecture | Medium |

---

## Recommended Fix Priority

**Implement now (small effort, visible improvement):**

1. **Fix 2.2** — Pass `currencySymbol` prop to `POSPaymentDrawer` and `POSStickyFooter`. Replace `BANGLADESHI_CURRENCY_SYMBOL` with the prop. 4 files, ~10 line changes.

2. **Fix 1.1** — In `handleCompleteSale`, before calling any Supabase RPC, check `navigator.onLine`. If offline, show: `toast({ title: "No internet connection", description: "Your cart is saved. Please reconnect and try again.", variant: "destructive" })`. For the race condition error (1.2), parse `error.message` and show "Out of Stock: [brand name]" instead of the raw PostgreSQL error.

3. **Fix 3.1 (partial)** — Increase `refetchInterval` on `useSharedOverviewStats` from 60s to 120s to halve the background RPC load.

**Plan as a future sprint:**

4. **Fix 2.1** — Driver assignment. This requires: (a) a driver selector UI in `POSPaymentDrawer`, (b) adding `p_driver_id` parameter to `complete_pos_sale` RPC via a database migration, (c) updating the Business Diary to show delivery attribution.
