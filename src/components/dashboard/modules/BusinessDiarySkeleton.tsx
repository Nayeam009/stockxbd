import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export const BusinessDiarySkeleton = () => {
  return (
    <div className="space-y-4 sm:space-y-6 pb-4 animate-pulse">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-0">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-6 sm:h-8 w-40" />
            <Skeleton className="h-3 sm:h-4 w-52" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-11 w-[150px] rounded-lg" />
          <Skeleton className="h-11 w-11 rounded-lg" />
        </div>
      </div>

      {/* Summary cards skeleton */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="relative overflow-hidden border-0 shadow-lg">
            <div className="h-1 bg-muted" />
            <CardContent className="p-3 sm:p-5">
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Skeleton className="h-6 w-6 sm:h-7 sm:w-7 rounded-lg" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-6 sm:h-8 w-24" />
                <Skeleton className="h-3 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search bar skeleton */}
      <Skeleton className="h-12 w-full rounded-xl" />

      {/* Tabs skeleton */}
      <div className="bg-muted/50 p-1.5 rounded-xl border border-border/50">
        <div className="grid grid-cols-2 gap-1">
          <Skeleton className="h-12 rounded-lg" />
          <Skeleton className="h-12 rounded-lg" />
        </div>
      </div>

      {/* Entry cards skeleton */}
      <div className="space-y-3 mt-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
                <div className="text-right space-y-2">
                  <Skeleton className="h-5 w-20 ml-auto" />
                  <Skeleton className="h-5 w-16 ml-auto rounded-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
