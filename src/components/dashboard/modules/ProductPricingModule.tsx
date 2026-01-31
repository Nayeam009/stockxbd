import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Save,
  Trash2,
  Search,
  Package,
  ChefHat,
  Wrench,
  Loader2,
  DollarSign,
  Building,
  Store,
  Truck,
  AlertTriangle,
  RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BrandSelect } from "@/components/shared/BrandSelect";
import { getLpgBrandNames, getStoveBrandNames, getRegulatorBrandNames, getLpgColorByValveSize } from "@/lib/brandConstants";
import { ModuleLoadErrorCard } from "@/components/shared/ModuleLoadErrorCard";
import { SoftRefreshBadge } from "@/components/shared/SoftRefreshBadge";
import { withTimeout, debounce, TimeoutError } from "@/lib/asyncUtils";

interface ProductPrice {
  id: string;
  product_type: string;
  brand_id: string | null;
  product_name: string;
  size: string | null;
  variant: string | null;
  company_price: number;
  distributor_price: number;
  retail_price: number;
  package_price: number;
  is_active: boolean;
}

interface LpgBrand {
  id: string;
  name: string;
  color: string;
  size: string;
  weight: string | null;
}

// Weight options matching inventory
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

// Fetch timeout constant
const FETCH_TIMEOUT_MS = 12000;

