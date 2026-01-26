/**
 * Optimized Query Hooks - Central Export
 * 
 * Import from here for all data fetching needs:
 * import { useLpgBrands, useDashboardKPIs, useBusinessSales } from '@/hooks/queries';
 */

export {
  // Static data queries (long cache)
  useLpgBrands,
  useStoves,
  useRegulators,
  useProductPrices,
  useCustomers,
  
  // Dynamic KPI queries (short cache, via RPC)
  useTodaySalesTotal,
  useTodayExpensesTotal,
  useInventoryTotals,
  useMonthlyRevenueStats,
  useCustomerStats,
  useActiveOrdersCount,
  
  // Combined dashboard hook
  useDashboardKPIs,
  
  // Mutations with optimistic updates
  useCompleteSaleMutation,
  useAddCustomerMutation,
  
  // Utilities
  useInvalidateDashboard,
} from './useOptimizedQueries';

// Business Diary optimized queries
export {
  useBusinessSales,
  useBusinessExpenses,
  useBusinessDiaryRealtime,
  type SaleEntry,
  type ExpenseEntry,
} from './useBusinessDiaryQueries';

// Offline-first hooks
export { usePOSOfflineData } from '../usePOSOfflineData';
export { useInventoryOfflineData } from '../useInventoryOfflineData';
export { useDashboardOfflineData } from '../useDashboardOfflineData';
export { useDashboardOfflineKPIs } from '../useDashboardOfflineKPIs';
export { useOfflineAwareQuery, useOfflineValue } from '../useOfflineAwareQuery';
export { useDataHydration } from '../useDataHydration';
