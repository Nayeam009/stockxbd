import { Check, Clock, Package, Truck, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";

interface OrderTimelineProps {
  status: 'pending' | 'confirmed' | 'preparing' | 'dispatched' | 'delivered' | 'cancelled' | 'rejected';
  createdAt: string;
  confirmedAt?: string | null;
  dispatchedAt?: string | null;
  deliveredAt?: string | null;
  rejectionReason?: string | null;
}

interface TimelineStep {
  key: string;
  label: string;
  icon: React.ReactNode;
  timestamp?: string | null;
  completed: boolean;
  current: boolean;
  failed?: boolean;
}

export const OrderTimeline = ({
  status,
  createdAt,
  confirmedAt,
  dispatchedAt,
  deliveredAt,
  rejectionReason
}: OrderTimelineProps) => {
  const isRejectedOrCancelled = status === 'rejected' || status === 'cancelled';

  const getSteps = (): TimelineStep[] => {
    const statusOrder = ['pending', 'confirmed', 'preparing', 'dispatched', 'delivered'];
    const currentIndex = statusOrder.indexOf(status);

    const steps: TimelineStep[] = [
      {
        key: 'pending',
        label: 'Order Placed',
        icon: <Clock className="h-4 w-4" />,
        timestamp: createdAt,
        completed: currentIndex >= 0 || isRejectedOrCancelled,
        current: status === 'pending'
      },
      {
        key: 'confirmed',
        label: 'Confirmed',
        icon: <Check className="h-4 w-4" />,
        timestamp: confirmedAt,
        completed: currentIndex >= 1,
        current: status === 'confirmed',
        failed: isRejectedOrCancelled
      },
      {
        key: 'preparing',
        label: 'Preparing',
        icon: <Package className="h-4 w-4" />,
        completed: currentIndex >= 2,
        current: status === 'preparing'
      },
      {
        key: 'dispatched',
        label: 'Dispatched',
        icon: <Truck className="h-4 w-4" />,
        timestamp: dispatchedAt,
        completed: currentIndex >= 3,
        current: status === 'dispatched'
      },
      {
        key: 'delivered',
        label: 'Delivered',
        icon: <CheckCircle className="h-4 w-4" />,
        timestamp: deliveredAt,
        completed: currentIndex >= 4,
        current: status === 'delivered'
      }
    ];

    // If rejected/cancelled, show error state
    if (isRejectedOrCancelled) {
      return [
        steps[0], // Order placed is always complete
        {
          key: 'failed',
          label: status === 'rejected' ? 'Rejected' : 'Cancelled',
          icon: <XCircle className="h-4 w-4" />,
          completed: true,
          current: true,
          failed: true
        }
      ];
    }

    return steps;
  };

  const steps = getSteps();

  return (
    <div className="space-y-4">
      <div className="relative">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          
          return (
            <div key={step.key} className="flex items-start gap-3 relative">
              {/* Connector Line */}
              {!isLast && (
                <div 
                  className={`absolute left-[15px] top-8 w-0.5 h-[calc(100%-8px)] ${
                    step.completed && !step.failed ? 'bg-primary' : 'bg-border'
                  }`}
                />
              )}
              
              {/* Icon Circle */}
              <div 
                className={`relative z-10 flex items-center justify-center h-8 w-8 rounded-full shrink-0 transition-colors ${
                  step.failed
                    ? 'bg-destructive text-destructive-foreground'
                    : step.completed 
                      ? 'bg-primary text-primary-foreground' 
                      : step.current
                        ? 'bg-primary/20 text-primary border-2 border-primary'
                        : 'bg-muted text-muted-foreground'
                }`}
              >
                {step.icon}
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0 pb-6">
                <p className={`font-medium text-sm ${
                  step.failed 
                    ? 'text-destructive' 
                    : step.completed || step.current 
                      ? 'text-foreground' 
                      : 'text-muted-foreground'
                }`}>
                  {step.label}
                </p>
                {step.timestamp && (
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(step.timestamp), 'dd MMM yyyy, hh:mm a')}
                  </p>
                )}
                {step.failed && rejectionReason && (
                  <p className="text-xs text-destructive mt-1">
                    Reason: {rejectionReason}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
