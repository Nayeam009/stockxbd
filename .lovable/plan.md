
# Performance Optimization Plan for Stock-X

## ✅ COMPLETED OPTIMIZATIONS

### Phase 1: Critical Path Optimization
- [x] **1.1 Lazy Load Dashboard** - Auth & Dashboard now lazy-loaded in App.tsx
- [x] **1.2 Module-Specific Fetching** - Reduced fetch limits (500→100), added date filters (7 days)
- [x] **1.3 Query Caching** - Increased staleTime (30s→60s), gcTime (5min→10min)

### Phase 2: Network Optimization
- [x] **2.1 Reduce Fetch Size** - Transactions & orders limited to last 7 days, 100 records max
- [x] **2.2 Consolidated Subscriptions** - Single `dashboard-optimized` channel with tiered debounce
- [x] **2.3 Tiered Debounce** - Critical: 500ms, Normal: 2000ms, Low: 5000ms

### Phase 3: Bundle Size Reduction  
- [x] **3.2 Vite Manual Chunks** - Vendor splitting for React, Supabase, Recharts, UI libs

### Phase 4: Perceived Performance
- [x] **4.2 Prefetching** - Inventory & customers prefetched 2s after initial load
- [x] **4.3 Optimized Caching** - Disabled refetchOnWindowFocus (realtime handles sync)

### Phase 5: Database Optimization
- [x] **5.2 Database Indexes** - 8 indexes added for frequently queried columns

### 2. **Excessive Real-time Subscriptions**
- Dashboard subscribes to 5 tables simultaneously for real-time updates
- Each module creates its own subscription channels
- Subscriptions trigger full refetches instead of incremental updates

### 3. **Large Bundle Size**
- Dashboard imports 14 lazy-loaded modules but `Dashboard.tsx` itself is not lazy-loaded
- Auth and Dashboard pages loaded synchronously in App.tsx
- lucide-react icons imported individually across 89 files (large tree-shaking impact)

### 4. **Inefficient Component Re-renders**
- `useDashboardData` hook recalculates analytics on every render
- No React Query `select` transforms to minimize re-renders
- Real-time debounce at 1s still causes frequent UI updates

### 5. **Network Waterfall**
- Auth verification → Role fetch → Dashboard data fetch (sequential)
- No data prefetching for likely navigation paths

---

## Optimization Plan

### Phase 1: Critical Path Optimization (Highest Impact)

#### 1.1 Lazy Load Dashboard Page
Move Dashboard from synchronous to lazy import in App.tsx to reduce initial bundle:

```typescript
// src/App.tsx
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
```

#### 1.2 Module-Specific Data Fetching
Replace the "fetch everything" approach with module-specific queries:

```typescript
// New pattern: Only fetch data needed for active module
const { data } = useQuery({
  queryKey: ['dashboard-overview'],
  queryFn: fetchOverviewData,
  enabled: activeModule === 'overview', // Only fetch when needed
});
```

#### 1.3 Add Query `select` Transforms
Minimize re-renders by selecting only needed fields:

```typescript
useQuery({
  queryKey: ['transactions'],
  queryFn: fetchTransactions,
  select: (data) => ({
    todayTotal: data.filter(t => isToday(t.created_at)).reduce(...),
    count: data.length
  })
});
```

---

### Phase 2: Network Optimization

#### 2.1 Reduce Initial Fetch Size
Limit initial queries to recent data only:

```typescript
// Instead of limit(500), fetch only what's needed
.gte('created_at', thirtyDaysAgo) // Last 30 days only
.limit(100) // Reduced limit
```

#### 2.2 Consolidate Real-time Subscriptions
Create a single channel for all dashboard updates:

```typescript
const channel = supabase
  .channel('dashboard-all')
  .on('postgres_changes', 
    { event: '*', schema: 'public' }, // Single listener
    handleAnyChange
  )
  .subscribe();
```

#### 2.3 Increase Debounce for Non-Critical Updates
Increase debounce for less time-sensitive data:

