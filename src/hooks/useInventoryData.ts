/**
 * Inventory Data Hook - Uses Shared Query System
 * 
 * Optimized to share cache with POS and other modules.
 * Real-time updates handled by unified subscription.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNetwork } from "@/contexts/NetworkContext";
import { logger } from "@/lib/logger";
import { 
  sharedKeys,
  useSharedLPGBrands,
  useSharedStoves,
  useSharedRegulators,
  type SharedLPGBrand,
  type SharedStove,
  type SharedRegulator,
} from "@/hooks/useSharedQueries";

// Re-export types for compatibility
export type LPGBrand = SharedLPGBrand;
export type Stove = SharedStove;
export type Regulator = SharedRegulator;

export interface InventoryTotals {
  total_full: number;
  total_empty: number;
  total_package: number;
  total_refill: number;
  total_problem: number;
}

export interface TodayStats {
  todayPurchases: number;
  todaySpent: number;
  totalFull: number;
  totalEmpty: number;
  lowStockCount: number;
}

// Weight options
export const WEIGHT_OPTIONS_22MM = [
  { value: "5.5kg", label: "5.5 KG", shortLabel: "5.5" },
  { value: "12kg", label: "12 KG", shortLabel: "12" },
  { value: "12.5kg", label: "12.5 KG", shortLabel: "12.5" },
  { value: "25kg", label: "25 KG", shortLabel: "25" },
  { value: "35kg", label: "35 KG", shortLabel: "35" },
  { value: "45kg", label: "45 KG", shortLabel: "45" },
];

export const WEIGHT_OPTIONS_20MM = [
  { value: "5kg", label: "5 KG", shortLabel: "5" },
  { value: "10kg", label: "10 KG", shortLabel: "10" },
  { value: "12kg", label: "12 KG", shortLabel: "12" },
  { value: "15kg", label: "15 KG", shortLabel: "15" },
  { value: "21kg", label: "21 KG", shortLabel: "21" },
  { value: "35kg", label: "35 KG", shortLabel: "35" },
];

export function useInventoryData(sizeTab: "22mm" | "20mm" = "22mm", selectedWeight: string = "12kg") {
  const queryClient = useQueryClient();
  const { isOnline } = useNetwork();

  // Use SHARED queries for global data
  const { data: allLpgBrands = [], isLoading: lpgLoading, refetch: refetchLpg } = useSharedLPGBrands();
  const { data: stoves = [], isLoading: stovesLoading, refetch: refetchStoves } = useSharedStoves();
  const { data: regulators = [], isLoading: regulatorsLoading, refetch: refetchRegulators } = useSharedRegulators();

  // Filter LPG brands by size and weight (client-side filter on cached data)
  const lpgBrands = useMemo(() => 
    allLpgBrands.filter(b => b.size === sizeTab && b.weight === selectedWeight),
    [allLpgBrands, sizeTab, selectedWeight]
  );

  // Fetch Inventory Totals using RPC
  const { data: totals } = useQuery({
    queryKey: ['inventory-totals'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_inventory_totals');
      if (error) throw error;
      const result = Array.isArray(data) && data.length > 0 ? data[0] : data;
      return result as InventoryTotals | null;
    },
    staleTime: 60_000
  });

  // Fetch Today's Stats
  const { data: todayStats } = useQuery({
    queryKey: ['inventory-today-stats'],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      
      // Get today's POB transactions
      const { data: pobTxns } = await supabase
        .from('pob_transactions')
        .select('total')
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`);
      
      const todayPurchases = pobTxns?.length || 0;
      const todaySpent = pobTxns?.reduce((sum, t) => sum + Number(t.total), 0) || 0;
      
      // Get inventory totals
      const { data: totalsData } = await supabase.rpc('get_inventory_totals');
      let totalFull = 0;
      let totalEmpty = 0;
      if (totalsData) {
        const totalsResult = Array.isArray(totalsData) && totalsData.length > 0 
          ? totalsData[0] 
          : (typeof totalsData === 'object' ? totalsData : null);
        if (totalsResult && typeof totalsResult === 'object' && 'total_full' in totalsResult) {
          totalFull = (totalsResult as InventoryTotals).total_full || 0;
          totalEmpty = (totalsResult as InventoryTotals).total_empty || 0;
        }
      }
      
      // Get low stock alerts
      const { data: lowStock } = await supabase
        .from('lpg_brands')
        .select('id')
        .eq('is_active', true)
        .or('refill_cylinder.lt.5,package_cylinder.lt.5');
      
      return { 
        todayPurchases, 
        todaySpent,
        totalFull,
        totalEmpty,
        lowStockCount: lowStock?.length || 0
      } as TodayStats;
    },
    staleTime: 60_000,
    refetchInterval: 30_000
  });

  // Computed LPG Totals
  const lpgTotals = useMemo(() => 
    lpgBrands.reduce((acc, b) => ({
      package: acc.package + b.package_cylinder,
      refill: acc.refill + b.refill_cylinder,
      empty: acc.empty + b.empty_cylinder,
      problem: acc.problem + b.problem_cylinder,
      inTransit: acc.inTransit + (b.in_transit_cylinder || 0),
    }), { package: 0, refill: 0, empty: 0, problem: 0, inTransit: 0 }),
    [lpgBrands]
  );

  // Computed Stove Totals
  const stoveTotals = useMemo(() => ({
    total: stoves.reduce((sum, s) => sum + s.quantity, 0),
    singleBurner: stoves.filter(s => s.burners === 1).reduce((sum, s) => sum + s.quantity, 0),
    doubleBurner: stoves.filter(s => s.burners === 2).reduce((sum, s) => sum + s.quantity, 0),
    damaged: stoves.filter(s => s.is_damaged).reduce((sum, s) => sum + s.quantity, 0),
  }), [stoves]);

  // Computed Regulator Totals
  const regulatorTotals = useMemo(() => ({
    total: regulators.reduce((sum, r) => sum + r.quantity, 0),
    size22mm: regulators.filter(r => r.type === "22mm").reduce((sum, r) => sum + r.quantity, 0),
    size20mm: regulators.filter(r => r.type === "20mm").reduce((sum, r) => sum + r.quantity, 0),
  }), [regulators]);

  // Update operations with optimistic updates
  const updateLpgBrand = useCallback(async (id: string, field: string, value: number) => {
    const previousData = queryClient.getQueryData<LPGBrand[]>(sharedKeys.lpgBrands());
    
    // Optimistic update
    queryClient.setQueryData<LPGBrand[]>(sharedKeys.lpgBrands(), (old) => {
      if (!old) return old;
      return old.map(brand => 
        brand.id === id ? { ...brand, [field]: value } : brand
      );
    });

    try {
      const { error } = await supabase
        .from("lpg_brands")
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq("id", id);
      
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['inventory-totals'] });
      return true;
    } catch (error: any) {
      queryClient.setQueryData(sharedKeys.lpgBrands(), previousData);
      logger.error('Failed to update LPG brand', error, { component: 'useInventoryData' });
      throw error;
    }
  }, [queryClient]);

  const updateStove = useCallback(async (id: string, value: number) => {
    const previousData = queryClient.getQueryData<Stove[]>(sharedKeys.stoves());
    
    queryClient.setQueryData<Stove[]>(sharedKeys.stoves(), (old) => {
      if (!old) return old;
      return old.map(stove => 
        stove.id === id ? { ...stove, quantity: value } : stove
      );
    });

    try {
      const { error } = await supabase
        .from("stoves")
        .update({ quantity: value, updated_at: new Date().toISOString() })
        .eq("id", id);
      
      if (error) throw error;
      return true;
    } catch (error: any) {
      queryClient.setQueryData(sharedKeys.stoves(), previousData);
      logger.error('Failed to update stove', error, { component: 'useInventoryData' });
      throw error;
    }
  }, [queryClient]);

  const updateRegulator = useCallback(async (id: string, value: number) => {
    const previousData = queryClient.getQueryData<Regulator[]>(sharedKeys.regulators());
    
    queryClient.setQueryData<Regulator[]>(sharedKeys.regulators(), (old) => {
      if (!old) return old;
      return old.map(reg => 
        reg.id === id ? { ...reg, quantity: value } : reg
      );
    });

    try {
      const { error } = await supabase
        .from("regulators")
        .update({ quantity: value })
        .eq("id", id);
      
      if (error) throw error;
      return true;
    } catch (error: any) {
      queryClient.setQueryData(sharedKeys.regulators(), previousData);
      logger.error('Failed to update regulator', error, { component: 'useInventoryData' });
      throw error;
    }
  }, [queryClient]);

  // Delete operations (soft delete)
  const deleteLpgBrand = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from("lpg_brands")
        .update({ is_active: false })
        .eq("id", id);
      
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: sharedKeys.lpgBrands() });
      return true;
    } catch (error: any) {
      logger.error('Failed to delete LPG brand', error, { component: 'useInventoryData' });
      throw error;
    }
  }, [queryClient]);

  const deleteStove = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from("stoves")
        .update({ is_active: false })
        .eq("id", id);
      
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: sharedKeys.stoves() });
      return true;
    } catch (error: any) {
      logger.error('Failed to delete stove', error, { component: 'useInventoryData' });
      throw error;
    }
  }, [queryClient]);

  const deleteRegulator = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from("regulators")
        .update({ is_active: false })
        .eq("id", id);
      
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: sharedKeys.regulators() });
      return true;
    } catch (error: any) {
      logger.error('Failed to delete regulator', error, { component: 'useInventoryData' });
      throw error;
    }
  }, [queryClient]);

  const refetchAll = useCallback(() => {
    refetchLpg();
    refetchStoves();
    refetchRegulators();
    queryClient.invalidateQueries({ queryKey: ['inventory-totals'] });
    queryClient.invalidateQueries({ queryKey: ['inventory-today-stats'] });
  }, [refetchLpg, refetchStoves, refetchRegulators, queryClient]);

  return {
    // Data
    lpgBrands,
    stoves,
    regulators,
    totals,
    todayStats,
    
    // Computed
    lpgTotals,
    stoveTotals,
    regulatorTotals,
    
    // Loading states
    isLoading: lpgLoading || stovesLoading || regulatorsLoading,
    
    // Operations
    updateLpgBrand,
    updateStove,
    updateRegulator,
    deleteLpgBrand,
    deleteStove,
    deleteRegulator,
    refetchAll,
  };
}
