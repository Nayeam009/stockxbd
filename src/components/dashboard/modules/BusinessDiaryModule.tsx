import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  RefreshCcw, 
  Loader2, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  BookOpen,
  Filter
} from "lucide-react";
import { format, subDays } from "date-fns";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
import { useBusinessDiaryData } from "@/hooks/useBusinessDiaryData";
import { SaleEntryCard } from "@/components/diary/SaleEntryCard";
import { ExpenseEntryCard } from "@/components/diary/ExpenseEntryCard";
import { DiaryAnalysisPanel } from "@/components/diary/DiaryAnalysisPanel";
import { useIsMobile } from "@/hooks/use-mobile";

export const BusinessDiaryModule = () => {
  const { sales, expenses, loading, refetch, analytics } = useBusinessDiaryData();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<'sales' | 'expenses' | 'analysis'>('sales');
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

  // Day totals
  const dayTotals = useMemo(() => {
    const dayIncome = filteredSales.reduce((sum, s) => sum + s.totalAmount, 0);
    const dayExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    return { income: dayIncome, expenses: dayExpenses, profit: dayIncome - dayExpenses };
  }, [filteredSales, filteredExpenses]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading Business Diary...</p>
        </div>
      </div>
    );
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
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Business Diary
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">Track all money IN & OUT</p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-auto min-w-[140px] h-11 text-sm touch-manipulation"
          />
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refetch} 
            className="h-11 w-11 p-0 touch-manipulation"
            aria-label="Refresh data"
          >
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card className="bg-gradient-to-br from-green-500/10 via-card to-card border-green-500/20">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground">Income</p>
                <p className="text-sm sm:text-lg lg:text-xl font-bold text-green-600 dark:text-green-400 truncate">
                  +{BANGLADESHI_CURRENCY_SYMBOL}{dayTotals.income.toLocaleString()}
                </p>
              </div>
              <ArrowUpRight className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500/10 via-card to-card border-red-500/20">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground">Expenses</p>
                <p className="text-sm sm:text-lg lg:text-xl font-bold text-red-600 dark:text-red-400 truncate">
                  -{BANGLADESHI_CURRENCY_SYMBOL}{dayTotals.expenses.toLocaleString()}
                </p>
              </div>
              <ArrowDownRight className="h-4 w-4 sm:h-5 sm:w-5 text-red-500 shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card className={`bg-gradient-to-br ${dayTotals.profit >= 0 ? 'from-primary/10' : 'from-destructive/10'} via-card to-card`}>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground">{dayTotals.profit >= 0 ? 'Profit' : 'Loss'}</p>
                <p className={`text-sm sm:text-lg lg:text-xl font-bold truncate ${dayTotals.profit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                  {BANGLADESHI_CURRENCY_SYMBOL}{Math.abs(dayTotals.profit).toLocaleString()}
                </p>
              </div>
              {dayTotals.profit >= 0 ? <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" /> : <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-destructive shrink-0" />}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search transactions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-11 text-sm touch-manipulation"
        />
      </div>

      {/* Main Content - Dual Panel on Desktop, Tabs on Mobile */}
      {isMobile ? (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-3 h-12">
            <TabsTrigger value="sales" className="text-xs gap-1 h-11 touch-manipulation">
              <ArrowUpRight className="h-3.5 w-3.5" /> Sales ({filteredSales.length})
            </TabsTrigger>
            <TabsTrigger value="expenses" className="text-xs gap-1 h-11 touch-manipulation">
              <ArrowDownRight className="h-3.5 w-3.5" /> Expense ({filteredExpenses.length})
            </TabsTrigger>
            <TabsTrigger value="analysis" className="text-xs h-11 touch-manipulation">Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="sales" className="mt-3 space-y-3">
            {filteredSales.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-10">
                  <ArrowUpRight className="h-10 w-10 text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No sales found for this day</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Try selecting a different date</p>
                </CardContent>
              </Card>
            ) : (
              filteredSales.map(entry => <SaleEntryCard key={entry.id} entry={entry} />)
            )}
          </TabsContent>

          <TabsContent value="expenses" className="mt-3 space-y-3">
            {filteredExpenses.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-10">
                  <ArrowDownRight className="h-10 w-10 text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No expenses found for this day</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Expenses from POB, Staff, and Vehicle will appear here</p>
                </CardContent>
              </Card>
            ) : (
              filteredExpenses.map(entry => (
                <ExpenseEntryCard key={entry.id} entry={entry} onNavigateToSource={handleNavigateToSource} />
              ))
            )}
          </TabsContent>

          <TabsContent value="analysis" className="mt-3">
            <DiaryAnalysisPanel sales={sales} expenses={expenses} analytics={analytics} />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-4">
          {/* Desktop: Side by Side */}
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Sales Panel */}
            <Card>
              <CardHeader className="pb-2 px-4 pt-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-green-600 dark:text-green-500">
                  <ArrowUpRight className="h-4 w-4" />
                  Daily Sales ({filteredSales.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <ScrollArea className="h-[400px] pr-2">
                  <div className="space-y-3">
                    {filteredSales.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <ArrowUpRight className="h-8 w-8 text-muted-foreground/40 mb-2" />
                        <p className="text-sm">No sales found</p>
                      </div>
                    ) : (
                      filteredSales.map(entry => <SaleEntryCard key={entry.id} entry={entry} />)
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Expenses Panel */}
            <Card>
              <CardHeader className="pb-2 px-4 pt-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-red-600 dark:text-red-500">
                  <ArrowDownRight className="h-4 w-4" />
                  Daily Expenses ({filteredExpenses.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <ScrollArea className="h-[400px] pr-2">
                  <div className="space-y-3">
                    {filteredExpenses.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <ArrowDownRight className="h-8 w-8 text-muted-foreground/40 mb-2" />
                        <p className="text-sm">No expenses found</p>
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

          {/* Analysis Panel */}
          <DiaryAnalysisPanel sales={sales} expenses={expenses} analytics={analytics} />
        </div>
      )}
    </div>
  );
};
