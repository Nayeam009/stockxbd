import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const ShopCardSkeleton = () => {
  return (
    <Card className="overflow-hidden border-border bg-card">
      {/* Cover Image Skeleton */}
      <div className="relative h-32 bg-muted">
        <Skeleton className="w-full h-full" />
        
        {/* Status Badges Skeleton */}
        <div className="absolute top-2 left-2 flex gap-1.5">
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>

        {/* Rating Skeleton */}
        <div className="absolute top-2 right-2">
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Shop Name & Logo */}
        <div className="flex items-start gap-3">
          <Skeleton className="w-12 h-12 rounded-lg flex-shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-3">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-9 w-16 rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
};

export const ShopCardSkeletonGrid = ({ count = 6 }: { count?: number }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <ShopCardSkeleton key={i} />
      ))}
    </div>
  );
};
