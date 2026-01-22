import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  ChefHat,
  Gauge,
  Search,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getLpgBrandColor } from "@/lib/brandConstants";
import { useNavigate } from "react-router-dom";

// Interfaces
interface LPGBrand {
  id: string;
  name: string;
  color: string;
  size: string;
  weight: string;
  refill_cylinder: number;
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

interface ProductPrice {
  id: string;
  product_type: string;
  brand_name: string;
  size?: string;
  variant?: string;
  retail_price: number;
}

interface ShopProduct {
  id?: string;
  shop_id: string;
  lpg_brand_id?: string;
  product_type: 'lpg_refill' | 'stove' | 'regulator';
  price: number;
  is_available: boolean;
  brand_name: string;
  weight?: string;
  size?: string;
  model?: string;
  stock: number;
  retail_price: number;
  brand_color?: string;
  burners?: number;
}

interface ShopProductsTabProps {
  shopId: string | null;
}

export const ShopProductsTab = ({ shopId }: ShopProductsTabProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState("lpg");
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<ShopProduct[]>([]);

  const fetchData = useCallback(async () => {
    if (!shopId) return;
    
    setLoading(true);
    try {
      // Fetch all inventory types and prices in parallel
      const [lpgResult, stovesResult, regulatorsResult, pricesResult, existingProductsResult] = await Promise.all([
        supabase.from('lpg_brands').select('id, name, color, size, weight, refill_cylinder').eq('is_active', true).gt('refill_cylinder', 0).order('name'),
        supabase.from('stoves').select('id, brand, model, burners, quantity').eq('is_active', true).gt('quantity', 0).order('brand'),
        supabase.from('regulators').select('id, brand, type, quantity').eq('is_active', true).gt('quantity', 0).order('brand'),
        supabase.from('product_prices').select('*').eq('is_active', true),
        supabase.from('shop_products').select('*').eq('shop_id', shopId)
      ]);

      const productList: ShopProduct[] = [];
      const existingProducts = existingProductsResult.data || [];
      const prices = pricesResult.data || [];

      // LPG Products - ONLY REFILL with stock > 0
      lpgResult.data?.forEach(brand => {
        const price = prices.find(p => 
          p.product_type === 'lpg' && 
          p.product_name?.toLowerCase().includes(brand.name.toLowerCase()) &&
          p.variant === 'Refill'
        );
        const existing = existingProducts.find(
          p => p.brand_name === brand.name && p.product_type === 'lpg_refill'
        );
        
        productList.push({
          id: existing?.id,
          shop_id: shopId,
          lpg_brand_id: brand.id,
          product_type: 'lpg_refill',
          price: existing?.price || 0,
          is_available: existing?.is_available || false,
          brand_name: brand.name,
          weight: brand.weight,
          size: brand.size,
          stock: brand.refill_cylinder,
          retail_price: price?.retail_price || 0,
          brand_color: brand.color || getLpgBrandColor(brand.name)
        });
      });

      // Stove Products - only with stock > 0
      stovesResult.data?.forEach(stove => {
        const productName = `${stove.brand} ${stove.model}`;
        const price = prices.find(p => 
          p.product_type === 'stove' && 
          p.product_name?.toLowerCase().includes(stove.brand.toLowerCase())
        );
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
          model: stove.model,
          stock: stove.quantity,
          retail_price: price?.retail_price || 0,
          burners: stove.burners
        });
      });

      // Regulator Products - only with stock > 0
      regulatorsResult.data?.forEach(regulator => {
        const productName = `${regulator.brand} ${regulator.type}`;
        const price = prices.find(p => 
          p.product_type === 'regulator' && 
          p.product_name?.toLowerCase().includes(regulator.brand.toLowerCase())
        );
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
          size: regulator.type,
          stock: regulator.quantity,
          retail_price: price?.retail_price || 0
        });
      });

