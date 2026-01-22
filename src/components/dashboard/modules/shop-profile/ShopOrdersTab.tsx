import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
import { logger } from "@/lib/logger";
import { 
  ShoppingBag, Package, Clock, CheckCircle, Truck, XCircle, 
  Search, RefreshCw, Phone, MapPin, Calendar, AlertCircle,
  TrendingUp, TestTube, Building2, User
} from "lucide-react";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CommunityOrder {
  id: string;
  order_number: string;
  shop_id: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  division: string;
  district: string;
  thana: string | null;
  order_notes: string | null;
  subtotal: number;
  delivery_fee: number;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'dispatched' | 'delivered' | 'cancelled' | 'rejected';
  payment_method: 'cod' | 'bkash' | 'nagad' | 'card';
  payment_status: 'pending' | 'paid';
  rejection_reason: string | null;
  confirmed_at: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
  created_at: string;
  customer_type?: 'retail' | 'wholesale';
  is_self_order?: boolean;
  items?: OrderItem[];
}

interface OrderItem {
  id: string;
  product_name: string;
  product_type: string;
  brand_name: string | null;
  weight: string | null;
  quantity: number;
  price: number;
  return_cylinder_qty: number;
  return_cylinder_type: 'empty' | 'leaked' | null;
}

interface ShopOrdersTabProps {
  shopId: string | null;
}

