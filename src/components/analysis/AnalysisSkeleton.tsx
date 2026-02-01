import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export const AnalysisSkeleton = () => (
  <div className="space-y-4 sm:space-y-6 animate-pulse">
    {/* Header */}
    <div className="flex items-center gap-3">
      <Skeleton className="h-12 w-12 rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
    </div>
    
    {/* Mode Toggle */}
    <div className="flex justify-center">
      <Skeleton className="h-12 w-72 rounded-xl" />
    </div>
    
    {/* Time Selector */}
    <div className="flex justify-center">
      <Skeleton className="h-12 w-96 rounded-xl" />
    </div>
    
    {/* KPI Grid */}
    <div className="grid grid-cols-3 gap-2 sm:gap-4">
      {[...Array(3)].map((_, i) => (
        <Card key={i} className="relative overflow-hidden border-0 shadow-lg">
          <div className="absolute top-0 left-0 right-0 h-1 bg-muted" />
          <CardContent className="p-4 sm:p-5">
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-3 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
    
    {/* Chart Tabs */}
    <Skeleton className="h-10 w-full rounded-lg" />
    
    {/* Chart Area */}
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[240px] w-full rounded-lg" />
      </CardContent>
    </Card>
    
    {/* Top Items Grid */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {[...Array(2)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-28" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

export default AnalysisSkeleton;
