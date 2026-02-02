/**
 * High-fidelity Skeleton for Notification Center
 * Matches the exact structure of UniversalNotificationCenter
 */

import { Skeleton } from "@/components/ui/skeleton";

export const NotificationCenterSkeleton = () => {
  return (
    <div className="w-full animate-in fade-in-50 duration-200">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between p-3 md:p-4 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 md:h-5 md:w-5" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-12" />
        </div>
        <div className="flex gap-1">
          <Skeleton className="h-7 w-7 md:h-8 md:w-8 rounded" />
          <Skeleton className="h-7 w-16 md:h-8 md:w-20 rounded" />
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="px-2 py-2 border-b">
        <div className="h-9 md:h-10 bg-muted/50 rounded-md p-1 grid grid-cols-5 gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-full rounded-sm" />
          ))}
        </div>
      </div>

      {/* Notification Items Skeleton */}
      <div className="divide-y divide-border">
        {[1, 2, 3, 4, 5].map((i) => (
          <NotificationItemSkeleton key={i} />
        ))}
      </div>
    </div>
  );
};

const NotificationItemSkeleton = () => (
  <div className="p-3 md:p-4">
    <div className="flex gap-2 md:gap-3">
      {/* Icon */}
      <Skeleton className="h-8 w-8 md:h-9 md:w-9 rounded-full shrink-0" />
      
      <div className="flex-1 min-w-0 space-y-2">
        {/* Badge row */}
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-4 w-16 rounded-full" />
          <Skeleton className="h-1.5 w-1.5 md:h-2 md:w-2 rounded-full" />
        </div>
        
        {/* Title */}
        <Skeleton className="h-4 w-3/4" />
        
        {/* Message */}
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
        
        {/* Footer */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </div>
  </div>
);

export default NotificationCenterSkeleton;
