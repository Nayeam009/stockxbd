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
  TrendingUp, TestTube, Building2, User, CircleDot
} from "lucide-react";
import { format } from "date-fns";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { PremiumStatCard } from "@/components/shared/PremiumStatCard";

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

// Status color bar gradients
const statusBarColors: Record<string, string> = {
  pending: 'from-amber-500 to-amber-400',
  confirmed: 'from-primary to-primary/80',
  preparing: 'from-blue-400 to-blue-300',
  dispatched: 'from-blue-500 to-blue-400',
  delivered: 'from-emerald-500 to-emerald-400',
  rejected: 'from-destructive to-destructive/80',
  cancelled: 'from-muted-foreground to-muted-foreground/80'
};

// Order Timeline Progress Component
const OrderTimeline = ({ status }: { status: string }) => {
  const steps = ['pending', 'confirmed', 'dispatched', 'delivered'];
  const currentIdx = steps.indexOf(status);
  const isRejected = status === 'rejected' || status === 'cancelled';
  
  if (isRejected) return null;
  
  return (
    <div className="flex items-center gap-1 py-2">
      {steps.map((step, idx) => {
        const isCompleted = currentIdx >= idx;
        const isCurrent = currentIdx === idx;
        
        return (
          <div key={step} className="flex items-center gap-1">
            <div 
              className={`h-2 w-2 rounded-full transition-all ${
                isCompleted 
                  ? isCurrent 
                    ? 'bg-primary ring-2 ring-primary/30' 
                    : 'bg-emerald-500' 
                  : 'bg-muted-foreground/30'
              }`} 
            />
            {idx < steps.length - 1 && (
              <div 
                className={`h-0.5 w-4 sm:w-6 ${
                  currentIdx > idx ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                }`} 
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

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
      case 'pending': return <Clock className="h-3.5 w-3.5" />;
      case 'confirmed': return <CheckCircle className="h-3.5 w-3.5" />;
      case 'preparing': return <Package className="h-3.5 w-3.5" />;
      case 'dispatched': return <Truck className="h-3.5 w-3.5" />;
      case 'delivered': return <CheckCircle className="h-3.5 w-3.5" />;
      case 'rejected': case 'cancelled': return <XCircle className="h-3.5 w-3.5" />;
      default: return <Clock className="h-3.5 w-3.5" />;
    }
  };

  const getOrderTypeBadge = (order: CommunityOrder) => {
    if (order.is_self_order) {
      return (
        <Badge className="bg-purple-500/15 text-purple-600 border-purple-500/30 gap-1 text-[10px] sm:text-xs">
          <TestTube className="h-3 w-3" />
          Test
        </Badge>
      );
    }
    if (order.customer_type === 'wholesale') {
      return (
        <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30 gap-1 text-[10px] sm:text-xs">
          <Building2 className="h-3 w-3" />
          Wholesale
        </Badge>
      );
    }
    return (
      <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 gap-1 text-[10px] sm:text-xs">
        <User className="h-3 w-3" />
        Retail
      </Badge>
    );
  };

  if (!shopId) {
    return (
      <Card className="border-dashed border-2">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="h-16 w-16 rounded-full bg-amber-500/15 flex items-center justify-center mb-4">
            <AlertCircle className="h-8 w-8 text-amber-500" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Create Your Shop First</h3>
          <p className="text-muted-foreground text-center max-w-md text-sm">
            Set up your shop profile in the "Shop Info" tab to start receiving orders from customers
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center space-y-3">
          <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Stats Cards - Premium Design */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <PremiumStatCard
          title="Pending"
          value={analytics.pending}
          subtitle={`${analytics.confirmed} confirmed`}
          icon={<Clock className="h-5 w-5 text-amber-500" />}
          colorScheme="amber"
        />
        <PremiumStatCard
          title="Dispatched"
          value={analytics.dispatched}
          subtitle="In transit"
          icon={<Truck className="h-5 w-5 text-blue-500" />}
          colorScheme="primary"
        />
        <PremiumStatCard
          title="Delivered"
          value={analytics.delivered}
          subtitle="Completed"
          icon={<CheckCircle className="h-5 w-5 text-emerald-500" />}
          colorScheme="emerald"
        />
        <PremiumStatCard
          title="Today's Revenue"
          value={`${BANGLADESHI_CURRENCY_SYMBOL}${analytics.todayRevenue.toLocaleString()}`}
          subtitle={`${analytics.todayOrders} orders today`}
          icon={<TrendingUp className="h-5 w-5 text-emerald-500" />}
          colorScheme="emerald"
        />
      </div>

      {/* Search and Refresh */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search orders by number, name, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 text-base"
          />
        </div>
        <Button variant="outline" onClick={fetchData} className="gap-2 h-11 shrink-0">
          <RefreshCw className="h-4 w-4" />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {/* Tabs - Scrollable on Mobile */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <ScrollArea className="w-full">
          <TabsList className="inline-flex h-11 min-w-full sm:min-w-0 p-1 bg-muted/50">
            <TabsTrigger value="all" className="flex-1 sm:flex-none h-9 px-4 gap-2 data-[state=active]:shadow-sm">
              All
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{analytics.total}</Badge>
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex-1 sm:flex-none h-9 px-4 gap-2 data-[state=active]:shadow-sm">
              Pending
              <Badge className="h-5 px-1.5 text-[10px] bg-amber-500/15 text-amber-600">{analytics.pending}</Badge>
            </TabsTrigger>
            <TabsTrigger value="dispatched" className="flex-1 sm:flex-none h-9 px-4 gap-2 data-[state=active]:shadow-sm">
              Dispatched
              <Badge className="h-5 px-1.5 text-[10px] bg-blue-500/15 text-blue-600">{analytics.dispatched}</Badge>
            </TabsTrigger>
            <TabsTrigger value="delivered" className="flex-1 sm:flex-none h-9 px-4 gap-2 data-[state=active]:shadow-sm">
              Delivered
              <Badge className="h-5 px-1.5 text-[10px] bg-emerald-500/15 text-emerald-600">{analytics.delivered}</Badge>
            </TabsTrigger>
          </TabsList>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <TabsContent value={activeTab} className="mt-4">
          {filteredOrders.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <ShoppingBag className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Orders Found</h3>
                <p className="text-muted-foreground text-center text-sm max-w-md">
                  {activeTab === 'all' 
                    ? "You haven't received any orders yet. Share your shop with customers to get started!"
                    : `No ${activeTab} orders at the moment.`
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[calc(100vh-480px)] min-h-[350px]">
              <div className="space-y-3 pr-2">
                {filteredOrders.map((order) => (
                  <Card key={order.id} className="overflow-hidden border shadow-sm hover:shadow-md transition-shadow">
                    {/* Status Color Bar */}
                    <div className={`h-1.5 bg-gradient-to-r ${statusBarColors[order.status] || 'from-muted to-muted'}`} />
                    
                    <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div className="space-y-2">
                          {/* Order Number & Badges */}
                          <div className="flex flex-wrap items-center gap-2">
                            <CardTitle className="text-sm sm:text-base font-bold">
                              #{order.order_number}
                            </CardTitle>
                            <Badge className={`text-[10px] sm:text-xs ${getStatusColor(order.status)}`}>
                              {getStatusIcon(order.status)}
                              <span className="ml-1 capitalize">{order.status}</span>
                            </Badge>
                            {getOrderTypeBadge(order)}
                          </div>
                          
                          {/* Timeline Progress */}
                          <OrderTimeline status={order.status} />
                          
                          {/* Date */}
                          <CardDescription className="text-xs flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5" />
                            {format(new Date(order.created_at), 'dd MMM yyyy, hh:mm a')}
                          </CardDescription>
                        </div>
                        
                        {/* Price & Payment */}
                        <div className="text-left sm:text-right shrink-0 flex sm:flex-col items-center sm:items-end gap-2 sm:gap-1">
                          <p className="text-lg sm:text-xl font-bold text-primary tabular-nums">
                            {BANGLADESHI_CURRENCY_SYMBOL}{order.total_amount.toLocaleString()}
                          </p>
                          <Badge variant="outline" className="text-[10px] sm:text-xs uppercase">
                            {order.payment_method}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-3 sm:p-4 pt-0 space-y-3">
                      {/* Customer Info - Card Style */}
                      <div className="bg-muted/40 rounded-lg p-3 space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                          <span className="font-semibold text-sm">{order.customer_name}</span>
                          <a 
                            href={`tel:${order.customer_phone}`} 
                            className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                          >
                            <Phone className="h-3.5 w-3.5" />
                            {order.customer_phone}
                          </a>
                        </div>
                        <div className="flex items-start gap-2 text-xs text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          <span>{order.delivery_address}, {order.thana && `${order.thana}, `}{order.district}, {order.division}</span>
                        </div>
                      </div>

                      {/* Order Items */}
                      {order.items && order.items.length > 0 && (
                        <div className="border rounded-lg overflow-hidden">
                          <div className="bg-muted/30 px-3 py-2 border-b">
                            <p className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                              <Package className="h-3.5 w-3.5" />
                              Order Items ({order.items.length})
                            </p>
                          </div>
                          <div className="p-3 space-y-2">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between text-sm">
                                <span className="text-muted-foreground">
                                  {item.product_name} {item.weight && `(${item.weight})`} 
                                  <span className="font-medium text-foreground ml-1">×{item.quantity}</span>
                                </span>
                                <span className="font-semibold tabular-nums">
                                  {BANGLADESHI_CURRENCY_SYMBOL}{(item.price * item.quantity).toLocaleString()}
                                </span>
                              </div>
                            ))}
                            {order.delivery_fee > 0 && (
                              <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t">
                                <span>Delivery Fee</span>
                                <span className="tabular-nums">{BANGLADESHI_CURRENCY_SYMBOL}{order.delivery_fee}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Rejection Reason */}
                      {order.rejection_reason && (
                        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                          <p className="text-xs font-semibold text-destructive mb-1 flex items-center gap-1.5">
                            <XCircle className="h-3.5 w-3.5" />
                            Rejection Reason
                          </p>
                          <p className="text-sm text-destructive">{order.rejection_reason}</p>
                        </div>
                      )}

                      {/* Action Buttons - 48px Height for Mobile */}
                      {(order.status === 'pending' || order.status === 'confirmed' || order.status === 'dispatched') && (
                        <div className="flex gap-2 pt-1">
                          {order.status === 'pending' && (
                            <>
                              <Button 
                                onClick={() => updateOrderStatus(order.id, 'confirmed')}
                                className="flex-1 h-12 text-sm font-semibold gap-2"
                              >
                                <CheckCircle className="h-4 w-4" />
                                Confirm Order
                              </Button>
                              <Button 
                                variant="outline"
                                onClick={() => {
                                  setSelectedOrderId(order.id);
                                  setRejectDialogOpen(true);
                                }}
                                className="h-12 px-4 border-destructive/30 text-destructive hover:bg-destructive/10"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {order.status === 'confirmed' && (
                            <Button 
                              onClick={() => updateOrderStatus(order.id, 'dispatched')}
                              className="flex-1 h-12 text-sm font-semibold gap-2 bg-blue-600 hover:bg-blue-700"
                            >
                              <Truck className="h-4 w-4" />
                              Mark as Dispatched
                            </Button>
                          )}
                          {order.status === 'dispatched' && (
                            <Button 
                              onClick={() => updateOrderStatus(order.id, 'delivered')}
                              className="flex-1 h-12 text-sm font-semibold gap-2 bg-emerald-600 hover:bg-emerald-700"
                            >
                              <CheckCircle className="h-4 w-4" />
                              Mark as Delivered
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
        <DialogContent className="sm:max-w-md">
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
            className="min-h-[100px] text-base"
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)} className="h-11">
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject} 
              disabled={!rejectionReason.trim()}
              className="h-11"
            >
              Reject Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
