import { useState, useEffect } from 'react';
import { 
  getRandomBangladeshiName, 
  getRandomBangladeshiLocation, 
  getRandomBangladeshiPhone,
  getRandomPaymentMethod,
  BANGLADESHI_LPG_PRODUCTS
} from '@/lib/bangladeshConstants';

// Mock data types
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

// Custom hook for dashboard data
export const useDashboardData = () => {
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [stockData, setStockData] = useState<StockItem[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock data generation
  useEffect(() => {
    const generateMockData = () => {
      // Generate mock sales data with Bangladeshi context
      const mockSales: SalesData[] = Array.from({ length: 50 }, (_, i) => {
        const product = BANGLADESHI_LPG_PRODUCTS[Math.floor(Math.random() * BANGLADESHI_LPG_PRODUCTS.length)];
        const paymentMethod = getRandomPaymentMethod();
        const quantity = Math.floor(Math.random() * 10) + 1;
        const unitPrice = product.standardPrice + (Math.random() * 200 - 100); // ±100 taka variation
        
        return {
          id: `sale-${i + 1}`,
          date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          productType: product.category as any,
          productName: product.name,
          quantity,
          unitPrice: Math.round(unitPrice),
          totalAmount: 0,
          paymentMethod: paymentMethod.id as any,
          staffId: `staff-${Math.floor(Math.random() * 5) + 1}`,
          staffName: getRandomBangladeshiName(),
        };
      });

      mockSales.forEach(sale => {
        sale.totalAmount = sale.quantity * sale.unitPrice;
      });

      // Generate mock stock data with Bangladeshi pricing (in Taka)
      const mockStock: StockItem[] = [
        { id: '1', type: 'cylinder', name: '5kg LPG Cylinder', currentStock: 45, minStock: 20, maxStock: 100, lastUpdated: new Date().toISOString(), price: 850 },
        { id: '2', type: 'cylinder', name: '12kg LPG Cylinder', currentStock: 78, minStock: 30, maxStock: 150, lastUpdated: new Date().toISOString(), price: 1200 },
        { id: '3', type: 'cylinder', name: '35kg Commercial Cylinder', currentStock: 25, minStock: 15, maxStock: 80, lastUpdated: new Date().toISOString(), price: 3200 },
        { id: '4', type: 'stove', name: '2 Burner Gas Stove', currentStock: 15, minStock: 10, maxStock: 50, lastUpdated: new Date().toISOString(), price: 4500 },
        { id: '5', type: 'stove', name: '3 Burner Gas Stove', currentStock: 8, minStock: 5, maxStock: 30, lastUpdated: new Date().toISOString(), price: 6500 },
        { id: '6', type: 'stove', name: '4 Burner Gas Stove', currentStock: 12, minStock: 8, maxStock: 25, lastUpdated: new Date().toISOString(), price: 8500 },
      ];

      // Generate mock drivers with Bangladeshi names and numbers
      const mockDrivers: Driver[] = [
        { id: '1', name: 'Abdul Rahman', phone: getRandomBangladeshiPhone(), vehicleId: 'DH-001', todaySales: 18000, todayDeliveries: 12, status: 'active' },
        { id: '2', name: 'Mohammad Karim', phone: getRandomBangladeshiPhone(), vehicleId: 'DH-002', todaySales: 12500, todayDeliveries: 8, status: 'active' },
        { id: '3', name: 'Rafiq Ahmed', phone: getRandomBangladeshiPhone(), vehicleId: 'CTG-003', todaySales: 15000, todayDeliveries: 10, status: 'break' },
        { id: '4', name: 'Nasir Uddin', phone: getRandomBangladeshiPhone(), vehicleId: 'SYL-004', todaySales: 8500, todayDeliveries: 6, status: 'offline' },
      ];

      // Generate mock customers with Bangladeshi context
      const mockCustomers: Customer[] = Array.from({ length: 20 }, (_, i) => ({
        id: `cust-${i + 1}`,
        name: getRandomBangladeshiName(),
        phone: getRandomBangladeshiPhone(),
        address: getRandomBangladeshiLocation(),
        totalOrders: Math.floor(Math.random() * 50) + 5,
        lastOrder: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        outstanding: Math.floor(Math.random() * 8000), // Higher amounts in Taka
        loyaltyPoints: Math.floor(Math.random() * 1500),
      }));

      setSalesData(mockSales);
      setStockData(mockStock);
      setDrivers(mockDrivers);
      setCustomers(mockCustomers);
      setLoading(false);
    };

    generateMockData();
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