export const ProductPricingModule = () => {
  const [activeTab, setActiveTab] = useState("lpg");
  const [sizeTab, setSizeTab] = useState<"22mm" | "20mm">("22mm");
  const [selectedWeight, setSelectedWeight] = useState("12kg");
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<ProductPrice[]>([]);
  const [lpgBrands, setLpgBrands] = useState<LpgBrand[]>([]);
  
  // Resilient loading state
  const [initialLoading, setInitialLoading] = useState(true);
  const [softLoading, setSoftLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editedPrices, setEditedPrices] = useState<Record<string, Partial<ProductPrice>>>({});
  const [editingCell, setEditingCell] = useState<{ id: string, field: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [newProduct, setNewProduct] = useState({
    product_type: "lpg",
    brand_id: "",
    product_name: "",
    size: "12kg",
    variant: "Refill",
    company_price: 0,
    distributor_price: 0,
    retail_price: 0,
    package_price: 0,
  });

  // Custom product name for LPG when not linked to existing brand
  const [useCustomLpgName, setUseCustomLpgName] = useState(false);
  const [customLpgName, setCustomLpgName] = useState("");

  const weightOptions = sizeTab === "22mm" ? WEIGHT_OPTIONS_22MM : WEIGHT_OPTIONS_20MM;

  // Core fetch function with timeout
  const fetchData = useCallback(async (isRefresh: boolean = false) => {
    // Only show initial loading if no data yet
    if (!isRefresh && products.length === 0) {
      setInitialLoading(true);
    } else {
      setSoftLoading(true);
    }
    setLoadError(null);
    
    try {
      const fetchPromise = Promise.all([
        supabase.from("product_prices").select("*").eq("is_active", true).order("product_name"),
        supabase.from("lpg_brands").select("id, name, color, size, weight").eq("is_active", true),
      ]);

      const [productsRes, brandsRes] = await withTimeout(
        fetchPromise,
        FETCH_TIMEOUT_MS,
        'ProductPricing fetch'
      );

      if (productsRes.data) setProducts(productsRes.data);
      if (brandsRes.data) setLpgBrands(brandsRes.data);
    } catch (error) {
      if (error instanceof TimeoutError) {
        // Only show error if we have no data to show
        if (products.length === 0) {
          setLoadError("Loading took too long. Please retry.");
        } else {
          toast.error("Refresh timed out. Showing cached data.");
        }
      } else {
        if (products.length === 0) {
          setLoadError("Failed to load pricing data. Please retry.");
        } else {
          toast.error("Failed to refresh pricing data");
        }
      }
    } finally {
      setInitialLoading(false);
      setSoftLoading(false);
    }
  }, [products.length]);

  // Debounced fetch for realtime updates
  const debouncedFetch = useMemo(
    () => debounce(() => fetchData(true), 1000),
    [fetchData]
  );

  useEffect(() => {
    fetchData();
  }, []);

  // Real-time pricing sync with debouncing
  useEffect(() => {
    const channels = [
      supabase.channel('pricing-prices-realtime').on('postgres_changes',
        { event: '*', schema: 'public', table: 'product_prices' },
        () => debouncedFetch()
      ).subscribe(),
      supabase.channel('pricing-brands-realtime').on('postgres_changes',
        { event: '*', schema: 'public', table: 'lpg_brands' },
        () => debouncedFetch()
      ).subscribe(),
    ];

    return () => channels.forEach(ch => supabase.removeChannel(ch));
  }, [debouncedFetch]);

  // Normalize brand name for grouping similar names (e.g., "Bashundhara" and "Basundhora")
  const normalizeBrandName = useCallback((name: string): string => {
    return name
      .toLowerCase()
      .replace(/[\s-_]+/g, '') // Remove spaces, hyphens, underscores
      .replace(/lp\s*gas/gi, '') // Remove "LP Gas" suffix
      .replace(/h$/i, '') // "basundhora" vs "bashundhara" -> both normalize
      .replace(/o/g, 'u') // "basundhora" -> "basundhura"
      .trim();
  }, []);

  // Group brands by normalized name - merge duplicates into one entry
  interface GroupedBrand {
    name: string; // Display name (first occurrence)
    color: string;
    weight: string;
    brandIds: string[]; // All brand IDs with this normalized name
  }

  // Filter and group brands by size and weight for LPG with useMemo
  const getFilteredBrands = useMemo(() => {
    const filtered = lpgBrands.filter(brand =>
      brand.size === sizeTab &&
      brand.weight === selectedWeight
    );

    // Group by normalized name
    const groupMap = new Map<string, GroupedBrand>();

    filtered.forEach(brand => {
      const normalizedName = normalizeBrandName(brand.name);

      if (groupMap.has(normalizedName)) {
        // Add this brand ID to existing group
        groupMap.get(normalizedName)!.brandIds.push(brand.id);
      } else {
        // Create new group with this brand as the primary
        groupMap.set(normalizedName, {
          name: brand.name.charAt(0).toUpperCase() + brand.name.slice(1), // Capitalize first letter
          color: brand.color,
          weight: brand.weight || selectedWeight,
          brandIds: [brand.id]
        });
      }
    });

    return Array.from(groupMap.values());
  }, [lpgBrands, sizeTab, selectedWeight, normalizeBrandName]);

  // Get products for a group of brands (merged by normalized name)
  const getProductsForBrandGroup = useCallback((brandIds: string[]) => {
    return products.filter(p =>
      p.product_type === "lpg" &&
      brandIds.includes(p.brand_id || '') &&
      p.product_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);

  // Legacy function for single brand lookup (kept for compatibility)
  const getProductsForBrand = useCallback((brandId: string) => {
    return products.filter(p =>
      p.product_type === "lpg" &&
      p.brand_id === brandId &&
      p.product_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);

  // Get non-LPG products with useMemo
  const filteredStoveProducts = useMemo(() =>
    products.filter(p => p.product_type === "stove" && p.product_name.toLowerCase().includes(searchQuery.toLowerCase())),
    [products, searchQuery]
  );

  const filteredRegulatorProducts = useMemo(() =>
    products.filter(p => p.product_type === "regulator" && p.product_name.toLowerCase().includes(searchQuery.toLowerCase())),
    [products, searchQuery]
  );

  const handlePriceChange = (productId: string, field: keyof ProductPrice, value: number) => {
    setEditedPrices(prev => ({
      ...prev,
      [productId]: { ...prev[productId], [field]: value }
    }));
  };

  const getValue = (product: ProductPrice, field: keyof ProductPrice): number => {
    return (editedPrices[product.id]?.[field] as number) ?? (product[field] as number);
  };

  const saveChanges = async () => {
    const updates = Object.entries(editedPrices);
    if (updates.length === 0) {
      toast.info("No changes to save");
      return;
    }

    setIsSaving(true);
    try {
      for (const [id, changes] of updates) {
        await supabase.from("product_prices").update(changes).eq("id", id);
      }
      toast.success("Prices updated successfully");
      setEditedPrices({});
      fetchData();
    } catch (error) {
      toast.error("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddProduct = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      toast.error("Please log in first");
      return;
    }

    try {
      // Get shop owner ID (handles both Owner and Manager)
      const { data: ownerId } = await supabase.rpc("get_owner_id");

      const { error } = await supabase.from("product_prices").insert({
        ...newProduct,
        brand_id: newProduct.brand_id || null,
        created_by: user.user.id,
        owner_id: ownerId || user.user.id, // Ensure owner_id is set
      });

      if (error) throw error;

      toast.success("Product added successfully");
      setDialogOpen(false);
      setNewProduct({
        product_type: "lpg",
        brand_id: "",
        product_name: "",
        size: "12kg",
        variant: "Refill",
        company_price: 0,
        distributor_price: 0,
        retail_price: 0,
        package_price: 0,
      });
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to add product");
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      const { error } = await supabase.from("product_prices").update({ is_active: false }).eq("id", id);
      if (error) throw error;
      toast.success("Product deleted");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete product");
    }
  };

  const hasChanges = Object.keys(editedPrices).length > 0;

  // Editable Price Cell Component
  const EditablePriceCell = ({
    product,
    field,
    icon: Icon,
    label,
    bgColor = "bg-muted"
  }: {
    product: ProductPrice;
    field: keyof ProductPrice;
    icon: React.ElementType;
    label: string;
    bgColor?: string;
  }) => {
    const value = getValue(product, field);
    const [localValue, setLocalValue] = useState(value);
    const isEditing = editingCell?.id === product.id && editingCell?.field === field;
    const isModified = editedPrices[product.id]?.[field] !== undefined;

    useEffect(() => {
      setLocalValue(value);
    }, [value]);

    if (isEditing) {
      return (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1">
            <Icon className="h-3 w-3" />
            {label}
          </span>
          <Input
            type="number"
            value={localValue}
            onChange={(e) => setLocalValue(Number(e.target.value))}
            onBlur={() => {
              handlePriceChange(product.id, field, localValue);
              setEditingCell(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handlePriceChange(product.id, field, localValue);
                setEditingCell(null);
              }
              if (e.key === "Escape") {
                setEditingCell(null);
                setLocalValue(value);
              }
            }}
            className="h-8 w-full text-center font-medium"
            autoFocus
            min={0}
          />
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-1">
        <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1">
          <Icon className="h-3 w-3" />
          {label}
        </span>
        <div
          onClick={() => setEditingCell({ id: product.id, field })}
          className={`
            px-2 sm:px-3 py-2 rounded-md cursor-pointer transition-all text-center font-medium text-sm sm:text-base
            ${bgColor} hover:opacity-80
            ${isModified ? "ring-2 ring-primary ring-offset-1" : ""}
          `}
        >
          ৳{value.toLocaleString()}
        </div>
      </div>
    );
  };

  // Brand Price Card Component - Unified Refill & Package display (grouped by normalized name)
  const BrandPriceCard = ({ brand }: { brand: GroupedBrand }) => {
    const brandProducts = getProductsForBrandGroup(brand.brandIds);
    const refillProduct = brandProducts.find(p => p.variant === "Refill");
    const packageProduct = brandProducts.find(p => p.variant === "Package");

    if (!refillProduct && !packageProduct) {
      return (
        <Card className="border-dashed border-2 opacity-60">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <span
                className="h-3 w-3 sm:h-4 sm:w-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: brand.color }}
              />
              {brand.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-2 text-muted-foreground text-xs sm:text-sm">
              <AlertTriangle className="h-4 w-4" />
              <span>No pricing set for {brand.weight}</span>
            </div>
          </CardContent>
        </Card>
      );
    }

    // Use valve-size-specific color for the brand
    const brandColor = getLpgColorByValveSize(brand.name, sizeTab);

    return (
      <Card className="border-border hover:shadow-lg transition-all duration-200">
        {/* Card Header - Brand Name + Weight Badge */}
        <CardHeader className="pb-3 px-4 sm:px-5 pt-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2.5 text-base sm:text-lg font-semibold">
              <span
                className="h-4 w-4 sm:h-5 sm:w-5 rounded-full flex-shrink-0 ring-2 ring-offset-2 ring-offset-background shadow-sm"
                style={{ backgroundColor: brandColor, boxShadow: `0 0 10px ${brandColor}50` }}
                title={`${brand.name} (${sizeTab})`}
              />
              <span className="truncate">{brand.name}</span>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs px-2.5 py-0.5 font-medium">
                {selectedWeight}
              </Badge>
              <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                {sizeTab}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 px-4 sm:px-5 pb-4">
          {/* Refill Section */}
          {refillProduct && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs px-3 py-1 font-medium">
                  Refill
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleDeleteProduct(refillProduct.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-medium">
                    <Building className="h-3.5 w-3.5" />
                    Company
                  </span>
                  <div
                    onClick={() => setEditingCell({ id: refillProduct.id, field: "company_price" })}
                    className={`
                      px-3 py-2.5 rounded-lg cursor-pointer transition-all text-center
                      bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30
                      ${editedPrices[refillProduct.id]?.company_price !== undefined ? "ring-2 ring-primary ring-offset-1" : ""}
                    `}
                  >
                    {editingCell?.id === refillProduct.id && editingCell?.field === "company_price" ? (
                      <Input
                        type="number"
                        defaultValue={getValue(refillProduct, "company_price")}
                        onBlur={(e) => {
                          handlePriceChange(refillProduct.id, "company_price", Number(e.target.value));
                          setEditingCell(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handlePriceChange(refillProduct.id, "company_price", Number((e.target as HTMLInputElement).value));
                            setEditingCell(null);
                          }
                          if (e.key === "Escape") setEditingCell(null);
                        }}
                        className="h-7 text-center font-semibold border-0 bg-transparent p-0"
                        autoFocus
                        min={0}
                      />
                    ) : (
                      <span className="font-semibold text-sm sm:text-base tabular-nums">৳{getValue(refillProduct, "company_price").toLocaleString()}</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-medium">
                    <Truck className="h-3.5 w-3.5" />
                    Wholesale
                  </span>
                  <div
                    onClick={() => setEditingCell({ id: refillProduct.id, field: "distributor_price" })}
                    className={`
                      px-3 py-2.5 rounded-lg cursor-pointer transition-all text-center
                      bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30
                      ${editedPrices[refillProduct.id]?.distributor_price !== undefined ? "ring-2 ring-primary ring-offset-1" : ""}
                    `}
                  >
                    {editingCell?.id === refillProduct.id && editingCell?.field === "distributor_price" ? (
                      <Input
                        type="number"
                        defaultValue={getValue(refillProduct, "distributor_price")}
                        onBlur={(e) => {
                          handlePriceChange(refillProduct.id, "distributor_price", Number(e.target.value));
                          setEditingCell(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handlePriceChange(refillProduct.id, "distributor_price", Number((e.target as HTMLInputElement).value));
                            setEditingCell(null);
                          }
                          if (e.key === "Escape") setEditingCell(null);
                        }}
                        className="h-7 text-center font-semibold border-0 bg-transparent p-0"
                        autoFocus
                        min={0}
                      />
                    ) : (
                      <span className="font-semibold text-sm sm:text-base tabular-nums">৳{getValue(refillProduct, "distributor_price").toLocaleString()}</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-medium">
                    <Store className="h-3.5 w-3.5" />
                    Retail
                  </span>
                  <div
                    onClick={() => setEditingCell({ id: refillProduct.id, field: "retail_price" })}
                    className={`
                      px-3 py-2.5 rounded-lg cursor-pointer transition-all text-center
                      bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30
                      ${editedPrices[refillProduct.id]?.retail_price !== undefined ? "ring-2 ring-primary ring-offset-1" : ""}
                    `}
                  >
                    {editingCell?.id === refillProduct.id && editingCell?.field === "retail_price" ? (
                      <Input
                        type="number"
                        defaultValue={getValue(refillProduct, "retail_price")}
                        onBlur={(e) => {
                          handlePriceChange(refillProduct.id, "retail_price", Number(e.target.value));
                          setEditingCell(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handlePriceChange(refillProduct.id, "retail_price", Number((e.target as HTMLInputElement).value));
                            setEditingCell(null);
                          }
                          if (e.key === "Escape") setEditingCell(null);
                        }}
                        className="h-7 text-center font-semibold border-0 bg-transparent p-0"
                        autoFocus
                        min={0}
                      />
                    ) : (
                      <span className="font-semibold text-sm sm:text-base tabular-nums">৳{getValue(refillProduct, "retail_price").toLocaleString()}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Package Section */}
          {packageProduct && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs px-3 py-1 font-medium">
                  Package (New)
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleDeleteProduct(packageProduct.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-medium">
                    <Building className="h-3.5 w-3.5" />
                    Company
                  </span>
                  <div
                    onClick={() => setEditingCell({ id: packageProduct.id, field: "company_price" })}
                    className={`
                      px-3 py-2.5 rounded-lg cursor-pointer transition-all text-center
                      bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30
                      ${editedPrices[packageProduct.id]?.company_price !== undefined ? "ring-2 ring-primary ring-offset-1" : ""}
                    `}
                  >
                    {editingCell?.id === packageProduct.id && editingCell?.field === "company_price" ? (
                      <Input
                        type="number"
                        defaultValue={getValue(packageProduct, "company_price")}
                        onBlur={(e) => {
                          handlePriceChange(packageProduct.id, "company_price", Number(e.target.value));
                          setEditingCell(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handlePriceChange(packageProduct.id, "company_price", Number((e.target as HTMLInputElement).value));
                            setEditingCell(null);
                          }
                          if (e.key === "Escape") setEditingCell(null);
                        }}
                        className="h-7 text-center font-semibold border-0 bg-transparent p-0"
                        autoFocus
                        min={0}
                      />
                    ) : (
                      <span className="font-semibold text-sm sm:text-base tabular-nums">৳{getValue(packageProduct, "company_price").toLocaleString()}</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-medium">
                    <Truck className="h-3.5 w-3.5" />
                    Wholesale
                  </span>
                  <div
                    onClick={() => setEditingCell({ id: packageProduct.id, field: "distributor_price" })}
                    className={`
                      px-3 py-2.5 rounded-lg cursor-pointer transition-all text-center
                      bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30
                      ${editedPrices[packageProduct.id]?.distributor_price !== undefined ? "ring-2 ring-primary ring-offset-1" : ""}
                    `}
                  >
                    {editingCell?.id === packageProduct.id && editingCell?.field === "distributor_price" ? (
                      <Input
                        type="number"
                        defaultValue={getValue(packageProduct, "distributor_price")}
                        onBlur={(e) => {
                          handlePriceChange(packageProduct.id, "distributor_price", Number(e.target.value));
                          setEditingCell(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handlePriceChange(packageProduct.id, "distributor_price", Number((e.target as HTMLInputElement).value));
                            setEditingCell(null);
                          }
                          if (e.key === "Escape") setEditingCell(null);
                        }}
                        className="h-7 text-center font-semibold border-0 bg-transparent p-0"
                        autoFocus
                        min={0}
                      />
                    ) : (
                      <span className="font-semibold text-sm sm:text-base tabular-nums">৳{getValue(packageProduct, "distributor_price").toLocaleString()}</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-medium">
                    <Store className="h-3.5 w-3.5" />
                    Retail
                  </span>
                  <div
                    onClick={() => setEditingCell({ id: packageProduct.id, field: "retail_price" })}
                    className={`
                      px-3 py-2.5 rounded-lg cursor-pointer transition-all text-center
                      bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30
                      ${editedPrices[packageProduct.id]?.retail_price !== undefined ? "ring-2 ring-primary ring-offset-1" : ""}
                    `}
                  >
                    {editingCell?.id === packageProduct.id && editingCell?.field === "retail_price" ? (
                      <Input
                        type="number"
                        defaultValue={getValue(packageProduct, "retail_price")}
                        onBlur={(e) => {
                          handlePriceChange(packageProduct.id, "retail_price", Number(e.target.value));
                          setEditingCell(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handlePriceChange(packageProduct.id, "retail_price", Number((e.target as HTMLInputElement).value));
                            setEditingCell(null);
                          }
                          if (e.key === "Escape") setEditingCell(null);
                        }}
                        className="h-7 text-center font-semibold border-0 bg-transparent p-0"
                        autoFocus
                        min={0}
                      />
                    ) : (
                      <span className="font-semibold text-sm sm:text-base tabular-nums">৳{getValue(packageProduct, "retail_price").toLocaleString()}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Accessory Price Card (for Stoves and Regulators)
  const AccessoryPriceCard = ({ product }: { product: ProductPrice }) => {
    return (
      <Card className="border-border hover:shadow-md transition-shadow">
        <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-4">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm sm:text-base truncate flex-1">
              {product.product_name}
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 sm:h-8 sm:w-8 text-destructive hover:text-destructive flex-shrink-0"
              onClick={() => handleDeleteProduct(product.id)}
            >
              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {product.size && (
              <Badge variant="secondary" className="text-[10px] sm:text-xs">{product.size}</Badge>
            )}
            {product.variant && (
              <Badge variant="outline" className="text-[10px] sm:text-xs">{product.variant}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-4">
          <div className="grid grid-cols-3 gap-2">
            <EditablePriceCell
              product={product}
              field="company_price"
              icon={Building}
              label="Company"
              bgColor="bg-orange-100 dark:bg-orange-900/30"
            />
            <EditablePriceCell
              product={product}
              field="distributor_price"
              icon={Truck}
              label="Wholesale"
              bgColor="bg-purple-100 dark:bg-purple-900/30"
            />
            <EditablePriceCell
              product={product}
              field="retail_price"
              icon={Store}
              label="Retail"
              bgColor="bg-green-100 dark:bg-green-900/30"
            />
          </div>
        </CardContent>
      </Card>
    );
  };

  // Show error state if initial load failed
  if (loadError && products.length === 0) {
    return (
      <ModuleLoadErrorCard
        title="Failed to Load Pricing"
        message={loadError}
        onRetry={() => fetchData()}
        isTimeout={loadError.includes('timeout') || loadError.includes('long')}
      />
    );
  }

  // Show skeleton during initial load only
  if (initialLoading && products.length === 0) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // Stats for overview
  const lpgProductsCount = products.filter(p => p.product_type === "lpg").length;
  const stoveProductsCount = products.filter(p => p.product_type === "stove").length;
  const regulatorProductsCount = products.filter(p => p.product_type === "regulator").length;
  const totalProductsCount = products.length;

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 sm:pb-6">
      {/* Soft Refresh Indicator */}
      <div className="flex items-center justify-between">
        <SoftRefreshBadge isRefreshing={softLoading} />
      </div>

      {/* Header - Matching Inventory Module */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2 sm:gap-3">
              <DollarSign className="h-5 w-5 sm:h-7 sm:w-7 text-primary" />
              Product Pricing
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Click on any price to edit. Changes are saved with the button.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 sm:h-9 text-xs sm:text-sm gap-1">
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Add Product</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto mx-4">
                <DialogHeader>
                  <DialogTitle className="text-base sm:text-lg">Add New Product</DialogTitle>
                  <DialogDescription className="text-xs sm:text-sm">
                    Add pricing for a new product.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Product Type</Label>
                    <Select
                      value={newProduct.product_type}
                      onValueChange={v => setNewProduct({ ...newProduct, product_type: v, product_name: "" })}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lpg">LPG Cylinder</SelectItem>
                        <SelectItem value="stove">Gas Stove</SelectItem>
                        <SelectItem value="regulator">Regulator</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* LPG Brand Selection */}
                  {newProduct.product_type === "lpg" && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Brand</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => {
                            setUseCustomLpgName(!useCustomLpgName);
                            if (!useCustomLpgName) {
                              setNewProduct({ ...newProduct, brand_id: "", product_name: "" });
                            } else {
                              setCustomLpgName("");
                            }
                          }}
                        >
                          {useCustomLpgName ? "Select from list" : "+ Custom brand"}
                        </Button>
                      </div>
                      {!useCustomLpgName ? (
                        <Select
                          value={newProduct.brand_id}
                          onValueChange={v => {
                            const brand = lpgBrands.find(b => b.id === v);
                            setNewProduct({
                              ...newProduct,
                              brand_id: v,
                              product_name: brand ? `${brand.name} LP Gas ${brand.weight || '12kg'}` : ""
                            });
                          }}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Select brand" />
                          </SelectTrigger>
                          <SelectContent>
                            {lpgBrands.map(brand => (
                              <SelectItem key={brand.id} value={brand.id}>
                                <div className="flex items-center gap-2">
                                  <span
                                    className="h-3 w-3 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: brand.color }}
                                  />
                                  {brand.name} ({brand.weight})
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="space-y-2">
                          <Input
                            value={customLpgName}
                            onChange={(e) => {
                              setCustomLpgName(e.target.value);
                              setNewProduct({
                                ...newProduct,
                                product_name: `${e.target.value} LP Gas ${newProduct.size || '12kg'}`,
                                brand_id: ""
                              });
                            }}
                            placeholder="Enter brand name (e.g., Bashundhara)"
                            className="h-10"
                          />
                          <p className="text-xs text-muted-foreground">
                            This will create a pricing entry without linking to inventory
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Stove Brand Selection */}
                  {newProduct.product_type === "stove" && (
                    <div className="space-y-2">
                      <Label className="text-sm">Brand</Label>
                      <BrandSelect
                        type="stove"
                        value={newProduct.product_name}
                        onChange={(value) => setNewProduct({ ...newProduct, product_name: value })}
                        placeholder="Select or type stove brand..."
                      />
                    </div>
                  )}

                  {/* Regulator Brand Selection */}
                  {newProduct.product_type === "regulator" && (
                    <div className="space-y-2">
                      <Label className="text-sm">Brand</Label>
                      <BrandSelect
                        type="regulator"
                        value={newProduct.product_name}
                        onChange={(value) => setNewProduct({ ...newProduct, product_name: value })}
                        placeholder="Select or type regulator brand..."
                      />
                    </div>
                  )}

                  {newProduct.product_type === "lpg" && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-sm">Size</Label>
                        <Input
                          value={newProduct.size || ""}
                          onChange={e => setNewProduct({ ...newProduct, size: e.target.value })}
                          placeholder="12kg"
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Variant</Label>
                        <Select
                          value={newProduct.variant || "Refill"}
                          onValueChange={v => setNewProduct({ ...newProduct, variant: v })}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Refill">Refill</SelectItem>
                            <SelectItem value="Package">Package</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {(newProduct.product_type === "stove" || newProduct.product_type === "regulator") && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-sm">Size/Type</Label>
                        <Input
                          value={newProduct.size || ""}
                          onChange={e => setNewProduct({ ...newProduct, size: e.target.value })}
                          placeholder={newProduct.product_type === "stove" ? "Single/Double" : "22mm/20mm"}
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Model/Variant</Label>
                        <Input
                          value={newProduct.variant || ""}
                          onChange={e => setNewProduct({ ...newProduct, variant: e.target.value })}
                          placeholder="e.g., GS-102"
                          className="h-10"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm">Company</Label>
                      <Input
                        type="number"
                        value={newProduct.company_price}
                        onChange={e => setNewProduct({ ...newProduct, company_price: Number(e.target.value) })}
                        className="h-10"
                        min={0}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Distributor</Label>
                      <Input
                        type="number"
                        value={newProduct.distributor_price}
                        onChange={e => setNewProduct({ ...newProduct, distributor_price: Number(e.target.value) })}
                        className="h-10"
                        min={0}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Retail</Label>
                      <Input
                        type="number"
                        value={newProduct.retail_price}
                        onChange={e => setNewProduct({ ...newProduct, retail_price: Number(e.target.value) })}
                        className="h-10"
                        min={0}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => setDialogOpen(false)} className="h-9">
                    Cancel
                  </Button>
                  <Button onClick={handleAddProduct} className="h-9">
                    Add Product
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button
              onClick={saveChanges}
              disabled={!hasChanges || isSaving}
              size="sm"
              className="h-8 sm:h-9 text-xs sm:text-sm gap-1 bg-primary hover:bg-primary/90"
            >
              {isSaving ? (
                <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
              ) : (
                <Save className="h-3 w-3 sm:h-4 sm:w-4" />
              )}
              <span className="hidden sm:inline">Save Changes</span>
              <span className="sm:hidden">Save</span>
              {hasChanges && (
                <Badge variant="secondary" className="ml-1 text-[10px] sm:text-xs h-4 sm:h-5 px-1">
                  {Object.keys(editedPrices).length}
                </Badge>
              )}
            </Button>
          </div>
        </div>

        {/* Stats Cards - Matching Inventory Module */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <Card className="border-border bg-card hover:shadow-sm transition-shadow">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10">
                  <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Total Products</p>
                  <p className="text-lg sm:text-xl font-bold text-foreground">{totalProductsCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border bg-card hover:shadow-sm transition-shadow">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-blue-500/10">
                  <Package className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">LPG Prices</p>
                  <p className="text-lg sm:text-xl font-bold text-foreground">{lpgProductsCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border bg-card hover:shadow-sm transition-shadow">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-orange-500/10">
                  <ChefHat className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Stove Prices</p>
                  <p className="text-lg sm:text-xl font-bold text-foreground">{stoveProductsCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border bg-card hover:shadow-sm transition-shadow">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-purple-500/10">
                  <Wrench className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Regulator Prices</p>
                  <p className="text-lg sm:text-xl font-bold text-foreground">{regulatorProductsCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Product Type Tabs - Matching Inventory Module */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-9 sm:h-10">
          <TabsTrigger value="lpg" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2">
            <Package className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">LPG Cylinders</span>
            <span className="sm:hidden">LPG</span>
          </TabsTrigger>
          <TabsTrigger value="stove" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2">
            <ChefHat className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Gas Stoves</span>
            <span className="sm:hidden">Stoves</span>
          </TabsTrigger>
          <TabsTrigger value="regulator" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2">
            <Wrench className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Regulators</span>
            <span className="sm:hidden">Reg.</span>
          </TabsTrigger>
        </TabsList>

        {/* LPG Tab Content */}
        <TabsContent value="lpg" className="space-y-4 mt-4">
          {/* Row 1: Valve Size + Weight Dropdown */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Unified Valve Size Toggle */}
            <div className="flex bg-muted/60 rounded-full p-1 border border-border/50 flex-shrink-0">
              <button
                onClick={() => setSizeTab("22mm")}
                className={`h-9 px-3 sm:px-4 rounded-full font-semibold text-xs sm:text-sm transition-all ${sizeTab === '22mm'
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                22mm
              </button>
              <button
                onClick={() => setSizeTab("20mm")}
                className={`h-9 px-3 sm:px-4 rounded-full font-semibold text-xs sm:text-sm transition-all ${sizeTab === '20mm'
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
                {weightOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Row 2: Search Bar (Full Width - Below for easy mobile access) */}
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search brands..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 h-11 text-base"
            />
          </div>

          {/* Brand Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {getFilteredBrands.map(brand => (
              <BrandPriceCard key={brand.name} brand={brand} />
            ))}
          </div>

          {getFilteredBrands.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12 text-center">
                <Package className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm sm:text-base text-muted-foreground">
                  No brands found for {sizeTab} - {selectedWeight}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Add brands in the LPG Stock module first.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Stoves Tab */}
        <TabsContent value="stove" className="space-y-4 mt-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search stoves..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 h-9 bg-muted/50"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {filteredStoveProducts.map(product => (
              <AccessoryPriceCard key={product.id} product={product} />
            ))}
          </div>

          {filteredStoveProducts.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12 text-center">
                <ChefHat className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm sm:text-base text-muted-foreground">No stove pricing found</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Add stoves using the "Add Product" button.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Regulators Tab */}
        <TabsContent value="regulator" className="space-y-4 mt-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search regulators..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 h-9 bg-muted/50"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {filteredRegulatorProducts.map(product => (
              <AccessoryPriceCard key={product.id} product={product} />
            ))}
          </div>

          {filteredRegulatorProducts.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12 text-center">
                <Wrench className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm sm:text-base text-muted-foreground">No regulator pricing found</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Add regulators using the "Add Product" button.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
