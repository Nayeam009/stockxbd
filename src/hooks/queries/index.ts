/**
 * Query Hooks - Central Export
 * 
 * Import from here for all data fetching needs:
 * import { useBusinessSales, useSharedLPGBrands } from '@/hooks/queries';
 */

// Business Diary queries
export {
  useBusinessSales,
  useBusinessExpenses,
  useBusinessDiaryRealtime,
  useCustomerDebtSummary,
  type SaleEntry,
  type ExpenseEntry,
  type CustomerDebtSummary,
} from './useBusinessDiaryQueries';

// Shared queries (unified cache system)
export {
  sharedKeys,
  useSharedLPGBrands,
  useSharedStoves,
  useSharedRegulators,
  useSharedCustomers,
  useSharedProductPrices,
  useSharedOverviewStats,
  useUnifiedRealtime,
  usePrefetchSharedData,
  useLPGPriceHelper,
  type SharedLPGBrand,
  type SharedStove,
  type SharedRegulator,
  type SharedCustomer,
  type SharedProductPrice,
  type OverviewStats,
} from '../useSharedQueries';

// Legacy dashboard queries (for backward compatibility)
export {
  useOverviewStats,
  useInventoryData,
  useRecentTransactions,
  useCustomersWithDues,
  useDashboardRealtime,
  usePrefetchDashboardData,
  dashboardKeys,
} from '../useDashboardQueries';
