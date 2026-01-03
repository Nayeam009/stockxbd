import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Package, ArrowUpRight, ArrowDownRight, RefreshCcw, Calendar, Target, Zap, BarChart3, PieChart as PieChartIcon, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, subDays, differenceInDays } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, ComposedChart, Legend } from "recharts";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";

interface SalesData {
  date: string;
  amount: number;
}

interface ExpenseData {
  category: string;
  amount: number;
}

const CHART_COLORS = ['#f97316', '#3b82f6', '#22c55e', '#eab308', '#8b5cf6', '#ec4899', '#06b6d4', '#6b7280'];

export const AnalysisModule = () => {
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [expensesData, setExpensesData] = useState<any[]>([]);
  const [ordersData, setOrdersData] = useState<any[]>([]);
  const [customersCount, setCustomersCount] = useState(0);
  const [productsCount, setProductsCount] = useState(0);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter'>('month');
  const [activeTab, setActiveTab] = useState('overview');

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [salesRes, expensesRes, ordersRes, customersRes, productsRes] = await Promise.all([
        supabase.from('pos_transactions').select('created_at, total').order('created_at', { ascending: true }),
        supabase.from('daily_expenses').select('expense_date, category, amount'),
        supabase.from('orders').select('created_at, total_amount, status, payment_status'),
        supabase.from('customers').select('id', { count: 'exact' }),
        supabase.from('products').select('id', { count: 'exact' })
      ]);

      setSalesData(salesRes.data || []);
      setExpensesData(expensesRes.data || []);
      setOrdersData(ordersRes.data || []);
      setCustomersCount(customersRes.count || 0);
      setProductsCount(productsRes.count || 0);
    } catch (error) {
      console.error('Error fetching analysis data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const analytics = useMemo(() => {
    const today = new Date();
    const thisMonthStart = startOfMonth(today);
    const thisMonthEnd = endOfMonth(today);
    const lastMonthStart = startOfMonth(subMonths(today, 1));
    const lastMonthEnd = endOfMonth(subMonths(today, 1));
    const todayStr = format(today, 'yyyy-MM-dd');
    const yesterdayStr = format(subDays(today, 1), 'yyyy-MM-dd');

    // Sales calculations
    const thisMonthSales = salesData
      .filter(s => {
        const date = new Date(s.created_at);
        return date >= thisMonthStart && date <= thisMonthEnd;
      })
      .reduce((sum, s) => sum + Number(s.total), 0);

    const lastMonthSales = salesData
      .filter(s => {
        const date = new Date(s.created_at);
        return date >= lastMonthStart && date <= lastMonthEnd;
      })
      .reduce((sum, s) => sum + Number(s.total), 0);

    const todaySales = salesData
      .filter(s => format(new Date(s.created_at), 'yyyy-MM-dd') === todayStr)
      .reduce((sum, s) => sum + Number(s.total), 0);

    const yesterdaySales = salesData
      .filter(s => format(new Date(s.created_at), 'yyyy-MM-dd') === yesterdayStr)
      .reduce((sum, s) => sum + Number(s.total), 0);

    // Expenses calculations
    const thisMonthExpenses = expensesData
      .filter(e => {
        const date = new Date(e.expense_date);
        return date >= thisMonthStart && date <= thisMonthEnd;
      })
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const lastMonthExpenses = expensesData
      .filter(e => {
        const date = new Date(e.expense_date);
        return date >= lastMonthStart && date <= lastMonthEnd;
      })
      .reduce((sum, e) => sum + Number(e.amount), 0);

    // Profit
    const thisMonthProfit = thisMonthSales - thisMonthExpenses;
    const lastMonthProfit = lastMonthSales - lastMonthExpenses;

    // Growth percentages
    const salesGrowth = lastMonthSales > 0 ? ((thisMonthSales - lastMonthSales) / lastMonthSales) * 100 : 0;
    const expenseGrowth = lastMonthExpenses > 0 ? ((thisMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100 : 0;
    const profitGrowth = lastMonthProfit !== 0 ? ((thisMonthProfit - lastMonthProfit) / Math.abs(lastMonthProfit)) * 100 : 0;
    const dailyGrowth = yesterdaySales > 0 ? ((todaySales - yesterdaySales) / yesterdaySales) * 100 : 0;

    // Profit margin
    const profitMargin = thisMonthSales > 0 ? (thisMonthProfit / thisMonthSales) * 100 : 0;

    // Orders analytics
    const pendingOrders = ordersData.filter(o => o.status === 'pending').length;
    const completedOrders = ordersData.filter(o => o.status === 'delivered' || o.status === 'completed').length;
    const paidOrders = ordersData.filter(o => o.payment_status === 'paid').length;

    return {
      thisMonthSales,
      lastMonthSales,
      todaySales,
      thisMonthExpenses,
      thisMonthProfit,
      salesGrowth,
      expenseGrowth,
      profitGrowth,
      dailyGrowth,
      profitMargin,
      totalOrders: ordersData.length,
      pendingOrders,
      completedOrders,
      paidOrders
    };
  }, [salesData, expensesData, ordersData]);

  // Prepare chart data
  const revenueChartData = useMemo(() => {
    const days = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 90;
    const dateList = Array.from({ length: days }, (_, i) => {
      const date = subDays(new Date(), days - 1 - i);
      return format(date, 'yyyy-MM-dd');
    });

    return dateList.map(date => {
      const daySales = salesData
        .filter(s => format(new Date(s.created_at), 'yyyy-MM-dd') === date)
        .reduce((sum, s) => sum + Number(s.total), 0);
      
      const dayExpenses = expensesData
        .filter(e => e.expense_date === date)
        .reduce((sum, e) => sum + Number(e.amount), 0);
      
      return {
        name: format(new Date(date), timeRange === 'week' ? 'EEE' : 'MMM d'),
        revenue: daySales,
        expenses: dayExpenses,
        profit: daySales - dayExpenses
      };
    });
  }, [salesData, expensesData, timeRange]);

  const expensesByCategory = useMemo(() => {
    const categories: Record<string, number> = {};
    const thisMonthStart = startOfMonth(new Date());
    
    expensesData
      .filter(e => new Date(e.expense_date) >= thisMonthStart)
      .forEach(e => {
        categories[e.category] = (categories[e.category] || 0) + Number(e.amount);
      });
    
    return Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [expensesData]);

  // Monthly comparison data
  const monthlyComparisonData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => {
      const date = subMonths(new Date(), 5 - i);
      return {
        month: format(date, 'MMM'),
        start: startOfMonth(date),
        end: endOfMonth(date)
      };
    });

    return months.map(({ month, start, end }) => {
      const revenue = salesData
        .filter(s => {
          const date = new Date(s.created_at);
          return date >= start && date <= end;
        })
        .reduce((sum, s) => sum + Number(s.total), 0);
      
      const expenses = expensesData
        .filter(e => {
          const date = new Date(e.expense_date);
          return date >= start && date <= end;
        })
        .reduce((sum, e) => sum + Number(e.amount), 0);

      return {
        month,
        revenue,
        expenses,
        profit: revenue - expenses
      };
    });
  }, [salesData, expensesData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Business Analysis</h2>
          <p className="text-muted-foreground">Comprehensive overview of your business performance</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Last Week</SelectItem>
              <SelectItem value="month">Last Month</SelectItem>
              <SelectItem value="quarter">Last Quarter</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchAllData}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="trends" className="gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Trends</span>
          </TabsTrigger>
          <TabsTrigger value="breakdown" className="gap-2">
            <PieChartIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Breakdown</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-green-500/10 via-card to-card border-green-500/20">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs sm:text-sm text-muted-foreground font-medium">Monthly Revenue</p>
                    <p className="text-xl sm:text-3xl font-bold text-foreground">{BANGLADESHI_CURRENCY_SYMBOL}{analytics.thisMonthSales.toLocaleString()}</p>
                    <div className="flex items-center gap-1 text-xs">
                      {analytics.salesGrowth >= 0 ? (
                        <ArrowUpRight className="h-3 w-3 text-green-500" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3 text-red-500" />
                      )}
                      <span className={analytics.salesGrowth >= 0 ? "text-green-500" : "text-red-500"}>
                        {Math.abs(analytics.salesGrowth).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-500/10 via-card to-card border-red-500/20">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs sm:text-sm text-muted-foreground font-medium">Monthly Expenses</p>
                    <p className="text-xl sm:text-3xl font-bold text-foreground">{BANGLADESHI_CURRENCY_SYMBOL}{analytics.thisMonthExpenses.toLocaleString()}</p>
                    <div className="flex items-center gap-1 text-xs">
                      {analytics.expenseGrowth <= 0 ? (
                        <ArrowDownRight className="h-3 w-3 text-green-500" />
                      ) : (
                        <ArrowUpRight className="h-3 w-3 text-red-500" />
                      )}
                      <span className={analytics.expenseGrowth <= 0 ? "text-green-500" : "text-red-500"}>
                        {Math.abs(analytics.expenseGrowth).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-red-500/20 flex items-center justify-center">
                    <TrendingDown className="h-6 w-6 text-red-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={`bg-gradient-to-br ${analytics.thisMonthProfit >= 0 ? 'from-primary/10' : 'from-destructive/10'} via-card to-card border-${analytics.thisMonthProfit >= 0 ? 'primary' : 'destructive'}/20`}>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs sm:text-sm text-muted-foreground font-medium">Net Profit</p>
                    <p className={`text-xl sm:text-3xl font-bold ${analytics.thisMonthProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {BANGLADESHI_CURRENCY_SYMBOL}{Math.abs(analytics.thisMonthProfit).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {analytics.profitMargin.toFixed(1)}% margin
                    </p>
                  </div>
                  <div className={`h-12 w-12 rounded-full ${analytics.thisMonthProfit >= 0 ? 'bg-primary/20' : 'bg-destructive/20'} flex items-center justify-center`}>
                    <TrendingUp className={`h-6 w-6 ${analytics.thisMonthProfit >= 0 ? 'text-primary' : 'text-destructive'}`} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500/10 via-card to-card border-blue-500/20">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs sm:text-sm text-muted-foreground font-medium">Today's Sales</p>
                    <p className="text-xl sm:text-3xl font-bold text-foreground">{BANGLADESHI_CURRENCY_SYMBOL}{analytics.todaySales.toLocaleString()}</p>
                    <div className="flex items-center gap-1 text-xs">
                      {analytics.dailyGrowth >= 0 ? (
                        <ArrowUpRight className="h-3 w-3 text-green-500" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3 text-red-500" />
                      )}
                      <span className={analytics.dailyGrowth >= 0 ? "text-green-500" : "text-red-500"}>
                        {Math.abs(analytics.dailyGrowth).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <ShoppingCart className="h-6 w-6 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Secondary Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                    <Users className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{customersCount}</p>
                    <p className="text-xs text-muted-foreground">Total Customers</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                    <Package className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{productsCount}</p>
                    <p className="text-xs text-muted-foreground">Total Products</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                    <Target className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{analytics.pendingOrders}</p>
                    <p className="text-xs text-muted-foreground">Pending Orders</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <Zap className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{analytics.completedOrders}</p>
                    <p className="text-xs text-muted-foreground">Completed Orders</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue vs Expenses Chart */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Revenue vs Expenses</CardTitle>
              <CardDescription>Financial performance over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={revenueChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number, name: string) => [`${BANGLADESHI_CURRENCY_SYMBOL}${value.toLocaleString()}`, name.charAt(0).toUpperCase() + name.slice(1)]}
                    />
                    <Legend />
                    <Bar dataKey="revenue" fill="#22c55e" name="Revenue" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" fill="#ef4444" name="Expenses" radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="profit" stroke="hsl(var(--primary))" strokeWidth={2} name="Profit" dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6 mt-6">
          {/* Monthly Comparison */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">6-Month Performance</CardTitle>
              <CardDescription>Revenue, expenses, and profit trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyComparisonData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => [`${BANGLADESHI_CURRENCY_SYMBOL}${value.toLocaleString()}`, '']}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="revenue" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} name="Revenue" />
                    <Area type="monotone" dataKey="expenses" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} name="Expenses" />
                    <Area type="monotone" dataKey="profit" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} name="Profit" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-6 mt-6">
          {/* Expenses by Category */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Expenses by Category</CardTitle>
              <CardDescription>This month's expense distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="h-[300px]">
                  {expensesByCategory.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={expensesByCategory}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {expensesByCategory.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => [`${BANGLADESHI_CURRENCY_SYMBOL}${value.toLocaleString()}`, 'Amount']}
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No expense data available
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  {expensesByCategory.map((cat, index) => {
                    const total = expensesByCategory.reduce((sum, c) => sum + c.value, 0);
                    const percentage = ((cat.value / total) * 100).toFixed(1);
                    return (
                      <div key={cat.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                          />
                          <span className="font-medium">{cat.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{BANGLADESHI_CURRENCY_SYMBOL}{cat.value.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">{percentage}%</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
