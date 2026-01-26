import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

// Types that match database schema
export interface SalesData {
  id: string;
  date: string;
  productType: 'cylinder' | 'stove' | 'accessory';
  productName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  paymentMethod: 'cash' | 'bkash' | 'nagad' | 'rocket' | 'bank' | 'credit';
  staffId: string;
  staffName: string;
  paymentStatus: string;
}

export interface StockItem {
  id: string;
  type: 'cylinder' | 'stove';
  name: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  lastUpdated: string;
  price: number;
}

export interface CylinderStock {
  id: string;
  brand: string;
  size: string;
  weight: string;
  fullCylinders: number;
  emptyCylinders: number;
  problemCylinders: number;
  packageCylinders: number;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  vehicleId: string;
  todaySales: number;
  todayDeliveries: number;
  status: 'active' | 'break' | 'offline';
  stockInHand: number; // Cylinders currently with driver
  cashCollected: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  totalOrders: number;
  lastOrder: string;
  outstanding: number;
  loyaltyPoints: number;
  isActive: boolean; // Ordered in last 30 days
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'dispatched' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'partial';
  deliveryAddress: string;
  driverId?: string;
  orderDate: string;
  deliveryDate?: string;
}

export interface Vehicle {
  id: string;
  number: string;
  type: string;
  driverId: string;
  fuelCost: number;
  maintenanceCost: number;
  lastService: string;
  nextService: string;
}

export interface Staff {
  id: string;
  name: string;
  role: 'driver' | 'manager' | 'staff';
  basicSalary: number;
  bonus: number;
  deductions: number;
  netSalary: number;
  lastPayment: string;
}

export interface DashboardAnalytics {
  // Revenue metrics
  todayRevenue: number;
  todayCashRevenue: number;
  todayDueRevenue: number;
  monthlyRevenue: number;
  lastMonthRevenue: number;
  monthlyGrowthPercent: number;
  
  // Stock metrics
  lowStockItems: any[];
  totalFullCylinders: number;
  totalEmptyCylinders: number;
  cylinderStockHealth: 'critical' | 'warning' | 'good';
  
  // Order metrics
  activeOrders: number;
  pendingOrders: number;
  dispatchedOrders: number;
  
  // Customer metrics
  totalCustomers: number;
  activeCustomers: number;
  lostCustomers: number;
  
  // Driver metrics
  activeDrivers: number;
}

