import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  RefreshCcw, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  BookOpen,
  Wallet,
  Receipt,
  CircleDollarSign
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, startOfYear, endOfYear } from "date-fns";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
import { useBusinessSales, useBusinessExpenses, useBusinessDiaryRealtime } from "@/hooks/queries/useBusinessDiaryQueries";
import { SaleEntryCard } from "@/components/diary/SaleEntryCard";
import { ExpenseEntryCard } from "@/components/diary/ExpenseEntryCard";
import { useIsMobile } from "@/hooks/use-mobile";
import { BusinessDiarySkeleton } from "./BusinessDiarySkeleton";
import { useQueryClient } from "@tanstack/react-query";

export const BusinessDiaryModule = () => {
  // TanStack Query hooks with caching
  const { data: sales = [], isLoading: salesLoading } = useBusinessSales();
  const { data: expenses = [], isLoading: expensesLoading } = useBusinessExpenses();
  const loading = salesLoading || expensesLoading;
  
  // Set up real-time subscriptions with debouncing
  useBusinessDiaryRealtime();
  
  const queryClient = useQueryClient();
  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ['business-diary-sales'] });
    queryClient.invalidateQueries({ queryKey: ['business-diary-expenses'] });
  };
  
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<'sales' | 'expenses'>('sales');
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Filter sales
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      if (dateFilter && s.date !== dateFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return s.productName.toLowerCase().includes(query) ||
               s.customerName.toLowerCase().includes(query) ||
               s.transactionNumber.toLowerCase().includes(query);
      }
      return true;
    });
  }, [sales, dateFilter, searchQuery]);

  // Filter expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      if (dateFilter && e.date !== dateFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return e.category.toLowerCase().includes(query) ||
               e.description.toLowerCase().includes(query);
      }
      return true;
    });
  }, [expenses, dateFilter, searchQuery]);

  // Day totals (memoized)
  const dayTotals = useMemo(() => {
    const dayIncome = filteredSales.reduce((sum, s) => sum + s.totalAmount, 0);
    const dayExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    return { income: dayIncome, expenses: dayExpenses, profit: dayIncome - dayExpenses };
  }, [filteredSales, filteredExpenses]);

  // Show skeleton during initial load only
  if (loading && sales.length === 0 && expenses.length === 0) {
    return <BusinessDiarySkeleton />;
  }

  const handleNavigateToSource = (source: string) => {
    const moduleMap: Record<string, string> = {
      'POB': 'pob',
      'Staff Salary': 'staff-salary',
      'Vehicle Cost': 'vehicle-cost',
      'POS': 'pos'
    };
    const module = moduleMap[source];
    if (module) {
      window.dispatchEvent(new CustomEvent('navigate-module', { detail: module }));
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-4">
      {/* Premium Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-secondary/5 rounded-xl -z-10" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-0">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
                <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground tracking-tight">
                  Business Diary
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Track all money IN & OUT • Real-time sync
                </p>
              </div>
            </div>
          </div>
          
          {/* Control Bar */}
          <div className="flex items-center gap-2 bg-card/80 backdrop-blur-sm rounded-xl p-2 border border-border/50 shadow-sm">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-auto min-w-[150px] h-11 pl-9 text-sm touch-manipulation border-border/50 bg-background/50"
              />
            </div>
            <Button 
              variant="outline" 
              size="icon"
              onClick={refetch} 
              className="h-11 w-11 shrink-0 touch-manipulation border-border/50 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors"
              aria-label="Refresh data"
            >
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Premium Summary Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {/* Income Card */}
        <Card className="relative overflow-hidden border-0 shadow-lg group hover:shadow-xl transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent" />
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-400" />
          <CardContent className="relative p-3 sm:p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <ArrowUpRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">Income</p>
                </div>
                <p className="text-lg sm:text-2xl lg:text-3xl font-bold text-emerald-600 dark:text-emerald-400 truncate tabular-nums">
                  +{BANGLADESHI_CURRENCY_SYMBOL}{dayTotals.income.toLocaleString()}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  {filteredSales.length} transaction{filteredSales.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expenses Card */}
        <Card className="relative overflow-hidden border-0 shadow-lg group hover:shadow-xl transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent" />
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-rose-400" />
          <CardContent className="relative p-3 sm:p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-lg bg-rose-500/20 flex items-center justify-center">
                    <ArrowDownRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-rose-600 dark:text-rose-400" />
                  </div>
                  <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">Expenses</p>
                </div>
                <p className="text-lg sm:text-2xl lg:text-3xl font-bold text-rose-600 dark:text-rose-400 truncate tabular-nums">
                  -{BANGLADESHI_CURRENCY_SYMBOL}{dayTotals.expenses.toLocaleString()}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  {filteredExpenses.length} transaction{filteredExpenses.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profit/Loss Card */}
        <Card className={`relative overflow-hidden border-0 shadow-lg group hover:shadow-xl transition-all duration-300`}>
          <div className={`absolute inset-0 bg-gradient-to-br ${dayTotals.profit >= 0 ? 'from-primary/10 via-primary/5' : 'from-destructive/10 via-destructive/5'} to-transparent`} />
          <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${dayTotals.profit >= 0 ? 'from-primary to-primary/80' : 'from-destructive to-destructive/80'}`} />
          <CardContent className="relative p-3 sm:p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <div className={`h-6 w-6 sm:h-7 sm:w-7 rounded-lg ${dayTotals.profit >= 0 ? 'bg-primary/20' : 'bg-destructive/20'} flex items-center justify-center`}>
                    {dayTotals.profit >= 0 ? (
                      <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive" />
                    )}
                  </div>
                  <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {dayTotals.profit >= 0 ? 'Profit' : 'Loss'}
                  </p>
                </div>
                <p className={`text-lg sm:text-2xl lg:text-3xl font-bold truncate tabular-nums ${dayTotals.profit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                  {BANGLADESHI_CURRENCY_SYMBOL}{Math.abs(dayTotals.profit).toLocaleString()}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  Net {dayTotals.profit >= 0 ? 'gain' : 'loss'} today
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
          <Search className="h-4 w-4 text-muted-foreground" />
        </div>
        <Input
          placeholder="Search by product, customer, or transaction..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-12 text-sm touch-manipulation bg-card/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 rounded-xl"
        />
      </div>

      {/* Main Content - Dual Panel on Desktop, Premium Tabs on Mobile */}
      {isMobile ? (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'sales' | 'expenses')}>
          {/* Premium Tab Switcher */}
          <div className="bg-muted/50 p-1.5 rounded-xl border border-border/50">
            <TabsList className="grid w-full grid-cols-2 h-auto gap-1 bg-transparent p-0">
              <TabsTrigger 
                value="sales" 
                className="h-12 rounded-lg data-[state=active]:bg-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=inactive]:bg-transparent data-[state=inactive]:hover:bg-background/80 transition-all duration-200 touch-manipulation"
              >
                <div className="flex items-center gap-2">
                  <ArrowUpRight className="h-4 w-4" />
                  <span className="font-medium">Sales</span>
                  <Badge variant="secondary" className="h-5 px-1.5 text-[10px] data-[state=active]:bg-white/20 data-[state=active]:text-white">
                    {filteredSales.length}
                  </Badge>
                </div>
              </TabsTrigger>
              <TabsTrigger 
                value="expenses" 
                className="h-12 rounded-lg data-[state=active]:bg-rose-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=inactive]:bg-transparent data-[state=inactive]:hover:bg-background/80 transition-all duration-200 touch-manipulation"
              >
                <div className="flex items-center gap-2">
                  <ArrowDownRight className="h-4 w-4" />
                  <span className="font-medium">Expenses</span>
                  <Badge variant="secondary" className="h-5 px-1.5 text-[10px] data-[state=active]:bg-white/20 data-[state=active]:text-white">
                    {filteredExpenses.length}
                  </Badge>
                </div>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="sales" className="mt-4 space-y-3">
            {filteredSales.length === 0 ? (
              <Card className="border-dashed border-2 border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-950/20">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="h-16 w-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
                    <Receipt className="h-8 w-8 text-emerald-500" />
                  </div>
                  <p className="text-base font-semibold text-foreground">No sales found</p>
                  <p className="text-sm text-muted-foreground mt-1 text-center max-w-[250px]">
                    No sales recorded for {format(new Date(dateFilter), 'MMM dd, yyyy')}
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-4 h-11 touch-manipulation border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                    onClick={() => window.dispatchEvent(new CustomEvent('navigate-module', { detail: 'pos' }))}
                  >
                    <Wallet className="h-4 w-4 mr-2" />
                    Go to POS
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filteredSales.map(entry => <SaleEntryCard key={entry.id} entry={entry} />)
            )}
          </TabsContent>

          <TabsContent value="expenses" className="mt-4 space-y-3">
            {filteredExpenses.length === 0 ? (
              <Card className="border-dashed border-2 border-rose-200 dark:border-rose-800/50 bg-rose-50/50 dark:bg-rose-950/20">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="h-16 w-16 rounded-2xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mb-4">
                    <CircleDollarSign className="h-8 w-8 text-rose-500" />
                  </div>
                  <p className="text-base font-semibold text-foreground">No expenses found</p>
                  <p className="text-sm text-muted-foreground mt-1 text-center max-w-[250px]">
                    Expenses from POB, Staff Salary, and Vehicle Costs will appear here
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-4 h-11 touch-manipulation border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                    onClick={() => window.dispatchEvent(new CustomEvent('navigate-module', { detail: 'inventory' }))}
                  >
                    <ArrowDownRight className="h-4 w-4 mr-2" />
                    Go to Inventory
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filteredExpenses.map(entry => (
                <ExpenseEntryCard key={entry.id} entry={entry} onNavigateToSource={handleNavigateToSource} />
              ))
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-4">
          {/* Desktop: Side by Side Premium Panels */}
          <div className="grid lg:grid-cols-2 gap-4 lg:gap-6">
            {/* Sales Panel */}
            <Card className="border-0 shadow-lg overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-emerald-500 to-emerald-400" />
              <CardHeader className="pb-3 px-5 pt-5 bg-gradient-to-b from-emerald-50/50 dark:from-emerald-950/20 to-transparent">
                <CardTitle className="text-base font-semibold flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <ArrowUpRight className="h-4 w-4" />
                    </div>
                    Daily Sales
                  </div>
                  <Badge variant="secondary" className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-0">
                    {filteredSales.length} entries
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <ScrollArea className="h-[450px] pr-3">
                  <div className="space-y-3">
                    {filteredSales.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                        <div className="h-14 w-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
                          <Receipt className="h-7 w-7 text-emerald-400" />
                        </div>
                        <p className="text-sm font-medium">No sales found</p>
                        <p className="text-xs text-muted-foreground mt-1">Select a different date</p>
                      </div>
                    ) : (
                      filteredSales.map(entry => <SaleEntryCard key={entry.id} entry={entry} />)
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Expenses Panel */}
            <Card className="border-0 shadow-lg overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-rose-500 to-rose-400" />
              <CardHeader className="pb-3 px-5 pt-5 bg-gradient-to-b from-rose-50/50 dark:from-rose-950/20 to-transparent">
                <CardTitle className="text-base font-semibold flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
                    <div className="h-8 w-8 rounded-lg bg-rose-500/20 flex items-center justify-center">
                      <ArrowDownRight className="h-4 w-4" />
                    </div>
                    Daily Expenses
                  </div>
                  <Badge variant="secondary" className="bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-0">
                    {filteredExpenses.length} entries
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <ScrollArea className="h-[450px] pr-3">
                  <div className="space-y-3">
                    {filteredExpenses.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                        <div className="h-14 w-14 rounded-2xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mb-4">
                          <CircleDollarSign className="h-7 w-7 text-rose-400" />
                        </div>
                        <p className="text-sm font-medium">No expenses found</p>
                        <p className="text-xs text-muted-foreground mt-1">POB & costs appear here</p>
                      </div>
                    ) : (
                      filteredExpenses.map(entry => (
                        <ExpenseEntryCard key={entry.id} entry={entry} onNavigateToSource={handleNavigateToSource} />
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
