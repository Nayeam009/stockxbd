import { Skeleton } from "@/components/ui/skeleton";

export const InventorySkeleton = () => (
  <div className="space-y-4 animate-pulse p-4">
    {/* Header Skeleton */}
    <div className="flex items-center gap-3">
      <Skeleton className="h-12 w-12 rounded-2xl" />
      <div className="space-y-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>
    </div>
    
    {/* Tabs Skeleton */}
    <div className="flex gap-2">
      {[1, 2, 3].map(i => (
        <Skeleton key={i} className="h-10 w-24 rounded-lg" />
      ))}
    </div>
    
    {/* Stats Grid Skeleton */}
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {[1, 2, 3, 4].map(i => (
        <Skeleton key={i} className="h-20 rounded-lg" />
      ))}
    </div>
    
    {/* Filter Bar Skeleton */}
    <div className="flex gap-2">
      <Skeleton className="h-10 flex-1 rounded-lg" />
      <Skeleton className="h-10 w-24 rounded-lg" />
    </div>
    
    {/* Product Cards Skeleton */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-5 w-24" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <div className="flex gap-1.5">
            <Skeleton className="h-5 w-12 rounded" />
            <Skeleton className="h-5 w-12 rounded" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-14 rounded-md" />
            <Skeleton className="h-14 rounded-md" />
            <Skeleton className="h-14 rounded-md" />
            <Skeleton className="h-14 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  </div>
);
