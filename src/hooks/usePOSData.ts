/**
 * POS Data Hook - Uses Shared Query System
 * 
 * Optimized to share cache with other modules for instant switching.
 * Real-time updates handled by unified subscription in useSharedQueries.
 */

import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  sharedKeys, 
  useSharedLPGBrands, 
  useSharedStoves, 
  useSharedRegulators, 
  useSharedCustomers, 
  useSharedProductPrices,
  type SharedLPGBrand,
  type SharedStove,
  type SharedRegulator,
  type SharedCustomer,
  type SharedProductPrice,
} from "@/hooks/useSharedQueries";

// ============= INTERFACES =============
export interface LPGBrand extends SharedLPGBrand {}
export interface Stove extends SharedStove {}
export interface Regulator extends SharedRegulator {}
export interface Customer extends SharedCustomer {}
export interface ProductPrice extends SharedProductPrice {}

export interface TodayStats {
  totalSales: number;
  totalRevenue: number;
  pendingOrders: number;
}

// ============= MAIN HOOK =============
export function usePOSData() {
  // Use shared queries - these are cached across all modules
  const { data: lpgBrands = [], isLoading: lpgLoading } = useSharedLPGBrands();
  const { data: stoves = [], isLoading: stovesLoading } = useSharedStoves();
  const { data: regulators = [], isLoading: regulatorsLoading } = useSharedRegulators();
  const { data: customers = [], isLoading: customersLoading } = useSharedCustomers();
  const { data: productPrices = [], isLoading: pricesLoading } = useSharedProductPrices();

  // ===== Today's Stats Query (POS-specific) =====
  const { data: todayStats } = useQuery({
    queryKey: [...sharedKeys.todayStats(), 'pos'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      // Get today's sales
      const { data: salesData } = await supabase
        .from('pos_transactions')
        .select('total')
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`)
        .eq('is_voided', false);

      const totalSales = salesData?.length || 0;
      const totalRevenue = salesData?.reduce((sum, t) => sum + Number(t.total), 0) || 0;

      // Get pending online orders
      const { count } = await supabase
        .from('community_orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      return {
        totalSales,
        totalRevenue,
        pendingOrders: count || 0
      } as TodayStats;
    },
    staleTime: 60_000,
    refetchInterval: 30_000,
  });

  // ===== Price Helper Functions =====
  const getLPGPrice = useCallback((brandId: string, weightVal: string, cylType: 'refill' | 'package', saleTp: 'retail' | 'wholesale') => {
    const variant = cylType === 'refill' ? 'Refill' : 'Package';

    // Find pricing entry matching brand + variant
    let priceEntry = productPrices.find(
      p => p.product_type === 'lpg' &&
        p.brand_id === brandId &&
        p.variant === variant
    );

    // Fallback: find by brand_id only
    if (!priceEntry) {
      priceEntry = productPrices.find(
        p => p.product_type === 'lpg' && p.brand_id === brandId && p.size?.includes(weightVal)
      );
    }

    if (!priceEntry) return 0;

    return saleTp === 'wholesale' ? priceEntry.distributor_price || 0 : priceEntry.retail_price || 0;
  }, [productPrices]);

  const getStovePrice = useCallback((brand: string, model: string) => {
    const priceEntry = productPrices.find(
      p => p.product_type === 'stove' &&
        p.product_name.toLowerCase().includes(brand.toLowerCase()) &&
        p.product_name.toLowerCase().includes(model.toLowerCase())
    );
    return priceEntry?.retail_price || 0;
  }, [productPrices]);

  const getRegulatorPrice = useCallback((brand: string, type: string) => {
    const priceEntry = productPrices.find(
      p => p.product_type === 'regulator' &&
        p.product_name.toLowerCase().includes(brand.toLowerCase()) &&
        p.product_name.toLowerCase().includes(type.toLowerCase())
    );
    return priceEntry?.retail_price || 0;
  }, [productPrices]);

  // Refresh is now handled by shared queries - no-op here
  const refreshAllData = useCallback(() => {
    // Data refresh is handled by unified real-time subscription
  }, []);

  const isLoading = lpgLoading || stovesLoading || regulatorsLoading || customersLoading || pricesLoading;

  return {
    // Data (from shared cache)
    lpgBrands,
    stoves,
    regulators,
    customers,
    productPrices,
    todayStats,
    // State
    isLoading,
    // Price helpers
    getLPGPrice,
    getStovePrice,
    getRegulatorPrice,
    // Actions
    refreshAllData,
  };
}
