/**
 * Optimized Dashboard Queries
 * 
 * Module-specific data fetching with:
 * - Only fetches data when module is active
 * - Uses React Query for caching
 * - Tiered real-time debounce
 * - Server-side aggregations via RPC
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useRef, useCallback } from 'react';

// Debounce tiers for different data criticality
const DEBOUNCE_TIERS = {
  critical: 500,   // POS, active orders
  normal: 2000,    // Inventory, customers
  low: 5000,       // Analytics, reports
} as const;

// Query keys for cache management
export const dashboardKeys = {
  all: ['dashboard'] as const,
  overview: () => [...dashboardKeys.all, 'overview'] as const,
  inventory: () => [...dashboardKeys.all, 'inventory'] as const,
  customers: () => [...dashboardKeys.all, 'customers'] as const,
  transactions: () => [...dashboardKeys.all, 'transactions'] as const,
  orders: () => [...dashboardKeys.all, 'orders'] as const,
};

// Fetch overview stats using existing RPC functions
async function fetchOverviewStats() {
  const [salesResult, expensesResult, inventoryResult, ordersResult] = await Promise.all([
    supabase.rpc('get_today_sales_total'),
    supabase.rpc('get_today_expenses_total'),
    supabase.rpc('get_inventory_totals'),
    supabase.rpc('get_active_orders_count'),
  ]);

  return {
    todayRevenue: Number(salesResult.data) || 0,
    todayExpenses: Number(expensesResult.data) || 0,
    inventory: inventoryResult.data?.[0] || {
      total_full: 0,
      total_empty: 0,
      total_package: 0,
      total_refill: 0,
      total_problem: 0,
    },
    orders: ordersResult.data?.[0] || {
      pending_count: 0,
      dispatched_count: 0,
      total_active: 0,
    },
  };
}

// Hook for overview data (lightweight, fast)
export function useOverviewStats(enabled = true) {
  return useQuery({
    queryKey: dashboardKeys.overview(),
    queryFn: fetchOverviewStats,
    enabled,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 1000, // Refresh every minute
  });
}

// Fetch inventory brands
async function fetchInventoryData() {
  const { data: lpgBrands, error } = await supabase
    .from('lpg_brands')
    .select('id, name, size, weight, package_cylinder, refill_cylinder, empty_cylinder, problem_cylinder, color, updated_at')
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return lpgBrands || [];
}

// Hook for inventory data
export function useInventoryData(enabled = true) {
  return useQuery({
    queryKey: dashboardKeys.inventory(),
    queryFn: fetchInventoryData,
    enabled,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Fetch recent transactions (last 7 days, limited)
async function fetchRecentTransactions() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  
  const { data, error } = await supabase
    .from('pos_transactions')
    .select(`
      id,
      created_at,
      total,
      payment_method,
      payment_status,
      is_online_order,
      pos_transaction_items (
        product_name,
        quantity,
        unit_price,
        total_price
      )
    `)
    .gte('created_at', sevenDaysAgo)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return data || [];
}

// Hook for transactions
export function useRecentTransactions(enabled = true) {
  return useQuery({
    queryKey: dashboardKeys.transactions(),
    queryFn: fetchRecentTransactions,
    enabled,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

// Fetch customers with dues
async function fetchCustomersWithDues() {
  const { data, error } = await supabase
    .from('customers')
    .select('id, name, phone, address, total_due, cylinders_due, last_order_date')
    .order('total_due', { ascending: false })
    .limit(100);

  if (error) throw error;
  return data || [];
}

// Hook for customers
export function useCustomersWithDues(enabled = true) {
  return useQuery({
    queryKey: dashboardKeys.customers(),
    queryFn: fetchCustomersWithDues,
    enabled,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

// Consolidated real-time subscription hook
export function useDashboardRealtime(activeModule: string) {
  const queryClient = useQueryClient();
  const debounceRefs = useRef<Record<string, NodeJS.Timeout | null>>({});

  // Debounced invalidation based on data type
  const invalidateWithDebounce = useCallback((
    queryKey: readonly string[],
    tier: keyof typeof DEBOUNCE_TIERS
  ) => {
    const key = queryKey.join('-');
    
    if (debounceRefs.current[key]) {
      clearTimeout(debounceRefs.current[key]!);
    }

    debounceRefs.current[key] = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey });
      debounceRefs.current[key] = null;
    }, DEBOUNCE_TIERS[tier]);
  }, [queryClient]);

  useEffect(() => {
    // Single consolidated channel for all dashboard updates
    const channel = supabase
      .channel('dashboard-optimized')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'pos_transactions' },
        () => {
          invalidateWithDebounce(dashboardKeys.overview(), 'critical');
          invalidateWithDebounce(dashboardKeys.transactions(), 'critical');
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'lpg_brands' },
        () => {
          invalidateWithDebounce(dashboardKeys.inventory(), 'normal');
          invalidateWithDebounce(dashboardKeys.overview(), 'normal');
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'customers' },
        () => {
          invalidateWithDebounce(dashboardKeys.customers(), 'normal');
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'community_orders' },
        () => {
          invalidateWithDebounce(dashboardKeys.overview(), 'critical');
          invalidateWithDebounce(dashboardKeys.orders(), 'critical');
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'daily_expenses' },
        () => {
          invalidateWithDebounce(dashboardKeys.overview(), 'normal');
        }
      )
      .subscribe();

    return () => {
      // Cleanup all debounce timers
      Object.values(debounceRefs.current).forEach(timer => {
        if (timer) clearTimeout(timer);
      });
      supabase.removeChannel(channel);
    };
  }, [invalidateWithDebounce]);
}

// Prefetch commonly accessed modules
export function usePrefetchDashboardData() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Prefetch inventory and customers in background after initial load
    const prefetchTimer = setTimeout(() => {
      queryClient.prefetchQuery({
        queryKey: dashboardKeys.inventory(),
        queryFn: fetchInventoryData,
        staleTime: 60 * 1000,
      });
      
      queryClient.prefetchQuery({
        queryKey: dashboardKeys.customers(),
        queryFn: fetchCustomersWithDues,
        staleTime: 60 * 1000,
      });
    }, 2000); // Delay 2s after initial render

    return () => clearTimeout(prefetchTimer);
  }, [queryClient]);
}
