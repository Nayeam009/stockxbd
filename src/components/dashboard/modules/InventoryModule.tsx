import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InventoryStatCard } from "@/components/inventory/InventoryStatCard";
import { InventoryPOBDrawer } from "@/components/inventory/InventoryPOBDrawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { 
  Search,
  Plus,
  Minus,
  Trash2,
  Package,
  AlertTriangle,
  Loader2,
  Cylinder,
  Truck,
  ChefHat,
  Wrench,
  Flame,
  Gauge,
  PackagePlus
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { getLpgColorByValveSize } from "@/lib/brandConstants";
import { useNetwork } from "@/contexts/NetworkContext";
import { getCombinedCache, setCombinedCache } from "@/hooks/useModuleCache";

// Cache key for Inventory module
const INVENTORY_CACHE_KEY = 'inventory_module_data';

// Interfaces
interface LPGBrand {
  id: string;
  name: string;
  color: string;
  size: string;
  weight: string;
  package_cylinder: number;
  refill_cylinder: number;
  empty_cylinder: number;
  problem_cylinder: number;
  in_transit_cylinder: number;
  is_active: boolean;
}

interface Stove {
  id: string;
  brand: string;
  model: string;
  burners: number;
  quantity: number;
  price: number;
  is_damaged: boolean | null;
  warranty_months: number | null;
}

interface Regulator {
  id: string;
  brand: string;
  type: string;
  quantity: number;
  price: number | null;
  is_defective: boolean | null;
}

// Weight options
const WEIGHT_OPTIONS_22MM = [
  { value: "5.5kg", label: "5.5 KG", shortLabel: "5.5" },
  { value: "12kg", label: "12 KG", shortLabel: "12" },
  { value: "12.5kg", label: "12.5 KG", shortLabel: "12.5" },
  { value: "25kg", label: "25 KG", shortLabel: "25" },
  { value: "35kg", label: "35 KG", shortLabel: "35" },
  { value: "45kg", label: "45 KG", shortLabel: "45" },
];

const WEIGHT_OPTIONS_20MM = [
  { value: "5kg", label: "5 KG", shortLabel: "5" },
  { value: "10kg", label: "10 KG", shortLabel: "10" },
  { value: "12kg", label: "12 KG", shortLabel: "12" },
  { value: "15kg", label: "15 KG", shortLabel: "15" },
  { value: "21kg", label: "21 KG", shortLabel: "21" },
  { value: "35kg", label: "35 KG", shortLabel: "35" },
];

