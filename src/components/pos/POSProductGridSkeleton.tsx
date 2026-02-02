/**
 * High-fidelity Skeleton for POS Product Grid
 * Matches the exact structure of POSProductCard grid
 */

import { Skeleton } from "@/components/ui/skeleton";

interface POSProductGridSkeletonProps {
  count?: number;
  columns?: 2 | 3 | 4 | 5;
}

export const POSProductGridSkeleton = ({ 
  count = 10, 
  columns = 4 
}: POSProductGridSkeletonProps) => {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
  };

  return (
    <div className="space-y-3 animate-in fade-in-50 duration-200">
      {/* Category Header */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-5 rounded-full" />
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-8 rounded-full" />
      </div>
      
      {/* Product Grid */}
      <div className={`grid ${gridCols[columns]} gap-2`}>
        {Array.from({ length: count }).map((_, i) => (
          <POSProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
};

const POSProductCardSkeleton = () => (
  <div className="border rounded-lg p-3 space-y-2 bg-card">
    {/* Header with color tag and badge */}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Skeleton className="h-3 w-3 rounded-full" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-5 w-8 rounded-full" />
    </div>
    
    {/* Weight/Size info */}
    <div className="flex gap-1">
      <Skeleton className="h-4 w-12 rounded" />
      <Skeleton className="h-4 w-10 rounded" />
    </div>
    
    {/* Price */}
    <Skeleton className="h-5 w-16" />
    
    {/* Quantity controls */}
    <div className="flex items-center justify-between pt-1">
      <Skeleton className="h-7 w-7 rounded" />
      <Skeleton className="h-5 w-6" />
      <Skeleton className="h-7 w-7 rounded" />
    </div>
  </div>
);

export const POSQuickStatsSkeleton = () => (
  <div className="grid grid-cols-3 gap-2 animate-in fade-in-50 duration-200">
    {[1, 2, 3].map((i) => (
      <div key={i} className="bg-card rounded-lg p-3 border">
        <div className="flex items-center gap-2 mb-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-6 w-20" />
      </div>
    ))}
  </div>
);

export default POSProductGridSkeleton;
