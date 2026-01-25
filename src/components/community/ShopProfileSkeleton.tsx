import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const ShopHeroSkeleton = () => {
  return (
    <>
      {/* Hero Section */}
      <div className="relative h-48 sm:h-64 bg-muted animate-pulse">
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
      </div>

      {/* Shop Info Card */}
      <div className="container mx-auto px-4 -mt-16 relative z-10">
        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              {/* Logo */}
              <Skeleton className="w-20 h-20 rounded-xl border-4 border-background" />

              <div className="flex-1 space-y-3">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="space-y-2">
                    <Skeleton className="h-7 w-48" />
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-20 rounded-full" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-24 rounded-full" />
                </div>

                <Skeleton className="h-4 w-64" />

                <div className="flex items-center gap-4 pt-2">
                  <Skeleton className="h-9 w-20 rounded-md" />
                  <Skeleton className="h-9 w-24 rounded-md" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export const ProductSelectorSkeleton = () => {
  return (
    <Card className="border-border">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filter Tabs */}
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24 rounded-md" />
          <Skeleton className="h-10 w-24 rounded-md" />
          <Skeleton className="h-10 w-24 rounded-md" />
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="w-12 h-12 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-5 w-16" />
              </div>
              <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-24 rounded" />
                <Skeleton className="h-9 w-20 rounded-md" />
              </div>
            </div>
          ))}
        </div>

        {/* Checkout Button */}
        <Skeleton className="h-12 w-full rounded-md" />
      </CardContent>
    </Card>
  );
};

export const ShopProfilePageSkeleton = () => {
  return (
    <div className="min-h-screen bg-background pb-20 sm:pb-0">
      {/* Back Button */}
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Skeleton className="h-10 w-32 rounded-md" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>

      <ShopHeroSkeleton />

      {/* Tabs */}
      <div className="container mx-auto px-4 py-6 space-y-6">
        <Skeleton className="h-10 w-full max-w-sm rounded-md" />
        <ProductSelectorSkeleton />
      </div>
    </div>
  );
};
