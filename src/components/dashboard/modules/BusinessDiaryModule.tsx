import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  RefreshCcw,
  TrendingUp,
  TrendingDown,
  Calendar as CalendarIcon,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  BookOpen,
  Wallet,
  Receipt,
  CircleDollarSign,
  Plus,
  CheckCircle,
  Clock,
  AlertCircle,
  Filter,
  ChevronDown
} from "lucide-react";
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
import { 
  useBusinessSales, 
  useBusinessExpenses, 
  useBusinessDiaryRealtime,
  useCustomerDebtSummary,
  SaleEntry,
  ExpenseEntry 
} from "@/hooks/queries/useBusinessDiaryQueries";
import { SaleEntryCard } from "@/components/diary/SaleEntryCard";
import { ExpenseEntryCard } from "@/components/diary/ExpenseEntryCard";
import { useIsMobile } from "@/hooks/use-mobile";
import { BusinessDiarySkeleton } from "./BusinessDiarySkeleton";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// ===== Constants =====
const EXPENSE_CATEGORIES = [
  { value: 'Utilities', label: 'Utilities', icon: '💡' },
  { value: 'Rent', label: 'Rent', icon: '🏠' },
  { value: 'Maintenance', label: 'Maintenance', icon: '🔧' },
  { value: 'Loading', label: 'Loading/Labor', icon: '👷' },
  { value: 'Entertainment', label: 'Entertainment', icon: '☕' },
  { value: 'Marketing', label: 'Marketing', icon: '📢' },
  { value: 'Bank', label: 'Bank Charges', icon: '🏦' },
  { value: 'Other', label: 'Other', icon: '📦' }
];

type DateRangeOption = 'today' | 'yesterday' | 'week' | 'month' | 'custom';
type PaymentFilter = 'all' | 'paid' | 'partial' | 'due';
type ExpenseSourceFilter = 'all' | 'pob' | 'salary' | 'vehicle' | 'manual';

// ===== Summary Card Component =====
interface SummaryCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<any>;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  subtitle?: string;
  onClick?: () => void;
  isActive?: boolean;
}

const SummaryCard = ({ title, value, icon: Icon, colorClass, bgClass, borderClass, subtitle, onClick, isActive }: SummaryCardProps) => (
  <Card 
    className={cn(
      "relative overflow-hidden border-0 shadow-md transition-all duration-300 cursor-pointer hover:shadow-lg",
      isActive && "ring-2 ring-primary ring-offset-2"
    )}
    onClick={onClick}
  >
    <div className={cn("absolute top-0 left-0 right-0 h-1", borderClass)} />
    <div className={cn("absolute inset-0", bgClass)} />
    <CardContent className="relative p-2.5 sm:p-4">
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <div className={cn("h-5 w-5 sm:h-6 sm:w-6 rounded-md flex items-center justify-center", bgClass)}>
            <Icon className={cn("h-3 w-3 sm:h-3.5 sm:w-3.5", colorClass)} />
          </div>
          <p className="text-[9px] sm:text-[10px] font-medium text-muted-foreground uppercase tracking-wider truncate">
            {title}
          </p>
        </div>
        <p className={cn("text-sm sm:text-lg lg:text-xl font-bold tabular-nums truncate", colorClass)}>
          {BANGLADESHI_CURRENCY_SYMBOL}{Math.abs(value).toLocaleString()}
        </p>
        {subtitle && (
          <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">{subtitle}</p>
        )}
      </div>
    </CardContent>
  </Card>
);

