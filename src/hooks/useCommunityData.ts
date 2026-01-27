import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

export interface Shop {
  id: string;
  owner_id?: string; // Hidden from public view for security
  shop_name: string;
  description: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  phone?: string; // Now optional - only visible to authenticated users on shop detail page
  whatsapp?: string | null; // Now optional - only visible to authenticated users
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
  // Payment details - only visible to authenticated users placing orders
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
  quantity: number;
  price: number;
  return_cylinder_qty: number;
  return_cylinder_type: 'empty' | 'leaked' | null;
}

export interface CartItem extends ShopProduct {
  quantity: number;
  return_cylinder_qty: number;
  return_cylinder_type: 'empty' | 'leaked' | null;
  shop?: Shop;
  shop_id: string; // Make shop_id required in CartItem for reliability
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
      // Use the public view that excludes sensitive data (phone, whatsapp, payment numbers)
      const { data, error } = await supabase
        .from('shop_profiles_public')
        .select('*')
        .eq('is_open', true)
        .order('rating', { ascending: false });

      if (error) throw error;
      // Map public view data - contact info is intentionally excluded for security
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
        // Note: phone, whatsapp, payment numbers intentionally excluded from public listing
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
        // Authenticated users can see contact info from main table (RLS controlled)
        const { data, error } = await supabase
          .from('shop_profiles')
          .select('*')
          .eq('id', shopId)
          .single();

        if (error) throw error;
        return data as Shop;
      } else {
        // Unauthenticated users get public view only (no contact info)
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

  // Fetch customer orders
  const fetchCustomerOrders = useCallback(async (): Promise<CommunityOrder[]> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('community_orders')
        .select('*')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch shop details for each order
      const ordersWithShops = await Promise.all(
        (data || []).map(async (order) => {
          const shop = await fetchShopById(order.shop_id);
          return { ...order, shop } as CommunityOrder;
        })
      );

      return ordersWithShops;
    } catch (error) {
      logger.error('Error fetching customer orders:', error);
      return [];
    }
  }, [fetchShopById]);

  // Fetch shop orders (for owner)
  const fetchShopOrders = useCallback(async (): Promise<CommunityOrder[]> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // First get user's shop
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

      // Detect if this is a self-order (owner ordering from their own shop)
      const isSelfOrder = userShop?.id === shopId;
      
      // Detect customer type (wholesale for owners, retail for regular customers)
      const customerType = userRole === 'owner' ? 'wholesale' : 'retail';

      // Calculate totals
      const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const deliveryFee = isSelfOrder ? 0 : 50; // No delivery fee for self-orders
      const totalAmount = subtotal + deliveryFee;

      // Determine payment status based on method
      const paymentMethod = customerInfo.paymentMethod || 'cod';
      const paymentStatus = paymentMethod !== 'cod' && customerInfo.paymentTrxId ? 'paid' : 'pending';

      // Create order with customer_type and is_self_order
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

      // Create order items
      const orderItems = items.map(item => ({
        order_id: orderData.id,
        product_id: item.id,
        product_name: `${item.brand_name} ${item.weight || ''}`.trim(),
        product_type: item.product_type,
        brand_name: item.brand_name,
        weight: item.weight,
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
        // Quick localStorage check first
        const storageKey = `sb-xupvteigmqcrfluuadte-auth-token`;
        const stored = localStorage.getItem(storageKey);
        let userId: string | null = null;
        let userEmail: string = '';
        
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            userId = parsed?.user?.id;
            userEmail = parsed?.user?.email || '';
          } catch {}
        }
        
        // If we have stored data, use it immediately
        if (userId) {
          setCurrentUser({ id: userId, email: userEmail });
          
          // Fetch role and shop in parallel (non-blocking)
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
            // Cache role in sessionStorage for fast access
            sessionStorage.setItem(`user-role-${userId}`, roleResult.data.role);
          }
          
          if (shopResult.data) {
            setUserShop(shopResult.data as Shop);
          }
        } else {
          // Fallback to getUser if no localStorage data
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
              // Cache role in sessionStorage for fast access
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
