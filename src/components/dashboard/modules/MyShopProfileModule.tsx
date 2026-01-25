import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Store, 
  Package, 
  ShoppingBag, 
  BarChart3, 
  Settings,
  ExternalLink,
  Globe,
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
import { Skeleton } from "@/components/ui/skeleton";

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

// Query keys for caching
const shopProfileKeys = {
  profile: (userId: string) => ['shop-profile', userId] as const,
  pendingOrders: (shopId: string) => ['shop-pending-orders', shopId] as const,
};

export const MyShopProfileModule = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("info");
  const [saving, setSaving] = useState(false);
  const [localShopProfile, setLocalShopProfile] = useState<ShopProfile>(DEFAULT_SHOP_PROFILE);

  // Cached query for shop profile - 5 minute stale time
  const { data: shopProfile, isLoading: loading, refetch } = useQuery({
    queryKey: shopProfileKeys.profile('current'),
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('shop_profiles')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        return {
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
        } as ShopProfile;
      }
      return null;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
  });

  // Cached query for pending orders count
  const { data: pendingOrdersCount = 0 } = useQuery({
    queryKey: shopProfileKeys.pendingOrders(shopProfile?.id || ''),
    queryFn: async () => {
      if (!shopProfile?.id) return 0;
      
      const { count } = await supabase
        .from('community_orders')
        .select('*', { count: 'exact', head: true })
        .eq('shop_id', shopProfile.id)
        .eq('status', 'pending');

      return count || 0;
    },
    enabled: !!shopProfile?.id,
    staleTime: 30 * 1000, // 30 seconds - orders change frequently
    gcTime: 60 * 1000,
  });

  // Sync local state with query data
  useEffect(() => {
    if (shopProfile) {
      setLocalShopProfile(shopProfile);
    }
  }, [shopProfile]);

  // Debounced real-time subscription for orders only
  useEffect(() => {
    if (!shopProfile?.id) return;

    let debounceTimer: NodeJS.Timeout;
    
    const channel = supabase
      .channel('shop-profile-orders-optimized')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'community_orders',
          filter: `shop_id=eq.${shopProfile.id}`
        },
        () => {
          // Debounce refetch by 2 seconds to prevent excessive calls
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            queryClient.invalidateQueries({ 
              queryKey: shopProfileKeys.pendingOrders(shopProfile.id!) 
            });
          }, 2000);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [shopProfile?.id, queryClient]);

  // Save shop profile with optimistic update
  const handleSaveShopProfile = async () => {
    if (!localShopProfile.shop_name || !localShopProfile.phone || !localShopProfile.division || !localShopProfile.district || !localShopProfile.address) {
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
        shop_name: localShopProfile.shop_name,
        description: localShopProfile.description,
        phone: localShopProfile.phone,
        whatsapp: localShopProfile.whatsapp || localShopProfile.phone,
        address: localShopProfile.address,
        division: localShopProfile.division,
        district: localShopProfile.district,
        thana: localShopProfile.thana,
        delivery_fee: localShopProfile.delivery_fee,
        is_open: localShopProfile.is_open,
        updated_at: new Date().toISOString()
      };

      let result;
      if (localShopProfile.id) {
        result = await supabase
          .from('shop_profiles')
          .update(shopData)
          .eq('id', localShopProfile.id)
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

      // Update cache immediately
      queryClient.setQueryData(shopProfileKeys.profile('current'), {
        ...localShopProfile,
        id: result.data.id,
        owner_id: result.data.owner_id
      });

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

  // Memoized current profile for child components
  const currentProfile = useMemo(() => localShopProfile, [localShopProfile]);

  if (loading) {
    return (
      <div className="space-y-5">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-1">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>

        {/* Tabs Skeleton */}
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-10 w-24 rounded-md" />
          ))}
        </div>

        {/* Content Skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
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
                  {currentProfile.shop_name || 'My Shop Profile'}
                </h1>
                {currentProfile.id && (
                  <Badge className={`${currentProfile.is_open ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' : 'bg-muted text-muted-foreground'}`}>
                    {currentProfile.is_open ? '● Open' : '○ Closed'}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Manage your shop, products, orders & analytics
              </p>
            </div>
          </div>
          
          {/* Quick Actions */}
          {currentProfile.id && (
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate(`/community/shop/${currentProfile.id}`)}
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
            shopProfile={currentProfile}
            setShopProfile={setLocalShopProfile}
            loading={false}
            onSave={handleSaveShopProfile}
            saving={saving}
          />
        </TabsContent>

        <TabsContent value="products" className="mt-5">
          <ShopProductsTab shopId={currentProfile.id || null} />
        </TabsContent>

        <TabsContent value="orders" className="mt-5">
          <ShopOrdersTab shopId={currentProfile.id || null} />
        </TabsContent>

        <TabsContent value="analytics" className="mt-5">
          <ShopAnalyticsTab shopId={currentProfile.id || null} />
        </TabsContent>

        <TabsContent value="settings" className="mt-5">
          <ShopSettingsTab shopId={currentProfile.id || null} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MyShopProfileModule;
