import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  BarChart3, 
  Plus, 
  Filter, 
  Download,
  Banknote,
  Package,
  Users,
  TrendingUp,
  Loader2,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCcw,
  Eye,
  FileText
} from "lucide-react";
import { BANGLADESHI_CURRENCY_SYMBOL, BANGLADESHI_PAYMENT_METHODS } from "@/lib/bangladeshConstants";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfMonth, endOfMonth, isToday, isYesterday } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

interface SalesRecord {
  id: string;
  date: string;
  productType: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  paymentMethod: string;
  staffName: string;
  transactionNumber: string;
}

interface DailySalesModuleProps {
  salesData?: any[];
  setSalesData?: (data: any[]) => void;
}

const CHART_COLORS = ['#f97316', '#3b82f6', '#22c55e', '#eab308', '#8b5cf6'];

export const DailySalesModule = ({ salesData: propSalesData, setSalesData }: DailySalesModuleProps) => {
  const [salesData, setLocalSalesData] = useState<SalesRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState("");
  const [filterProduct, setFilterProduct] = useState("all");
  const [filterStaff, setFilterStaff] = useState("all");
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>('today');

  // Fetch real sales data from POS transactions
  const fetchSalesData = async () => {
    try {
      setLoading(true);
      const { data: transactions, error } = await supabase
        .from('pos_transactions')
        .select(`
          id,
          transaction_number,
          created_at,
          total,
          payment_method,
          payment_status,
          pos_transaction_items (
            id,
            product_name,
            quantity,
            unit_price,
            total_price
          )
        `)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      if (transactions) {
        const formattedSales: SalesRecord[] = transactions.flatMap(txn => 
          (txn.pos_transaction_items || []).map((item: any) => ({
            id: item.id,
            date: new Date(txn.created_at).toISOString().split('T')[0],
            productType: item.product_name?.toLowerCase().includes('stove') ? 'stove' : 
                        item.product_name?.toLowerCase().includes('regulator') ? 'accessory' : 'cylinder',
            productName: item.product_name || 'Unknown Product',
            quantity: item.quantity,
            unitPrice: Number(item.unit_price),
            totalAmount: Number(item.total_price),
            paymentMethod: txn.payment_method,
            staffName: 'Staff',
            transactionNumber: txn.transaction_number
          }))
        );
        setLocalSalesData(formattedSales);
      }
    } catch (error) {
      console.error('Error fetching sales data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesData();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('sales-updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pos_transactions' }, () => {
        fetchSalesData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Calculate analytics with comparison
  const analytics = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = subDays(new Date(), 1).toISOString().split('T')[0];
    
    const todaySales = salesData.filter(sale => sale.date === today);
    const yesterdaySales = salesData.filter(sale => sale.date === yesterday);
    
    const thisMonth = salesData.filter(sale => {
      const saleDate = new Date(sale.date);
      const now = new Date();
      return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
    });

    const lastMonth = salesData.filter(sale => {
      const saleDate = new Date(sale.date);
      const now = new Date();
      const lastMonthDate = subDays(startOfMonth(now), 1);
      return saleDate.getMonth() === lastMonthDate.getMonth() && saleDate.getFullYear() === lastMonthDate.getFullYear();
    });

    const todayRevenue = todaySales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const yesterdayRevenue = yesterdaySales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const monthlyRevenue = thisMonth.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const lastMonthRevenue = lastMonth.reduce((sum, sale) => sum + sale.totalAmount, 0);

    const dailyGrowth = yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : 0;
    const monthlyGrowth = lastMonthRevenue > 0 ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;

    return {
      todayRevenue,
      todayOrders: todaySales.length,
      monthlyRevenue,
      monthlyOrders: thisMonth.length,
      dailyGrowth,
      monthlyGrowth,
      topProduct: salesData.reduce((acc, sale) => {
        acc[sale.productName] = (acc[sale.productName] || 0) + sale.quantity;
        return acc;
      }, {} as Record<string, number>),
      topStaff: salesData.reduce((acc, sale) => {
        acc[sale.staffName] = (acc[sale.staffName] || 0) + sale.totalAmount;
        return acc;
      }, {} as Record<string, number>),
      paymentBreakdown: salesData.reduce((acc, sale) => {
        acc[sale.paymentMethod] = (acc[sale.paymentMethod] || 0) + sale.totalAmount;
        return acc;
      }, {} as Record<string, number>)
    };
  }, [salesData]);

  // Weekly chart data
  const weeklyChartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      return format(date, 'yyyy-MM-dd');
    });

    return last7Days.map(date => {
      const daySales = salesData.filter(s => s.date === date);
      return {
        name: format(new Date(date), 'EEE'),
        date: format(new Date(date), 'MMM d'),
        revenue: daySales.reduce((sum, s) => sum + s.totalAmount, 0),
        orders: daySales.length
      };
    });
  }, [salesData]);

  // Payment method pie chart data
  const paymentChartData = useMemo(() => {
    return Object.entries(analytics.paymentBreakdown).map(([name, value]) => ({
      name: name.toUpperCase(),
      value
    }));
  }, [analytics.paymentBreakdown]);

  // Filtered data
  const filteredSales = useMemo(() => {
    return salesData.filter(sale => {
      if (filterDate && sale.date !== filterDate) return false;
      if (filterProduct !== "all" && sale.productType !== filterProduct) return false;
      if (filterStaff !== "all" && sale.staffName !== filterStaff) return false;
      
      // Apply date range filter
      if (dateRange === 'today' && sale.date !== new Date().toISOString().split('T')[0]) return false;
      if (dateRange === 'week') {
        const weekAgo = subDays(new Date(), 7).toISOString().split('T')[0];
        if (sale.date < weekAgo) return false;
      }
      if (dateRange === 'month') {
        const monthStart = startOfMonth(new Date()).toISOString().split('T')[0];
        if (sale.date < monthStart) return false;
      }
      
      return true;
    });
  }, [salesData, filterDate, filterProduct, filterStaff, dateRange]);

  const topProduct = Object.entries(analytics.topProduct).sort(([,a], [,b]) => b - a)[0];
  const topStaff = Object.entries(analytics.topStaff).sort(([,a], [,b]) => b - a)[0];

  const paymentMethodColors: Record<string, string> = {
    cash: "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30",
    bkash: "bg-pink-500/20 text-pink-600 dark:text-pink-400 border-pink-500/30",
    nagad: "bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/30",
    rocket: "bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30",
    card: "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30"
  };

  const uniqueStaff = Array.from(new Set(salesData.map(s => s.staffName).filter(s => s.trim().length > 0)));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading sales data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Daily Sales Management</h2>
          <p className="text-muted-foreground">Monitor and analyze your day-to-day sales performance</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchSalesData}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" className="bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />
            Add Sale
          </Button>
        </div>
      </div>

      {/* Date Range Tabs */}
      <div className="flex items-center gap-2 p-1 bg-muted/50 rounded-lg w-fit">
        {(['today', 'week', 'month'] as const).map((range) => (
          <Button
            key={range}
            variant={dateRange === range ? "default" : "ghost"}
            size="sm"
            onClick={() => setDateRange(range)}
            className={dateRange === range ? "bg-primary text-primary-foreground" : ""}
          >
            {range === 'today' ? 'Today' : range === 'week' ? 'This Week' : 'This Month'}
          </Button>
        ))}
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 via-card to-card border-primary/20 overflow-hidden">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs sm:text-sm text-muted-foreground font-medium">Today's Revenue</p>
                <p className="text-xl sm:text-3xl font-bold text-foreground">{BANGLADESHI_CURRENCY_SYMBOL}{analytics.todayRevenue.toLocaleString()}</p>
                <div className="flex items-center gap-1 text-xs">
                  {analytics.dailyGrowth >= 0 ? (
                    <ArrowUpRight className="h-3 w-3 text-green-500" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 text-red-500" />
                  )}
                  <span className={analytics.dailyGrowth >= 0 ? "text-green-500" : "text-red-500"}>
                    {Math.abs(analytics.dailyGrowth).toFixed(1)}%
                  </span>
                  <span className="text-muted-foreground">vs yesterday</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Banknote className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-accent/10 via-card to-card border-accent/20 overflow-hidden">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs sm:text-sm text-muted-foreground font-medium">Monthly Revenue</p>
                <p className="text-xl sm:text-3xl font-bold text-foreground">{BANGLADESHI_CURRENCY_SYMBOL}{analytics.monthlyRevenue.toLocaleString()}</p>
                <div className="flex items-center gap-1 text-xs">
                  {analytics.monthlyGrowth >= 0 ? (
                    <ArrowUpRight className="h-3 w-3 text-green-500" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 text-red-500" />
                  )}
                  <span className={analytics.monthlyGrowth >= 0 ? "text-green-500" : "text-red-500"}>
                    {Math.abs(analytics.monthlyGrowth).toFixed(1)}%
                  </span>
                  <span className="text-muted-foreground">vs last month</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-accent/20 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs sm:text-sm text-muted-foreground font-medium">Top Product</p>
                <p className="text-sm sm:text-lg font-bold text-foreground truncate max-w-[120px] sm:max-w-none">{topProduct?.[0] || 'N/A'}</p>
                <p className="text-xs text-muted-foreground">{topProduct?.[1] || 0} units sold</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <Package className="h-6 w-6 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs sm:text-sm text-muted-foreground font-medium">Orders Today</p>
                <p className="text-xl sm:text-3xl font-bold text-foreground">{analytics.todayOrders}</p>
                <p className="text-xs text-muted-foreground">{analytics.monthlyOrders} this month</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Weekly Revenue Trend</CardTitle>
            <CardDescription>Last 7 days performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    formatter={(value: number) => [`${BANGLADESHI_CURRENCY_SYMBOL}${value.toLocaleString()}`, 'Revenue']}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Payment Methods</CardTitle>
            <CardDescription>Sales distribution by payment type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              {paymentChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {paymentChartData.map((entry, index) => (
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
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No payment data available
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {paymentChartData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2 text-xs">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                  />
                  <span className="text-muted-foreground">{entry.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card className="border-border">
        <CardHeader className="py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm" onClick={() => setViewMode(viewMode === 'table' ? 'chart' : 'table')}>
                {viewMode === 'table' ? <BarChart3 className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                {viewMode === 'table' ? 'Chart View' : 'Table View'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-muted-foreground">Date:</label>
              <Input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-40"
              />
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-muted-foreground">Product:</label>
              <Select value={filterProduct} onValueChange={setFilterProduct}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  <SelectItem value="cylinder">LPG Cylinders</SelectItem>
                  <SelectItem value="stove">Gas Stoves</SelectItem>
                  <SelectItem value="accessory">Accessories</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-muted-foreground">Staff:</label>
              <Select value={filterStaff} onValueChange={setFilterStaff}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Staff</SelectItem>
                  {uniqueStaff.map((staff) => (
                    <SelectItem key={staff} value={staff}>
                      {staff}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(filterDate || filterProduct !== 'all' || filterStaff !== 'all') && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setFilterDate("");
                  setFilterProduct("all");
                  setFilterStaff("all");
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sales Table */}
      <Card className="border-border">
        <CardHeader className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">Sales Records</CardTitle>
              <CardDescription>Showing {filteredSales.length} records</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="font-semibold">Transaction</TableHead>
                  <TableHead className="font-semibold">Product</TableHead>
                  <TableHead className="font-semibold text-center">Qty</TableHead>
                  <TableHead className="font-semibold text-right">Unit Price</TableHead>
                  <TableHead className="font-semibold text-right">Total</TableHead>
                  <TableHead className="font-semibold text-center">Payment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="text-muted-foreground space-y-2">
                        <Package className="h-10 w-10 mx-auto opacity-50" />
                        <p>No sales records found</p>
                        <p className="text-sm">Create sales using the Point of Sale module</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSales.slice(0, 50).map((sale, index) => (
                    <TableRow key={sale.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <div className="font-medium">
                          {isToday(new Date(sale.date)) ? (
                            <Badge variant="secondary" className="text-xs">Today</Badge>
                          ) : isYesterday(new Date(sale.date)) ? (
                            <Badge variant="outline" className="text-xs">Yesterday</Badge>
                          ) : (
                            format(new Date(sale.date), 'MMM d, yyyy')
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs font-mono">{sale.transactionNumber}</TableCell>
                      <TableCell className="max-w-[200px] truncate font-medium">{sale.productName}</TableCell>
                      <TableCell className="text-center">{sale.quantity}</TableCell>
                      <TableCell className="text-right">{BANGLADESHI_CURRENCY_SYMBOL}{sale.unitPrice.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-semibold text-primary">{BANGLADESHI_CURRENCY_SYMBOL}{sale.totalAmount.toLocaleString()}</TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant="secondary" 
                          className={paymentMethodColors[sale.paymentMethod] || "bg-muted text-muted-foreground"}
                        >
                          {sale.paymentMethod?.toUpperCase()}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
