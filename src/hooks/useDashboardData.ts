import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

export interface Driver {
  id: string;
  name: string;
  phone: string;
  vehicleId: string;
  todaySales: number;
  todayDeliveries: number;
  status: 'active' | 'break' | 'offline';
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

export const useDashboardData = () => {
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [stockData, setStockData] = useState<StockItem[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch real data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch POS transactions for sales data
        const { data: transactions } = await supabase
          .from('pos_transactions')
          .select(`
            id,
            created_at,
            total,
            payment_method,
            created_by,
            pos_transaction_items (
              product_name,
              quantity,
              unit_price,
              total_price
            )
          `)
          .order('created_at', { ascending: false })
          .limit(100);

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
              staffName: 'Staff'
            }))
          );
          setSalesData(formattedSales);
        }

        // Fetch customers
        const { data: customerData } = await supabase
          .from('customers')
          .select('*')
          .order('name');

        if (customerData) {
          // Count orders for each customer
          const { data: orderCounts } = await supabase
            .from('orders')
            .select('customer_id');

          const orderCountMap: Record<string, number> = {};
          orderCounts?.forEach(o => {
            if (o.customer_id) {
              orderCountMap[o.customer_id] = (orderCountMap[o.customer_id] || 0) + 1;
            }
          });

          const formattedCustomers: Customer[] = customerData.map(c => ({
            id: c.id,
            name: c.name,
            phone: c.phone || '',
            address: c.address || '',
            totalOrders: orderCountMap[c.id] || 0,
            lastOrder: new Date().toISOString().split('T')[0],
            outstanding: 0,
            loyaltyPoints: 0
          }));
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

        // Fetch LPG stock for stock data
        const { data: lpgBrands } = await supabase
          .from('lpg_brands')
          .select('*')
          .eq('is_active', true);

        const { data: stoves } = await supabase
          .from('stoves')
          .select('*')
          .eq('is_active', true);

        const stockItems: StockItem[] = [];
        
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

        // Fetch user roles to build drivers list
        const { data: userRoles } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .eq('role', 'driver');

        if (userRoles && userRoles.length > 0) {
          // Fetch profile names for drivers
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

          // Get today's deliveries per driver
          const today = new Date().toISOString().split('T')[0];
          const { data: todayOrders } = await supabase
            .from('orders')
            .select('driver_id, total_amount, status')
            .gte('order_date', `${today}T00:00:00`)
            .lte('order_date', `${today}T23:59:59`);

          const driverStats: Record<string, { sales: number; deliveries: number }> = {};
          todayOrders?.forEach(o => {
            if (o.driver_id) {
              if (!driverStats[o.driver_id]) {
                driverStats[o.driver_id] = { sales: 0, deliveries: 0 };
              }
              driverStats[o.driver_id].sales += Number(o.total_amount);
              if (o.status === 'delivered') {
                driverStats[o.driver_id].deliveries += 1;
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
            status: 'active' as const
          }));
          setDrivers(formattedDrivers);
        }

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Subscribe to realtime updates for orders
    const ordersChannel = supabase
      .channel('orders-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
    };
  }, []);

  // Analytics calculations
  const analytics = {
    todayRevenue: salesData
      .filter(sale => sale.date === new Date().toISOString().split('T')[0])
      .reduce((sum, sale) => sum + sale.totalAmount, 0),
    
    monthlyRevenue: salesData
      .filter(sale => {
        const saleDate = new Date(sale.date);
        const now = new Date();
        return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
      })
      .reduce((sum, sale) => sum + sale.totalAmount, 0),
    
    lowStockItems: stockData.filter(item => item.currentStock <= item.minStock),
    
    activeOrders: orders.filter(order => ['pending', 'confirmed', 'dispatched'].includes(order.status)).length,
    
    totalCustomers: customers.length,
    
    activeDrivers: drivers.filter(driver => driver.status === 'active').length,
  };

  return {
    salesData,
    stockData,
    drivers,
    customers,
    orders,
    vehicles,
    staff,
    analytics,
    loading,
    setSalesData,
    setStockData,
    setDrivers,
    setCustomers,
    setOrders,
  };
};
