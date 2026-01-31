
Goal
- Permanently eliminate “refresh / stuck / loading / reloading” states across Stock‑X so the Dashboard and all modules always render reliably on any network (especially mobile), and never get trapped in an infinite spinner/blank state.

What’s actually happening (root cause)
1) “Hanging fetch” + “blocking loading UI”
- Many modules use a pattern like:
  - setLoading(true)
  - await supabase query / Promise.all(...) (no timeout)
  - if (loading) return <Spinner/>
- If any request “hangs” (slow mobile network, stalled connection, flaky DNS, stalled HTTP), the await never resolves → loading never becomes false → module stays on spinner forever.
- We already see evidence of slow/hanging fetches:
  - Console: “[useDashboardData] Fetch timeout - continuing with available data”
  - ProductPricingModule has a blocking `if (loading) return spinner` and its fetch has no hard timeout.
  - Several other modules have identical blocking loading gates.

2) Realtime subscriptions trigger “hard reload feeling”
- Some modules call fetchData() on every realtime event without debouncing.
- They also setLoading(true) during these realtime refetches, which blanks the UI repeatedly and feels like “reloading”.

3) N+1 query patterns (especially Marketplace/Community)
- MarketplaceOrdersModule fetches orders, then for each order makes extra requests (items + cylinder profile). On slow networks, this can take long and increases chance of one request stalling.
- CommunityModule does similar multi-step fetching.
- More requests = higher chance of “one stuck request” = whole screen stuck.

Principle of the fix (permanent, system-wide)
- Never let any module be “100% blocked” on a network request.
- Every module must follow a “Resilient Loading Standard”:
  1) Hard timeouts around every backend call (Promise.race).
  2) Two loading modes:
     - Initial Loading (no cached data yet): show skeleton for a limited time; on timeout show inline error + Retry.
     - Soft Refresh (data already shown): keep showing existing data; show a small top progress bar/badge only.
  3) Debounce realtime-driven refetches (and do soft refresh only).
  4) After user actions (mutations), immediately refetch/refresh locally (don’t rely on realtime latency).
  5) Optimize heavy queries to reduce number of network round-trips.

Scope (files/modules we will touch)
A) Shared utilities (new)
- src/lib/asyncUtils.ts (or similar)
  - withTimeout<T>(promise, ms, label)
  - withSoftTimeout<T>(promise, ms, fallbackValue, label)
  - debounce(fn, ms)
  - nowMs helpers for logging durations
  - optional: safeAllSettled() to allow partial data when some calls fail/time out

B) Auth bootstrap resilience (critical)
- src/pages/Auth.tsx
  - Replace supabase.auth.getSession() with getSessionWithTimeout() (already exists in authUtils.ts)
  - Wrap RPC calls validate_invite / owners_exist with withTimeout
  - Ensure the UI never stays in “checkingSystem” indefinitely:
    - If timeout happens: setCheckingSystem(false) and show login/signup UI + inline warning banner (“Network is slow. You can still try signing in.”)
    - Keep the Retry button, but do not block the form forever.

