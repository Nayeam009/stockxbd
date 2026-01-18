import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  ShoppingCart, 
  Plus, 
  Truck,
  MapPin,
  Phone,
  CheckCircle,
  Clock,
  Loader2,
  Search
} from "lucide-react";
import { Order, Driver } from "@/hooks/useDashboardData";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { orderSchema, parsePositiveNumber, parsePositiveInt, sanitizeString } from "@/lib/validationSchemas";

interface OnlineDeliveryModuleProps {
  orders: Order[];
  setOrders: (orders: Order[]) => void;
  drivers: Driver[];
  userRole: string;
}

export const OnlineDeliveryModule = ({ orders, setOrders, drivers, userRole }: OnlineDeliveryModuleProps) => {
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  // New order form state
  const [newOrder, setNewOrder] = useState({
    customerName: "",
    customerId: "",
    deliveryAddress: "",
    productId: "",
    productName: "",
    quantity: 1,
    price: 0
  });

  useEffect(() => {
    const fetchFormData = async () => {
      const [customersRes, productsRes] = await Promise.all([
        supabase.from('customers').select('id, name, address').order('name'),
        supabase.from('products').select('id, name, price').eq('is_active', true)
      ]);
      if (customersRes.data) setCustomers(customersRes.data);
      if (productsRes.data) setProducts(productsRes.data);
    };
    fetchFormData();
  }, []);

  // Filter orders
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      if (filterStatus !== "all" && order.status !== filterStatus) return false;
      if (searchQuery && !order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) && 
          !order.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (userRole === 'driver') {
        return order.driverId === drivers[0]?.id;
      }
      return true;
    });
  }, [orders, filterStatus, searchQuery, userRole, drivers]);

  // Analytics
  const analytics = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayOrders = orders.filter(order => order.orderDate?.startsWith(today));
    
    return {
      totalOrders: orders.length,
      pendingOrders: orders.filter(o => o.status === 'pending').length,
      dispatchedOrders: orders.filter(o => o.status === 'dispatched').length,
      deliveredOrders: orders.filter(o => o.status === 'delivered').length,
      todayOrders: todayOrders.length,
      todayRevenue: todayOrders.reduce((sum, order) => sum + order.totalAmount, 0),
    };
  }, [orders]);

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

  const handleCreateOrder = async () => {
    // Validate inputs using zod schema
    const validationResult = orderSchema.safeParse({
      customerName: newOrder.customerName,
      deliveryAddress: newOrder.deliveryAddress,
      productName: newOrder.productName,
      quantity: newOrder.quantity,
      price: newOrder.price
    });

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      toast.error(firstError.message || "Please fill all required fields correctly");
      return;
    }

    // Use validated and sanitized data
    const sanitizedOrder = {
      customerName: sanitizeString(newOrder.customerName),
      deliveryAddress: sanitizeString(newOrder.deliveryAddress),
      productName: sanitizeString(newOrder.productName),
      quantity: parsePositiveInt(String(newOrder.quantity), 10000),
      price: parsePositiveNumber(String(newOrder.price), 10000000)
    };

    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      // Generate order number
      const { data: orderNum } = await supabase.rpc('generate_order_number');
      const orderNumber = orderNum || `ORD-${Date.now()}`;

      // Create order
      const { data: order, error } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          customer_id: newOrder.customerId || null,
          customer_name: sanitizedOrder.customerName,
          delivery_address: sanitizedOrder.deliveryAddress,
          total_amount: sanitizedOrder.price * sanitizedOrder.quantity,
          status: 'pending',
          payment_status: 'pending',
          created_by: userData.user.id
        })
        .select()
        .single();

      if (error) throw error;

      // Create order item
      if (order) {
        await supabase.from('order_items').insert({
          order_id: order.id,
          product_id: newOrder.productId || null,
          product_name: sanitizedOrder.productName,
          quantity: sanitizedOrder.quantity,
          price: sanitizedOrder.price
        });
      }

      toast.success(`Order ${orderNumber} created successfully`);
      setShowAddForm(false);
      setNewOrder({
        customerName: "",
        customerId: "",
        deliveryAddress: "",
        productId: "",
        productName: "",
        quantity: 1,
        price: 0
      });

      // Refresh orders
      const { data: updatedOrders } = await supabase
        .from('orders')
        .select(`*, order_items (*)`)
        .order('created_at', { ascending: false });

      if (updatedOrders) {
        const formatted = updatedOrders.map(o => ({
          id: o.id,
          orderNumber: o.order_number,
          customerId: o.customer_id || '',
          customerName: o.customer_name,
          items: (o.order_items || []).map((item: any) => ({
            productId: item.product_id || '',
            productName: item.product_name,
            quantity: item.quantity,
            price: Number(item.price)
          })),
          totalAmount: Number(o.total_amount),
          status: o.status as Order['status'],
          paymentStatus: o.payment_status as Order['paymentStatus'],
          deliveryAddress: o.delivery_address,
          driverId: o.driver_id,
          orderDate: o.order_date,
          deliveryDate: o.delivery_date
        }));
        setOrders(formatted);
      }

    } catch (error: any) {
      toast.error(error.message || "Failed to create order");
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const updateData: Record<string, unknown> = { status: newStatus };
      if (newStatus === 'delivered') {
        updateData.delivery_date = new Date().toISOString();
      }

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) throw error;

      setOrders(orders.map(order => 
        order.id === orderId 
          ? { ...order, status: newStatus as typeof order.status, deliveryDate: newStatus === 'delivered' ? new Date().toISOString() : order.deliveryDate }
          : order
      ));

      toast.success(`Order status updated to ${newStatus}`);
    } catch (error) {
      toast.error("Failed to update order status");
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-primary">Online Delivery Management</h2>
          <p className="text-sm text-muted-foreground">Manage online orders and delivery tracking</p>
        </div>
        {(userRole === 'owner' || userRole === 'manager') && (
          <Button onClick={() => setShowAddForm(true)} className="bg-primary hover:bg-primary-dark w-full sm:w-auto touch-target">
            <Plus className="h-4 w-4 mr-2" />
            New Order
          </Button>
        )}
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <Card className="border-0 shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Total Orders
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground hidden sm:block" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold text-primary">{analytics.totalOrders}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">{analytics.todayOrders} orders today</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Pending
            </CardTitle>
            <Clock className="h-4 w-4 text-warning hidden sm:block" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold text-warning">{analytics.pendingOrders}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Awaiting processing</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              In Transit
            </CardTitle>
            <Truck className="h-4 w-4 text-secondary hidden sm:block" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold text-secondary">{analytics.dispatchedOrders}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Out for delivery</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Delivered
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-accent hidden sm:block" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold text-accent">{analytics.deliveredOrders}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">{BANGLADESHI_CURRENCY_SYMBOL}{analytics.todayRevenue.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-elegant">
        <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-4">
          <CardTitle className="text-primary text-base sm:text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center">
            <div className="flex items-center gap-2 flex-1">
              <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <Input
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 h-10"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium whitespace-nowrap">Status:</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-40 h-10">
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

      {/* Orders - Mobile Cards + Desktop Table */}
      <Card className="border-0 shadow-elegant">
        <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-4">
          <CardTitle className="text-primary text-base sm:text-lg">Orders</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Showing {filteredOrders.length} orders</CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          {/* Mobile Cards View */}
          <div className="sm:hidden space-y-3">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No orders found. Create your first order to get started.
              </div>
            ) : (
              filteredOrders.map((order) => (
                <Card key={order.id} className="p-3 border border-border/50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-sm">{order.orderNumber || order.id.slice(0, 8)}</p>
                      <p className="text-xs text-muted-foreground">{order.customerName}</p>
                    </div>
                    <Badge variant="secondary" className={`${getStatusColor(order.status)} text-[10px]`}>
                      {order.status.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-semibold">{BANGLADESHI_CURRENCY_SYMBOL}{(order.totalAmount || 0).toLocaleString()}</span>
                    <Badge variant="secondary" className={`${getPaymentStatusColor(order.paymentStatus)} text-[10px]`}>
                      {order.paymentStatus.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{order.deliveryAddress}</span>
                  </div>
                  {(userRole === 'owner' || userRole === 'manager') && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
                      {order.status === 'pending' && (
                        <Button size="sm" variant="outline" onClick={() => updateOrderStatus(order.id, 'confirmed')} className="flex-1 h-8 text-xs">
                          Confirm
                        </Button>
                      )}
                      {order.status === 'confirmed' && (
                        <Button size="sm" variant="outline" onClick={() => updateOrderStatus(order.id, 'dispatched')} className="flex-1 h-8 text-xs">
                          Dispatch
                        </Button>
                      )}
                      {order.status === 'dispatched' && (
                        <Button size="sm" variant="outline" onClick={() => updateOrderStatus(order.id, 'delivered')} className="flex-1 h-8 text-xs">
                          Delivered
                        </Button>
                      )}
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block">
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
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No orders found. Create your first order to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => (
                    <TableRow key={order.id} className="hover:bg-surface">
                      <TableCell className="font-medium">{order.orderNumber || order.id.slice(0, 8)}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{order.customerName}</p>
                          <p className="text-xs text-muted-foreground">
                            {order.orderDate ? new Date(order.orderDate).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {order.items?.map((item, idx) => (
                            <p key={idx} className="text-sm">
                              {item.quantity}x {item.productName}
                            </p>
                          )) || <p className="text-sm text-muted-foreground">No items</p>}
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">{BANGLADESHI_CURRENCY_SYMBOL}{(order.totalAmount || 0).toLocaleString()}</TableCell>
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
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Driver Assignment - Only for owner/manager */}
      {(userRole === 'owner' || userRole === 'manager') && drivers.length > 0 && (
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

      {/* Add Order Dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-[95vw] sm:max-w-[500px] p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">Create New Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Customer</Label>
              <Select 
                value={newOrder.customerId || "new"} 
                onValueChange={(v) => {
                  if (v === "new") {
                    setNewOrder({ ...newOrder, customerId: "", customerName: "" });
                  } else {
                    const customer = customers.find(c => c.id === v);
                    setNewOrder({ 
                      ...newOrder, 
                      customerId: v, 
                      customerName: customer?.name || "",
                      deliveryAddress: customer?.address || newOrder.deliveryAddress
                    });
                  }
                }}
              >
                <SelectTrigger className="h-11 text-base">
                  <SelectValue placeholder="Select customer..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new" className="py-3">New Customer</SelectItem>
                  {customers.map(c => (
                    <SelectItem key={c.id} value={c.id} className="py-3">{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(!newOrder.customerId || newOrder.customerId === "new") && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Customer Name</Label>
                <Input
                  value={newOrder.customerName}
                  onChange={(e) => setNewOrder({ ...newOrder, customerName: e.target.value })}
                  placeholder="Enter customer name"
                  className="h-11 text-base"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-sm font-medium">Delivery Address</Label>
              <Input
                value={newOrder.deliveryAddress}
                onChange={(e) => setNewOrder({ ...newOrder, deliveryAddress: e.target.value })}
                placeholder="Enter delivery address"
                className="h-11 text-base"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Product</Label>
              <Select 
                value={newOrder.productId || "custom"} 
                onValueChange={(v) => {
                  if (v === "custom") {
                    setNewOrder({ ...newOrder, productId: "", productName: "", price: 0 });
                  } else {
                    const product = products.find(p => p.id === v);
                    setNewOrder({ 
                      ...newOrder, 
                      productId: v, 
                      productName: product?.name || "",
                      price: Number(product?.price) || 0
                    });
                  }
                }}
              >
                <SelectTrigger className="h-11 text-base">
                  <SelectValue placeholder="Select product..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom" className="py-3">Custom Product</SelectItem>
                  {products.map(p => (
                    <SelectItem key={p.id} value={p.id} className="py-3">{p.name} - ৳{p.price}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(!newOrder.productId || newOrder.productId === "custom") && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Product Name</Label>
                  <Input
                    value={newOrder.productName}
                    onChange={(e) => setNewOrder({ ...newOrder, productName: e.target.value })}
                    placeholder="Enter product name"
                    className="h-11 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Price (৳)</Label>
                  <Input
                    type="number"
                    value={newOrder.price}
                    onChange={(e) => setNewOrder({ ...newOrder, price: Number(e.target.value) })}
                    placeholder="Enter price"
                    className="h-11 text-base"
                    inputMode="numeric"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label className="text-sm font-medium">Quantity</Label>
              <Input
                type="number"
                min="1"
                value={newOrder.quantity}
                onChange={(e) => setNewOrder({ ...newOrder, quantity: parseInt(e.target.value) || 1 })}
                className="h-11 text-base"
                inputMode="numeric"
              />
            </div>

            <div className="pt-2 border-t">
              <p className="text-lg font-semibold">
                Total: {BANGLADESHI_CURRENCY_SYMBOL}{(newOrder.price * newOrder.quantity).toLocaleString()}
              </p>
            </div>

            <Button onClick={handleCreateOrder} className="w-full h-11 text-base" disabled={loading}>
              {loading && <Loader2 className="h-5 w-5 mr-2 animate-spin" />}
              Create Order
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
