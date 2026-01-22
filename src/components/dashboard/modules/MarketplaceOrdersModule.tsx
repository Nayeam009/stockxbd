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
import { useLanguage } from "@/contexts/LanguageContext";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
import { logger } from "@/lib/logger";
import { 
  ShoppingBag, Package, Clock, CheckCircle, Truck, XCircle, 
  Search, RefreshCw, Phone, MapPin, Calendar, ExternalLink,
  Store, TrendingUp, AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

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

export const MarketplaceOrdersModule = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<CommunityOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [shopId, setShopId] = useState<string | null>(null);
  const [hasShop, setHasShop] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Fetch shop and orders
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Get current user's shop
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setHasShop(false);
        setLoading(false);
        return;
      }

      const { data: shopData, error: shopError } = await supabase
        .from('shop_profiles')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (shopError || !shopData) {
        setHasShop(false);
        setLoading(false);
        return;
      }

      setShopId(shopData.id);
      setHasShop(true);

      // Fetch orders for this shop
      const { data: ordersData, error: ordersError } = await supabase
        .from('community_orders')
        .select('*')
        .eq('shop_id', shopData.id)
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
      logger.error('Error fetching marketplace orders:', error);
      toast({
        title: "Error",
        description: "Failed to fetch orders",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Real-time subscription
  useEffect(() => {
    fetchData();

    // Subscribe to new orders
    if (shopId) {
      const channel = supabase
        .channel('marketplace-orders')
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
        description: `Order status updated to ${newStatus}`,
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
      .filter(o => o.status === 'delivered' && new Date(o.delivered_at!).toDateString() === new Date().toDateString())
      .reduce((sum, o) => sum + o.total_amount, 0),
    todayOrders: orders.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString()).length
  }), [orders]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-warning/15 text-warning border-warning/30';
      case 'confirmed': return 'bg-primary/15 text-primary border-primary/30';
      case 'preparing': return 'bg-secondary/15 text-secondary-foreground border-secondary/30';
      case 'dispatched': return 'bg-info/15 text-info border-info/30';
      case 'delivered': return 'bg-success/15 text-success border-success/30';
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

  // No shop profile created
  if (hasShop === false) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Marketplace Orders</h1>
            <p className="text-muted-foreground">Manage orders from your online shop</p>
          </div>
        </div>

        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Store className="h-16 w-16 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Shop Profile</h3>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              Create your shop profile to start receiving orders from the LPG Community marketplace.
            </p>
            <Button onClick={() => navigate('/dashboard')} className="gap-2">
              <ExternalLink className="h-4 w-4" />
              Go to Settings → Shop Profile
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-primary" />
            Marketplace Orders
          </h1>
          <p className="text-sm text-muted-foreground">Manage orders from your LPG Community shop</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => navigate('/community')} className="gap-2">
            <ExternalLink className="h-4 w-4" />
            View Shop
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3 sm:p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-warning/15 flex items-center justify-center">
              <Clock className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{analytics.pending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center">
              <Truck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{analytics.dispatched}</p>
              <p className="text-xs text-muted-foreground">Dispatched</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-success/15 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{analytics.delivered}</p>
              <p className="text-xs text-muted-foreground">Delivered</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-success/15 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{BANGLADESHI_CURRENCY_SYMBOL}{analytics.todayRevenue}</p>
              <p className="text-xs text-muted-foreground">Today's Revenue</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by order number, customer name, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full sm:w-auto overflow-x-auto">
          <TabsTrigger value="all">All ({analytics.total})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({analytics.pending})</TabsTrigger>
          <TabsTrigger value="confirmed">Confirmed ({analytics.confirmed})</TabsTrigger>
          <TabsTrigger value="dispatched">Dispatched ({analytics.dispatched})</TabsTrigger>
          <TabsTrigger value="delivered">Delivered ({analytics.delivered})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {filteredOrders.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-muted-foreground/40 mb-4" />
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
            <div className="space-y-3">
              {filteredOrders.map((order) => (
                <Card key={order.id} className="overflow-hidden">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          #{order.order_number}
                          <Badge className={`text-xs ${getStatusColor(order.status)}`}>
                            {getStatusIcon(order.status)}
                            <span className="ml-1 capitalize">{order.status}</span>
                          </Badge>
                        </CardTitle>
                        <CardDescription className="text-xs mt-1 flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(order.created_at), 'dd MMM yyyy, hh:mm a')}
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-primary">
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
                      <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>
                        {order.delivery_address}, {order.thana && `${order.thana}, `}{order.district}, {order.division}
                      </span>
                    </div>

                    {/* Order Items */}
                    {order.items && order.items.length > 0 && (
                      <div className="bg-muted/30 rounded-lg p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Order Items</p>
                        <div className="space-y-1">
                          {order.items.map((item) => (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span>
                                {item.product_name} {item.weight && `(${item.weight})`} × {item.quantity}
                              </span>
                              <span className="font-medium">
                                {BANGLADESHI_CURRENCY_SYMBOL}{item.price * item.quantity}
                              </span>
                            </div>
                          ))}
                          {order.items.some(i => i.return_cylinder_qty > 0) && (
                            <div className="pt-2 mt-2 border-t border-border/50">
                              <p className="text-xs text-muted-foreground">
                                🔄 Customer returning: {order.items.filter(i => i.return_cylinder_qty > 0).map(i => 
                                  `${i.return_cylinder_qty} ${i.return_cylinder_type} cylinder(s)`
                                ).join(', ')}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Order Notes */}
                    {order.order_notes && (
                      <div className="flex items-start gap-2 text-sm bg-warning/10 p-2 rounded-lg">
                        <AlertCircle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                        <span className="text-warning">{order.order_notes}</span>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {order.status === 'pending' && (
                        <>
                          <Button 
                            size="sm" 
                            onClick={() => updateOrderStatus(order.id, 'confirmed')}
                            className="gap-1"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Confirm
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => {
                              setSelectedOrderId(order.id);
                              setRejectDialogOpen(true);
                            }}
                            className="gap-1"
                          >
                            <XCircle className="h-4 w-4" />
                            Reject
                          </Button>
                        </>
                      )}
                      {order.status === 'confirmed' && (
                        <Button 
                          size="sm" 
                          onClick={() => updateOrderStatus(order.id, 'dispatched')}
                          className="gap-1"
                        >
                          <Truck className="h-4 w-4" />
                          Dispatch
                        </Button>
                      )}
                      {order.status === 'dispatched' && (
                        <Button 
                          size="sm" 
                          onClick={() => updateOrderStatus(order.id, 'delivered')}
                          className="gap-1 bg-success hover:bg-success/90"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Mark Delivered
                        </Button>
                      )}
                      {(order.status === 'rejected' || order.status === 'cancelled') && order.rejection_reason && (
                        <Badge variant="outline" className="text-destructive">
                          Reason: {order.rejection_reason}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Rejection Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Order</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this order. This will be visible to the customer.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="e.g., Out of stock, Delivery area not serviceable..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={!rejectionReason.trim()}
            >
              Reject Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
