/**
 * Unified Query System for Stock-X Dashboard
 * 
 * This module provides:
 * - Shared query keys for unified cache management
 * - Centralized data fetching functions
 * - Single real-time subscription channel
 * - Aggressive stale times for fast module switching
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useRef, useCallback } from 'react';
import { useNetwork } from '@/contexts/NetworkContext';

// ============= SHARED QUERY KEYS =============
export const sharedKeys = {
  all: ['shared'] as const,
  lpgBrands: () => [...sharedKeys.all, 'lpg-brands'] as const,
  stoves: () => [...sharedKeys.all, 'stoves'] as const,
  regulators: () => [...sharedKeys.all, 'regulators'] as const,
  customers: () => [...sharedKeys.all, 'customers'] as const,
  prices: () => [...sharedKeys.all, 'prices'] as const,
  overview: () => [...sharedKeys.all, 'overview'] as const,
  todayStats: () => [...sharedKeys.all, 'today-stats'] as const,
};

// ============= INTERFACES =============
export interface SharedLPGBrand {
  id: string;
  name: string;
  size: string;
  weight: string;
  refill_cylinder: number;
  package_cylinder: number;
  empty_cylinder: number;
  problem_cylinder: number;
  in_transit_cylinder: number;
  color: string;
  is_active: boolean;
}

export interface SharedStove {
  id: string;
  brand: string;
  model: string;
  burners: number;
  price: number;
  quantity: number;
  is_damaged: boolean | null;
  warranty_months: number | null;
}

export interface SharedRegulator {
  id: string;
  brand: string;
  type: string;
  quantity: number;
  price: number | null;
  is_defective: boolean | null;
}

export interface SharedCustomer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  total_due: number;
  cylinders_due: number;
  billing_status: string;
  last_order_date: string | null;
  credit_limit?: number;
  created_at: string;
}

export interface SharedProductPrice {
  id: string;
  product_type: string;
  brand_id: string | null;
  product_name: string;
  size: string | null;
  variant: string | null;
  company_price: number;
  distributor_price: number;
  retail_price: number;
  package_price: number;
}

export interface OverviewStats {
  todayRevenue: number;
  todayExpenses: number;
  monthlyRevenue: number;
  lastMonthRevenue: number;
  monthlyGrowthPercent: number;
  inventory: {
    total_full: number;
    total_empty: number;
    total_package: number;
    total_refill: number;
    total_problem: number;
  };
  orders: {
    pending_count: number;
    confirmed_count: number;
    dispatched_count: number;
    total_active: number;
  };
}

// ============= STALE TIMES (Performance Tuning) =============
const STALE_TIMES = {
  lpgBrands: 2 * 60 * 1000,    // 2 minutes
  stoves: 2 * 60 * 1000,       // 2 minutes  
  regulators: 2 * 60 * 1000,   // 2 minutes
  customers: 3 * 60 * 1000,    // 3 minutes
  prices: 5 * 60 * 1000,       // 5 minutes
  overview: 30 * 1000,         // 30 seconds
};

const GC_TIME = 10 * 60 * 1000; // 10 minutes

// ============= FETCH FUNCTIONS =============
async function fetchLPGBrands(): Promise<SharedLPGBrand[]> {
  const { data, error } = await supabase
    .from('lpg_brands')
    .select('*')
    .eq('is_active', true)
    .order('name');
  
  if (error) throw error;
  return data || [];
}

async function fetchStoves(): Promise<SharedStove[]> {
  const { data, error } = await supabase
    .from('stoves')
    .select('*')
    .eq('is_active', true)
    .order('brand');
  
  if (error) throw error;
  return data || [];
}

async function fetchRegulators(): Promise<SharedRegulator[]> {
  const { data, error } = await supabase
    .from('regulators')
    .select('*')
    .eq('is_active', true)
    .order('brand');
  
  if (error) throw error;
  return data || [];
}

async function fetchCustomers(): Promise<SharedCustomer[]> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);
  
  if (error) throw error;
  return data || [];
}

async function fetchProductPrices(): Promise<SharedProductPrice[]> {
  const { data, error } = await supabase
    .from('product_prices')
    .select('*')
    .eq('is_active', true);
  
  if (error) throw error;
  return data || [];
}

async function fetchOverviewStats(): Promise<OverviewStats> {
  const [salesResult, expensesResult, inventoryResult, ordersResult, monthlyResult] = await Promise.all([
    supabase.rpc('get_today_sales_total'),
    supabase.rpc('get_today_expenses_total'),
    supabase.rpc('get_inventory_totals'),
    supabase.rpc('get_active_orders_count'),
    supabase.rpc('get_monthly_revenue_stats'),
  ]);

  const monthly = monthlyResult.data?.[0];

  return {
    todayRevenue: Number(salesResult.data) || 0,
    todayExpenses: Number(expensesResult.data) || 0,
    monthlyRevenue: Number(monthly?.current_month) || 0,
    lastMonthRevenue: Number(monthly?.last_month) || 0,
    monthlyGrowthPercent: Number(monthly?.growth_percent) || 0,
    inventory: inventoryResult.data?.[0] || {
      total_full: 0,
      total_empty: 0,
      total_package: 0,
      total_refill: 0,
      total_problem: 0,
    },
    orders: ordersResult.data?.[0] || {
      pending_count: 0,
      confirmed_count: 0,
      dispatched_count: 0,
      total_active: 0,
    },
  };
}

// ============= SHARED HOOKS =============

/**
 * Get LPG brands from shared cache
 */
