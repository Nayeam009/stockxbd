import { useState, useEffect, useCallback } from 'react';
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

  const fetchData = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Fetch POS transactions for sales data with payment status
      const { data: transactions } = await supabase
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
        .limit(500);

      if (transactions) {
        const formattedSales: SalesData[] = transactions.flatMap(txn => 
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
        );
        setSalesData(formattedSales);
      }

      // Fetch customers with order activity
      const { data: customerData } = await supabase
        .from('customers')
        .select('*')
        .order('name');

      if (customerData) {
        // Get order counts and last order dates
        const { data: orderStats } = await supabase
          .from('orders')
          .select('customer_id, order_date')
          .order('order_date', { ascending: false });

        const customerOrderMap: Record<string, { count: number; lastOrder: string }> = {};
        orderStats?.forEach(o => {
          if (o.customer_id) {
            if (!customerOrderMap[o.customer_id]) {
              customerOrderMap[o.customer_id] = { count: 0, lastOrder: o.order_date };
            }
            customerOrderMap[o.customer_id].count += 1;
          }
        });

        const formattedCustomers: Customer[] = customerData.map(c => {
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
      }

      // Fetch orders
      const { data: ordersData } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            product_id,
            product_name,
            quantity,
            price
          )
        `)
        .order('created_at', { ascending: false });

      if (ordersData) {
        const formattedOrders: Order[] = ordersData.map(o => ({
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
      }

      // Fetch LPG stock with detailed cylinder counts
      const { data: lpgBrands } = await supabase
        .from('lpg_brands')
        .select('*')
        .eq('is_active', true);

      const { data: stoves } = await supabase
        .from('stoves')
        .select('*')
        .eq('is_active', true);

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

      // Fetch drivers with stock and cash tracking
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('role', 'driver');

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

        // Get today's orders per driver
        const { data: todayOrders } = await supabase
          .from('orders')
          .select('driver_id, total_amount, status, payment_status')
          .gte('order_date', `${today}T00:00:00`)
          .lte('order_date', `${today}T23:59:59`);

        const driverStats: Record<string, { 
          sales: number; 
          deliveries: number; 
          stockOut: number;
          cashCollected: number;
        }> = {};
        
        todayOrders?.forEach(o => {
          if (o.driver_id) {
            if (!driverStats[o.driver_id]) {
              driverStats[o.driver_id] = { sales: 0, deliveries: 0, stockOut: 0, cashCollected: 0 };
            }
            driverStats[o.driver_id].sales += Number(o.total_amount);
            if (o.status === 'dispatched') {
              driverStats[o.driver_id].stockOut += 1; // Cylinders currently out
            }
            if (o.status === 'delivered') {
              driverStats[o.driver_id].deliveries += 1;
              if (o.payment_status === 'paid') {
                driverStats[o.driver_id].cashCollected += Number(o.total_amount);
              }
            }
          }
        });

        const formattedDrivers: Driver[] = userRoles.map((ur, index) => ({
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

    } catch (error) {
      logger.error('Error fetching dashboard data', error, { component: 'Dashboard' });
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch real data from Supabase with full real-time sync
  useEffect(() => {
    fetchData();

    // Subscribe to realtime updates for all critical tables
    const channels = [
      supabase.channel('dashboard-orders-realtime').on('postgres_changes', 
        { event: '*', schema: 'public', table: 'orders' }, 
        () => fetchData()
      ).subscribe(),
      supabase.channel('dashboard-pos-realtime').on('postgres_changes', 
        { event: '*', schema: 'public', table: 'pos_transactions' }, 
        () => fetchData()
      ).subscribe(),
      supabase.channel('dashboard-lpg-realtime').on('postgres_changes', 
        { event: '*', schema: 'public', table: 'lpg_brands' }, 
        () => fetchData()
      ).subscribe(),
      supabase.channel('dashboard-customers-realtime').on('postgres_changes', 
        { event: '*', schema: 'public', table: 'customers' }, 
        () => fetchData()
      ).subscribe(),
    ];

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [fetchData]);

  // Analytics calculations with LPG business logic
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

  const analytics: DashboardAnalytics = {
    todayRevenue: todayCashRevenue || 0, // Only cash received
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
    refetch: fetchData,
    setSalesData,
    setStockData,
    setDrivers,
    setCustomers,
    setOrders,
  };
};
