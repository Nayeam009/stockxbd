import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { getStoredSessionSnapshot } from "@/lib/authUtils";

export interface Shop {
  id: string;
  owner_id?: string;
  shop_name: string;
  description: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  phone?: string;
  whatsapp?: string | null;
  address: string;
  division: string;
  district: string;
  thana: string | null;
  latitude: number | null;
  longitude: number | null;
  is_verified: boolean;
  is_open: boolean;
  delivery_fee: number;
  rating: number;
  total_reviews: number;
  total_orders: number;
  created_at: string;
  bkash_number?: string | null;
  nagad_number?: string | null;
  rocket_number?: string | null;
  online_payment_only?: boolean;
}

export interface ShopProduct {
  id: string;
  shop_id: string;
  product_type: 'lpg_refill' | 'lpg_package' | 'stove' | 'regulator' | 'accessory';
  brand_name: string;
  weight: string | null;
  valve_size: '22mm' | '20mm' | null;
  price: number;
  is_available: boolean;
  image_url: string | null;
  description: string | null;
  created_at: string;
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
  thana: string | null;
  order_notes: string | null;
  subtotal: number;
  delivery_fee: number;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'dispatched' | 'delivered' | 'cancelled' | 'rejected';
  payment_method: 'cod' | 'bkash' | 'nagad' | 'card';
  payment_status: 'pending' | 'paid';
  rejection_reason: string | null;
  confirmed_at: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
  created_at: string;
  shop?: Shop;
  items?: CommunityOrderItem[];
}

export interface CommunityOrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  product_type: string;
  brand_name: string | null;
  weight: string | null;
  valve_size: string | null;
  quantity: number;
  price: number;
  return_cylinder_qty: number;
  return_cylinder_type: 'empty' | 'leaked' | null;
  return_cylinder_brand: string | null;
}

export interface CartItem extends ShopProduct {
  quantity: number;
  return_cylinder_qty: number;
  return_cylinder_type: 'empty' | 'leaked' | null;
  shop?: Shop;
  shop_id: string;
}