export function useSharedLPGBrands(enabled = true) {
  return useQuery({
    queryKey: sharedKeys.lpgBrands(),
    queryFn: fetchLPGBrands,
    enabled,
    staleTime: STALE_TIMES.lpgBrands,
    gcTime: GC_TIME,
  });
}

/**
 * Get stoves from shared cache
 */
export function useSharedStoves(enabled = true) {
  return useQuery({
    queryKey: sharedKeys.stoves(),
    queryFn: fetchStoves,
    enabled,
    staleTime: STALE_TIMES.stoves,
    gcTime: GC_TIME,
  });
}

/**
 * Get regulators from shared cache
 */
export function useSharedRegulators(enabled = true) {
  return useQuery({
    queryKey: sharedKeys.regulators(),
    queryFn: fetchRegulators,
    enabled,
    staleTime: STALE_TIMES.regulators,
    gcTime: GC_TIME,
  });
}

/**
 * Get customers from shared cache
 */
export function useSharedCustomers(enabled = true) {
  return useQuery({
    queryKey: sharedKeys.customers(),
    queryFn: fetchCustomers,
    enabled,
    staleTime: STALE_TIMES.customers,
    gcTime: GC_TIME,
  });
}

/**
 * Get product prices from shared cache
 */
export function useSharedProductPrices(enabled = true) {
  return useQuery({
    queryKey: sharedKeys.prices(),
    queryFn: fetchProductPrices,
    enabled,
    staleTime: STALE_TIMES.prices,
    gcTime: GC_TIME,
  });
}

/**
 * Get overview stats (lightweight, fast)
 */
export function useSharedOverviewStats(enabled = true) {
  return useQuery({
    queryKey: sharedKeys.overview(),
    queryFn: fetchOverviewStats,
    enabled,
    staleTime: STALE_TIMES.overview,
    gcTime: GC_TIME,
    refetchInterval: 60 * 1000, // Refresh every minute
  });
}

// ============= UNIFIED REAL-TIME SUBSCRIPTION =============

// Debounce tiers for different data criticality
const DEBOUNCE_TIERS = {
  critical: 500,   // POS, active orders
  normal: 1500,    // Inventory, customers
  low: 3000,       // Analytics, reports
} as const;

/**
 * Single consolidated real-time subscription for all dashboard data
 * Replaces multiple individual subscriptions
 */
