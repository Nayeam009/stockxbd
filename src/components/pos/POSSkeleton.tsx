import { Skeleton } from "@/components/ui/skeleton";

export const POSSkeleton = () => {
  return (
    <div className="space-y-3 animate-in fade-in-50 duration-300">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-6 w-20" />
        </div>
        <div className="flex gap-1.5">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </div>

      {/* Stats Bar Skeleton */}
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>

      {/* Mobile Toggle Skeleton */}
      <div className="lg:hidden">
        <Skeleton className="h-12 rounded-lg" />
      </div>

      {/* Tables Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Skeleton className="h-[180px] rounded-lg" />
        <Skeleton className="h-[180px] rounded-lg hidden lg:block" />
      </div>

      {/* Control Bar Skeleton */}
      <Skeleton className="h-[140px] rounded-lg" />

      {/* Product Grid Skeleton */}
      <Skeleton className="h-6 w-24 mt-2" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-[100px] rounded-lg" />
        ))}
      </div>

      {/* Customer Section Skeleton */}
      <Skeleton className="h-[200px] rounded-lg" />
    </div>
  );
};
