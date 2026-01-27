# Plan: Remove "Airlift Pro" Optimization Code

## Status: ✅ FULLY COMPLETED

## Summary of All Changes Made

### Files Deleted (11 files):
- ✅ `src/hooks/queries/useOptimizedQueries.ts`
- ✅ `src/hooks/useDashboardOfflineKPIs.ts`
- ✅ `src/hooks/useDataHydration.ts`
- ✅ `src/hooks/usePOSOfflineData.ts`
- ✅ `src/hooks/useInventoryOfflineData.ts`
- ✅ `src/hooks/useDashboardOfflineData.ts`
- ✅ `src/hooks/useOfflineAwareQuery.ts`
- ✅ `src/hooks/useOfflineData.ts`
- ✅ `src/hooks/useModuleCache.ts`
- ✅ `src/lib/offlineDB.ts`
- ✅ `src/lib/syncManager.ts`

### Files Modified (15 files):
- ✅ `vite.config.ts` - Removed manual chunking and compression plugins
- ✅ `src/App.tsx` - Simplified QueryClient configuration
- ✅ `src/hooks/queries/index.ts` - Removed optimization exports
- ✅ `src/hooks/useDashboardData.ts` - Removed caching, retry logic, and timeout wrappers
- ✅ `src/contexts/NetworkContext.tsx` - Simplified to basic online/offline detection
- ✅ `src/components/dashboard/modules/DashboardOverview.tsx` - Removed offline KPI hook dependency
- ✅ `src/components/dashboard/modules/POSModule.tsx` - Removed cache-first strategy
- ✅ `src/components/dashboard/modules/InventoryModule.tsx` - Removed cache-first strategy
- ✅ `src/hooks/useBusinessDiaryData.ts` - Removed cache strategy
- ✅ `src/pages/Community.tsx` - Removed shops cache snapshot
- ✅ `src/pages/CustomerProfile.tsx` - Removed profile cache snapshot
- ✅ `src/components/auth/ProtectedRoute.tsx` - Simplified auth, removed retry args
- ✅ `src/hooks/useUserRole.ts` - Simplified auth calls
- ✅ `src/lib/authUtils.ts` - Simplified to basic timeout, removed retry/cache logic
- ✅ `src/components/shared/OfflineIndicator.tsx` - Removed offlineDB reference

### Dependencies Removed:
- ✅ `vite-plugin-compression`

## Result
- Dashboard and all modules now load with simple, direct Supabase queries
- No IndexedDB offline storage
- No sessionStorage snapshotting
- No aggressive caching strategies
- No complex retry/timeout logic (only simple 10s timeout for auth)
- All existing features remain intact
- Simpler, more predictable data fetching
