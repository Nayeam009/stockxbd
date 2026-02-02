/**
 * High-fidelity Skeleton for Search Results
 * Matches the exact structure of GlobalSearchCard results
 */

import { Skeleton } from "@/components/ui/skeleton";

interface SearchResultsSkeletonProps {
  count?: number;
}

export const SearchResultsSkeleton = ({ count = 5 }: SearchResultsSkeletonProps) => {
  return (
    <div className="space-y-2 animate-in fade-in-50 duration-200">
      {Array.from({ length: count }).map((_, i) => (
        <SearchResultItemSkeleton key={i} />
      ))}
    </div>
  );
};

const SearchResultItemSkeleton = () => (
  <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
    {/* Icon */}
    <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
    
    {/* Content */}
    <div className="flex-1 min-w-0 space-y-1.5">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
    
    {/* Badge */}
    <Skeleton className="h-5 w-14 rounded-full shrink-0" />
  </div>
);

export const SearchInputSkeleton = () => (
  <div className="flex flex-col sm:flex-row gap-2">
    <Skeleton className="h-11 flex-1 rounded-lg" />
    <Skeleton className="h-11 w-full sm:w-[140px] rounded-lg" />
  </div>
);

export default SearchResultsSkeleton;
