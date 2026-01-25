/**
 * Optimized Community Query Hooks
 * 
 * TanStack Query hooks for LPG Community marketplace with proper caching,
 * stale times, and deduplication to achieve professional-grade performance.
 */

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Query key factory for consistent cache management
export const communityKeys = {
  all: ['community'] as const,
  shops: () => [...communityKeys.all, 'shops'] as const,
  shopList: (filters: { division?: string; district?: string; search?: string }) => 
    [...communityKeys.shops(), filters] as const,
  shopDetail: (id: string) => [...communityKeys.shops(), 'detail', id] as const,
  shopProducts: (shopId: string) => [...communityKeys.shops(), shopId, 'products'] as const,
  orders: () => [...communityKeys.all, 'orders'] as const,
  orderList: (userId: string) => [...communityKeys.orders(), 'list', userId] as const,
  orderDetail: (orderId: string) => [...communityKeys.orders(), 'detail', orderId] as const,
  cylinderProfile: (userId: string) => [...communityKeys.all, 'cylinder', userId] as const,
};

// Types
export interface ShopProfile {
  id: string;
  shop_name: string;
  description?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  address: string;
  division: string;
  district: string;
  thana?: string | null;
  logo_url?: string | null;
  cover_image_url?: string | null;
  is_open: boolean;
  is_verified?: boolean | null;
  delivery_fee: number | null;
  rating: number | null;
  total_reviews: number | null;
  total_orders: number | null;
  bkash_number?: string | null;
  nagad_number?: string | null;
  rocket_number?: string | null;
}

export interface ShopProduct {
  id: string;
  shop_id: string;
  product_type: string;
  brand_name: string;
  weight?: string;
  valve_size?: string;
  price: number;
  is_available: boolean;
  description?: string;
  image_url?: string;
}

export interface CommunityOrder {
  id: string;
  order_number: string;
  shop_id: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  division: string;
  district: string;
  thana?: string | null;
  status: string;
  payment_status: string;
  payment_method: string;
  subtotal: number;
  delivery_fee: number | null;
  total_amount: number;
  created_at: string;
  confirmed_at?: string | null;
  dispatched_at?: string | null;
  delivered_at?: string | null;
  rejection_reason?: string | null;
  order_notes?: string | null;
  payment_trx_id?: string | null;
  is_self_order?: boolean | null;
  customer_type?: string | null;
  shop?: ShopProfile;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_name: string;
  product_type: string;
  brand_name?: string;
  weight?: string;
  quantity: number;
  price: number;
  return_cylinder_brand?: string;
  return_cylinder_qty?: number;
}

// ============ SHOP QUERIES ============

/**
 * Fetch all open shops with optional filters
 * Stale time: 60 seconds - shops don't change frequently
 */
