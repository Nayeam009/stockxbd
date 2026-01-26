/**
 * Dashboard Offline Data Hook
 * Provides offline-first KPI data with snapshot caching
 */

import { useState, useEffect, useCallback } from 'react';
import { offlineDB } from '@/lib/offlineDB';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { useNetwork } from '@/contexts/NetworkContext';

const SNAPSHOT_KEY = 'dashboard_snapshot';
const SNAPSHOT_TTL = 5 * 60 * 1000; // 5 minutes

interface DashboardSnapshot {
  timestamp: number;
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
  monthlyRevenue: {
    current_month: number;
    last_month: number;
    growth_percent: number;
  };
  customerStats: {
    total_customers: number;
    customers_with_due: number;
    total_due_amount: number;
  };
  activeOrders: {
    pending_count: number;
    dispatched_count: number;
    total_active: number;
  };
}

interface UseDashboardOfflineDataResult {
  isLoading: boolean;
  isOffline: boolean;
  isFromCache: boolean;
  lastUpdated: Date | null;
  
  todaySales: number;
  todayExpenses: number;
  todayProfit: number;
  inventory: DashboardSnapshot['inventory'];
  monthlyRevenue: DashboardSnapshot['monthlyRevenue'];
  customerStats: DashboardSnapshot['customerStats'];
  activeOrders: DashboardSnapshot['activeOrders'];
  
  refetch: () => Promise<void>;
}

const defaultInventory = {
  total_full: 0,
  total_empty: 0,
  total_package: 0,
  total_refill: 0,
  total_problem: 0,
};

const defaultMonthlyRevenue = {
  current_month: 0,
  last_month: 0,
  growth_percent: 0,
};

const defaultCustomerStats = {
  total_customers: 0,
  customers_with_due: 0,
  total_due_amount: 0,
};

const defaultActiveOrders = {
  pending_count: 0,
  dispatched_count: 0,
  total_active: 0,
};

export function useDashboardOfflineData(): UseDashboardOfflineDataResult {
  const { isOnline } = useNetwork();
  const [isLoading, setIsLoading] = useState(true);
  const [isFromCache, setIsFromCache] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  const [todaySales, setTodaySales] = useState(0);
  const [todayExpenses, setTodayExpenses] = useState(0);
  const [inventory, setInventory] = useState(defaultInventory);
  const [monthlyRevenue, setMonthlyRevenue] = useState(defaultMonthlyRevenue);
  const [customerStats, setCustomerStats] = useState(defaultCustomerStats);
  const [activeOrders, setActiveOrders] = useState(defaultActiveOrders);

  // Load snapshot from IndexedDB
  const loadSnapshot = useCallback(async (): Promise<DashboardSnapshot | null> => {
    try {
      const snapshot = await offlineDB.getMeta<DashboardSnapshot>(SNAPSHOT_KEY);
      if (snapshot && Date.now() - snapshot.timestamp < SNAPSHOT_TTL) {
        return snapshot;
      }
      return null;
    } catch (error) {
      logger.error('Failed to load dashboard snapshot', error, { component: 'useDashboardOfflineData' });
      return null;
    }
  }, []);

  // Save snapshot to IndexedDB
  const saveSnapshot = useCallback(async (data: Omit<DashboardSnapshot, 'timestamp'>) => {
    try {
      const snapshot: DashboardSnapshot = {
        ...data,
        timestamp: Date.now(),
      };
      await offlineDB.setMeta(SNAPSHOT_KEY, snapshot);
    } catch (error) {
      logger.error('Failed to save dashboard snapshot', error, { component: 'useDashboardOfflineData' });
    }
  }, []);

  // Fetch fresh data from server
  const fetchFreshData = useCallback(async () => {
    try {
      const [salesRes, expensesRes, inventoryRes, monthlyRes, customerRes, ordersRes] = await Promise.all([
        supabase.rpc('get_today_sales_total'),
        supabase.rpc('get_today_expenses_total'),
        supabase.rpc('get_inventory_totals'),
        supabase.rpc('get_monthly_revenue_stats'),
        supabase.rpc('get_customer_stats'),
        supabase.rpc('get_active_orders_count'),
      ]);
      
      const sales = Number(salesRes.data) || 0;
      const expenses = Number(expensesRes.data) || 0;
      const inv = inventoryRes.data?.[0] || defaultInventory;
      const monthly = monthlyRes.data?.[0] || defaultMonthlyRevenue;
      const customers = customerRes.data?.[0] || defaultCustomerStats;
      const orders = ordersRes.data?.[0] || defaultActiveOrders;
      
      setTodaySales(sales);
      setTodayExpenses(expenses);
      setInventory(inv);
      setMonthlyRevenue(monthly);
      setCustomerStats(customers);
      setActiveOrders(orders);
      setLastUpdated(new Date());
      setIsFromCache(false);
      
      // Save snapshot for offline use
      await saveSnapshot({
        todaySales: sales,
        todayExpenses: expenses,
        todayProfit: sales - expenses,
        inventory: inv,
        monthlyRevenue: monthly,
        customerStats: customers,
        activeOrders: orders,
      });
      
    } catch (error) {
      logger.error('Failed to fetch dashboard data', error, { component: 'useDashboardOfflineData' });
      throw error;
    }
  }, [saveSnapshot]);

  // Main data loading function
  const loadData = useCallback(async () => {
    setIsLoading(true);
    
    try {
      // Step 1: Load snapshot immediately for instant UI
      const snapshot = await loadSnapshot();
      if (snapshot) {
        setTodaySales(snapshot.todaySales);
        setTodayExpenses(snapshot.todayExpenses);
        setInventory(snapshot.inventory);
        setMonthlyRevenue(snapshot.monthlyRevenue);
        setCustomerStats(snapshot.customerStats);
        setActiveOrders(snapshot.activeOrders);
        setLastUpdated(new Date(snapshot.timestamp));
        setIsFromCache(true);
      }
      
      // Step 2: If online, fetch fresh data
      if (navigator.onLine) {
        await fetchFreshData();
      }
    } catch (error) {
      logger.error('Failed to load dashboard data', error, { component: 'useDashboardOfflineData' });
    } finally {
      setIsLoading(false);
    }
  }, [loadSnapshot, fetchFreshData]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refetch when coming back online
  useEffect(() => {
    if (isOnline) {
      fetchFreshData().catch(() => {
        // Keep using cached data on error
      });
    }
  }, [isOnline, fetchFreshData]);

  return {
    isLoading,
    isOffline: !isOnline,
    isFromCache,
    lastUpdated,
    todaySales,
    todayExpenses,
    todayProfit: todaySales - todayExpenses,
    inventory,
    monthlyRevenue,
    customerStats,
    activeOrders,
    refetch: loadData,
  };
}
