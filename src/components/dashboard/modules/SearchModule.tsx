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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  Download, 
  Filter,
  FileText,
  Users,
  Package,
  Truck,
  BarChart3,
  Calendar,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Loader2,
  X,
  ChefHat,
  Wrench,
  Cylinder
} from "lucide-react";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
import { SalesData, Customer, StockItem, Driver } from "@/hooks/useDashboardData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";

interface SearchModuleProps {
  salesData: SalesData[];
  customers: Customer[];
  stockData: StockItem[];
  drivers: Driver[];
  userRole: string;
}

interface ReportData {
  title: string;
  headers: string[];
  rows: any[][];
  summary?: { label: string; value: string }[];
}

export const SearchModule = ({ salesData, customers, stockData, drivers, userRole }: SearchModuleProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCategory, setSearchCategory] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [currentReport, setCurrentReport] = useState<ReportData | null>(null);
  const [activeReportTab, setActiveReportTab] = useState("preview");

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("recentSearches");
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Save search to history
  const saveSearch = (query: string) => {
    if (!query.trim()) return;
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 10);
    setRecentSearches(updated);
    localStorage.setItem("recentSearches", JSON.stringify(updated));
  };

  // Combined search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase();
    const results: any[] = [];

    // Search in sales data
    if (searchCategory === "all" || searchCategory === "sales") {
      salesData.forEach(sale => {
        if (
          sale.productName.toLowerCase().includes(query) ||
          sale.staffName.toLowerCase().includes(query) ||
          sale.id.toLowerCase().includes(query)
        ) {
          results.push({
            type: 'sale',
            id: sale.id,
            title: `Sale: ${sale.productName}`,
            subtitle: `${sale.quantity}x - ${BANGLADESHI_CURRENCY_SYMBOL}${sale.totalAmount.toLocaleString()}`,
            meta: `${sale.date} | ${sale.staffName}`,
            data: sale
          });
        }
      });
    }

    // Search in customers
    if (searchCategory === "all" || searchCategory === "customers") {
      customers.forEach(customer => {
        if (
          customer.name.toLowerCase().includes(query) ||
          customer.phone.includes(query) ||
          customer.address.toLowerCase().includes(query)
        ) {
          results.push({
            type: 'customer',
            id: customer.id,
            title: `Customer: ${customer.name}`,
            subtitle: customer.phone,
            meta: `${customer.totalOrders} orders | ${BANGLADESHI_CURRENCY_SYMBOL}${customer.outstanding} outstanding`,
            data: customer
          });
        }
      });
    }

    // Search in stock
    if (searchCategory === "all" || searchCategory === "stock") {
      stockData.forEach(item => {
        if (item.name.toLowerCase().includes(query)) {
          results.push({
            type: 'stock',
            id: item.id,
            title: `Stock: ${item.name}`,
            subtitle: `${item.currentStock} units available`,
            meta: `${BANGLADESHI_CURRENCY_SYMBOL}${item.price} per unit | ${item.type}`,
            data: item
          });
        }
      });
    }

    // Search in drivers (if role allows)
    if ((userRole === 'owner' || userRole === 'manager') && (searchCategory === "all" || searchCategory === "drivers")) {
      drivers.forEach(driver => {
        if (
          driver.name.toLowerCase().includes(query) ||
          driver.phone.includes(query) ||
          driver.vehicleId.toLowerCase().includes(query)
        ) {
          results.push({
            type: 'driver',
            id: driver.id,
            title: `Driver: ${driver.name}`,
            subtitle: driver.phone,
            meta: `${driver.todayDeliveries} deliveries | Vehicle: ${driver.vehicleId}`,
            data: driver
          });
        }
      });
    }

    // Save to history on search
    if (results.length > 0) {
      saveSearch(searchQuery);
    }

    return results;
  }, [searchQuery, searchCategory, salesData, customers, stockData, drivers, userRole]);

  // Generate Daily Sales Report
  const generateDailySalesReport = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    
    const { data: transactions, error } = await supabase
      .from("pos_transactions")
      .select(`
        *,
        pos_transaction_items (*)
      `)
      .gte("created_at", `${today}T00:00:00`)
      .lte("created_at", `${today}T23:59:59`)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const rows = transactions?.map((t, i) => [
      i + 1,
      t.transaction_number,
      format(new Date(t.created_at), 'hh:mm a'),
      t.payment_method,
      `${BANGLADESHI_CURRENCY_SYMBOL}${t.subtotal}`,
      `${BANGLADESHI_CURRENCY_SYMBOL}${t.discount}`,
      `${BANGLADESHI_CURRENCY_SYMBOL}${t.total}`,
      t.payment_status
    ]) || [];

    const totalSales = transactions?.reduce((sum, t) => sum + Number(t.total), 0) || 0;
    const totalDiscount = transactions?.reduce((sum, t) => sum + Number(t.discount), 0) || 0;

    return {
      title: `Daily Sales Report - ${format(new Date(), 'dd MMM yyyy')}`,
      headers: ['#', 'Transaction', 'Time', 'Payment', 'Subtotal', 'Discount', 'Total', 'Status'],
      rows,
      summary: [
        { label: 'Total Transactions', value: String(transactions?.length || 0) },
        { label: 'Total Sales', value: `${BANGLADESHI_CURRENCY_SYMBOL}${totalSales.toLocaleString()}` },
        { label: 'Total Discount', value: `${BANGLADESHI_CURRENCY_SYMBOL}${totalDiscount.toLocaleString()}` },
      ]
    };
  };

  // Generate Stock Status Report
  const generateStockReport = async () => {
    const [lpgResult, stoveResult, regulatorResult] = await Promise.all([
      supabase.from("lpg_brands").select("*").eq("is_active", true),
      supabase.from("stoves").select("*").eq("is_active", true),
      supabase.from("regulators").select("*").eq("is_active", true)
    ]);

    const lpgRows = lpgResult.data?.map((b, i) => {
      const total = b.package_cylinder + b.refill_cylinder;
      const status = total === 0 ? "Out of Stock" : total < 30 ? "Low Stock" : "In Stock";
      return [
        i + 1,
        b.name,
        'LPG Cylinder',
        `${b.size} - ${b.weight}`,
        b.package_cylinder,
        b.refill_cylinder,
        total,
        status
      ];
    }) || [];

    const stoveRows = stoveResult.data?.map((s, i) => {
      const status = s.quantity === 0 ? "Out of Stock" : s.quantity < 30 ? "Low Stock" : "In Stock";
      return [
        lpgRows.length + i + 1,
        s.brand,
        'Gas Stove',
        s.burners === 1 ? 'Single Burner' : 'Double Burner',
        '-',
        '-',
        s.quantity,
        status
      ];
    }) || [];

    const regulatorRows = regulatorResult.data?.map((r, i) => {
      const status = r.quantity === 0 ? "Out of Stock" : r.quantity < 30 ? "Low Stock" : "In Stock";
      return [
        lpgRows.length + stoveRows.length + i + 1,
        r.brand,
        'Regulator',
        r.type,
        '-',
        '-',
        r.quantity,
        status
      ];
    }) || [];

    const allRows = [...lpgRows, ...stoveRows, ...regulatorRows];
    const outOfStock = allRows.filter(r => r[7] === "Out of Stock").length;
    const lowStock = allRows.filter(r => r[7] === "Low Stock").length;

    return {
      title: `Stock Status Report - ${format(new Date(), 'dd MMM yyyy')}`,
      headers: ['#', 'Brand/Name', 'Category', 'Type/Size', 'Package', 'Refill', 'Total', 'Status'],
      rows: allRows,
      summary: [
        { label: 'Total Items', value: String(allRows.length) },
        { label: 'Out of Stock', value: String(outOfStock) },
        { label: 'Low Stock', value: String(lowStock) },
        { label: 'In Stock', value: String(allRows.length - outOfStock - lowStock) },
      ]
    };
  };

  // Generate Customer Analysis Report
  const generateCustomerReport = async () => {
    const { data: customers, error } = await supabase
      .from("customers")
      .select("*")
      .order("total_due", { ascending: false });

    if (error) throw error;

    const rows = customers?.map((c, i) => [
      i + 1,
      c.name,
      c.phone || '-',
      c.address || '-',
      c.cylinders_due || 0,
      `${BANGLADESHI_CURRENCY_SYMBOL}${Number(c.total_due || 0).toLocaleString()}`,
      c.billing_status || 'clear',
      c.last_order_date ? format(new Date(c.last_order_date), 'dd MMM yyyy') : '-'
    ]) || [];

    const totalDue = customers?.reduce((sum, c) => sum + Number(c.total_due || 0), 0) || 0;
    const cylindersDue = customers?.reduce((sum, c) => sum + (c.cylinders_due || 0), 0) || 0;

    return {
      title: `Customer Analysis Report - ${format(new Date(), 'dd MMM yyyy')}`,
      headers: ['#', 'Name', 'Phone', 'Address', 'Cylinders Due', 'Amount Due', 'Status', 'Last Order'],
      rows,
      summary: [
        { label: 'Total Customers', value: String(customers?.length || 0) },
        { label: 'Total Amount Due', value: `${BANGLADESHI_CURRENCY_SYMBOL}${totalDue.toLocaleString()}` },
        { label: 'Total Cylinders Due', value: String(cylindersDue) },
      ]
    };
  };

  // Generate Financial Summary Report
  const generateFinancialReport = async () => {
    const startDate = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(new Date()), 'yyyy-MM-dd');

    const [salesResult, expensesResult, vehicleCostsResult, staffPaymentsResult] = await Promise.all([
      supabase.from("pos_transactions").select("total").gte("created_at", startDate).lte("created_at", endDate),
      supabase.from("daily_expenses").select("amount, category").gte("expense_date", startDate).lte("expense_date", endDate),
      supabase.from("vehicle_costs").select("amount, cost_type").gte("cost_date", startDate).lte("cost_date", endDate),
      supabase.from("staff_payments").select("amount").gte("payment_date", startDate).lte("payment_date", endDate)
    ]);

    const totalSales = salesResult.data?.reduce((sum, t) => sum + Number(t.total), 0) || 0;
    const totalExpenses = expensesResult.data?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
    const totalVehicleCosts = vehicleCostsResult.data?.reduce((sum, v) => sum + Number(v.amount), 0) || 0;
    const totalStaffPayments = staffPaymentsResult.data?.reduce((sum, s) => sum + Number(s.amount), 0) || 0;

    const rows = [
      [1, 'Total Sales Revenue', `${BANGLADESHI_CURRENCY_SYMBOL}${totalSales.toLocaleString()}`, 'Income'],
      [2, 'Daily Expenses', `${BANGLADESHI_CURRENCY_SYMBOL}${totalExpenses.toLocaleString()}`, 'Expense'],
      [3, 'Vehicle Costs', `${BANGLADESHI_CURRENCY_SYMBOL}${totalVehicleCosts.toLocaleString()}`, 'Expense'],
      [4, 'Staff Payments', `${BANGLADESHI_CURRENCY_SYMBOL}${totalStaffPayments.toLocaleString()}`, 'Expense'],
    ];

    const totalExpenseSum = totalExpenses + totalVehicleCosts + totalStaffPayments;
    const netProfit = totalSales - totalExpenseSum;

    return {
      title: `Financial Summary - ${format(new Date(), 'MMMM yyyy')}`,
      headers: ['#', 'Description', 'Amount', 'Type'],
      rows,
      summary: [
        { label: 'Total Revenue', value: `${BANGLADESHI_CURRENCY_SYMBOL}${totalSales.toLocaleString()}` },
        { label: 'Total Expenses', value: `${BANGLADESHI_CURRENCY_SYMBOL}${totalExpenseSum.toLocaleString()}` },
        { label: 'Net Profit/Loss', value: `${BANGLADESHI_CURRENCY_SYMBOL}${netProfit.toLocaleString()}` },
      ]
    };
  };

  // Generate Monthly Report
  const generateMonthlyReport = async () => {
    const startDate = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(new Date()), 'yyyy-MM-dd');

    const { data: transactions } = await supabase
      .from("pos_transactions")
      .select("created_at, total")
      .gte("created_at", startDate)
      .lte("created_at", endDate);

    // Group by date
    const dailyTotals: Record<string, number> = {};
    transactions?.forEach(t => {
      const date = format(new Date(t.created_at), 'yyyy-MM-dd');
      dailyTotals[date] = (dailyTotals[date] || 0) + Number(t.total);
    });

    const rows = Object.entries(dailyTotals)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, total], i) => [
        i + 1,
        format(new Date(date), 'dd MMM yyyy'),
        format(new Date(date), 'EEEE'),
        `${BANGLADESHI_CURRENCY_SYMBOL}${total.toLocaleString()}`
      ]);

    const totalRevenue = Object.values(dailyTotals).reduce((sum, v) => sum + v, 0);
    const avgDaily = rows.length > 0 ? totalRevenue / rows.length : 0;

    return {
      title: `Monthly Report - ${format(new Date(), 'MMMM yyyy')}`,
      headers: ['#', 'Date', 'Day', 'Revenue'],
      rows,
      summary: [
        { label: 'Total Days', value: String(rows.length) },
        { label: 'Total Revenue', value: `${BANGLADESHI_CURRENCY_SYMBOL}${totalRevenue.toLocaleString()}` },
        { label: 'Avg Daily Revenue', value: `${BANGLADESHI_CURRENCY_SYMBOL}${avgDaily.toLocaleString()}` },
      ]
    };
  };

  // Generate report handler
  const generateReport = async (type: string) => {
    setIsGeneratingReport(true);
    try {
      let report: ReportData;
      
      switch (type) {
        case 'daily-sales':
          report = await generateDailySalesReport();
          break;
        case 'stock-status':
          report = await generateStockReport();
          break;
        case 'customer-analysis':
          report = await generateCustomerReport();
          break;
        case 'financial-summary':
          report = await generateFinancialReport();
          break;
        case 'monthly-report':
          report = await generateMonthlyReport();
          break;
        default:
          throw new Error('Unknown report type');
      }

      setCurrentReport(report);
      setReportDialogOpen(true);
      toast.success('Report generated successfully');
    } catch (error) {
      console.error('Report generation error:', error);
      toast.error('Failed to generate report');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    if (!currentReport) return;

    const csvContent = [
      currentReport.headers.join(','),
      ...currentReport.rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${currentReport.title.replace(/\s+/g, '_')}.csv`;
    link.click();
    toast.success('Report exported to CSV');
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'sale': return FileText;
      case 'customer': return Users;
      case 'stock': return Package;
      case 'driver': return Truck;
      default: return Search;
    }
  };

  const getResultColor = (type: string) => {
    switch (type) {
      case 'sale': return 'bg-primary/10 text-primary border-primary/20';
      case 'customer': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'stock': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'driver': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default: return 'bg-muted text-muted-foreground border-muted/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Search & Reports</h2>
          <p className="text-muted-foreground text-sm">Global search and generate business reports</p>
        </div>
      </div>

      {/* Search Interface */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Global Search
          </CardTitle>
          <CardDescription>Search across customers, orders, products, and more</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by customer name, order ID, product, driver, etc..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 text-base bg-muted/50"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-muted-foreground">Category:</label>
                <Select value={searchCategory} onValueChange={setSearchCategory}>
                  <SelectTrigger className="w-40 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="customers">Customers</SelectItem>
                    <SelectItem value="stock">Stock</SelectItem>
                    {(userRole === 'owner' || userRole === 'manager') && (
                      <SelectItem value="drivers">Drivers</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-muted-foreground">From:</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-40 bg-background"
                />
              </div>

              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-muted-foreground">To:</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-40 bg-background"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      {searchQuery && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Search Results</CardTitle>
            <CardDescription>Found {searchResults.length} results for "{searchQuery}"</CardDescription>
          </CardHeader>
          <CardContent>
            {searchResults.length > 0 ? (
              <div className="space-y-2">
                {searchResults.slice(0, 20).map((result, index) => {
                  const Icon = getResultIcon(result.type);
                  return (
                    <div key={index} className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${getResultColor(result.type)}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{result.title}</p>
                        <p className="text-sm text-muted-foreground truncate">{result.subtitle}</p>
                        <p className="text-xs text-muted-foreground">{result.meta}</p>
                      </div>
                      <Badge variant="outline" className={getResultColor(result.type)}>
                        {result.type}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium text-muted-foreground">No results found</p>
                <p className="text-sm text-muted-foreground">Try different search terms or filters</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Reports */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Quick Reports
          </CardTitle>
          <CardDescription>Generate commonly used business reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="h-24 flex-col space-y-2 border-primary/30 hover:bg-primary/10 hover:border-primary"
              onClick={() => generateReport('daily-sales')}
              disabled={isGeneratingReport}
            >
              <FileText className="h-6 w-6 text-primary" />
              <span className="font-medium">Daily Sales Report</span>
              <span className="text-xs text-muted-foreground">Today's transactions</span>
            </Button>

            <Button
              variant="outline"
              className="h-24 flex-col space-y-2 border-green-500/30 hover:bg-green-500/10 hover:border-green-500"
              onClick={() => generateReport('stock-status')}
              disabled={isGeneratingReport}
            >
              <Package className="h-6 w-6 text-green-500" />
              <span className="font-medium">Stock Status Report</span>
              <span className="text-xs text-muted-foreground">Inventory levels</span>
            </Button>

            <Button
              variant="outline"
              className="h-24 flex-col space-y-2 border-orange-500/30 hover:bg-orange-500/10 hover:border-orange-500"
              onClick={() => generateReport('customer-analysis')}
              disabled={isGeneratingReport}
            >
              <Users className="h-6 w-6 text-orange-500" />
              <span className="font-medium">Customer Analysis</span>
              <span className="text-xs text-muted-foreground">Dues & payments</span>
            </Button>

            {(userRole === 'owner' || userRole === 'manager') && (
              <>
                <Button
                  variant="outline"
                  className="h-24 flex-col space-y-2 border-yellow-500/30 hover:bg-yellow-500/10 hover:border-yellow-500"
                  onClick={() => generateReport('financial-summary')}
                  disabled={isGeneratingReport}
                >
                  <DollarSign className="h-6 w-6 text-yellow-500" />
                  <span className="font-medium">Financial Summary</span>
                  <span className="text-xs text-muted-foreground">Income & expenses</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-24 flex-col space-y-2 border-blue-500/30 hover:bg-blue-500/10 hover:border-blue-500"
                  onClick={() => generateReport('monthly-report')}
                  disabled={isGeneratingReport}
                >
                  <Calendar className="h-6 w-6 text-blue-500" />
                  <span className="font-medium">Monthly Report</span>
                  <span className="text-xs text-muted-foreground">Daily breakdown</span>
                </Button>
              </>
            )}
          </div>

          {isGeneratingReport && (
            <div className="flex items-center justify-center py-4 mt-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
              <span className="text-muted-foreground">Generating report...</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Searches */}
      {recentSearches.length > 0 && !searchQuery && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Recent Searches</CardTitle>
            <CardDescription>Your recent search queries</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((query, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="hover:bg-primary/10"
                  onClick={() => setSearchQuery(query)}
                >
                  <Search className="h-3 w-3 mr-2 text-muted-foreground" />
                  {query}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report Preview Dialog */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {currentReport?.title}
            </DialogTitle>
            <DialogDescription>
              Generated on {format(new Date(), 'dd MMM yyyy, hh:mm a')}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeReportTab} onValueChange={setActiveReportTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
            </TabsList>

            <TabsContent value="preview" className="mt-4">
              <ScrollArea className="h-[400px] rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {currentReport?.headers.map((header, i) => (
                        <TableHead key={i} className="font-semibold">{header}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentReport?.rows.map((row, i) => (
                      <TableRow key={i}>
                        {row.map((cell, j) => (
                          <TableCell key={j}>
                            {cell === "Out of Stock" ? (
                              <Badge className="bg-red-500 text-white">{cell}</Badge>
                            ) : cell === "Low Stock" ? (
                              <Badge className="bg-yellow-500 text-white">{cell}</Badge>
                            ) : cell === "In Stock" ? (
                              <Badge className="bg-green-500 text-white">{cell}</Badge>
                            ) : (
                              cell
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="summary" className="mt-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {currentReport?.summary?.map((item, i) => (
                  <Card key={i} className="bg-muted/30">
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">{item.label}</p>
                      <p className="text-2xl font-bold text-foreground">{item.value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setReportDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={exportToCSV} className="bg-green-600 hover:bg-green-700">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