```typescript
// Real-time debounce tiers
const DEBOUNCE = {
  critical: 500,   // POS, orders
  normal: 2000,    // Inventory, customers  
  low: 5000        // Analytics, reports
};
```

---

### Phase 3: Bundle Size Reduction

#### 3.1 Optimize Lucide Icon Imports
Create a central icon barrel file to enable better tree-shaking:

```typescript
// src/components/icons/index.ts
export { 
  Loader2, 
  Users, 
  Settings,
  // ... only icons actually used
} from 'lucide-react';
```

#### 3.2 Add Vite Build Optimizations
Configure manual chunks for better caching:

```typescript
// vite.config.ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'vendor': ['react', 'react-dom', 'react-router-dom'],
        'supabase': ['@supabase/supabase-js'],
        'charts': ['recharts'],
        'ui': ['@radix-ui/react-dialog', '@radix-ui/react-select', ...],
      }
    }
  }
}
```

---

### Phase 4: Perceived Performance Improvements

#### 4.1 Add Skeleton Placeholders to Dashboard
Show skeleton UI immediately while data loads:

```typescript
// Dashboard always renders shell immediately
if (loading) {
  return <DashboardSkeleton />;
}
```

#### 4.2 Prefetch Likely Navigation Targets
Prefetch data for modules user is likely to visit:

```typescript
// On dashboard load, prefetch POS and Inventory data in background
queryClient.prefetchQuery({
  queryKey: ['pos-products'],
  queryFn: fetchPOSProducts,
  staleTime: 60000
});
```

#### 4.3 Optimize TanStack Query Caching
Increase stale times for stable data:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,     // 1 minute (was 30s)
      gcTime: 10 * 60 * 1000,   // 10 minutes (was 5)
    }
  }
});
```

---

### Phase 5: Database Query Optimization

#### 5.1 Create Server-Side Aggregation RPC
Add Postgres functions for heavy calculations:

```sql
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_owner_id UUID)
RETURNS JSON AS $$
  SELECT json_build_object(
    'today_revenue', COALESCE(SUM(total), 0),
    'today_transactions', COUNT(*),
    'pending_orders', (SELECT COUNT(*) FROM orders WHERE status = 'pending')
  )
  FROM pos_transactions
  WHERE created_at >= CURRENT_DATE
    AND created_by = p_owner_id;
$$ LANGUAGE SQL STABLE;
```

#### 5.2 Add Database Indexes
Add indexes for frequently queried columns:

```sql
CREATE INDEX IF NOT EXISTS idx_pos_transactions_created_at 
  ON pos_transactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_orders_status 
  ON community_orders(status, shop_id);
```

---

## Implementation Priority

| Phase | Task | Impact | Effort |
|-------|------|--------|--------|
| 1.1 | Lazy load Dashboard | High | Low |
| 1.2 | Module-specific fetching | High | Medium |
| 2.1 | Reduce fetch limits | High | Low |
| 3.2 | Vite manual chunks | Medium | Low |
| 2.2 | Consolidate subscriptions | Medium | Medium |
| 5.1 | Server-side aggregation | High | Medium |
| 3.1 | Icon barrel file | Low | Medium |

---

## Expected Performance Improvements

| Metric | Current (Est.) | After Optimization |
|--------|----------------|-------------------|
| Initial Bundle | ~800KB | ~400KB |
| Time to Interactive | 3-5s | 1-2s |
| Dashboard Load | 2-3s | <1s |
| Memory Usage | High | 40% reduction |
| Network Requests | 7+ parallel | 2-3 targeted |

---

## Technical Details

### Files to Modify:
1. `src/App.tsx` - Lazy load Auth/Dashboard
2. `src/pages/Dashboard.tsx` - Module-specific queries
3. `src/hooks/useDashboardData.ts` - Optimize fetching
4. `vite.config.ts` - Add build optimizations
5. `src/components/dashboard/modules/*.tsx` - Add skeletons
6. Database - Add RPC functions and indexes

### New Files to Create:
1. `src/components/icons/index.ts` - Icon barrel exports
2. `src/hooks/useDashboardQueries.ts` - Optimized query hooks
3. Database migration for RPC functions