C) High-impact modules with known blocking spinners
- src/components/dashboard/modules/ProductPricingModule.tsx (user is currently stuck here)
- src/components/dashboard/modules/MarketplaceOrdersModule.tsx
- src/components/dashboard/modules/CommunityModule.tsx
- src/components/dashboard/modules/InventoryPricingCard.tsx
- src/components/dashboard/modules/ProfileModule.tsx
- src/components/dashboard/modules/ExchangeModule.tsx
- src/components/dashboard/modules/VehicleCostModule.tsx
- src/components/dashboard/modules/shop-profile/* (ShopSettingsTab, ShopProductsTab, ShopOrdersTab, ShopAnalyticsTab, ShopInfoTab)
- src/components/dashboard/modules/CustomerManagementModule.tsx
(We’ll prioritize by “most likely to block” and the ones that currently return early when loading.)

Implementation plan (step-by-step)

Phase 1 — Add a Resilient Fetch + Loading Standard (foundation)
1) Create shared helper utilities:
   - withTimeout:
     - Promise.race(originalPromise, timeoutPromise)
     - On timeout: throw a TimeoutError containing label + ms
   - debouncedRefetch helper (similar to useDashboardData’s 1s debounce)
   - Optional: “softTimeout” variant returning fallback values (useful for dashboards/quick stats)

2) Add a small, reusable UI component for module-level errors:
   - “ModuleLoadErrorCard”
     - Message: “Network is slow or request failed”
     - Buttons: Retry, and (optional) “Go Back”
     - Keep consistent professional style and mobile touch targets (h-12 buttons)

Phase 2 — Fix Product Pricing module (the user’s current stuck screen)
3) Refactor ProductPricingModule data loading:
   - Replace current “single loading boolean” with:
     - initialLoading (only true when products are empty and first load)
     - softLoading (true during background refresh)
     - loadError (string | null)
   - Wrap its fetchData Promise.all in withTimeout (10s–12s).
   - Important behavior change:
     - If products already exist, do NOT blank the UI during refresh.
     - Show a thin progress bar at top (like dashboard softLoading bar) or a small “Refreshing…” badge.
   - If timeout/error:
     - Keep last known products on screen
     - Show an inline error banner + Retry

4) Debounce realtime refetches in ProductPricingModule:
   - Instead of calling fetchData() immediately on every postgres_changes event, call debouncedFetchData(800–1200ms)
   - Use soft refresh mode for realtime (no full spinner)

5) Mutation reliability:
   - After saving prices or adding/deleting a product:
     - Trigger immediate soft refetch (do not rely on realtime)
     - Use optimistic UI if safe (optional), but at least do direct refetch after mutation.

Phase 3 — Fix the other “spinner trap” modules
6) Apply the same Resilient Loading Standard to each module that can block:
   - Convert “if (loading) return spinner” into:
     - Skeleton while initialLoading (limited)
     - Inline error card if initial load fails/times out
     - Never full blank screen once data exists (soft refresh)
   - Wrap their backend calls withTimeout:
     - auth.getUser(), rpc(get_owner_id), table selects, etc.

7) Specific optimizations to prevent slow/hanging behavior:
   - MarketplaceOrdersModule:
     - Remove N+1 pattern:
       - Fetch orders + order_items in one query if schema supports:
         community_orders select with embedded community_order_items
       - Fetch cylinder photos in one batch query using `.in('user_id', customerIds)`
     - Add pagination/limit (e.g., last 200 orders) and a “Load more” (optional) to keep mobile fast.
     - Debounce realtime updates and use soft refresh.
   - CommunityModule:
     - Batch fetch items/comments instead of multiple per record where possible.
     - Debounced realtime and soft refresh.
   - InventoryPricingCard:
     - Add withTimeout around product_prices query
     - Don’t block indefinitely; show a card-level skeleton then error card.

Phase 4 — Dashboard-wide “last resort” guard (prevents any permanent stuck state)
8) Add a module-level watchdog boundary:
   - In Dashboard render pipeline, wrap module content in a “ModuleWatchdog”
     - If module stays in “initial loading” beyond X seconds (e.g., 12s), show a fallback overlay:
       - “This module is taking too long to load.”
       - Buttons: Retry module fetch (dispatch an event), Go to Dashboard overview
   - This ensures: even if any module misses the new standard, users can still recover without hard refresh loops.

Phase 5 — Verification + regression testing
9) Test these scenarios (desktop + mobile viewport):
   - Refresh on /dashboard?module=product-pricing (the current problem)
   - Switch modules quickly (overview → inventory → pricing → marketplace orders)
   - Slow network simulation (at least manual: mobile data / hotspot)
   - Offline → online transition:
     - App should not get stuck; must show offline notice and recover automatically
   - Realtime update:
     - Change a price in another tab/device; ProductPricing should update without blanking the UI.

10) Add lightweight diagnostics logs (temporary, can later remove):
   - Log when a timeout happens including:
     - module name
     - label of query
     - time waited
   - This allows us to pinpoint remaining bottlenecks quickly if anything persists.

Why this will permanently fix the issue
- The “stuck” state requires a module to remain blocked on a promise + keep rendering a spinner. The plan removes that possibility by:
  1) Adding hard timeouts to all critical fetches.
  2) Removing UI designs that blank the entire module on background refresh.
  3) Debouncing realtime-driven refetch storms.
  4) Reducing number of requests (batch queries) to lower probability of a single stalled call.
  5) Adding a dashboard-level watchdog as a final safety net.

Deliverables you’ll see after implementation
- Product Pricing (and other modules) will:
  - Load quickly with skeletons
  - Never show a forever spinner
  - If internet is slow: show data (if available) + “Retry” controls
  - Feel stable (no repeated blank reload flicker)

Notes for mobile UI/UX (explicit standards)
- Minimum 44–48px touch targets for all important actions (Retry, Save, Add, etc.)
- Avoid full-screen spinners inside dashboard modules; use skeleton + inline banners
- Respect safe-area insets for bottom drawers / sticky bars
- Prefer progressive rendering (show partial lists quickly, then enrich)

Open questions (only if needed during implementation)
- If you confirm that “stuck loading” happens mainly on Product Pricing + Marketplace Orders, we’ll prioritize those first; otherwise we apply the standard to all “loading gate” modules listed above.