export function useUnifiedRealtime() {
  const queryClient = useQueryClient();
  const { isOnline } = useNetwork();
  const debounceRefs = useRef<Record<string, NodeJS.Timeout | null>>({});

  // Debounced invalidation
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
    if (!isOnline) return;

    // SINGLE consolidated channel for all dashboard updates
    const channel = supabase
      .channel('stock-x-unified')
      // Inventory tables
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'lpg_brands' },
        () => {
          invalidateWithDebounce(sharedKeys.lpgBrands(), 'normal');
          invalidateWithDebounce(sharedKeys.overview(), 'normal');
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'stoves' },
        () => invalidateWithDebounce(sharedKeys.stoves(), 'normal')
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'regulators' },
        () => invalidateWithDebounce(sharedKeys.regulators(), 'normal')
      )
      // Sales transactions (critical)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'pos_transactions' },
        () => {
          invalidateWithDebounce(sharedKeys.overview(), 'critical');
          invalidateWithDebounce(sharedKeys.todayStats(), 'critical');
        }
      )
      // POB transactions
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'pob_transactions' },
        () => {
          invalidateWithDebounce(sharedKeys.overview(), 'normal');
          invalidateWithDebounce(sharedKeys.lpgBrands(), 'normal');
        }
      )
      // Customers
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'customers' },
        () => invalidateWithDebounce(sharedKeys.customers(), 'normal')
      )
      // Product prices
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'product_prices' },
        () => invalidateWithDebounce(sharedKeys.prices(), 'low')
      )
      // Community orders (critical)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'community_orders' },
        () => invalidateWithDebounce(sharedKeys.overview(), 'critical')
      )
      // Expenses
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'daily_expenses' },
        () => invalidateWithDebounce(sharedKeys.overview(), 'normal')
      )
      .subscribe();

    return () => {
      // Cleanup all debounce timers
      Object.values(debounceRefs.current).forEach(timer => {
        if (timer) clearTimeout(timer);
      });
      supabase.removeChannel(channel);
    };
  }, [isOnline, invalidateWithDebounce]);
}

// ============= PREFETCH UTILITIES =============

/**
 * Prefetch all commonly used data in background
 * Call this on dashboard mount for instant module switching
 */
export function usePrefetchSharedData() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Delay prefetch to not block initial render
    const timer = setTimeout(() => {
      // Prefetch all shared data in parallel
      queryClient.prefetchQuery({
        queryKey: sharedKeys.lpgBrands(),
        queryFn: fetchLPGBrands,
        staleTime: STALE_TIMES.lpgBrands,
      });
      
      queryClient.prefetchQuery({
        queryKey: sharedKeys.stoves(),
        queryFn: fetchStoves,
        staleTime: STALE_TIMES.stoves,
      });
      
      queryClient.prefetchQuery({
        queryKey: sharedKeys.regulators(),
        queryFn: fetchRegulators,
        staleTime: STALE_TIMES.regulators,
      });
      
      queryClient.prefetchQuery({
        queryKey: sharedKeys.customers(),
        queryFn: fetchCustomers,
        staleTime: STALE_TIMES.customers,
      });
      
      queryClient.prefetchQuery({
        queryKey: sharedKeys.prices(),
        queryFn: fetchProductPrices,
        staleTime: STALE_TIMES.prices,
      });
    }, 1000); // 1s delay after mount

    return () => clearTimeout(timer);
  }, [queryClient]);
}

/**
 * Get price for LPG cylinder
 */
export function useLPGPriceHelper() {
  const { data: prices = [] } = useSharedProductPrices();

  return useCallback((
    brandId: string,
    cylType: 'refill' | 'package',
    saleType: 'retail' | 'wholesale'
  ) => {
    const variant = cylType === 'refill' ? 'Refill' : 'Package';
    
    const priceEntry = prices.find(
      p => p.product_type === 'lpg' &&
        p.brand_id === brandId &&
        p.variant === variant
    );

    if (!priceEntry) return 0;
    return saleType === 'wholesale' ? priceEntry.distributor_price : priceEntry.retail_price;
  }, [prices]);
}
