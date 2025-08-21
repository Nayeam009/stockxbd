import { useState, useEffect } from 'react';

// Mock data types
export interface SalesData {
  id: string;
  date: string;
  productType: 'cylinder' | 'stove' | 'accessory';
  productName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  paymentMethod: 'cash' | 'card' | 'upi' | 'credit';
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
      // Generate mock sales data
      const mockSales: SalesData[] = Array.from({ length: 50 }, (_, i) => ({
        id: `sale-${i + 1}`,
        date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        productType: ['cylinder', 'stove', 'accessory'][Math.floor(Math.random() * 3)] as any,
        productName: ['5kg Cylinder', '12kg Cylinder', '35kg Cylinder', 'Gas Stove', 'Regulator'][Math.floor(Math.random() * 5)],
        quantity: Math.floor(Math.random() * 10) + 1,
        unitPrice: Math.floor(Math.random() * 1000) + 500,
        totalAmount: 0,
        paymentMethod: ['cash', 'card', 'upi', 'credit'][Math.floor(Math.random() * 4)] as any,
        staffId: `staff-${Math.floor(Math.random() * 5) + 1}`,
        staffName: ['Raj Kumar', 'Priya Singh', 'Amit Sharma', 'Sunita Devi', 'Rohit Gupta'][Math.floor(Math.random() * 5)],
      }));

      mockSales.forEach(sale => {
        sale.totalAmount = sale.quantity * sale.unitPrice;
      });

      // Generate mock stock data
      const mockStock: StockItem[] = [
        { id: '1', type: 'cylinder', name: '5kg LPG Cylinder', currentStock: 45, minStock: 20, maxStock: 100, lastUpdated: new Date().toISOString(), price: 650 },
        { id: '2', type: 'cylinder', name: '12kg LPG Cylinder', currentStock: 78, minStock: 30, maxStock: 150, lastUpdated: new Date().toISOString(), price: 950 },
        { id: '3', type: 'cylinder', name: '35kg Commercial Cylinder', currentStock: 25, minStock: 15, maxStock: 80, lastUpdated: new Date().toISOString(), price: 2500 },
        { id: '4', type: 'stove', name: '2 Burner Gas Stove', currentStock: 15, minStock: 10, maxStock: 50, lastUpdated: new Date().toISOString(), price: 3500 },
        { id: '5', type: 'stove', name: '3 Burner Gas Stove', currentStock: 8, minStock: 5, maxStock: 30, lastUpdated: new Date().toISOString(), price: 5500 },
        { id: '6', type: 'stove', name: '4 Burner Gas Stove', currentStock: 12, minStock: 8, maxStock: 25, lastUpdated: new Date().toISOString(), price: 7500 },
      ];

      // Generate mock drivers
      const mockDrivers: Driver[] = [
        { id: '1', name: 'Rajesh Kumar', phone: '+91 9876543210', vehicleId: 'VH001', todaySales: 15000, todayDeliveries: 12, status: 'active' },
        { id: '2', name: 'Suresh Singh', phone: '+91 9876543211', vehicleId: 'VH002', todaySales: 8500, todayDeliveries: 7, status: 'active' },
        { id: '3', name: 'Amit Sharma', phone: '+91 9876543212', vehicleId: 'VH003', todaySales: 12000, todayDeliveries: 9, status: 'break' },
        { id: '4', name: 'Vinod Gupta', phone: '+91 9876543213', vehicleId: 'VH004', todaySales: 6000, todayDeliveries: 5, status: 'offline' },
      ];

      // Generate mock customers
      const mockCustomers: Customer[] = Array.from({ length: 20 }, (_, i) => ({
        id: `cust-${i + 1}`,
        name: ['Rakesh Patel', 'Sunita Sharma', 'Anil Kumar', 'Priya Singh', 'Mohit Gupta'][i % 5],
        phone: `+91 98765432${10 + i}`,
        address: `${i + 1}, Sector ${Math.floor(i / 5) + 1}, Gurgaon`,
        totalOrders: Math.floor(Math.random() * 50) + 5,
        lastOrder: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        outstanding: Math.floor(Math.random() * 5000),
        loyaltyPoints: Math.floor(Math.random() * 1000),
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