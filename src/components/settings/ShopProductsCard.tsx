import { useState, useEffect } from "react";
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
  XCircle
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

export const ShopProductsCard = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [shopId, setShopId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("lpg");
  
  const [lpgBrands, setLpgBrands] = useState<LPGBrand[]>([]);
  const [stoves, setStoves] = useState<Stove[]>([]);
  const [regulators, setRegulators] = useState<Regulator[]>([]);
  const [products, setProducts] = useState<ShopProduct[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get shop profile
      const { data: shop } = await supabase
        .from('shop_profiles')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (!shop) {
        setLoading(false);
        return;
      }

      setShopId(shop.id);

      // Fetch all inventory types in parallel
      const [lpgResult, stovesResult, regulatorsResult, existingProductsResult] = await Promise.all([
        supabase.from('lpg_brands').select('id, name, size, weight, refill_cylinder, package_cylinder').order('name'),
        supabase.from('stoves').select('id, brand, model, burners, quantity').order('brand'),
        supabase.from('regulators').select('id, brand, type, quantity').order('brand'),
        supabase.from('shop_products').select('*').eq('shop_id', shop.id)
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
          shop_id: shop.id,
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
          shop_id: shop.id,
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
          shop_id: shop.id,
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
          shop_id: shop.id,
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
    if (type === 'lpg') {
      return products.filter(p => p.product_type === 'lpg_refill' || p.product_type === 'lpg_package');
    }
    return products.filter(p => p.product_type === type);
  };

  const getProductStats = () => {
    const listed = products.filter(p => p.price > 0 && p.is_available).length;
    const total = products.filter(p => p.price > 0).length;
    return { listed, total };
  };

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!shopId) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-10 w-10 mx-auto text-amber-500 mb-3" />
          <p className="font-medium">Create your shop first</p>
          <p className="text-sm text-muted-foreground">
            Set up your shop profile above before listing products
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
          <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No products in inventory</p>
          <p className="text-xs">Add items to your inventory to list them here</p>
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
              <div className="flex items-center gap-2 font-medium text-sm sticky top-0 bg-card py-1">
                <Flame className="h-4 w-4 text-orange-500" />
                {brandName} ({brandProducts[0]?.weight})
                {brandProducts[0]?.stock !== undefined && (
                  <Badge variant="outline" className="text-xs">
                    Stock: {brandProducts.reduce((sum, p) => sum + (p.stock || 0), 0)}
                  </Badge>
                )}
              </div>
              
              <div className="grid gap-2 pl-6">
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
                      <Badge variant="secondary" className="text-xs shrink-0 min-w-[60px] justify-center">
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
                          className="h-9 w-24"
                        />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {product.is_available && product.price > 0 ? (
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground" />
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
                    <Badge variant="outline" className="text-[10px] h-4">
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
                  className="h-9 w-24"
                />
              </div>
              
              <div className="flex items-center gap-2">
                {product.is_available && product.price > 0 ? (
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-muted-foreground" />
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
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <CardTitle className="text-foreground">Marketplace Products</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {stats.listed}/{stats.total} Listed
            </Badge>
            <Button variant="ghost" size="icon" onClick={handleSyncInventory} disabled={syncing}>
              <RefreshCcw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        <CardDescription>
          Set prices and availability for your inventory items on the marketplace
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="lpg" className="gap-1">
              <Flame className="h-4 w-4" />
              <span className="hidden sm:inline">LPG</span>
              <span className="text-xs opacity-60">({lpgProducts.length})</span>
            </TabsTrigger>
            <TabsTrigger value="stove" className="gap-1">
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">Stoves</span>
              <span className="text-xs opacity-60">({stoveProducts.length})</span>
            </TabsTrigger>
            <TabsTrigger value="regulator" className="gap-1">
              <Settings2 className="h-4 w-4" />
              <span className="hidden sm:inline">Regulators</span>
              <span className="text-xs opacity-60">({regulatorProducts.length})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lpg" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              {renderProductList(lpgProducts, true)}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="stove" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              {renderProductList(stoveProducts)}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="regulator" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              {renderProductList(regulatorProducts)}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <Button onClick={handleSaveAll} disabled={saving} className="w-full">
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save All Products
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Products with price ৳0 won't be listed • Toggle to enable/disable individual products
        </p>
      </CardContent>
    </Card>
  );
};
