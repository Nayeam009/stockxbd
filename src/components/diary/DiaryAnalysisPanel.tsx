import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon
} from "lucide-react";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
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
import { format, subDays } from "date-fns";
import { SaleEntry, ExpenseEntry } from "@/hooks/useBusinessDiaryData";

interface DiaryAnalysisPanelProps {
  sales: SaleEntry[];
  expenses: ExpenseEntry[];
  analytics: {
    todayIncome: number;
    todayExpenses: number;
    todayProfit: number;
    weeklyIncome: number;
    weeklyExpenses: number;
    weeklyProfit: number;
    monthlyIncome: number;
    monthlyExpenses: number;
    monthlyProfit: number;
    yearlyIncome: number;
    yearlyExpenses: number;
    yearlyProfit: number;
    incomeGrowth: number;
    expenseGrowth: number;
    profitMargin: number;
    topProducts: { name: string; amount: number; count: number }[];
    topExpenseCategories: { name: string; amount: number; icon: string; color: string }[];
    paymentBreakdown: { method: string; amount: number }[];
  };
}

const CHART_COLORS = ['#22c55e', '#3b82f6', '#f97316', '#8b5cf6', '#ec4899', '#06b6d4', '#eab308'];

type TimeRange = 'daily' | 'weekly' | 'monthly' | 'yearly';

export const DiaryAnalysisPanel = ({ sales, expenses, analytics }: DiaryAnalysisPanelProps) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('daily');

  // Get data based on time range
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

  // Prepare trend chart data (last 7 days)
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

  return (
    <div className="space-y-4">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Analysis
        </h3>
        <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
          {(['daily', 'weekly', 'monthly', 'yearly'] as TimeRange[]).map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? "default" : "ghost"}
              size="sm"
              onClick={() => setTimeRange(range)}
              className={`h-7 px-2 sm:px-3 text-xs capitalize ${timeRange === range ? "bg-primary text-primary-foreground" : ""}`}
            >
              {range}
            </Button>
          ))}
        </div>
      </div>

      {/* Main KPIs */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {/* Income */}
        <Card className="bg-gradient-to-br from-green-500/10 via-card to-card border-green-500/20">
          <CardContent className="p-3 sm:p-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Income</p>
                <ArrowUpRight className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
              </div>
              <p className="text-sm sm:text-xl font-bold text-green-600 dark:text-green-400">
                {BANGLADESHI_CURRENCY_SYMBOL}{currentData.income.toLocaleString()}
              </p>
              {timeRange === 'monthly' && (
                <div className="flex items-center gap-1 text-[10px]">
                  {analytics.incomeGrowth >= 0 ? (
                    <TrendingUp className="h-2.5 w-2.5 text-green-500" />
                  ) : (
                    <TrendingDown className="h-2.5 w-2.5 text-red-500" />
                  )}
                  <span className={analytics.incomeGrowth >= 0 ? "text-green-500" : "text-red-500"}>
                    {Math.abs(analytics.incomeGrowth).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Expenses */}
        <Card className="bg-gradient-to-br from-red-500/10 via-card to-card border-red-500/20">
          <CardContent className="p-3 sm:p-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Expenses</p>
                <ArrowDownRight className="h-3 w-3 sm:h-4 sm:w-4 text-red-500" />
              </div>
              <p className="text-sm sm:text-xl font-bold text-red-600 dark:text-red-400">
                {BANGLADESHI_CURRENCY_SYMBOL}{currentData.expenses.toLocaleString()}
              </p>
              {timeRange === 'monthly' && (
                <div className="flex items-center gap-1 text-[10px]">
                  {analytics.expenseGrowth <= 0 ? (
                    <TrendingDown className="h-2.5 w-2.5 text-green-500" />
                  ) : (
                    <TrendingUp className="h-2.5 w-2.5 text-red-500" />
                  )}
                  <span className={analytics.expenseGrowth <= 0 ? "text-green-500" : "text-red-500"}>
                    {Math.abs(analytics.expenseGrowth).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Profit */}
        <Card className={`bg-gradient-to-br ${currentData.profit >= 0 ? 'from-primary/10' : 'from-destructive/10'} via-card to-card border-${currentData.profit >= 0 ? 'primary' : 'destructive'}/20`}>
          <CardContent className="p-3 sm:p-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                  {currentData.profit >= 0 ? 'Profit' : 'Loss'}
                </p>
                <DollarSign className={`h-3 w-3 sm:h-4 sm:w-4 ${profitMarginColor}`} />
              </div>
              <p className={`text-sm sm:text-xl font-bold ${profitMarginColor}`}>
                {currentData.profit >= 0 ? '+' : ''}{BANGLADESHI_CURRENCY_SYMBOL}{currentData.profit.toLocaleString()}
              </p>
              {timeRange === 'monthly' && (
                <p className="text-[10px] text-muted-foreground">
                  {analytics.profitMargin.toFixed(1)}% margin
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Tabs */}
      <Tabs defaultValue="trend" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-9">
          <TabsTrigger value="trend" className="text-xs">Trend</TabsTrigger>
          <TabsTrigger value="income" className="text-xs">Income</TabsTrigger>
          <TabsTrigger value="expense" className="text-xs">Expense</TabsTrigger>
        </TabsList>

        {/* Trend Chart */}
        <TabsContent value="trend" className="mt-3">
          <Card>
            <CardHeader className="pb-2 px-3 pt-3">
              <CardTitle className="text-sm font-medium">7-Day Performance</CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-3">
              <div className="h-[200px]">
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

        {/* Income Breakdown (Payment Methods) */}
        <TabsContent value="income" className="mt-3">
          <Card>
            <CardHeader className="pb-2 px-3 pt-3">
              <CardTitle className="text-sm font-medium">Payment Methods</CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-3">
              <div className="h-[200px]">
                {paymentPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
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
                      <Legend 
                        formatter={(value) => <span className="text-xs">{value}</span>}
                      />
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
              <div className="h-[200px]">
                {expensePieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expensePieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
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
                      <Legend 
                        formatter={(value) => <span className="text-xs">{value}</span>}
                      />
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
              {analytics.topExpenseCategories.slice(0, 3).map((category, index) => (
                <div key={category.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm">{category.icon}</span>
                    <span className="text-xs truncate">{category.name}</span>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0 text-red-600">
                    {BANGLADESHI_CURRENCY_SYMBOL}{category.amount.toLocaleString()}
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
};