      setProducts(productList);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: "Failed to load products", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    if (shopId) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [shopId, fetchData]);

  // Real-time sync
  useEffect(() => {
    if (!shopId) return;
    
    const channels = [
      supabase.channel('shop-products-lpg').on('postgres_changes', 
        { event: '*', schema: 'public', table: 'lpg_brands' }, 
        () => fetchData()
      ).subscribe(),
      supabase.channel('shop-products-stoves').on('postgres_changes', 
        { event: '*', schema: 'public', table: 'stoves' }, 
        () => fetchData()
      ).subscribe(),
      supabase.channel('shop-products-regulators').on('postgres_changes', 
        { event: '*', schema: 'public', table: 'regulators' }, 
        () => fetchData()
      ).subscribe(),
    ];
    
    return () => channels.forEach(ch => supabase.removeChannel(ch));
  }, [shopId, fetchData]);

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

  // Filtered products by type and search
  const getProductsByType = useMemo(() => {
    return (type: string) => {
      let filtered = products.filter(p => p.product_type === type);
      if (searchQuery) {
        filtered = filtered.filter(p => 
          p.brand_name?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      return filtered;
    };
  }, [products, searchQuery]);

  const lpgProducts = getProductsByType('lpg_refill');
  const stoveProducts = getProductsByType('stove');
  const regulatorProducts = getProductsByType('regulator');

  const stats = useMemo(() => ({
    listed: products.filter(p => p.price > 0 && p.is_available).length,
    total: products.length
  }), [products]);

  // ==================== CARD COMPONENTS ====================

  // LPG Refill Card - Inventory Style
  const LpgRefillCard = ({ product, index }: { product: ShopProduct; index: number }) => {
    const globalIdx = products.findIndex(p => p.brand_name === product.brand_name && p.product_type === product.product_type);
    const isEnabled = product.is_available && product.price > 0;
    
    return (
      <Card className={`border-border hover:shadow-md transition-shadow ${isEnabled ? 'border-primary/30 bg-primary/5' : ''}`}>
        <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-4 pt-3 sm:pt-4">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <span 
                className="h-3 w-3 sm:h-4 sm:w-4 rounded-full flex-shrink-0" 
                style={{ backgroundColor: product.brand_color || '#22c55e' }} 
              />
              <span className="truncate font-semibold">{product.brand_name}</span>
            </CardTitle>
            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] sm:text-xs">
              Stock: {product.stock}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            <Badge variant="outline" className="text-[10px] sm:text-xs">
              {product.weight}
            </Badge>
            <Badge variant="outline" className="text-[10px] sm:text-xs">
              {product.size}
            </Badge>
            <Badge variant="secondary" className="text-[10px] sm:text-xs bg-blue-500/10 text-blue-600 border-blue-500/30">
              Refill
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-3">
          {/* Retail Price Reference */}
          {product.retail_price > 0 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
              <span>Retail Price</span>
              <span className="font-medium text-foreground">৳{product.retail_price.toLocaleString()}</span>
            </div>
          )}
          
          {/* Your Price Input */}
          <div className="space-y-1.5">
            <label className="text-[10px] sm:text-xs text-muted-foreground">Your Price</label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">৳</span>
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={product.price || ''}
                  onChange={(e) => updateProduct(globalIdx, 'price', parseInt(e.target.value) || 0)}
                  className="h-11 pl-8 text-base font-medium"
                />
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50">
                {isEnabled ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-muted-foreground" />
                )}
                <Switch
                  checked={product.is_available}
                  onCheckedChange={(checked) => updateProduct(globalIdx, 'is_available', checked)}
                  disabled={product.price <= 0}
                  className="data-[state=checked]:bg-emerald-500"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Stove Card - Inventory Style with Model Number
  const StoveCard = ({ product, index }: { product: ShopProduct; index: number }) => {
    const globalIdx = products.findIndex(p => p.brand_name === product.brand_name && p.product_type === product.product_type);
    const isEnabled = product.is_available && product.price > 0;
    const brandOnly = product.brand_name.split(' ')[0];
    
    return (
      <Card className={`border-border hover:shadow-md transition-shadow ${isEnabled ? 'border-primary/30 bg-primary/5' : ''}`}>
        <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-4 pt-3 sm:pt-4">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <ChefHat className="h-4 w-4 text-orange-500 flex-shrink-0" />
              <span className="truncate font-semibold">{brandOnly}</span>
            </CardTitle>
            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] sm:text-xs">
              Stock: {product.stock}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            <Badge variant="outline" className="text-[10px] sm:text-xs">
              <Flame className="h-3 w-3 mr-1" />
              {product.burners === 1 ? "Single" : "Double"} Burner
            </Badge>
            {product.model && (
              <Badge className="text-[10px] sm:text-xs bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30">
                Model: {product.model}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-3">
          {/* Retail Price Reference */}
          {product.retail_price > 0 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
              <span>Retail Price</span>
              <span className="font-medium text-foreground">৳{product.retail_price.toLocaleString()}</span>
            </div>
          )}
          
          {/* Your Price Input */}
          <div className="space-y-1.5">
            <label className="text-[10px] sm:text-xs text-muted-foreground">Your Price</label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">৳</span>
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={product.price || ''}
                  onChange={(e) => updateProduct(globalIdx, 'price', parseInt(e.target.value) || 0)}
                  className="h-11 pl-8 text-base font-medium"
                />
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50">
                {isEnabled ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-muted-foreground" />
                )}
                <Switch
                  checked={product.is_available}
                  onCheckedChange={(checked) => updateProduct(globalIdx, 'is_available', checked)}
                  disabled={product.price <= 0}
                  className="data-[state=checked]:bg-emerald-500"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Regulator Card - Inventory Style with Valve Size
  const RegulatorCard = ({ product, index }: { product: ShopProduct; index: number }) => {
    const globalIdx = products.findIndex(p => p.brand_name === product.brand_name && p.product_type === product.product_type);
    const isEnabled = product.is_available && product.price > 0;
    const isSize22 = product.size === "22mm";
    const brandOnly = product.brand_name.split(' ')[0];
    
    return (
      <Card className={`border-border hover:shadow-md transition-shadow ${isEnabled ? 'border-primary/30 bg-primary/5' : ''}`}>
        <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-4 pt-3 sm:pt-4">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Gauge className={`h-4 w-4 flex-shrink-0 ${isSize22 ? "text-violet-500" : "text-cyan-500"}`} />
              <span className="truncate font-semibold">{brandOnly}</span>
            </CardTitle>
            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] sm:text-xs">
              Stock: {product.stock}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            <Badge 
              variant="outline" 
              className={`text-[10px] sm:text-xs ${isSize22 ? "bg-violet-500/10 text-violet-600 border-violet-500/30" : "bg-cyan-500/10 text-cyan-600 border-cyan-500/30"}`}
            >
              {product.size}
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
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-3">
          {/* Retail Price Reference */}
          {product.retail_price > 0 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
              <span>Retail Price</span>
              <span className="font-medium text-foreground">৳{product.retail_price.toLocaleString()}</span>
            </div>
          )}
          
          {/* Your Price Input */}
          <div className="space-y-1.5">
            <label className="text-[10px] sm:text-xs text-muted-foreground">Your Price</label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">৳</span>
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={product.price || ''}
                  onChange={(e) => updateProduct(globalIdx, 'price', parseInt(e.target.value) || 0)}
                  className="h-11 pl-8 text-base font-medium"
                />
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50">
                {isEnabled ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-muted-foreground" />
                )}
                <Switch
                  checked={product.is_available}
                  onCheckedChange={(checked) => updateProduct(globalIdx, 'is_available', checked)}
                  disabled={product.price <= 0}
                  className="data-[state=checked]:bg-emerald-500"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Empty State - Professional Design
  const EmptyState = ({ type }: { type: string }) => (
    <Card className="border-dashed border-2">
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Package className="h-8 w-8 text-muted-foreground/50" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No {type} in inventory</h3>
        <p className="text-muted-foreground text-center text-sm max-w-md mb-4">
          Add products to your inventory first to list them in your shop
        </p>
        <Button variant="outline" onClick={() => navigate('/dashboard')} className="gap-2 h-11">
          <Package className="h-4 w-4" />
          Go to Inventory
        </Button>
      </CardContent>
    </Card>
  );

  // ==================== LOADING & ERROR STATES ====================

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center space-y-3">
          <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading products...</p>
        </div>
      </div>
    );
  }

  if (!shopId) {
    return (
      <Card className="border-dashed border-2">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="h-16 w-16 rounded-full bg-amber-500/15 flex items-center justify-center mb-4">
            <AlertCircle className="h-8 w-8 text-amber-500" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Create Your Shop First</h3>
          <p className="text-muted-foreground text-center text-sm max-w-md">
            Set up your shop profile in the "Shop Info" tab before listing products
          </p>
        </CardContent>
      </Card>
    );
  }

  // ==================== MAIN RENDER ====================

  return (
    <div className="space-y-5">
      {/* Stats Bar - Enhanced Design */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-emerald-500/5" />
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-emerald-500" />
        <div className="relative p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
                <Package className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">
                  {stats.listed} <span className="text-muted-foreground text-lg font-normal">/ {stats.total}</span>
                </p>
                <p className="text-sm text-muted-foreground">Products Listed in Marketplace</p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={handleSyncInventory} disabled={syncing} className="gap-2 h-11">
                <RefreshCcw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Sync Inventory</span>
                <span className="sm:hidden">Sync</span>
              </Button>
              <Button onClick={handleSaveAll} disabled={saving} className="gap-2 h-11 flex-1 sm:flex-none">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save All
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search products by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-11 text-base"
        />
      </div>

      {/* Product Tabs - Enhanced */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-3 h-12 p-1 bg-muted/50">
          <TabsTrigger value="lpg" className="gap-2 h-10 data-[state=active]:shadow-sm">
            <Flame className="h-4 w-4" />
            <span className="hidden sm:inline">LPG Refill</span>
            <span className="sm:hidden">LPG</span>
            {lpgProducts.length > 0 && (
              <Badge className="ml-1 text-[10px] bg-orange-500/15 text-orange-600 border-orange-500/30">{lpgProducts.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="stove" className="gap-2 h-10 data-[state=active]:shadow-sm">
            <ChefHat className="h-4 w-4" />
            <span className="hidden sm:inline">Gas Stoves</span>
            <span className="sm:hidden">Stoves</span>
            {stoveProducts.length > 0 && (
              <Badge className="ml-1 text-[10px] bg-amber-500/15 text-amber-600 border-amber-500/30">{stoveProducts.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="regulator" className="gap-2 h-10 data-[state=active]:shadow-sm">
            <Gauge className="h-4 w-4" />
            <span className="hidden sm:inline">Regulators</span>
            <span className="sm:hidden">Reg.</span>
            {regulatorProducts.length > 0 && (
              <Badge className="ml-1 text-[10px] bg-purple-500/15 text-purple-600 border-purple-500/30">{regulatorProducts.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* LPG Tab */}
        <TabsContent value="lpg" className="mt-6">
          {lpgProducts.length === 0 ? (
            <EmptyState type="LPG cylinders" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {lpgProducts.map((product, index) => (
                <LpgRefillCard key={`${product.brand_name}-${product.product_type}`} product={product} index={index} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Stoves Tab */}
        <TabsContent value="stove" className="mt-6">
          {stoveProducts.length === 0 ? (
            <EmptyState type="Gas stoves" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {stoveProducts.map((product, index) => (
                <StoveCard key={`${product.brand_name}-${product.product_type}`} product={product} index={index} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Regulators Tab */}
        <TabsContent value="regulator" className="mt-6">
          {regulatorProducts.length === 0 ? (
            <EmptyState type="Regulators" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {regulatorProducts.map((product, index) => (
                <RegulatorCard key={`${product.brand_name}-${product.product_type}`} product={product} index={index} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Help Text */}
      <p className="text-xs text-muted-foreground text-center">
        Products auto-sync with your inventory. Only items with stock {'>'}0 are shown.
      </p>
    </div>
  );
};