export const useDashboardData = () => {
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [stockData, setStockData] = useState<StockItem[]>([]);
  const [cylinderStock, setCylinderStock] = useState<CylinderStock[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [softLoading, setSoftLoading] = useState(false);
  
  // Track data freshness and channel health
  const lastFetchTimeRef = useRef<number>(Date.now());
  const channelHealthyRef = useRef<boolean>(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isInitialLoadRef = useRef<boolean>(true);

  // Persist a lightweight snapshot so if the browser discards the tab,
  // the dashboard can render instantly on restore.
  const DASHBOARD_CACHE_KEY = 'stockx.dashboard.snapshot.v1';
  const DASHBOARD_CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes (extended from 10 for better offline support)

  type DashboardSnapshot = {
    ts: number;
    salesData: SalesData[];
    stockData: StockItem[];
    cylinderStock: CylinderStock[];
    drivers: Driver[];
    customers: Customer[];
    orders: Order[];
  };

  const readSnapshot = useCallback((): DashboardSnapshot | null => {
    try {
      const raw = sessionStorage.getItem(DASHBOARD_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as DashboardSnapshot;
      if (!parsed?.ts) return null;
      if (Date.now() - parsed.ts > DASHBOARD_CACHE_TTL_MS) return null;
      return parsed;
    } catch {
      return null;
    }
  }, []);

  const writeSnapshot = useCallback((snapshot: DashboardSnapshot) => {
    try {
      sessionStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify(snapshot));
    } catch {
      // ignore quota/serialization errors
    }
  }, []);

  const withTimeout = useCallback(async <T,>(promise: Promise<T>, ms: number): Promise<T> => {
    let t: number | undefined;
    const timeout = new Promise<never>((_, reject) => {
      t = window.setTimeout(() => reject(new Error('Dashboard fetch timeout')), ms);
    });
    try {
      return await Promise.race([promise, timeout]);
    } finally {
      if (t) window.clearTimeout(t);
    }
  }, []);

  // Retry wrapper for data fetches
  const withRetry = useCallback(async <T,>(
    fetchFn: () => Promise<T>, 
    retries = 3, 
    delayMs = 1000
  ): Promise<T> => {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        return await fetchFn();
      } catch (error) {
        lastError = error as Error;
        logger.warn(`Data fetch attempt ${attempt + 1}/${retries} failed`, { error });
        if (attempt < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, attempt)));
        }
      }
    }
    throw lastError;
  }, []);

  // Soft fetch - background refresh without loading spinner
  // Now with retry logic for better resilience
  const fetchData = useCallback(async (isSoftRefresh = false) => {
    try {
      if (isSoftRefresh) {
        setSoftLoading(true);
      }
      
      const today = new Date().toISOString().split('T')[0];
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Parallel fetch all data for faster loading - with retry wrapper
      const fetchAllData = () => Promise.all([
        supabase
          .from('pos_transactions')
          .select(`
            id,
            created_at,
            total,
            payment_method,
            payment_status,
            created_by,
            pos_transaction_items (
              product_name,
              quantity,
              unit_price,
              total_price
            )
          `)
          .order('created_at', { ascending: false })
          .limit(500),
        supabase.from('customers').select('*').order('name'),
        supabase
          .from('orders')
          .select(`
            id,
            order_number,
            customer_id,
            customer_name,
            total_amount,
            status,
            payment_status,
            delivery_address,
            driver_id,
            order_date,
            delivery_date,
            created_at,
            order_items (
              id,
              product_id,
              product_name,
              quantity,
              price
            )
          `)
          .order('created_at', { ascending: false })
          .limit(500),
        supabase.from('lpg_brands').select('*').eq('is_active', true),
        supabase.from('stoves').select('*').eq('is_active', true),
        supabase.from('user_roles').select('user_id, role').eq('role', 'manager') // Updated: no more driver role
      ]);

      // Apply retry and timeout
      const [
        transactionsResult,
        customerDataResult,
        ordersDataResult,
        lpgBrandsResult,
        stovesResult,
        userRolesResult
      ] = await withRetry(
        () => withTimeout(fetchAllData(), 10000), // 10s timeout per attempt
        3, // 3 retries
        1000 // 1s initial delay
      );

      const transactions = transactionsResult.data;
      const customerData = customerDataResult.data;
      const ordersData = ordersDataResult.data;
      const lpgBrands = lpgBrandsResult.data;
      const stoves = stovesResult.data;
      const userRoles = userRolesResult.data;

      const formattedSales: SalesData[] = transactions
        ? transactions.flatMap(txn =>
            (txn.pos_transaction_items || []).map((item: any) => ({
              id: `${txn.id}-${item.product_name}`,
              date: new Date(txn.created_at).toISOString().split('T')[0],
              productType: item.product_name?.toLowerCase().includes('stove') ? 'stove' as const :
                          item.product_name?.toLowerCase().includes('regulator') ? 'accessory' as const : 'cylinder' as const,
              productName: item.product_name || 'Unknown',
              quantity: item.quantity,
              unitPrice: Number(item.unit_price),
              totalAmount: Number(item.total_price),
              paymentMethod: txn.payment_method as any,
              staffId: txn.created_by || '',
              staffName: 'Staff',
              paymentStatus: txn.payment_status || 'paid'
            }))
          )
        : [];
      setSalesData(formattedSales);

      // Build customer activity from the orders we already fetched (no extra query)
      const customerOrderMap: Record<string, { count: number; lastOrder: string }> = {};
      (ordersData || []).forEach(o => {
        if (o.customer_id) {
          if (!customerOrderMap[o.customer_id]) {
            customerOrderMap[o.customer_id] = { count: 0, lastOrder: o.order_date };
          }
          customerOrderMap[o.customer_id].count += 1;
          // orders are sorted desc, so first seen is last order
        }
      });

      const formattedCustomers: Customer[] = (customerData || []).map(c => {
        const orderInfo = customerOrderMap[c.id];
        const lastOrderDate = orderInfo?.lastOrder ? new Date(orderInfo.lastOrder) : null;
        const isActive = lastOrderDate ? lastOrderDate >= new Date(thirtyDaysAgo) : false;

        return {
          id: c.id,
          name: c.name,
          phone: c.phone || '',
          address: c.address || '',
          totalOrders: orderInfo?.count || 0,
          lastOrder: orderInfo?.lastOrder || '',
          outstanding: Number(c.total_due) || 0,
          loyaltyPoints: 0,
          isActive
        };
      });
      setCustomers(formattedCustomers);

      const formattedOrders: Order[] = (ordersData || []).map(o => ({
        id: o.id,
        orderNumber: o.order_number,
        customerId: o.customer_id || '',
        customerName: o.customer_name,
        items: (o.order_items || []).map((item: any) => ({
          productId: item.product_id || '',
          productName: item.product_name,
          quantity: item.quantity,
          price: Number(item.price)
        })),
        totalAmount: Number(o.total_amount),
        status: o.status as Order['status'],
        paymentStatus: o.payment_status as Order['paymentStatus'],
        deliveryAddress: o.delivery_address,
        driverId: o.driver_id,
        orderDate: o.order_date,
        deliveryDate: o.delivery_date
      }));
      setOrders(formattedOrders);

      // Process stock
      const stockItems: StockItem[] = [];
      const cylinderItems: CylinderStock[] = [];
      
      if (lpgBrands) {
        lpgBrands.forEach(brand => {
          stockItems.push({
            id: brand.id,
            type: 'cylinder',
            name: `${brand.name} (${brand.size})`,
            currentStock: brand.refill_cylinder + brand.package_cylinder,
            minStock: 10,
            maxStock: 100,
            lastUpdated: brand.updated_at,
            price: 1200
          });
          
          cylinderItems.push({
            id: brand.id,
            brand: brand.name,
            size: brand.size,
            weight: brand.weight || '12kg',
            fullCylinders: brand.refill_cylinder + brand.package_cylinder,
            emptyCylinders: brand.empty_cylinder,
            problemCylinders: brand.problem_cylinder,
            packageCylinders: brand.package_cylinder
          });
        });
      }

      if (stoves) {
        stoves.forEach(stove => {
          stockItems.push({
            id: stove.id,
            type: 'stove',
            name: `${stove.brand} ${stove.model}`,
            currentStock: stove.quantity,
            minStock: 5,
            maxStock: 50,
            lastUpdated: stove.updated_at,
            price: Number(stove.price)
          });
        });
      }
      setStockData(stockItems);
      setCylinderStock(cylinderItems);

      // Process drivers
      let formattedDrivers: Driver[] = [];
      if (userRoles && userRoles.length > 0) {
        const driverUserIds = userRoles.map(ur => ur.user_id);
        const { data: driverProfiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, phone')
          .in('user_id', driverUserIds);

        const profileMap: Record<string, { name: string; phone: string }> = {};
        driverProfiles?.forEach(p => {
          profileMap[p.user_id] = {
            name: p.full_name || '',
            phone: p.phone || ''
          };
        });

        const driverStats: Record<string, { 
          sales: number; 
          deliveries: number; 
          stockOut: number;
          cashCollected: number;
        }> = {};
        
        // Use already-fetched ordersData for today's driver stats (no extra query)
        const todaysOrders = (ordersData || []).filter(o => {
          const d = new Date(o.order_date).toISOString().split('T')[0];
          return d === today;
        });

        todaysOrders.forEach(o => {
          if (o.driver_id) {
            if (!driverStats[o.driver_id]) {
              driverStats[o.driver_id] = { sales: 0, deliveries: 0, stockOut: 0, cashCollected: 0 };
            }
            driverStats[o.driver_id].sales += Number(o.total_amount);
            if (o.status === 'dispatched') {
              driverStats[o.driver_id].stockOut += 1;
            }
            if (o.status === 'delivered') {
              driverStats[o.driver_id].deliveries += 1;
              if (o.payment_status === 'paid') {
                driverStats[o.driver_id].cashCollected += Number(o.total_amount);
              }
            }
          }
        });

        formattedDrivers = userRoles.map((ur, index) => ({
          id: ur.user_id,
          name: profileMap[ur.user_id]?.name || `Driver ${index + 1}`,
          phone: profileMap[ur.user_id]?.phone || '01700-000000',
          vehicleId: `VH-00${index + 1}`,
          todaySales: driverStats[ur.user_id]?.sales || 0,
          todayDeliveries: driverStats[ur.user_id]?.deliveries || 0,
          status: 'active' as const,
          stockInHand: driverStats[ur.user_id]?.stockOut || 0,
          cashCollected: driverStats[ur.user_id]?.cashCollected || 0
        }));
        setDrivers(formattedDrivers);
      }

      // Update freshness tracking
      lastFetchTimeRef.current = Date.now();
      channelHealthyRef.current = true;

      // Persist snapshot for instant restore (tab discard / memory reclaim)
      writeSnapshot({
        ts: Date.now(),
        salesData: formattedSales,
        stockData: stockItems,
        cylinderStock: cylinderItems,
        drivers: formattedDrivers,
        customers: formattedCustomers,
        orders: formattedOrders,
      });

    } catch (error) {
      logger.error('Error fetching dashboard data', error, { component: 'Dashboard' });
    } finally {
      if (isInitialLoadRef.current) {
        setLoading(false);
        isInitialLoadRef.current = false;
      }
      setSoftLoading(false);
    }
  }, []);

  // Debounce ref for real-time updates - prevents excessive refetches
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  
  const debouncedRefetch = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      fetchData(true); // Soft refresh
    }, 2000); // 2-second debounce for smooth performance
  }, [fetchData]);

  // Reconnect channel if needed
  const reconnectChannel = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }
    
    const channel = supabase
      .channel('dashboard-combined-realtime-' + Date.now()) // Unique name for fresh connection
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, debouncedRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pos_transactions' }, debouncedRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lpg_brands' }, debouncedRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, debouncedRefetch)
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channelHealthyRef.current = true;
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          channelHealthyRef.current = false;
        }
      });
    
    channelRef.current = channel;
    return channel;
  }, [debouncedRefetch]);

  // Handle page visibility changes for instant tab-switch recovery
  // Extended stale threshold for better performance
  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'visible') {
      const timeSinceLastFetch = Date.now() - lastFetchTimeRef.current;
      const isStale = timeSinceLastFetch > 60000; // 60 seconds (extended from 30s)
      
      // Check if online before attempting refresh
      const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
      
      if (!online) {
        // Offline - don't attempt refresh, just rely on cache
        return;
      }
      
      // Always check channel health on return
      if (!channelHealthyRef.current) {
        reconnectChannel();
        fetchData(true); // Soft refresh
      } else if (isStale) {
        fetchData(true); // Soft refresh only if stale
      }
    }
  }, [fetchData, reconnectChannel]);

  // Setup visibility listener and initial channel
  useEffect(() => {
    // Restore cached snapshot immediately if available (prevents blank / stuck loader)
    const snapshot = readSnapshot();
    if (snapshot) {
      setSalesData(snapshot.salesData || []);
      setStockData(snapshot.stockData || []);
      setCylinderStock(snapshot.cylinderStock || []);
      setDrivers(snapshot.drivers || []);
      setCustomers(snapshot.customers || []);
      setOrders(snapshot.orders || []);
      lastFetchTimeRef.current = snapshot.ts;
      setLoading(false);
      isInitialLoadRef.current = false;
      fetchData(true); // background refresh
    } else {
      // Initial fetch
      fetchData();
    }
    
    // Create channel
    const channel = reconnectChannel();

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
      supabase.removeChannel(channel);
    };
  }, [fetchData, reconnectChannel, handleVisibilityChange]);

  // MEMOIZED Analytics calculations - prevents expensive recalculation on every render
  const analytics = useMemo((): DashboardAnalytics => {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    
    // Calculate today's revenue - Cash only (not credit/due)
    const todaysSales = salesData.filter(sale => sale.date === today);
    const todayCashRevenue = todaysSales
      .filter(sale => sale.paymentStatus === 'paid' || sale.paymentStatus === 'completed')
      .reduce((sum, sale) => sum + sale.totalAmount, 0);
    const todayDueRevenue = todaysSales
      .filter(sale => sale.paymentStatus === 'pending' || sale.paymentStatus === 'partial')
      .reduce((sum, sale) => sum + sale.totalAmount, 0);

    // Monthly revenue calculations
    const monthlyRevenue = salesData
      .filter(sale => {
        const saleDate = new Date(sale.date);
        return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
      })
      .reduce((sum, sale) => sum + sale.totalAmount, 0);

    const lastMonthRevenue = salesData
      .filter(sale => {
        const saleDate = new Date(sale.date);
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return saleDate.getMonth() === lastMonth.getMonth() && saleDate.getFullYear() === lastMonth.getFullYear();
      })
      .reduce((sum, sale) => sum + sale.totalAmount, 0);

    const monthlyGrowthPercent = lastMonthRevenue > 0 
      ? Math.round(((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
      : 0;

    // Cylinder stock health
    const totalFullCylinders = cylinderStock.reduce((sum, c) => sum + (c.fullCylinders || 0), 0);
    const totalEmptyCylinders = cylinderStock.reduce((sum, c) => sum + (c.emptyCylinders || 0), 0);
    const cylinderStockHealth: 'critical' | 'warning' | 'good' = 
      totalEmptyCylinders > totalFullCylinders ? 'critical' :
      totalFullCylinders < 20 ? 'warning' : 'good';

    // Customer metrics
    const activeCustomers = customers.filter(c => c.isActive).length;
    const lostCustomers = customers.filter(c => !c.isActive && c.totalOrders > 0).length;

    // Order metrics
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const dispatchedOrders = orders.filter(o => o.status === 'dispatched').length;

    return {
      todayRevenue: todayCashRevenue || 0,
      todayCashRevenue: todayCashRevenue || 0,
      todayDueRevenue: todayDueRevenue || 0,
      monthlyRevenue: monthlyRevenue || 0,
      lastMonthRevenue: lastMonthRevenue || 0,
      monthlyGrowthPercent: isNaN(monthlyGrowthPercent) ? 0 : monthlyGrowthPercent,
      
      lowStockItems: stockData.filter(item => item.currentStock <= item.minStock),
      totalFullCylinders: totalFullCylinders || 0,
      totalEmptyCylinders: totalEmptyCylinders || 0,
      cylinderStockHealth,
      
      activeOrders: orders.filter(order => ['pending', 'confirmed', 'dispatched'].includes(order.status)).length,
      pendingOrders: pendingOrders || 0,
      dispatchedOrders: dispatchedOrders || 0,
      
      totalCustomers: customers.length || 0,
      activeCustomers: activeCustomers || 0,
      lostCustomers: lostCustomers || 0,
      
      activeDrivers: drivers.filter(driver => driver.status === 'active').length,
    };
  }, [salesData, stockData, cylinderStock, customers, orders, drivers]);

  return {
    salesData,
    stockData,
    cylinderStock,
    drivers,
    customers,
    orders,
    vehicles,
    staff,
    analytics,
    loading,
    softLoading,
    refetch: fetchData,
    setSalesData,
    setStockData,
    setDrivers,
    setCustomers,
    setOrders,
  };
};
