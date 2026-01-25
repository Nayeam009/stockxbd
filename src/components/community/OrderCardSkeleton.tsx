import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const OrderCardSkeleton = () => {
  return (
    <Card className="overflow-hidden border-border bg-card">
      {/* Status color bar */}
      <div className="h-1 bg-muted" />
      
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-5 w-28" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        
        {/* Visual Timeline */}
        <div className="flex items-center gap-1 py-2">
          {[1, 2, 3, 4].map((_, index) => (
            <div key={index} className="flex items-center flex-1">
              <Skeleton className="w-3 h-3 rounded-full flex-shrink-0" />
              {index < 3 && (
                <Skeleton className="flex-1 h-0.5 mx-1" />
              )}
            </div>
          ))}
        </div>

        {/* Shop Info */}
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>

        {/* Order Details */}
        <div className="pt-2 border-t border-border space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-32" />
          </div>
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-5 w-20" />
          </div>
        </div>

        {/* Actions */}
        <div className="pt-2">
          <Skeleton className="h-11 w-full rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
};

export const OrderCardSkeletonList = ({ count = 3 }: { count?: number }) => {
  return (
    <div className="grid gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <OrderCardSkeleton key={i} />
      ))}
    </div>
  );
};
