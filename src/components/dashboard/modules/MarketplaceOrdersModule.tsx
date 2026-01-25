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
import { InvoiceDialog } from "@/components/invoice/InvoiceDialog";
import { 
  ShoppingBag, Package, Clock, CheckCircle, Truck, XCircle, 
  Search, RefreshCw, Phone, MapPin, Calendar, ExternalLink,
  Store, TrendingUp, AlertCircle, Printer, RotateCcw, ImageIcon,
  ZoomIn, ShieldCheck, Cylinder
} from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import {
  Dialog as ZoomDialog,
  DialogContent as ZoomDialogContent,
  DialogHeader as ZoomDialogHeader,
  DialogTitle as ZoomDialogTitle,
  DialogTrigger as ZoomDialogTrigger,
} from "@/components/ui/dialog";
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
  // New fields
  payment_trx_id?: string;
  return_cylinder_verified?: boolean;
  verified_at?: string;
  customer_cylinder_photo?: string | null;
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
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState<CommunityOrder | null>(null);
  const [posTransactionNumber, setPosTransactionNumber] = useState<string>("");
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);
  const [shopProfile, setShopProfile] = useState<{ name: string; phone: string; address: string } | null>(null);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [selectedOrderForVerify, setSelectedOrderForVerify] = useState<CommunityOrder | null>(null);
  const [verifyReturnType, setVerifyReturnType] = useState<'empty' | 'leaked'>('empty');

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
        .select('id, shop_name, phone, address')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (shopError || !shopData) {
        setHasShop(false);
        setLoading(false);
        return;
      }

      setShopId(shopData.id);
      setHasShop(true);
      setShopProfile({
        name: shopData.shop_name || 'My LPG Shop',
        phone: shopData.phone || '',
        address: shopData.address || ''
      });

      // Fetch orders for this shop
      const { data: ordersData, error: ordersError } = await supabase
        .from('community_orders')
        .select('*')
        .eq('shop_id', shopData.id)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Fetch order items and customer cylinder photos for each order
      const ordersWithItems = await Promise.all(
        (ordersData || []).map(async (order) => {
          const { data: items } = await supabase
            .from('community_order_items')
            .select('*')
            .eq('order_id', order.id);
          
          // Fetch customer cylinder photo
          const { data: cylinderProfile } = await supabase
            .from('customer_cylinder_profiles')
            .select('cylinder_photo_url')
            .eq('user_id', order.customer_id)
            .maybeSingle();

          return { 
            ...order, 
            items: items || [],
            customer_cylinder_photo: cylinderProfile?.cylinder_photo_url || null
          } as CommunityOrder;
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

  // Convert online order to POS transaction
  const convertOnlineOrderToPOS = async (order: CommunityOrder): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // 1. Find or create customer by phone
    let customerId: string | null = null;
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('phone', order.customer_phone)
      .maybeSingle();

    if (existingCustomer) {
      customerId = existingCustomer.id;
    } else {
      const { data: newCustomer } = await supabase
        .from('customers')
        .insert({
          name: order.customer_name,
          phone: order.customer_phone,
          address: `${order.delivery_address}, ${order.thana || ''}, ${order.district}, ${order.division}`,
          created_by: user.id
        })
        .select()
        .single();
      customerId = newCustomer?.id || null;
    }

    // 2. Generate transaction number
    const { data: txnNumber, error: rpcError } = await supabase.rpc('generate_transaction_number');
    if (rpcError) throw rpcError;

    // 3. Create POS transaction (linked to community order)
    const { data: transaction, error: txnError } = await supabase
      .from('pos_transactions')
      .insert({
        transaction_number: txnNumber,
        customer_id: customerId,
        subtotal: order.subtotal,
        discount: 0,
        total: order.total_amount,
        payment_method: order.payment_method === 'cod' ? 'cash' : order.payment_method,
        payment_status: 'pending',
        community_order_id: order.id,
        is_online_order: true,
        created_by: user.id
      } as any)
      .select()
      .single();

    if (txnError) throw txnError;

    // 4. Create transaction items from order items
    for (const item of order.items || []) {
      const productName = `${item.brand_name || item.product_name} ${item.weight || ''} (${item.product_type === 'lpg_refill' ? 'Refill' : item.product_type === 'lpg_package' ? 'Package' : item.product_type})`;
      
      // Generate a placeholder product_id (use the item id or create a unique one)
      const productId = crypto.randomUUID();
      
      await supabase.from('pos_transaction_items').insert({
        transaction_id: transaction.id,
        product_id: productId,
        product_name: productName,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity
      });
    }

    return txnNumber;
  };

  // Update LPG stock
  const updateLPGStock = async (brandName: string, weight: string, quantityChange: number, cylinderType: 'lpg_refill' | 'lpg_package') => {
    const { data: brand } = await supabase
      .from('lpg_brands')
      .select('id, refill_cylinder, package_cylinder')
      .ilike('name', `%${brandName}%`)
      .eq('weight', weight)
      .maybeSingle();

    if (brand) {
      const field = cylinderType === 'lpg_refill' ? 'refill_cylinder' : 'package_cylinder';
      const currentValue = (brand as any)[field] || 0;
      const newValue = Math.max(0, currentValue + quantityChange);
      await supabase.from('lpg_brands').update({ [field]: newValue }).eq('id', brand.id);
    }
  };

  // Update empty/problem cylinder stock
  const updateEmptyCylinderStock = async (brandName: string, weight: string, quantity: number, type: 'empty' | 'leaked') => {
    const { data: brand } = await supabase
      .from('lpg_brands')
      .select('id, empty_cylinder, problem_cylinder')
      .ilike('name', `%${brandName}%`)
      .eq('weight', weight)
      .maybeSingle();

    if (brand) {
      const field = type === 'leaked' ? 'problem_cylinder' : 'empty_cylinder';
      const currentValue = (brand as any)[field] || 0;
      await supabase.from('lpg_brands').update({ [field]: currentValue + quantity }).eq('id', brand.id);
    }
  };

  // Update order status with inventory sync
  const updateOrderStatus = async (orderId: string, newStatus: CommunityOrder['status'], reason?: string) => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      const updateData: Record<string, any> = { 
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      if (newStatus === 'confirmed') updateData.confirmed_at = new Date().toISOString();
      if (newStatus === 'dispatched') updateData.dispatched_at = new Date().toISOString();
      
      if (newStatus === 'delivered') {
        updateData.delivered_at = new Date().toISOString();
        updateData.payment_status = 'paid';
        updateData.return_cylinder_verified = true;
        updateData.verified_at = new Date().toISOString();

        // Get current user for verified_by
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          updateData.verified_by = user.id;
        }

        // 1. Update inventory for each item
        for (const item of order.items || []) {
          if (item.product_type === 'lpg_refill' || item.product_type === 'lpg_package') {
            // Decrease refill/package stock
            await updateLPGStock(
              item.brand_name || '',
              item.weight || '',
              -item.quantity,
              item.product_type as 'lpg_refill' | 'lpg_package'
            );
            
            // Increase empty/problem cylinder if returned
            if (item.return_cylinder_qty > 0 && item.return_cylinder_type) {
              await updateEmptyCylinderStock(
                item.brand_name || '',
                item.weight || '',
                item.return_cylinder_qty,
                item.return_cylinder_type
              );
            }
          }
        }
      }
      
      if (newStatus === 'rejected' && reason) updateData.rejection_reason = reason;

      const { error } = await supabase
        .from('community_orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: newStatus === 'delivered' ? "✅ Order Delivered!" : "Status Updated",
        description: newStatus === 'delivered' 
          ? "Inventory updated. Payment marked as complete."
          : `Order status: ${newStatus}`
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

  // Handle Accept & Print Memo
  const handleAcceptAndPrint = async (order: CommunityOrder) => {
    setProcessingOrderId(order.id);
    try {
      // Create POS transaction
      const txnNumber = await convertOnlineOrderToPOS(order);
      setPosTransactionNumber(txnNumber);
      
      // Update order status
      await updateOrderStatus(order.id, 'confirmed');
      
      // Show invoice dialog
      setSelectedOrderForInvoice(order);
      setInvoiceDialogOpen(true);
      
      toast({
        title: "✅ Order Confirmed",
        description: `POS Transaction: ${txnNumber}. Print memo for driver.`
      });
    } catch (error) {
      logger.error('Error accepting order:', error);
      toast({
        title: "Error",
        description: "Failed to confirm order",
        variant: "destructive"
      });
    } finally {
      setProcessingOrderId(null);
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

  // Handle verify return - updates return type and marks as delivered
  const handleVerifyReturn = async () => {
    if (!selectedOrderForVerify) return;
    
    // Update return cylinder type in order items if needed
    for (const item of selectedOrderForVerify.items || []) {
      if (item.return_cylinder_qty > 0) {
        await supabase
          .from('community_order_items')
          .update({ return_cylinder_type: verifyReturnType })
          .eq('id', item.id);
      }
    }
    
    // Mark as delivered (this triggers inventory update)
    await updateOrderStatus(selectedOrderForVerify.id, 'delivered');
    
    setVerifyDialogOpen(false);
    setSelectedOrderForVerify(null);
    setVerifyReturnType('empty');
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

  // Prepare invoice data
  const prepareInvoiceData = (order: CommunityOrder) => ({
    invoiceNumber: posTransactionNumber || order.order_number,
    date: new Date(),
    customer: {
      name: order.customer_name,
      phone: order.customer_phone,
      address: `${order.delivery_address}, ${order.thana || ''}, ${order.district}, ${order.division}`
    },
    items: (order.items || []).map(item => ({
      name: `${item.brand_name || item.product_name} ${item.weight || ''} (${item.product_type === 'lpg_refill' ? 'Refill' : item.product_type === 'lpg_package' ? 'Package' : item.product_type})`,
      description: item.return_cylinder_qty > 0 ? `Return: ${item.return_cylinder_qty} ${item.return_cylinder_type} cylinder(s)` : undefined,
      quantity: item.quantity,
      price: item.price,
      total: item.price * item.quantity
    })),
    subtotal: order.subtotal,
    discount: 0,
    total: order.total_amount,
    paymentMethod: order.payment_method,
    paymentStatus: 'pending'
  });

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
                                {item.brand_name || item.product_name} {item.weight && `(${item.weight})`} × {item.quantity}
                              </span>
                              <span className="font-medium">
                                {BANGLADESHI_CURRENCY_SYMBOL}{item.price * item.quantity}
                              </span>
                            </div>
                          ))}
                          {order.items.some(i => i.return_cylinder_qty > 0) && (
                            <div className="pt-2 mt-2 border-t border-border/50">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <RotateCcw className="h-3 w-3" />
                                Customer returning: {order.items.filter(i => i.return_cylinder_qty > 0).map(i => 
                                  `${i.return_cylinder_qty} ${i.return_cylinder_type} cylinder(s)`
                                ).join(', ')}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Customer Cylinder Photo (for verification) */}
                    {order.customer_cylinder_photo && order.status === 'pending' && (
                      <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-medium flex items-center gap-1">
                            <Cylinder className="h-3 w-3 text-primary" />
                            Customer's Cylinder Photo
                          </p>
                          <Badge variant="secondary" className="text-xs">For Verification</Badge>
                        </div>
                        <div className="flex items-start gap-3">
                          <ZoomDialog>
                            <ZoomDialogTrigger asChild>
                              <div className="relative w-16 h-16 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity border">
                                <img 
                                  src={order.customer_cylinder_photo} 
                                  alt="Customer cylinder" 
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                  <ZoomIn className="h-4 w-4 text-white" />
                                </div>
                              </div>
                            </ZoomDialogTrigger>
                            <ZoomDialogContent className="max-w-lg p-2">
                              <ZoomDialogHeader className="sr-only">
                                <ZoomDialogTitle>Customer Cylinder Photo</ZoomDialogTitle>
                              </ZoomDialogHeader>
                              <img 
                                src={order.customer_cylinder_photo} 
                                alt="Customer cylinder full view" 
                                className="w-full h-auto rounded-lg"
                              />
                            </ZoomDialogContent>
                          </ZoomDialog>
                          <div className="text-xs text-muted-foreground">
                            <p>Tap to zoom. Check if cylinder:</p>
                            <ul className="mt-1 space-y-0.5">
                              <li>• Is the correct brand</li>
                              <li>• Is not rusted/damaged</li>
                              <li>• Has valid company markings</li>
                            </ul>
                          </div>
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
                            onClick={() => handleAcceptAndPrint(order)}
                            disabled={processingOrderId === order.id}
                            className="gap-1 h-10 px-4"
                          >
                            {processingOrderId === order.id ? (
                              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Printer className="h-4 w-4" />
                            )}
                            Accept & Print Memo
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => {
                              setSelectedOrderId(order.id);
                              setRejectDialogOpen(true);
                            }}
                            className="gap-1 h-10"
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
                          className="gap-1 h-10"
                        >
                          <Truck className="h-4 w-4" />
                          Dispatch
                        </Button>
                      )}
                      {order.status === 'dispatched' && (
                        <Button 
                          size="sm" 
                          onClick={() => {
                            setSelectedOrderForVerify(order);
                            setVerifyDialogOpen(true);
                          }}
                          className="gap-1 h-10 bg-success hover:bg-success/90"
                        >
                          <ShieldCheck className="h-4 w-4" />
                          Verify Empty Return
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

      {/* Invoice Dialog */}
      {selectedOrderForInvoice && (
        <InvoiceDialog
          open={invoiceDialogOpen}
          onOpenChange={setInvoiceDialogOpen}
          invoiceData={prepareInvoiceData(selectedOrderForInvoice)}
          businessName={shopProfile?.name}
          businessPhone={shopProfile?.phone}
          businessAddress={shopProfile?.address}
        />
      )}

      {/* Verify Return Dialog */}
      <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-success" />
              Verify Empty Cylinder Return
            </DialogTitle>
            <DialogDescription>
              Confirm the driver has returned with the empty cylinder from the customer.
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrderForVerify && (
            <div className="space-y-4 py-2">
              {/* Order summary */}
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="font-medium text-sm">Order #{selectedOrderForVerify.order_number}</p>
                <p className="text-sm text-muted-foreground">{selectedOrderForVerify.customer_name}</p>
              </div>

              {/* Return items */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Return Cylinders:</p>
                {(selectedOrderForVerify.items || []).filter(i => i.return_cylinder_qty > 0).map(item => (
                  <div key={item.id} className="flex items-center justify-between p-2 border rounded-lg">
                    <span className="text-sm">
                      {item.brand_name} {item.weight} × {item.return_cylinder_qty}
                    </span>
                  </div>
                ))}
              </div>

              {/* Cylinder condition */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Cylinder Condition:</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={verifyReturnType === 'empty' ? 'default' : 'outline'}
                    className="h-12"
                    onClick={() => setVerifyReturnType('empty')}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Empty (Good)
                  </Button>
                  <Button
                    type="button"
                    variant={verifyReturnType === 'leaked' ? 'destructive' : 'outline'}
                    className="h-12"
                    onClick={() => setVerifyReturnType('leaked')}
                  >
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Leaked/Problem
                  </Button>
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  <strong>⚠️ Important:</strong> Inventory will be updated only after you confirm. 
                  This ensures accurate stock tracking.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setVerifyDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleVerifyReturn}
              className="bg-success hover:bg-success/90"
            >
              <ShieldCheck className="h-4 w-4 mr-2" />
              Confirm & Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};