export const InventoryModule = () => {
  const { isOnline } = useNetwork();
  // Main tabs
  const [activeTab, setActiveTab] = useState("lpg");
  const [loading, setLoading] = useState(true);
  
  // POB Drawer State
  const [isPOBOpen, setIsPOBOpen] = useState(false);
  const [pobProductType, setPobProductType] = useState<'lpg' | 'stove' | 'regulator'>('lpg');
  
  // LPG State
  const [sizeTab, setSizeTab] = useState<"22mm" | "20mm">("22mm");
  const [selectedWeight, setSelectedWeight] = useState("12kg");
  const [lpgBrands, setLpgBrands] = useState<LPGBrand[]>([]);
  const [lpgSearchQuery, setLpgSearchQuery] = useState("");
  const [editingCell, setEditingCell] = useState<{id: string, field: string, type: 'lpg' | 'stove' | 'regulator'} | null>(null);
  
  // Stove State
  const [stoves, setStoves] = useState<Stove[]>([]);
  const [stoveSearchQuery, setStoveSearchQuery] = useState("");
  const [filterBurner, setFilterBurner] = useState<string>("all");
  const [showDamagedOnly, setShowDamagedOnly] = useState(false);
  
  // Regulator State
  const [regulators, setRegulators] = useState<Regulator[]>([]);
  const [regulatorSearchQuery, setRegulatorSearchQuery] = useState("");
  const [regulatorSizeFilter, setRegulatorSizeFilter] = useState<string>("all");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const weightOptions = sizeTab === "22mm" ? WEIGHT_OPTIONS_22MM : WEIGHT_OPTIONS_20MM;
  
  // Open POB drawer for specific product type
  const openPOB = (type: 'lpg' | 'stove' | 'regulator') => {
    setPobProductType(type);
    setIsPOBOpen(true);
  };

  const getOwnerIdForWrite = useCallback(async () => {
    const { data: ownerId, error } = await supabase.rpc("get_owner_id");
    if (error) throw error;
    return ownerId;
  }, []);

  // Update weight when size changes
  useEffect(() => {
    const defaultWeight = sizeTab === "22mm" ? "12kg" : "12kg";
    setSelectedWeight(defaultWeight);
  }, [sizeTab]);

  // Fetch all data with cache support
  const hasFetchedRef = useRef(false);
  const lastFetchKey = useRef('');
  
  const fetchData = useCallback(async (isBackgroundRefresh = false) => {
    if (!isBackgroundRefresh) setLoading(true);
    
    try {
      const [lpgRes, stovesRes, regulatorsRes] = await Promise.all([
        supabase
          .from("lpg_brands")
          .select("*")
          .eq("is_active", true)
          .eq("size", sizeTab)
          .eq("weight", selectedWeight)
          .order("name"),
        supabase.from("stoves").select("*").eq("is_active", true).order("brand"),
        supabase.from("regulators").select("*").eq("is_active", true).order("brand"),
      ]);

      if (lpgRes.error) throw lpgRes.error;
      if (stovesRes.error) throw stovesRes.error;
      if (regulatorsRes.error) throw regulatorsRes.error;

      setLpgBrands(lpgRes.data ?? []);
      setStoves(stovesRes.data ?? []);
      setRegulators(regulatorsRes.data ?? []);
      
      // Save to cache
      const cacheKey = `${INVENTORY_CACHE_KEY}_${sizeTab}_${selectedWeight}`;
      setCombinedCache(cacheKey, {
        lpgBrands: lpgRes.data ?? [],
        stoves: stovesRes.data ?? [],
        regulators: regulatorsRes.data ?? []
      });
    } catch (error: any) {
      logger.error('Failed to load inventory data', error, { component: 'Inventory' });
      if (!isBackgroundRefresh) {
        toast.error(error?.message || "Failed to load inventory data");
      }
    } finally {
      if (!isBackgroundRefresh) setLoading(false);
    }
  }, [sizeTab, selectedWeight]);

  // Initial load and filter changes with cache-first strategy
  useEffect(() => {
    const cacheKey = `${INVENTORY_CACHE_KEY}_${sizeTab}_${selectedWeight}`;
    
    // Prevent duplicate fetches for same key
    if (lastFetchKey.current === cacheKey && hasFetchedRef.current) return;
    lastFetchKey.current = cacheKey;
    hasFetchedRef.current = true;
    
    // Try cache first
    const cached = getCombinedCache<{
      lpgBrands: LPGBrand[];
      stoves: Stove[];
      regulators: Regulator[];
    }>(cacheKey);
    
    if (cached) {
      // Instant restore
      setLpgBrands(cached.lpgBrands || []);
      setStoves(cached.stoves || []);
      setRegulators(cached.regulators || []);
      setLoading(false);
      
      // Background refresh if online
      if (isOnline) {
        fetchData(true);
      }
    } else {
      // No cache - show loading and fetch
      fetchData(false);
    }
  }, [sizeTab, selectedWeight, fetchData, isOnline]);

  // Real-time inventory sync - debounced
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // Skip subscriptions when offline to prevent connection errors
    if (!isOnline) return;
    
    const debouncedFetch = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => fetchData(true), 1000);
    };
    
    const channels = [
      supabase.channel('inv-lpg-realtime-v2').on('postgres_changes', 
        { event: '*', schema: 'public', table: 'lpg_brands' }, 
        debouncedFetch
      ).subscribe(),
      supabase.channel('inv-stoves-realtime-v2').on('postgres_changes', 
        { event: '*', schema: 'public', table: 'stoves' }, 
        debouncedFetch
      ).subscribe(),
      supabase.channel('inv-regulators-realtime-v2').on('postgres_changes', 
        { event: '*', schema: 'public', table: 'regulators' }, 
        debouncedFetch
      ).subscribe(),
    ];
    
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [isOnline, fetchData]);

  // Filtered data with useMemo for performance
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

  // LPG Totals with useMemo
  const lpgTotals = useMemo(() => 
    filteredLpgBrands.reduce((acc, b) => ({
      package: acc.package + b.package_cylinder,
      refill: acc.refill + b.refill_cylinder,
      empty: acc.empty + b.empty_cylinder,
      problem: acc.problem + b.problem_cylinder,
      inTransit: acc.inTransit + (b.in_transit_cylinder || 0),
    }), { package: 0, refill: 0, empty: 0, problem: 0, inTransit: 0 }),
    [filteredLpgBrands]
  );

  // Stove Totals with useMemo
  const stoveTotals = useMemo(() => ({
    total: stoves.reduce((sum, s) => sum + s.quantity, 0),
    singleBurner: stoves.filter(s => s.burners === 1).reduce((sum, s) => sum + s.quantity, 0),
    doubleBurner: stoves.filter(s => s.burners === 2).reduce((sum, s) => sum + s.quantity, 0),
    damaged: stoves.filter(s => s.is_damaged).reduce((sum, s) => sum + s.quantity, 0),
  }), [stoves]);

  // Regulator Totals with useMemo
  const regulatorTotals = useMemo(() => ({
    total: regulators.reduce((sum, r) => sum + r.quantity, 0),
    size22mm: regulators.filter(r => r.type === "22mm").reduce((sum, r) => sum + r.quantity, 0),
    size20mm: regulators.filter(r => r.type === "20mm").reduce((sum, r) => sum + r.quantity, 0),
  }), [regulators]);

  // Status helpers
  const getLpgStatus = (brand: LPGBrand) => {
    const total = brand.package_cylinder + brand.refill_cylinder;
    if (total === 0) return { label: "Out of Stock", color: "bg-red-500" };
    if (total < 10) return { label: "Low Stock", color: "bg-yellow-500" };
    return { label: "In Stock", color: "bg-green-500" };
  };

  const getStockStatus = (quantity: number) => {
    if (quantity === 0) return { label: "Out of Stock", bgClass: "bg-destructive/10 text-destructive" };
    if (quantity < 10) return { label: "Low Stock", bgClass: "bg-amber-500/10 text-amber-600" };
    return { label: "In Stock", bgClass: "bg-emerald-500/10 text-emerald-600" };
  };

  // Update operations
  const handleUpdateLpg = async (id: string, field: string, value: number) => {
    try {
      const { error } = await supabase.from("lpg_brands").update({ [field]: value }).eq("id", id);
      if (error) throw error;

      setLpgBrands((prev) => prev.map((b) => (b.id === id ? { ...b, [field]: value } : b)));
      setEditingCell(null);
      toast.success("Updated successfully");
    } catch (error: any) {
      toast.error(error?.message || "Failed to update");
    }
  };

  const handleUpdateStove = async (id: string, value: number) => {
    try {
      const { error } = await supabase.from("stoves").update({ quantity: value }).eq("id", id);
      if (error) throw error;

      setStoves((prev) => prev.map((s) => (s.id === id ? { ...s, quantity: value } : s)));
      setEditingCell(null);
      toast.success("Updated successfully");
    } catch (error: any) {
      toast.error(error?.message || "Failed to update");
    }
  };

  const handleUpdateRegulator = async (id: string, value: number) => {
    try {
      const { error } = await supabase.from("regulators").update({ quantity: value }).eq("id", id);
      if (error) throw error;

      setRegulators((prev) => prev.map((r) => (r.id === id ? { ...r, quantity: value } : r)));
      setEditingCell(null);
      toast.success("Updated successfully");
    } catch (error: any) {
      toast.error(error?.message || "Failed to update");
    }
  };

  // Delete operations
  const handleDeleteLpg = async (id: string) => {
    try {
      const { error } = await supabase.from("lpg_brands").update({ is_active: false }).eq("id", id);
      if (error) throw error;

      setLpgBrands((prev) => prev.filter((b) => b.id !== id));
      toast.success("Brand removed");
    } catch (error: any) {
      toast.error(error?.message || "Failed to remove brand");
    }
  };

  const handleDeleteStove = async (id: string) => {
    try {
      const { error } = await supabase.from("stoves").update({ is_active: false }).eq("id", id);
      if (error) throw error;

      setStoves((prev) => prev.filter((s) => s.id !== id));
      toast.success("Stove removed");
    } catch (error: any) {
      toast.error(error?.message || "Failed to remove stove");
    }
  };

  const handleDeleteRegulator = async (id: string) => {
    try {
      const { error } = await supabase.from("regulators").update({ is_active: false }).eq("id", id);
      if (error) throw error;

      setRegulators((prev) => prev.filter((r) => r.id !== id));
      toast.success("Regulator removed");
    } catch (error: any) {
      toast.error(error?.message || "Failed to remove regulator");
    }
  };

  // Send to Plant

  // Editable Stock Cell
  const EditableStockCell = ({ 
    value, itemId, field, icon: Icon, label, bgColor = "bg-muted", type, onUpdate
  }: { 
    value: number; itemId: string; field: string; icon: React.ElementType; label: string; bgColor?: string;
    type: 'lpg' | 'stove' | 'regulator'; onUpdate: (id: string, field: string, value: number) => void;
  }) => {
    const [localValue, setLocalValue] = useState(value);
    const isEditing = editingCell?.id === itemId && editingCell?.field === field && editingCell?.type === type;

    useEffect(() => { setLocalValue(value); }, [value]);

    if (isEditing) {
      return (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1">
            <Icon className="h-3 w-3" />{label}
          </span>
          <Input
            type="number" value={localValue}
            onChange={(e) => setLocalValue(parseInt(e.target.value) || 0)}
            onBlur={() => onUpdate(itemId, field, localValue)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onUpdate(itemId, field, localValue);
              if (e.key === "Escape") { setEditingCell(null); setLocalValue(value); }
            }}
            className="h-8 w-full text-center font-medium" autoFocus min={0}
          />
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-1">
        <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1">
          <Icon className="h-3 w-3" />{label}
        </span>
        <div
          onClick={() => setEditingCell({ id: itemId, field, type })}
          className={`px-2 sm:px-3 py-2 rounded-md cursor-pointer transition-all text-center font-medium text-sm sm:text-base ${bgColor} hover:opacity-80`}
        >
          {value}
        </div>
      </div>
    );
  };

  // LPG Brand Card with valve-size-specific colors
  const LpgBrandCard = ({ brand }: { brand: LPGBrand }) => {
    const status = getLpgStatus(brand);
    // Use valve-size-specific color for better identification
    const brandColor = getLpgColorByValveSize(brand.name, brand.size as "22mm" | "20mm");
    
    return (
      <Card className="border-border hover:shadow-md transition-shadow">
        <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-4">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-lg">
              <span 
                className="h-4 w-4 sm:h-5 sm:w-5 rounded-full flex-shrink-0 ring-2 ring-offset-1 ring-offset-background shadow-sm" 
                style={{ backgroundColor: brandColor, boxShadow: `0 0 8px ${brandColor}40` }}
                title={`${brand.name} (${brand.size})`}
              />
              <span className="truncate">{brand.name}</span>
            </CardTitle>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge className={`${status.color} text-white text-[10px] sm:text-xs border-0`}>{status.label}</Badge>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => handleDeleteLpg(brand.id)} aria-label={`Delete ${brand.name} brand`}>
                <Trash2 className="h-3 w-3" aria-hidden="true" />
              </Button>
            </div>
          </div>
          <div className="flex gap-1.5 mt-1">
            <Badge variant="outline" className="text-[10px] sm:text-xs">{selectedWeight}</Badge>
            <Badge variant="secondary" className="text-[10px] sm:text-xs">{brand.size}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 px-3 sm:px-6 pb-3 sm:pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <EditableStockCell value={brand.package_cylinder} itemId={brand.id} field="package_cylinder" icon={Package} label="Package" bgColor="bg-emerald-100 dark:bg-emerald-900/30" type="lpg" onUpdate={handleUpdateLpg} />
            <EditableStockCell value={brand.refill_cylinder} itemId={brand.id} field="refill_cylinder" icon={Cylinder} label="Refill" bgColor="bg-blue-100 dark:bg-blue-900/30" type="lpg" onUpdate={handleUpdateLpg} />
            <EditableStockCell value={brand.empty_cylinder} itemId={brand.id} field="empty_cylinder" icon={Package} label="Empty" bgColor="bg-gray-100 dark:bg-gray-800/50" type="lpg" onUpdate={handleUpdateLpg} />
            <EditableStockCell value={brand.problem_cylinder} itemId={brand.id} field="problem_cylinder" icon={AlertTriangle} label="Problem" bgColor="bg-red-100 dark:bg-red-900/30" type="lpg" onUpdate={handleUpdateLpg} />
          </div>
          {(brand.in_transit_cylinder || 0) > 0 && (
            <div className="flex items-center justify-between p-2 bg-amber-50 dark:bg-amber-900/30 rounded-md">
              <span className="text-xs sm:text-sm flex items-center gap-2"><Truck className="h-3 w-3 sm:h-4 sm:w-4 text-amber-600" />In Transit</span>
              <Badge variant="outline" className="bg-amber-100/50 text-amber-700 dark:text-amber-300">{brand.in_transit_cylinder}</Badge>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Stove Card with full features
  const StoveCard = ({ stove }: { stove: Stove }) => {
    const status = getStockStatus(stove.quantity);
    
    const handleQuickAdjust = async (delta: number) => {
      const newValue = Math.max(0, stove.quantity + delta);
      await handleUpdateStove(stove.id, newValue);
    };

    const handleMarkDamaged = async () => {
      try {
        const { error } = await supabase.from("stoves").update({ is_damaged: !stove.is_damaged }).eq("id", stove.id);
        if (error) throw error;
        setStoves(prev => prev.map(s => s.id === stove.id ? { ...s, is_damaged: !s.is_damaged } : s));
        toast.success(stove.is_damaged ? "Marked as functional" : "Marked as damaged");
      } catch (error: any) {
        toast.error(error?.message || "Failed to update");
      }
    };

    return (
      <Card className={`border-border hover:shadow-md transition-shadow ${stove.is_damaged ? 'border-destructive/50 bg-destructive/5' : ''}`}>
        <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-4">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <ChefHat className={`h-4 w-4 ${stove.is_damaged ? 'text-destructive' : 'text-orange-500'}`} />
              <span className="truncate">{stove.brand}</span>
            </CardTitle>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <Badge className={`${status.bgClass} text-[10px] sm:text-xs border-0`}>{status.label}</Badge>
            </div>
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            <Badge variant="outline" className="text-[10px] sm:text-xs">
              <Flame className="h-3 w-3 mr-1" />
              {stove.burners === 1 ? "Single" : "Double"} Burner
            </Badge>
            {stove.model && (
              <Badge variant="secondary" className="text-[10px] sm:text-xs bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30">
                Model: {stove.model}
              </Badge>
            )}
            {stove.is_damaged && <Badge variant="destructive" className="text-[10px] sm:text-xs">Damaged</Badge>}
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-4 space-y-3">
          {/* Stock Label */}
          <div className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1">
            <Package className="h-3 w-3" />Stock
          </div>
          {/* Quantity with quick adjust buttons - aligned */}
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-10 w-10 shrink-0"
              onClick={() => handleQuickAdjust(-1)}
              disabled={stove.quantity <= 0}
              aria-label="Decrease stove quantity"
            >
              <Minus className="h-4 w-4" aria-hidden="true" />
            </Button>
            <div
              onClick={() => setEditingCell({ id: stove.id, field: "quantity", type: "stove" })}
              className="flex-1 px-4 py-2 rounded-md cursor-pointer transition-all text-center font-bold text-lg bg-orange-100 dark:bg-orange-900/30 hover:opacity-80"
            >
              {stove.quantity}
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-10 w-10 shrink-0"
              onClick={() => handleQuickAdjust(1)}
              aria-label="Increase stove quantity"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>


          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            <Button 
              variant={stove.is_damaged ? "default" : "outline"} 
              size="sm" 
              className={`flex-1 text-xs h-8 ${stove.is_damaged ? 'bg-green-600 hover:bg-green-700' : ''}`}
              onClick={handleMarkDamaged}
            >
              <AlertTriangle className="h-3 w-3 mr-1" />
              {stove.is_damaged ? "Mark OK" : "Mark Damaged"}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" 
              onClick={() => handleDeleteStove(stove.id)}
              aria-label={`Delete ${stove.brand} stove`}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Regulator Card with full features - matching StoveCard design
  const RegulatorCard = ({ regulator }: { regulator: Regulator }) => {
    const status = getStockStatus(regulator.quantity);
    const isSize22 = regulator.type === "22mm";
    
    const handleQuickAdjust = async (delta: number) => {
      const newValue = Math.max(0, regulator.quantity + delta);
      await handleUpdateRegulator(regulator.id, newValue);
    };

    const handleMarkDefective = async () => {
      try {
        const { error } = await supabase.from("regulators").update({ is_defective: !regulator.is_defective }).eq("id", regulator.id);
        if (error) throw error;
        setRegulators(prev => prev.map(r => r.id === regulator.id ? { ...r, is_defective: !r.is_defective } : r));
        toast.success(regulator.is_defective ? "Marked as functional" : "Marked as defective");
      } catch (error: any) {
        toast.error(error?.message || "Failed to update");
      }
    };

    return (
      <Card className={`border-border hover:shadow-md transition-shadow ${regulator.is_defective ? 'border-destructive/50 bg-destructive/5' : ''}`}>
        <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-4">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Gauge className={`h-4 w-4 ${regulator.is_defective ? 'text-destructive' : isSize22 ? "text-violet-500" : "text-cyan-500"}`} />
              <span className="truncate">{regulator.brand}</span>
            </CardTitle>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <Badge className={`${status.bgClass} text-[10px] sm:text-xs border-0`}>{status.label}</Badge>
            </div>
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            <Badge variant="outline" className={`text-[10px] sm:text-xs ${isSize22 ? "bg-violet-500/10 text-violet-600 border-violet-500/30" : "bg-cyan-500/10 text-cyan-600 border-cyan-500/30"}`}>
              <Wrench className="h-3 w-3 mr-1" />
              {regulator.type}
            </Badge>
            {isSize22 ? (
              <Badge variant="outline" className="text-[10px] sm:text-xs bg-blue-500/10 text-blue-600 border-blue-500/30">
                Omera/Bashundhara
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] sm:text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">
                TotalGaz/Petromax
              </Badge>
            )}
            {regulator.is_defective && <Badge variant="destructive" className="text-[10px] sm:text-xs">Defective</Badge>}
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-4 space-y-3">
          {/* Stock Label */}
          <div className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1">
            <Package className="h-3 w-3" />Stock
          </div>
          {/* Quantity with quick adjust buttons - aligned */}
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-10 w-10 shrink-0"
              onClick={() => handleQuickAdjust(-1)}
              disabled={regulator.quantity <= 0}
              aria-label="Decrease regulator quantity"
            >
              <Minus className="h-4 w-4" aria-hidden="true" />
            </Button>
            <div
              onClick={() => setEditingCell({ id: regulator.id, field: "quantity", type: "regulator" })}
              className={`flex-1 px-4 py-2 rounded-md cursor-pointer transition-all text-center font-bold text-lg hover:opacity-80 ${isSize22 ? "bg-violet-100 dark:bg-violet-900/30" : "bg-cyan-100 dark:bg-cyan-900/30"}`}
            >
              {regulator.quantity}
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-10 w-10 shrink-0"
              onClick={() => handleQuickAdjust(1)}
              aria-label="Increase regulator quantity"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>


          {/* Action buttons - matching stove design */}
          <div className="flex gap-2 pt-1">
            <Button 
              variant={regulator.is_defective ? "default" : "outline"} 
              size="sm" 
              className={`flex-1 text-xs h-8 ${regulator.is_defective ? 'bg-green-600 hover:bg-green-700' : ''}`}
              onClick={handleMarkDefective}
            >
              <AlertTriangle className="h-3 w-3 mr-1" />
              {regulator.is_defective ? "Mark OK" : "Mark Defective"}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" 
              onClick={() => handleDeleteRegulator(regulator.id)}
              aria-label={`Delete ${regulator.brand} regulator`}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg flex-shrink-0">
            <Package className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Inventory</h1>
            <p className="text-muted-foreground text-xs sm:text-sm">Manage LPG cylinders, stoves & regulators</p>
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-muted/50 p-1 w-full sm:w-auto grid grid-cols-3 sm:inline-flex">
          <TabsTrigger value="lpg" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1 sm:gap-2 text-xs sm:text-sm">
            <Flame className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">LPG Cylinders</span>
            <span className="sm:hidden">LPG</span>
          </TabsTrigger>
          <TabsTrigger value="stoves" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white gap-1 sm:gap-2 text-xs sm:text-sm">
            <ChefHat className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Gas Stoves</span>
            <span className="sm:hidden">Stoves</span>
          </TabsTrigger>
          <TabsTrigger value="regulators" className="data-[state=active]:bg-violet-500 data-[state=active]:text-white gap-1 sm:gap-2 text-xs sm:text-sm">
            <Wrench className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Regulators</span>
            <span className="sm:hidden">Reg.</span>
          </TabsTrigger>
        </TabsList>

        {/* LPG Tab Content */}
        <TabsContent value="lpg" className="space-y-4 mt-4">
          {/* LPG Summary Cards - Top Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
              <CardContent className="p-2.5 sm:p-3">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-lg sm:text-xl font-bold truncate">{lpgTotals.package}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Package</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
              <CardContent className="p-2.5 sm:p-3">
                <div className="flex items-center gap-2">
                  <Cylinder className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-lg sm:text-xl font-bold truncate">{lpgTotals.refill}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Refill</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-gray-500/10 to-gray-500/5 border-gray-500/20">
              <CardContent className="p-2.5 sm:p-3">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-lg sm:text-xl font-bold truncate">{lpgTotals.empty}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Empty</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
              <CardContent className="p-2.5 sm:p-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-lg sm:text-xl font-bold truncate">{lpgTotals.problem}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Problem</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Bar - Row 1: Valve Size + Weight + Buy Button */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex bg-muted/60 rounded-full p-1 border border-border/50 flex-shrink-0">
              <button
                onClick={() => setSizeTab("22mm")}
                className={`h-9 px-3 sm:px-4 rounded-full font-semibold text-xs sm:text-sm transition-all ${
                  sizeTab === '22mm' 
                    ? 'bg-primary text-primary-foreground shadow-md' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                22mm
              </button>
              <button
                onClick={() => setSizeTab("20mm")}
                className={`h-9 px-3 sm:px-4 rounded-full font-semibold text-xs sm:text-sm transition-all ${
                  sizeTab === '20mm' 
                    ? 'bg-cyan-500 text-white shadow-md' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                20mm
              </button>
            </div>
            
            {/* Weight Dropdown (Compact) */}
            <Select value={selectedWeight} onValueChange={setSelectedWeight}>
              <SelectTrigger className="h-9 w-24 sm:w-28 text-xs sm:text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {weightOptions.map(w => (
                  <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="flex-1" />
            
            {/* Buy/Add Button */}
            <Button 
              size="sm" 
              className="gap-1.5 text-xs sm:text-sm h-9 bg-gradient-to-r from-primary to-primary/80 whitespace-nowrap flex-shrink-0"
              onClick={() => openPOB('lpg')}
            >
              <PackagePlus className="h-4 w-4" />
              <span className="hidden sm:inline">Buy/Add</span>
              <span className="sm:hidden">+</span>
            </Button>
          </div>
          
          {/* Row 2: Search Bar (Full Width - Below for easy mobile access) */}
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search brands..." 
              value={lpgSearchQuery} 
              onChange={(e) => setLpgSearchQuery(e.target.value)} 
              className="pl-10 h-11 text-base"
            />
          </div>


          {/* LPG Brand Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLpgBrands.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Flame className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground text-center">No brands found for {sizeTab} / {selectedWeight}</p>
                  <Button variant="outline" className="mt-4" onClick={() => openPOB('lpg')}>
                    <PackagePlus className="h-4 w-4 mr-2" />Buy/Add Cylinders
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filteredLpgBrands.map(brand => <LpgBrandCard key={brand.id} brand={brand} />)
            )}
          </div>
        </TabsContent>

        {/* Stoves Tab Content */}
        <TabsContent value="stoves" className="space-y-4 mt-4">
          {/* Stove Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <InventoryStatCard
              icon={Package}
              label="Total Units"
              value={stoveTotals.total}
              active={filterBurner === "all" && !showDamagedOnly}
              onClick={() => {
                setFilterBurner("all");
                setShowDamagedOnly(false);
              }}
            />
            <InventoryStatCard
              icon={Flame}
              label="Single Burner"
              value={stoveTotals.singleBurner}
              active={filterBurner === "1" && !showDamagedOnly}
              onClick={() => {
                const isActive = filterBurner === "1" && !showDamagedOnly;
                setFilterBurner(isActive ? "all" : "1");
                setShowDamagedOnly(false);
              }}
            />
            <InventoryStatCard
              icon={Flame}
              label="Double Burner"
              value={stoveTotals.doubleBurner}
              active={filterBurner === "2" && !showDamagedOnly}
              onClick={() => {
                const isActive = filterBurner === "2" && !showDamagedOnly;
                setFilterBurner(isActive ? "all" : "2");
                setShowDamagedOnly(false);
              }}
            />
            <InventoryStatCard
              icon={AlertTriangle}
              label="Damaged"
              value={stoveTotals.damaged}
              tone="danger"
              active={showDamagedOnly}
              onClick={() => {
                const next = !showDamagedOnly;
                setShowDamagedOnly(next);
                if (next) setFilterBurner("all");
              }}
            />
          </div>

          {/* Action Bar - Search + Filters + Buy Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search stoves..." value={stoveSearchQuery} onChange={(e) => setStoveSearchQuery(e.target.value)} className="pl-10 h-10" />
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              {/* Burner Type Filter */}
              <Select value={filterBurner} onValueChange={setFilterBurner}>
                <SelectTrigger className="w-32 h-10 text-xs"><SelectValue placeholder="Filter" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="1">Single Burner</SelectItem>
                  <SelectItem value="2">Double Burner</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Damaged Toggle */}
              <div className="flex items-center gap-2 px-3 py-1.5 h-10 bg-muted/50 rounded-lg">
                <Switch checked={showDamagedOnly} onCheckedChange={setShowDamagedOnly} id="damaged-filter" />
                <Label htmlFor="damaged-filter" className="text-xs cursor-pointer whitespace-nowrap">Damaged</Label>
              </div>
              
              {/* Buy/Add Button */}
              <Button 
                size="sm" 
                className="gap-2 text-xs sm:text-sm h-10 bg-gradient-to-r from-orange-500 to-amber-500 whitespace-nowrap"
                onClick={() => openPOB('stove')}
              >
                <PackagePlus className="h-4 w-4" />
                <span className="hidden sm:inline">Buy/Add Stoves</span>
                <span className="sm:hidden">Buy/Add</span>
              </Button>
            </div>
          </div>

          {/* Stove Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStoves.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <ChefHat className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground text-center">No stoves found</p>
                  <Button variant="outline" className="mt-4" onClick={() => openPOB('stove')}>
                    <PackagePlus className="h-4 w-4 mr-2" />Buy/Add Stoves
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filteredStoves.map(stove => <StoveCard key={stove.id} stove={stove} />)
            )}
          </div>
        </TabsContent>

        {/* Regulators Tab Content */}
        <TabsContent value="regulators" className="space-y-4 mt-4">
          {/* Regulator Summary Cards */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <InventoryStatCard
              icon={Package}
              label="Total Units"
              value={regulatorTotals.total}
              active={regulatorSizeFilter === "all"}
              onClick={() => setRegulatorSizeFilter("all")}
            />
            <InventoryStatCard
              icon={Gauge}
              label="22mm Size"
              value={regulatorTotals.size22mm}
              active={regulatorSizeFilter === "22mm"}
              onClick={() =>
                setRegulatorSizeFilter((prev) => (prev === "22mm" ? "all" : "22mm"))
              }
            />
            <InventoryStatCard
              icon={Gauge}
              label="20mm Size"
              value={regulatorTotals.size20mm}
              active={regulatorSizeFilter === "20mm"}
              onClick={() =>
                setRegulatorSizeFilter((prev) => (prev === "20mm" ? "all" : "20mm"))
              }
            />
          </div>

          {/* Action Bar - Size Toggle + Search + Buy Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            {/* Size Toggle */}
            <div className="flex w-full sm:w-auto rounded-lg bg-muted/50 p-1">
              <Button
                type="button"
                size="sm"
                variant={regulatorSizeFilter === "all" ? "default" : "ghost"}
                className="h-9 flex-1 sm:flex-none text-xs"
                onClick={() => setRegulatorSizeFilter("all")}
              >
                All
              </Button>
              <Button
                type="button"
                size="sm"
                variant={regulatorSizeFilter === "22mm" ? "default" : "ghost"}
                className="h-9 flex-1 sm:flex-none text-xs"
                onClick={() => setRegulatorSizeFilter("22mm")}
              >
                22mm
              </Button>
              <Button
                type="button"
                size="sm"
                variant={regulatorSizeFilter === "20mm" ? "default" : "ghost"}
                className="h-9 flex-1 sm:flex-none text-xs"
                onClick={() => setRegulatorSizeFilter("20mm")}
              >
                20mm
              </Button>
            </div>
            
            {/* Search */}
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search regulators..." value={regulatorSearchQuery} onChange={(e) => setRegulatorSearchQuery(e.target.value)} className="pl-10 h-10" />
            </div>
            
            {/* Buy/Add Button */}
            <Button 
              size="sm" 
              className="gap-2 text-xs sm:text-sm h-10 bg-gradient-to-r from-violet-500 to-purple-600 whitespace-nowrap"
              onClick={() => openPOB('regulator')}
            >
              <PackagePlus className="h-4 w-4" />
              <span className="hidden sm:inline">Buy/Add Regulators</span>
              <span className="sm:hidden">Buy/Add</span>
            </Button>
          </div>

          {/* Regulator Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRegulators.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Wrench className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground text-center">No regulators found</p>
                  <Button variant="outline" className="mt-4" onClick={() => openPOB('regulator')}>
                    <PackagePlus className="h-4 w-4 mr-2" />Buy/Add Regulators
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filteredRegulators.map(regulator => <RegulatorCard key={regulator.id} regulator={regulator} />)
            )}
          </div>
        </TabsContent>
      </Tabs>
      
      {/* POB Drawer */}
      <InventoryPOBDrawer
        open={isPOBOpen}
        onOpenChange={setIsPOBOpen}
        productType={pobProductType}
        onPurchaseComplete={fetchData}
      />
    </div>
  );
};
