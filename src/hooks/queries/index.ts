/**
 * Query Hooks - Central Export
 * 
 * Import from here for all data fetching needs:
 * import { useBusinessSales, useBusinessExpenses } from '@/hooks/queries';
 */

// Business Diary queries
export {
  useBusinessSales,
  useBusinessExpenses,
  useBusinessDiaryRealtime,
  type SaleEntry,
  type ExpenseEntry,
} from './useBusinessDiaryQueries';
