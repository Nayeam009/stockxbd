import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  Package,
  Clock,
  CheckCircle2,
  Loader2,
  RefreshCcw
} from "lucide-react";
import { CommunityHeader } from "@/components/community/CommunityHeader";
import { CommunityBottomNav } from "@/components/community/CommunityBottomNav";
import { OrderCard } from "@/components/community/OrderCard";
import { useCommunityData, CommunityOrder } from "@/hooks/useCommunityData";

const CustomerOrders = () => {
  const navigate = useNavigate();
  const { fetchCustomerOrders, currentUser, userRole } = useCommunityData();
  
  const [orders, setOrders] = useState<CommunityOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  const loadOrders = async () => {
    setLoading(true);
    const data = await fetchCustomerOrders();
    setOrders(data);
    setLoading(false);
  };

  useEffect(() => {
    loadOrders();
  }, []);

  // Filter orders by tab
  const filteredOrders = orders.filter(order => {
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

  // Count by status
  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const activeCount = orders.filter(o => ['confirmed', 'preparing', 'dispatched'].includes(o.status)).length;
  const completedCount = orders.filter(o => o.status === 'delivered').length;
  const cancelledCount = orders.filter(o => ['cancelled', 'rejected'].includes(o.status)).length;

  return (
    <div className="min-h-screen bg-background pb-20 sm:pb-0">
      <CommunityHeader 
        userRole={userRole}
        userName={currentUser?.email}
        onCartClick={() => navigate('/community/cart')}
      />

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/community')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">My Orders</h1>
              <p className="text-muted-foreground">{orders.length} total orders</p>
            </div>
          </div>
          <Button variant="outline" size="icon" onClick={loadOrders} disabled={loading}>
            <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="all">
              All ({orders.length})
            </TabsTrigger>
            <TabsTrigger value="pending" className="data-[state=active]:text-amber-600">
              <Clock className="h-4 w-4 mr-1 hidden sm:inline" />
              Pending ({pendingCount})
            </TabsTrigger>
            <TabsTrigger value="active" className="data-[state=active]:text-blue-600">
              <Package className="h-4 w-4 mr-1 hidden sm:inline" />
              Active ({activeCount})
            </TabsTrigger>
            <TabsTrigger value="completed" className="data-[state=active]:text-emerald-600">
              <CheckCircle2 className="h-4 w-4 mr-1 hidden sm:inline" />
              Done ({completedCount})
            </TabsTrigger>
            <TabsTrigger value="cancelled" className="data-[state=active]:text-red-600">
              Cancelled ({cancelledCount})
            </TabsTrigger>
          </TabsList>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-12 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-2">No orders found</h3>
                <p className="text-muted-foreground mb-4">
                  {activeTab === 'all' 
                    ? "You haven't placed any orders yet"
                    : `No ${activeTab} orders`
                  }
                </p>
                <Button onClick={() => navigate('/community')}>
                  Browse Shops
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredOrders.map(order => (
                <OrderCard 
                  key={order.id} 
                  order={order}
                  onViewDetails={() => {}}
                />
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