export const useCommunityData = () => {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string } | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userShop, setUserShop] = useState<Shop | null>(null);

  // Fetch all open shops using the public view (excludes sensitive contact info)
  const fetchShops = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('shop_profiles_public')
        .select('*')
        .eq('is_open', true)
        .order('rating', { ascending: false });

      if (error) throw error;
      const publicShops = (data || []).map(shop => ({
        id: shop.id,
        shop_name: shop.shop_name,
        description: shop.description,
        address: shop.address,
        division: shop.division,
        district: shop.district,
        thana: shop.thana,
        latitude: shop.latitude,
        longitude: shop.longitude,
        logo_url: shop.logo_url,
        cover_image_url: shop.cover_image_url,
        is_open: shop.is_open,
        is_verified: shop.is_verified,
        rating: Number(shop.rating || 0),
        total_reviews: shop.total_reviews || 0,
        total_orders: shop.total_orders || 0,
        delivery_fee: Number(shop.delivery_fee || 50),
        created_at: shop.created_at || new Date().toISOString()
      })) as Shop[];
      setShops(publicShops);
    } catch (error) {
      logger.error('Error fetching shops:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch shop by ID - includes contact details only for authenticated users
  const fetchShopById = useCallback(async (shopId: string): Promise<Shop | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data, error } = await supabase
          .from('shop_profiles')
          .select('*')
          .eq('id', shopId)
          .single();

        if (error) throw error;
        return data as Shop;
      } else {
        const { data, error } = await supabase
          .from('shop_profiles_public')
          .select('*')
          .eq('id', shopId)
          .single();

        if (error) throw error;
        return {
          ...data,
          rating: Number(data.rating || 0),
          total_reviews: data.total_reviews || 0,
          total_orders: data.total_orders || 0,
          delivery_fee: Number(data.delivery_fee || 50),
          created_at: data.created_at || new Date().toISOString()
        } as Shop;
      }
    } catch (error) {
      logger.error('Error fetching shop:', error);
      return null;
    }
  }, []);

  // Fetch products for a shop
  const fetchShopProducts = useCallback(async (shopId: string): Promise<ShopProduct[]> => {
    try {
      const { data, error } = await supabase
        .from('shop_products')
        .select('*')
        .eq('shop_id', shopId)
        .eq('is_available', true)
        .order('product_type');

      if (error) throw error;
      return (data || []) as ShopProduct[];
    } catch (error) {
      logger.error('Error fetching products:', error);
      return [];
    }
  }, []);

  // OPTIMIZED: Fetch customer orders with batch shop fetching (fixes N+1 query)
  const fetchCustomerOrders = useCallback(async (): Promise<CommunityOrder[]> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: orders, error } = await supabase
        .from('community_orders')
        .select('*')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!orders || orders.length === 0) return [];

      // BATCH FETCH: Get all unique shop IDs and fetch shops in one query
      const shopIds = [...new Set(orders.map(o => o.shop_id))];
      
      // Use the public view for shop details (safe for customers)
      const { data: shopsData } = await supabase
        .from('shop_profiles_public')
        .select('*')
        .in('id', shopIds);

      // Create a map for O(1) lookup
      const shopMap = new Map<string, Shop>();
      shopsData?.forEach(shop => {
        shopMap.set(shop.id, {
          id: shop.id,
          shop_name: shop.shop_name,
          description: shop.description,
          address: shop.address,
          division: shop.division,
          district: shop.district,
          thana: shop.thana,
          latitude: shop.latitude,
          longitude: shop.longitude,
          logo_url: shop.logo_url,
          cover_image_url: shop.cover_image_url,
          is_open: shop.is_open,
          is_verified: shop.is_verified,
          rating: Number(shop.rating || 0),
          total_reviews: shop.total_reviews || 0,
          total_orders: shop.total_orders || 0,
          delivery_fee: Number(shop.delivery_fee || 50),
          created_at: shop.created_at || new Date().toISOString()
        } as Shop);
      });

      // Map orders with their shops
      const ordersWithShops = orders.map(order => ({
        ...order,
        shop: shopMap.get(order.shop_id) || null
      })) as CommunityOrder[];

      return ordersWithShops;
    } catch (error) {
      logger.error('Error fetching customer orders:', error);
      return [];
    }
  }, []);

  // Fetch shop orders (for owner)
  const fetchShopOrders = useCallback(async (): Promise<CommunityOrder[]> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: shopData, error: shopError } = await supabase
        .from('shop_profiles')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (shopError || !shopData) return [];

      const { data, error } = await supabase
        .from('community_orders')
        .select('*')
        .eq('shop_id', shopData.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as CommunityOrder[];
    } catch (error) {
      logger.error('Error fetching shop orders:', error);
      return [];
    }
  }, []);

  // Place an order
  const placeOrder = useCallback(async (
    shopId: string,
    items: CartItem[],
    customerInfo: {
      name: string;
      phone: string;
      address: string;
      division: string;
      district: string;
      thana?: string;
      notes?: string;
      paymentMethod?: 'cod' | 'bkash' | 'nagad' | 'rocket';
      paymentTrxId?: string;
    }
  ): Promise<{ success: boolean; orderId?: string; error?: string }> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Not authenticated' };

      const isSelfOrder = userShop?.id === shopId;
      const customerType = userRole === 'owner' ? 'wholesale' : 'retail';

      const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const deliveryFee = isSelfOrder ? 0 : 50;
      const totalAmount = subtotal + deliveryFee;

      const paymentMethod = customerInfo.paymentMethod || 'cod';
      const paymentStatus = paymentMethod !== 'cod' && customerInfo.paymentTrxId ? 'paid' : 'pending';

      const { data: orderData, error: orderError } = await supabase
        .from('community_orders')
        .insert([{
          shop_id: shopId,
          customer_id: user.id,
          customer_name: customerInfo.name,
          customer_phone: customerInfo.phone,
          delivery_address: customerInfo.address,
          division: customerInfo.division,
          district: customerInfo.district,
          thana: customerInfo.thana || null,
          order_notes: isSelfOrder ? `[TEST ORDER] ${customerInfo.notes || ''}`.trim() : (customerInfo.notes || null),
          subtotal,
          delivery_fee: deliveryFee,
          total_amount: totalAmount,
          status: 'pending',
          payment_method: paymentMethod,
          payment_status: paymentStatus,
          payment_trx_id: customerInfo.paymentTrxId || null,
          customer_type: customerType,
          is_self_order: isSelfOrder
        }] as any)
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = items.map(item => ({
        order_id: orderData.id,
        product_id: item.id,
        product_name: `${item.brand_name} ${item.weight || ''}`.trim(),
        product_type: item.product_type,
        brand_name: item.brand_name,
        weight: item.weight,
        valve_size: item.valve_size || '22mm',
        quantity: item.quantity,
        price: item.price,
        return_cylinder_qty: item.return_cylinder_qty || 0,
        return_cylinder_type: item.return_cylinder_type
      }));

      const { error: itemsError } = await supabase
        .from('community_order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      return { success: true, orderId: orderData.id };
    } catch (error: any) {
      logger.error('Error placing order:', error);
      return { success: false, error: error.message };
    }
  }, [userShop, userRole]);

  // Update order status (for shop owners)
  const updateOrderStatus = useCallback(async (
    orderId: string,
    status: CommunityOrder['status'],
    rejectionReason?: string
  ): Promise<boolean> => {
    try {
      const updateData: Record<string, any> = { status, updated_at: new Date().toISOString() };
      
      if (status === 'confirmed') updateData.confirmed_at = new Date().toISOString();
      if (status === 'dispatched') updateData.dispatched_at = new Date().toISOString();
      if (status === 'delivered') {
        updateData.delivered_at = new Date().toISOString();
        updateData.payment_status = 'paid';
      }
      if (status === 'rejected' && rejectionReason) updateData.rejection_reason = rejectionReason;

      const { error } = await supabase
        .from('community_orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) throw error;
      return true;
    } catch (error) {
      logger.error('Error updating order status:', error);
      return false;
    }
  }, []);

  // Fetch current user info - optimistic with localStorage check
  useEffect(() => {
    let mounted = true;
    
    const fetchUser = async () => {
      try {
        const snapshot = getStoredSessionSnapshot();
        let userId: string | null = snapshot?.userId || null;
        let userEmail: string = snapshot?.email || '';
        
        if (userId) {
          setCurrentUser({ id: userId, email: userEmail });
          
          const [roleResult, shopResult] = await Promise.all([
            supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', userId)
              .maybeSingle(),
            supabase
              .from('shop_profiles')
              .select('*')
              .eq('owner_id', userId)
              .maybeSingle()
          ]);
          
          if (!mounted) return;
          
          if (roleResult.data) {
            setUserRole(roleResult.data.role);
            sessionStorage.setItem(`user-role-${userId}`, roleResult.data.role);
          }
          
          if (shopResult.data) {
            setUserShop(shopResult.data as Shop);
          }
        } else {
          const { data: { user } } = await supabase.auth.getUser();
          if (!mounted) return;
          
          if (user) {
            setCurrentUser({ id: user.id, email: user.email || '' });

            const [roleResult, shopResult] = await Promise.all([
              supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', user.id)
                .maybeSingle(),
              supabase
                .from('shop_profiles')
                .select('*')
                .eq('owner_id', user.id)
                .maybeSingle()
            ]);
            
            if (!mounted) return;
            
            if (roleResult.data) {
              setUserRole(roleResult.data.role);
              sessionStorage.setItem(`user-role-${user.id}`, roleResult.data.role);
            }
            
            if (shopResult.data) {
              setUserShop(shopResult.data as Shop);
            }
          }
        }
      } catch (error) {
        console.warn('[useCommunityData] Error fetching user:', error);
      }
    };

    fetchUser();
    fetchShops();
    
    return () => { mounted = false; };
  }, [fetchShops]);

  return {
    shops,
    loading,
    currentUser,
    userRole,
    userShop,
    fetchShops,
    fetchShopById,
    fetchShopProducts,
    fetchCustomerOrders,
    fetchShopOrders,
    placeOrder,
    updateOrderStatus
  };
};