// ===== Sale Details Dialog =====
const SaleDetailsDialog = ({ sale, open, onClose }: { sale: SaleEntry | null; open: boolean; onClose: () => void }) => {
  if (!sale) return null;
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Transaction Details
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs">Transaction #</p>
              <p className="font-mono font-medium">{sale.transactionNumber}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs">Date & Time</p>
              <p className="font-medium">{format(new Date(sale.timestamp), 'PPpp')}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs">Customer</p>
              <p className="font-medium">{sale.customerName}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs">Phone</p>
              <p className="font-medium">{sale.customerPhone || 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs">Product</p>
              <p className="font-medium">{sale.productName}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs">Quantity</p>
              <p className="font-medium">{sale.quantity}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs">Total Bill</p>
              <p className="font-bold text-foreground">{BANGLADESHI_CURRENCY_SYMBOL}{sale.totalAmount.toLocaleString()}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs">Amount Paid</p>
              <p className="font-bold text-emerald-600">{BANGLADESHI_CURRENCY_SYMBOL}{sale.amountPaid.toLocaleString()}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs">Remaining Due</p>
              <p className={cn("font-bold", sale.remainingDue > 0 ? "text-rose-600" : "text-muted-foreground")}>
                {BANGLADESHI_CURRENCY_SYMBOL}{sale.remainingDue.toLocaleString()}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs">Payment Method</p>
              <p className="font-medium capitalize">{sale.paymentMethod}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs">Status</p>
              <Badge variant={sale.paymentStatus === 'paid' ? 'success' : sale.paymentStatus === 'partial' ? 'warning' : 'destructive'}>
                {sale.paymentStatus}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs">Sold By</p>
              <p className="font-medium capitalize">{sale.staffName}</p>
            </div>
          </div>
          {sale.returnCylinders.length > 0 && (
            <div className="pt-2 border-t">
              <p className="text-muted-foreground text-xs mb-2">Return Cylinders</p>
              <div className="flex gap-2 flex-wrap">
                {sale.returnCylinders.map((r, i) => (
                  <Badge key={i} variant="outline">{r.quantity}x {r.brand}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ===== Main Component =====
export const BusinessDiaryModule = () => {
  // Date range state
  const [dateRangeOption, setDateRangeOption] = useState<DateRangeOption>('today');
  const [customDate, setCustomDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  
  // Compute selected date based on option
  const selectedDate = useMemo(() => {
    const today = new Date();
    switch (dateRangeOption) {
      case 'today': return format(today, 'yyyy-MM-dd');
      case 'yesterday': return format(subDays(today, 1), 'yyyy-MM-dd');
      case 'custom': return format(customDate, 'yyyy-MM-dd');
      default: return format(today, 'yyyy-MM-dd');
    }
  }, [dateRangeOption, customDate]);

  // TanStack Query hooks
  const { data: sales = [], isLoading: salesLoading } = useBusinessSales(selectedDate);
  const { data: expenses = [], isLoading: expensesLoading } = useBusinessExpenses(selectedDate);
  const loading = salesLoading || expensesLoading;

  // Real-time subscriptions
  useBusinessDiaryRealtime(selectedDate);

  const queryClient = useQueryClient();
  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ['business-diary-sales', selectedDate] });
    queryClient.invalidateQueries({ queryKey: ['business-diary-expenses', selectedDate] });
  };

  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<'sales' | 'expenses'>('sales');
  const [searchQuery, setSearchQuery] = useState("");
  
  // Filter states
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
  const [expenseSourceFilter, setExpenseSourceFilter] = useState<ExpenseSourceFilter>('all');
  const [viewMode, setViewMode] = useState<'cash' | 'profit'>('cash');

  // Sale details dialog
  const [selectedSale, setSelectedSale] = useState<SaleEntry | null>(null);

  // Add expense dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newExpense, setNewExpense] = useState({
    category: '',
    description: '',
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd')
  });

  // Filter sales by payment status and search
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      if (paymentFilter !== 'all' && s.paymentStatus !== paymentFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return s.productName.toLowerCase().includes(query) ||
          s.customerName.toLowerCase().includes(query) ||
          s.transactionNumber.toLowerCase().includes(query) ||
          (s.customerPhone && s.customerPhone.includes(query));
      }
      return true;
    });
  }, [sales, paymentFilter, searchQuery]);

  // Filter expenses by source and search
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      if (expenseSourceFilter !== 'all' && e.type !== expenseSourceFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return e.category.toLowerCase().includes(query) ||
          e.description.toLowerCase().includes(query);
      }
      return true;
    });
  }, [expenses, expenseSourceFilter, searchQuery]);

  // Customer debt summary
  const debtSummary = useCustomerDebtSummary(sales);

  // Payment status counts
  const paidCount = sales.filter(s => s.paymentStatus === 'paid').length;
  const partialCount = sales.filter(s => s.paymentStatus === 'partial').length;
  const dueCount = sales.filter(s => s.paymentStatus === 'due').length;

  // Expense source counts
  const pobCount = expenses.filter(e => e.type === 'pob').length;
  const salaryCount = expenses.filter(e => e.type === 'salary').length;
  const vehicleCount = expenses.filter(e => e.type === 'vehicle').length;
  const manualCount = expenses.filter(e => e.type === 'manual').length;

  // Day totals
  const dayTotals = useMemo(() => {
    const cashIn = filteredSales.reduce((sum, s) => sum + (s.amountPaid ?? 0), 0);
    const cashOut = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const netCashFlow = cashIn - cashOut;
    const revenue = filteredSales.reduce((sum, s) => sum + (s.totalAmount ?? 0), 0);
    const totalCOGS = filteredSales.reduce((sum, s) => sum + (s.cogs ?? 0), 0);
    const operatingExpenses = filteredExpenses.filter(e => e.type !== 'pob').reduce((sum, e) => sum + Number(e.amount), 0);
    const grossProfit = revenue - totalCOGS;
    const netProfit = grossProfit - operatingExpenses;

    return { cashIn, cashOut, netCashFlow, revenue, cogs: totalCOGS, operatingExpenses, grossProfit, netProfit };
  }, [filteredSales, filteredExpenses]);

  // Handle add expense
  const handleAddExpense = async () => {
    if (!newExpense.amount || !newExpense.category) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }

    const amount = Number(newExpense.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Invalid amount", variant: "destructive" });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      const { error } = await supabase.from('daily_expenses').insert({
        expense_date: newExpense.date,
        category: newExpense.category,
        description: newExpense.description || newExpense.category,
        amount: amount,
        created_by: user.id
      });

      if (error) throw error;
      toast({ title: "Expense added successfully" });
      setAddDialogOpen(false);
      setNewExpense({ category: '', description: '', amount: '', date: format(new Date(), 'yyyy-MM-dd') });
      refetch();
    } catch (error: any) {
      toast({ title: "Error adding expense", description: error.message, variant: "destructive" });
    }
  };

  const handleNavigateToSource = (source: string) => {
    const moduleMap: Record<string, string> = { 'POB': 'pob', 'Vehicle Cost': 'vehicle-cost', 'POS': 'pos', 'Staff Salary': 'utility-expense' };
    const module = moduleMap[source];
    if (module) window.dispatchEvent(new CustomEvent('navigate-module', { detail: module }));
  };

  // Show skeleton during initial load
  if (loading && sales.length === 0 && expenses.length === 0) {
    return <BusinessDiarySkeleton />;
  }

  return (
    <div className="space-y-4 sm:space-y-5 pb-4">
      {/* Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-secondary/5 rounded-xl -z-10" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
              <BookOpen className="h-5 w-5 sm:h-5 sm:w-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground tracking-tight">Business Diary</h2>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Track all money IN & OUT • Real-time sync</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2 bg-card/80 backdrop-blur-sm rounded-lg p-1.5 border border-border/50 shadow-sm">
            {/* View Toggle */}
            <div className="flex bg-muted/50 rounded-md p-0.5 border border-border/50">
              <Button variant="ghost" size="sm" onClick={() => setViewMode('cash')}
                className={cn("h-7 px-2 text-[10px] font-medium rounded", viewMode === 'cash' ? "bg-background shadow text-primary" : "text-muted-foreground")}>
                Cash Flow
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setViewMode('profit')}
                className={cn("h-7 px-2 text-[10px] font-medium rounded", viewMode === 'profit' ? "bg-background shadow text-primary" : "text-muted-foreground")}>
                Profit
              </Button>
            </div>

            {/* Date Range Selector */}
            <div className="flex bg-muted/50 rounded-md p-0.5 border border-border/50">
              {(['today', 'yesterday'] as const).map(opt => (
                <Button key={opt} variant="ghost" size="sm"
                  onClick={() => { setDateRangeOption(opt); setCalendarOpen(false); }}
                  className={cn("h-7 px-2 text-[10px] font-medium rounded capitalize", dateRangeOption === opt ? "bg-background shadow text-primary" : "text-muted-foreground")}>
                  {opt}
                </Button>
              ))}
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm"
                    className={cn("h-7 px-2 text-[10px] font-medium rounded", dateRangeOption === 'custom' ? "bg-background shadow text-primary" : "text-muted-foreground")}>
                    <CalendarIcon className="h-3 w-3 mr-1" />
                    {dateRangeOption === 'custom' ? format(customDate, 'MMM dd') : 'Custom'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar mode="single" selected={customDate} onSelect={(d) => { if(d) { setCustomDate(d); setDateRangeOption('custom'); setCalendarOpen(false); }}}
                    initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>

            {/* Add Expense */}
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8 bg-primary hover:bg-primary/90 shadow touch-manipulation">
                  <Plus className="h-3.5 w-3.5 sm:mr-1" />
                  <span className="hidden sm:inline text-xs">Add</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] sm:max-w-md">
                <DialogHeader><DialogTitle>Add Daily Expense</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={newExpense.category} onValueChange={(v) => setNewExpense({ ...newExpense, category: v })}>
                      <SelectTrigger className="h-11"><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        {EXPENSE_CATEGORIES.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>{cat.icon} {cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Amount ({BANGLADESHI_CURRENCY_SYMBOL})</Label>
                    <Input type="number" value={newExpense.amount} onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                      placeholder="0" className="h-11 text-lg font-semibold" />
                  </div>
                  <div className="space-y-2">
                    <Label>Description <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                    <Input value={newExpense.description} onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                      placeholder="e.g., Office Rent for January" className="h-11" />
                  </div>
                  <Button onClick={handleAddExpense} className="w-full h-11" disabled={!newExpense.amount || !newExpense.category}>
                    Save Expense
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button variant="outline" size="icon" onClick={refetch} className="h-8 w-8 shrink-0 border-border/50 hover:bg-primary/10">
              <RefreshCcw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* 6-Card Summary Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        <SummaryCard title="Total Sales" value={viewMode === 'profit' ? dayTotals.revenue : dayTotals.cashIn}
          icon={ArrowUpRight} colorClass="text-emerald-600 dark:text-emerald-400" bgClass="bg-emerald-500/10" borderClass="bg-emerald-500"
          subtitle={`${filteredSales.length} transactions`} />
        <SummaryCard title="Expenses" value={viewMode === 'profit' ? (dayTotals.cogs + dayTotals.operatingExpenses) : dayTotals.cashOut}
          icon={ArrowDownRight} colorClass="text-rose-600 dark:text-rose-400" bgClass="bg-rose-500/10" borderClass="bg-rose-500"
          subtitle={`${filteredExpenses.length} entries`} />
        <SummaryCard title={viewMode === 'profit' ? 'Profit' : 'Net Flow'} value={viewMode === 'profit' ? dayTotals.netProfit : dayTotals.netCashFlow}
          icon={dayTotals.netCashFlow >= 0 ? TrendingUp : TrendingDown}
          colorClass={dayTotals.netCashFlow >= 0 ? "text-primary" : "text-destructive"}
          bgClass={dayTotals.netCashFlow >= 0 ? "bg-primary/10" : "bg-destructive/10"}
          borderClass={dayTotals.netCashFlow >= 0 ? "bg-primary" : "bg-destructive"} />
        <SummaryCard title="Paid" value={debtSummary.totalPaidAmount} icon={CheckCircle}
          colorClass="text-emerald-600 dark:text-emerald-400" bgClass="bg-emerald-500/10" borderClass="bg-emerald-500"
          subtitle={`${debtSummary.totalPaidCount} sales`} onClick={() => setPaymentFilter(paymentFilter === 'paid' ? 'all' : 'paid')}
          isActive={paymentFilter === 'paid'} />
        <SummaryCard title="Partial" value={debtSummary.partialPaidAmount} icon={Clock}
          colorClass="text-amber-600 dark:text-amber-400" bgClass="bg-amber-500/10" borderClass="bg-amber-500"
          subtitle={`Due: ${BANGLADESHI_CURRENCY_SYMBOL}${debtSummary.partialRemainingDue.toLocaleString()}`}
          onClick={() => setPaymentFilter(paymentFilter === 'partial' ? 'all' : 'partial')} isActive={paymentFilter === 'partial'} />
        <SummaryCard title="Due" value={debtSummary.dueAmount} icon={AlertCircle}
          colorClass="text-rose-600 dark:text-rose-400" bgClass="bg-rose-500/10" borderClass="bg-rose-500"
          subtitle={`${debtSummary.dueCount} unpaid`} onClick={() => setPaymentFilter(paymentFilter === 'due' ? 'all' : 'due')}
          isActive={paymentFilter === 'due'} />
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input placeholder="Search product, customer, transaction..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 text-sm bg-card/50 border-border/50 rounded-lg" />
        </div>
      </div>

      {/* Main Content */}
      {isMobile ? (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'sales' | 'expenses')}>
          <div className="bg-muted/50 p-1 rounded-lg border border-border/50">
            <TabsList className="grid w-full grid-cols-2 h-auto gap-1 bg-transparent p-0">
              <TabsTrigger value="sales" className="h-11 rounded-md data-[state=active]:bg-emerald-500 data-[state=active]:text-white touch-manipulation">
                <ArrowUpRight className="h-4 w-4 mr-1.5" />
                <span className="font-medium">Sales</span>
                <Badge className="ml-1.5 h-5 text-[10px] bg-white/20">{filteredSales.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="expenses" className="h-11 rounded-md data-[state=active]:bg-rose-500 data-[state=active]:text-white touch-manipulation">
                <ArrowDownRight className="h-4 w-4 mr-1.5" />
                <span className="font-medium">Expenses</span>
                <Badge className="ml-1.5 h-5 text-[10px] bg-white/20">{filteredExpenses.length}</Badge>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Payment Status Filter - Sales Tab */}
          <TabsContent value="sales" className="mt-3 space-y-3">
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {[
                { value: 'all' as const, label: 'All', count: sales.length },
                { value: 'paid' as const, label: 'Paid', count: paidCount },
                { value: 'partial' as const, label: 'Partial', count: partialCount },
                { value: 'due' as const, label: 'Due', count: dueCount }
              ].map(opt => (
                <Button key={opt.value} variant={paymentFilter === opt.value ? 'default' : 'outline'} size="sm"
                  onClick={() => setPaymentFilter(opt.value)} className="h-8 px-3 text-xs shrink-0">
                  {opt.label} <Badge variant="secondary" className="ml-1.5 h-4 text-[10px]">{opt.count}</Badge>
                </Button>
              ))}
            </div>
            {filteredSales.length === 0 ? (
              <Card className="border-dashed border-2 border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-950/20">
                <CardContent className="flex flex-col items-center justify-center py-10">
                  <Receipt className="h-10 w-10 text-emerald-400 mb-3" />
                  <p className="font-medium">No sales found</p>
                  <p className="text-xs text-muted-foreground mt-1">No {paymentFilter !== 'all' ? paymentFilter : ''} sales for {format(new Date(selectedDate), 'MMM dd')}</p>
                </CardContent>
              </Card>
            ) : (
              filteredSales.map(entry => <SaleEntryCard key={entry.id} entry={entry} onViewDetails={setSelectedSale} />)
            )}
          </TabsContent>

          {/* Expense Source Filter - Expenses Tab */}
          <TabsContent value="expenses" className="mt-3 space-y-3">
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {[
                { value: 'all' as const, label: 'All', count: expenses.length },
                { value: 'pob' as const, label: 'POB', count: pobCount },
                { value: 'salary' as const, label: 'Salary', count: salaryCount },
                { value: 'vehicle' as const, label: 'Vehicle', count: vehicleCount },
                { value: 'manual' as const, label: 'Manual', count: manualCount }
              ].map(opt => (
                <Button key={opt.value} variant={expenseSourceFilter === opt.value ? 'default' : 'outline'} size="sm"
                  onClick={() => setExpenseSourceFilter(opt.value)} className="h-8 px-3 text-xs shrink-0">
                  {opt.label} <Badge variant="secondary" className="ml-1.5 h-4 text-[10px]">{opt.count}</Badge>
                </Button>
              ))}
            </div>
            {filteredExpenses.length === 0 ? (
              <Card className="border-dashed border-2 border-rose-200 dark:border-rose-800/50 bg-rose-50/50 dark:bg-rose-950/20">
                <CardContent className="flex flex-col items-center justify-center py-10">
                  <CircleDollarSign className="h-10 w-10 text-rose-400 mb-3" />
                  <p className="font-medium">No expenses found</p>
                  <p className="text-xs text-muted-foreground mt-1">POB, Staff Salary & Vehicle costs appear here</p>
                </CardContent>
              </Card>
            ) : (
              filteredExpenses.map(entry => <ExpenseEntryCard key={entry.id} entry={entry} onNavigateToSource={handleNavigateToSource} />)
            )}
          </TabsContent>
        </Tabs>
      ) : (
        /* Desktop: Side by Side Panels */
        <div className="grid lg:grid-cols-2 gap-4 lg:gap-5">
          {/* Sales Panel */}
          <Card className="border-0 shadow-lg overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-emerald-500 to-emerald-400" />
            <CardHeader className="pb-2 px-4 pt-4 bg-gradient-to-b from-emerald-50/50 dark:from-emerald-950/20 to-transparent">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <ArrowUpRight className="h-4 w-4" />Daily Sales
                </div>
                <Badge variant="secondary" className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-0">
                  {filteredSales.length}
                </Badge>
              </CardTitle>
              {/* Payment Filter */}
              <div className="flex gap-1.5 mt-2">
                {[
                  { value: 'all' as const, label: 'All', count: sales.length },
                  { value: 'paid' as const, label: 'Paid', count: paidCount },
                  { value: 'partial' as const, label: 'Partial', count: partialCount },
                  { value: 'due' as const, label: 'Due', count: dueCount }
                ].map(opt => (
                  <Button key={opt.value} variant={paymentFilter === opt.value ? 'default' : 'ghost'} size="sm"
                    onClick={() => setPaymentFilter(opt.value)} className="h-7 px-2 text-[10px]">
                    {opt.label} ({opt.count})
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <ScrollArea className="h-[420px] pr-2">
                <div className="space-y-2.5">
                  {filteredSales.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Receipt className="h-10 w-10 text-emerald-300 mb-3" />
                      <p className="text-sm font-medium">No sales found</p>
                    </div>
                  ) : (
                    filteredSales.map(entry => <SaleEntryCard key={entry.id} entry={entry} onViewDetails={setSelectedSale} />)
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Expenses Panel */}
          <Card className="border-0 shadow-lg overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-rose-500 to-rose-400" />
            <CardHeader className="pb-2 px-4 pt-4 bg-gradient-to-b from-rose-50/50 dark:from-rose-950/20 to-transparent">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                  <ArrowDownRight className="h-4 w-4" />Daily Expenses
                </div>
                <Badge variant="secondary" className="bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-0">
                  {filteredExpenses.length}
                </Badge>
              </CardTitle>
              {/* Expense Source Filter */}
              <div className="flex gap-1.5 mt-2">
                {[
                  { value: 'all' as const, label: 'All', count: expenses.length },
                  { value: 'pob' as const, label: 'POB', count: pobCount },
                  { value: 'salary' as const, label: 'Salary', count: salaryCount },
                  { value: 'vehicle' as const, label: 'Vehicle', count: vehicleCount },
                  { value: 'manual' as const, label: 'Manual', count: manualCount }
                ].map(opt => (
                  <Button key={opt.value} variant={expenseSourceFilter === opt.value ? 'default' : 'ghost'} size="sm"
                    onClick={() => setExpenseSourceFilter(opt.value)} className="h-7 px-2 text-[10px]">
                    {opt.label} ({opt.count})
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <ScrollArea className="h-[420px] pr-2">
                <div className="space-y-2.5">
                  {filteredExpenses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <CircleDollarSign className="h-10 w-10 text-rose-300 mb-3" />
                      <p className="text-sm font-medium">No expenses found</p>
                    </div>
                  ) : (
                    filteredExpenses.map(entry => <ExpenseEntryCard key={entry.id} entry={entry} onNavigateToSource={handleNavigateToSource} />)
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sale Details Dialog */}
      <SaleDetailsDialog sale={selectedSale} open={!!selectedSale} onClose={() => setSelectedSale(null)} />
    </div>
  );
};
