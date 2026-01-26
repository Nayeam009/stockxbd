/**
 * Dashboard Offline KPIs Hook
 * Provides dashboard KPIs with offline-first architecture
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { offlineDB } from '@/lib/offlineDB';
import { useNetwork } from '@/contexts/NetworkContext';
import { logger } from '@/lib/logger';

const DASHBOARD_KPI_KEY = 'dashboard_kpis';
const KPI_CACHE_TTL = 1000 * 60 * 5; // 5 minutes

interface DashboardKPIs {
  todaySales: number;
  todayExpenses: number;
  todayProfit: number;
  inventory: {
    total_full: number;
    total_empty: number;
    total_package: number;
    total_refill: number;
    total_problem: number;
  };
  activeOrders: {
    pending_count: number;
    dispatched_count: number;
    total_active: number;
  };
  timestamp: number;
}

const DEFAULT_KPIS: DashboardKPIs = {
  todaySales: 0,
  todayExpenses: 0,
  todayProfit: 0,
  inventory: {
    total_full: 0,
    total_empty: 0,
    total_package: 0,
    total_refill: 0,
    total_problem: 0,
  },
  activeOrders: {
    pending_count: 0,
    dispatched_count: 0,
    total_active: 0,
  },
  timestamp: 0,
};

export function useDashboardOfflineKPIs() {
  const { isOnline } = useNetwork();
  const [kpis, setKpis] = useState<DashboardKPIs>(DEFAULT_KPIS);
  const [isLoading, setIsLoading] = useState(true);
  const [isFromCache, setIsFromCache] = useState(false);
  const fetchingRef = useRef(false);
  const lastFetchRef = useRef(0);

  // Load from cache immediately
  const loadFromCache = useCallback(async (): Promise<DashboardKPIs | null> => {
    try {
      const cached = await offlineDB.getMeta<DashboardKPIs>(DASHBOARD_KPI_KEY);
      if (cached && cached.timestamp) {
        return cached;
      }
    } catch (err) {
      logger.warn('Failed to load KPIs from cache', err, { component: 'useDashboardOfflineKPIs' });
    }
    return null;
  }, []);

  // Save to cache
  const saveToCache = useCallback(async (data: DashboardKPIs) => {
    try {
      await offlineDB.setMeta(DASHBOARD_KPI_KEY, data);
    } catch (err) {
      logger.warn('Failed to save KPIs to cache', err, { component: 'useDashboardOfflineKPIs' });
    }
  }, []);

  // Fetch fresh KPIs from server
  const fetchKPIs = useCallback(async (): Promise<DashboardKPIs> => {
    const now = Date.now();
    
    // Debounce rapid fetches
    if (now - lastFetchRef.current < 2000) {
      return kpis;
    }
    lastFetchRef.current = now;

    try {
      const [salesRes, expensesRes, inventoryRes, ordersRes] = await Promise.all([
        supabase.rpc('get_today_sales_total'),
        supabase.rpc('get_today_expenses_total'),
        supabase.rpc('get_inventory_totals'),
        supabase.rpc('get_active_orders_count'),
      ]);

      const todaySales = Number(salesRes.data) || 0;
      const todayExpenses = Number(expensesRes.data) || 0;
      
      const inventoryData = inventoryRes.data?.[0] || DEFAULT_KPIS.inventory;
      const ordersData = ordersRes.data?.[0] || DEFAULT_KPIS.activeOrders;

      const newKpis: DashboardKPIs = {
        todaySales,
        todayExpenses,
        todayProfit: todaySales - todayExpenses,
        inventory: {
          total_full: Number(inventoryData.total_full) || 0,
          total_empty: Number(inventoryData.total_empty) || 0,
          total_package: Number(inventoryData.total_package) || 0,
          total_refill: Number(inventoryData.total_refill) || 0,
          total_problem: Number(inventoryData.total_problem) || 0,
        },
        activeOrders: {
          pending_count: Number(ordersData.pending_count) || 0,
          dispatched_count: Number(ordersData.dispatched_count) || 0,
          total_active: Number(ordersData.total_active) || 0,
        },
        timestamp: Date.now(),
      };

      return newKpis;
    } catch (err) {
      logger.error('Failed to fetch KPIs', err, { component: 'useDashboardOfflineKPIs' });
      throw err;
    }
  }, [kpis]);

  // Main data loading function
  const loadData = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      // Always try cache first for instant UI
      const cached = await loadFromCache();
      if (cached) {
        setKpis(cached);
        setIsFromCache(true);
        setIsLoading(false);
        
        // Check if cache is still fresh
        const isFresh = Date.now() - cached.timestamp < KPI_CACHE_TTL;
        if (isFresh && !isOnline) {
          fetchingRef.current = false;
          return;
        }
      }

      // If online, fetch fresh data
      if (isOnline) {
        const freshData = await fetchKPIs();
        setKpis(freshData);
        setIsFromCache(false);
        await saveToCache(freshData);
      } else if (!cached) {
        // Offline with no cache - use defaults
        setKpis(DEFAULT_KPIS);
        setIsFromCache(false);
      }
    } catch (err) {
      // On error, keep cached data if available
      logger.warn('KPI load error, keeping cached data', err, { component: 'useDashboardOfflineKPIs' });
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  }, [isOnline, loadFromCache, fetchKPIs, saveToCache]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refresh when coming online
  useEffect(() => {
    if (isOnline && !isLoading) {
      loadData();
    }
  }, [isOnline]);

  // Manual refresh function
  const refetch = useCallback(() => {
    if (isOnline) {
      loadData();
    }
  }, [isOnline, loadData]);

  return {
    ...kpis,
    isLoading,
    isFromCache,
    isOffline: !isOnline,
    refetch,
    lastUpdated: kpis.timestamp ? new Date(kpis.timestamp) : null,
  };
}
