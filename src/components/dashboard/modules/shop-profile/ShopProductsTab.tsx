import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Package, 
  Save, 
  Loader2, 
  Flame,
  RefreshCcw,
  AlertCircle,
  Zap,
  Settings2,
  CheckCircle,
  XCircle,
  Search
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LPGBrand {
  id: string;
  name: string;
  size: string;
  weight: string;
  refill_cylinder: number;
  package_cylinder: number;
}

interface Stove {
  id: string;
  brand: string;
  model: string;
  burners: number;
  quantity: number;
}

interface Regulator {
  id: string;
  brand: string;
  type: string;
  quantity: number;
}

interface ShopProduct {
  id?: string;
  shop_id: string;
  lpg_brand_id?: string;
  product_type: string;
  price: number;
  is_available: boolean;
  brand_name?: string;
  weight?: string;
  stock?: number;
}

interface ShopProductsTabProps {
  shopId: string | null;
}

export const ShopProductsTab = ({ shopId }: ShopProductsTabProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState("lpg");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [lpgBrands, setLpgBrands] = useState<LPGBrand[]>([]);
  const [stoves, setStoves] = useState<Stove[]>([]);
  const [regulators, setRegulators] = useState<Regulator[]>([]);
  const [products, setProducts] = useState<ShopProduct[]>([]);

  useEffect(() => {
    if (shopId) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [shopId]);

  const fetchData = async () => {
    if (!shopId) return;
    
    setLoading(true);
    try {
      // Fetch all inventory types in parallel
      const [lpgResult, stovesResult, regulatorsResult, existingProductsResult] = await Promise.all([
        supabase.from('lpg_brands').select('id, name, size, weight, refill_cylinder, package_cylinder').order('name'),
        supabase.from('stoves').select('id, brand, model, burners, quantity').order('brand'),
        supabase.from('regulators').select('id, brand, type, quantity').order('brand'),
        supabase.from('shop_products').select('*').eq('shop_id', shopId)
      ]);

      if (lpgResult.data) setLpgBrands(lpgResult.data);
      if (stovesResult.data) setStoves(stovesResult.data);
      if (regulatorsResult.data) setRegulators(regulatorsResult.data);

      // Build products list from all inventory
      const productList: ShopProduct[] = [];
      const existingProducts = existingProductsResult.data || [];

      // LPG Products
      lpgResult.data?.forEach(brand => {
        // Refill
        const existingRefill = existingProducts.find(
          p => p.brand_name === brand.name && p.product_type === 'lpg_refill'
        );
        productList.push({
          id: existingRefill?.id,
          shop_id: shopId,
          lpg_brand_id: brand.id,
          product_type: 'lpg_refill',
          price: existingRefill?.price || 0,
          is_available: existingRefill?.is_available || false,
          brand_name: brand.name,
          weight: brand.weight,
          stock: brand.refill_cylinder
        });

        // Package
        const existingPackage = existingProducts.find(
          p => p.brand_name === brand.name && p.product_type === 'lpg_package'
        );
        productList.push({
          id: existingPackage?.id,
          shop_id: shopId,
          lpg_brand_id: brand.id,
          product_type: 'lpg_package',
          price: existingPackage?.price || 0,
          is_available: existingPackage?.is_available || false,
          brand_name: brand.name,
          weight: brand.weight,
          stock: brand.package_cylinder
        });
      });

      // Stove Products
      stovesResult.data?.forEach(stove => {
        const productName = `${stove.brand} ${stove.model}`;
        const existing = existingProducts.find(
          p => p.brand_name === productName && p.product_type === 'stove'
        );
        productList.push({
          id: existing?.id,
          shop_id: shopId,
          product_type: 'stove',
          price: existing?.price || 0,
          is_available: existing?.is_available || false,
          brand_name: productName,
          weight: `${stove.burners} Burner`,
          stock: stove.quantity
        });
      });

      // Regulator Products
      regulatorsResult.data?.forEach(regulator => {
        const productName = `${regulator.brand} ${regulator.type}`;
        const existing = existingProducts.find(
          p => p.brand_name === productName && p.product_type === 'regulator'
        );
        productList.push({
          id: existing?.id,
          shop_id: shopId,
          product_type: 'regulator',
          price: existing?.price || 0,
          is_available: existing?.is_available || false,
          brand_name: productName,
          weight: regulator.type,
          stock: regulator.quantity
        });
      });

      setProducts(productList);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProduct = (index: number, field: 'price' | 'is_available', value: number | boolean) => {
    setProducts(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSyncInventory = async () => {
    setSyncing(true);
    await fetchData();
    setSyncing(false);
    toast({ title: "Inventory synced successfully!" });
  };

  const handleToggleAll = (productType: string, enable: boolean) => {
    setProducts(prev => prev.map(p => 
      p.product_type.includes(productType) && p.price > 0
        ? { ...p, is_available: enable }
        : p
    ));
  };

  const handleSaveAll = async () => {
    if (!shopId) {
      toast({ 
        title: "Shop not found", 
        description: "Please create your shop profile first",
        variant: "destructive" 
      });
      return;
    }

    setSaving(true);
    try {
      const productsToSave = products.filter(p => p.price > 0);
      
      for (const product of productsToSave) {
        const productData = {
          shop_id: shopId,
          lpg_brand_id: product.lpg_brand_id || null,
          product_type: product.product_type,
          price: product.price,
          is_available: product.is_available,
          brand_name: product.brand_name,
          weight: product.weight,
          updated_at: new Date().toISOString()
        };

        if (product.id) {
          await supabase.from('shop_products').update(productData).eq('id', product.id);
        } else {
          const { data } = await supabase.from('shop_products').insert(productData).select().single();
          if (data) {
            setProducts(prev => prev.map(p => 
              p.brand_name === product.brand_name && p.product_type === product.product_type
                ? { ...p, id: data.id }
                : p
            ));
          }
        }
      }

      toast({ title: "Products updated successfully!" });
    } catch (error: any) {
      console.error('Error saving products:', error);
      toast({ title: "Failed to save products", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const getProductsByType = (type: string) => {
    let filtered = type === 'lpg' 
      ? products.filter(p => p.product_type === 'lpg_refill' || p.product_type === 'lpg_package')
      : products.filter(p => p.product_type === type);
    
    if (searchQuery) {
      filtered = filtered.filter(p => 
        p.brand_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  };

  const getProductStats = () => {
    const listed = products.filter(p => p.price > 0 && p.is_available).length;
    const total = products.filter(p => p.price > 0).length;
    return { listed, total };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!shopId) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Create Your Shop First</h3>
          <p className="text-muted-foreground text-center max-w-md">
            Set up your shop profile in the "Shop Info" tab before listing products
          </p>
        </CardContent>
      </Card>
    );
  }

  const stats = getProductStats();
  const lpgProducts = getProductsByType('lpg');
  const stoveProducts = getProductsByType('stove');
  const regulatorProducts = getProductsByType('regulator');

  const renderProductList = (productList: ShopProduct[], groupByBrand: boolean = false) => {
    if (productList.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <Package className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="font-medium">No products found</p>
          <p className="text-sm">Add items to your inventory to list them here</p>
        </div>
      );
    }

    if (groupByBrand) {
      const groups: Record<string, ShopProduct[]> = {};
      productList.forEach(p => {
        const key = p.brand_name?.split(' ')[0] || 'Other';
        if (!groups[key]) groups[key] = [];
        groups[key].push(p);
      });

      return (
        <div className="space-y-4">
          {Object.entries(groups).map(([brandName, brandProducts]) => (
            <div key={brandName} className="space-y-2">
              <div className="flex items-center gap-2 font-medium text-sm sticky top-0 bg-background py-2 border-b">
                <Flame className="h-4 w-4 text-orange-500" />
                {brandName} ({brandProducts[0]?.weight})
                {brandProducts[0]?.stock !== undefined && (
                  <Badge variant="outline" className="text-xs ml-auto">
                    Stock: {brandProducts.reduce((sum, p) => sum + (p.stock || 0), 0)}
                  </Badge>
                )}
              </div>
              
              <div className="grid gap-2">
                {brandProducts.map((product) => {
                  const globalIdx = products.findIndex(
                    p => p.brand_name === product.brand_name && p.product_type === product.product_type
                  );
                  return (
                    <div 
                      key={`${product.brand_name}-${product.product_type}`}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                        product.is_available && product.price > 0 
                          ? 'bg-emerald-500/5 border-emerald-500/20' 
                          : 'bg-muted/30 border-border'
                      }`}
                    >
                      <Badge variant="secondary" className="text-xs shrink-0 min-w-[70px] justify-center">
                        {product.product_type === 'lpg_refill' ? 'Refill' : 'Package'}
                      </Badge>
                      
                      <div className="flex-1 flex items-center gap-2">
                        <span className="text-muted-foreground text-sm">৳</span>
                        <Input
                          type="number"
                          min={0}
                          placeholder="Price"
                          value={product.price || ''}
                          onChange={(e) => updateProduct(globalIdx, 'price', parseInt(e.target.value) || 0)}
                          className="h-10 w-28"
                        />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {product.is_available && product.price > 0 ? (
                          <CheckCircle className="h-5 w-5 text-emerald-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-muted-foreground" />
                        )}
                        <Switch
                          checked={product.is_available}
                          onCheckedChange={(checked) => updateProduct(globalIdx, 'is_available', checked)}
                          disabled={product.price <= 0}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {productList.map((product) => {
          const globalIdx = products.findIndex(
            p => p.brand_name === product.brand_name && p.product_type === product.product_type
          );
          return (
            <div 
              key={`${product.brand_name}-${product.product_type}`}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                product.is_available && product.price > 0 
                  ? 'bg-emerald-500/5 border-emerald-500/20' 
                  : 'bg-muted/30 border-border'
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{product.brand_name}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{product.weight}</span>
                  {product.stock !== undefined && (
                    <Badge variant="outline" className="text-[10px] h-5">
                      Stock: {product.stock}
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm">৳</span>
                <Input
                  type="number"
                  min={0}
                  placeholder="Price"
                  value={product.price || ''}
                  onChange={(e) => updateProduct(globalIdx, 'price', parseInt(e.target.value) || 0)}
                  className="h-10 w-28"
                />
              </div>
              
              <div className="flex items-center gap-2">
                {product.is_available && product.price > 0 ? (
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-muted-foreground" />
                )}
                <Switch
                  checked={product.is_available}
                  onCheckedChange={(checked) => updateProduct(globalIdx, 'is_available', checked)}
                  disabled={product.price <= 0}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/15 flex items-center justify-center">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold">{stats.listed} / {stats.total}</p>
              <p className="text-sm text-muted-foreground">Products Listed</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={handleSyncInventory} disabled={syncing} className="gap-2 h-10">
              <RefreshCcw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              Sync Inventory
            </Button>
            <Button onClick={handleSaveAll} disabled={saving} className="gap-2 h-10 flex-1 sm:flex-none">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save All
            </Button>
          </div>
        </div>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-11"
        />
      </div>

      {/* Product Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="lpg" className="gap-2 h-11">
            <Flame className="h-4 w-4" />
            <span className="hidden sm:inline">LPG</span>
            <Badge variant="secondary" className="ml-1">{lpgProducts.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="stove" className="gap-2 h-11">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">Stoves</span>
            <Badge variant="secondary" className="ml-1">{stoveProducts.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="regulator" className="gap-2 h-11">
            <Settings2 className="h-4 w-4" />
            <span className="hidden sm:inline">Regulators</span>
            <Badge variant="secondary" className="ml-1">{regulatorProducts.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lpg" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">LPG Cylinders</CardTitle>
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleToggleAll('lpg', true)}
                    className="text-xs h-8"
                  >
                    Enable All
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleToggleAll('lpg', false)}
                    className="text-xs h-8"
                  >
                    Disable All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[450px] pr-4">
                {renderProductList(lpgProducts, true)}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stove" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Gas Stoves</CardTitle>
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleToggleAll('stove', true)}
                    className="text-xs h-8"
                  >
                    Enable All
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleToggleAll('stove', false)}
                    className="text-xs h-8"
                  >
                    Disable All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[450px] pr-4">
                {renderProductList(stoveProducts)}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="regulator" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Regulators</CardTitle>
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleToggleAll('regulator', true)}
                    className="text-xs h-8"
                  >
                    Enable All
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleToggleAll('regulator', false)}
                    className="text-xs h-8"
                  >
                    Disable All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[450px] pr-4">
                {renderProductList(regulatorProducts)}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <p className="text-sm text-muted-foreground text-center">
        Set a price and enable the toggle to list products on your marketplace shop
      </p>
    </div>
  );
};
