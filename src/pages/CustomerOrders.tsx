import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  Package,
  Clock,
  CheckCircle2,
  RefreshCcw,
  XCircle,
  Truck
} from "lucide-react";
import { CommunityHeader } from "@/components/community/CommunityHeader";
import { CommunityBottomNav } from "@/components/community/CommunityBottomNav";
import { OrderCard } from "@/components/community/OrderCard";
import { OrderCardSkeletonList } from "@/components/community/OrderCardSkeleton";
import { useCustomerOrders, useInvalidateCommunity } from "@/hooks/queries/useCommunityQueries";
import { useCommunityData, CommunityOrder } from "@/hooks/useCommunityData";

const CustomerOrders = () => {
  const navigate = useNavigate();
  const { currentUser, userRole } = useCommunityData();
  const [activeTab, setActiveTab] = useState("all");
  
  // Use cached query with batch shop/items fetch (fixes N+1)
  const { 
    data: ordersData = [], 
    isLoading: loading, 
    isFetching,
    refetch 
  } = useCustomerOrders(currentUser?.id);

  // Map to the expected type with proper casting
  const orders = useMemo(() => 
    ordersData.map(o => ({
      ...o,
      thana: o.thana || '',
      delivery_fee: o.delivery_fee || 0,
      order_notes: o.order_notes || '',
      status: o.status as CommunityOrder['status'],
    } as CommunityOrder)), [ordersData]);

  // Memoized filtered orders for better performance
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      switch (activeTab) {
        case 'pending':
          return order.status === 'pending';
        case 'active':
          return ['confirmed', 'preparing', 'dispatched'].includes(order.status);
        case 'completed':
          return order.status === 'delivered';
        case 'cancelled':
          return ['cancelled', 'rejected'].includes(order.status);
        default:
          return true;
      }
    });
  }, [orders, activeTab]);

  // Memoized counts
  const { pendingCount, activeCount, completedCount, cancelledCount } = useMemo(() => ({
    pendingCount: orders.filter(o => o.status === 'pending').length,
    activeCount: orders.filter(o => ['confirmed', 'preparing', 'dispatched'].includes(o.status)).length,
    completedCount: orders.filter(o => o.status === 'delivered').length,
    cancelledCount: orders.filter(o => ['cancelled', 'rejected'].includes(o.status)).length,
  }), [orders]);

  return (
    <div className="min-h-screen bg-background pb-20 sm:pb-0">
      <CommunityHeader 
        userRole={userRole}
        userName={currentUser?.email}
        onCartClick={() => navigate('/community/cart')}
      />

      <main className="container mx-auto px-4 py-4 sm:py-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-10 w-10 touch-target" 
              onClick={() => navigate('/community')}
              aria-label="Go back to marketplace"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">My Orders</h1>
              <p className="text-sm text-muted-foreground tabular-nums">{orders.length} total order{orders.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="icon" 
            className="h-10 w-10 touch-target"
            onClick={() => refetch()} 
            disabled={isFetching}
            aria-label="Refresh orders"
          >
            <RefreshCcw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} aria-hidden="true" />
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <TabsList className="w-full h-auto flex-wrap gap-1 p-1 bg-muted/50">
            <TabsTrigger value="all" className="flex-1 min-w-[60px] h-10 text-xs sm:text-sm data-[state=active]:bg-background">
              All <span className="hidden sm:inline ml-1">({orders.length})</span>
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex-1 min-w-[60px] h-10 text-xs sm:text-sm data-[state=active]:bg-background">
              <Clock className="h-3.5 w-3.5 sm:mr-1" />
              <span className="hidden sm:inline">Pending</span>
              {pendingCount > 0 && <span className="ml-1 text-[10px] bg-muted px-1.5 rounded-full">{pendingCount}</span>}
            </TabsTrigger>
            <TabsTrigger value="active" className="flex-1 min-w-[60px] h-10 text-xs sm:text-sm data-[state=active]:bg-background">
              <Truck className="h-3.5 w-3.5 sm:mr-1" />
              <span className="hidden sm:inline">Active</span>
              {activeCount > 0 && <span className="ml-1 text-[10px] bg-muted px-1.5 rounded-full">{activeCount}</span>}
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex-1 min-w-[60px] h-10 text-xs sm:text-sm data-[state=active]:bg-background">
              <CheckCircle2 className="h-3.5 w-3.5 sm:mr-1" />
              <span className="hidden sm:inline">Done</span>
              {completedCount > 0 && <span className="ml-1 text-[10px] bg-muted px-1.5 rounded-full">{completedCount}</span>}
            </TabsTrigger>
            <TabsTrigger value="cancelled" className="flex-1 min-w-[60px] h-10 text-xs sm:text-sm data-[state=active]:bg-background">
              <XCircle className="h-3.5 w-3.5 sm:mr-1" />
              <span className="hidden sm:inline">Cancelled</span>
              {cancelledCount > 0 && <span className="ml-1 text-[10px] bg-muted px-1.5 rounded-full">{cancelledCount}</span>}
            </TabsTrigger>
          </TabsList>

          {loading ? (
            <OrderCardSkeletonList count={3} />
          ) : filteredOrders.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-8 sm:p-12 text-center">
                <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-muted/50 to-muted/30 flex items-center justify-center mb-4 relative">
                  <Package className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                <h3 className="font-semibold text-lg mb-2">No orders found</h3>
                <p className="text-muted-foreground mb-6 max-w-xs mx-auto">
                  {activeTab === 'all' ? "You haven't placed any orders yet." : `No ${activeTab} orders`}
                </p>
                <Button onClick={() => navigate('/community')} className="h-12 touch-target">Browse Shops</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredOrders.map(order => (
                <OrderCard key={order.id} order={order} onViewDetails={() => {}} />
              ))}
            </div>
          )}
        </Tabs>
      </main>

      <CommunityBottomNav userRole={userRole} />
    </div>
  );
};

export default CustomerOrders;
