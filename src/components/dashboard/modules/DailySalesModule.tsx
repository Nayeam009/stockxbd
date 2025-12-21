import { useState, useMemo } from "react";
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
  TrendingUp
} from "lucide-react";
import { BANGLADESHI_CURRENCY_SYMBOL, BANGLADESHI_PAYMENT_METHODS } from "@/lib/bangladeshConstants";
import { SalesData } from "@/hooks/useDashboardData";

interface DailySalesModuleProps {
  salesData: SalesData[];
  setSalesData: (data: SalesData[]) => void;
}

export const DailySalesModule = ({ salesData, setSalesData }: DailySalesModuleProps) => {
  const [filterDate, setFilterDate] = useState("");
  const [filterProduct, setFilterProduct] = useState("all");
  const [filterStaff, setFilterStaff] = useState("all");
  const [showAddForm, setShowAddForm] = useState(false);

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

  const paymentMethodColors = BANGLADESHI_PAYMENT_METHODS.reduce((acc, method) => {
    acc[method.id] = method.color;
    return acc;
  }, {} as Record<string, string>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-primary">Daily Sales Management</h2>
          <p className="text-muted-foreground">Monitor and record day-to-day sales activities</p>
        </div>
        <Button onClick={() => setShowAddForm(true)} className="bg-primary hover:bg-primary-dark">
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
            <div className="text-lg font-bold text-primary">{topProduct?.[0] || 'N/A'}</div>
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
                  {Array.from(
                    new Set(
                      salesData
                        .map((s) => s.staffName.trim())
                        .filter((s) => s.length > 0)
                    )
                  ).map((staff) => (
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
                  <TableHead>Product</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Staff</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.slice(0, 20).map((sale) => (
                  <TableRow key={sale.id} className="hover:bg-surface">
                    <TableCell className="font-medium">{sale.date}</TableCell>
                    <TableCell>{sale.productName}</TableCell>
                    <TableCell>{sale.quantity}</TableCell>
                    <TableCell>{BANGLADESHI_CURRENCY_SYMBOL}{sale.unitPrice.toLocaleString()}</TableCell>
                    <TableCell className="font-semibold">{BANGLADESHI_CURRENCY_SYMBOL}{sale.totalAmount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge 
                        variant="secondary" 
                        className={paymentMethodColors[sale.paymentMethod]}
                      >
                        {sale.paymentMethod.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>{sale.staffName}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};