export function useShopList(filters?: { division?: string; district?: string; search?: string }) {
  return useQuery({
    queryKey: communityKeys.shopList(filters || {}),
    queryFn: async () => {
      let query = supabase
        .from('shop_profiles_public')
        .select('*')
        .eq('is_open', true)
        .order('rating', { ascending: false });

      if (filters?.division) {
        query = query.eq('division', filters.division);
      }
      if (filters?.district) {
        query = query.eq('district', filters.district);
      }
      if (filters?.search) {
        query = query.ilike('shop_name', `%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ShopProfile[];
    },
    staleTime: 60 * 1000, // 60 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes cache
  });
}

/**
 * Fetch single shop details
 * Stale time: 5 minutes - individual shop data cached longer
 */
export function useShopDetail(shopId: string | undefined) {
  const queryClient = useQueryClient();
  
  return useQuery({
    queryKey: communityKeys.shopDetail(shopId || ''),
    queryFn: async () => {
      if (!shopId) return null;
      
      const { data, error } = await supabase
        .from('shop_profiles_public')
        .select('*')
        .eq('id', shopId)
        .maybeSingle();

      if (error) throw error;
      return data as ShopProfile | null;
    },
    enabled: !!shopId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes cache
    // Use cached shop from list if available (instant load)
    initialData: () => {
      const allShops = queryClient.getQueriesData<ShopProfile[]>({ 
        queryKey: communityKeys.shops() 
      });
      for (const [, shops] of allShops) {
        const found = shops?.find(s => s.id === shopId);
        if (found) return found;
      }
      return undefined;
    },
  });
}

/**
 * Fetch shop products
 * Stale time: 2 minutes - products/stock can change
 */
export function useShopProducts(shopId: string | undefined) {
  return useQuery({
    queryKey: communityKeys.shopProducts(shopId || ''),
    queryFn: async () => {
      if (!shopId) return [];
      
      const { data, error } = await supabase
        .from('shop_products')
        .select('*')
        .eq('shop_id', shopId)
        .eq('is_available', true)
        .order('product_type', { ascending: true });

      if (error) throw error;
      return data as ShopProduct[];
    },
    enabled: !!shopId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Prefetch shop products on hover for instant navigation
 */
export function usePrefetchShopProducts() {
  const queryClient = useQueryClient();
  
  return (shopId: string) => {
    queryClient.prefetchQuery({
      queryKey: communityKeys.shopProducts(shopId),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('shop_products')
          .select('*')
          .eq('shop_id', shopId)
          .eq('is_available', true);

        if (error) throw error;
        return data as ShopProduct[];
      },
      staleTime: 2 * 60 * 1000,
    });
  };
}

// ============ ORDER QUERIES ============

/**
 * Fetch customer orders with shop details (batch fetch - fixes N+1)
 * Stale time: 30 seconds - orders change frequently
 */
export function useCustomerOrders(userId: string | undefined) {
  return useQuery({
    queryKey: communityKeys.orderList(userId || ''),
    queryFn: async () => {
      if (!userId) return [];

      // Step 1: Fetch all orders
      const { data: orders, error: ordersError } = await supabase
        .from('community_orders')
        .select('*')
        .eq('customer_id', userId)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      if (!orders || orders.length === 0) return [];

      // Step 2: Batch fetch all unique shop IDs in single query (fixes N+1)
      const uniqueShopIds = [...new Set(orders.map(o => o.shop_id))];
      const { data: shops, error: shopsError } = await supabase
        .from('shop_profiles_public')
        .select('*')
        .in('id', uniqueShopIds);

      if (shopsError) throw shopsError;

      // Step 3: Batch fetch all order items in single query
      const orderIds = orders.map(o => o.id);
      const { data: items, error: itemsError } = await supabase
        .from('community_order_items')
        .select('*')
        .in('order_id', orderIds);

      if (itemsError) throw itemsError;

      // Step 4: Map shops and items to orders
      const shopMap = new Map(shops?.map(s => [s.id, s]) || []);
      const itemsMap = new Map<string, OrderItem[]>();
      items?.forEach(item => {
        const existing = itemsMap.get(item.order_id) || [];
        itemsMap.set(item.order_id, [...existing, item]);
      });

      return orders.map(order => ({
        ...order,
        shop: shopMap.get(order.shop_id) as ShopProfile | undefined,
        items: itemsMap.get(order.id) || [],
      })) as CommunityOrder[];
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000,
  });
}

/**
 * Fetch single order with details
 */
export function useOrderDetail(orderId: string | undefined) {
  return useQuery({
    queryKey: communityKeys.orderDetail(orderId || ''),
    queryFn: async () => {
      if (!orderId) return null;

      const { data: order, error } = await supabase
        .from('community_orders')
        .select('*')
        .eq('id', orderId)
        .maybeSingle();

      if (error) throw error;
      if (!order) return null;

      // Fetch shop and items in parallel
      const [shopResult, itemsResult] = await Promise.all([
        supabase
          .from('shop_profiles_public')
          .select('*')
          .eq('id', order.shop_id)
          .maybeSingle(),
        supabase
          .from('community_order_items')
          .select('*')
          .eq('order_id', orderId),
      ]);

      return {
        ...order,
        shop: shopResult.data as ShopProfile | undefined,
        items: (itemsResult.data || []) as OrderItem[],
      } as CommunityOrder;
    },
    enabled: !!orderId,
    staleTime: 30 * 1000,
  });
}

// ============ CYLINDER PROFILE QUERIES ============

/**
 * Fetch customer cylinder profile
 * Stale time: 5 minutes - rarely changes
 */
export function useCylinderProfile(userId: string | undefined) {
  return useQuery({
    queryKey: communityKeys.cylinderProfile(userId || ''),
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('customer_cylinder_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
  });
}

// ============ MUTATIONS ============

/**
 * Create order mutation with optimistic cache update
 */
export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderData: {
      shopId: string;
      items: Array<{
        productId: string;
        productName: string;
        productType: string;
        brandName: string;
        weight?: string;
        quantity: number;
        price: number;
        returnCylinderBrand?: string;
        returnCylinderQty?: number;
      }>;
      customerName: string;
      customerPhone: string;
      deliveryAddress: string;
      division: string;
      district: string;
      thana?: string;
      paymentMethod: string;
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Calculate totals
      const subtotal = orderData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      // Get shop delivery fee
      const { data: shop } = await supabase
        .from('shop_profiles')
        .select('delivery_fee')
        .eq('id', orderData.shopId)
        .single();
      
      const deliveryFee = shop?.delivery_fee || 50;
      const totalAmount = subtotal + deliveryFee;

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('community_orders')
        .insert({
          shop_id: orderData.shopId,
          customer_id: user.id,
          customer_name: orderData.customerName,
          customer_phone: orderData.customerPhone,
          delivery_address: orderData.deliveryAddress,
          division: orderData.division,
          district: orderData.district,
          thana: orderData.thana,
          payment_method: orderData.paymentMethod,
          order_notes: orderData.notes,
          subtotal,
          delivery_fee: deliveryFee,
          total_amount: totalAmount,
          order_number: `LPG-${Date.now()}`, // Temp, trigger will set proper number
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = orderData.items.map(item => ({
        order_id: order.id,
        product_id: item.productId,
        product_name: item.productName,
        product_type: item.productType,
        brand_name: item.brandName,
        weight: item.weight,
        quantity: item.quantity,
        price: item.price,
        return_cylinder_brand: item.returnCylinderBrand,
        return_cylinder_qty: item.returnCylinderQty,
      }));

      const { error: itemsError } = await supabase
        .from('community_order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      return order;
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant caches
      queryClient.invalidateQueries({ queryKey: communityKeys.orders() });
    },
  });
}

// ============ CACHE INVALIDATION HELPERS ============

export function useInvalidateCommunity() {
  const queryClient = useQueryClient();

  return {
    invalidateShops: () => queryClient.invalidateQueries({ queryKey: communityKeys.shops() }),
    invalidateOrders: () => queryClient.invalidateQueries({ queryKey: communityKeys.orders() }),
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: communityKeys.all }),
  };
}