export const ShopOrdersTab = ({ shopId }: ShopOrdersTabProps) => {
  const [orders, setOrders] = useState<CommunityOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Fetch orders
  const fetchData = useCallback(async () => {
    if (!shopId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('community_orders')
        .select('*')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Fetch order items for each order
      const ordersWithItems = await Promise.all(
        (ordersData || []).map(async (order) => {
          const { data: items } = await supabase
            .from('community_order_items')
            .select('*')
            .eq('order_id', order.id);
          return { ...order, items: items || [] } as CommunityOrder;
        })
      );

      setOrders(ordersWithItems);
    } catch (error) {
      logger.error('Error fetching orders:', error);
      toast({
        title: "Error",
        description: "Failed to fetch orders",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  // Real-time subscription
  useEffect(() => {
    fetchData();

    if (shopId) {
      const channel = supabase
        .channel('shop-orders-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'community_orders',
            filter: `shop_id=eq.${shopId}`
          },
          (payload) => {
            logger.info('Order change detected:', payload);
            fetchData();
            
            if (payload.eventType === 'INSERT') {
              toast({
                title: "🛒 New Order!",
                description: `Order #${(payload.new as any).order_number} received`,
              });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [fetchData, shopId]);

  // Update order status
  const updateOrderStatus = async (orderId: string, newStatus: CommunityOrder['status'], reason?: string) => {
    try {
      const updateData: Record<string, any> = { 
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      if (newStatus === 'confirmed') updateData.confirmed_at = new Date().toISOString();
      if (newStatus === 'dispatched') updateData.dispatched_at = new Date().toISOString();
      if (newStatus === 'delivered') {
        updateData.delivered_at = new Date().toISOString();
        updateData.payment_status = 'paid';
      }
      if (newStatus === 'rejected' && reason) updateData.rejection_reason = reason;

      const { error } = await supabase
        .from('community_orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Order ${newStatus}`,
      });

      fetchData();
    } catch (error) {
      logger.error('Error updating order status:', error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive"
      });
    }
  };

  const handleReject = () => {
    if (selectedOrderId && rejectionReason.trim()) {
      updateOrderStatus(selectedOrderId, 'rejected', rejectionReason);
      setRejectDialogOpen(false);
      setRejectionReason("");
      setSelectedOrderId(null);
    }
  };

  // Filter orders
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesTab = activeTab === 'all' || order.status === activeTab;
      const matchesSearch = searchQuery === '' || 
        order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer_phone.includes(searchQuery);
      return matchesTab && matchesSearch;
    });
  }, [orders, activeTab, searchQuery]);

  // Analytics
  const analytics = useMemo(() => ({
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    confirmed: orders.filter(o => o.status === 'confirmed').length,
    dispatched: orders.filter(o => o.status === 'dispatched').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    todayRevenue: orders
      .filter(o => o.status === 'delivered' && o.delivered_at && new Date(o.delivered_at).toDateString() === new Date().toDateString())
      .reduce((sum, o) => sum + o.total_amount, 0),
    todayOrders: orders.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString()).length
  }), [orders]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-500/15 text-amber-600 border-amber-500/30';
      case 'confirmed': return 'bg-primary/15 text-primary border-primary/30';
      case 'preparing': return 'bg-secondary/15 text-secondary-foreground border-secondary/30';
      case 'dispatched': return 'bg-blue-500/15 text-blue-600 border-blue-500/30';
      case 'delivered': return 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30';
      case 'rejected': case 'cancelled': return 'bg-destructive/15 text-destructive border-destructive/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'confirmed': return <CheckCircle className="h-4 w-4" />;
      case 'preparing': return <Package className="h-4 w-4" />;
      case 'dispatched': return <Truck className="h-4 w-4" />;
      case 'delivered': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': case 'cancelled': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getOrderTypeBadge = (order: CommunityOrder) => {
    if (order.is_self_order) {
      return (
        <Badge className="bg-purple-500/15 text-purple-600 border-purple-500/30 gap-1">
          <TestTube className="h-3 w-3" />
          Test Order
        </Badge>
      );
    }
    if (order.customer_type === 'wholesale') {
      return (
        <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30 gap-1">
          <Building2 className="h-3 w-3" />
          Wholesale
        </Badge>
      );
    }
    return (
      <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 gap-1">
        <User className="h-3 w-3" />
        Retail
      </Badge>
    );
  };

  if (!shopId) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Create Your Shop First</h3>
          <p className="text-muted-foreground text-center max-w-md">
            Set up your shop profile to start receiving orders from customers
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/15 flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">{analytics.pending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/15 flex items-center justify-center">
              <Truck className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">{analytics.dispatched}</p>
              <p className="text-xs text-muted-foreground">Dispatched</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/15 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">{analytics.delivered}</p>
              <p className="text-xs text-muted-foreground">Delivered</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/15 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-xl font-bold tabular-nums">{BANGLADESHI_CURRENCY_SYMBOL}{analytics.todayRevenue}</p>
              <p className="text-xs text-muted-foreground">Today</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search and Refresh */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search orders by number, name, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11"
          />
        </div>
        <Button variant="outline" onClick={fetchData} className="gap-2 h-11">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full overflow-x-auto flex justify-start h-11">
          <TabsTrigger value="all" className="flex-1 sm:flex-none">All ({analytics.total})</TabsTrigger>
          <TabsTrigger value="pending" className="flex-1 sm:flex-none">Pending ({analytics.pending})</TabsTrigger>
          <TabsTrigger value="dispatched" className="flex-1 sm:flex-none">Dispatched ({analytics.dispatched})</TabsTrigger>
          <TabsTrigger value="delivered" className="flex-1 sm:flex-none">Delivered ({analytics.delivered})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {filteredOrders.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ShoppingBag className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Orders Found</h3>
                <p className="text-muted-foreground text-center">
                  {activeTab === 'all' 
                    ? "You haven't received any orders yet. Share your shop with customers!"
                    : `No ${activeTab} orders at the moment.`
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[calc(100vh-450px)] min-h-[400px]">
              <div className="space-y-3 pr-4">
                {filteredOrders.map((order) => (
                  <Card key={order.id} className="overflow-hidden">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <CardTitle className="text-base">#{order.order_number}</CardTitle>
                            <Badge className={`text-xs ${getStatusColor(order.status)}`}>
                              {getStatusIcon(order.status)}
                              <span className="ml-1 capitalize">{order.status}</span>
                            </Badge>
                            {getOrderTypeBadge(order)}
                          </div>
                          <CardDescription className="text-xs flex items-center gap-2">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(order.created_at), 'dd MMM yyyy, hh:mm a')}
                          </CardDescription>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-lg font-bold text-primary tabular-nums">
                            {BANGLADESHI_CURRENCY_SYMBOL}{order.total_amount}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {order.payment_method.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 pt-2 space-y-3">
                      {/* Customer Info */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{order.customer_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          <a href={`tel:${order.customer_phone}`} className="hover:underline">
                            {order.customer_phone}
                          </a>
                        </div>
                      </div>

                      {/* Delivery Address */}
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{order.delivery_address}, {order.thana && `${order.thana}, `}{order.district}, {order.division}</span>
                      </div>

                      {/* Order Items */}
                      {order.items && order.items.length > 0 && (
                        <div className="bg-muted/30 rounded-lg p-3">
                          <p className="text-xs font-medium text-muted-foreground mb-2">Order Items</p>
                          <div className="space-y-1">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between text-sm">
                                <span>
                                  {item.product_name} {item.weight && `(${item.weight})`} x{item.quantity}
                                </span>
                                <span className="font-medium tabular-nums">
                                  {BANGLADESHI_CURRENCY_SYMBOL}{item.price * item.quantity}
                                </span>
                              </div>
                            ))}
                            {order.delivery_fee > 0 && (
                              <div className="flex justify-between text-sm text-muted-foreground pt-1 border-t mt-2">
                                <span>Delivery Fee</span>
                                <span className="tabular-nums">{BANGLADESHI_CURRENCY_SYMBOL}{order.delivery_fee}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Rejection Reason */}
                      {order.rejection_reason && (
                        <div className="bg-destructive/10 rounded-lg p-3 text-sm">
                          <p className="text-xs font-medium text-destructive mb-1">Rejection Reason</p>
                          <p className="text-destructive">{order.rejection_reason}</p>
                        </div>
                      )}

                      {/* Action Buttons */}
                      {(order.status === 'pending' || order.status === 'confirmed' || order.status === 'dispatched') && (
                        <div className="flex gap-2 pt-2">
                          {order.status === 'pending' && (
                            <>
                              <Button 
                                size="sm" 
                                onClick={() => updateOrderStatus(order.id, 'confirmed')}
                                className="flex-1 h-10"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Confirm
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => {
                                  setSelectedOrderId(order.id);
                                  setRejectDialogOpen(true);
                                }}
                                className="h-10"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Reject
                              </Button>
                            </>
                          )}
                          {order.status === 'confirmed' && (
                            <Button 
                              size="sm"
                              onClick={() => updateOrderStatus(order.id, 'dispatched')}
                              className="flex-1 h-10"
                            >
                              <Truck className="h-4 w-4 mr-2" />
                              Mark Dispatched
                            </Button>
                          )}
                          {order.status === 'dispatched' && (
                            <Button 
                              size="sm"
                              variant="default"
                              onClick={() => updateOrderStatus(order.id, 'delivered')}
                              className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-700"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Mark Delivered
                            </Button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Order</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this order. The customer will be notified.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="e.g., Out of stock, Delivery area not covered, etc."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            className="min-h-[100px]"
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectionReason.trim()}>
              Reject Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
