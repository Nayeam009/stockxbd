/**
 * Business Diary TanStack Query Hooks
 * 
 * Optimized data fetching with:
 * - 30-second stale time for fast revisits
 * - 5-minute garbage collection
 * - Debounced real-time invalidation
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { format } from "date-fns";

// ===== Types =====
export interface SaleEntry {
  id: string;
  type: 'pos' | 'payment';
  date: string;
  timestamp: string;
  staffName: string;
  staffRole: 'owner' | 'manager' | 'driver' | 'staff' | 'unknown';
  staffId: string | null;
  productName: string;
  productDetails: string;
  returnCylinders: { brand: string; quantity: number; type: 'empty' | 'problem' }[];
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: 'paid' | 'due' | 'partial';
  customerName: string;
  customerPhone: string | null;
  customerId: string | null;
  transactionType: 'retail' | 'wholesale';
  transactionNumber: string;
  source: string;
  sourceId: string;
  isOnlineOrder?: boolean;
  communityOrderId?: string | null;
}

export interface ExpenseEntry {
  id: string;
  type: 'pob' | 'salary' | 'vehicle' | 'manual';
  date: string;
  timestamp: string;
  staffName: string;
  staffRole: 'owner' | 'manager' | 'driver' | 'staff' | 'unknown';
  staffId: string | null;
  category: string;
  categoryIcon: string;
  categoryColor: string;
  description: string;
  whySpent: string;
  amount: number;
  source: string;
  sourceId: string;
  supplierName?: string;
  vehicleName?: string;
  staffPayeeName?: string;
}

// ===== Constants =====
const EXPENSE_CATEGORY_MAP: Record<string, { icon: string; color: string }> = {
  'LPG Purchase': { icon: '🛢️', color: '#3b82f6' },
  'Gas Stove Purchase': { icon: '🔥', color: '#f97316' },
  'Regulator Purchase': { icon: '⚙️', color: '#8b5cf6' },
  'Transport': { icon: '🚛', color: '#8b5cf6' },
  'Staff': { icon: '👥', color: '#22c55e' },
  'Staff Salary': { icon: '👥', color: '#22c55e' },
  'Staff Advance': { icon: '💵', color: '#10b981' },
  'Staff Bonus': { icon: '🎁', color: '#6366f1' },
  'Utilities': { icon: '💡', color: '#eab308' },
  'Maintenance': { icon: '🔧', color: '#f97316' },
  'Rent': { icon: '🏠', color: '#ec4899' },
  'Marketing': { icon: '📢', color: '#06b6d4' },
  'Vehicle': { icon: '🚗', color: '#10b981' },
  'Vehicle Fuel': { icon: '⛽', color: '#f59e0b' },
  'Vehicle Maintenance': { icon: '🔧', color: '#ef4444' },
  'Loading': { icon: '👷', color: '#a855f7' },
  'Entertainment': { icon: '☕', color: '#f472b6' },
  'Bank': { icon: '🏦', color: '#0ea5e9' },
  'Other': { icon: '📦', color: '#6b7280' }
};

const getCategoryInfo = (category: string) => {
  return EXPENSE_CATEGORY_MAP[category] || EXPENSE_CATEGORY_MAP['Other'];
};

// ===== Helper Functions =====
const getStaffRole = (roleMap: Map<string, string>, userId: string | null): 'owner' | 'manager' | 'driver' | 'staff' | 'unknown' => {
  if (!userId) return 'unknown';
  const role = roleMap.get(userId);
  if (role === 'owner') return 'owner';
  if (role === 'manager') return 'manager';
  if (role === 'driver') return 'driver';
  return 'staff';
};

const getStaffName = (role: string): string => {
  return role.charAt(0).toUpperCase() + role.slice(1);
};

const parseReturnCylinders = (productName: string): { brand: string; quantity: number; type: 'empty' | 'problem' }[] => {
  if (!productName.toLowerCase().includes('refill')) return [];
  const match = productName.match(/Return:\s*(.+)$/i);
  if (match) return [{ brand: match[1].trim(), quantity: 1, type: 'empty' }];
  return [];
};

// ===== Fetch Functions =====
async function fetchSalesData(): Promise<SaleEntry[]> {
  try {
    // Parallel fetch: user_roles, pos_transactions, customer_payments, customers
    const [userRolesResult, posResult, paymentsResult, customersResult] = await Promise.all([
      supabase.from('user_roles').select('user_id, role'),
      supabase
        .from('pos_transactions')
        .select(`
          id,
          transaction_number,
          created_at,
          created_by,
          total,
          subtotal,
          discount,
          payment_method,
          payment_status,
          customer_id,
          driver_id,
          notes,
          is_online_order,
          community_order_id,
          pos_transaction_items (
            id,
            product_name,
            quantity,
            unit_price,
            total_price
          )
        `)
        .eq('is_voided', false)
        .order('created_at', { ascending: false })
        .limit(500),
      supabase
        .from('customer_payments')
        .select(`
          id,
          customer_id,
          amount,
          cylinders_collected,
          payment_date,
          notes,
          created_at,
          created_by,
          customers (
            name,
            phone
          )
        `)
        .order('created_at', { ascending: false })
        .limit(200),
      supabase.from('customers').select('id, name, phone')
    ]);

    const roleMap = new Map<string, string>(userRolesResult.data?.map(r => [r.user_id, r.role]) || []);
    const customerMap = new Map(customersResult.data?.map(c => [c.id, c]) || []);

    // Process POS transactions
    const posEntries: SaleEntry[] = (posResult.data || []).flatMap(txn => {
      const customer = txn.customer_id ? customerMap.get(txn.customer_id) : null;
      const items = txn.pos_transaction_items || [];
      const isWholesale = items.length > 1;
      const staffRole = getStaffRole(roleMap, txn.created_by);
      const isOnlineOrder = txn.is_online_order || false;
      const communityOrderId = txn.community_order_id || null;
      
      if (items.length === 0 && Number(txn.total) > 0) {
        return [{
          id: txn.id,
          type: 'pos' as const,
          date: format(new Date(txn.created_at), 'yyyy-MM-dd'),
          timestamp: txn.created_at,
          staffName: getStaffName(staffRole),
          staffRole,
          staffId: txn.created_by,
          productName: 'POS Sale',
          productDetails: `Total: ৳${Number(txn.total).toLocaleString()}`,
          returnCylinders: [],
          quantity: 1,
          unitPrice: Number(txn.total),
          totalAmount: Number(txn.total),
          paymentMethod: txn.payment_method,
          paymentStatus: (txn.payment_status === 'completed' || txn.payment_status === 'paid' ? 'paid' : txn.payment_status === 'partial' ? 'partial' : 'due') as 'paid' | 'due' | 'partial',
          customerName: customer?.name || 'Walk-in Customer',
          customerPhone: customer?.phone || null,
          customerId: txn.customer_id,
          transactionType: 'retail' as 'retail' | 'wholesale',
          transactionNumber: txn.transaction_number,
          source: isOnlineOrder ? 'Online Order' : 'POS',
          sourceId: txn.id,
          isOnlineOrder,
          communityOrderId
        }];
      }
      
      return items.map((item: any) => ({
        id: item.id,
        type: 'pos' as const,
        date: format(new Date(txn.created_at), 'yyyy-MM-dd'),
        timestamp: txn.created_at,
        staffName: getStaffName(staffRole),
        staffRole,
        staffId: txn.created_by,
        productName: item.product_name || 'Unknown Product',
        productDetails: `${item.quantity} x ৳${item.unit_price}`,
        returnCylinders: parseReturnCylinders(item.product_name || ''),
        quantity: item.quantity,
        unitPrice: Number(item.unit_price),
        totalAmount: Number(item.total_price),
        paymentMethod: txn.payment_method,
        paymentStatus: (txn.payment_status === 'completed' || txn.payment_status === 'paid' ? 'paid' : txn.payment_status === 'partial' ? 'partial' : 'due') as 'paid' | 'due' | 'partial',
        customerName: customer?.name || 'Walk-in Customer',
        customerPhone: customer?.phone || null,
        customerId: txn.customer_id,
        transactionType: isWholesale ? 'wholesale' : 'retail' as 'retail' | 'wholesale',
        transactionNumber: txn.transaction_number,
        source: isOnlineOrder ? 'Online Order' : 'POS',
        sourceId: txn.id,
        isOnlineOrder,
        communityOrderId
      }));
    });

    // Process customer payments
    const paymentEntries: SaleEntry[] = (paymentsResult.data || []).map(payment => {
      const staffRole = getStaffRole(roleMap, payment.created_by);
      return {
        id: payment.id,
        type: 'payment' as const,
        date: format(new Date(payment.payment_date), 'yyyy-MM-dd'),
        timestamp: payment.created_at,
        staffName: getStaffName(staffRole),
        staffRole,
        staffId: payment.created_by,
        productName: 'Due Payment Received',
        productDetails: payment.cylinders_collected ? `+ ${payment.cylinders_collected} cylinders returned` : '',
        returnCylinders: [],
        quantity: 1,
        unitPrice: Number(payment.amount),
        totalAmount: Number(payment.amount),
        paymentMethod: 'cash',
        paymentStatus: 'paid' as const,
        customerName: (payment.customers as any)?.name || 'Unknown Customer',
        customerPhone: (payment.customers as any)?.phone || null,
        customerId: payment.customer_id,
        transactionType: 'retail' as const,
        transactionNumber: `PAY-${payment.id.slice(0, 8)}`,
        source: 'Customer Payment',
        sourceId: payment.id
      };
    });

    return [...posEntries, ...paymentEntries].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  } catch (error) {
    logger.error('Error fetching sales data', error, { component: 'BusinessDiaryQueries' });
    return [];
  }
}

async function fetchExpensesData(): Promise<ExpenseEntry[]> {
  try {
    // Parallel fetch: user_roles + all expense sources
    const [userRolesResult, pobResult, staffPaymentsResult, vehicleCostsResult, manualExpensesResult] = await Promise.all([
      supabase.from('user_roles').select('user_id, role'),
      supabase
        .from('pob_transactions')
        .select(`
          id,
          transaction_number,
          created_at,
          created_by,
          total,
          supplier_name,
          payment_method,
          notes,
          pob_transaction_items (
            id,
            product_name,
            product_type,
            quantity,
            unit_price,
            total_price
          )
        `)
        .eq('is_voided', false)
        .order('created_at', { ascending: false })
        .limit(300),
      supabase
        .from('staff_payments')
        .select(`
          id,
          staff_id,
          amount,
          payment_date,
          notes,
          created_at,
          created_by,
          staff (
            name,
            role
          )
        `)
        .order('created_at', { ascending: false })
        .limit(200),
      supabase
        .from('vehicle_costs')
        .select(`
          id,
          vehicle_id,
          amount,
          cost_type,
          cost_date,
          description,
          liters_filled,
          odometer_reading,
          created_at,
          created_by,
          vehicles (
            name,
            license_plate
          )
        `)
        .order('created_at', { ascending: false })
        .limit(200),
      supabase
        .from('daily_expenses')
        .select('*')
        .order('expense_date', { ascending: false })
        .limit(300)
    ]);

    const roleMap = new Map<string, string>(userRolesResult.data?.map(r => [r.user_id, r.role]) || []);

    // Process POB transactions
    const pobEntries: ExpenseEntry[] = (pobResult.data || []).map(txn => {
      const items = txn.pob_transaction_items || [];
      const mainItem = items[0];
      const productType = mainItem?.product_type || 'Other';
      const categoryName = productType === 'lpg_cylinder' ? 'LPG Purchase' : 
                          productType === 'stove' ? 'Gas Stove Purchase' : 
                          productType === 'regulator' ? 'Regulator Purchase' : 'Other';
      const catInfo = getCategoryInfo(categoryName);
      const staffRole = getStaffRole(roleMap, txn.created_by);
      
      return {
        id: txn.id,
        type: 'pob' as const,
        date: format(new Date(txn.created_at), 'yyyy-MM-dd'),
        timestamp: txn.created_at,
        staffName: getStaffName(staffRole),
        staffRole,
        staffId: txn.created_by,
        category: categoryName,
        categoryIcon: catInfo.icon,
        categoryColor: catInfo.color,
        description: items.map((i: any) => `${i.quantity}x ${i.product_name}`).join(', ') || 'Product purchase',
        whySpent: 'Product bought with POB',
        amount: Number(txn.total),
        source: 'POB',
        sourceId: txn.id,
        supplierName: txn.supplier_name
      };
    });

    // Process staff payments
    const salaryEntries: ExpenseEntry[] = (staffPaymentsResult.data || []).map(payment => {
      const catInfo = getCategoryInfo('Staff Salary');
      const staffRole = getStaffRole(roleMap, payment.created_by);
      return {
        id: payment.id,
        type: 'salary' as const,
        date: format(new Date(payment.payment_date), 'yyyy-MM-dd'),
        timestamp: payment.created_at,
        staffName: getStaffName(staffRole),
        staffRole,
        staffId: payment.created_by,
        category: 'Staff Salary',
        categoryIcon: catInfo.icon,
        categoryColor: catInfo.color,
        description: payment.notes || `Salary payment to ${(payment.staff as any)?.name || 'Staff'}`,
        whySpent: 'Staff salary payment',
        amount: Number(payment.amount),
        source: 'Staff Salary',
        sourceId: payment.id,
        staffPayeeName: (payment.staff as any)?.name
      };
    });

    // Process vehicle costs
    const vehicleEntries: ExpenseEntry[] = (vehicleCostsResult.data || []).map(cost => {
      const catName = cost.cost_type === 'fuel' ? 'Vehicle Fuel' : 'Vehicle Maintenance';
      const catInfo = getCategoryInfo(catName);
      const staffRole = getStaffRole(roleMap, cost.created_by);
      return {
        id: cost.id,
        type: 'vehicle' as const,
        date: format(new Date(cost.cost_date), 'yyyy-MM-dd'),
        timestamp: cost.created_at,
        staffName: getStaffName(staffRole),
        staffRole,
        staffId: cost.created_by,
        category: catName,
        categoryIcon: catInfo.icon,
        categoryColor: catInfo.color,
        description: cost.description || `${cost.cost_type} for ${(cost.vehicles as any)?.name || 'Vehicle'}${cost.liters_filled ? ` (${cost.liters_filled}L)` : ''}`,
        whySpent: 'Vehicle operational cost',
        amount: Number(cost.amount),
        source: 'Vehicle Cost',
        sourceId: cost.id,
        vehicleName: (cost.vehicles as any)?.name
      };
    });

    // Process manual expenses
    const manualEntries: ExpenseEntry[] = (manualExpensesResult.data || []).map(expense => {
      const catInfo = getCategoryInfo(expense.category);
      const staffRole = getStaffRole(roleMap, expense.created_by);
      return {
        id: expense.id,
        type: 'manual' as const,
        date: expense.expense_date,
        timestamp: expense.created_at,
        staffName: getStaffName(staffRole),
        staffRole,
        staffId: expense.created_by,
        category: expense.category,
        categoryIcon: catInfo.icon,
        categoryColor: catInfo.color,
        description: expense.description || expense.category,
        whySpent: expense.category === 'Utilities' ? 'Utility bill payment' : 
                  expense.category === 'Rent' ? 'Shop rent payment' :
                  expense.category === 'Loading' ? 'Loading/labor cost' :
                  expense.category === 'Entertainment' ? 'Business entertainment' :
                  'General expense',
        amount: Number(expense.amount),
        source: 'Manual Entry',
        sourceId: expense.id
      };
    });

    return [...pobEntries, ...salaryEntries, ...vehicleEntries, ...manualEntries].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  } catch (error) {
    logger.error('Error fetching expenses data', error, { component: 'BusinessDiaryQueries' });
    return [];
  }
}

// ===== Query Hooks =====
export const useBusinessSales = () => {
  return useQuery({
    queryKey: ['business-diary-sales'],
    queryFn: fetchSalesData,
    staleTime: 1000 * 30, // 30 seconds - fresh but cached
    gcTime: 1000 * 60 * 5, // 5 minutes garbage collection
  });
};

export const useBusinessExpenses = () => {
  return useQuery({
    queryKey: ['business-diary-expenses'],
    queryFn: fetchExpensesData,
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
  });
};

// ===== Real-time Subscription Hook with Debouncing =====
export const useBusinessDiaryRealtime = () => {
  const queryClient = useQueryClient();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  
  const debouncedInvalidate = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['business-diary-sales'] });
      queryClient.invalidateQueries({ queryKey: ['business-diary-expenses'] });
    }, 2000); // 2 second debounce
  }, [queryClient]);
  
  useEffect(() => {
    // Single consolidated channel for all diary-related tables
    const channel = supabase
      .channel('diary-combined-realtime-v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pos_transactions' }, debouncedInvalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pos_transaction_items' }, debouncedInvalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_payments' }, debouncedInvalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pob_transactions' }, debouncedInvalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pob_transaction_items' }, debouncedInvalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_payments' }, debouncedInvalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicle_costs' }, debouncedInvalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_expenses' }, debouncedInvalidate)
      .subscribe();
    
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [debouncedInvalidate]);
};
