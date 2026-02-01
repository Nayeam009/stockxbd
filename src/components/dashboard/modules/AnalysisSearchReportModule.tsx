import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Search, FileText, Users, Package, Truck, BarChart3, Calendar,
  DollarSign, Loader2, Home, Receipt, Wallet, RefreshCw, Tag, Settings,
  Plus, UserPlus, PackagePlus, Banknote, CreditCard, ChefHat, Wrench, Flame
} from "lucide-react";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
import { SalesData, Customer, StockItem, Driver } from "@/hooks/useDashboardData";
import { useBusinessDiaryData } from "@/hooks/useBusinessDiaryData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, subDays } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { PremiumModuleHeader } from "@/components/shared/PremiumModuleHeader";
import { SoftRefreshBadge } from "@/components/shared/SoftRefreshBadge";
import {
  AnalysisSkeleton,
  AnalysisTimeSelector,
  AnalysisKPIGrid,
  AnalysisTrendChart,
  AnalysisPieCharts,
  AnalysisTopItems,
  type TimeRange
} from "@/components/analysis";
import { QuickReportsGrid, ReportPreviewDialog } from "@/components/reports";
import { GlobalSearchCard } from "@/components/search";

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

interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle: string;
  meta?: string;
  icon: any;
  action?: () => void;
  data?: any;
}

interface NavigationItem {
  id: string;
  title: string;
  description: string;
  icon: any;
  category: 'page' | 'action' | 'report';
  roles: string[];
  keywords: string[];
}

type ViewMode = 'analysis' | 'search';
const CHART_COLORS = ['#22c55e', '#3b82f6', '#f97316', '#8b5cf6', '#ec4899', '#06b6d4', '#eab308'];

