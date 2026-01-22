import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Store, 
  Package, 
  ShoppingBag, 
  BarChart3, 
  Settings,
  Loader2,
  ExternalLink,
  Globe,
  Sparkles
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { ShopInfoTab, type ShopProfile } from "./shop-profile/ShopInfoTab";
import { ShopProductsTab } from "./shop-profile/ShopProductsTab";
import { ShopOrdersTab } from "./shop-profile/ShopOrdersTab";
import { ShopAnalyticsTab } from "./shop-profile/ShopAnalyticsTab";
import { ShopSettingsTab } from "./shop-profile/ShopSettingsTab";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { PremiumModuleHeader } from "@/components/shared/PremiumModuleHeader";

const DEFAULT_SHOP_PROFILE: ShopProfile = {
  shop_name: '',
  description: '',
  phone: '',
  whatsapp: '',
  address: '',
  division: '',
  district: '',
  thana: '',
  delivery_fee: 50,
  is_open: false
};

export const MyShopProfileModule = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("info");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [shopProfile, setShopProfile] = useState<ShopProfile>(DEFAULT_SHOP_PROFILE);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);

  // Fetch shop profile
  const fetchShopProfile = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('shop_profiles')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setShopProfile({
          id: data.id,
          owner_id: data.owner_id,
          shop_name: data.shop_name || '',
          description: data.description || '',
          phone: data.phone || '',
          whatsapp: data.whatsapp || '',
          address: data.address || '',
          division: data.division || '',
          district: data.district || '',
          thana: data.thana || '',
          delivery_fee: data.delivery_fee || 50,
          is_open: data.is_open || false,
          logo_url: data.logo_url,
          cover_image_url: data.cover_image_url,
          rating: data.rating,
          total_orders: data.total_orders,
          total_reviews: data.total_reviews
        });

        // Fetch pending orders count
        const { count } = await supabase
          .from('community_orders')
          .select('*', { count: 'exact', head: true })
          .eq('shop_id', data.id)
          .eq('status', 'pending');

        setPendingOrdersCount(count || 0);
      }
    } catch (error: any) {
      console.error('Error fetching shop profile:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShopProfile();

    // Real-time subscription for orders
    const channel = supabase
      .channel('shop-profile-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'community_orders' },
        () => {
          fetchShopProfile();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchShopProfile]);

  // Save shop profile
  const handleSaveShopProfile = async () => {
    if (!shopProfile.shop_name || !shopProfile.phone || !shopProfile.division || !shopProfile.district || !shopProfile.address) {
      toast({ 
        title: "Missing required fields", 
        description: "Please fill in shop name, phone, location and address",
        variant: "destructive" 
      });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const shopData = {
        owner_id: user.id,
        shop_name: shopProfile.shop_name,
        description: shopProfile.description,
        phone: shopProfile.phone,
        whatsapp: shopProfile.whatsapp || shopProfile.phone,
        address: shopProfile.address,
        division: shopProfile.division,
        district: shopProfile.district,
        thana: shopProfile.thana,
        delivery_fee: shopProfile.delivery_fee,
        is_open: shopProfile.is_open,
        updated_at: new Date().toISOString()
      };

      let result;
      if (shopProfile.id) {
        result = await supabase
          .from('shop_profiles')
          .update(shopData)
          .eq('id', shopProfile.id)
          .select()
          .single();
      } else {
        result = await supabase
          .from('shop_profiles')
          .insert(shopData)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      setShopProfile(prev => ({ ...prev, id: result.data.id, owner_id: result.data.owner_id }));
      toast({ title: "Shop profile saved successfully!" });
    } catch (error: any) {
      console.error('Error saving shop:', error);
      toast({ 
        title: "Failed to save shop profile", 
        description: error.message,
        variant: "destructive" 
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading shop profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Premium Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-secondary/5 rounded-xl -z-10" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-1">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
              <Store className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                  {shopProfile.shop_name || 'My Shop Profile'}
                </h1>
                {shopProfile.id && (
                  <Badge className={`${shopProfile.is_open ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' : 'bg-muted text-muted-foreground'}`}>
                    {shopProfile.is_open ? '● Open' : '○ Closed'}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Manage your shop, products, orders & analytics
              </p>
            </div>
          </div>
          
          {/* Quick Actions */}
          {shopProfile.id && (
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate(`/community/shop/${shopProfile.id}`)}
                className="h-10 gap-2 text-sm"
              >
                <ExternalLink className="h-4 w-4" />
                <span className="hidden sm:inline">View Shop</span>
              </Button>
              <Button 
                size="sm" 
                onClick={() => navigate('/community')}
                className="h-10 gap-2 text-sm"
              >
                <Globe className="h-4 w-4" />
                <span className="hidden sm:inline">Marketplace</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Professional Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <ScrollArea className="w-full">
          <TabsList className="inline-flex h-12 min-w-full sm:min-w-0 p-1 bg-muted/50 rounded-lg">
            <TabsTrigger 
              value="info" 
              className="h-10 px-4 gap-2 data-[state=active]:shadow-sm data-[state=active]:bg-background rounded-md transition-all"
            >
              <Store className="h-4 w-4" />
              <span className="hidden sm:inline">Shop Info</span>
              <span className="sm:hidden">Info</span>
            </TabsTrigger>
            <TabsTrigger 
              value="products" 
              className="h-10 px-4 gap-2 data-[state=active]:shadow-sm data-[state=active]:bg-background rounded-md transition-all"
            >
              <Package className="h-4 w-4" />
              <span>Products</span>
            </TabsTrigger>
            <TabsTrigger 
              value="orders" 
              className="h-10 px-4 gap-2 data-[state=active]:shadow-sm data-[state=active]:bg-background rounded-md transition-all relative"
            >
              <ShoppingBag className="h-4 w-4" />
              <span>Orders</span>
              {pendingOrdersCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 min-w-5 p-0 flex items-center justify-center bg-destructive text-destructive-foreground text-[10px] animate-pulse">
                  {pendingOrdersCount > 9 ? '9+' : pendingOrdersCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="analytics" 
              className="h-10 px-4 gap-2 data-[state=active]:shadow-sm data-[state=active]:bg-background rounded-md transition-all"
            >
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
              <span className="sm:hidden">Stats</span>
            </TabsTrigger>
            <TabsTrigger 
              value="settings" 
              className="h-10 px-4 gap-2 data-[state=active]:shadow-sm data-[state=active]:bg-background rounded-md transition-all"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
              <span className="sm:hidden">Config</span>
            </TabsTrigger>
          </TabsList>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <TabsContent value="info" className="mt-5">
          <ShopInfoTab 
            shopProfile={shopProfile}
            setShopProfile={setShopProfile}
            loading={false}
            onSave={handleSaveShopProfile}
            saving={saving}
          />
        </TabsContent>

        <TabsContent value="products" className="mt-5">
          <ShopProductsTab shopId={shopProfile.id || null} />
        </TabsContent>

        <TabsContent value="orders" className="mt-5">
          <ShopOrdersTab shopId={shopProfile.id || null} />
        </TabsContent>

        <TabsContent value="analytics" className="mt-5">
          <ShopAnalyticsTab shopId={shopProfile.id || null} />
        </TabsContent>

        <TabsContent value="settings" className="mt-5">
          <ShopSettingsTab shopId={shopProfile.id || null} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
