import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNetwork } from "@/contexts/NetworkContext";

// ============= INTERFACES =============
export interface LPGBrand {
  id: string;
  name: string;
  size: string;
  weight: string;
  refill_cylinder: number;
  package_cylinder: number;
  empty_cylinder: number;
  problem_cylinder: number;
  color: string;
}

export interface Stove {
  id: string;
  brand: string;
  model: string;
  burners: number;
  price: number;
  quantity: number;
}

export interface Regulator {
  id: string;
  brand: string;
  type: string;
  quantity: number;
  price?: number;
}

export interface ProductPrice {
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

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  total_due: number;
  cylinders_due: number;
  billing_status: string;
  last_order_date: string | null;
  credit_limit?: number;
}

export interface TodayStats {
  totalSales: number;
  totalRevenue: number;
  pendingOrders: number;
}

// ============= MAIN HOOK =============
export function usePOSData() {
  const queryClient = useQueryClient();
  const { isOnline } = useNetwork();

  // ===== LPG Brands Query =====
  const { data: lpgBrands = [], isLoading: lpgLoading } = useQuery({
    queryKey: ['pos-lpg-brands'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lpg_brands')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data as LPGBrand[];
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

  // ===== Stoves Query =====
  const { data: stoves = [], isLoading: stovesLoading } = useQuery({
    queryKey: ['pos-stoves'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stoves')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data as Stove[];
    },
    staleTime: 30_000,
  });

  // ===== Regulators Query =====
  const { data: regulators = [], isLoading: regulatorsLoading } = useQuery({
    queryKey: ['pos-regulators'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('regulators')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data as Regulator[];
    },
    staleTime: 30_000,
  });

  // ===== Customers Query =====
  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ['pos-customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Customer[];
    },
    staleTime: 30_000,
  });

  // ===== Product Prices Query =====
  const { data: productPrices = [], isLoading: pricesLoading } = useQuery({
    queryKey: ['pos-prices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_prices')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data as ProductPrice[];
    },
    staleTime: 30_000,
  });

  // ===== Today's Stats Query =====
  const { data: todayStats } = useQuery({
    queryKey: ['pos-today-stats'],
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

  // ===== Real-time Subscriptions =====
  useEffect(() => {
    if (!isOnline) return;

    const channel = supabase
      .channel('pos-realtime-v4')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lpg_brands' }, 
        () => queryClient.invalidateQueries({ queryKey: ['pos-lpg-brands'] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stoves' }, 
        () => queryClient.invalidateQueries({ queryKey: ['pos-stoves'] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'regulators' }, 
        () => queryClient.invalidateQueries({ queryKey: ['pos-regulators'] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, 
        () => queryClient.invalidateQueries({ queryKey: ['pos-customers'] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_prices' }, 
        () => queryClient.invalidateQueries({ queryKey: ['pos-prices'] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pos_transactions' }, 
        () => queryClient.invalidateQueries({ queryKey: ['pos-today-stats'] }))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOnline, queryClient]);

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

  // ===== Refresh Function =====
  const refreshAllData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['pos-lpg-brands'] });
    queryClient.invalidateQueries({ queryKey: ['pos-stoves'] });
    queryClient.invalidateQueries({ queryKey: ['pos-regulators'] });
    queryClient.invalidateQueries({ queryKey: ['pos-customers'] });
    queryClient.invalidateQueries({ queryKey: ['pos-prices'] });
    queryClient.invalidateQueries({ queryKey: ['pos-today-stats'] });
  }, [queryClient]);

  const isLoading = lpgLoading || stovesLoading || regulatorsLoading || customersLoading || pricesLoading;

  return {
    // Data
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
