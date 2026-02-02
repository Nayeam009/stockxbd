
# Plan: Dashboard Performance Optimization & Unified App Experience

## Current Issues Identified

### Loading Time Problems
1. **Duplicate Real-Time Channels**: The dashboard has TWO separate real-time subscriptions running:
   - `useDashboardData.ts` creates `dashboard-realtime` channel
   - `useDashboardQueries.ts` creates `dashboard-optimized` channel
   - This doubles network overhead and causes redundant data fetches

2. **Duplicate Data Fetching**: Multiple hooks fetch the same data independently:
   - `useDashboardData` fetches lpg_brands, stoves, customers, orders
   - `usePOSData` fetches lpg_brands, stoves, regulators, customers
   - `useInventoryData` fetches lpg_brands, stoves, regulators
   - Each module creates its own queries instead of sharing

3. **Heavy Initial Load**: `useDashboardData` fetches 7 queries on mount, blocking the UI

4. **Missing Module Preloading**: Modules aren't preloaded aggressively enough

### Disconnected Module Experience
1. **No Shared State Context**: Each module fetches its own data, doesn't share with siblings
2. **No Cross-Module Navigation Events**: Modules don't communicate with each other
3. **No Unified Query Cache**: Each hook creates isolated query keys

## Solution Architecture

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    UNIFIED DATA LAYER                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────┐    ┌─────────────────────┐                 │
│  │  Shared Query Keys  │───▶│  React Query Cache  │                 │
│  └─────────────────────┘    └─────────────────────┘                 │
│           │                          ▲                               │
│           ▼                          │                               │
│  ┌─────────────────────────────────────────────────┐                │
│  │        SINGLE Real-time Channel                  │                │
│  │        (Consolidated Subscriptions)              │                │
│  └─────────────────────────────────────────────────┘                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                              │
       ┌──────────────────────┼──────────────────────┐
       │                      │                      │
       ▼                      ▼                      ▼
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│  POS Module │       │  Inventory  │       │  Business   │
│  (shares)   │       │  (shares)   │       │   Diary     │
└─────────────┘       └─────────────┘       └─────────────┘
```

## Implementation Steps

### Step 1: Create Unified Query System
**File**: `src/hooks/useSharedQueries.ts` (NEW)

Create a centralized query system with shared query keys and fetch functions:

- **Unified Query Keys**: Single source of truth for all cache keys
  - `['shared', 'lpg-brands']`
  - `['shared', 'stoves']`
  - `['shared', 'regulators']`
  - `['shared', 'customers']`
  - `['shared', 'prices']`

- **Aggressive Stale Times**: 
  - LPG/Stoves/Regulators: 2 minutes
  - Customers: 3 minutes
  - Prices: 5 minutes

- **Single Real-time Channel**: Consolidate all subscriptions into one channel

### Step 2: Optimize Dashboard.tsx
**File**: `src/pages/Dashboard.tsx`

1. **Remove Duplicate Real-time**: Delete `useDashboardRealtime` call (it's redundant)
2. **Use Single Data Source**: Replace `useDashboardData` with lightweight overview stats
3. **Preload Adjacent Modules**: Use `React.preload()` for likely-next modules
4. **Reduce Initial Render Blocking**: Start with cached data, update in background

### Step 3: Update Module Hooks to Share Cache
**Files**: 
- `src/hooks/usePOSData.ts`
- `src/hooks/useInventoryData.ts`

Modify these hooks to use the shared query keys so they read from the same cache:

```typescript
// BEFORE (isolated)
queryKey: ['pos-lpg-brands']

