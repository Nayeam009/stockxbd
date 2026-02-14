

# Shop Owner Dashboard - Issues and Improvements Found

## Issues Identified

### 1. BUG: "Active Orders" Card Navigation Broken
- **Location**: `src/components/dashboard/modules/DashboardOverview.tsx` line 136
- **Problem**: The "Active Orders" KPI card navigates to `setActiveModule('orders')` but the Dashboard's switch-case only handles `'marketplace-orders'`, not `'orders'`. Clicking this card shows the default overview instead of the marketplace orders module.
- **Fix**: Change `'orders'` to `'marketplace-orders'`

### 2. BUG: Dashboard Shows "2 dispatched" but Orders are Actually "confirmed"
- **Location**: `src/hooks/useSharedQueries.ts` line 179 (`get_active_orders_count` RPC)
- **Problem**: The dashboard overview displays "0 pending, 2 dispatched" but the actual data shows 2 orders with status `confirmed`. The RPC function `get_active_orders_count` is likely grouping `confirmed` orders as `dispatched`.
- **Fix**: Audit and fix the `get_active_orders_count` RPC to correctly distinguish between `pending`, `confirmed`, and `dispatched` statuses. Update the dashboard display to show all three categories.

### 3. BUG: 2 Stale Confirmed Orders from Feb 2
- **Problem**: Orders `LPG-20260202-940198` and `LPG-20260202-6ec809` have been in "confirmed" status for 12 days without being dispatched or resolved. These inflate the "Active Orders" count.
- **Improvement**: Add a visual indicator (warning badge) for orders older than 24 hours that haven't progressed. This helps shop owners notice stuck orders.

### 4. IMPROVEMENT: Business Diary Date Timezone Safety
- **Location**: `src/hooks/queries/useBusinessDiaryQueries.ts` lines 182-183
- **Problem**: The date filtering uses `format(new Date(date), "yyyy-MM-dd'T'00:00:00")` without timezone offset. For Bangladesh (UTC+6), a sale made at 11:30 PM local time on Feb 14 is stored as Feb 15 05:30 AM UTC, which would be missed by the "Today" filter.
- **Fix**: Use timezone-aware boundaries by appending the UTC offset or using ISO date with proper start/end of day in local time.

### 5. IMPROVEMENT: Package Prices Not Set for Some Brands
- **Observation**: INDEX brand shows Package prices as 0/0/0. While this is a data entry issue, the UI could show a warning badge when prices are missing to remind the owner.

## Implementation Steps

### Step 1: Fix Active Orders Navigation
In `DashboardOverview.tsx`, change line 136:
```
onClick: () => setActiveModule?.('orders')
```
to:
```
onClick: () => setActiveModule?.('marketplace-orders')
```

### Step 2: Fix Order Status Counting
Check the `get_active_orders_count` database function and update it to correctly categorize:
- `pending` -> pending_count
- `confirmed` -> confirmed_count (new field)
- `dispatched` -> dispatched_count

Update the OverviewStats interface and dashboard display to show confirmed orders separately.

### Step 3: Update Dashboard Display
Update the Active Orders subtitle to show all three states:
```
"X pending, Y confirmed, Z dispatched"
```

### Step 4: Timezone-Safe Date Filtering (Business Diary)
Update the sales and expenses fetch functions to use proper timezone-aware date boundaries to prevent edge-case misses for late-night transactions.

### Technical Details

**Files to modify:**
- `src/components/dashboard/modules/DashboardOverview.tsx` - Fix navigation target
- `src/hooks/useSharedQueries.ts` - Update OverviewStats interface
- Database migration - Fix `get_active_orders_count` RPC function
- `src/hooks/queries/useBusinessDiaryQueries.ts` - Timezone-safe date filtering

