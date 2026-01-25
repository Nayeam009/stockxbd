import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const ProfileHeaderSkeleton = () => {
  return (
    <Card className="overflow-hidden border-border">
      {/* Gradient Header */}
      <div className="h-20 sm:h-24 bg-gradient-to-r from-primary/30 via-primary/20 to-primary/10 animate-pulse" />
      
      <CardContent className="pt-0 pb-4 sm:pb-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-3 sm:gap-4 -mt-8 sm:-mt-10">
          {/* Avatar */}
          <Skeleton className="h-16 w-16 sm:h-20 sm:w-20 rounded-full border-4 border-background" />
          
          <div className="flex-1 text-center sm:text-left space-y-2">
            <Skeleton className="h-6 w-40 mx-auto sm:mx-0" />
            <Skeleton className="h-5 w-28 mx-auto sm:mx-0 rounded-full" />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-4 sm:mt-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="text-center p-2 sm:p-3 rounded-xl bg-muted/50 space-y-2">
              <Skeleton className="h-5 w-5 mx-auto rounded" />
              <Skeleton className="h-7 w-12 mx-auto" />
              <Skeleton className="h-3 w-16 mx-auto" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export const ProfileFormSkeleton = () => {
  return (
    <Card className="border-border overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-36" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="grid sm:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-12 w-full rounded-md" />
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-12 w-full rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
};

export const ProfileTabsSkeleton = () => {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Tabs */}
      <Skeleton className="h-12 w-full rounded-md" />
      
      {/* Profile Header */}
      <ProfileHeaderSkeleton />
      
      {/* Form Cards */}
      <ProfileFormSkeleton />
      <ProfileFormSkeleton />
      
      {/* Save Button */}
      <Skeleton className="h-12 w-full rounded-md" />
    </div>
  );
};

export const CylinderCardSkeleton = () => {
  return (
    <Card className="border-border overflow-hidden">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start gap-4">
          {/* Cylinder Icon */}
          <Skeleton className="w-16 h-20 sm:w-20 sm:h-24 rounded-xl" />
          
          <div className="flex-1 space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-32" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-14 rounded-full" />
            </div>
            
            <Skeleton className="h-9 w-28 rounded-md" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
