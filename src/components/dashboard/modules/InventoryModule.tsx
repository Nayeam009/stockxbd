import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InventoryStatCard } from "@/components/inventory/InventoryStatCard";
import { InventoryPOBDrawer } from "@/components/inventory/InventoryPOBDrawer";
import { InventorySkeleton } from "@/components/inventory/InventorySkeleton";
import { InventoryQuickStats } from "@/components/inventory/InventoryQuickStats";
import { LPGBrandCard } from "@/components/inventory/LPGBrandCard";
import { StoveCard } from "@/components/inventory/StoveCard";
import { RegulatorCard } from "@/components/inventory/RegulatorCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Search,
  Package,
  AlertTriangle,
  Cylinder,
  ChefHat,
  Wrench,
  Flame,
  Gauge,
  PackagePlus
} from "lucide-react";
import { toast } from "sonner";
import { useInventoryData, WEIGHT_OPTIONS_22MM, WEIGHT_OPTIONS_20MM } from "@/hooks/useInventoryData";
import { cn } from "@/lib/utils";

export const InventoryModule = () => {
  // Main tabs
  const [activeTab, setActiveTab] = useState("lpg");
  
  // POB Drawer State
  const [isPOBOpen, setIsPOBOpen] = useState(false);
  const [pobProductType, setPobProductType] = useState<'lpg' | 'stove' | 'regulator'>('lpg');
  
  // LPG Filters
  const [sizeTab, setSizeTab] = useState<"22mm" | "20mm">("22mm");
  const [selectedWeight, setSelectedWeight] = useState("12kg");
  const [lpgSearchQuery, setLpgSearchQuery] = useState("");
  
  // Stove Filters
  const [stoveSearchQuery, setStoveSearchQuery] = useState("");
  const [filterBurner, setFilterBurner] = useState<string>("all");
  const [showDamagedOnly, setShowDamagedOnly] = useState(false);
  
  // Regulator Filters
  const [regulatorSearchQuery, setRegulatorSearchQuery] = useState("");
  const [regulatorSizeFilter, setRegulatorSizeFilter] = useState<string>("all");
  
  const weightOptions = sizeTab === "22mm" ? WEIGHT_OPTIONS_22MM : WEIGHT_OPTIONS_20MM;

  // Use centralized data hook
  const {
    lpgBrands,
    stoves,
    regulators,
    todayStats,
    lpgTotals,
    stoveTotals,
    regulatorTotals,
    isLoading,
    updateLpgBrand,
    updateStove,
    updateRegulator,
    deleteLpgBrand,
    deleteStove,
    deleteRegulator,
    refetchAll
  } = useInventoryData(sizeTab, selectedWeight);

  // Open POB drawer for specific product type
  const openPOB = (type: 'lpg' | 'stove' | 'regulator') => {
    setPobProductType(type);
    setIsPOBOpen(true);
  };

  // Filtered data
  const filteredLpgBrands = useMemo(() => 
    lpgBrands.filter(b => b.name.toLowerCase().includes(lpgSearchQuery.toLowerCase())),
    [lpgBrands, lpgSearchQuery]
  );
  
  const filteredStoves = useMemo(() => 
    stoves.filter(s => {
      const matchesSearch = s.brand.toLowerCase().includes(stoveSearchQuery.toLowerCase());
      const matchesBurner = filterBurner === "all" || s.burners.toString() === filterBurner;
      const matchesDamaged = !showDamagedOnly || s.is_damaged === true;
      return matchesSearch && matchesBurner && matchesDamaged;
    }),
    [stoves, stoveSearchQuery, filterBurner, showDamagedOnly]
  );
  
  const filteredRegulators = useMemo(() => 
    regulators.filter(r => {
      const matchesSearch = r.brand.toLowerCase().includes(regulatorSearchQuery.toLowerCase());
      const matchesSize = regulatorSizeFilter === "all" || r.type === regulatorSizeFilter;
      return matchesSearch && matchesSize;
    }),
    [regulators, regulatorSearchQuery, regulatorSizeFilter]
  );

  // Handle operations with toast feedback
  const handleUpdateLpg = async (id: string, field: string, value: number) => {
    try {
      await updateLpgBrand(id, field, value);
      toast.success("Updated successfully");
    } catch (error: any) {
      toast.error(error?.message || "Failed to update");
    }
  };

  const handleUpdateStove = async (id: string, value: number) => {
    try {
      await updateStove(id, value);
      toast.success("Updated successfully");
    } catch (error: any) {
      toast.error(error?.message || "Failed to update");
    }
  };

  const handleUpdateRegulator = async (id: string, value: number) => {
    try {
      await updateRegulator(id, value);
      toast.success("Updated successfully");
    } catch (error: any) {
      toast.error(error?.message || "Failed to update");
    }
  };

  const handleDeleteLpg = async (id: string) => {
    try {
      await deleteLpgBrand(id);
      toast.success("Brand removed");
    } catch (error: any) {
      toast.error(error?.message || "Failed to remove brand");
    }
  };

  const handleDeleteStove = async (id: string) => {
    try {
      await deleteStove(id);
      toast.success("Stove removed");
    } catch (error: any) {
      toast.error(error?.message || "Failed to remove stove");
    }
  };

  const handleDeleteRegulator = async (id: string) => {
    try {
      await deleteRegulator(id);
      toast.success("Regulator removed");
    } catch (error: any) {
      toast.error(error?.message || "Failed to remove regulator");
    }
  };

  if (isLoading) {
    return <InventorySkeleton />;
  }

  return (
    <div className="space-y-4 pb-24 md:pb-4">
      {/* Header with Quick Stats */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">Inventory</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">Manage your stock levels</p>
            </div>
          </div>
        </div>
        
        {/* Quick Stats Bar */}
        <InventoryQuickStats stats={todayStats} />
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-3 h-12">
          <TabsTrigger value="lpg" className="text-xs sm:text-sm gap-1.5 h-10">
            <Cylinder className="h-4 w-4" />
            <span className="hidden sm:inline">LPG</span> Cylinders
          </TabsTrigger>
          <TabsTrigger value="stoves" className="text-xs sm:text-sm gap-1.5 h-10">
            <ChefHat className="h-4 w-4" />
            <span className="hidden sm:inline">Gas</span> Stoves
          </TabsTrigger>
          <TabsTrigger value="regulators" className="text-xs sm:text-sm gap-1.5 h-10">
            <Gauge className="h-4 w-4" />
            Regulators
          </TabsTrigger>
        </TabsList>

        {/* LPG Tab */}
        <TabsContent value="lpg" className="space-y-4 mt-4">
          {/* LPG Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <InventoryStatCard icon={Package} label="Package" value={lpgTotals.package} />
            <InventoryStatCard icon={Cylinder} label="Refill" value={lpgTotals.refill} />
            <InventoryStatCard icon={Package} label="Empty" value={lpgTotals.empty} />
            <InventoryStatCard icon={AlertTriangle} label="Problem" value={lpgTotals.problem} tone="danger" />
          </div>

          {/* LPG Filters */}
          <div className="space-y-3">
            {/* Size Tabs */}
            <div className="flex bg-muted/60 rounded-full p-1 w-fit">
              <button
                onClick={() => setSizeTab("22mm")}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-all",
                  sizeTab === "22mm" 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                22mm
              </button>
              <button
                onClick={() => setSizeTab("20mm")}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-all",
                  sizeTab === "20mm" 
                    ? "bg-amber-500 text-white shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                20mm
              </button>
            </div>

            {/* Weight + Search + Buy Button */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex gap-1 overflow-x-auto pb-1 flex-1">
                {weightOptions.map(w => (
                  <Button
                    key={w.value}
                    size="sm"
                    variant={selectedWeight === w.value ? "default" : "outline"}
                    onClick={() => setSelectedWeight(w.value)}
                    className="h-9 px-3 text-xs whitespace-nowrap"
                  >
                    {w.shortLabel}
                  </Button>
                ))}
              </div>
              <Button size="sm" className="gap-1.5 h-9" onClick={() => openPOB('lpg')}>
                <PackagePlus className="h-4 w-4" />
                <span className="hidden sm:inline">Buy/Add</span>
              </Button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search brands..."
                value={lpgSearchQuery}
                onChange={(e) => setLpgSearchQuery(e.target.value)}
                className="pl-10 h-11"
              />
            </div>
          </div>

          {/* LPG Brand Cards */}
          {filteredLpgBrands.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground">
                <Cylinder className="h-12 w-12 mx-auto opacity-30 mb-3" />
                <p className="font-medium">No cylinders found</p>
                <p className="text-sm">Add stock using the Buy/Add button</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLpgBrands.map(brand => (
                <LPGBrandCard
                  key={brand.id}
                  brand={brand}
                  selectedWeight={selectedWeight}
                  onUpdate={handleUpdateLpg}
                  onDelete={handleDeleteLpg}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Stoves Tab */}
        <TabsContent value="stoves" className="space-y-4 mt-4">
          {/* Stove Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <InventoryStatCard icon={ChefHat} label="Total" value={stoveTotals.total} />
            <InventoryStatCard icon={Flame} label="Single" value={stoveTotals.singleBurner} />
            <InventoryStatCard icon={Flame} label="Double" value={stoveTotals.doubleBurner} />
            <InventoryStatCard icon={AlertTriangle} label="Damaged" value={stoveTotals.damaged} tone="danger" />
          </div>

          {/* Stove Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search stoves..."
                value={stoveSearchQuery}
                onChange={(e) => setStoveSearchQuery(e.target.value)}
                className="pl-10 h-11"
              />
            </div>
            <Select value={filterBurner} onValueChange={setFilterBurner}>
              <SelectTrigger className="w-[120px] h-11">
                <SelectValue placeholder="Burners" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="1">Single</SelectItem>
                <SelectItem value="2">Double</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Switch id="damaged" checked={showDamagedOnly} onCheckedChange={setShowDamagedOnly} />
              <Label htmlFor="damaged" className="text-xs">Damaged</Label>
            </div>
            <Button size="sm" className="gap-1.5 h-11" onClick={() => openPOB('stove')}>
              <PackagePlus className="h-4 w-4" />
              Buy/Add
            </Button>
          </div>

          {/* Stove Cards */}
          {filteredStoves.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground">
                <ChefHat className="h-12 w-12 mx-auto opacity-30 mb-3" />
                <p className="font-medium">No stoves found</p>
                <p className="text-sm">Add stock using the Buy/Add button</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStoves.map(stove => (
                <StoveCard
                  key={stove.id}
                  stove={stove}
                  onUpdate={handleUpdateStove}
                  onDelete={handleDeleteStove}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Regulators Tab */}
        <TabsContent value="regulators" className="space-y-4 mt-4">
          {/* Regulator Stats */}
          <div className="grid grid-cols-3 gap-2">
            <InventoryStatCard icon={Gauge} label="Total" value={regulatorTotals.total} />
            <InventoryStatCard icon={Gauge} label="22mm" value={regulatorTotals.size22mm} />
            <InventoryStatCard icon={Gauge} label="20mm" value={regulatorTotals.size20mm} />
          </div>

          {/* Regulator Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search regulators..."
                value={regulatorSearchQuery}
                onChange={(e) => setRegulatorSearchQuery(e.target.value)}
                className="pl-10 h-11"
              />
            </div>
            <Select value={regulatorSizeFilter} onValueChange={setRegulatorSizeFilter}>
              <SelectTrigger className="w-[120px] h-11">
                <SelectValue placeholder="Size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="22mm">22mm</SelectItem>
                <SelectItem value="20mm">20mm</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" className="gap-1.5 h-11" onClick={() => openPOB('regulator')}>
              <PackagePlus className="h-4 w-4" />
              Buy/Add
            </Button>
          </div>

          {/* Regulator Cards */}
          {filteredRegulators.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground">
                <Gauge className="h-12 w-12 mx-auto opacity-30 mb-3" />
                <p className="font-medium">No regulators found</p>
                <p className="text-sm">Add stock using the Buy/Add button</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRegulators.map(regulator => (
                <RegulatorCard
                  key={regulator.id}
                  regulator={regulator}
                  onUpdate={handleUpdateRegulator}
                  onDelete={handleDeleteRegulator}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* POB Drawer */}
      <InventoryPOBDrawer
        open={isPOBOpen}
        onOpenChange={setIsPOBOpen}
        productType={pobProductType}
        onPurchaseComplete={refetchAll}
      />
    </div>
  );
};
