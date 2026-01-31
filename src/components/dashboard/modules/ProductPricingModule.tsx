import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Save,
  Search,
  Package,
  ChefHat,
  Wrench,
  Loader2,
  RefreshCw,
  Flame
} from "lucide-react";

// Hook & Components
import { useProductPricingData, WEIGHT_OPTIONS_22MM, WEIGHT_OPTIONS_20MM } from "@/hooks/useProductPricingData";
import { LPGBrandPriceCard } from "@/components/pricing/LPGBrandPriceCard";
import { AccessoryPriceCard } from "@/components/pricing/AccessoryPriceCard";
import { ProductPricingQuickStats } from "@/components/pricing/ProductPricingQuickStats";
import { AddProductDialog } from "@/components/pricing/AddProductDialog";
import { PricingModuleSkeleton } from "@/components/pricing/PricingModuleSkeleton";
import { ModuleLoadErrorCard } from "@/components/shared/ModuleLoadErrorCard";
import { SoftRefreshBadge } from "@/components/shared/SoftRefreshBadge";
import { PremiumModuleHeader } from "@/components/shared/PremiumModuleHeader";
import { EmptyStateCard } from "@/components/shared/EmptyStateCard";

export const ProductPricingModule = () => {
  // State
  const [activeTab, setActiveTab] = useState("lpg");
  const [sizeTab, setSizeTab] = useState<"22mm" | "20mm">("22mm");
  const [selectedWeight, setSelectedWeight] = useState("12kg");
  const [searchQuery, setSearchQuery] = useState("");

  // Data hook
  const {
    products,
    lpgProducts,
    stoveProducts,
    regulatorProducts,
    lpgBrands,
    stats,
    initialLoading,
    softLoading,
    loadError,
    editedPrices,
    hasChanges,
    pendingCount,
    isSaving,
    handlePriceChange,
    getValue,
    saveChanges,
    addProduct,
    deleteProduct,
    refetch,
    getGroupedBrands,
    getProductsForBrandGroup,
  } = useProductPricingData();

  // Weight options based on valve size
  const weightOptions = sizeTab === "22mm" ? WEIGHT_OPTIONS_22MM : WEIGHT_OPTIONS_20MM;

  // Grouped brands for current filter
  const groupedBrands = useMemo(() => 
    getGroupedBrands(sizeTab, selectedWeight),
    [getGroupedBrands, sizeTab, selectedWeight]
  );

  // Filtered accessory products
  const filteredStoves = useMemo(() =>
    stoveProducts.filter(p => 
      p.product_name.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [stoveProducts, searchQuery]
  );

  const filteredRegulators = useMemo(() =>
    regulatorProducts.filter(p => 
      p.product_name.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [regulatorProducts, searchQuery]
  );

  // Filtered LPG brands
  const filteredBrands = useMemo(() =>
    groupedBrands.filter(brand =>
      brand.name.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [groupedBrands, searchQuery]
  );

  // Loading state
  if (initialLoading) {
    return <PricingModuleSkeleton />;
  }

  // Error state
  if (loadError && products.length === 0) {
    return (
      <div className="p-4 sm:p-6">
        <ModuleLoadErrorCard
          title="Product Pricing"
          message={loadError}
          onRetry={refetch}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 pb-24 sm:pb-6">
      {/* Soft loading indicator */}
      <SoftRefreshBadge isRefreshing={softLoading} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PremiumModuleHeader
          icon={<Flame className="h-6 w-6" />}
          title="Product Pricing"
          subtitle="Manage prices for all products. Changes sync across modules."
        />
        
        <div className="flex items-center gap-2 sm:gap-3">
          <AddProductDialog
            lpgBrands={lpgBrands}
            onAddProduct={addProduct}
          />
          
          {/* Save Button - Sticky on mobile */}
          <div className="fixed bottom-20 right-4 z-50 sm:relative sm:bottom-auto sm:right-auto sm:z-auto">
            <Button
              onClick={saveChanges}
              disabled={!hasChanges || isSaving}
              className="h-12 sm:h-9 rounded-full sm:rounded-lg shadow-lg sm:shadow-none gap-2 px-5 sm:px-4"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span className="sm:inline">
                Save {pendingCount > 0 && `(${pendingCount})`}
              </span>
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <ProductPricingQuickStats stats={stats} />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-3 h-11">
          <TabsTrigger value="lpg" className="gap-1.5 text-xs sm:text-sm h-9">
            <Package className="h-4 w-4" />
            <span>LPG</span>
            <span className="hidden sm:inline text-muted-foreground">({stats.lpgCount})</span>
          </TabsTrigger>
          <TabsTrigger value="stove" className="gap-1.5 text-xs sm:text-sm h-9">
            <ChefHat className="h-4 w-4" />
            <span>Stoves</span>
            <span className="hidden sm:inline text-muted-foreground">({stats.stoveCount})</span>
          </TabsTrigger>
          <TabsTrigger value="regulator" className="gap-1.5 text-xs sm:text-sm h-9">
            <Wrench className="h-4 w-4" />
            <span>Regulators</span>
            <span className="hidden sm:inline text-muted-foreground">({stats.regulatorCount})</span>
          </TabsTrigger>
        </TabsList>

        {/* LPG Tab */}
        <TabsContent value="lpg" className="space-y-4 mt-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Valve Size Toggle */}
            <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
              <Button
                variant={sizeTab === "22mm" ? "default" : "ghost"}
                size="sm"
                onClick={() => {
                  setSizeTab("22mm");
                  setSelectedWeight("12kg");
                }}
                className="h-9 px-4"
              >
                22mm
              </Button>
              <Button
                variant={sizeTab === "20mm" ? "default" : "ghost"}
                size="sm"
                onClick={() => {
                  setSizeTab("20mm");
                  setSelectedWeight("12kg");
                }}
                className="h-9 px-4"
              >
                20mm
              </Button>
            </div>

            {/* Weight Selector */}
            <Select value={selectedWeight} onValueChange={setSelectedWeight}>
              <SelectTrigger className="w-32 h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {weightOptions.map(w => (
                  <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search brands..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10"
              />
            </div>

            {/* Refresh */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              disabled={softLoading}
              className="h-10 w-10"
            >
              <RefreshCw className={`h-4 w-4 ${softLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* LPG Cards Grid */}
          {filteredBrands.length === 0 ? (
            <EmptyStateCard
              icon={<Package className="h-10 w-10" />}
              title="No LPG prices found"
              subtitle={searchQuery 
                ? `No brands match "${searchQuery}"`
                : `No pricing set for ${selectedWeight} ${sizeTab} cylinders`
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
              {filteredBrands.map(brand => {
                const brandProducts = getProductsForBrandGroup(brand.brandIds, searchQuery);
                const refillProduct = brandProducts.find(p => p.variant === 'Refill') || null;
                const packageProduct = brandProducts.find(p => p.variant === 'Package') || null;

                return (
                  <LPGBrandPriceCard
                    key={brand.name}
                    brand={brand}
                    refillProduct={refillProduct}
                    packageProduct={packageProduct}
                    editedPrices={editedPrices}
                    onPriceChange={handlePriceChange}
                    onDelete={deleteProduct}
                    getValue={getValue}
                    valveSize={sizeTab}
                    selectedWeight={selectedWeight}
                  />
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Stoves Tab */}
        <TabsContent value="stove" className="space-y-4 mt-4">
          {/* Search */}
          <div className="flex gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search stoves..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              disabled={softLoading}
              className="h-10 w-10"
            >
              <RefreshCw className={`h-4 w-4 ${softLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Stove Cards Grid */}
          {filteredStoves.length === 0 ? (
            <EmptyStateCard
              icon={<ChefHat className="h-10 w-10" />}
              title="No stove prices found"
              subtitle={searchQuery ? `No stoves match "${searchQuery}"` : "Add your first stove pricing"}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
              {filteredStoves.map(product => (
                <AccessoryPriceCard
                  key={product.id}
                  product={product}
                  editedPrices={editedPrices}
                  onPriceChange={handlePriceChange}
                  onDelete={deleteProduct}
                  getValue={getValue}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Regulators Tab */}
        <TabsContent value="regulator" className="space-y-4 mt-4">
          {/* Search */}
          <div className="flex gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search regulators..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              disabled={softLoading}
              className="h-10 w-10"
            >
              <RefreshCw className={`h-4 w-4 ${softLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Regulator Cards Grid */}
          {filteredRegulators.length === 0 ? (
            <EmptyStateCard
              icon={<Wrench className="h-10 w-10" />}
              title="No regulator prices found"
              subtitle={searchQuery ? `No regulators match "${searchQuery}"` : "Add your first regulator pricing"}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
              {filteredRegulators.map(product => (
                <AccessoryPriceCard
                  key={product.id}
                  product={product}
                  editedPrices={editedPrices}
                  onPriceChange={handlePriceChange}
                  onDelete={deleteProduct}
                  getValue={getValue}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
