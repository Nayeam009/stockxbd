import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
import { 
  TrendingUp, TrendingDown, ShoppingBag, 
  BarChart3, Calendar, RefreshCw, Package,
  ArrowUpRight, ArrowDownRight, Clock, CheckCircle
} from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Area, AreaChart } from "recharts";
import { PremiumStatCard } from "@/components/shared/PremiumStatCard";
import { PremiumModuleHeader } from "@/components/shared/PremiumModuleHeader";

interface ShopAnalyticsTabProps {
  shopId: string | null;
}

interface Order {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
  delivered_at: string | null;
  customer_type?: string;
}

interface OrderItem {
  order_id: string;
  product_name: string;
  quantity: number;
  price: number;
}

const CHART_COLORS = {
  primary: 'hsl(var(--primary))',
  emerald: '#10b981',
  amber: '#f59e0b',
  blue: '#3b82f6',
  purple: '#8b5cf6',
  rose: '#f43f5e',
};

const STATUS_COLORS: Record<string, string> = {
  Pending: CHART_COLORS.amber,
  Confirmed: CHART_COLORS.primary,
  Dispatched: CHART_COLORS.blue,
  Delivered: CHART_COLORS.emerald,
  Rejected: CHART_COLORS.rose,
  Cancelled: '#6b7280',
};

