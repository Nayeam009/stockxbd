/**
 * Marketplace Orders Module (Refactored)
 * Main coordinator component - reduced from 1091 to ~150 lines
 */

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Package, ShoppingBag, RefreshCw, ExternalLink, Store } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { InvoiceDialog } from "@/components/invoice/InvoiceDialog";
import { ModuleLoadErrorCard } from "@/components/shared/ModuleLoadErrorCard";
import { SoftRefreshBadge } from "@/components/shared/SoftRefreshBadge";
import { PremiumModuleHeader } from "@/components/shared/PremiumModuleHeader";
import { EmptyStateCard } from "@/components/shared/EmptyStateCard";

// Refactored imports
import {
  useMarketplaceOrders,
  useOrderActions,
  OrderStatsGrid,
  OrderFilters,
  MarketplaceOrderCard,
  RejectOrderDialog,
  VerifyReturnDialog,
  type CommunityOrder,
  type InvoiceData
} from "./marketplace-orders";

export const MarketplaceOrdersModule = () => {
  const navigate = useNavigate();
  
  // Data hook
  const {
    orders,
    hasShop,
    shopProfile,
    analytics,
    initialLoading,
    softLoading,
    loadError,
    fetchData
  } = useMarketplaceOrders();

  // Actions hook
  const {
    processingOrderId,
    convertOnlineOrderToPOS,
    updateOrderStatus
  } = useOrderActions({ orders, onOrderUpdated: () => fetchData(true) });

  // UI State
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState<CommunityOrder | null>(null);
  const [posTransactionNumber, setPosTransactionNumber] = useState<string>("");
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [selectedOrderForVerify, setSelectedOrderForVerify] = useState<CommunityOrder | null>(null);
  const [verifyReturnType, setVerifyReturnType] = useState<'empty' | 'leaked'>('empty');

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

  // Handlers
  const handleAcceptAndPrint = async (order: CommunityOrder) => {
    try {
      const txnNumber = await convertOnlineOrderToPOS(order);
      setPosTransactionNumber(txnNumber);
      await updateOrderStatus(order.id, 'confirmed');
      setSelectedOrderForInvoice(order);
      setInvoiceDialogOpen(true);
    } catch (error) {
      console.error('Error accepting order:', error);
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

  const handleVerifyReturn = async () => {
    if (!selectedOrderForVerify) return;
    
    for (const item of selectedOrderForVerify.items || []) {
      if (item.return_cylinder_qty > 0) {
        await supabase
          .from('community_order_items')
          .update({ return_cylinder_type: verifyReturnType })
          .eq('id', item.id);
      }
    }

    await updateOrderStatus(selectedOrderForVerify.id, 'delivered');
    setVerifyDialogOpen(false);
    setSelectedOrderForVerify(null);
    setVerifyReturnType('empty');
  };

  const prepareInvoiceData = (order: CommunityOrder): InvoiceData => ({
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

  // No shop state
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

  // Error state
  if (loadError && orders.length === 0) {
    return (
      <ModuleLoadErrorCard
        title="Failed to Load Orders"
        message={loadError}
        onRetry={() => fetchData()}
        isTimeout={loadError.includes('timeout') || loadError.includes('long')}
      />
    );
  }

  // Loading skeleton
  if (initialLoading && orders.length === 0) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
        <Skeleton className="h-12 w-full rounded-lg" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <SoftRefreshBadge isRefreshing={softLoading} />

      {/* Premium Header */}
      <PremiumModuleHeader
        title="Marketplace Orders"
        subtitle="Manage orders from your LPG Community shop"
        icon={<ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />}
        onRefresh={() => fetchData(true)}
        actions={
          <Button
            size="sm"
            onClick={() => navigate('/community')}
            className="h-11 gap-2 touch-manipulation"
          >
            <ExternalLink className="h-4 w-4" />
            View Shop
          </Button>
        }
      />

      <OrderStatsGrid analytics={analytics} />

      <OrderFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        analytics={analytics}
      >
        {filteredOrders.length === 0 ? (
          <EmptyStateCard
            icon={<Package className="h-8 w-8" />}
            title="No Orders Found"
            subtitle={activeTab === 'all'
              ? "You haven't received any orders yet. Share your shop with customers!"
              : `No ${activeTab} orders at the moment.`}
            colorScheme="muted"
          />
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order) => (
              <MarketplaceOrderCard
                key={order.id}
                order={order}
                processingOrderId={processingOrderId}
                onAcceptAndPrint={handleAcceptAndPrint}
                onReject={(id) => { setSelectedOrderId(id); setRejectDialogOpen(true); }}
                onDispatch={(id) => updateOrderStatus(id, 'dispatched')}
                onVerifyReturn={(order) => { setSelectedOrderForVerify(order); setVerifyDialogOpen(true); }}
                onPrintMemo={(order) => { setSelectedOrderForInvoice(order); setInvoiceDialogOpen(true); }}
              />
            ))}
          </div>
        )}
      </OrderFilters>

      {/* Dialogs */}
      <RejectOrderDialog
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        rejectionReason={rejectionReason}
        onReasonChange={setRejectionReason}
        onConfirm={handleReject}
      />

      <VerifyReturnDialog
        open={verifyDialogOpen}
        onOpenChange={setVerifyDialogOpen}
        order={selectedOrderForVerify}
        returnType={verifyReturnType}
        onReturnTypeChange={setVerifyReturnType}
        onConfirm={handleVerifyReturn}
      />

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
    </div>
  );
};