export const AnalysisSearchReportModule = ({ 
  salesData, customers, stockData, drivers, userRole 
}: AnalysisSearchReportModuleProps) => {
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('analysis');
  
  // Analysis state
  const [timeRange, setTimeRange] = useState<TimeRange>('daily');
  const [customRange, setCustomRange] = useState<{ from: Date; to: Date } | null>(null);
  const { sales, expenses, analytics, loading: diaryLoading, refetch } = useBusinessDiaryData();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCategory, setSearchCategory] = useState("all");
  const [commandOpen, setCommandOpen] = useState(false);
  const [staffData, setStaffData] = useState<any[]>([]);
  const [vehicleData, setVehicleData] = useState<any[]>([]);
  
  // Report state
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [currentReport, setCurrentReport] = useState<ReportData | null>(null);
  const reportCache = useRef<Map<string, ReportData>>(new Map());

  // Fetch additional data
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

  // ==================== REAL-TIME SUBSCRIPTIONS ====================
  useEffect(() => {
    const debouncedRefetch = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setIsRefreshing(true);
        refetch().finally(() => setIsRefreshing(false));
        reportCache.current.clear(); // Invalidate cache on data change
      }, 800);
    };

    const channel = supabase
      .channel('analysis-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pos_transactions' }, debouncedRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pob_transactions' }, debouncedRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_expenses' }, debouncedRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_payments' }, debouncedRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_payments' }, debouncedRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicle_costs' }, debouncedRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lpg_brands' }, debouncedRefetch)
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [refetch]);

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

  // ==================== MEMOIZED DATA ====================
  const currentData = useMemo(() => {
    switch (timeRange) {
      case 'daily': return { income: analytics.todayIncome, expenses: analytics.todayExpenses, profit: analytics.todayProfit, profitMargin: analytics.profitMargin };
      case 'weekly': return { income: analytics.weeklyIncome, expenses: analytics.weeklyExpenses, profit: analytics.weeklyProfit, profitMargin: analytics.profitMargin };
      case 'monthly': return { income: analytics.monthlyIncome, expenses: analytics.monthlyExpenses, profit: analytics.monthlyProfit, profitMargin: analytics.profitMargin };
      case 'yearly': return { income: analytics.yearlyIncome, expenses: analytics.yearlyExpenses, profit: analytics.yearlyProfit, profitMargin: analytics.profitMargin };
      default: return { income: 0, expenses: 0, profit: 0, profitMargin: 0 };
    }
  }, [timeRange, analytics]);

  const trendChartData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayIncome = sales.filter(s => s.date === dateStr).reduce((sum, s) => sum + (s.amountPaid ?? s.totalAmount), 0);
      const dayExpenses = expenses.filter(e => e.date === dateStr).reduce((sum, e) => sum + e.amount, 0);
      return { name: format(date, 'EEE'), fullDate: format(date, 'MMM d'), income: dayIncome, expenses: dayExpenses, profit: dayIncome - dayExpenses };
    });
  }, [sales, expenses]);

  const paymentPieData = useMemo(() => 
    analytics.paymentBreakdown.map((item, index) => ({
      name: item.method.toUpperCase(),
      value: item.amount,
      color: CHART_COLORS[index % CHART_COLORS.length]
    })), [analytics.paymentBreakdown]);

  const expensePieData = useMemo(() => 
    analytics.topExpenseCategories.map(item => ({
      name: item.name,
      value: item.amount,
      color: item.color
    })), [analytics.topExpenseCategories]);

  // Navigation items
  const navigationItems: NavigationItem[] = useMemo(() => ([
    { id: 'overview', title: 'Dashboard Overview', description: 'Main dashboard with KPIs', icon: Home, category: 'page' as const, roles: ['owner', 'manager', 'driver'], keywords: ['home', 'dashboard'] },
    { id: 'pos', title: 'Point of Sale', description: 'Create sales transactions', icon: Receipt, category: 'page' as const, roles: ['owner', 'manager', 'driver'], keywords: ['pos', 'sale', 'billing'] },
    { id: 'business-diary', title: 'Business Diary', description: 'View daily sales & expenses', icon: BarChart3, category: 'page' as const, roles: ['owner', 'manager'], keywords: ['sales', 'expenses', 'diary'] },
    { id: 'inventory', title: 'Inventory', description: 'Manage stock levels', icon: Package, category: 'page' as const, roles: ['owner', 'manager'], keywords: ['lpg', 'cylinder', 'stock'] },
    { id: 'product-pricing', title: 'Product Pricing', description: 'Set product prices', icon: Tag, category: 'page' as const, roles: ['owner', 'manager'], keywords: ['price', 'pricing'] },
    { id: 'customers', title: 'Customer Management', description: 'Manage customers & dues', icon: Users, category: 'page' as const, roles: ['owner', 'manager'], keywords: ['customer', 'due'] },
    { id: 'utility-expense', title: 'Utility Expense', description: 'Staff salary & vehicle costs', icon: Wallet, category: 'page' as const, roles: ['owner', 'manager'], keywords: ['staff', 'salary', 'vehicle'] },
    { id: 'orders', title: 'Online Delivery', description: 'Manage delivery orders', icon: Truck, category: 'page' as const, roles: ['owner', 'manager', 'driver'], keywords: ['order', 'delivery'] },
    { id: 'settings', title: 'Settings', description: 'System configuration', icon: Settings, category: 'page' as const, roles: ['owner', 'manager'], keywords: ['settings', 'config'] },
    { id: 'action-new-sale', title: 'Create New Sale', description: 'Start a new POS transaction', icon: Plus, category: 'action' as const, roles: ['owner', 'manager', 'driver'], keywords: ['new', 'sale'] },
    { id: 'action-add-customer', title: 'Add New Customer', description: 'Register a new customer', icon: UserPlus, category: 'action' as const, roles: ['owner', 'manager'], keywords: ['add', 'customer'] },
    { id: 'report-daily-sales', title: 'Daily Sales Report', description: "Today's sales report", icon: FileText, category: 'report' as const, roles: ['owner', 'manager'], keywords: ['report', 'daily'] },
    { id: 'report-stock-status', title: 'Stock Status Report', description: 'Current inventory', icon: Package, category: 'report' as const, roles: ['owner', 'manager'], keywords: ['report', 'stock'] },
    { id: 'report-financial', title: 'Financial Summary', description: 'Income vs expenses', icon: DollarSign, category: 'report' as const, roles: ['owner'], keywords: ['report', 'financial'] },
  ] as NavigationItem[]).filter(item => item.roles.includes(userRole)), [userRole]);

  // ==================== SEARCH ====================
  const searchResults = useMemo((): SearchResult[] => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    const results: SearchResult[] = [];

    // Navigation search
    navigationItems.forEach(item => {
      if (item.title.toLowerCase().includes(query) || item.keywords.some(k => k.includes(query))) {
        results.push({
          type: item.category === 'action' ? 'action' : item.category === 'report' ? 'navigation' : 'navigation',
          id: item.id, title: item.title, subtitle: item.description,
          meta: item.category === 'action' ? 'Action' : item.category === 'report' ? 'Report' : 'Page',
          icon: item.icon, action: () => handleAction(item.id)
        });
      }
    });

    // Customer search
    if (searchCategory === "all" || searchCategory === "customers") {
      customers.forEach(c => {
        if (c.name.toLowerCase().includes(query) || c.phone.includes(query)) {
          results.push({
            type: 'customer', id: c.id, title: c.name, subtitle: c.phone,
            meta: `${BANGLADESHI_CURRENCY_SYMBOL}${c.outstanding} due`,
            icon: Users, action: () => navigateToModule('customers')
          });
        }
      });
    }

    // Stock search
    if (searchCategory === "all" || searchCategory === "stock") {
      stockData.forEach(item => {
        if (item.name.toLowerCase().includes(query)) {
          results.push({
            type: 'stock', id: item.id, title: item.name,
            subtitle: `${item.currentStock} units @ ${BANGLADESHI_CURRENCY_SYMBOL}${item.price}`,
            meta: item.type, icon: item.type === 'cylinder' ? Flame : ChefHat,
            action: () => navigateToModule('inventory')
          });
        }
      });
    }

    return results.slice(0, 15);
  }, [searchQuery, searchCategory, navigationItems, customers, stockData]);

  // ==================== ACTIONS ====================
  const navigateToModule = useCallback((moduleId: string) => {
    window.dispatchEvent(new CustomEvent('navigate-module', { detail: moduleId }));
    setCommandOpen(false);
    setSearchQuery("");
  }, []);

  const handleAction = useCallback((actionId: string) => {
    setCommandOpen(false);
    if (actionId.startsWith('report-')) {
      generateReport(actionId.replace('report-', ''));
    } else if (actionId.startsWith('action-')) {
      navigateToModule(actionId.replace('action-', '') === 'new-sale' ? 'pos' : 'customers');
    } else {
      navigateToModule(actionId);
    }
  }, [navigateToModule]);

  // ==================== REPORTS ====================
  const generateReport = useCallback(async (type: string) => {
    const cacheKey = `${type}-${format(new Date(), 'yyyy-MM-dd')}`;
    if (reportCache.current.has(cacheKey)) {
      setCurrentReport(reportCache.current.get(cacheKey)!);
      setReportDialogOpen(true);
      return;
    }

    setIsGeneratingReport(true);
    try {
      let report: ReportData;
      switch (type) {
        case 'daily-sales': report = await generateDailySalesReport(); break;
        case 'stock-status': report = await generateStockReport(); break;
        case 'customer-analysis': report = await generateCustomerReport(); break;
        case 'financial-summary': report = await generateFinancialReport(); break;
        case 'monthly-report': report = await generateMonthlyReport(); break;
        default: throw new Error('Unknown report type');
      }
      reportCache.current.set(cacheKey, report);
      setCurrentReport(report);
      setReportDialogOpen(true);
      toast.success('Report generated');
    } catch (error) {
      toast.error('Failed to generate report');
    } finally {
      setIsGeneratingReport(false);
    }
  }, []);

  // Report generators
  const generateDailySalesReport = async (): Promise<ReportData> => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const { data: transactions } = await supabase.from("pos_transactions").select("*").gte("created_at", `${today}T00:00:00`).lte("created_at", `${today}T23:59:59`).order("created_at", { ascending: false });
    const rows = transactions?.map((t, i) => [i + 1, t.transaction_number, format(new Date(t.created_at), 'hh:mm a'), t.payment_method, `${BANGLADESHI_CURRENCY_SYMBOL}${t.total}`, t.payment_status]) || [];
    const totalSales = transactions?.reduce((sum, t) => sum + Number(t.total), 0) || 0;
    return { title: `Daily Sales Report - ${format(new Date(), 'dd MMM yyyy')}`, headers: ['#', 'Transaction', 'Time', 'Payment', 'Total', 'Status'], rows, summary: [{ label: 'Total Transactions', value: String(transactions?.length || 0) }, { label: 'Total Sales', value: `${BANGLADESHI_CURRENCY_SYMBOL}${totalSales.toLocaleString()}` }] };
  };

  const generateStockReport = async (): Promise<ReportData> => {
    const [lpgResult, stoveResult, regulatorResult] = await Promise.all([supabase.from("lpg_brands").select("*").eq("is_active", true), supabase.from("stoves").select("*").eq("is_active", true), supabase.from("regulators").select("*").eq("is_active", true)]);
    const lpgRows = lpgResult.data?.map((b, i) => { const total = b.package_cylinder + b.refill_cylinder; return [i + 1, b.name, 'LPG', `${b.size}`, total, total === 0 ? "Out of Stock" : total < 30 ? "Low Stock" : "In Stock"]; }) || [];
    const stoveRows = stoveResult.data?.map((s, i) => [lpgRows.length + i + 1, s.brand, 'Stove', `${s.burners}B`, s.quantity, s.quantity === 0 ? "Out of Stock" : s.quantity < 30 ? "Low Stock" : "In Stock"]) || [];
    const regulatorRows = regulatorResult.data?.map((r, i) => [lpgRows.length + stoveRows.length + i + 1, r.brand, 'Regulator', r.type, r.quantity, r.quantity === 0 ? "Out of Stock" : r.quantity < 30 ? "Low Stock" : "In Stock"]) || [];
    const allRows = [...lpgRows, ...stoveRows, ...regulatorRows];
    return { title: `Stock Status Report - ${format(new Date(), 'dd MMM yyyy')}`, headers: ['#', 'Brand', 'Type', 'Size', 'Total', 'Status'], rows: allRows, summary: [{ label: 'Total Items', value: String(allRows.length) }, { label: 'Out of Stock', value: String(allRows.filter(r => r[5] === "Out of Stock").length) }] };
  };

  const generateCustomerReport = async (): Promise<ReportData> => {
    const { data } = await supabase.from("customers").select("*").order("total_due", { ascending: false });
    const rows = data?.map((c, i) => [i + 1, c.name, c.phone || '-', c.cylinders_due || 0, `${BANGLADESHI_CURRENCY_SYMBOL}${Number(c.total_due || 0).toLocaleString()}`, c.billing_status || 'clear']) || [];
    const totalDue = data?.reduce((sum, c) => sum + Number(c.total_due || 0), 0) || 0;
    return { title: `Customer Dues Report - ${format(new Date(), 'dd MMM yyyy')}`, headers: ['#', 'Name', 'Phone', 'Cylinders Due', 'Amount Due', 'Status'], rows, summary: [{ label: 'Total Customers', value: String(data?.length || 0) }, { label: 'Total Due', value: `${BANGLADESHI_CURRENCY_SYMBOL}${totalDue.toLocaleString()}` }] };
  };

  const generateFinancialReport = async (): Promise<ReportData> => {
    const startDate = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(new Date()), 'yyyy-MM-dd');
    const [salesResult, expensesResult, vehicleCostsResult, staffPaymentsResult] = await Promise.all([supabase.from("pos_transactions").select("total").gte("created_at", startDate).lte("created_at", endDate), supabase.from("daily_expenses").select("amount").gte("expense_date", startDate).lte("expense_date", endDate), supabase.from("vehicle_costs").select("amount").gte("cost_date", startDate).lte("cost_date", endDate), supabase.from("staff_payments").select("amount").gte("payment_date", startDate).lte("payment_date", endDate)]);
    const totalSales = salesResult.data?.reduce((sum, t) => sum + Number(t.total), 0) || 0;
    const totalExpenses = expensesResult.data?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
    const totalVehicle = vehicleCostsResult.data?.reduce((sum, v) => sum + Number(v.amount), 0) || 0;
    const totalStaff = staffPaymentsResult.data?.reduce((sum, s) => sum + Number(s.amount), 0) || 0;
    const totalExpenseSum = totalExpenses + totalVehicle + totalStaff;
    const rows = [[1, 'Sales Revenue', `${BANGLADESHI_CURRENCY_SYMBOL}${totalSales.toLocaleString()}`, 'Income'], [2, 'Daily Expenses', `${BANGLADESHI_CURRENCY_SYMBOL}${totalExpenses.toLocaleString()}`, 'Expense'], [3, 'Vehicle Costs', `${BANGLADESHI_CURRENCY_SYMBOL}${totalVehicle.toLocaleString()}`, 'Expense'], [4, 'Staff Payments', `${BANGLADESHI_CURRENCY_SYMBOL}${totalStaff.toLocaleString()}`, 'Expense']];
    return { title: `Financial Summary - ${format(new Date(), 'MMMM yyyy')}`, headers: ['#', 'Description', 'Amount', 'Type'], rows, summary: [{ label: 'Revenue', value: `${BANGLADESHI_CURRENCY_SYMBOL}${totalSales.toLocaleString()}` }, { label: 'Expenses', value: `${BANGLADESHI_CURRENCY_SYMBOL}${totalExpenseSum.toLocaleString()}` }, { label: 'Net', value: `${BANGLADESHI_CURRENCY_SYMBOL}${(totalSales - totalExpenseSum).toLocaleString()}` }] };
  };

  const generateMonthlyReport = async (): Promise<ReportData> => {
    const startDate = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const { data: transactions } = await supabase.from("pos_transactions").select("created_at, total").gte("created_at", startDate);
    const dailyTotals: Record<string, number> = {};
    transactions?.forEach(t => { const date = format(new Date(t.created_at), 'yyyy-MM-dd'); dailyTotals[date] = (dailyTotals[date] || 0) + Number(t.total); });
    const rows = Object.entries(dailyTotals).sort((a, b) => a[0].localeCompare(b[0])).map(([date, total], i) => [i + 1, format(new Date(date), 'dd MMM'), format(new Date(date), 'EEE'), `${BANGLADESHI_CURRENCY_SYMBOL}${total.toLocaleString()}`]);
    const totalRevenue = Object.values(dailyTotals).reduce((sum, v) => sum + v, 0);
    return { title: `Monthly Report - ${format(new Date(), 'MMMM yyyy')}`, headers: ['#', 'Date', 'Day', 'Revenue'], rows, summary: [{ label: 'Total Days', value: String(rows.length) }, { label: 'Total Revenue', value: `${BANGLADESHI_CURRENCY_SYMBOL}${totalRevenue.toLocaleString()}` }] };
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    reportCache.current.clear();
    await refetch();
    setIsRefreshing(false);
  };

  // ==================== RENDER ====================
  if (diaryLoading) return <AnalysisSkeleton />;

  return (
    <div className="space-y-4 sm:space-y-5 pb-20">
      {/* Header */}
      <PremiumModuleHeader
        title="Analysis & Reports"
        subtitle="Real-time insights • Search • Generate reports"
        icon={<BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />}
        onRefresh={handleRefresh}
        actions={<SoftRefreshBadge isRefreshing={isRefreshing} />}
      />

      {/* Mode Toggle */}
      <div className="flex items-center justify-center">
        <div className="inline-flex items-center gap-3 p-2 bg-muted/60 rounded-xl border border-border/50">
          <Label htmlFor="view-toggle" className={`text-sm font-medium cursor-pointer px-2 ${viewMode === 'analysis' ? 'text-primary' : 'text-muted-foreground'}`}>
            📊 Analysis
          </Label>
          <Switch
            id="view-toggle"
            checked={viewMode === 'search'}
            onCheckedChange={(checked) => setViewMode(checked ? 'search' : 'analysis')}
            className="data-[state=checked]:bg-primary"
          />
          <Label htmlFor="view-toggle" className={`text-sm font-medium cursor-pointer px-2 ${viewMode === 'search' ? 'text-primary' : 'text-muted-foreground'}`}>
            🔍 Search & Reports
          </Label>
        </div>
      </div>

      {viewMode === 'analysis' ? (
        <div className="space-y-4 sm:space-y-5">
          {/* Time Selector */}
          <AnalysisTimeSelector
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
            customRange={customRange}
            onCustomRangeChange={setCustomRange}
          />

          {/* KPI Grid */}
          <AnalysisKPIGrid data={currentData} timeRange={timeRange} showMargin={timeRange === 'monthly'} />

          {/* Charts */}
          <Tabs defaultValue="trend" className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-10">
              <TabsTrigger value="trend" className="text-xs sm:text-sm">Trend</TabsTrigger>
              <TabsTrigger value="breakdown" className="text-xs sm:text-sm">Breakdown</TabsTrigger>
              <TabsTrigger value="top" className="text-xs sm:text-sm">Top Items</TabsTrigger>
            </TabsList>
            <TabsContent value="trend" className="mt-3">
              <AnalysisTrendChart data={trendChartData} height={isMobile ? 220 : 280} />
            </TabsContent>
            <TabsContent value="breakdown" className="mt-3">
              <AnalysisPieCharts paymentData={paymentPieData} expenseData={expensePieData} isMobile={isMobile} />
            </TabsContent>
            <TabsContent value="top" className="mt-3">
              <AnalysisTopItems topProducts={analytics.topProducts} topExpenses={analytics.topExpenseCategories} />
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Command Palette Trigger */}
          <Button variant="outline" onClick={() => setCommandOpen(true)} className="w-full gap-2 h-12 justify-start">
            <Search className="h-4 w-4" />
            <span className="flex-1 text-left text-muted-foreground">Search pages, actions, customers...</span>
            {!isMobile && <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px]"><span>⌘</span>K</kbd>}
          </Button>

          {/* Global Search */}
          <GlobalSearchCard
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchCategory={searchCategory}
            onCategoryChange={setSearchCategory}
            results={searchResults}
          />

          {/* Quick Reports */}
          <QuickReportsGrid
            onGenerateReport={generateReport}
            isGenerating={isGeneratingReport}
            userRole={userRole}
          />
        </div>
      )}

      {/* Command Palette Dialog */}
      <Dialog open={commandOpen} onOpenChange={setCommandOpen}>
        <DialogContent className="p-0 max-w-md overflow-hidden">
          <Command className="rounded-lg">
            <CommandInput placeholder="Type to search..." />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup heading="Pages">
                {navigationItems.filter(i => i.category === 'page').slice(0, 5).map(item => (
                  <CommandItem key={item.id} onSelect={() => handleAction(item.id)} className="gap-2">
                    <item.icon className="h-4 w-4" /> {item.title}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Quick Actions">
                {navigationItems.filter(i => i.category === 'action').map(item => (
                  <CommandItem key={item.id} onSelect={() => handleAction(item.id)} className="gap-2">
                    <item.icon className="h-4 w-4" /> {item.title}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Reports">
                {navigationItems.filter(i => i.category === 'report').map(item => (
                  <CommandItem key={item.id} onSelect={() => handleAction(item.id)} className="gap-2">
                    <item.icon className="h-4 w-4" /> {item.title}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>

      {/* Report Preview Dialog */}
      <ReportPreviewDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        report={currentReport}
      />

      {/* Loading Overlay */}
      {isGeneratingReport && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Generating report...</p>
          </div>
        </div>
      )}
    </div>
  );
};