// AFTER (shared)
queryKey: sharedKeys.lpgBrands()
```

This means when Inventory fetches lpg_brands, POS gets it for free from cache.

### Step 4: Implement Module Preloading
**File**: `src/pages/Dashboard.tsx`

Add intelligent preloading based on navigation patterns:

```typescript
// When user is on Overview, preload POS and Inventory components
useEffect(() => {
  if (activeModule === 'overview') {
    import('@/components/dashboard/modules/POSModule');
    import('@/components/dashboard/modules/InventoryModule');
  }
}, [activeModule]);
```

### Step 5: Remove useDashboardData Heavy Fetch
**File**: `src/hooks/useDashboardData.ts`

The current hook fetches 7 queries in parallel and transforms ALL the data. Instead:

1. **Overview Stats Only**: Use existing RPC functions (`get_today_sales_total`, etc.)
2. **Lazy Module Data**: Let each module fetch its own data when activated
3. **Remove Duplicate Realtime**: Only keep ONE channel in `useSharedQueries.ts`

### Step 6: Add Cross-Module Events
**File**: `src/lib/moduleEvents.ts` (NEW)

Create a simple pub/sub for module communication:

```typescript
// Dispatch from POS after a sale
dispatchModuleEvent('sale-completed', { total: 5000 });

// Listen in Business Diary
useModuleEvent('sale-completed', (data) => {
  // Invalidate diary queries
});
```

### Step 7: Optimize QuickLoader
**File**: `src/components/dashboard/ModuleSkeleton.tsx`

Make the QuickLoader even faster for cached modules:

```typescript
export const QuickLoader = () => (
  <div className="min-h-[100px] flex items-center justify-center">
    <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
  </div>
);
```

## Files to Create

| File | Purpose |
|------|---------|
| `src/hooks/useSharedQueries.ts` | Unified query system with shared cache |
| `src/lib/moduleEvents.ts` | Cross-module event bus |

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Dashboard.tsx` | Remove duplicate realtime, add preloading, simplify data loading |
| `src/hooks/useDashboardData.ts` | Replace heavy fetch with lightweight overview stats |
| `src/hooks/useDashboardQueries.ts` | Consolidate as the single source of realtime |
| `src/hooks/usePOSData.ts` | Use shared query keys |
| `src/hooks/useInventoryData.ts` | Use shared query keys |
| `src/components/dashboard/ModuleSkeleton.tsx` | Optimize QuickLoader |
| `src/components/dashboard/modules/DashboardOverview.tsx` | Use shared overview hook |

## Expected Performance Improvements

| Metric | Before | After |
|--------|--------|-------|
| Module Switch Time | 500-800ms | 50-150ms |
| Initial Dashboard Load | 2-3s | 800ms-1.2s |
| Real-time Channels | 2 | 1 |
| Duplicate Queries | Many | 0 |
| Cache Hit Rate | Low | High |

## Technical Details

### Shared Query Keys Structure
```typescript
export const sharedKeys = {
  all: ['shared'] as const,
  lpgBrands: () => [...sharedKeys.all, 'lpg-brands'] as const,
  stoves: () => [...sharedKeys.all, 'stoves'] as const,
  regulators: () => [...sharedKeys.all, 'regulators'] as const,
  customers: () => [...sharedKeys.all, 'customers'] as const,
  prices: () => [...sharedKeys.all, 'prices'] as const,
  overview: () => [...sharedKeys.all, 'overview'] as const,
};
```

### Consolidated Real-time Channel
```typescript
const channel = supabase
  .channel('stock-x-unified')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'lpg_brands' }, handler)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'stoves' }, handler)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'regulators' }, handler)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'pos_transactions' }, handler)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, handler)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'community_orders' }, handler)
  .subscribe();
```

### Module Event System
```typescript
// Emit event when sale completes in POS
window.dispatchEvent(new CustomEvent('stockx:sale-completed', { 
  detail: { total, transactionId } 
}));

// Listen in Business Diary
useEffect(() => {
  const handler = (e: CustomEvent) => {
    queryClient.invalidateQueries({ queryKey: ['sales'] });
  };
  window.addEventListener('stockx:sale-completed', handler);
  return () => window.removeEventListener('stockx:sale-completed', handler);
}, []);
```

## Rollout Strategy

1. **Phase 1**: Create `useSharedQueries.ts` and `moduleEvents.ts`
2. **Phase 2**: Update Dashboard.tsx to use new unified system
3. **Phase 3**: Migrate POS and Inventory hooks to shared queries
4. **Phase 4**: Remove deprecated `useDashboardData` heavy fetch
5. **Phase 5**: Add cross-module events for real-time sync

This approach ensures Stock-X feels like a single, responsive application where all modules share data instantly and navigation between them is butter-smooth.
