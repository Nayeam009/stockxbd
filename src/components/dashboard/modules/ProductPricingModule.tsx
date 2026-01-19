import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  AlertTriangle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

export const ProductPricingModule = () => {
  const [activeTab, setActiveTab] = useState("lpg");
  const [sizeTab, setSizeTab] = useState<"22mm" | "20mm">("22mm");
  const [selectedWeight, setSelectedWeight] = useState("12kg");
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<ProductPrice[]>([]);
  const [lpgBrands, setLpgBrands] = useState<LpgBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editedPrices, setEditedPrices] = useState<Record<string, Partial<ProductPrice>>>({});
  const [editingCell, setEditingCell] = useState<{id: string, field: string} | null>(null);
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

  const weightOptions = sizeTab === "22mm" ? WEIGHT_OPTIONS_22MM : WEIGHT_OPTIONS_20MM;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [productsRes, brandsRes] = await Promise.all([
        supabase.from("product_prices").select("*").eq("is_active", true).order("product_name"),
        supabase.from("lpg_brands").select("id, name, color, size, weight").eq("is_active", true),
      ]);

      if (productsRes.data) setProducts(productsRes.data);
      if (brandsRes.data) setLpgBrands(brandsRes.data);
    } catch (error) {
      toast.error("Failed to load pricing data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter brands by size and weight for LPG
  const getFilteredBrands = useCallback(() => {
    return lpgBrands.filter(brand => 
      brand.size === sizeTab && 
      brand.weight === selectedWeight
    );
  }, [lpgBrands, sizeTab, selectedWeight]);

  // Get products for a specific brand and variant
  const getProductsForBrand = useCallback((brandId: string) => {
    return products.filter(p => 
      p.product_type === "lpg" && 
      p.brand_id === brandId &&
      p.product_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);

  // Get non-LPG products
  const getFilteredProducts = useCallback((type: string) => {
    return products
      .filter(p => p.product_type === type)
      .filter(p => p.product_name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [products, searchQuery]);

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
      const { error } = await supabase.from("product_prices").insert({
        ...newProduct,
        brand_id: newProduct.brand_id || null,
        created_by: user.user.id,
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

  // Brand Price Card Component
  const BrandPriceCard = ({ brand }: { brand: LpgBrand }) => {
    const brandProducts = getProductsForBrand(brand.id);
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
              <span>No pricing set for {selectedWeight}</span>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="border-border hover:shadow-md transition-shadow">
        <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-lg">
              <span 
                className="h-3 w-3 sm:h-4 sm:w-4 rounded-full flex-shrink-0" 
                style={{ backgroundColor: brand.color }}
              />
              <span className="truncate">{brand.name}</span>
            </CardTitle>
            <Badge variant="outline" className="text-[10px] sm:text-xs">
              {selectedWeight}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 px-3 sm:px-6 pb-3 sm:pb-4">
          {/* Refill Section */}
          {refillProduct && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-300 text-[10px] sm:text-xs">
                  Refill
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive hover:text-destructive"
                  onClick={() => handleDeleteProduct(refillProduct.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <EditablePriceCell 
                  product={refillProduct} 
                  field="company_price" 
                  icon={Building}
                  label="Company"
                  bgColor="bg-orange-100 dark:bg-orange-900/30"
                />
                <EditablePriceCell 
                  product={refillProduct} 
                  field="distributor_price" 
                  icon={Truck}
                  label="Distributor"
                  bgColor="bg-purple-100 dark:bg-purple-900/30"
                />
                <EditablePriceCell 
                  product={refillProduct} 
                  field="retail_price" 
                  icon={Store}
                  label="Retail"
                  bgColor="bg-green-100 dark:bg-green-900/30"
                />
                <EditablePriceCell 
                  product={refillProduct} 
                  field="package_price" 
                  icon={Package}
                  label="Package"
                  bgColor="bg-blue-100 dark:bg-blue-900/30"
                />
              </div>
            </div>
          )}

          {/* Package Section */}
          {packageProduct && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Badge className="bg-green-500/20 text-green-700 dark:text-green-300 text-[10px] sm:text-xs">
                  Package (New)
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive hover:text-destructive"
                  onClick={() => handleDeleteProduct(packageProduct.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <EditablePriceCell 
                  product={packageProduct} 
                  field="company_price" 
                  icon={Building}
                  label="Company"
                  bgColor="bg-orange-100 dark:bg-orange-900/30"
                />
                <EditablePriceCell 
                  product={packageProduct} 
                  field="distributor_price" 
                  icon={Truck}
                  label="Distributor"
                  bgColor="bg-purple-100 dark:bg-purple-900/30"
                />
                <EditablePriceCell 
                  product={packageProduct} 
                  field="retail_price" 
                  icon={Store}
                  label="Retail"
                  bgColor="bg-green-100 dark:bg-green-900/30"
                />
                <EditablePriceCell 
                  product={packageProduct} 
                  field="package_price" 
                  icon={Package}
                  label="Package"
                  bgColor="bg-blue-100 dark:bg-blue-900/30"
                />
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
          <div className="grid grid-cols-2 gap-2">
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
              label="Distributor"
              bgColor="bg-purple-100 dark:bg-purple-900/30"
            />
            <EditablePriceCell 
              product={product} 
              field="retail_price" 
              icon={Store}
              label="Retail"
              bgColor="bg-green-100 dark:bg-green-900/30"
            />
            <EditablePriceCell 
              product={product} 
              field="package_price" 
              icon={Package}
              label="Package"
              bgColor="bg-blue-100 dark:bg-blue-900/30"
            />
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
                    onValueChange={v => setNewProduct({...newProduct, product_type: v})}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lpg">LPG Cylinder</SelectItem>
                      <SelectItem value="stove">Gas Stove</SelectItem>
                      <SelectItem value="regulator">Regulator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {newProduct.product_type === "lpg" && (
                  <div className="space-y-2">
                    <Label className="text-sm">Brand</Label>
                    <Select 
                      value={newProduct.brand_id} 
                      onValueChange={v => setNewProduct({...newProduct, brand_id: v})}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select brand" />
                      </SelectTrigger>
                      <SelectContent>
                        {lpgBrands.map(brand => (
                          <SelectItem key={brand.id} value={brand.id}>
                            <div className="flex items-center gap-2">
                              <span 
                                className="h-3 w-3 rounded-full" 
                                style={{ backgroundColor: brand.color }}
                              />
                              {brand.name} ({brand.weight})
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-sm">Product Name</Label>
                  <Input 
                    value={newProduct.product_name}
                    onChange={e => setNewProduct({...newProduct, product_name: e.target.value})}
                    placeholder="e.g., Bashundhara LP Gas 12kg Refill"
                    className="h-9"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Size</Label>
                    <Input 
                      value={newProduct.size || ""}
                      onChange={e => setNewProduct({...newProduct, size: e.target.value})}
                      placeholder="12kg"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Variant</Label>
                    <Select 
                      value={newProduct.variant || "Refill"} 
                      onValueChange={v => setNewProduct({...newProduct, variant: v})}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Refill">Refill</SelectItem>
                        <SelectItem value="Package">Package</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Company Price</Label>
                    <Input 
                      type="number"
                      value={newProduct.company_price}
                      onChange={e => setNewProduct({...newProduct, company_price: Number(e.target.value)})}
                      className="h-9"
                      min={0}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Distributor Price</Label>
                    <Input 
                      type="number"
                      value={newProduct.distributor_price}
                      onChange={e => setNewProduct({...newProduct, distributor_price: Number(e.target.value)})}
                      className="h-9"
                      min={0}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Retail Price</Label>
                    <Input 
                      type="number"
                      value={newProduct.retail_price}
                      onChange={e => setNewProduct({...newProduct, retail_price: Number(e.target.value)})}
                      className="h-9"
                      min={0}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Package Price</Label>
                    <Input 
                      type="number"
                      value={newProduct.package_price}
                      onChange={e => setNewProduct({...newProduct, package_price: Number(e.target.value)})}
                      className="h-9"
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
            <span className="hidden sm:inline">Save</span>
            {hasChanges && (
              <Badge variant="secondary" className="ml-1 text-[10px] sm:text-xs h-4 sm:h-5 px-1">
                {Object.keys(editedPrices).length}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Product Type Tabs */}
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
          {/* Size Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <Tabs value={sizeTab} onValueChange={(v) => setSizeTab(v as "22mm" | "20mm")} className="w-full sm:w-auto">
              <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:inline-grid h-8">
                <TabsTrigger value="22mm" className="text-xs sm:text-sm h-7">22mm</TabsTrigger>
                <TabsTrigger value="20mm" className="text-xs sm:text-sm h-7">20mm</TabsTrigger>
              </TabsList>
            </Tabs>
            
            {/* Weight Selector */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Weight:</span>
              <div className="flex gap-1">
                {weightOptions.map(option => (
                  <Button
                    key={option.value}
                    variant={selectedWeight === option.value ? "default" : "outline"}
                    size="sm"
                    className="h-7 px-2 sm:px-3 text-xs whitespace-nowrap"
                    onClick={() => setSelectedWeight(option.value)}
                  >
                    {option.shortLabel}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search brands..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 h-9 bg-muted/50"
            />
          </div>

          {/* Brand Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {getFilteredBrands().map(brand => (
              <BrandPriceCard key={brand.id} brand={brand} />
            ))}
          </div>

          {getFilteredBrands().length === 0 && (
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
            {getFilteredProducts("stove").map(product => (
              <AccessoryPriceCard key={product.id} product={product} />
            ))}
          </div>

          {getFilteredProducts("stove").length === 0 && (
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
            {getFilteredProducts("regulator").map(product => (
              <AccessoryPriceCard key={product.id} product={product} />
            ))}
          </div>

          {getFilteredProducts("regulator").length === 0 && (
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
