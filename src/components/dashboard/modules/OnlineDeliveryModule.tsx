import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  ShoppingCart, 
  Plus, 
  Truck,
  MapPin,
  Phone,
  CheckCircle,
  Clock,
  AlertCircle,
  Search
} from "lucide-react";
import { Order } from "@/hooks/useDashboardData";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";

interface OnlineDeliveryModuleProps {
  orders: Order[];
  setOrders: (orders: Order[]) => void;
  drivers: any[];
  userRole: string;
}

export const OnlineDeliveryModule = ({ orders, setOrders, drivers, userRole }: OnlineDeliveryModuleProps) => {
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  // Mock orders data since orders is empty from the hook
  const mockOrders: Order[] = [
    {
      id: "ORD001",
      customerId: "cust-1",
      customerName: "Abdul Rahman",
      items: [{ productId: "1", productName: "12kg LPG Cylinder", quantity: 2, price: 1200 }],
      totalAmount: 2400,
      status: "pending",
      paymentStatus: "pending",
      deliveryAddress: "Dhanmondi, Dhaka",
      orderDate: new Date().toISOString(),
    },
    {
      id: "ORD002",
      customerId: "cust-2",
      customerName: "Rashida Begum",
      items: [{ productId: "4", productName: "2 Burner Gas Stove", quantity: 1, price: 4500 }],
      totalAmount: 4500,
      status: "dispatched",
      paymentStatus: "paid",
      deliveryAddress: "Gulshan, Dhaka",
      driverId: "1",
      orderDate: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: "ORD003",
      customerId: "cust-3",
      customerName: "Mohammad Karim",
      items: [{ productId: "2", productName: "12kg LPG Cylinder", quantity: 3, price: 1200 }],
      totalAmount: 3600,
      status: "delivered",
      paymentStatus: "paid",
      deliveryAddress: "Uttara, Dhaka",
      driverId: "2",
      orderDate: new Date(Date.now() - 172800000).toISOString(),
      deliveryDate: new Date(Date.now() - 86400000).toISOString(),
    },
  ];

  const allOrders = orders.length ? orders : mockOrders;

  // Filter orders
  const filteredOrders = useMemo(() => {
    return allOrders.filter(order => {
      if (filterStatus !== "all" && order.status !== filterStatus) return false;
      if (searchQuery && !order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) && 
          !order.id.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (userRole === 'driver') {
        // Driver can only see their own orders
        return order.driverId === "1"; // Assuming current driver ID is 1
      }
      return true;
    });
  }, [allOrders, filterStatus, searchQuery, userRole]);

  // Analytics
  const analytics = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayOrders = allOrders.filter(order => order.orderDate.startsWith(today));
    
    return {
      totalOrders: allOrders.length,
      pendingOrders: allOrders.filter(o => o.status === 'pending').length,
      dispatchedOrders: allOrders.filter(o => o.status === 'dispatched').length,
      deliveredOrders: allOrders.filter(o => o.status === 'delivered').length,
      todayOrders: todayOrders.length,
      todayRevenue: todayOrders.reduce((sum, order) => sum + order.totalAmount, 0),
    };
  }, [allOrders]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-warning/10 text-warning border-warning/20';
      case 'confirmed': return 'bg-info/10 text-info border-info/20';
      case 'dispatched': return 'bg-secondary/10 text-secondary border-secondary/20';
      case 'delivered': return 'bg-accent/10 text-accent border-accent/20';
      case 'cancelled': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted text-muted-foreground border-muted/20';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-accent/10 text-accent border-accent/20';
      case 'pending': return 'bg-warning/10 text-warning border-warning/20';
      case 'partial': return 'bg-info/10 text-info border-info/20';
      default: return 'bg-muted text-muted-foreground border-muted/20';
    }
  };

  const updateOrderStatus = (orderId: string, newStatus: string) => {
    const updatedOrders = allOrders.map(order => {
      if (order.id === orderId) {
        return {
          ...order,
          status: newStatus as any,
          deliveryDate: newStatus === 'delivered' ? new Date().toISOString() : order.deliveryDate
        };
      }
      return order;
    });
    setOrders(updatedOrders);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-primary">Online Delivery Management</h2>
          <p className="text-muted-foreground">Manage online orders and delivery tracking</p>
        </div>
        {(userRole === 'owner' || userRole === 'manager') && (
          <Button onClick={() => setShowAddForm(true)} className="bg-primary hover:bg-primary-dark">
            <Plus className="h-4 w-4 mr-2" />
            New Order
          </Button>
        )}
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-0 shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Orders
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{analytics.totalOrders}</div>
            <p className="text-xs text-muted-foreground">{analytics.todayOrders} orders today</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Orders
            </CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{analytics.pendingOrders}</div>
            <p className="text-xs text-muted-foreground">Awaiting processing</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              In Transit
            </CardTitle>
            <Truck className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary">{analytics.dispatchedOrders}</div>
            <p className="text-xs text-muted-foreground">Out for delivery</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Delivered Today
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{analytics.deliveredOrders}</div>
            <p className="text-xs text-muted-foreground">{BANGLADESHI_CURRENCY_SYMBOL}{analytics.todayRevenue.toLocaleString()} revenue</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-elegant">
        <CardHeader>
          <CardTitle className="text-primary">Order Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64"
              />
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium">Status:</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Orders</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="dispatched">Dispatched</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card className="border-0 shadow-elegant">
        <CardHeader>
          <CardTitle className="text-primary">Orders</CardTitle>
          <CardDescription>Showing {filteredOrders.length} orders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Address</TableHead>
                  {(userRole === 'owner' || userRole === 'manager') && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id} className="hover:bg-surface">
                    <TableCell className="font-medium">{order.id}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{order.customerName}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.orderDate).toLocaleDateString()}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {order.items.map((item, idx) => (
                          <p key={idx} className="text-sm">
                            {item.quantity}x {item.productName}
                          </p>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">{BANGLADESHI_CURRENCY_SYMBOL}{order.totalAmount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={getStatusColor(order.status)}>
                        {order.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={getPaymentStatusColor(order.paymentStatus)}>
                        {order.paymentStatus.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{order.deliveryAddress}</span>
                      </div>
                    </TableCell>
                    {(userRole === 'owner' || userRole === 'manager') && (
                      <TableCell>
                        <div className="flex space-x-1">
                          {order.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateOrderStatus(order.id, 'confirmed')}
                              className="text-info border-info hover:bg-info hover:text-info-foreground"
                            >
                              Confirm
                            </Button>
                          )}
                          {order.status === 'confirmed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateOrderStatus(order.id, 'dispatched')}
                              className="text-secondary border-secondary hover:bg-secondary hover:text-secondary-foreground"
                            >
                              Dispatch
                            </Button>
                          )}
                          {order.status === 'dispatched' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateOrderStatus(order.id, 'delivered')}
                              className="text-accent border-accent hover:bg-accent hover:text-accent-foreground"
                            >
                              Delivered
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Driver Assignment - Only for owner/manager */}
      {(userRole === 'owner' || userRole === 'manager') && (
        <Card className="border-0 shadow-elegant">
          <CardHeader>
            <CardTitle className="text-primary">Driver Status</CardTitle>
            <CardDescription>Current driver assignments and availability</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {drivers.map((driver) => (
                <div key={driver.id} className="p-4 bg-surface rounded-lg border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-foreground">{driver.name}</h4>
                    <Badge 
                      variant="secondary"
                      className={
                        driver.status === 'active' ? 'bg-accent/10 text-accent border-accent/20' :
                        driver.status === 'break' ? 'bg-warning/10 text-warning border-warning/20' :
                        'bg-muted text-muted-foreground border-muted/20'
                      }
                    >
                      {driver.status}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center space-x-1">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">{driver.phone}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Truck className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Vehicle: {driver.vehicleId}</span>
                    </div>
                    <p className="text-muted-foreground">
                      Today: {driver.todayDeliveries} deliveries
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};