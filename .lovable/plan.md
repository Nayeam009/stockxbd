# Plan: Remove "Airlift Pro" Optimization Code

## Status: ✅ COMPLETED

## Summary of Changes Made

### Files Deleted (9 files):
- ✅ `src/hooks/queries/useOptimizedQueries.ts`
- ✅ `src/hooks/useDashboardOfflineKPIs.ts`
- ✅ `src/hooks/useDataHydration.ts`
- ✅ `src/hooks/usePOSOfflineData.ts`
- ✅ `src/hooks/useInventoryOfflineData.ts`
- ✅ `src/hooks/useDashboardOfflineData.ts`
- ✅ `src/hooks/useOfflineAwareQuery.ts`
- ✅ `src/hooks/useOfflineData.ts`
- ✅ `src/lib/offlineDB.ts`
- ✅ `src/lib/syncManager.ts`

### Files Modified:
- ✅ `vite.config.ts` - Removed manual chunking and compression plugins
- ✅ `src/App.tsx` - Simplified QueryClient configuration
- ✅ `src/hooks/queries/index.ts` - Removed optimization exports
- ✅ `src/hooks/useDashboardData.ts` - Removed caching, retry logic, and timeout wrappers
- ✅ `src/contexts/NetworkContext.tsx` - Simplified to basic online/offline detection
- ✅ `src/components/dashboard/modules/DashboardOverview.tsx` - Removed offline KPI hook dependency

### Dependencies Removed:
- ✅ `vite-plugin-compression`

## Result
- Dashboard loads with simple, direct database queries
- No IndexedDB offline storage
- No aggressive caching strategies
- No complex retry/timeout logic
- All existing features remain intact
- Simpler, more predictable data fetching
