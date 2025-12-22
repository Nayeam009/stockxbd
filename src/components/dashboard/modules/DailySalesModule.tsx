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
  Loader2
} from "lucide-react";
import { BANGLADESHI_CURRENCY_SYMBOL, BANGLADESHI_PAYMENT_METHODS } from "@/lib/bangladeshConstants";
import { supabase } from "@/integrations/supabase/client";

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

export const DailySalesModule = ({ salesData: propSalesData, setSalesData }: DailySalesModuleProps) => {
  const [salesData, setLocalSalesData] = useState<SalesRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState("");
  const [filterProduct, setFilterProduct] = useState("all");
  const [filterStaff, setFilterStaff] = useState("all");

  // Fetch real sales data from POS transactions
  useEffect(() => {
    const fetchSalesData = async () => {
      try {
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
          .limit(200);

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

  // Calculate analytics
  const analytics = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todaySales = salesData.filter(sale => sale.date === today);
    const thisMonth = salesData.filter(sale => {
      const saleDate = new Date(sale.date);
      const now = new Date();
      return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
    });

    return {
      todayRevenue: todaySales.reduce((sum, sale) => sum + sale.totalAmount, 0),
      todayOrders: todaySales.length,
      monthlyRevenue: thisMonth.reduce((sum, sale) => sum + sale.totalAmount, 0),
      monthlyOrders: thisMonth.length,
      topProduct: salesData.reduce((acc, sale) => {
        acc[sale.productName] = (acc[sale.productName] || 0) + sale.quantity;
        return acc;
      }, {} as Record<string, number>),
      topStaff: salesData.reduce((acc, sale) => {
        acc[sale.staffName] = (acc[sale.staffName] || 0) + sale.totalAmount;
        return acc;
      }, {} as Record<string, number>)
    };
  }, [salesData]);

  // Filtered data
  const filteredSales = useMemo(() => {
    return salesData.filter(sale => {
      if (filterDate && sale.date !== filterDate) return false;
      if (filterProduct !== "all" && sale.productType !== filterProduct) return false;
      if (filterStaff !== "all" && sale.staffName !== filterStaff) return false;
      return true;
    });
  }, [salesData, filterDate, filterProduct, filterStaff]);

  const topProduct = Object.entries(analytics.topProduct).sort(([,a], [,b]) => b - a)[0];
  const topStaff = Object.entries(analytics.topStaff).sort(([,a], [,b]) => b - a)[0];

  const paymentMethodColors: Record<string, string> = {
    cash: "bg-green-500/20 text-green-600 border-green-500/30",
    bkash: "bg-pink-500/20 text-pink-600 border-pink-500/30",
    nagad: "bg-orange-500/20 text-orange-600 border-orange-500/30",
    rocket: "bg-purple-500/20 text-purple-600 border-purple-500/30",
    card: "bg-blue-500/20 text-blue-600 border-blue-500/30"
  };

  const uniqueStaff = Array.from(new Set(salesData.map(s => s.staffName).filter(s => s.trim().length > 0)));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading sales data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-primary">Daily Sales Management</h2>
          <p className="text-muted-foreground">Monitor and record day-to-day sales activities</p>
        </div>
        <Button onClick={() => {}} className="bg-primary hover:bg-primary-dark">
          <Plus className="h-4 w-4 mr-2" />
          Add Sale
        </Button>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-0 shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Today's Revenue
            </CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{BANGLADESHI_CURRENCY_SYMBOL}{analytics.todayRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{analytics.todayOrders} orders today</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Revenue
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{BANGLADESHI_CURRENCY_SYMBOL}{analytics.monthlyRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{analytics.monthlyOrders} orders this month</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Top Product
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-primary truncate">{topProduct?.[0] || 'N/A'}</div>
            <p className="text-xs text-muted-foreground">{topProduct?.[1] || 0} units sold</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Top Performer
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-primary">{topStaff?.[0] || 'N/A'}</div>
            <p className="text-xs text-muted-foreground">{BANGLADESHI_CURRENCY_SYMBOL}{topStaff?.[1]?.toLocaleString() || 0} in sales</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card className="border-0 shadow-elegant">
        <CardHeader>
          <CardTitle className="text-primary flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filters & Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium">Date:</label>
              <Input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-40"
              />
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium">Product:</label>
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
              <label className="text-sm font-medium">Staff:</label>
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

            <div className="flex space-x-2 ml-auto">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              <Button variant="outline" size="sm">
                <BarChart3 className="h-4 w-4 mr-2" />
                View Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sales Table */}
      <Card className="border-0 shadow-elegant">
        <CardHeader>
          <CardTitle className="text-primary">Sales Records</CardTitle>
          <CardDescription>Showing {filteredSales.length} sales records</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Transaction</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Payment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No sales records found. Create sales using the Point of Sale module.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSales.slice(0, 50).map((sale) => (
                    <TableRow key={sale.id} className="hover:bg-surface">
                      <TableCell className="font-medium">{sale.date}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{sale.transactionNumber}</TableCell>
                      <TableCell>{sale.productName}</TableCell>
                      <TableCell>{sale.quantity}</TableCell>
                      <TableCell>{BANGLADESHI_CURRENCY_SYMBOL}{sale.unitPrice.toLocaleString()}</TableCell>
                      <TableCell className="font-semibold">{BANGLADESHI_CURRENCY_SYMBOL}{sale.totalAmount.toLocaleString()}</TableCell>
                      <TableCell>
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
