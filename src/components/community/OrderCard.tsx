import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Clock, 
  CheckCircle2, 
  Truck, 
  Package, 
  XCircle,
  ChevronRight,
  MapPin,
  Phone
} from "lucide-react";
import { CommunityOrder } from "@/hooks/useCommunityData";
import { format } from "date-fns";

interface OrderCardProps {
  order: CommunityOrder;
  onViewDetails?: (order: CommunityOrder) => void;
  onUpdateStatus?: (orderId: string, status: CommunityOrder['status']) => void;
  isShopOwner?: boolean;
}

export const OrderCard = ({ order, onViewDetails, onUpdateStatus, isShopOwner }: OrderCardProps) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return { 
          color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', 
          icon: Clock, 
          label: 'Pending' 
        };
      case 'confirmed':
        return { 
          color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', 
          icon: CheckCircle2, 
          label: 'Confirmed' 
        };
      case 'preparing':
        return { 
          color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', 
          icon: Package, 
          label: 'Preparing' 
        };
      case 'dispatched':
        return { 
          color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400', 
          icon: Truck, 
          label: 'On the way' 
        };
      case 'delivered':
        return { 
          color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', 
          icon: CheckCircle2, 
          label: 'Delivered' 
        };
      case 'cancelled':
      case 'rejected':
        return { 
          color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', 
          icon: XCircle, 
          label: status === 'rejected' ? 'Rejected' : 'Cancelled' 
        };
      default:
        return { 
          color: 'bg-muted text-muted-foreground', 
          icon: Clock, 
          label: status 
        };
    }
  };

  const statusConfig = getStatusConfig(order.status);
  const StatusIcon = statusConfig.icon;

  // Status timeline for visual progress
  const getStatusProgress = () => {
    const stages = ['pending', 'confirmed', 'dispatched', 'delivered'];
    const currentIndex = stages.indexOf(order.status);
    return { stages, currentIndex };
  };

  const { stages, currentIndex } = getStatusProgress();
  const showTimeline = !['cancelled', 'rejected'].includes(order.status);

  return (
    <Card className="overflow-hidden border-border bg-card hover:shadow-md transition-shadow">
      {/* Status color bar at top */}
      <div className={`h-1 ${statusConfig.color.replace('text-', 'bg-').split(' ')[0]}`} aria-hidden="true" />
      
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Order</p>
            <p className="font-mono font-semibold text-foreground tabular-nums">{order.order_number}</p>
          </div>
          <Badge className={`${statusConfig.color} border-0`}>
            <StatusIcon className="h-3 w-3 mr-1" aria-hidden="true" />
            {statusConfig.label}
          </Badge>
        </div>
        
        {/* Visual Timeline */}
        {showTimeline && (
          <div className="flex items-center gap-1 py-2" aria-label={`Order progress: ${statusConfig.label}`}>
            {stages.map((stage, index) => (
              <div key={stage} className="flex items-center flex-1">
                <div 
                  className={`w-3 h-3 rounded-full flex-shrink-0 transition-colors ${
                    index <= currentIndex 
                      ? 'bg-primary' 
                      : 'bg-muted'
                  }`}
                  aria-hidden="true"
                />
                {index < stages.length - 1 && (
                  <div 
                    className={`flex-1 h-0.5 mx-1 transition-colors ${
                      index < currentIndex 
                        ? 'bg-primary' 
                        : 'bg-muted'
                    }`}
                    aria-hidden="true"
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Shop or Customer Info */}
        {isShopOwner ? (
          <div className="space-y-1">
            <p className="font-medium text-foreground">{order.customer_name}</p>
            <div className="flex items-center text-sm text-muted-foreground">
              <Phone className="h-3 w-3 mr-1" />
              {order.customer_phone}
            </div>
            <div className="flex items-start text-sm text-muted-foreground">
              <MapPin className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0" />
              <span className="line-clamp-2">{order.delivery_address}</span>
            </div>
          </div>
        ) : order.shop && (
          <div className="flex items-center gap-3">
            {order.shop.logo_url ? (
              <img 
                src={order.shop.logo_url} 
                alt={order.shop.shop_name}
                className="w-10 h-10 rounded-lg object-cover border border-border"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                <span className="text-sm font-bold text-primary-foreground">
                  {order.shop.shop_name.charAt(0)}
                </span>
              </div>
            )}
            <div className="flex-1">
              <p className="font-medium text-foreground">{order.shop.shop_name}</p>
              <p className="text-sm text-muted-foreground">{order.shop.district}</p>
            </div>
          </div>
        )}

        {/* Order Details */}
        <div className="pt-2 border-t border-border space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Date</span>
            <span className="text-foreground">{format(new Date(order.created_at), 'MMM d, yyyy h:mm a')}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Payment</span>
            <Badge variant={order.payment_status === 'paid' ? 'default' : 'secondary'}>
              {order.payment_method.toUpperCase()} • {order.payment_status}
            </Badge>
          </div>
          <div className="flex items-center justify-between font-medium">
            <span className="text-foreground">Total</span>
            <span className="text-primary text-lg">৳{order.total_amount.toLocaleString()}</span>
          </div>
        </div>

        {/* Rejection Reason */}
        {order.rejection_reason && (
          <div className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm">
            <p className="text-red-600 dark:text-red-400">
              <strong>Reason:</strong> {order.rejection_reason}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="pt-2 flex gap-2">
          {isShopOwner && order.status === 'pending' && onUpdateStatus && (
            <>
              <Button 
                size="sm" 
                className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 touch-target"
                onClick={() => onUpdateStatus(order.id, 'confirmed')}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" aria-hidden="true" />
                Accept
              </Button>
              <Button 
                size="sm" 
                variant="destructive"
                className="flex-1 h-11 touch-target"
                onClick={() => onUpdateStatus(order.id, 'rejected')}
              >
                <XCircle className="h-4 w-4 mr-1" aria-hidden="true" />
                Reject
              </Button>
            </>
          )}
          
          {isShopOwner && order.status === 'confirmed' && onUpdateStatus && (
            <Button 
              size="sm" 
              className="w-full h-11 touch-target"
              onClick={() => onUpdateStatus(order.id, 'dispatched')}
            >
              <Truck className="h-4 w-4 mr-1" aria-hidden="true" />
              Mark as Dispatched
            </Button>
          )}
          
          {isShopOwner && order.status === 'dispatched' && onUpdateStatus && (
            <Button 
              size="sm" 
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 touch-target"
              onClick={() => onUpdateStatus(order.id, 'delivered')}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" aria-hidden="true" />
              Mark as Delivered
            </Button>
          )}

          {!isShopOwner && onViewDetails && (
            <Button 
              size="sm" 
              variant="outline"
              className="w-full h-11 touch-target"
              onClick={() => onViewDetails(order)}
            >
              View Details
              <ChevronRight className="h-4 w-4 ml-1" aria-hidden="true" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
