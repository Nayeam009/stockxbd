
# Plan: Remove "Airlift Pro" Optimization Code

## Overview

This plan removes all the optimization-related code that was added during the "Airlift Pro" performance optimization phase, while preserving your frontend, modules, admin panel, and all other features.

## What Will Be Removed

Based on my analysis, here are the optimization components that need to be removed:

### 1. Optimization Hook Files (Complete Deletion)
These files were created specifically for the optimization and are not used elsewhere:

- `src/hooks/queries/useOptimizedQueries.ts` - RPC-based KPI queries with aggressive caching
- `src/hooks/useDashboardOfflineKPIs.ts` - Dashboard offline KPI caching  
- `src/hooks/useDataHydration.ts` - IndexedDB data hydration system
- `src/hooks/usePOSOfflineData.ts` - POS offline-first data hook
- `src/hooks/useInventoryOfflineData.ts` - Inventory offline-first data hook
- `src/hooks/useDashboardOfflineData.ts` - Dashboard offline data hook
- `src/hooks/useOfflineAwareQuery.ts` - Offline-aware query wrapper
- `src/lib/offlineDB.ts` - IndexedDB wrapper for offline storage
- `src/lib/syncManager.ts` - Offline sync manager

### 2. Vite Build Optimization (Revert to Simple Config)
- Remove manual chunking configuration
- Remove Brotli/Gzip compression plugins
- Simplify back to standard Vite config

### 3. Dashboard Data Hook (Simplify)
- Remove the complex cache-first strategy from `useDashboardData.ts`
- Remove session storage snapshotting
- Remove retry wrapper with exponential backoff
- Keep simple, direct Supabase queries

### 4. Query Index Updates
- Simplify `src/hooks/queries/index.ts` to remove optimization exports
- Keep only the basic business diary queries

## What Will Stay

- All frontend components and UI
- Admin panel and its functionality
- All dashboard modules (POS, Inventory, Settings, etc.)
- Business diary queries (these are useful, not just optimization)
- Community/marketplace features
- Authentication system
- All existing database tables and RLS policies
- Theme and language contexts

## Files to Delete

```
src/hooks/queries/useOptimizedQueries.ts
src/hooks/useDashboardOfflineKPIs.ts
src/hooks/useDataHydration.ts
src/hooks/usePOSOfflineData.ts
src/hooks/useInventoryOfflineData.ts
src/hooks/useDashboardOfflineData.ts
src/hooks/useOfflineAwareQuery.ts
src/lib/offlineDB.ts
src/lib/syncManager.ts
```

## Files to Modify

### 1. `vite.config.ts`
Revert to simple configuration without compression plugins or manual chunking.

### 2. `src/hooks/useDashboardData.ts`
Remove:
- Session storage snapshotting (lines ~155-190)
- Cache-first useEffect (lines ~224-242)
- Retry wrapper logic
- Extended timeouts

Keep:
- Basic data types and interfaces
- Simple Supabase queries
- Real-time subscriptions

### 3. `src/hooks/queries/index.ts`
Remove all optimization exports, keep only business diary queries.

### 4. `src/App.tsx`
Remove optimized QueryClient configuration, use simple defaults.

## Technical Details

### Simplified QueryClient
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});
```

### Simplified Vite Config
```typescript
export default defineConfig({
  server: { host: "::", port: 8080 },
  plugins: [react(), componentTagger()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

## Steps

1. Delete all 9 optimization hook/utility files
2. Revert `vite.config.ts` to basic configuration
3. Simplify `useDashboardData.ts` - remove caching, retry, and timeout logic
4. Update `src/hooks/queries/index.ts` to remove optimization exports
5. Simplify `App.tsx` QueryClient configuration

## Result

After these changes:
- Dashboard will load with simple, direct database queries
- No IndexedDB offline storage
- No aggressive caching strategies
- No complex retry/timeout logic
- All your existing features remain intact
- Simpler, more predictable data fetching

## Note

The business diary queries in `useBusinessDiaryQueries.ts` are functional code (not just optimization) and will be kept, but the real-time debouncing can be simplified if needed.
