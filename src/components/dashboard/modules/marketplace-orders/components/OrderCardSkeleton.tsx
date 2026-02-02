/**
 * High-fidelity Skeleton for Marketplace Order Cards
 * Matches the exact structure of MarketplaceOrderCard
 */

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export const OrderCardSkeleton = () => {
  return (
    <Card className="overflow-hidden animate-in fade-in-50 duration-200">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            {/* Order number and status badge */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            {/* Date */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-3" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          {/* Amount and payment method */}
          <div className="text-right space-y-1">
            <Skeleton className="h-6 w-20 ml-auto" />
            <Skeleton className="h-5 w-16 ml-auto rounded-full" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-2 space-y-3">
        {/* Customer Info */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <Skeleton className="h-4 w-32" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-3" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>

        {/* Delivery Address */}
        <div className="flex items-start gap-2">
          <Skeleton className="h-4 w-4 mt-0.5 shrink-0" />
          <Skeleton className="h-4 w-full max-w-xs" />
        </div>

        {/* Order Items */}
        <div className="bg-muted/30 rounded-lg p-3 space-y-2">
          <Skeleton className="h-3 w-20" />
          <div className="space-y-1">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-14" />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-20" />
        </div>
      </CardContent>
    </Card>
  );
};

export const OrderGridSkeleton = ({ count = 4 }: { count?: number }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <OrderCardSkeleton key={i} />
    ))}
  </div>
);

export default OrderCardSkeleton;
