import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export const BusinessDiarySkeleton = () => {
  return (
    <div className="space-y-4 sm:space-y-5 pb-4 animate-pulse">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-0">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-5 sm:h-6 w-36" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </div>

      {/* 6-Card Summary Grid skeleton */}
      <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="relative overflow-hidden border-0 shadow-md">
            <div className="h-1 bg-muted" />
            <CardContent className="p-2.5 sm:p-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Skeleton className="h-5 w-5 sm:h-6 sm:w-6 rounded-md" />
                  <Skeleton className="h-2.5 w-12" />
                </div>
                <Skeleton className="h-5 sm:h-6 w-20" />
                <Skeleton className="h-2.5 w-16" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search bar skeleton */}
      <Skeleton className="h-10 w-full rounded-lg" />

      {/* Tabs skeleton */}
      <div className="bg-muted/50 p-1 rounded-lg border border-border/50">
        <div className="grid grid-cols-2 gap-1">
          <Skeleton className="h-11 rounded-md" />
          <Skeleton className="h-11 rounded-md" />
        </div>
      </div>

      {/* Filter buttons skeleton */}
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-8 w-16 rounded-md" />
        ))}
      </div>

      {/* Entry cards skeleton */}
      <div className="space-y-2.5 mt-3">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border-0 shadow-md overflow-hidden">
            <div className="h-1 bg-muted" />
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex-1 space-y-2">
                  <div className="flex gap-1.5">
                    <Skeleton className="h-5 w-12 rounded" />
                    <Skeleton className="h-5 w-10 rounded" />
                  </div>
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <div className="flex gap-2">
                    <Skeleton className="h-4 w-20 rounded" />
                    <Skeleton className="h-4 w-16 rounded" />
                  </div>
                </div>
                <div className="space-y-1.5 text-right">
                  <Skeleton className="h-5 w-14 rounded ml-auto" />
                  <Skeleton className="h-5 w-20 ml-auto" />
                  <Skeleton className="h-5 w-12 rounded ml-auto" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
