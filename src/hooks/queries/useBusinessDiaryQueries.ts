/**
 * Business Diary TanStack Query Hooks - Complete Rebuild
 * 
 * Features:
 * - Staff payments & vehicle costs integration
 * - Customer debt summary calculation
 * - Real-time subscriptions for all expense tables
 * - Optimized parallel fetching with 30s stale time
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useCallback, useMemo } from "react";
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
  amountPaid: number;
  remainingDue: number;
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
  cogs?: number;
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

export interface CustomerDebtSummary {
  totalPaidCount: number;
  totalPaidAmount: number;
  partialPaidCount: number;
  partialPaidAmount: number;
  partialRemainingDue: number;
  dueCount: number;
  dueAmount: number;
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
  'Vehicle Repair': { icon: '🔩', color: '#dc2626' },
  'Vehicle Parts': { icon: '⚡', color: '#7c3aed' },
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

const parsePartialPaymentFromNotes = (notes: string | null, total: number): { amountPaid: number; remainingDue: number } => {
  if (!notes) return { amountPaid: 0, remainingDue: total };
  const paidMatch = notes.match(/Paid:\s*৳?(\d+(?:,\d+)*(?:\.\d+)?)/i);
  if (paidMatch) {
    const amountPaid = parseFloat(paidMatch[1].replace(/,/g, '')) || 0;
    const remainingDue = Math.max(0, total - amountPaid);
    return { amountPaid, remainingDue };
  }
  return { amountPaid: 0, remainingDue: total };
};

const getPaymentAmounts = (paymentStatus: string, total: number, notes: string | null): { amountPaid: number; remainingDue: number } => {
  if (paymentStatus === 'paid' || paymentStatus === 'completed') {
    return { amountPaid: total, remainingDue: 0 };
  }
  if (paymentStatus === 'partial') {
    return parsePartialPaymentFromNotes(notes, total);
  }
  return { amountPaid: 0, remainingDue: total };
};

// ===== Fetch Functions =====
async function fetchSalesData(date: string): Promise<SaleEntry[]> {
  try {
    const [userRolesResult, posResult, paymentsResult, customersResult, pricesResult] = await Promise.all([
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
        .gte('created_at', format(new Date(date), "yyyy-MM-dd'T'00:00:00"))
        .lte('created_at', format(new Date(date), "yyyy-MM-dd'T'23:59:59.999"))
        .order('created_at', { ascending: false }),
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
        .eq('payment_date', date)
        .order('created_at', { ascending: false }),
      supabase.from('customers').select('id, name, phone'),
      supabase.from('product_prices').select('product_name, company_price, is_active')
    ]);

    const roleMap = new Map<string, string>(userRolesResult.data?.map(r => [r.user_id, r.role]) || []);
    const customerMap = new Map(customersResult.data?.map(c => [c.id, c]) || []);
    const priceMap = new Map<string, number>();
    
    if (pricesResult.data) {
      pricesResult.data.forEach(p => {
        if (p.product_name) {
          priceMap.set(p.product_name.toLowerCase().trim(), Number(p.company_price) || 0);
        }
      });
    }

    // Process POS transactions
    const posEntries: SaleEntry[] = (posResult.data || []).flatMap(txn => {
      if (format(new Date(txn.created_at), 'yyyy-MM-dd') !== date) return [];

      const customer = txn.customer_id ? customerMap.get(txn.customer_id) : null;
      const items = txn.pos_transaction_items || [];
      const isWholesale = items.length > 1;
      const staffRole = getStaffRole(roleMap, txn.created_by);
      const isOnlineOrder = txn.is_online_order || false;
      const communityOrderId = txn.community_order_id || null;

      if (items.length === 0 && Number(txn.total) > 0) {
        const paymentAmounts = getPaymentAmounts(txn.payment_status, Number(txn.total), txn.notes);
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
          amountPaid: paymentAmounts.amountPaid,
          remainingDue: paymentAmounts.remainingDue,
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
          communityOrderId,
          cogs: 0
        }];
      }

      const txnTotal = Number(txn.total);
      const paymentAmounts = getPaymentAmounts(txn.payment_status, txnTotal, txn.notes);
      const itemsTotal = items.reduce((sum: number, item: any) => sum + Number(item.total_price), 0);

      return items.map((item: any) => {
        const itemTotal = Number(item.total_price);
        const itemProportion = itemsTotal > 0 ? itemTotal / itemsTotal : 0;
        const itemAmountPaid = paymentAmounts.amountPaid * itemProportion;
        const itemRemainingDue = paymentAmounts.remainingDue * itemProportion;
        const productNameNormalized = (item.product_name || '').toLowerCase().trim();
        const buyPrice = priceMap.get(productNameNormalized) || 0;
        const itemCogs = buyPrice * Number(item.quantity || 0);

        return {
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
          totalAmount: itemTotal,
          amountPaid: itemAmountPaid,
          remainingDue: itemRemainingDue,
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
          communityOrderId,
          cogs: itemCogs
        };
      });
    });

    // Process customer payments
    const paymentEntries: SaleEntry[] = (paymentsResult.data || []).map(payment => {
      const staffRole = getStaffRole(roleMap, payment.created_by);
      const paymentAmount = Number(payment.amount);
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
        unitPrice: paymentAmount,
        totalAmount: paymentAmount,
        amountPaid: paymentAmount,
        remainingDue: 0,
        paymentMethod: 'cash',
        paymentStatus: 'paid' as const,
        customerName: (payment.customers as any)?.name || 'Unknown Customer',
        customerPhone: (payment.customers as any)?.phone || null,
        customerId: payment.customer_id,
        transactionType: 'retail' as const,
        transactionNumber: `PAY-${payment.id.slice(0, 8)}`,
        source: 'Customer Payment',
        sourceId: payment.id,
        cogs: 0
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

async function fetchExpensesData(date: string): Promise<ExpenseEntry[]> {
  try {
    // Parallel fetch ALL expense sources including staff_payments and vehicle_costs
    const [userRolesResult, pobResult, manualExpensesResult, staffPaymentsResult, vehicleCostsResult] = await Promise.all([
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
        .gte('created_at', format(new Date(date), "yyyy-MM-dd'T'00:00:00"))
        .lte('created_at', format(new Date(date), "yyyy-MM-dd'T'23:59:59.999"))
        .order('created_at', { ascending: false }),
      supabase
        .from('daily_expenses')
        .select('*')
        .eq('expense_date', date)
        .order('created_at', { ascending: false }),
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
        .eq('payment_date', date)
        .order('created_at', { ascending: false }),
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
          created_at,
          created_by,
          vehicles (
            name
          )
        `)
        .eq('cost_date', date)
        .order('created_at', { ascending: false })
    ]);

    const roleMap = new Map<string, string>(userRolesResult.data?.map(r => [r.user_id, r.role]) || []);

    // Process POB transactions
    const pobEntries: ExpenseEntry[] = (pobResult.data || []).flatMap(txn => {
      if (format(new Date(txn.created_at), 'yyyy-MM-dd') !== date) return [];

      const items = txn.pob_transaction_items || [];
      const mainItem = items[0];
      const productType = mainItem?.product_type || 'Other';
      const categoryName = productType === 'lpg_cylinder' ? 'LPG Purchase' :
        productType === 'stove' ? 'Gas Stove Purchase' :
        productType === 'regulator' ? 'Regulator Purchase' : 'Other';
      const catInfo = getCategoryInfo(categoryName);
      const staffRole = getStaffRole(roleMap, txn.created_by);

      return [{
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
      }];
    });

    // Process staff payments - CRITICAL ADDITION
    const staffEntries: ExpenseEntry[] = (staffPaymentsResult.data || []).map(payment => {
      const staffRole = getStaffRole(roleMap, payment.created_by);
      const catInfo = getCategoryInfo('Staff Salary');
      const staffInfo = payment.staff as any;
      
      return {
        id: payment.id,
        type: 'salary' as const,
        date: payment.payment_date,
        timestamp: payment.created_at,
        staffName: getStaffName(staffRole),
        staffRole,
        staffId: payment.created_by,
        category: 'Staff Salary',
        categoryIcon: catInfo.icon,
        categoryColor: catInfo.color,
        description: payment.notes || `Salary for ${staffInfo?.name || 'Staff'}`,
        whySpent: 'Staff salary payment',
        amount: Number(payment.amount),
        source: 'Staff Salary',
        sourceId: payment.id,
        staffPayeeName: staffInfo?.name || 'Unknown Staff'
      };
    });

    // Process vehicle costs - CRITICAL ADDITION
    const vehicleEntries: ExpenseEntry[] = (vehicleCostsResult.data || []).map(cost => {
      const staffRole = getStaffRole(roleMap, cost.created_by);
      const costType = cost.cost_type || 'fuel';
      const categoryName = costType === 'fuel' ? 'Vehicle Fuel' : 
        costType === 'maintenance' ? 'Vehicle Maintenance' :
        costType === 'repair' ? 'Vehicle Repair' :
        costType === 'parts' ? 'Vehicle Parts' : 'Vehicle';
      const catInfo = getCategoryInfo(categoryName);
      const vehicleInfo = cost.vehicles as any;
      
      return {
        id: cost.id,
        type: 'vehicle' as const,
        date: cost.cost_date,
        timestamp: cost.created_at,
        staffName: getStaffName(staffRole),
        staffRole,
        staffId: cost.created_by,
        category: categoryName,
        categoryIcon: catInfo.icon,
        categoryColor: catInfo.color,
        description: cost.description || (cost.liters_filled ? `${cost.liters_filled}L fuel` : categoryName),
        whySpent: `Vehicle ${costType} cost`,
        amount: Number(cost.amount),
        source: 'Vehicle Cost',
        sourceId: cost.id,
        vehicleName: vehicleInfo?.name || 'Unknown Vehicle'
      };
    });

    // Process manual daily expenses (excluding staff/vehicle synced ones)
    const manualEntries: ExpenseEntry[] = (manualExpensesResult.data || []).map(expense => {
      const catInfo = getCategoryInfo(expense.category);
      const staffRole = getStaffRole(roleMap, expense.created_by);

      // Determine if this is a synced entry or manual
      let type: ExpenseEntry['type'] = 'manual';
      let source = 'Manual Entry';
      
      // Check if category indicates synced data
      if (expense.category === 'Staff' || expense.category === 'Staff Salary') {
        type = 'salary';
        source = 'Staff Salary';
      } else if (expense.category.includes('Vehicle') || expense.category === 'Transport') {
        type = 'vehicle';
        source = 'Vehicle Cost';
      }

      return {
        id: expense.id,
        type,
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
          expense.category === 'Marketing' ? 'Marketing expense' :
          expense.category === 'Bank' ? 'Bank charges' :
          expense.category === 'Maintenance' ? 'Maintenance cost' :
          'General expense',
        amount: Number(expense.amount),
        source,
        sourceId: expense.id
      };
    });

    // Combine all and sort by timestamp
    return [...pobEntries, ...staffEntries, ...vehicleEntries, ...manualEntries].sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  } catch (error) {
    logger.error('Error fetching expenses data', error, { component: 'BusinessDiaryQueries' });
    return [];
  }
}

// ===== Query Hooks =====
export const useBusinessSales = (date: string) => {
  return useQuery({
    queryKey: ['business-diary-sales', date],
    queryFn: () => fetchSalesData(date),
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
  });
};

export const useBusinessExpenses = (date: string) => {
  return useQuery({
    queryKey: ['business-diary-expenses', date],
    queryFn: () => fetchExpensesData(date),
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
  });
};

// ===== Customer Debt Summary Hook =====
export const useCustomerDebtSummary = (sales: SaleEntry[]): CustomerDebtSummary => {
  return useMemo(() => {
    const paid = sales.filter(s => s.paymentStatus === 'paid');
    const partial = sales.filter(s => s.paymentStatus === 'partial');
    const due = sales.filter(s => s.paymentStatus === 'due');

    return {
      totalPaidCount: paid.length,
      totalPaidAmount: paid.reduce((sum, s) => sum + (s.amountPaid ?? s.totalAmount), 0),
      partialPaidCount: partial.length,
      partialPaidAmount: partial.reduce((sum, s) => sum + (s.amountPaid ?? 0), 0),
      partialRemainingDue: partial.reduce((sum, s) => sum + (s.remainingDue ?? 0), 0),
      dueCount: due.length,
      dueAmount: due.reduce((sum, s) => sum + (s.totalAmount ?? 0), 0)
    };
  }, [sales]);
};

// ===== Real-time Subscription Hook with Complete Table Coverage =====
export const useBusinessDiaryRealtime = (date: string) => {
  const queryClient = useQueryClient();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  const debouncedInvalidate = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['business-diary-sales', date] });
      queryClient.invalidateQueries({ queryKey: ['business-diary-expenses', date] });
    }, 1000);
  }, [queryClient, date]);

  useEffect(() => {
    if (!isOnline) return;

    // Consolidated channel for ALL diary-related tables
    const channel = supabase
      .channel('diary-complete-realtime-v3')
      // Sales tables
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pos_transactions' }, debouncedInvalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pos_transaction_items' }, debouncedInvalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_payments' }, debouncedInvalidate)
      // Expense tables
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pob_transactions' }, debouncedInvalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pob_transaction_items' }, debouncedInvalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_expenses' }, debouncedInvalidate)
      // CRITICAL: Staff & Vehicle tables
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_payments' }, debouncedInvalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicle_costs' }, debouncedInvalidate)
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [debouncedInvalidate, isOnline]);
};
