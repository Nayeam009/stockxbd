import { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { 
  Search, 
  Download, 
  FileText,
  Users,
  Package,
  Truck,
  BarChart3,
  Calendar,
  DollarSign,
  Loader2,
  X,
  ChefHat,
  Wrench,
  Flame,
  Home,
  Receipt,
  Wallet,
  RefreshCw,
  Tag,
  Settings,
  Plus,
  ArrowRight,
  Command as CommandIcon,
  Banknote,
  CreditCard,
  FileSpreadsheet,
  UserPlus,
  PackagePlus,
  TrendingUp,
  Clock,
  Keyboard
} from "lucide-react";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
import { SalesData, Customer, StockItem, Driver } from "@/hooks/useDashboardData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsMobile } from "@/hooks/use-mobile";

interface SearchModuleProps {
  salesData: SalesData[];
  customers: Customer[];
  stockData: StockItem[];
  drivers: Driver[];
  userRole: string;
}

interface ReportData {
  title: string;
  headers: string[];
  rows: any[][];
  summary?: { label: string; value: string }[];
}

interface NavigationItem {
  id: string;
  title: string;
  description: string;
  icon: any;
  category: 'page' | 'action' | 'form' | 'report';
  roles: string[];
  keywords: string[];
}

interface SearchResult {
  type: 'navigation' | 'action' | 'customer' | 'sale' | 'stock' | 'driver' | 'staff' | 'vehicle';
  id: string;
  title: string;
  subtitle: string;
  meta?: string;
  icon: any;
  action?: () => void;
  data?: any;
}

export const SearchModule = ({ salesData, customers, stockData, drivers, userRole }: SearchModuleProps) => {
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCategory, setSearchCategory] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [currentReport, setCurrentReport] = useState<ReportData | null>(null);
  const [activeReportTab, setActiveReportTab] = useState("preview");
  const [commandOpen, setCommandOpen] = useState(false);
  const [staffData, setStaffData] = useState<any[]>([]);
  const [vehicleData, setVehicleData] = useState<any[]>([]);

  // Fetch additional data for search
  useEffect(() => {
    const fetchAdditionalData = async () => {
      const [staffResult, vehicleResult] = await Promise.all([
        supabase.from("staff").select("*").eq("is_active", true),
        supabase.from("vehicles").select("*").eq("is_active", true)
      ]);
      if (staffResult.data) setStaffData(staffResult.data);
      if (vehicleResult.data) setVehicleData(vehicleResult.data);
    };
    fetchAdditionalData();
  }, []);

  // Navigation items based on role
  const navigationItems: NavigationItem[] = useMemo((): NavigationItem[] => [
    { id: 'overview', title: 'Dashboard Overview', description: 'Main dashboard with KPIs and quick actions', icon: Home, category: 'page' as const, roles: ['owner', 'manager', 'driver'], keywords: ['home', 'dashboard', 'overview', 'main', 'kpi', 'summary'] },
    { id: 'pos', title: 'Point of Sale (POS)', description: 'Create new sales transactions', icon: Receipt, category: 'page' as const, roles: ['owner', 'manager', 'driver'], keywords: ['pos', 'sale', 'sell', 'transaction', 'billing', 'invoice', 'cash'] },
    { id: 'daily-sales', title: 'Daily Sales', description: 'View and manage daily sales records', icon: BarChart3, category: 'page' as const, roles: ['owner', 'manager'], keywords: ['sales', 'daily', 'revenue', 'transactions', 'records'] },
    { id: 'daily-expenses', title: 'Daily Expenses', description: 'Track and manage daily expenses', icon: Wallet, category: 'page' as const, roles: ['owner', 'manager'], keywords: ['expenses', 'cost', 'spending', 'money out', 'bills'] },
    { id: 'analytics', title: 'Business Analytics', description: 'View business performance and analytics', icon: TrendingUp, category: 'page' as const, roles: ['owner', 'manager'], keywords: ['analytics', 'reports', 'charts', 'performance', 'profit', 'loss'] },
    { id: 'lpg-stock', title: 'LPG Stock (22mm)', description: 'Manage LPG cylinder inventory - 22mm valves', icon: Flame, category: 'page' as const, roles: ['owner', 'manager'], keywords: ['lpg', 'gas', 'cylinder', 'stock', 'inventory', '22mm', 'bashundhara', 'omera'] },
    { id: 'lpg-stock-20mm', title: 'LPG Stock (20mm)', description: 'Manage LPG cylinder inventory - 20mm valves', icon: Flame, category: 'page' as const, roles: ['owner', 'manager'], keywords: ['lpg', 'gas', 'cylinder', 'stock', 'inventory', '20mm', 'totalgaz'] },
    { id: 'stove-stock', title: 'Gas Stove Inventory', description: 'Manage gas stove stock', icon: ChefHat, category: 'page' as const, roles: ['owner', 'manager'], keywords: ['stove', 'cooker', 'burner', 'kitchen', 'appliance'] },
    { id: 'regulators', title: 'Regulators Inventory', description: 'Manage regulator stock', icon: Wrench, category: 'page' as const, roles: ['owner', 'manager'], keywords: ['regulator', 'valve', 'accessory', '20mm', '22mm'] },
    { id: 'product-pricing', title: 'Product Pricing', description: 'Set and manage product prices', icon: Tag, category: 'page' as const, roles: ['owner', 'manager'], keywords: ['price', 'pricing', 'cost', 'rate', 'company', 'retail', 'wholesale'] },
    { id: 'orders', title: 'Online Delivery Orders', description: 'Manage delivery orders and tracking', icon: Truck, category: 'page' as const, roles: ['owner', 'manager', 'driver'], keywords: ['order', 'delivery', 'online', 'tracking', 'dispatch'] },
    { id: 'exchange', title: 'Cylinder Exchange', description: 'Dealer-to-dealer cylinder exchange', icon: RefreshCw, category: 'page' as const, roles: ['owner', 'manager', 'driver'], keywords: ['exchange', 'swap', 'dealer', 'cylinder', 'transfer'] },
    { id: 'customers', title: 'Customer Management', description: 'Manage customers, dues, and payments', icon: Users, category: 'page' as const, roles: ['owner', 'manager'], keywords: ['customer', 'client', 'due', 'baki', 'payment', 'credit', 'debt'] },
    { id: 'staff-salary', title: 'Staff Salary', description: 'Manage staff and salary payments', icon: Banknote, category: 'page' as const, roles: ['owner', 'manager'], keywords: ['staff', 'employee', 'salary', 'payment', 'payroll', 'wage'] },
    { id: 'vehicle-cost', title: 'Vehicle Costs', description: 'Track vehicle expenses and maintenance', icon: Truck, category: 'page' as const, roles: ['owner', 'manager'], keywords: ['vehicle', 'fuel', 'maintenance', 'cost', 'diesel', 'petrol'] },
    { id: 'community', title: 'Community Forum', description: 'Connect with other LPG dealers', icon: Users, category: 'page' as const, roles: ['owner', 'manager', 'driver'], keywords: ['community', 'forum', 'discussion', 'post', 'share'] },
    { id: 'settings', title: 'Settings', description: 'System settings and configuration', icon: Settings, category: 'page' as const, roles: ['owner', 'manager'], keywords: ['settings', 'config', 'preference', 'system', 'backup', 'team'] },
    { id: 'profile', title: 'My Profile', description: 'View and edit your profile', icon: Users, category: 'page' as const, roles: ['owner', 'manager', 'driver'], keywords: ['profile', 'account', 'user', 'me', 'my'] },
    { id: 'action-new-sale', title: 'Create New Sale', description: 'Start a new POS transaction', icon: Plus, category: 'action' as const, roles: ['owner', 'manager', 'driver'], keywords: ['new', 'sale', 'create', 'add', 'transaction'] },
    { id: 'action-add-customer', title: 'Add New Customer', description: 'Register a new customer', icon: UserPlus, category: 'action' as const, roles: ['owner', 'manager'], keywords: ['add', 'new', 'customer', 'register', 'create'] },
    { id: 'action-add-expense', title: 'Add Expense', description: 'Record a new expense', icon: Wallet, category: 'action' as const, roles: ['owner', 'manager'], keywords: ['add', 'expense', 'cost', 'spending', 'record'] },
    { id: 'action-add-stock', title: 'Add New Stock', description: 'Add new LPG brand/stock', icon: PackagePlus, category: 'action' as const, roles: ['owner', 'manager'], keywords: ['add', 'stock', 'inventory', 'brand', 'new'] },
    { id: 'action-pay-salary', title: 'Pay Staff Salary', description: 'Make salary payment to staff', icon: CreditCard, category: 'action' as const, roles: ['owner', 'manager'], keywords: ['pay', 'salary', 'staff', 'payment', 'wage'] },
    { id: 'action-collect-due', title: 'Collect Customer Due', description: 'Settle customer dues', icon: DollarSign, category: 'action' as const, roles: ['owner', 'manager'], keywords: ['collect', 'due', 'payment', 'settle', 'customer', 'baki'] },
    { id: 'report-daily-sales', title: 'Daily Sales Report', description: 'Generate today\'s sales report', icon: FileText, category: 'report' as const, roles: ['owner', 'manager'], keywords: ['report', 'daily', 'sales', 'today'] },
    { id: 'report-stock-status', title: 'Stock Status Report', description: 'Current inventory levels', icon: Package, category: 'report' as const, roles: ['owner', 'manager'], keywords: ['report', 'stock', 'inventory', 'status', 'levels'] },
    { id: 'report-customer-dues', title: 'Customer Dues Report', description: 'Outstanding customer payments', icon: Users, category: 'report' as const, roles: ['owner', 'manager'], keywords: ['report', 'customer', 'due', 'outstanding', 'baki'] },
    { id: 'report-financial', title: 'Financial Summary', description: 'Income vs expenses summary', icon: DollarSign, category: 'report' as const, roles: ['owner'], keywords: ['report', 'financial', 'summary', 'profit', 'loss'] },
    { id: 'report-monthly', title: 'Monthly Report', description: 'Monthly business breakdown', icon: Calendar, category: 'report' as const, roles: ['owner', 'manager'], keywords: ['report', 'monthly', 'month', 'breakdown'] },
  ].filter(item => item.roles.includes(userRole)), [userRole]);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("recentSearches");
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading recent searches:", e);
      }
    }
  }, []);

  // Keyboard shortcut for command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Save search to history
  const saveSearch = useCallback((query: string) => {
    if (!query.trim()) return;
    setRecentSearches(prev => {
      const updated = [query, ...prev.filter(s => s !== query)].slice(0, 10);
      localStorage.setItem("recentSearches", JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Navigate to module
  const navigateToModule = useCallback((moduleId: string) => {
    console.log("Navigating to module:", moduleId);
    const event = new CustomEvent('navigate-module', { detail: { moduleId } });
    window.dispatchEvent(event);
    setCommandOpen(false);
    setSearchQuery("");
    toast.success(`Navigating to ${moduleId.replace(/-/g, ' ')}`);
  }, []);

  // Generate report handler
  const generateReport = useCallback(async (type: string) => {
    setIsGeneratingReport(true);
    setCommandOpen(false);
    try {
      let report: ReportData;
      
      switch (type) {
        case 'daily-sales':
          report = await generateDailySalesReport();
          break;
        case 'stock-status':
          report = await generateStockReport();
          break;
        case 'customer-analysis':
          report = await generateCustomerReport();
          break;
        case 'financial-summary':
          report = await generateFinancialReport();
          break;
        case 'monthly-report':
          report = await generateMonthlyReport();
          break;
        default:
          throw new Error('Unknown report type');
      }

      setCurrentReport(report);
      setReportDialogOpen(true);
      toast.success('Report generated successfully');
    } catch (error) {
      console.error('Report generation error:', error);
      toast.error('Failed to generate report');
    } finally {
      setIsGeneratingReport(false);
    }
  }, []);

  // Handle action execution
  const handleAction = useCallback((actionId: string) => {
    console.log("Handling action:", actionId);
    setCommandOpen(false);
    
    switch (actionId) {
      case 'action-new-sale':
        navigateToModule('pos');
        break;
      case 'action-add-customer':
        navigateToModule('customers');
        setTimeout(() => toast.info('Click "Add Customer" to register a new customer'), 500);
        break;
      case 'action-add-expense':
        navigateToModule('daily-expenses');
        setTimeout(() => toast.info('Click "Add Expense" to record a new expense'), 500);
        break;
      case 'action-add-stock':
        navigateToModule('lpg-stock');
        setTimeout(() => toast.info('Click "Add Brand" to add new stock'), 500);
        break;
      case 'action-pay-salary':
        navigateToModule('staff-salary');
        setTimeout(() => toast.info('Click "Pay" on a staff member to make payment'), 500);
        break;
      case 'action-collect-due':
        navigateToModule('customers');
        setTimeout(() => toast.info('Click "Settle Account" on a customer to collect dues'), 500);
        break;
      case 'report-daily-sales':
        generateReport('daily-sales');
        break;
      case 'report-stock-status':
        generateReport('stock-status');
        break;
      case 'report-customer-dues':
        generateReport('customer-analysis');
        break;
      case 'report-financial':
        generateReport('financial-summary');
        break;
      case 'report-monthly':
        generateReport('monthly-report');
        break;
      default:
        // Navigate to the page
        navigateToModule(actionId);
    }
  }, [navigateToModule, generateReport]);

  // Combined search results for main search
  const searchResults = useMemo((): SearchResult[] => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase();
    const results: SearchResult[] = [];

    // Search in navigation items
    if (searchCategory === "all" || searchCategory === "navigation") {
      navigationItems.forEach(item => {
        const matchesTitle = item.title.toLowerCase().includes(query);
        const matchesDesc = item.description.toLowerCase().includes(query);
        const matchesKeywords = item.keywords.some(k => k.includes(query));
        
        if (matchesTitle || matchesDesc || matchesKeywords) {
          results.push({
            type: 'navigation',
            id: item.id,
            title: item.title,
            subtitle: item.description,
            meta: item.category === 'action' ? 'Quick Action' : item.category === 'report' ? 'Report' : 'Page',
            icon: item.icon,
            action: () => handleAction(item.id)
          });
        }
      });
    }

    // Search in customers
    if (searchCategory === "all" || searchCategory === "customers") {
      customers.forEach(customer => {
        if (
          customer.name.toLowerCase().includes(query) ||
          customer.phone.includes(query) ||
          customer.address.toLowerCase().includes(query)
        ) {
          results.push({
            type: 'customer',
            id: customer.id,
            title: customer.name,
            subtitle: customer.phone,
            meta: `${customer.totalOrders} orders | ${BANGLADESHI_CURRENCY_SYMBOL}${customer.outstanding} due`,
            icon: Users,
            action: () => navigateToModule('customers'),
            data: customer
          });
        }
      });
    }

    // Search in sales data
    if (searchCategory === "all" || searchCategory === "sales") {
      salesData.forEach(sale => {
        if (
          sale.productName.toLowerCase().includes(query) ||
          sale.staffName.toLowerCase().includes(query) ||
          sale.id.toLowerCase().includes(query)
        ) {
          results.push({
            type: 'sale',
            id: sale.id,
            title: `Sale: ${sale.productName}`,
            subtitle: `${sale.quantity}x - ${BANGLADESHI_CURRENCY_SYMBOL}${sale.totalAmount.toLocaleString()}`,
            meta: `${sale.date} | ${sale.staffName}`,
            icon: FileText,
            action: () => navigateToModule('daily-sales'),
            data: sale
          });
        }
      });
    }

    // Search in stock
    if (searchCategory === "all" || searchCategory === "stock") {
      stockData.forEach(item => {
        if (item.name.toLowerCase().includes(query)) {
          results.push({
            type: 'stock',
            id: item.id,
            title: item.name,
            subtitle: `${item.currentStock} units @ ${BANGLADESHI_CURRENCY_SYMBOL}${item.price}`,
            meta: item.type,
            icon: item.type === 'cylinder' ? Flame : ChefHat,
            action: () => navigateToModule('lpg-stock'),
            data: item
          });
        }
      });
    }

    // Search in drivers (if role allows)
    if ((userRole === 'owner' || userRole === 'manager') && (searchCategory === "all" || searchCategory === "drivers")) {
      drivers.forEach(driver => {
        if (
          driver.name.toLowerCase().includes(query) ||
          driver.phone.includes(query) ||
          driver.vehicleId.toLowerCase().includes(query)
        ) {
          results.push({
            type: 'driver',
            id: driver.id,
            title: driver.name,
            subtitle: driver.phone,
            meta: `${driver.todayDeliveries} deliveries | Vehicle: ${driver.vehicleId}`,
            icon: Truck,
            action: () => navigateToModule('orders'),
            data: driver
          });
        }
      });
    }

    // Search in staff
    if ((userRole === 'owner' || userRole === 'manager') && (searchCategory === "all" || searchCategory === "staff")) {
      staffData.forEach(staff => {
        if (
          staff.name.toLowerCase().includes(query) ||
          (staff.phone && staff.phone.includes(query)) ||
          staff.role.toLowerCase().includes(query)
        ) {
          results.push({
            type: 'staff',
            id: staff.id,
            title: staff.name,
            subtitle: staff.role,
            meta: `${BANGLADESHI_CURRENCY_SYMBOL}${staff.salary} salary`,
            icon: Banknote,
            action: () => navigateToModule('staff-salary'),
            data: staff
          });
        }
      });
    }

    // Search in vehicles
    if ((userRole === 'owner' || userRole === 'manager') && (searchCategory === "all" || searchCategory === "vehicles")) {
      vehicleData.forEach(vehicle => {
        if (
          vehicle.name.toLowerCase().includes(query) ||
          (vehicle.license_plate && vehicle.license_plate.toLowerCase().includes(query))
        ) {
          results.push({
            type: 'vehicle',
            id: vehicle.id,
            title: vehicle.name,
            subtitle: vehicle.license_plate || 'No plate',
            meta: 'Vehicle',
            icon: Truck,
            action: () => navigateToModule('vehicle-cost'),
            data: vehicle
          });
        }
      });
    }

    // Save to history on search
    if (results.length > 0 && query.length > 2) {
      saveSearch(searchQuery);
    }

    return results;
  }, [searchQuery, searchCategory, salesData, customers, stockData, drivers, staffData, vehicleData, userRole, navigationItems, handleAction, navigateToModule, saveSearch]);

  // Generate Daily Sales Report
  const generateDailySalesReport = async (): Promise<ReportData> => {
    const today = format(new Date(), 'yyyy-MM-dd');
    
    const { data: transactions, error } = await supabase
      .from("pos_transactions")
      .select(`*, pos_transaction_items (*)`)
      .gte("created_at", `${today}T00:00:00`)
      .lte("created_at", `${today}T23:59:59`)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const rows = transactions?.map((t, i) => [
      i + 1,
      t.transaction_number,
      format(new Date(t.created_at), 'hh:mm a'),
      t.payment_method,
      `${BANGLADESHI_CURRENCY_SYMBOL}${t.subtotal}`,
      `${BANGLADESHI_CURRENCY_SYMBOL}${t.discount}`,
      `${BANGLADESHI_CURRENCY_SYMBOL}${t.total}`,
      t.payment_status
    ]) || [];

    const totalSales = transactions?.reduce((sum, t) => sum + Number(t.total), 0) || 0;
    const totalDiscount = transactions?.reduce((sum, t) => sum + Number(t.discount), 0) || 0;

    return {
      title: `Daily Sales Report - ${format(new Date(), 'dd MMM yyyy')}`,
      headers: ['#', 'Transaction', 'Time', 'Payment', 'Subtotal', 'Discount', 'Total', 'Status'],
      rows,
      summary: [
        { label: 'Total Transactions', value: String(transactions?.length || 0) },
        { label: 'Total Sales', value: `${BANGLADESHI_CURRENCY_SYMBOL}${totalSales.toLocaleString()}` },
        { label: 'Total Discount', value: `${BANGLADESHI_CURRENCY_SYMBOL}${totalDiscount.toLocaleString()}` },
      ]
    };
  };

  // Generate Stock Status Report
  const generateStockReport = async (): Promise<ReportData> => {
    const [lpgResult, stoveResult, regulatorResult] = await Promise.all([
      supabase.from("lpg_brands").select("*").eq("is_active", true),
      supabase.from("stoves").select("*").eq("is_active", true),
      supabase.from("regulators").select("*").eq("is_active", true)
    ]);

    const lpgRows = lpgResult.data?.map((b, i) => {
      const total = b.package_cylinder + b.refill_cylinder;
      const status = total === 0 ? "Out of Stock" : total < 30 ? "Low Stock" : "In Stock";
      return [i + 1, b.name, 'LPG Cylinder', `${b.size} - ${b.weight}`, b.package_cylinder, b.refill_cylinder, total, status];
    }) || [];

    const stoveRows = stoveResult.data?.map((s, i) => {
      const status = s.quantity === 0 ? "Out of Stock" : s.quantity < 30 ? "Low Stock" : "In Stock";
      return [lpgRows.length + i + 1, s.brand, 'Gas Stove', s.burners === 1 ? 'Single Burner' : 'Double Burner', '-', '-', s.quantity, status];
    }) || [];

    const regulatorRows = regulatorResult.data?.map((r, i) => {
      const status = r.quantity === 0 ? "Out of Stock" : r.quantity < 30 ? "Low Stock" : "In Stock";
      return [lpgRows.length + stoveRows.length + i + 1, r.brand, 'Regulator', r.type, '-', '-', r.quantity, status];
    }) || [];

    const allRows = [...lpgRows, ...stoveRows, ...regulatorRows];
    const outOfStock = allRows.filter(r => r[7] === "Out of Stock").length;
    const lowStock = allRows.filter(r => r[7] === "Low Stock").length;

    return {
      title: `Stock Status Report - ${format(new Date(), 'dd MMM yyyy')}`,
      headers: ['#', 'Brand/Name', 'Category', 'Type/Size', 'Package', 'Refill', 'Total', 'Status'],
      rows: allRows,
      summary: [
        { label: 'Total Items', value: String(allRows.length) },
        { label: 'Out of Stock', value: String(outOfStock) },
        { label: 'Low Stock', value: String(lowStock) },
        { label: 'In Stock', value: String(allRows.length - outOfStock - lowStock) },
      ]
    };
  };

  // Generate Customer Analysis Report
  const generateCustomerReport = async (): Promise<ReportData> => {
    const { data: customersData, error } = await supabase
      .from("customers")
      .select("*")
      .order("total_due", { ascending: false });

    if (error) throw error;

    const rows = customersData?.map((c, i) => [
      i + 1,
      c.name,
      c.phone || '-',
      c.address || '-',
      c.cylinders_due || 0,
      `${BANGLADESHI_CURRENCY_SYMBOL}${Number(c.total_due || 0).toLocaleString()}`,
      c.billing_status || 'clear',
      c.last_order_date ? format(new Date(c.last_order_date), 'dd MMM yyyy') : '-'
    ]) || [];

    const totalDue = customersData?.reduce((sum, c) => sum + Number(c.total_due || 0), 0) || 0;
    const cylindersDue = customersData?.reduce((sum, c) => sum + (c.cylinders_due || 0), 0) || 0;

    return {
      title: `Customer Analysis Report - ${format(new Date(), 'dd MMM yyyy')}`,
      headers: ['#', 'Name', 'Phone', 'Address', 'Cylinders Due', 'Amount Due', 'Status', 'Last Order'],
      rows,
      summary: [
        { label: 'Total Customers', value: String(customersData?.length || 0) },
        { label: 'Total Amount Due', value: `${BANGLADESHI_CURRENCY_SYMBOL}${totalDue.toLocaleString()}` },
        { label: 'Total Cylinders Due', value: String(cylindersDue) },
      ]
    };
  };

  // Generate Financial Summary Report
  const generateFinancialReport = async (): Promise<ReportData> => {
    const startDate = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(new Date()), 'yyyy-MM-dd');

    const [salesResult, expensesResult, vehicleCostsResult, staffPaymentsResult] = await Promise.all([
      supabase.from("pos_transactions").select("total").gte("created_at", startDate).lte("created_at", endDate),
      supabase.from("daily_expenses").select("amount, category").gte("expense_date", startDate).lte("expense_date", endDate),
      supabase.from("vehicle_costs").select("amount, cost_type").gte("cost_date", startDate).lte("cost_date", endDate),
      supabase.from("staff_payments").select("amount").gte("payment_date", startDate).lte("payment_date", endDate)
    ]);

    const totalSales = salesResult.data?.reduce((sum, t) => sum + Number(t.total), 0) || 0;
    const totalExpenses = expensesResult.data?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
    const totalVehicleCosts = vehicleCostsResult.data?.reduce((sum, v) => sum + Number(v.amount), 0) || 0;
    const totalStaffPayments = staffPaymentsResult.data?.reduce((sum, s) => sum + Number(s.amount), 0) || 0;

    const rows = [
      [1, 'Total Sales Revenue', `${BANGLADESHI_CURRENCY_SYMBOL}${totalSales.toLocaleString()}`, 'Income'],
      [2, 'Daily Expenses', `${BANGLADESHI_CURRENCY_SYMBOL}${totalExpenses.toLocaleString()}`, 'Expense'],
      [3, 'Vehicle Costs', `${BANGLADESHI_CURRENCY_SYMBOL}${totalVehicleCosts.toLocaleString()}`, 'Expense'],
      [4, 'Staff Payments', `${BANGLADESHI_CURRENCY_SYMBOL}${totalStaffPayments.toLocaleString()}`, 'Expense'],
    ];

    const totalExpenseSum = totalExpenses + totalVehicleCosts + totalStaffPayments;
    const netProfit = totalSales - totalExpenseSum;

    return {
      title: `Financial Summary - ${format(new Date(), 'MMMM yyyy')}`,
      headers: ['#', 'Description', 'Amount', 'Type'],
      rows,
      summary: [
        { label: 'Total Revenue', value: `${BANGLADESHI_CURRENCY_SYMBOL}${totalSales.toLocaleString()}` },
        { label: 'Total Expenses', value: `${BANGLADESHI_CURRENCY_SYMBOL}${totalExpenseSum.toLocaleString()}` },
        { label: 'Net Profit/Loss', value: `${BANGLADESHI_CURRENCY_SYMBOL}${netProfit.toLocaleString()}` },
      ]
    };
  };

  // Generate Monthly Report
  const generateMonthlyReport = async (): Promise<ReportData> => {
    const startDate = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(new Date()), 'yyyy-MM-dd');

    const { data: transactions } = await supabase
      .from("pos_transactions")
      .select("created_at, total")
      .gte("created_at", startDate)
      .lte("created_at", endDate);

    const dailyTotals: Record<string, number> = {};
    transactions?.forEach(t => {
      const date = format(new Date(t.created_at), 'yyyy-MM-dd');
      dailyTotals[date] = (dailyTotals[date] || 0) + Number(t.total);
    });

    const rows = Object.entries(dailyTotals)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, total], i) => [
        i + 1,
        format(new Date(date), 'dd MMM yyyy'),
        format(new Date(date), 'EEEE'),
        `${BANGLADESHI_CURRENCY_SYMBOL}${total.toLocaleString()}`
      ]);

    const totalRevenue = Object.values(dailyTotals).reduce((sum, v) => sum + v, 0);
    const avgDaily = rows.length > 0 ? totalRevenue / rows.length : 0;

    return {
      title: `Monthly Report - ${format(new Date(), 'MMMM yyyy')}`,
      headers: ['#', 'Date', 'Day', 'Revenue'],
      rows,
      summary: [
        { label: 'Total Days', value: String(rows.length) },
        { label: 'Total Revenue', value: `${BANGLADESHI_CURRENCY_SYMBOL}${totalRevenue.toLocaleString()}` },
        { label: 'Avg Daily Revenue', value: `${BANGLADESHI_CURRENCY_SYMBOL}${Math.round(avgDaily).toLocaleString()}` },
      ]
    };
  };

  // Export to CSV
  const exportToCSV = () => {
    if (!currentReport) return;

    const csvContent = [
      currentReport.headers.join(','),
      ...currentReport.rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${currentReport.title.replace(/\s+/g, '_')}.csv`;
    link.click();
    toast.success('Report exported to CSV');
  };

  const getResultBadgeColor = (type: string) => {
    switch (type) {
      case 'navigation': return 'bg-primary/10 text-primary border-primary/20';
      case 'action': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'customer': return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      case 'sale': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'stock': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      case 'driver': return 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20';
      case 'staff': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'vehicle': return 'bg-pink-500/10 text-pink-600 border-pink-500/20';
      default: return 'bg-muted text-muted-foreground border-muted/20';
    }
  };

  const categoryGroups = useMemo(() => {
    const pages = navigationItems.filter(i => i.category === 'page');
    const actions = navigationItems.filter(i => i.category === 'action');
    const reports = navigationItems.filter(i => i.category === 'report');
    return { pages, actions, reports };
  }, [navigationItems]);

  return (
    <div className="space-y-4 md:space-y-6 p-2 md:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-foreground">Search & Reports</h2>
          <p className="text-muted-foreground text-xs md:text-sm">Global search across all modules, pages, and data</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => setCommandOpen(true)}
          className="w-full sm:w-auto gap-2 h-11 md:h-9"
        >
          <CommandIcon className="h-4 w-4" />
          <span className="flex-1 text-left sm:flex-none">Quick Search</span>
          {!isMobile && (
            <kbd className="pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
              <span className="text-xs">⌘</span>K
            </kbd>
          )}
        </Button>
      </div>

      {/* Command Palette Dialog */}
      <Dialog open={commandOpen} onOpenChange={setCommandOpen}>
        <DialogContent className="p-0 gap-0 max-w-[95vw] md:max-w-2xl overflow-hidden">
          <Command className="rounded-lg border-0" shouldFilter={true}>
            <CommandInput 
              placeholder="Search pages, actions, customers, sales, stock..." 
              className="h-12 md:h-14 text-base border-0"
            />
            <CommandList className="max-h-[60vh] md:max-h-[400px]">
              <CommandEmpty>
                <div className="py-8 text-center">
                  <Search className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No results found</p>
                  <p className="text-xs text-muted-foreground mt-1">Try different keywords</p>
                </div>
              </CommandEmpty>
              
              {/* Pages */}
              <CommandGroup heading="Pages">
                {categoryGroups.pages.map(item => (
                  <CommandItem 
                    key={item.id}
                    value={`${item.title} ${item.description} ${item.keywords.join(' ')}`}
                    onSelect={() => handleAction(item.id)}
                    className="py-3 px-3 cursor-pointer"
                  >
                    <item.icon className="mr-3 h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
                  </CommandItem>
                ))}
              </CommandGroup>
              
              <CommandSeparator />
              
              {/* Quick Actions */}
              <CommandGroup heading="Quick Actions">
                {categoryGroups.actions.map(item => (
                  <CommandItem 
                    key={item.id}
                    value={`${item.title} ${item.description} ${item.keywords.join(' ')}`}
                    onSelect={() => handleAction(item.id)}
                    className="py-3 px-3 cursor-pointer"
                  >
                    <div className="mr-3 h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                      <item.icon className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                    </div>
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 shrink-0 ml-2 text-[10px]">
                      Action
                    </Badge>
                  </CommandItem>
                ))}
              </CommandGroup>
              
              <CommandSeparator />
              
              {/* Reports */}
              <CommandGroup heading="Generate Reports">
                {categoryGroups.reports.map(item => (
                  <CommandItem 
                    key={item.id}
                    value={`${item.title} ${item.description} ${item.keywords.join(' ')}`}
                    onSelect={() => handleAction(item.id)}
                    className="py-3 px-3 cursor-pointer"
                  >
                    <div className="mr-3 h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                      <item.icon className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                    </div>
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 shrink-0 ml-2 text-[10px]">
                      Report
                    </Badge>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
            
            {/* Keyboard hints - desktop only */}
            {!isMobile && (
              <div className="flex items-center justify-between border-t px-4 py-2 bg-muted/30">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Keyboard className="h-3 w-3" /> Navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px]">↵</kbd> Select
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px]">Esc</kbd> Close
                  </span>
                </div>
              </div>
            )}
          </Command>
        </DialogContent>
      </Dialog>

      {/* Main Search Interface */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3 md:pb-4">
          <CardTitle className="text-base md:text-lg flex items-center gap-2">
            <Search className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            Global Search
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Search across customers, orders, products, staff, and more
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 md:space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, order ID, product..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 md:h-10 text-base md:text-sm bg-muted/50"
                inputMode="search"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-7 w-7"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Filters - Stacked on mobile */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 md:gap-4 items-stretch sm:items-center">
              <div className="flex items-center gap-2">
                <label className="text-xs md:text-sm font-medium text-muted-foreground whitespace-nowrap">Category:</label>
                <Select value={searchCategory} onValueChange={setSearchCategory}>
                  <SelectTrigger className="flex-1 sm:w-40 h-10 md:h-9 bg-background text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="navigation">Pages & Actions</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="customers">Customers</SelectItem>
                    <SelectItem value="stock">Stock</SelectItem>
                    {(userRole === 'owner' || userRole === 'manager') && (
                      <>
                        <SelectItem value="drivers">Drivers</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="vehicles">Vehicles</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 sm:gap-4">
                <div className="flex items-center gap-2 flex-1">
                  <label className="text-xs md:text-sm font-medium text-muted-foreground">From:</label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="flex-1 sm:w-32 h-10 md:h-9 bg-background text-sm"
                  />
                </div>

                <div className="flex items-center gap-2 flex-1">
                  <label className="text-xs md:text-sm font-medium text-muted-foreground">To:</label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="flex-1 sm:w-32 h-10 md:h-9 bg-background text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      {searchQuery && (
        <Card className="border shadow-sm">
          <CardHeader className="pb-3 md:pb-4">
            <CardTitle className="text-base md:text-lg">Search Results</CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Found {searchResults.length} results for "{searchQuery}"
            </CardDescription>
          </CardHeader>
          <CardContent>
            {searchResults.length > 0 ? (
              <div className="space-y-2">
                {searchResults.slice(0, 20).map((result, index) => {
                  const Icon = result.icon;
                  return (
                    <div 
                      key={`${result.type}-${result.id}-${index}`} 
                      onClick={result.action}
                      className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer active:scale-[0.99]"
                    >
                      <div className={`h-10 w-10 md:h-9 md:w-9 rounded-full flex items-center justify-center shrink-0 ${getResultBadgeColor(result.type)}`}>
                        <Icon className="h-5 w-5 md:h-4 md:w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm md:text-sm text-foreground truncate">{result.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                        {result.meta && <p className="text-xs text-muted-foreground/70 truncate">{result.meta}</p>}
                      </div>
                      <Badge variant="outline" className={`shrink-0 text-[10px] md:text-xs ${getResultBadgeColor(result.type)}`}>
                        {result.type}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Search className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground mx-auto mb-3 md:mb-4" />
                <p className="text-base md:text-lg font-medium text-muted-foreground">No results found</p>
                <p className="text-xs md:text-sm text-muted-foreground">Try different search terms or filters</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Reports */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3 md:pb-4">
          <CardTitle className="text-base md:text-lg flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            Quick Reports
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">Generate commonly used business reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4">
            <Button
              variant="outline"
              className="h-20 md:h-24 flex-col gap-1 md:gap-2 border-primary/30 hover:bg-primary/10 hover:border-primary p-2"
              onClick={() => generateReport('daily-sales')}
              disabled={isGeneratingReport}
            >
              <FileText className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              <span className="font-medium text-xs md:text-sm text-center">Daily Sales</span>
              <span className="text-[10px] md:text-xs text-muted-foreground hidden sm:block">Today's transactions</span>
            </Button>

            <Button
              variant="outline"
              className="h-20 md:h-24 flex-col gap-1 md:gap-2 border-green-500/30 hover:bg-green-500/10 hover:border-green-500 p-2"
              onClick={() => generateReport('stock-status')}
              disabled={isGeneratingReport}
            >
              <Package className="h-5 w-5 md:h-6 md:w-6 text-green-500" />
              <span className="font-medium text-xs md:text-sm text-center">Stock Status</span>
              <span className="text-[10px] md:text-xs text-muted-foreground hidden sm:block">Inventory levels</span>
            </Button>

            <Button
              variant="outline"
              className="h-20 md:h-24 flex-col gap-1 md:gap-2 border-orange-500/30 hover:bg-orange-500/10 hover:border-orange-500 p-2"
              onClick={() => generateReport('customer-analysis')}
              disabled={isGeneratingReport}
            >
              <Users className="h-5 w-5 md:h-6 md:w-6 text-orange-500" />
              <span className="font-medium text-xs md:text-sm text-center">Customer Dues</span>
              <span className="text-[10px] md:text-xs text-muted-foreground hidden sm:block">Outstanding payments</span>
            </Button>

            {(userRole === 'owner' || userRole === 'manager') && (
              <>
                <Button
                  variant="outline"
                  className="h-20 md:h-24 flex-col gap-1 md:gap-2 border-yellow-500/30 hover:bg-yellow-500/10 hover:border-yellow-500 p-2"
                  onClick={() => generateReport('financial-summary')}
                  disabled={isGeneratingReport}
                >
                  <DollarSign className="h-5 w-5 md:h-6 md:w-6 text-yellow-500" />
                  <span className="font-medium text-xs md:text-sm text-center">Financial</span>
                  <span className="text-[10px] md:text-xs text-muted-foreground hidden sm:block">Income & expenses</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-20 md:h-24 flex-col gap-1 md:gap-2 border-blue-500/30 hover:bg-blue-500/10 hover:border-blue-500 p-2"
                  onClick={() => generateReport('monthly-report')}
                  disabled={isGeneratingReport}
                >
                  <Calendar className="h-5 w-5 md:h-6 md:w-6 text-blue-500" />
                  <span className="font-medium text-xs md:text-sm text-center">Monthly</span>
                  <span className="text-[10px] md:text-xs text-muted-foreground hidden sm:block">Daily breakdown</span>
                </Button>
              </>
            )}
          </div>

          {isGeneratingReport && (
            <div className="flex items-center justify-center py-4 mt-4">
              <Loader2 className="h-5 w-5 md:h-6 md:w-6 animate-spin text-primary mr-2" />
              <span className="text-sm text-muted-foreground">Generating report...</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Searches */}
      {recentSearches.length > 0 && !searchQuery && (
        <Card className="border shadow-sm">
          <CardHeader className="pb-3 md:pb-4">
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <Clock className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
              Recent Searches
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">Your recent search queries</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((query, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="hover:bg-primary/10 h-9 md:h-8 text-xs md:text-sm"
                  onClick={() => setSearchQuery(query)}
                >
                  <Search className="h-3 w-3 mr-1.5 text-muted-foreground" />
                  {query}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Navigation Cards */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3 md:pb-4">
          <CardTitle className="text-base md:text-lg flex items-center gap-2">
            <ArrowRight className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            Quick Navigation
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">Jump to frequently used pages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
            {categoryGroups.pages.slice(0, 8).map(item => (
              <Button
                key={item.id}
                variant="ghost"
                className="h-auto py-3 md:py-4 flex-col gap-1 md:gap-2 justify-start hover:bg-muted/80 border border-transparent hover:border-border"
                onClick={() => navigateToModule(item.id)}
              >
                <item.icon className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                <span className="text-xs md:text-sm font-medium text-center leading-tight">{item.title}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Report Preview Dialog */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-4xl max-h-[90vh] p-4 md:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base md:text-lg">
              <FileText className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              {currentReport?.title}
            </DialogTitle>
            <DialogDescription className="text-xs md:text-sm">
              Generated on {format(new Date(), 'dd MMM yyyy, hh:mm a')}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeReportTab} onValueChange={setActiveReportTab}>
            <TabsList className="grid w-full grid-cols-2 h-10 md:h-9">
              <TabsTrigger value="preview" className="text-sm">Preview</TabsTrigger>
              <TabsTrigger value="summary" className="text-sm">Summary</TabsTrigger>
            </TabsList>

            <TabsContent value="preview" className="mt-3 md:mt-4">
              <ScrollArea className="h-[50vh] md:h-[400px] rounded-md border">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {currentReport?.headers.map((header, i) => (
                          <TableHead key={i} className="font-semibold text-xs md:text-sm whitespace-nowrap">{header}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentReport?.rows.map((row, i) => (
                        <TableRow key={i}>
                          {row.map((cell, j) => (
                            <TableCell key={j} className="text-xs md:text-sm whitespace-nowrap">
                              {cell === "Out of Stock" ? (
                                <Badge className="bg-red-500 text-white text-[10px] md:text-xs">{cell}</Badge>
                              ) : cell === "Low Stock" ? (
                                <Badge className="bg-yellow-500 text-white text-[10px] md:text-xs">{cell}</Badge>
                              ) : cell === "In Stock" ? (
                                <Badge className="bg-green-500 text-white text-[10px] md:text-xs">{cell}</Badge>
                              ) : (
                                cell
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="summary" className="mt-3 md:mt-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                {currentReport?.summary?.map((item, i) => (
                  <Card key={i} className="bg-muted/30">
                    <CardContent className="p-3 md:p-4">
                      <p className="text-xs md:text-sm text-muted-foreground">{item.label}</p>
                      <p className="text-lg md:text-2xl font-bold text-foreground">{item.value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex flex-col sm:flex-row justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setReportDialogOpen(false)} className="h-10 md:h-9">
              Close
            </Button>
            <Button onClick={exportToCSV} className="bg-green-600 hover:bg-green-700 h-10 md:h-9">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
