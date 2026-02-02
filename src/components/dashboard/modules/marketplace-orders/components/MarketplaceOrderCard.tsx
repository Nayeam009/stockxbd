/**
 * Marketplace Order Card Component
 * Individual order display with actions
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
import {
  Clock, CheckCircle, Package, Truck, XCircle,
  Phone, MapPin, Calendar, RotateCcw, Printer,
  Cylinder, ZoomIn, ShieldCheck
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import type { CommunityOrder, OrderStatus } from "../types";

interface MarketplaceOrderCardProps {
  order: CommunityOrder;
  processingOrderId: string | null;
  onAcceptAndPrint: (order: CommunityOrder) => void;
  onReject: (orderId: string) => void;
  onDispatch: (orderId: string) => void;
  onVerifyReturn: (order: CommunityOrder) => void;
  onPrintMemo: (order: CommunityOrder) => void;
}

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

export function MarketplaceOrderCard({
  order,
  processingOrderId,
  onAcceptAndPrint,
  onReject,
  onDispatch,
  onVerifyReturn,
  onPrintMemo
}: MarketplaceOrderCardProps) {
  const isProcessing = processingOrderId === order.id;

  return (
    <Card className="overflow-hidden">
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

        {/* Customer Cylinder Photo */}
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
              <Dialog>
                <DialogTrigger asChild>
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
                </DialogTrigger>
                <DialogContent className="max-w-lg p-2">
                  <DialogHeader className="sr-only">
                    <DialogTitle>Customer Cylinder Photo</DialogTitle>
                  </DialogHeader>
                  <img
                    src={order.customer_cylinder_photo}
                    alt="Customer cylinder full view"
                    className="w-full h-auto rounded-lg"
                  />
                </DialogContent>
              </Dialog>
              <div className="text-xs text-muted-foreground">
                <p>Tap to zoom. Check if cylinder:</p>
                <ul className="mt-1 space-y-0.5">
                  <li>• Is the correct brand</li>
                  <li>• Is not rusted/damaged</li>
                  <li>• Matches return request</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Rejection Reason */}
        {order.status === 'rejected' && order.rejection_reason && (
          <div className="bg-destructive/5 rounded-lg p-3 border border-destructive/20">
            <p className="text-xs text-destructive font-medium">Rejection Reason:</p>
            <p className="text-sm text-muted-foreground">{order.rejection_reason}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-2">
          {order.status === 'pending' && (
            <>
              <Button
                size="sm"
                onClick={() => onAcceptAndPrint(order)}
                disabled={isProcessing}
                className="gap-1"
              >
                {isProcessing ? (
                  <>Processing...</>
                ) : (
                  <>
                    <Printer className="h-4 w-4" />
                    Accept & Print
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onReject(order.id)}
                disabled={isProcessing}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Reject
              </Button>
            </>
          )}

          {order.status === 'confirmed' && (
            <Button
              size="sm"
              onClick={() => onDispatch(order.id)}
              className="gap-1"
            >
              <Truck className="h-4 w-4" />
              Mark Dispatched
            </Button>
          )}

          {order.status === 'dispatched' && (
            <Button
              size="sm"
              onClick={() => onVerifyReturn(order)}
              className="gap-1 bg-success hover:bg-success/90"
            >
              <ShieldCheck className="h-4 w-4" />
              Verify & Deliver
            </Button>
          )}

          {(order.status === 'confirmed' || order.status === 'dispatched') && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onPrintMemo(order)}
              className="gap-1"
            >
              <Printer className="h-4 w-4" />
              Print Memo
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
