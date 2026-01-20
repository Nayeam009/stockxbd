import { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
  TrendingDown,
  Clock,
  Keyboard,
  ArrowUpRight,
  ArrowDownRight,
  PieChart as PieChartIcon
} from "lucide-react";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
import { SalesData, Customer, StockItem, Driver } from "@/hooks/useDashboardData";
import { useBusinessDiaryData, SaleEntry, ExpenseEntry } from "@/hooks/useBusinessDiaryData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, subDays } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  AreaChart,
  Area,
  Legend
} from "recharts";

interface AnalysisSearchReportModuleProps {
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

type ViewMode = 'analysis' | 'search';
type TimeRange = 'daily' | 'weekly' | 'monthly' | 'yearly';

const CHART_COLORS = ['#22c55e', '#3b82f6', '#f97316', '#8b5cf6', '#ec4899', '#06b6d4', '#eab308'];

export const AnalysisSearchReportModule = ({ salesData, customers, stockData, drivers, userRole }: AnalysisSearchReportModuleProps) => {
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  
  // View mode toggle
  const [viewMode, setViewMode] = useState<ViewMode>('analysis');
  
  // Analysis state
  const [timeRange, setTimeRange] = useState<TimeRange>('daily');
  const { sales, expenses, analytics, loading: diaryLoading } = useBusinessDiaryData();
  
  // Search state
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

  // Analysis computed data
  const currentData = useMemo(() => {
    switch (timeRange) {
      case 'daily':
        return { income: analytics.todayIncome, expenses: analytics.todayExpenses, profit: analytics.todayProfit };
      case 'weekly':
        return { income: analytics.weeklyIncome, expenses: analytics.weeklyExpenses, profit: analytics.weeklyProfit };
      case 'monthly':
        return { income: analytics.monthlyIncome, expenses: analytics.monthlyExpenses, profit: analytics.monthlyProfit };
      case 'yearly':
        return { income: analytics.yearlyIncome, expenses: analytics.yearlyExpenses, profit: analytics.yearlyProfit };
      default:
        return { income: 0, expenses: 0, profit: 0 };
    }
  }, [timeRange, analytics]);

  // Trend chart data
  const trendChartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      const dayIncome = sales
        .filter(s => s.date === dateStr)
        .reduce((sum, s) => sum + s.totalAmount, 0);
      
      const dayExpenses = expenses
        .filter(e => e.date === dateStr)
        .reduce((sum, e) => sum + e.amount, 0);
      
      return {
        name: format(date, 'EEE'),
        fullDate: format(date, 'MMM d'),
        income: dayIncome,
        expenses: dayExpenses,
        profit: dayIncome - dayExpenses
      };
    });
    
    return last7Days;
  }, [sales, expenses]);

  // Payment breakdown for pie chart
  const paymentPieData = useMemo(() => {
    return analytics.paymentBreakdown.map((item, index) => ({
      name: item.method.toUpperCase(),
      value: item.amount,
      color: CHART_COLORS[index % CHART_COLORS.length]
    }));
  }, [analytics.paymentBreakdown]);

  // Expense breakdown for pie chart
  const expensePieData = useMemo(() => {
    return analytics.topExpenseCategories.map((item) => ({
      name: item.name,
      value: item.amount,
      color: item.color
    }));
  }, [analytics.topExpenseCategories]);

  const profitMarginColor = currentData.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';

  // Navigation items based on role
  const navigationItems: NavigationItem[] = useMemo((): NavigationItem[] => [
    { id: 'overview', title: 'Dashboard Overview', description: 'Main dashboard with KPIs and quick actions', icon: Home, category: 'page' as const, roles: ['owner', 'manager', 'driver'], keywords: ['home', 'dashboard', 'overview', 'main', 'kpi', 'summary'] },
    { id: 'pos', title: 'Point of Sale (POS)', description: 'Create new sales transactions', icon: Receipt, category: 'page' as const, roles: ['owner', 'manager', 'driver'], keywords: ['pos', 'sale', 'sell', 'transaction', 'billing', 'invoice', 'cash'] },
    { id: 'business-diary', title: 'Business Diary', description: 'View daily sales and expenses records', icon: BarChart3, category: 'page' as const, roles: ['owner', 'manager'], keywords: ['sales', 'daily', 'revenue', 'transactions', 'records', 'expenses', 'diary'] },
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
    const event = new CustomEvent('navigate-module', { detail: moduleId });
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
        navigateToModule('business-diary');
        setTimeout(() => toast.info('Click "Add Expense" to record a new expense'), 500);
        break;
      case 'action-add-stock':
        navigateToModule('inventory');
        setTimeout(() => toast.info('Click "Buy/Add" to add new stock'), 500);
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
        navigateToModule(actionId);
    }
  }, [navigateToModule, generateReport]);

  // Combined search results
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
            action: () => navigateToModule('business-diary'),
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
            action: () => navigateToModule('inventory'),
            data: item
          });
        }
      });
    }

    // Search in drivers
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

    if (results.length > 0 && query.length > 2) {
      saveSearch(searchQuery);
    }

    return results;
  }, [searchQuery, searchCategory, salesData, customers, stockData, drivers, staffData, vehicleData, userRole, navigationItems, handleAction, navigateToModule, saveSearch]);

  // Report generation functions
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

  // Render Analysis View
  const renderAnalysisView = () => (
    <div className="space-y-4 sm:space-y-5">
      {/* Time Range Selector - Premium Pills */}
      <div className="flex items-center justify-center">
        <div className="inline-flex items-center gap-1 p-1.5 bg-muted/60 rounded-xl border border-border/50">
          {(['daily', 'weekly', 'monthly', 'yearly'] as TimeRange[]).map((range) => (
            <Button
              key={range}
              variant="ghost"
              size="sm"
              onClick={() => setTimeRange(range)}
              className={`h-10 px-4 sm:px-6 text-xs sm:text-sm capitalize rounded-lg transition-all duration-200 touch-manipulation ${
                timeRange === range 
                  ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90" 
                  : "hover:bg-background/80"
              }`}
            >
              {range}
            </Button>
          ))}
        </div>
      </div>

      {/* Premium KPIs - Matching Business Diary Style */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {/* Income Card */}
        <Card className="relative overflow-hidden border-0 shadow-lg group hover:shadow-xl transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent" />
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-400" />
          <CardContent className="relative p-3 sm:p-5">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <ArrowUpRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">Income</p>
                </div>
              </div>
              <p className="text-lg sm:text-2xl lg:text-3xl font-bold text-emerald-600 dark:text-emerald-400 truncate tabular-nums">
                {BANGLADESHI_CURRENCY_SYMBOL}{currentData.income.toLocaleString()}
              </p>
              {timeRange === 'monthly' && (
                <div className="flex items-center gap-1.5 text-[10px] sm:text-xs">
                  {analytics.incomeGrowth >= 0 ? (
                    <Badge className="h-5 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-0 text-[10px]">
                      <TrendingUp className="h-2.5 w-2.5 mr-1" />
                      +{Math.abs(analytics.incomeGrowth).toFixed(1)}%
                    </Badge>
                  ) : (
                    <Badge className="h-5 bg-rose-500/20 text-rose-700 dark:text-rose-300 border-0 text-[10px]">
                      <TrendingDown className="h-2.5 w-2.5 mr-1" />
                      {Math.abs(analytics.incomeGrowth).toFixed(1)}%
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Expenses Card */}
        <Card className="relative overflow-hidden border-0 shadow-lg group hover:shadow-xl transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent" />
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-rose-400" />
          <CardContent className="relative p-3 sm:p-5">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-lg bg-rose-500/20 flex items-center justify-center">
                    <ArrowDownRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-rose-600 dark:text-rose-400" />
                  </div>
                  <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">Expenses</p>
                </div>
              </div>
              <p className="text-lg sm:text-2xl lg:text-3xl font-bold text-rose-600 dark:text-rose-400 truncate tabular-nums">
                {BANGLADESHI_CURRENCY_SYMBOL}{currentData.expenses.toLocaleString()}
              </p>
              {timeRange === 'monthly' && (
                <div className="flex items-center gap-1.5 text-[10px] sm:text-xs">
                  {analytics.expenseGrowth <= 0 ? (
                    <Badge className="h-5 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-0 text-[10px]">
                      <TrendingDown className="h-2.5 w-2.5 mr-1" />
                      {Math.abs(analytics.expenseGrowth).toFixed(1)}%
                    </Badge>
                  ) : (
                    <Badge className="h-5 bg-rose-500/20 text-rose-700 dark:text-rose-300 border-0 text-[10px]">
                      <TrendingUp className="h-2.5 w-2.5 mr-1" />
                      +{Math.abs(analytics.expenseGrowth).toFixed(1)}%
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Profit/Loss Card */}
        <Card className="relative overflow-hidden border-0 shadow-lg group hover:shadow-xl transition-all duration-300">
          <div className={`absolute inset-0 bg-gradient-to-br ${currentData.profit >= 0 ? 'from-primary/10 via-primary/5' : 'from-destructive/10 via-destructive/5'} to-transparent`} />
          <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${currentData.profit >= 0 ? 'from-primary to-primary/80' : 'from-destructive to-destructive/80'}`} />
          <CardContent className="relative p-3 sm:p-5">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className={`h-6 w-6 sm:h-7 sm:w-7 rounded-lg ${currentData.profit >= 0 ? 'bg-primary/20' : 'bg-destructive/20'} flex items-center justify-center`}>
                    {currentData.profit >= 0 ? (
                      <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive" />
                    )}
                  </div>
                  <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {currentData.profit >= 0 ? 'Profit' : 'Loss'}
                  </p>
                </div>
              </div>
              <p className={`text-lg sm:text-2xl lg:text-3xl font-bold truncate tabular-nums ${currentData.profit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {currentData.profit >= 0 ? '+' : ''}{BANGLADESHI_CURRENCY_SYMBOL}{Math.abs(currentData.profit).toLocaleString()}
              </p>
              {timeRange === 'monthly' && (
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  {analytics.profitMargin.toFixed(1)}% margin
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Tabs */}
      <Tabs defaultValue="trend" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-10">
          <TabsTrigger value="trend" className="text-xs sm:text-sm">Trend</TabsTrigger>
          <TabsTrigger value="income" className="text-xs sm:text-sm">Income</TabsTrigger>
          <TabsTrigger value="expense" className="text-xs sm:text-sm">Expense</TabsTrigger>
        </TabsList>

        {/* Trend Chart */}
        <TabsContent value="trend" className="mt-3">
          <Card>
            <CardHeader className="pb-2 px-3 pt-3">
              <CardTitle className="text-sm font-medium">7-Day Performance</CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-3">
              <div className="h-[220px] sm:h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendChartData}>
                    <defs>
                      <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="name" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={10} 
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={10}
                      tickLine={false}
                      tickFormatter={(value) => `${value / 1000}k`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                      formatter={(value: number, name: string) => [
                        `${BANGLADESHI_CURRENCY_SYMBOL}${value.toLocaleString()}`, 
                        name.charAt(0).toUpperCase() + name.slice(1)
                      ]}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="income" 
                      stroke="#22c55e" 
                      strokeWidth={2}
                      fill="url(#incomeGradient)" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="expenses" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      fill="url(#expenseGradient)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Income Breakdown */}
        <TabsContent value="income" className="mt-3">
          <Card>
            <CardHeader className="pb-2 px-3 pt-3">
              <CardTitle className="text-sm font-medium">Payment Methods</CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-3">
              <div className="h-[220px] sm:h-[280px]">
                {paymentPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={isMobile ? 35 : 50}
                        outerRadius={isMobile ? 65 : 85}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {paymentPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => [`${BANGLADESHI_CURRENCY_SYMBOL}${value.toLocaleString()}`, '']}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                      />
                      <Legend formatter={(value) => <span className="text-xs">{value}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    No payment data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expense Breakdown */}
        <TabsContent value="expense" className="mt-3">
          <Card>
            <CardHeader className="pb-2 px-3 pt-3">
              <CardTitle className="text-sm font-medium">Expense Categories</CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-3">
              <div className="h-[220px] sm:h-[280px]">
                {expensePieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expensePieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={isMobile ? 35 : 50}
                        outerRadius={isMobile ? 65 : 85}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {expensePieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => [`${BANGLADESHI_CURRENCY_SYMBOL}${value.toLocaleString()}`, '']}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                      />
                      <Legend formatter={(value) => <span className="text-xs">{value}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    No expense data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Top Items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Top Products */}
        <Card>
          <CardHeader className="pb-2 px-3 pt-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Top Products
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="space-y-2">
              {analytics.topProducts.slice(0, 3).map((product, index) => (
                <div key={product.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-medium text-muted-foreground w-4">{index + 1}.</span>
                    <span className="text-xs truncate">{product.name}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {BANGLADESHI_CURRENCY_SYMBOL}{product.amount.toLocaleString()}
                  </Badge>
                </div>
              ))}
              {analytics.topProducts.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">No data</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Expense Categories */}
        <Card>
          <CardHeader className="pb-2 px-3 pt-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              Top Expenses
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="space-y-2">
              {analytics.topExpenseCategories.slice(0, 3).map((cat, index) => (
                <div key={cat.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs">{cat.icon}</span>
                    <span className="text-xs truncate">{cat.name}</span>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0 border-red-200 text-red-600">
                    {BANGLADESHI_CURRENCY_SYMBOL}{cat.amount.toLocaleString()}
                  </Badge>
                </div>
              ))}
              {analytics.topExpenseCategories.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">No data</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // Render Search & Reports View
  const renderSearchView = () => (
    <div className="space-y-4">
      {/* Quick Search Button */}
      <Button 
        variant="outline" 
        onClick={() => setCommandOpen(true)}
        className="w-full gap-2 h-12 justify-start"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left text-muted-foreground">Search pages, actions, customers, sales...</span>
        {!isMobile && (
          <kbd className="pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
            <span className="text-xs">⌘</span>K
          </kbd>
        )}
      </Button>

      {/* Global Search Card */}
      <Card>
        <CardHeader className="pb-3 px-3 pt-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Search className="h-4 w-4 text-primary" />
            Global Search
          </CardTitle>
          <CardDescription className="text-xs">Search across all modules and data</CardDescription>
        </CardHeader>
        <CardContent className="px-3 pb-3 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Search customers, sales, stock..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 h-11"
            />
            <Select value={searchCategory} onValueChange={setSearchCategory}>
              <SelectTrigger className="w-full sm:w-[140px] h-11">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="navigation">Pages</SelectItem>
                <SelectItem value="customers">Customers</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
                <SelectItem value="stock">Stock</SelectItem>
                <SelectItem value="drivers">Drivers</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="vehicles">Vehicles</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Search Results */}
          {searchQuery && searchResults.length > 0 && (
            <ScrollArea className="h-[200px] sm:h-[250px]">
              <div className="space-y-2">
                {searchResults.slice(0, 10).map((result) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={result.action}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <result.icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{result.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${getResultBadgeColor(result.type)}`}>
                      {result.meta || result.type}
                    </Badge>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
          
          {searchQuery && searchResults.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No results found for "{searchQuery}"</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Reports */}
      <Card>
        <CardHeader className="pb-3 px-3 pt-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Quick Reports
          </CardTitle>
          <CardDescription className="text-xs">Generate business reports instantly</CardDescription>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <Button 
              variant="outline" 
              className="h-auto py-3 px-3 flex flex-col items-center gap-2 text-xs"
              onClick={() => generateReport('daily-sales')}
              disabled={isGeneratingReport}
            >
              <Receipt className="h-5 w-5 text-green-600" />
              <span>Daily Sales</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-3 px-3 flex flex-col items-center gap-2 text-xs"
              onClick={() => generateReport('stock-status')}
              disabled={isGeneratingReport}
            >
              <Package className="h-5 w-5 text-blue-600" />
              <span>Stock Status</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-3 px-3 flex flex-col items-center gap-2 text-xs"
              onClick={() => generateReport('customer-analysis')}
              disabled={isGeneratingReport}
            >
              <Users className="h-5 w-5 text-orange-600" />
              <span>Customer Dues</span>
            </Button>
            {userRole === 'owner' && (
              <Button 
                variant="outline" 
                className="h-auto py-3 px-3 flex flex-col items-center gap-2 text-xs"
                onClick={() => generateReport('financial-summary')}
                disabled={isGeneratingReport}
              >
                <DollarSign className="h-5 w-5 text-purple-600" />
                <span>Financial</span>
              </Button>
            )}
            <Button 
              variant="outline" 
              className="h-auto py-3 px-3 flex flex-col items-center gap-2 text-xs"
              onClick={() => generateReport('monthly-report')}
              disabled={isGeneratingReport}
            >
              <Calendar className="h-5 w-5 text-cyan-600" />
              <span>Monthly</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Searches */}
      {!searchQuery && recentSearches.length > 0 && (
        <Card>
          <CardHeader className="pb-3 px-3 pt-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Recent Searches
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs"
                onClick={() => {
                  setRecentSearches([]);
                  localStorage.removeItem("recentSearches");
                }}
              >
                Clear
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="flex flex-wrap gap-2">
              {recentSearches.slice(0, 6).map((search, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setSearchQuery(search)}
                >
                  {search}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6 pb-4">
      {/* Premium Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 rounded-xl -z-10" />
        <div className="flex flex-col gap-4 p-4 sm:p-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
                <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground tracking-tight">
                  Analysis & Reports
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Business analytics • Search • Report generation
                </p>
              </div>
            </div>
          </div>

          {/* Premium View Mode Toggle */}
          <div className="bg-muted/50 p-1.5 rounded-xl border border-border/50">
            <div className="grid grid-cols-2 gap-1">
              <Button
                variant="ghost"
                size="sm"
                className={`h-12 rounded-lg transition-all duration-200 touch-manipulation ${
                  viewMode === 'analysis' 
                    ? 'bg-primary text-primary-foreground shadow-lg hover:bg-primary/90' 
                    : 'hover:bg-background/80'
                }`}
                onClick={() => setViewMode('analysis')}
              >
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  <span className="font-medium">Analysis</span>
                </div>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`h-12 rounded-lg transition-all duration-200 touch-manipulation ${
                  viewMode === 'search' 
                    ? 'bg-accent text-accent-foreground shadow-lg hover:bg-accent/90' 
                    : 'hover:bg-background/80'
                }`}
                onClick={() => setViewMode('search')}
              >
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  <span className="font-medium">Search & Reports</span>
                </div>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'analysis' ? renderAnalysisView() : renderSearchView()}

      {/* Command Palette Dialog */}
      <Dialog open={commandOpen} onOpenChange={setCommandOpen}>
        <DialogContent className="p-0 gap-0 max-w-[95vw] md:max-w-2xl overflow-hidden" aria-describedby={undefined}>
          <DialogTitle className="sr-only">Quick Command Palette</DialogTitle>
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
              <CommandGroup heading="Reports">
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
          </Command>
        </DialogContent>
      </Dialog>

      {/* Report Preview Dialog */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base sm:text-lg pr-8">{currentReport?.title}</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Generated on {format(new Date(), 'dd MMM yyyy, hh:mm a')}
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={activeReportTab} onValueChange={setActiveReportTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2 h-10">
              <TabsTrigger value="preview" className="text-xs sm:text-sm">Preview</TabsTrigger>
              <TabsTrigger value="summary" className="text-xs sm:text-sm">Summary</TabsTrigger>
            </TabsList>
            
            <TabsContent value="preview" className="flex-1 overflow-hidden mt-3">
              <ScrollArea className="h-[50vh] sm:h-[55vh]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {currentReport?.headers.map((header, i) => (
                        <TableHead key={i} className="text-xs whitespace-nowrap">{header}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentReport?.rows.map((row, i) => (
                      <TableRow key={i}>
                        {row.map((cell, j) => (
                          <TableCell key={j} className="text-xs whitespace-nowrap">{cell}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="summary" className="mt-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {currentReport?.summary?.map((item, i) => (
                  <Card key={i}>
                    <CardContent className="p-3 sm:p-4">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="text-lg sm:text-xl font-bold text-foreground">{item.value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button variant="outline" onClick={() => setReportDialogOpen(false)} className="h-10">
              Close
            </Button>
            <Button onClick={exportToCSV} className="h-10 gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Loading overlay for report generation */}
      {isGeneratingReport && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Generating report...</p>
          </div>
        </div>
      )}
    </div>
  );
};
