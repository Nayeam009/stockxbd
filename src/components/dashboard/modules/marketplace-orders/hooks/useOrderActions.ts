/**
 * Order Actions Hook
 * Handles order status updates, inventory sync, and POS conversion
 */

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import type { CommunityOrder, OrderStatus } from "../types";

interface UseOrderActionsProps {
  orders: CommunityOrder[];
  onOrderUpdated: () => void;
}

interface UseOrderActionsReturn {
  processingOrderId: string | null;
  convertOnlineOrderToPOS: (order: CommunityOrder) => Promise<string>;
  updateOrderStatus: (orderId: string, newStatus: OrderStatus, reason?: string) => Promise<void>;
  updateLPGStock: (brandName: string, weight: string, quantityChange: number, cylinderType: 'lpg_refill' | 'lpg_package') => Promise<void>;
  updateEmptyCylinderStock: (brandName: string, weight: string, quantity: number, type: 'empty' | 'leaked') => Promise<void>;
}

export function useOrderActions({ orders, onOrderUpdated }: UseOrderActionsProps): UseOrderActionsReturn {
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);

  // Convert online order to POS transaction
  const convertOnlineOrderToPOS = async (order: CommunityOrder): Promise<string> => {
    setProcessingOrderId(order.id);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Find or create customer by phone
      let customerId: string | null = null;
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', order.customer_phone)
        .maybeSingle();

      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        const { data: newCustomer } = await supabase
          .from('customers')
          .insert({
            name: order.customer_name,
            phone: order.customer_phone,
            address: `${order.delivery_address}, ${order.thana || ''}, ${order.district}, ${order.division}`,
            created_by: user.id
          })
          .select()
          .single();
        customerId = newCustomer?.id || null;
      }

      // Generate transaction number
      const { data: txnNumber, error: rpcError } = await supabase.rpc('generate_transaction_number');
      if (rpcError) throw rpcError;

      // Create POS transaction
      const { data: transaction, error: txnError } = await supabase
        .from('pos_transactions')
        .insert({
          transaction_number: txnNumber,
          customer_id: customerId,
          subtotal: order.subtotal,
          discount: 0,
          total: order.total_amount,
          payment_method: order.payment_method === 'cod' ? 'cash' : order.payment_method,
          payment_status: 'pending',
          community_order_id: order.id,
          is_online_order: true,
          created_by: user.id
        } as any)
        .select()
        .single();

      if (txnError) throw txnError;

      // Create transaction items
      for (const item of order.items || []) {
        const productName = `${item.brand_name || item.product_name} ${item.weight || ''} (${item.product_type === 'lpg_refill' ? 'Refill' : item.product_type === 'lpg_package' ? 'Package' : item.product_type})`;
        const productId = crypto.randomUUID();

        await supabase.from('pos_transaction_items').insert({
          transaction_id: transaction.id,
          product_id: productId,
          product_name: productName,
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.price * item.quantity
        });
      }

      return txnNumber;
    } finally {
      setProcessingOrderId(null);
    }
  };

  // Update LPG stock
  const updateLPGStock = async (brandName: string, weight: string, quantityChange: number, cylinderType: 'lpg_refill' | 'lpg_package') => {
    const { data: brand } = await supabase
      .from('lpg_brands')
      .select('id, refill_cylinder, package_cylinder')
      .ilike('name', `%${brandName}%`)
      .eq('weight', weight)
      .maybeSingle();

    if (brand) {
      const field = cylinderType === 'lpg_refill' ? 'refill_cylinder' : 'package_cylinder';
      const currentValue = (brand as any)[field] || 0;
      const newValue = Math.max(0, currentValue + quantityChange);
      await supabase.from('lpg_brands').update({ [field]: newValue }).eq('id', brand.id);
    }
  };

  // Update empty/problem cylinder stock
  const updateEmptyCylinderStock = async (brandName: string, weight: string, quantity: number, type: 'empty' | 'leaked') => {
    const { data: brand } = await supabase
      .from('lpg_brands')
      .select('id, empty_cylinder, problem_cylinder')
      .ilike('name', `%${brandName}%`)
      .eq('weight', weight)
      .maybeSingle();

    if (brand) {
      const field = type === 'leaked' ? 'problem_cylinder' : 'empty_cylinder';
      const currentValue = (brand as any)[field] || 0;
      await supabase.from('lpg_brands').update({ [field]: currentValue + quantity }).eq('id', brand.id);
    }
  };

  // Update order status with inventory sync
  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus, reason?: string) => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      const updateData: Record<string, any> = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      if (newStatus === 'confirmed') updateData.confirmed_at = new Date().toISOString();
      if (newStatus === 'dispatched') updateData.dispatched_at = new Date().toISOString();

      if (newStatus === 'delivered') {
        updateData.delivered_at = new Date().toISOString();
        updateData.payment_status = 'paid';
        updateData.return_cylinder_verified = true;
        updateData.verified_at = new Date().toISOString();

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          updateData.verified_by = user.id;
        }

        // Update inventory for each item
        for (const item of order.items || []) {
          if (item.product_type === 'lpg_refill' || item.product_type === 'lpg_package') {
            await updateLPGStock(
              item.brand_name || '',
              item.weight || '',
              -item.quantity,
              item.product_type as 'lpg_refill' | 'lpg_package'
            );

            if (item.return_cylinder_qty > 0 && item.return_cylinder_type) {
              await updateEmptyCylinderStock(
                item.brand_name || '',
                item.weight || '',
                item.return_cylinder_qty,
                item.return_cylinder_type
              );
            }
          }
        }
      }

      if (newStatus === 'rejected' && reason) updateData.rejection_reason = reason;

      const { error } = await supabase
        .from('community_orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: newStatus === 'delivered' ? "✅ Order Delivered!" : "Status Updated",
        description: newStatus === 'delivered'
          ? "Inventory updated. Payment marked as complete."
          : `Order status: ${newStatus}`
      });

      onOrderUpdated();
    } catch (error) {
      logger.error('Error updating order status:', error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive"
      });
    }
  };

  return {
    processingOrderId,
    convertOnlineOrderToPOS,
    updateOrderStatus,
    updateLPGStock,
    updateEmptyCylinderStock
  };
}
