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
  Search, 
  Download, 
  Filter,
  FileText,
  Users,
  Package,
  Truck,
  BarChart3,
  Calendar
} from "lucide-react";
import { SalesData, Customer, StockItem, Driver } from "@/hooks/useDashboardData";

interface SearchModuleProps {
  salesData: SalesData[];
  customers: Customer[];
  stockData: StockItem[];
  drivers: Driver[];
  userRole: string;
}

export const SearchModule = ({ salesData, customers, stockData, drivers, userRole }: SearchModuleProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCategory, setSearchCategory] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

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
            subtitle: `${sale.quantity}x - ₹${sale.totalAmount.toLocaleString()}`,
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
            meta: `${customer.totalOrders} orders | ₹${customer.outstanding} outstanding`,
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
            meta: `₹${item.price} per unit | ${item.type}`,
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

    return results;
  }, [searchQuery, searchCategory, salesData, customers, stockData, drivers, userRole]);

  // Generate reports
  const generateReport = (type: string) => {
    console.log(`Generating ${type} report...`);
    // This would implement actual report generation
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
      case 'customer': return 'bg-secondary/10 text-secondary border-secondary/20';
      case 'stock': return 'bg-accent/10 text-accent border-accent/20';
      case 'driver': return 'bg-info/10 text-info border-info/20';
      default: return 'bg-muted text-muted-foreground border-muted/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-primary">Search & Reports</h2>
          <p className="text-muted-foreground">Global search across all modules and generate reports</p>
        </div>
        <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
          <BarChart3 className="h-4 w-4 mr-2" />
          Analytics Dashboard
        </Button>
      </div>

      {/* Search Interface */}
      <Card className="border-0 shadow-elegant">
        <CardHeader>
          <CardTitle className="text-primary flex items-center">
            <Search className="h-5 w-5 mr-2" />
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
                className="pl-10 text-base"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium">Category:</label>
                <Select value={searchCategory} onValueChange={setSearchCategory}>
                  <SelectTrigger className="w-40">
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
                <label className="text-sm font-medium">From:</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-40"
                />
              </div>

              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium">To:</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-40"
                />
              </div>

              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Advanced Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      {searchQuery && (
        <Card className="border-0 shadow-elegant">
          <CardHeader>
            <CardTitle className="text-primary">Search Results</CardTitle>
            <CardDescription>Found {searchResults.length} results</CardDescription>
          </CardHeader>
          <CardContent>
            {searchResults.length > 0 ? (
              <div className="space-y-3">
                {searchResults.slice(0, 20).map((result, index) => {
                  const Icon = getResultIcon(result.type);
                  return (
                    <div key={index} className="flex items-center space-x-3 p-4 bg-surface rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${getResultColor(result.type)}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{result.title}</p>
                        <p className="text-sm text-muted-foreground">{result.subtitle}</p>
                        <p className="text-xs text-muted-foreground">{result.meta}</p>
                      </div>
                      <Badge variant="secondary" className={getResultColor(result.type)}>
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
      <Card className="border-0 shadow-elegant">
        <CardHeader>
          <CardTitle className="text-primary">Quick Reports</CardTitle>
          <CardDescription>Generate commonly used reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="h-20 flex-col space-y-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              onClick={() => generateReport('daily-sales')}
            >
              <FileText className="h-6 w-6" />
              <span>Daily Sales Report</span>
            </Button>

            <Button
              variant="outline"
              className="h-20 flex-col space-y-2 border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground"
              onClick={() => generateReport('stock-status')}
            >
              <Package className="h-6 w-6" />
              <span>Stock Status Report</span>
            </Button>

            <Button
              variant="outline"
              className="h-20 flex-col space-y-2 border-accent text-accent hover:bg-accent hover:text-accent-foreground"
              onClick={() => generateReport('customer-analysis')}
            >
              <Users className="h-6 w-6" />
              <span>Customer Analysis</span>
            </Button>

            {(userRole === 'owner' || userRole === 'manager') && (
              <>
                <Button
                  variant="outline"
                  className="h-20 flex-col space-y-2 border-info text-info hover:bg-info hover:text-info-foreground"
                  onClick={() => generateReport('driver-performance')}
                >
                  <Truck className="h-6 w-6" />
                  <span>Driver Performance</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-20 flex-col space-y-2 border-warning text-warning hover:bg-warning hover:text-warning-foreground"
                  onClick={() => generateReport('financial-summary')}
                >
                  <BarChart3 className="h-6 w-6" />
                  <span>Financial Summary</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-20 flex-col space-y-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                  onClick={() => generateReport('monthly-report')}
                >
                  <Calendar className="h-6 w-6" />
                  <span>Monthly Report</span>
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Search History */}
      <Card className="border-0 shadow-elegant">
        <CardHeader>
          <CardTitle className="text-primary">Recent Searches</CardTitle>
          <CardDescription>Your recent search queries</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              "Rajesh Kumar orders",
              "12kg cylinder stock",
              "Driver performance",
              "Outstanding payments",
              "Monthly sales report"
            ].map((query, index) => (
              <Button
                key={index}
                variant="ghost"
                className="w-full justify-start text-left hover:bg-surface"
                onClick={() => setSearchQuery(query)}
              >
                <Search className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-sm">{query}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};