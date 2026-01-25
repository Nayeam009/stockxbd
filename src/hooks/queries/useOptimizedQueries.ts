/**
 * Optimized TanStack Query Hooks
 * 
 * Performance features:
 * - Aggressive staleTime for static data (brands, prices)
 * - Short staleTime for dynamic data (KPIs, inventory)
 * - RPC functions for server-side aggregation
 * - Optimistic updates for instant UI feedback
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// =====================================================
// STATIC DATA QUERIES (1 hour cache)
// =====================================================

/**
 * LPG Brands - Rarely changes, cache for 1 hour
 */
export const useLpgBrands = () => {
  return useQuery({
    queryKey: ['lpg-brands'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lpg_brands')
        .select('id, name, size, weight, color, package_cylinder, refill_cylinder, empty_cylinder, problem_cylinder')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 2, // 2 hours garbage collection
  });
};

/**
 * Stoves list - Rarely changes
 */
export const useStoves = () => {
  return useQuery({
    queryKey: ['stoves'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stoves')
        .select('id, brand, model, burners, quantity, price, is_damaged')
        .eq('is_active', true)
        .order('brand');
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 2,
  });
};

/**
 * Regulators list - Rarely changes
 */
export const useRegulators = () => {
  return useQuery({
    queryKey: ['regulators'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('regulators')
        .select('id, brand, type, quantity')
        .eq('is_active', true)
        .order('brand');
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 2,
  });
};

/**
 * Product Prices - Updated occasionally
 */
export const useProductPrices = () => {
  return useQuery({
    queryKey: ['product-prices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_prices')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60,
  });
};

/**
 * Customers list - Updated occasionally
 */
export const useCustomers = () => {
  return useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, phone, address, total_due, cylinders_due, billing_status')
        .order('name');
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30,
  });
};

// =====================================================
// DYNAMIC KPI QUERIES (via RPC - short cache)
// =====================================================

/**
 * Today's Sales Total - via RPC function
 */
export const useTodaySalesTotal = () => {
  return useQuery({
    queryKey: ['today-sales-total'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_today_sales_total');
      if (error) throw error;
      return Number(data) || 0;
    },
    staleTime: 1000 * 30, // 30 seconds
    refetchOnWindowFocus: true,
  });
};

/**
 * Today's Expenses Total - via RPC function
 */
export const useTodayExpensesTotal = () => {
  return useQuery({
    queryKey: ['today-expenses-total'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_today_expenses_total');
      if (error) throw error;
      return Number(data) || 0;
    },
    staleTime: 1000 * 30, // 30 seconds
    refetchOnWindowFocus: true,
  });
};

/**
 * Inventory Totals - via RPC function (pre-aggregated)
 */
export const useInventoryTotals = () => {
  return useQuery({
    queryKey: ['inventory-totals'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_inventory_totals');
      if (error) throw error;
      const result = data?.[0] || {
        total_full: 0,
        total_empty: 0,
        total_package: 0,
        total_refill: 0,
        total_problem: 0,
      };
      return result;
    },
    staleTime: 1000 * 30, // 30 seconds
    refetchOnWindowFocus: true,
  });
};

/**
 * Monthly Revenue Stats - via RPC function
 */
export const useMonthlyRevenueStats = () => {
  return useQuery({
    queryKey: ['monthly-revenue-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_monthly_revenue_stats');
      if (error) throw error;
      const result = data?.[0] || {
        current_month: 0,
        last_month: 0,
        growth_percent: 0,
      };
      return result;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });
};

/**
 * Customer Stats - via RPC function
 */
export const useCustomerStats = () => {
  return useQuery({
    queryKey: ['customer-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_customer_stats');
      if (error) throw error;
      const result = data?.[0] || {
        total_customers: 0,
        customers_with_due: 0,
        total_due_amount: 0,
      };
      return result;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: true,
  });
};

/**
 * Active Orders Count - via RPC function
 */
export const useActiveOrdersCount = () => {
  return useQuery({
    queryKey: ['active-orders-count'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_active_orders_count');
      if (error) throw error;
      const result = data?.[0] || {
        pending_count: 0,
        dispatched_count: 0,
        total_active: 0,
      };
      return result;
    },
    staleTime: 1000 * 30, // 30 seconds
    refetchOnWindowFocus: true,
  });
};

// =====================================================
// COMBINED DASHBOARD KPIs
// =====================================================

/**
 * All dashboard KPIs in one hook
 */
export const useDashboardKPIs = () => {
  const todaySales = useTodaySalesTotal();
  const todayExpenses = useTodayExpensesTotal();
  const inventoryTotals = useInventoryTotals();
  const monthlyRevenue = useMonthlyRevenueStats();
  const customerStats = useCustomerStats();
  const activeOrders = useActiveOrdersCount();

  const isLoading = 
    todaySales.isLoading || 
    todayExpenses.isLoading || 
    inventoryTotals.isLoading;

  const todayProfit = (todaySales.data || 0) - (todayExpenses.data || 0);

  return {
    isLoading,
    todaySales: todaySales.data || 0,
    todayExpenses: todayExpenses.data || 0,
    todayProfit,
    inventory: inventoryTotals.data || {
      total_full: 0,
      total_empty: 0,
      total_package: 0,
      total_refill: 0,
      total_problem: 0,
    },
    monthlyRevenue: monthlyRevenue.data || {
      current_month: 0,
      last_month: 0,
      growth_percent: 0,
    },
    customerStats: customerStats.data || {
      total_customers: 0,
      customers_with_due: 0,
      total_due_amount: 0,
    },
    activeOrders: activeOrders.data || {
      pending_count: 0,
      dispatched_count: 0,
      total_active: 0,
    },
    refetch: () => {
      todaySales.refetch();
      todayExpenses.refetch();
      inventoryTotals.refetch();
      monthlyRevenue.refetch();
      customerStats.refetch();
      activeOrders.refetch();
    },
  };
};

// =====================================================
// OPTIMISTIC UPDATE MUTATIONS
// =====================================================

interface SaleItem {
  brandId: string;
  quantity: number;
  type: 'refill' | 'package';
}

/**
 * Complete Sale with Optimistic Update
 * UI updates instantly, then syncs with server
 */
export const useCompleteSaleMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (saleData: {
      items: SaleItem[];
      total: number;
      customerId?: string;
      paymentMethod: string;
    }) => {
      // The actual POS transaction insert happens in POSModule
      // This is a placeholder for the mutation pattern
      return saleData;
    },
    onMutate: async (saleData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['inventory-totals'] });
      await queryClient.cancelQueries({ queryKey: ['today-sales-total'] });

      // Snapshot current data for rollback
      const previousInventory = queryClient.getQueryData(['inventory-totals']);
      const previousSales = queryClient.getQueryData(['today-sales-total']);

      // Optimistically update inventory totals
      queryClient.setQueryData(['inventory-totals'], (old: any) => {
        if (!old) return old;
        const totalSold = saleData.items.reduce((sum, item) => sum + item.quantity, 0);
        return {
          ...old,
          total_full: Math.max(0, (old.total_full || 0) - totalSold),
          total_refill: Math.max(0, (old.total_refill || 0) - totalSold),
        };
      });

      // Optimistically update sales total
      queryClient.setQueryData(['today-sales-total'], (old: number) => {
        return (old || 0) + saleData.total;
      });

      return { previousInventory, previousSales };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousInventory) {
        queryClient.setQueryData(['inventory-totals'], context.previousInventory);
      }
      if (context?.previousSales !== undefined) {
        queryClient.setQueryData(['today-sales-total'], context.previousSales);
      }
    },
    onSettled: () => {
      // Refetch to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ['inventory-totals'] });
      queryClient.invalidateQueries({ queryKey: ['today-sales-total'] });
      queryClient.invalidateQueries({ queryKey: ['lpg-brands'] });
    },
  });
};

/**
 * Add Customer Mutation with Cache Update
 */
export const useAddCustomerMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (customer: {
      name: string;
      phone: string;
      address?: string;
    }) => {
      const { data, error } = await supabase
        .from('customers')
        .insert(customer)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (newCustomer) => {
      // Add new customer to cache
      queryClient.setQueryData(['customers'], (old: any[] = []) => {
        return [...old, newCustomer].sort((a, b) => a.name.localeCompare(b.name));
      });
    },
  });
};

/**
 * Invalidate all dashboard queries
 */
export const useInvalidateDashboard = () => {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: ['inventory-totals'] });
    queryClient.invalidateQueries({ queryKey: ['today-sales-total'] });
    queryClient.invalidateQueries({ queryKey: ['today-expenses-total'] });
    queryClient.invalidateQueries({ queryKey: ['monthly-revenue-stats'] });
    queryClient.invalidateQueries({ queryKey: ['customer-stats'] });
    queryClient.invalidateQueries({ queryKey: ['active-orders-count'] });
    queryClient.invalidateQueries({ queryKey: ['lpg-brands'] });
  };
};
