import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  Package, 
  Save, 
  Loader2, 
  Flame,
  RefreshCcw,
  AlertCircle
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface LPGBrand {
  id: string;
  name: string;
  size: string;
  weight: string;
  refill_cylinder: number;
  package_cylinder: number;
}

interface ShopProduct {
  id?: string;
  shop_id: string;
  lpg_brand_id: string;
  product_type: string;
  price: number;
  is_available: boolean;
  brand_name?: string;
  weight?: string;
}

export const ShopProductsCard = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [shopId, setShopId] = useState<string | null>(null);
  const [lpgBrands, setLpgBrands] = useState<LPGBrand[]>([]);
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

      // Get LPG brands
      const { data: brands } = await supabase
        .from('lpg_brands')
        .select('id, name, size, weight, refill_cylinder, package_cylinder')
        .order('name');

      if (brands) {
        setLpgBrands(brands);
      }

      // Get existing shop products
      const { data: existingProducts } = await supabase
        .from('shop_products')
        .select('*')
        .eq('shop_id', shop.id);

      // Build products list from brands
      const productList: ShopProduct[] = [];
      
      brands?.forEach(brand => {
        // Refill product
        const existingRefill = existingProducts?.find(
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
          weight: brand.weight
        });

        // Package product
        const existingPackage = existingProducts?.find(
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
          weight: brand.weight
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
      // Only save products that have a price set
      const productsToSave = products.filter(p => p.price > 0);
      
      for (const product of productsToSave) {
        const productData = {
          shop_id: shopId,
          lpg_brand_id: product.lpg_brand_id,
          product_type: product.product_type,
          price: product.price,
          is_available: product.is_available,
          brand_name: product.brand_name,
          weight: product.weight,
          updated_at: new Date().toISOString()
        };

        if (product.id) {
          await supabase
            .from('shop_products')
            .update(productData)
            .eq('id', product.id);
        } else {
          const { data } = await supabase
            .from('shop_products')
            .insert(productData)
            .select()
            .single();
          
          if (data) {
            // Update local state with new ID
            setProducts(prev => prev.map(p => 
              p.lpg_brand_id === product.lpg_brand_id && p.product_type === product.product_type
                ? { ...p, id: data.id }
                : p
            ));
          }
        }
      }

      toast({ title: "Products updated successfully!" });
    } catch (error: any) {
      console.error('Error saving products:', error);
      toast({ 
        title: "Failed to save products", 
        description: error.message,
        variant: "destructive" 
      });
    } finally {
      setSaving(false);
    }
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

  if (lpgBrands.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-6 text-center">
          <Package className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">No LPG brands found</p>
          <p className="text-sm text-muted-foreground">
            Add LPG brands in your inventory to list them here
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group by brand
  const brandGroups: Record<string, ShopProduct[]> = {};
  products.forEach(p => {
    if (!brandGroups[p.brand_name!]) {
      brandGroups[p.brand_name!] = [];
    }
    brandGroups[p.brand_name!].push(p);
  });

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <CardTitle className="text-foreground">Marketplace Products</CardTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={fetchData}>
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>
          Set prices and availability for products on the LPG Community marketplace
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Products List */}
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
          {Object.entries(brandGroups).map(([brandName, brandProducts]) => (
            <div key={brandName} className="space-y-2">
              <div className="flex items-center gap-2 font-medium text-sm">
                <Flame className="h-4 w-4 text-orange-500" />
                {brandName} ({brandProducts[0]?.weight})
              </div>
              
              <div className="grid gap-2 pl-6">
                {brandProducts.map((product, idx) => {
                  const globalIdx = products.findIndex(
                    p => p.lpg_brand_id === product.lpg_brand_id && p.product_type === product.product_type
                  );
                  return (
                    <div 
                      key={`${product.lpg_brand_id}-${product.product_type}`}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
                    >
                      <Badge variant="secondary" className="text-xs shrink-0">
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
                        <span className="text-xs text-muted-foreground">
                          {product.is_available ? 'Available' : 'Unavailable'}
                        </span>
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

        {/* Save Button */}
        <Button 
          onClick={handleSaveAll} 
          disabled={saving}
          className="w-full"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save All Products
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Products with price ৳0 won't be listed on the marketplace
        </p>
      </CardContent>
    </Card>
  );
};
