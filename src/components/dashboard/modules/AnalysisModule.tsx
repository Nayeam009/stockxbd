import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, isToday, isYesterday } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

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

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const [salesRes, expensesRes, ordersRes, customersRes, productsRes] = await Promise.all([
          supabase.from('pos_transactions').select('created_at, total').order('created_at', { ascending: true }),
          supabase.from('daily_expenses').select('expense_date, category, amount'),
          supabase.from('orders').select('created_at, total_amount, status'),
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

    fetchAllData();
  }, []);

  const analytics = useMemo(() => {
    const today = new Date();
    const thisMonthStart = startOfMonth(today);
    const thisMonthEnd = endOfMonth(today);
    const lastMonthStart = startOfMonth(subMonths(today, 1));
    const lastMonthEnd = endOfMonth(subMonths(today, 1));

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
      .filter(s => isToday(new Date(s.created_at)))
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

    return {
      thisMonthSales,
      lastMonthSales,
      todaySales,
      thisMonthExpenses,
      thisMonthProfit,
      salesGrowth,
      expenseGrowth,
      totalOrders: ordersData.length,
      pendingOrders: ordersData.filter(o => o.status === 'pending').length
    };
  }, [salesData, expensesData, ordersData]);

  // Prepare chart data
  const weeklyChartData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const weekStart = startOfWeek(today);
    
    return days.map((day, index) => {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + index);
      
      const daySales = salesData
        .filter(s => format(new Date(s.created_at), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'))
        .reduce((sum, s) => sum + Number(s.total), 0);
      
      const dayExpenses = expensesData
        .filter(e => e.expense_date === format(date, 'yyyy-MM-dd'))
        .reduce((sum, e) => sum + Number(e.amount), 0);
      
      return { name: day, sales: daySales, expenses: dayExpenses };
    });
  }, [salesData, expensesData]);

  const expensesByCategory = useMemo(() => {
    const categories: Record<string, number> = {};
    expensesData.forEach(e => {
      categories[e.category] = (categories[e.category] || 0) + Number(e.amount);
    });
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [expensesData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Business Analysis</h2>
        <p className="text-muted-foreground">Comprehensive overview of your business performance</p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">৳{analytics.thisMonthSales.toLocaleString()}</div>
            <p className={`text-xs ${analytics.salesGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {analytics.salesGrowth >= 0 ? '+' : ''}{analytics.salesGrowth.toFixed(1)}% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">৳{analytics.thisMonthExpenses.toLocaleString()}</div>
            <p className={`text-xs ${analytics.expenseGrowth <= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {analytics.expenseGrowth >= 0 ? '+' : ''}{analytics.expenseGrowth.toFixed(1)}% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${analytics.thisMonthProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              ৳{analytics.thisMonthProfit.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">This month's profit</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Sales</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">৳{analytics.todaySales.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Sales today so far</p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{customersCount}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{productsCount}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{analytics.pendingOrders}</div>
            <p className="text-xs text-muted-foreground">Out of {analytics.totalOrders} total orders</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Weekly Sales vs Expenses */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Weekly Overview</CardTitle>
            <CardDescription className="text-muted-foreground">Sales vs Expenses this week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Bar dataKey="sales" fill="#22c55e" name="Sales" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" fill="#ef4444" name="Expenses" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Expenses by Category */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Expenses by Category</CardTitle>
            <CardDescription className="text-muted-foreground">Distribution of expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {expensesByCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expensesByCategory}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {expensesByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [`৳${value.toLocaleString()}`, 'Amount']}
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
