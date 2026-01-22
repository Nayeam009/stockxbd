import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
import { 
  TrendingUp, TrendingDown, ShoppingBag, Users, Star, 
  Loader2, BarChart3, Calendar, RefreshCw, Package,
  ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";

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

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export const ShopAnalyticsTab = ({ shopId }: ShopAnalyticsTabProps) => {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | 'all'>('7d');

  useEffect(() => {
    if (shopId) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [shopId, dateRange]);

  const fetchData = async () => {
    if (!shopId) return;
    
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
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

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
    
    const revenueChange = yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : 0;
    const ordersChange = yesterdayOrders.length > 0 ? ((todayOrders.length - yesterdayOrders.length) / yesterdayOrders.length) * 100 : 0;

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

  // Revenue chart data (last 7 days)
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
      statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
    });
    
    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count
    }));
  }, [orders]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!shopId) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <BarChart3 className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Create Your Shop First</h3>
          <p className="text-muted-foreground text-center">
            Set up your shop profile to view analytics
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium">Analytics Overview</span>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant={dateRange === '7d' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => setDateRange('7d')}
            className="h-9"
          >
            7 Days
          </Button>
          <Button 
            variant={dateRange === '30d' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => setDateRange('30d')}
            className="h-9"
          >
            30 Days
          </Button>
          <Button 
            variant={dateRange === 'all' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => setDateRange('all')}
            className="h-9"
          >
            All Time
          </Button>
          <Button variant="ghost" size="icon" onClick={fetchData} className="h-9 w-9">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold tabular-nums mt-1">
                {BANGLADESHI_CURRENCY_SYMBOL}{analytics.totalRevenue.toLocaleString()}
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-emerald-500/15 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs">
            {analytics.revenueChange >= 0 ? (
              <>
                <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                <span className="text-emerald-500">+{analytics.revenueChange.toFixed(1)}%</span>
              </>
            ) : (
              <>
                <ArrowDownRight className="h-3 w-3 text-destructive" />
                <span className="text-destructive">{analytics.revenueChange.toFixed(1)}%</span>
              </>
            )}
            <span className="text-muted-foreground">vs yesterday</span>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Orders</p>
              <p className="text-2xl font-bold tabular-nums mt-1">{analytics.totalOrders}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center">
              <ShoppingBag className="h-5 w-5 text-primary" />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs">
            <span className="text-muted-foreground">{analytics.todayOrders} today</span>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Avg Order Value</p>
              <p className="text-2xl font-bold tabular-nums mt-1">
                {BANGLADESHI_CURRENCY_SYMBOL}{analytics.avgOrderValue.toFixed(0)}
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-blue-500/15 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-blue-500" />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs">
            <span className="text-muted-foreground">{analytics.deliveredOrders} delivered</span>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending Orders</p>
              <p className="text-2xl font-bold tabular-nums mt-1">{analytics.pendingOrders}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-amber-500/15 flex items-center justify-center">
              <Package className="h-5 w-5 text-amber-500" />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs">
            <Badge variant="outline" className="text-[10px]">
              {analytics.retailOrders} Retail
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {analytics.wholesaleOrders} Wholesale
            </Badge>
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Revenue Trend</CardTitle>
            <CardDescription>Daily revenue over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }} 
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }} 
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `৳${value}`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`${BANGLADESHI_CURRENCY_SYMBOL}${value}`, 'Revenue']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top Products</CardTitle>
            <CardDescription>Best selling products by revenue</CardDescription>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[250px] text-muted-foreground">
                <Package className="h-10 w-10 mb-2 opacity-50" />
                <p>No sales data yet</p>
              </div>
            ) : (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProducts} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis 
                      type="number" 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `৳${value}`}
                    />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      tick={{ fontSize: 11 }}
                      width={100}
                    />
                    <Tooltip 
                      formatter={(value: number) => [`${BANGLADESHI_CURRENCY_SYMBOL}${value}`, 'Revenue']}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Order Status Distribution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Order Status Distribution</CardTitle>
          <CardDescription>Breakdown of orders by status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="h-[200px] w-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-3">
              {statusDistribution.map((status, index) => (
                <div key={status.name} className="flex items-center gap-2">
                  <div 
                    className="h-3 w-3 rounded-full" 
                    style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                  />
                  <span className="text-sm">{status.name}: {status.value}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