export const ShopAnalyticsTab = ({ shopId }: ShopAnalyticsTabProps) => {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | 'all'>('7d');

  const fetchData = useCallback(async () => {
    if (!shopId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      let query = supabase
        .from('community_orders')
        .select('id, total_amount, status, created_at, delivered_at, customer_type')
        .eq('shop_id', shopId);

      if (dateRange !== 'all') {
        const days = dateRange === '7d' ? 7 : 30;
        const startDate = startOfDay(subDays(new Date(), days)).toISOString();
        query = query.gte('created_at', startDate);
      }

      const { data: ordersData, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(ordersData || []);

      // Fetch order items for top products
      if (ordersData && ordersData.length > 0) {
        const orderIds = ordersData.map(o => o.id);
        const { data: items } = await supabase
          .from('community_order_items')
          .select('order_id, product_name, quantity, price')
          .in('order_id', orderIds);
        
        setOrderItems(items || []);
      } else {
        setOrderItems([]);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [shopId, dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate analytics
  const analytics = useMemo(() => {
    const totalOrders = orders.length;
    const deliveredOrders = orders.filter(o => o.status === 'delivered');
    const pendingOrders = orders.filter(o => o.status === 'pending');
    
    const totalRevenue = deliveredOrders.reduce((sum, o) => sum + o.total_amount, 0);
    const avgOrderValue = deliveredOrders.length > 0 ? totalRevenue / deliveredOrders.length : 0;
    
    // Today's metrics
    const today = new Date().toDateString();
    const todayOrders = orders.filter(o => new Date(o.created_at).toDateString() === today);
    const todayRevenue = todayOrders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + o.total_amount, 0);
    
    // Yesterday comparison
    const yesterday = subDays(new Date(), 1).toDateString();
    const yesterdayOrders = orders.filter(o => new Date(o.created_at).toDateString() === yesterday);
    const yesterdayRevenue = yesterdayOrders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + o.total_amount, 0);
    
    const revenueChange = yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : todayRevenue > 0 ? 100 : 0;
    const ordersChange = yesterdayOrders.length > 0 ? ((todayOrders.length - yesterdayOrders.length) / yesterdayOrders.length) * 100 : todayOrders.length > 0 ? 100 : 0;

    // Customer types
    const retailOrders = orders.filter(o => o.customer_type === 'retail' || !o.customer_type).length;
    const wholesaleOrders = orders.filter(o => o.customer_type === 'wholesale').length;

    return {
      totalOrders,
      deliveredOrders: deliveredOrders.length,
      pendingOrders: pendingOrders.length,
      totalRevenue,
      avgOrderValue,
      todayOrders: todayOrders.length,
      todayRevenue,
      revenueChange,
      ordersChange,
      retailOrders,
      wholesaleOrders
    };
  }, [orders]);

  // Revenue chart data with gradient fill
  const revenueChartData = useMemo(() => {
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 14;
    const data = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = date.toDateString();
      const dayOrders = orders.filter(o => 
        o.status === 'delivered' && 
        o.delivered_at && 
        new Date(o.delivered_at).toDateString() === dateStr
      );
      
      data.push({
        date: format(date, 'MMM dd'),
        revenue: dayOrders.reduce((sum, o) => sum + o.total_amount, 0),
        orders: dayOrders.length
      });
    }
    
    return data;
  }, [orders, dateRange]);

  // Top products
  const topProducts = useMemo(() => {
    const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};
    
    orderItems.forEach(item => {
      if (!productSales[item.product_name]) {
        productSales[item.product_name] = { name: item.product_name, quantity: 0, revenue: 0 };
      }
      productSales[item.product_name].quantity += item.quantity;
      productSales[item.product_name].revenue += item.price * item.quantity;
    });
    
    return Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [orderItems]);

  // Order status distribution
  const statusDistribution = useMemo(() => {
    const statusCounts: Record<string, number> = {};
    orders.forEach(o => {
      const status = o.status.charAt(0).toUpperCase() + o.status.slice(1);
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status,
      value: count,
      color: STATUS_COLORS[status] || '#6b7280'
    }));
  }, [orders]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center space-y-3">
          <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!shopId) {
    return (
      <Card className="border-dashed border-2">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <BarChart3 className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Create Your Shop First</h3>
          <p className="text-muted-foreground text-center text-sm max-w-md">
            Set up your shop profile to view analytics and track performance
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header with Date Range */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Analytics Overview</h2>
            <p className="text-xs text-muted-foreground">Track your shop performance</p>
          </div>
        </div>
        
        {/* Date Range Pills */}
        <div className="flex items-center gap-2">
          <div className="flex bg-muted/50 rounded-lg p-1">
            {(['7d', '30d', 'all'] as const).map((range) => (
              <Button 
                key={range}
                variant={dateRange === range ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => setDateRange(range)}
                className={`h-9 px-4 text-sm ${dateRange === range ? '' : 'hover:bg-transparent'}`}
              >
                {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : 'All Time'}
              </Button>
            ))}
          </div>
          <Button variant="outline" size="icon" onClick={fetchData} className="h-9 w-9">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Key Metrics - Premium Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent" />
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-400" />
          <CardContent className="relative p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Revenue</p>
                <p className="text-2xl sm:text-3xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {BANGLADESHI_CURRENCY_SYMBOL}{analytics.totalRevenue.toLocaleString()}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs">
              {analytics.revenueChange >= 0 ? (
                <>
                  <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-emerald-600 font-medium">+{analytics.revenueChange.toFixed(1)}%</span>
                </>
              ) : (
                <>
                  <ArrowDownRight className="h-3.5 w-3.5 text-destructive" />
                  <span className="text-destructive font-medium">{analytics.revenueChange.toFixed(1)}%</span>
                </>
              )}
              <span className="text-muted-foreground">vs yesterday</span>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent" />
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-primary/80" />
          <CardContent className="relative p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Orders</p>
                <p className="text-2xl sm:text-3xl font-bold tabular-nums text-primary">
                  {analytics.totalOrders}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <ShoppingBag className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs">
              <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary">{analytics.todayOrders} today</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent" />
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-400" />
          <CardContent className="relative p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Avg Order Value</p>
                <p className="text-2xl sm:text-3xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
                  {BANGLADESHI_CURRENCY_SYMBOL}{analytics.avgOrderValue.toFixed(0)}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-blue-500" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">{analytics.deliveredOrders} delivered</span>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent" />
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-amber-400" />
          <CardContent className="relative p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Pending Orders</p>
                <p className="text-2xl sm:text-3xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
                  {analytics.pendingOrders}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
              <Badge variant="outline" className="text-[10px]">{analytics.retailOrders} Retail</Badge>
              <Badge variant="outline" className="text-[10px]">{analytics.wholesaleOrders} Wholesale</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Revenue Trend - Area Chart with Gradient */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2 px-4 sm:px-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Revenue Trend</CardTitle>
                <CardDescription className="text-xs">Daily revenue over time</CardDescription>
              </div>
              <Badge variant="secondary" className="text-xs">
                {dateRange === '7d' ? 'Last 7 Days' : dateRange === '30d' ? 'Last 30 Days' : 'All Time'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-2 sm:px-4 pb-4">
            <div className="h-[200px] sm:h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueChartData}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 11 }} 
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    tick={{ fontSize: 11 }} 
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `৳${value >= 1000 ? `${(value/1000).toFixed(0)}k` : value}`}
                    width={45}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`${BANGLADESHI_CURRENCY_SYMBOL}${value.toLocaleString()}`, 'Revenue']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    fill="url(#revenueGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Products - Horizontal Bar Chart */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2 px-4 sm:px-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Top Products</CardTitle>
                <CardDescription className="text-xs">Best selling by revenue</CardDescription>
              </div>
              <Badge variant="secondary" className="text-xs">{topProducts.length} Products</Badge>
            </div>
          </CardHeader>
          <CardContent className="px-2 sm:px-4 pb-4">
            {topProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[200px] sm:h-[250px] text-muted-foreground">
                <Package className="h-10 w-10 mb-2 opacity-50" />
                <p className="text-sm">No sales data yet</p>
              </div>
            ) : (
              <div className="h-[200px] sm:h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProducts} layout="vertical" margin={{ left: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                    <XAxis 
                      type="number" 
                      tick={{ fontSize: 11 }}
                      tickFormatter={(value) => `৳${value >= 1000 ? `${(value/1000).toFixed(0)}k` : value}`}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      tick={{ fontSize: 10 }}
                      width={80}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      formatter={(value: number) => [`${BANGLADESHI_CURRENCY_SYMBOL}${value.toLocaleString()}`, 'Revenue']}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                    <Bar 
                      dataKey="revenue" 
                      fill="hsl(var(--primary))" 
                      radius={[0, 4, 4, 0]}
                      maxBarSize={32}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Order Status Distribution */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2 px-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Order Status Distribution</CardTitle>
              <CardDescription className="text-xs">Breakdown of orders by status</CardDescription>
            </div>
            <Badge variant="secondary" className="text-xs">{analytics.totalOrders} Total</Badge>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="h-[180px] w-[180px] sm:h-[200px] sm:w-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center sm:justify-start gap-x-4 gap-y-2">
              {statusDistribution.map((status) => (
                <div key={status.name} className="flex items-center gap-2">
                  <div 
                    className="h-3 w-3 rounded-full shrink-0" 
                    style={{ backgroundColor: status.color }}
                  />
                  <span className="text-sm">
                    <span className="font-medium">{status.name}:</span>{' '}
                    <span className="text-muted-foreground">{status.value}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
