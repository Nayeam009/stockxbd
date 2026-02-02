/**
 * Marketplace Orders Data Hook
 * Handles fetching, caching, and real-time sync for marketplace orders
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import { withTimeout, debounce, TimeoutError } from "@/lib/asyncUtils";
import type { CommunityOrder, ShopProfile, OrderAnalytics } from "../types";

const FETCH_TIMEOUT_MS = 12000;

interface UseMarketplaceOrdersReturn {
  orders: CommunityOrder[];
  shopId: string | null;
  hasShop: boolean | null;
  shopProfile: ShopProfile | null;
  analytics: OrderAnalytics;
  initialLoading: boolean;
  softLoading: boolean;
  loadError: string | null;
  fetchData: (isRefresh?: boolean) => Promise<void>;
  debouncedFetch: () => void;
}

export function useMarketplaceOrders(): UseMarketplaceOrdersReturn {
  const [orders, setOrders] = useState<CommunityOrder[]>([]);
  const [shopId, setShopId] = useState<string | null>(null);
  const [hasShop, setHasShop] = useState<boolean | null>(null);
  const [shopProfile, setShopProfile] = useState<ShopProfile | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [softLoading, setSoftLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchData = useCallback(async (isRefresh: boolean = false) => {
    if (!isRefresh && orders.length === 0) {
      setInitialLoading(true);
    } else {
      setSoftLoading(true);
    }
    setLoadError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setHasShop(false);
        setInitialLoading(false);
        setSoftLoading(false);
        return;
      }

      const { data: ownerId } = await supabase.rpc("get_owner_id");

      const shopQuery = supabase
        .from('shop_profiles')
        .select('id, shop_name, phone, address')
        .eq('owner_id', ownerId || user.id)
        .maybeSingle();
      
      const shopResult = await withTimeout(
        shopQuery.then(r => r),
        FETCH_TIMEOUT_MS,
        'Shop fetch'
      );

      if (shopResult.error || !shopResult.data) {
        setHasShop(false);
        setInitialLoading(false);
        setSoftLoading(false);
        return;
      }

      const shopData = shopResult.data;
      setShopId(shopData.id);
      setHasShop(true);
      setShopProfile({
        name: shopData.shop_name || 'My LPG Shop',
        phone: shopData.phone || '',
        address: shopData.address || ''
      });

      // Batch fetch orders with embedded items
      const ordersQuery = supabase
        .from('community_orders')
        .select(`*, items:community_order_items(*)`)
        .eq('shop_id', shopData.id)
        .order('created_at', { ascending: false })
        .limit(200);
      
      const ordersResult = await withTimeout(
        ordersQuery.then(r => r),
        FETCH_TIMEOUT_MS,
        'Orders fetch'
      );

      if (ordersResult.error) throw ordersResult.error;
      const ordersData = (ordersResult.data || []) as any[];

      // Batch fetch cylinder photos
      const customerIds = [...new Set(ordersData.map(o => o.customer_id))] as string[];
      let cylinderPhotos: Record<string, string | null> = {};
      
      if (customerIds.length > 0) {
        try {
          const photosQuery = supabase
            .from('customer_cylinder_profiles')
            .select('user_id, cylinder_photo_url')
            .in('user_id', customerIds);
          
          const photosResult = await withTimeout(
            photosQuery.then(r => r),
            5000,
            'Cylinder photos fetch'
          );

          if (photosResult.data) {
            cylinderPhotos = Object.fromEntries(
              photosResult.data.map((p: any) => [p.user_id, p.cylinder_photo_url])
            );
          }
        } catch {
          // Photos are non-critical
        }
      }

      const ordersWithPhotos = ordersData.map(order => ({
        ...order,
        customer_cylinder_photo: cylinderPhotos[order.customer_id] || null
      })) as CommunityOrder[];

      setOrders(ordersWithPhotos);
    } catch (error) {
      if (error instanceof TimeoutError) {
        if (orders.length === 0) {
          setLoadError("Loading took too long. Please retry.");
        } else {
          toast({ title: "Refresh timed out", description: "Showing cached data" });
        }
      } else {
        logger.error('Error fetching marketplace orders:', error);
        if (orders.length === 0) {
          setLoadError("Failed to fetch orders. Please retry.");
        }
      }
    } finally {
      setInitialLoading(false);
      setSoftLoading(false);
    }
  }, [orders.length]);

  // Debounced fetch for realtime
  const debouncedFetch = useMemo(
    () => debounce(() => fetchData(true), 1000),
    [fetchData]
  );

  // Real-time subscription
  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (shopId) {
      const channel = supabase
        .channel('marketplace-orders')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'community_orders',
            filter: `shop_id=eq.${shopId}`
          },
          (payload) => {
            logger.info('Order change detected:', payload);
            debouncedFetch();

            if (payload.eventType === 'INSERT') {
              toast({
                title: "🛒 New Order!",
                description: `Order #${(payload.new as any).order_number} received`,
              });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [shopId, debouncedFetch]);

  // Analytics calculation
  const analytics = useMemo(() => ({
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    confirmed: orders.filter(o => o.status === 'confirmed').length,
    dispatched: orders.filter(o => o.status === 'dispatched').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    todayRevenue: orders
      .filter(o => o.status === 'delivered' && o.delivered_at && new Date(o.delivered_at).toDateString() === new Date().toDateString())
      .reduce((sum, o) => sum + o.total_amount, 0),
    todayOrders: orders.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString()).length
  }), [orders]);

  return {
    orders,
    shopId,
    hasShop,
    shopProfile,
    analytics,
    initialLoading,
    softLoading,
    loadError,
    fetchData,
    debouncedFetch
  };
}
