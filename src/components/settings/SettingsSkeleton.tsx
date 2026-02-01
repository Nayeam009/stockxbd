/**
 * Settings Module Loading Skeleton
 * Professional loading state matching the Settings layout
 */

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

interface SettingsSkeletonProps {
  isMobile?: boolean;
}

export const SettingsSkeleton = ({ isMobile = false }: SettingsSkeletonProps) => {
  if (isMobile) {
    return (
      <div className="space-y-4 animate-pulse">
        {/* Profile Card Skeleton */}
        <Card className="border-border/50">
          <div className="p-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            </div>
          </div>
        </Card>

        {/* Section Navigation Skeleton */}
        <Card className="border-border/50">
          <CardContent className="p-3 space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-4 rounded-xl">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-5 w-5" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-[340px_1fr] gap-6 animate-pulse">
      {/* Sidebar Skeleton */}
      <div className="space-y-4">
        {/* Profile Card */}
        <Card className="border-border/50">
          <div className="p-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-14 w-14 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-40" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
            </div>
          </div>
        </Card>

        {/* Navigation */}
        <Card className="border-border/50">
          <CardContent className="p-3 space-y-1">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-4 rounded-xl">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-5 w-5" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Content Skeleton */}
      <div className="space-y-6">
        {/* Section Header */}
        <div className="flex items-center gap-3 mb-6">
          <Skeleton className="h-11 w-11 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>

        {/* Content Cards */}
        <Card className="border-border/50">
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 pt-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-11 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-11 w-full" />
              </div>
            </div>
            <Skeleton className="h-11 w-full" />
          </div>
        </Card>

        <Card className="border-border/50">
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
            <div className="space-y-2 pt-4">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-11 w-full" />
            </div>
            <Skeleton className="h-11 w-full" />
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SettingsSkeleton;
