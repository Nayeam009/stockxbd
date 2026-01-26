import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { format, startOfMonth, endOfMonth, subMonths, subDays, startOfWeek, endOfWeek, startOfYear, endOfYear } from "date-fns";
import { getCombinedCache, setCombinedCache } from "./useModuleCache";

// Cache key for Business Diary
const DIARY_CACHE_KEY = 'business_diary_data';

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

interface UseBusinessDiaryDataReturn {
  sales: SaleEntry[];
  expenses: ExpenseEntry[];
  loading: boolean;
  refetch: () => Promise<void>;
  analytics: {
    todayIncome: number;
    todayExpenses: number;
    todayProfit: number;
    weeklyIncome: number;
    weeklyExpenses: number;
    weeklyProfit: number;
    monthlyIncome: number;
    monthlyExpenses: number;
    monthlyProfit: number;
    yearlyIncome: number;
    yearlyExpenses: number;
    yearlyProfit: number;
    incomeGrowth: number;
    expenseGrowth: number;
    profitMargin: number;
    topProducts: { name: string; amount: number; count: number }[];
    topExpenseCategories: { name: string; amount: number; icon: string; color: string }[];
    paymentBreakdown: { method: string; amount: number }[];
  };
}

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

export const useBusinessDiaryData = (): UseBusinessDiaryDataReturn => {
  const [sales, setSales] = useState<SaleEntry[]>([]);
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSalesData = useCallback(async () => {
    try {
      // Fetch user roles for staff display
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('user_id, role');
      
      const roleMap = new Map<string, string>(userRoles?.map(r => [r.user_id, r.role]) || []);

      // Fetch POS transactions with items and created_by
      const { data: posTransactions, error: posError } = await supabase
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
        .limit(500);
      
      // Separately fetch online order info to avoid type issues with new columns
      const { data: onlineOrderInfo } = await supabase
        .from('pos_transactions')
        .select('id, is_online_order, community_order_id')
        .not('community_order_id', 'is', null);

      if (posError) throw posError;

      // Fetch customer payments (due collections)
      const { data: customerPayments, error: paymentError } = await supabase
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
        .limit(200);

      if (paymentError) throw paymentError;

      // Fetch customers for name lookup
      const { data: customers } = await supabase
        .from('customers')
        .select('id, name, phone');

      const customerMap = new Map(customers?.map(c => [c.id, c]) || []);

      // Helper to parse return cylinders from product name
      const parseReturnCylinders = (productName: string): { brand: string; quantity: number; type: 'empty' | 'problem' }[] => {
        // Only show returns for Refill products
        if (!productName.toLowerCase().includes('refill')) {
          return [];
        }
        const match = productName.match(/Return:\s*(.+)$/i);
        if (match) {
          return [{ brand: match[1].trim(), quantity: 1, type: 'empty' }];
        }
        return [];
      };

      // Helper to get staff role label
      const getStaffRole = (userId: string | null): 'owner' | 'manager' | 'driver' | 'staff' | 'unknown' => {
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

      // Build a map of online order transactions
      const onlineOrderMap = new Map<string, { isOnline: boolean; communityOrderId: string | null }>(
        (onlineOrderInfo || []).map((info: any) => [info.id, { 
          isOnline: info.is_online_order || false, 
          communityOrderId: info.community_order_id 
        }])
      );

      // Process POS transactions - handle both items and itemless transactions
      const posEntries: SaleEntry[] = (posTransactions || []).flatMap(txn => {
        const customer = txn.customer_id ? customerMap.get(txn.customer_id) : null;
        const items = txn.pos_transaction_items || [];
        const isWholesale = items.length > 1;
        const staffRole = getStaffRole(txn.created_by);
        const onlineInfo = onlineOrderMap.get(txn.id);
        const isOnlineOrder = onlineInfo?.isOnline || false;
        const communityOrderId = onlineInfo?.communityOrderId || null;
        
        // If no items but transaction has value, create single summary entry
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

      // Process customer payments (due collections)
      const paymentEntries: SaleEntry[] = (customerPayments || []).map(payment => {
        const staffRole = getStaffRole(payment.created_by);
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

      setSales([...posEntries, ...paymentEntries].sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ));
    } catch (error) {
      logger.error('Error fetching sales data', error, { component: 'BusinessDiary' });
    }
  }, []);

  const fetchExpensesData = useCallback(async () => {
    try {
      // Fetch user roles for staff display
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('user_id, role');
      
      const roleMap = new Map<string, string>(userRoles?.map(r => [r.user_id, r.role]) || []);

      // Helper to get staff role label
      const getStaffRole = (userId: string | null): 'owner' | 'manager' | 'driver' | 'staff' | 'unknown' => {
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

      // Fetch POB transactions
      const { data: pobTransactions, error: pobError } = await supabase
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
        .limit(300);

      if (pobError) throw pobError;

      // Fetch staff payments
      const { data: staffPayments, error: staffError } = await supabase
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
        .limit(200);

      if (staffError) throw staffError;

      // Fetch vehicle costs
      const { data: vehicleCosts, error: vehicleError } = await supabase
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
        .limit(200);

      if (vehicleError) throw vehicleError;

      // Fetch manual expenses
      const { data: manualExpenses, error: expenseError } = await supabase
        .from('daily_expenses')
        .select('*')
        .order('expense_date', { ascending: false })
        .limit(300);

      if (expenseError) throw expenseError;

      // Process POB transactions
      const pobEntries: ExpenseEntry[] = (pobTransactions || []).map(txn => {
        const items = txn.pob_transaction_items || [];
        const mainItem = items[0];
        const productType = mainItem?.product_type || 'Other';
        const categoryName = productType === 'lpg_cylinder' ? 'LPG Purchase' : 
                            productType === 'stove' ? 'Gas Stove Purchase' : 
                            productType === 'regulator' ? 'Regulator Purchase' : 'Other';
        const catInfo = getCategoryInfo(categoryName);
        const staffRole = getStaffRole(txn.created_by);
        
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
      const salaryEntries: ExpenseEntry[] = (staffPayments || []).map(payment => {
        const catInfo = getCategoryInfo('Staff Salary');
        const staffRole = getStaffRole(payment.created_by);
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
      const vehicleEntries: ExpenseEntry[] = (vehicleCosts || []).map(cost => {
        const catName = cost.cost_type === 'fuel' ? 'Vehicle Fuel' : 'Vehicle Maintenance';
        const catInfo = getCategoryInfo(catName);
        const staffRole = getStaffRole(cost.created_by);
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
      const manualEntries: ExpenseEntry[] = (manualExpenses || []).map(expense => {
        const catInfo = getCategoryInfo(expense.category);
        const staffRole = getStaffRole(expense.created_by);
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

      setExpenses([...pobEntries, ...salaryEntries, ...vehicleEntries, ...manualEntries].sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ));
    } catch (error) {
      logger.error('Error fetching expenses data', error, { component: 'BusinessDiary' });
    }
  }, []);

  const refetch = useCallback(async (isBackgroundRefresh = false) => {
    if (!isBackgroundRefresh) setLoading(true);
    await Promise.all([fetchSalesData(), fetchExpensesData()]);
    if (!isBackgroundRefresh) setLoading(false);
  }, [fetchSalesData, fetchExpensesData]);

  // Cache sales and expenses after fetch
  const hasFetchedRef = useRef(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (sales.length > 0 || expenses.length > 0) {
      setCombinedCache(DIARY_CACHE_KEY, { sales, expenses });
    }
  }, [sales, expenses]);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    
    // Try cache first for instant rendering
    const cached = getCombinedCache<{ sales: SaleEntry[]; expenses: ExpenseEntry[] }>(DIARY_CACHE_KEY);
    
    if (cached) {
      setSales(cached.sales || []);
      setExpenses(cached.expenses || []);
      setLoading(false);
      // Background refresh
      refetch(true);
    } else {
      refetch(false);
    }

    // Set up real-time subscriptions with debouncing
    const debouncedSalesFetch = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => fetchSalesData(), 1000);
    };
    
    const debouncedExpensesFetch = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => fetchExpensesData(), 1000);
    };
    
    const salesChannel = supabase
      .channel('diary-sales-realtime-v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pos_transactions' }, debouncedSalesFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pos_transaction_items' }, debouncedSalesFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_payments' }, debouncedSalesFetch)
      .subscribe();

    const expensesChannel = supabase
      .channel('diary-expenses-realtime-v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pob_transactions' }, debouncedExpensesFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pob_transaction_items' }, debouncedExpensesFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_payments' }, debouncedExpensesFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicle_costs' }, debouncedExpensesFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_expenses' }, debouncedExpensesFetch)
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(salesChannel);
      supabase.removeChannel(expensesChannel);
    };
  }, [refetch, fetchSalesData, fetchExpensesData]);

  // Calculate analytics
  const analytics = useMemo(() => {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const weekStart = startOfWeek(today, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 0 });
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);
    const yearStart = startOfYear(today);
    const yearEnd = endOfYear(today);
    const lastMonthStart = startOfMonth(subMonths(today, 1));
    const lastMonthEnd = endOfMonth(subMonths(today, 1));

    // Filter functions
    const isToday = (date: string) => date === todayStr;
    const isThisWeek = (date: string) => {
      const d = new Date(date);
      return d >= weekStart && d <= weekEnd;
    };
    const isThisMonth = (date: string) => {
      const d = new Date(date);
      return d >= monthStart && d <= monthEnd;
    };
    const isThisYear = (date: string) => {
      const d = new Date(date);
      return d >= yearStart && d <= yearEnd;
    };
    const isLastMonth = (date: string) => {
      const d = new Date(date);
      return d >= lastMonthStart && d <= lastMonthEnd;
    };

    // Income calculations
    const todayIncome = sales.filter(s => isToday(s.date)).reduce((sum, s) => sum + s.totalAmount, 0);
    const weeklyIncome = sales.filter(s => isThisWeek(s.date)).reduce((sum, s) => sum + s.totalAmount, 0);
    const monthlyIncome = sales.filter(s => isThisMonth(s.date)).reduce((sum, s) => sum + s.totalAmount, 0);
    const yearlyIncome = sales.filter(s => isThisYear(s.date)).reduce((sum, s) => sum + s.totalAmount, 0);
    const lastMonthIncome = sales.filter(s => isLastMonth(s.date)).reduce((sum, s) => sum + s.totalAmount, 0);

    // Expense calculations
    const todayExpenses = expenses.filter(e => isToday(e.date)).reduce((sum, e) => sum + e.amount, 0);
    const weeklyExpenses = expenses.filter(e => isThisWeek(e.date)).reduce((sum, e) => sum + e.amount, 0);
    const monthlyExpenses = expenses.filter(e => isThisMonth(e.date)).reduce((sum, e) => sum + e.amount, 0);
    const yearlyExpenses = expenses.filter(e => isThisYear(e.date)).reduce((sum, e) => sum + e.amount, 0);
    const lastMonthExpenses = expenses.filter(e => isLastMonth(e.date)).reduce((sum, e) => sum + e.amount, 0);

    // Profit calculations
    const todayProfit = todayIncome - todayExpenses;
    const weeklyProfit = weeklyIncome - weeklyExpenses;
    const monthlyProfit = monthlyIncome - monthlyExpenses;
    const yearlyProfit = yearlyIncome - yearlyExpenses;

    // Growth calculations
    const incomeGrowth = lastMonthIncome > 0 ? ((monthlyIncome - lastMonthIncome) / lastMonthIncome) * 100 : 0;
    const expenseGrowth = lastMonthExpenses > 0 ? ((monthlyExpenses - lastMonthExpenses) / lastMonthExpenses) * 100 : 0;
    const profitMargin = monthlyIncome > 0 ? (monthlyProfit / monthlyIncome) * 100 : 0;

    // Top products
    const productMap = new Map<string, { amount: number; count: number }>();
    sales.filter(s => isThisMonth(s.date)).forEach(s => {
      const existing = productMap.get(s.productName) || { amount: 0, count: 0 };
      productMap.set(s.productName, { 
        amount: existing.amount + s.totalAmount, 
        count: existing.count + s.quantity 
      });
    });
    const topProducts = Array.from(productMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // Top expense categories
    const categoryMap = new Map<string, { amount: number; icon: string; color: string }>();
    expenses.filter(e => isThisMonth(e.date)).forEach(e => {
      const existing = categoryMap.get(e.category) || { amount: 0, icon: e.categoryIcon, color: e.categoryColor };
      categoryMap.set(e.category, { 
        amount: existing.amount + e.amount, 
        icon: e.categoryIcon, 
        color: e.categoryColor 
      });
    });
    const topExpenseCategories = Array.from(categoryMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // Payment breakdown
    const paymentMap = new Map<string, number>();
    sales.filter(s => isThisMonth(s.date) && s.paymentStatus === 'paid').forEach(s => {
      const existing = paymentMap.get(s.paymentMethod) || 0;
      paymentMap.set(s.paymentMethod, existing + s.totalAmount);
    });
    const paymentBreakdown = Array.from(paymentMap.entries())
      .map(([method, amount]) => ({ method, amount }))
      .sort((a, b) => b.amount - a.amount);

    return {
      todayIncome,
      todayExpenses,
      todayProfit,
      weeklyIncome,
      weeklyExpenses,
      weeklyProfit,
      monthlyIncome,
      monthlyExpenses,
      monthlyProfit,
      yearlyIncome,
      yearlyExpenses,
      yearlyProfit,
      incomeGrowth,
      expenseGrowth,
      profitMargin,
      topProducts,
      topExpenseCategories,
      paymentBreakdown
    };
  }, [sales, expenses]);

  return {
    sales,
    expenses,
    loading,
    refetch,
    analytics
  };
};
