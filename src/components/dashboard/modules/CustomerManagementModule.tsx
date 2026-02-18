import React, { useState, useEffect, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  UserX,
  UserCheck,
  Search,
  ArrowRight,
  Users,
  Banknote,
  Package,
  History,
  Plus,
  ShoppingCart,
  Receipt,
  Printer,
  FileText,
  Phone,
  X,
  Building2,
  BookOpen,
  MessageSquare,
  TrendingUp,
  CreditCard
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
import { sanitizeString, customerSchema } from "@/lib/validationSchemas";
import { logger } from "@/lib/logger";
import { InvoiceDialog } from "@/components/invoice/InvoiceDialog";
import { useSharedCustomers, sharedKeys } from "@/hooks/useSharedQueries";
import { useModuleEvent } from "@/lib/moduleEvents";
import { PremiumModuleHeader } from "@/components/shared/PremiumModuleHeader";
import { EmptyStateCard } from "@/components/shared/EmptyStateCard";

type ViewMode = 'main' | 'due' | 'paid' | 'memo-search' | 'retail' | 'wholesale';

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  total_due: number;
  cylinders_due: number;
  billing_status: string;
  last_order_date: string | null;
  created_at: string;
  customer_type: 'retail' | 'wholesale';
  credit_limit?: number;
}

interface SalesRecord {
  id: string;
  date: string;
  items: string;
  total: number;
  status: string;
}

interface CustomerPayment {
  id: string;
  customer_id: string;
  amount: number;
  cylinders_collected: number;
  payment_date: string;
  notes: string | null;
}


interface POSTransaction {
  id: string;
  transaction_number: string;
  created_at: string;
  total: number;
  subtotal: number;
  discount: number;
  payment_status: string;
  payment_method: string;
  customer_id?: string;
  customer_name?: string;
  items?: string;
  pos_transaction_items?: Array<{
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
}

interface MemoSearchResult {
  type: 'customer' | 'transaction';
  customer?: Customer;
  transaction?: POSTransaction;
}

export const CustomerManagementModule = () => {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  
  // ===== USE SHARED QUERY FOR CUSTOMERS (Instant sync with POS) =====
  const { data: sharedCustomers = [], isLoading: customersLoading } = useSharedCustomers();
  
  // Map shared customers to local Customer interface
  const customers: Customer[] = sharedCustomers.map(c => ({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    address: c.address,
    total_due: c.total_due || 0,
    cylinders_due: c.cylinders_due || 0,
    billing_status: c.billing_status || 'clear',
    last_order_date: c.last_order_date,
    created_at: c.created_at,
    customer_type: c.customer_type || 'retail',
    credit_limit: c.credit_limit,
  }));
  
  const [viewMode, setViewMode] = useState<ViewMode>('main');
  const [payments, setPayments] = useState<CustomerPayment[]>([]);
  const [salesHistory, setSalesHistory] = useState<POSTransaction[]>([]);
  const [softLoading, setSoftLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [settleDialogOpen, setSettleDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [salesHistoryDialogOpen, setSalesHistoryDialogOpen] = useState(false);
  const [addCustomerDialogOpen, setAddCustomerDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [cylindersToCollect, setCylindersToCollect] = useState("");
  const [historyTab, setHistoryTab] = useState<'payments' | 'sales'>('sales');
  const [newCustomerType, setNewCustomerType] = useState<'retail' | 'wholesale'>('retail');
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    total_due: "",
    cylinders_due: "",
    credit_limit: "10000"
  });

  // Memo Recall Feature State
  const [memoSearchQuery, setMemoSearchQuery] = useState("");
  const [memoSearchResults, setMemoSearchResults] = useState<MemoSearchResult[]>([]);
  const [memoSearchLoading, setMemoSearchLoading] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<POSTransaction | null>(null);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  
  // ===== LISTEN FOR CROSS-MODULE EVENTS (POS sales trigger instant refresh) =====
  useModuleEvent('sale-completed', () => {
    // Immediately invalidate customers cache when POS sale completes
    queryClient.invalidateQueries({ queryKey: sharedKeys.customers(), refetchType: 'active' });
  });
  
  useModuleEvent('customer-updated', () => {
    // Refresh when customer is updated anywhere in the app
    queryClient.invalidateQueries({ queryKey: sharedKeys.customers(), refetchType: 'active' });
  });

  // Legacy fetch for manual refresh (now mostly unused, shared query handles it)
  const fetchCustomers = useCallback(async () => {
    queryClient.invalidateQueries({ queryKey: sharedKeys.customers(), refetchType: 'active' });
  }, [queryClient]);

  const fetchPayments = async () => {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const { data, error } = await supabase
      .from('customer_payments')
      .select('*')
      .gte('payment_date', ninetyDaysAgo.toISOString())
      .order('payment_date', { ascending: false })
      .limit(500);

    if (error) {
      logger.error('Error fetching payments', error, { component: 'CustomerManagement' });
    }
    if (!error) {
      setPayments(data || []);
    }
  };

  // Fetch customer sales history from POS transactions
  const fetchCustomerSalesHistory = async (customerId: string) => {
    const { data } = await supabase
      .from('pos_transactions')
      .select(`
        id,
        transaction_number,
        created_at,
        total,
        subtotal,
        discount,
        payment_status,
        payment_method,
        customer_id,
        pos_transaction_items (product_name, quantity, unit_price, total_price)
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      const history: POSTransaction[] = data.map(t => ({
        id: t.id,
        transaction_number: t.transaction_number,
        created_at: t.created_at,
        total: Number(t.total),
        subtotal: Number(t.subtotal),
        discount: Number(t.discount),
        payment_status: t.payment_status,
        payment_method: t.payment_method,
        customer_id: t.customer_id,
        items: t.pos_transaction_items?.map((i: any) => `${i.quantity}x ${i.product_name}`).join(', ') || 'N/A',
        pos_transaction_items: t.pos_transaction_items
      }));
      setSalesHistory(history);
    }
  };

  // Memo Recall Search Function
  const handleMemoSearch = useCallback(async (query: string) => {
    if (!query || query.length < 3) {
      setMemoSearchResults([]);
      return;
    }

    setMemoSearchLoading(true);
    const results: MemoSearchResult[] = [];

    try {
      // Search customers by phone
      const { data: customersByPhone } = await supabase
        .from('customers')
        .select('*')
        .ilike('phone', `%${query}%`)
        .limit(5);

      if (customersByPhone) {
        customersByPhone.forEach(c => {
          results.push({ type: 'customer', customer: { ...c, customer_type: ((c as any).customer_type || 'retail') as 'retail' | 'wholesale' } as Customer });
        });
      }

      // Search customers by name
      const { data: customersByName } = await supabase
        .from('customers')
        .select('*')
        .ilike('name', `%${query}%`)
        .limit(5);

      if (customersByName) {
        customersByName.forEach(c => {
          // Avoid duplicates
          if (!results.find(r => r.type === 'customer' && r.customer?.id === c.id)) {
            results.push({ type: 'customer', customer: { ...c, customer_type: ((c as any).customer_type || 'retail') as 'retail' | 'wholesale' } as Customer });
          }
        });
      }

      // Search transactions by transaction_number (Memo ID)
      const { data: transactions } = await supabase
        .from('pos_transactions')
        .select(`
          id,
          transaction_number,
          created_at,
          total,
          subtotal,
          discount,
          payment_status,
          payment_method,
          customer_id,
          pos_transaction_items (product_name, quantity, unit_price, total_price)
        `)
        .ilike('transaction_number', `%${query}%`)
        .order('created_at', { ascending: false })
        .limit(10);

      if (transactions) {
        // Fetch customer names for transactions
        const customerIds = transactions.filter(t => t.customer_id).map(t => t.customer_id) as string[];
        const { data: txCustomers } = customerIds.length > 0
          ? await supabase.from('customers').select('id, name').in('id', customerIds)
          : { data: [] };

        const customerMap = new Map<string, string>();
        txCustomers?.forEach(c => customerMap.set(c.id, c.name));

        transactions.forEach(t => {
          results.push({
            type: 'transaction',
            transaction: {
              ...t,
              customer_name: t.customer_id ? customerMap.get(t.customer_id) || 'Walk-in' : 'Walk-in',
              items: t.pos_transaction_items?.map((i: any) => `${i.quantity}x ${i.product_name}`).join(', ') || 'N/A',
            }
          });
        });
      }

      setMemoSearchResults(results);
    } catch (error) {
      logger.error('Memo search error', error, { component: 'CustomerManagement' });
    } finally {
      setMemoSearchLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      handleMemoSearch(memoSearchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [memoSearchQuery, handleMemoSearch]);

  const handleViewTransaction = async (transaction: POSTransaction) => {
    // Fetch full transaction details if needed
    const { data } = await supabase
      .from('pos_transactions')
      .select(`
        id,
        transaction_number,
        created_at,
        total,
        subtotal,
        discount,
        payment_status,
        payment_method,
        customer_id,
        pos_transaction_items (product_name, quantity, unit_price, total_price)
      `)
      .eq('id', transaction.id)
      .single();

    if (data) {
      // Get customer info
      let customerName = 'Walk-in Customer';
      let customerPhone = '';
      let customerAddress = '';

      if (data.customer_id) {
        const { data: customer } = await supabase
          .from('customers')
          .select('name, phone, address')
          .eq('id', data.customer_id)
          .single();

        if (customer) {
          customerName = customer.name;
          customerPhone = customer.phone || '';
          customerAddress = customer.address || '';
        }
      }

      setSelectedTransaction({
        ...data,
        customer_name: customerName,
        pos_transaction_items: data.pos_transaction_items
      });
      setInvoiceDialogOpen(true);
    }
  };

  const dueCustomers = customers.filter(c => c.total_due > 0 || c.cylinders_due > 0);
  const paidCustomers = customers.filter(c => c.total_due === 0 && c.cylinders_due === 0);

  const filteredDueCustomers = dueCustomers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone?.includes(searchQuery)
  );

  const filteredPaidCustomers = paidCustomers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone?.includes(searchQuery)
  );

  const totalAmountDue = dueCustomers.reduce((sum, c) => sum + Number(c.total_due), 0);
  const totalCylindersDue = dueCustomers.reduce((sum, c) => sum + c.cylinders_due, 0);

  const handleSettleAccount = async () => {
    if (!selectedCustomer) return;

    const amount = parseFloat(paymentAmount) || 0;
    const cylinders = parseInt(cylindersToCollect) || 0;

    // OPTIMISTIC UPDATE — fires instantly before server responds
    const newTotalDue = Math.max(0, selectedCustomer.total_due - amount);
    const newCylindersDue = Math.max(0, selectedCustomer.cylinders_due - cylinders);
    const newStatus = newTotalDue === 0 && newCylindersDue === 0 ? 'clear' : 'pending';

    queryClient.setQueryData(sharedKeys.customers(), (old: Customer[] | undefined) => {
      if (!old) return old;
      return old.map(c => {
        if (c.id !== selectedCustomer.id) return c;
        return { ...c, total_due: newTotalDue, cylinders_due: newCylindersDue, billing_status: newStatus };
      });
    });

    const { data: { user } } = await supabase.auth.getUser();

    // Record the payment with today's date
    const { error: paymentError } = await supabase
      .from('customer_payments')
      .insert({
        customer_id: selectedCustomer.id,
        amount: amount,
        cylinders_collected: cylinders,
        created_by: user?.id,
        payment_date: new Date().toISOString().split('T')[0]
      });

    if (paymentError) {
      // Rollback on error — refetch true server state
      queryClient.invalidateQueries({ queryKey: sharedKeys.customers() });
      logger.error('Error recording payment', paymentError, { component: 'CustomerManagement' });
      toast({ title: "Error recording payment", description: paymentError.message, variant: "destructive" });
      return;
    }

    // Update customer record
    const { error: updateError } = await supabase
      .from('customers')
      .update({
        total_due: newTotalDue,
        cylinders_due: newCylindersDue,
        billing_status: newStatus
      })
      .eq('id', selectedCustomer.id);

    if (updateError) {
      // Rollback on error
      queryClient.invalidateQueries({ queryKey: sharedKeys.customers() });
      logger.error('Error updating customer dues', updateError, { component: 'CustomerManagement' });
      toast({ title: "Error updating customer", description: updateError.message, variant: "destructive" });
      return;
    }

    toast({ title: "Account settled successfully" });
    setSettleDialogOpen(false);
    setPaymentAmount("");
    setCylindersToCollect("");
    setSelectedCustomer(null);
    fetchPayments();
  };

  const handleAddCustomer = async () => {
    // Validate customer input using Zod schema
    const result = customerSchema.safeParse({
      name: newCustomer.name,
      phone: newCustomer.phone || null,
      address: newCustomer.address || null,
    });

    if (!result.success) {
      toast({
        title: "Invalid input",
        description: result.error.errors[0]?.message || "Please check your input",
        variant: "destructive"
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();

    // Get shop owner ID (handles both Owner and Manager)
    const { data: ownerId } = await supabase.rpc("get_owner_id");

    const totalDue = parseFloat(newCustomer.total_due) || 0;
    const cylindersDue = parseInt(newCustomer.cylinders_due) || 0;
    const creditLimit = parseFloat(newCustomer.credit_limit) || 10000;

    const { error } = await supabase
      .from('customers')
      .insert({
        name: sanitizeString(newCustomer.name),
        email: newCustomer.email || null,
        phone: newCustomer.phone || null,
        address: newCustomer.address ? sanitizeString(newCustomer.address) : null,
        total_due: totalDue,
        cylinders_due: cylindersDue,
        credit_limit: creditLimit,
        customer_type: newCustomerType,
        billing_status: totalDue > 0 || cylindersDue > 0 ? 'pending' : 'clear',
        created_by: user?.id,
        owner_id: ownerId || user?.id
      } as any);

    if (error) {
      logger.error('Error adding customer', error, { component: 'CustomerManagement' });
      toast({ title: "Error adding customer", description: "Failed to add customer", variant: "destructive" });
      return;
    }

    toast({ title: "Customer added successfully" });
    setAddCustomerDialogOpen(false);
    setNewCustomerType('retail');
    setNewCustomer({ name: "", email: "", phone: "", address: "", total_due: "", cylinders_due: "", credit_limit: "10000" });
    fetchCustomers();
  };

  const getCustomerPayments = (customerId: string) => {
    return payments.filter(p => p.customer_id === customerId);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getBillingBadge = (status: string, totalDue: number) => {
    if (totalDue === 0) {
      return <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">Paid</Badge>;
    }
    if (status === 'overdue') {
      return <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30">Overdue</Badge>;
    }
    return <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30">Pending</Badge>;
  };

  // Prepare invoice data for selected transaction
  const getInvoiceData = () => {
    if (!selectedTransaction) return null;

    return {
      invoiceNumber: selectedTransaction.transaction_number,
      date: new Date(selectedTransaction.created_at),
      customerName: selectedTransaction.customer_name || 'Walk-in Customer',
      customer: {
        name: selectedTransaction.customer_name || 'Walk-in Customer',
        phone: '',
        address: ''
      },
      items: selectedTransaction.pos_transaction_items?.map(item => ({
        name: item.product_name,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        price: item.unit_price,
        total: item.total_price
      })) || [],
      subtotal: selectedTransaction.subtotal,
      discount: selectedTransaction.discount,
      total: selectedTransaction.total,
      paymentMethod: selectedTransaction.payment_method,
      paymentStatus: selectedTransaction.payment_status
    };
  };

  // Main View with Memo Recall Search Bar
  if (viewMode === 'main') {
    return (
      <div className="space-y-4 sm:space-y-6 pb-4">
        {/* Premium Header */}
        <PremiumModuleHeader
          title="Customer Management"
          subtitle="Manage accounts • Track dues • Recall memos"
          icon={<Users className="h-6 w-6 text-primary-foreground" />}
          gradientFrom="from-primary/5"
          gradientTo="to-accent/5"
          actions={
            <Button
              onClick={() => setAddCustomerDialogOpen(true)}
              size="sm"
              className="h-10 bg-primary hover:bg-primary/90 shadow-sm touch-manipulation"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Add Customer</span>
            </Button>
          }
        />

        {/* 🔍 MEMO RECALL SEARCH BAR */}
        <Card className="relative overflow-hidden border-0 shadow-lg">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-8 w-8 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Memo Recall</h3>
                <p className="text-xs text-muted-foreground">Search by Phone, Name, or Memo ID</p>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by phone, name, or memo ID (e.g., TXN-2025-...)..."
                value={memoSearchQuery}
                onChange={(e) => setMemoSearchQuery(e.target.value)}
                className="pl-10 pr-10 h-12 bg-background border-border shadow-sm text-base"
              />
              {memoSearchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 p-0 touch-manipulation"
                  onClick={() => {
                    setMemoSearchQuery("");
                    setMemoSearchResults([]);
                  }}
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              )}
            </div>

            {/* Search Results */}
            {memoSearchLoading && (
              <div className="mt-4 text-center py-4">
                <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs text-muted-foreground mt-2">Searching...</p>
              </div>
            )}

            {!memoSearchLoading && memoSearchResults.length > 0 && (
              <div className="mt-4 space-y-2 max-h-80 overflow-y-auto">
                {memoSearchResults.map((result, idx) => (
                  <Card
                    key={idx}
                    className="border border-border/50 shadow-sm hover:shadow-md transition-all cursor-pointer"
                    onClick={() => {
                      if (result.type === 'customer' && result.customer) {
                        setSelectedCustomer(result.customer);
                        fetchCustomerSalesHistory(result.customer.id);
                        setHistoryDialogOpen(true);
                      } else if (result.type === 'transaction' && result.transaction) {
                        handleViewTransaction(result.transaction);
                      }
                    }}
                  >
                    <CardContent className="p-3">
                      {result.type === 'customer' && result.customer && (
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 bg-blue-500/10 shrink-0">
                              <AvatarFallback className="bg-blue-500/10 text-blue-600 font-semibold text-xs">
                                {getInitials(result.customer.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/30">
                                  Customer
                                </Badge>
                              </div>
                              <p className="font-medium text-foreground text-sm truncate">{result.customer.name}</p>
                              <p className="text-xs text-muted-foreground">{result.customer.phone || 'No phone'}</p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            {result.customer.total_due > 0 ? (
                              <Badge className="bg-rose-500/20 text-rose-600 border-rose-500/30">
                                Due: {BANGLADESHI_CURRENCY_SYMBOL}{result.customer.total_due.toLocaleString()}
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">
                                Clear
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {result.type === 'transaction' && result.transaction && (
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                              <Receipt className="h-4 w-4 text-purple-500" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-600 border-purple-500/30">
                                  Memo
                                </Badge>
                              </div>
                              <p className="font-mono font-medium text-foreground text-sm">
                                {result.transaction.transaction_number}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {result.transaction.customer_name} • {format(new Date(result.transaction.created_at), 'MMM dd, yyyy')}
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-bold text-foreground tabular-nums">
                              {BANGLADESHI_CURRENCY_SYMBOL}{result.transaction.total.toLocaleString()}
                            </p>
                            <Badge
                              className={(result.transaction.payment_status === 'paid' || result.transaction.payment_status === 'completed')
                                ? 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-600 border-amber-500/30'
                              }
                            >
                              {(result.transaction.payment_status === 'completed' || result.transaction.payment_status === 'paid') ? 'Paid' : result.transaction.payment_status === 'partial' ? 'Partial' : 'Due'}
                            </Badge>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {!memoSearchLoading && memoSearchQuery.length >= 3 && memoSearchResults.length === 0 && (
              <div className="mt-4 text-center py-6">
                <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                  <Search className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No results found for "{memoSearchQuery}"</p>
                <p className="text-xs text-muted-foreground mt-1">Try a different phone number or memo ID</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Premium Summary Stats - 2x2 Grid */}
        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          {/* Total Customers */}
          <Card className="relative overflow-hidden border border-border/20 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-muted/50 via-muted/30 to-transparent" />
            <CardContent className="relative p-3 sm:p-5">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-3xl font-bold text-foreground tabular-nums">{customers.length}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wider">Customers</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Due Accounts */}
          <Card className="relative overflow-hidden border border-border/20 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent" />
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-rose-400" />
            <CardContent className="relative p-3 sm:p-5">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-xl bg-rose-500/20 flex items-center justify-center shrink-0">
                  <UserX className="h-4 w-4 sm:h-5 sm:w-5 text-rose-600 dark:text-rose-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-3xl font-bold text-rose-600 dark:text-rose-400 tabular-nums">{dueCustomers.length}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wider">Due</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Due Amount */}
          <Card className="relative overflow-hidden border border-border/20 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent" />
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-amber-400" />
            <CardContent className="relative p-3 sm:p-5">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                  <Banknote className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg sm:text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums truncate">
                    {BANGLADESHI_CURRENCY_SYMBOL}{totalAmountDue.toLocaleString()}
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Due</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Paid/Clear Accounts */}
          <Card className="relative overflow-hidden border border-border/20 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent" />
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-400" />
            <CardContent className="relative p-3 sm:p-5">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <UserCheck className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{paidCustomers.length}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wider">Clear</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Premium Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
          {/* Due Customers Card */}
          <Card className="relative overflow-hidden border border-border/20 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 via-card to-card group-hover:from-rose-500/10 transition-colors" />
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-rose-400" />
            <CardContent className="relative p-4 sm:p-6">
              <div className="flex items-start gap-4 mb-5">
                <div className="p-3 rounded-xl bg-rose-500/20 group-hover:scale-110 transition-transform shrink-0">
                  <UserX className="h-6 w-6 sm:h-8 sm:w-8 text-rose-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg sm:text-xl font-bold text-foreground">Due Customers</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">Outstanding payments to collect</p>
                  <div className="flex items-baseline gap-2 mt-2">
                    <p className="text-2xl sm:text-3xl font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                      {BANGLADESHI_CURRENCY_SYMBOL}{totalAmountDue.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">from {dueCustomers.length} customers</p>
                  </div>
                </div>
              </div>
              <Button
                className="w-full bg-rose-500 hover:bg-rose-600 text-white h-11 text-sm font-medium shadow-lg touch-manipulation"
                onClick={() => setViewMode('due')}
              >
                Manage Due
                <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>

          {/* Paid Customers Card */}
          <Card className="relative overflow-hidden border border-border/20 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-card to-card group-hover:from-emerald-500/10 transition-colors" />
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-400" />
            <CardContent className="relative p-4 sm:p-6">
              <div className="flex items-start gap-4 mb-5">
                <div className="p-3 rounded-xl bg-emerald-500/20 group-hover:scale-110 transition-transform shrink-0">
                  <UserCheck className="h-6 w-6 sm:h-8 sm:w-8 text-emerald-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg sm:text-xl font-bold text-foreground">Paid Customers</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">Accounts with no outstanding dues</p>
                  <div className="flex items-baseline gap-2 mt-2">
                    <p className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {paidCustomers.length}
                    </p>
                    <p className="text-xs text-muted-foreground">customers all clear</p>
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full border-emerald-500/30 hover:bg-emerald-500/10 hover:border-emerald-500/50 h-11 text-sm font-medium touch-manipulation"
                onClick={() => setViewMode('paid')}
              >
                View Paid
                <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Customer Segments */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
          {/* Retail Customers Card */}
          <Card className="relative overflow-hidden border border-border/20 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group" onClick={() => setViewMode('retail')}>
            <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 via-card to-card group-hover:from-sky-500/10 transition-colors" />
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 to-sky-400" />
            <CardContent className="relative p-4 sm:p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 rounded-xl bg-sky-500/20 group-hover:scale-110 transition-transform shrink-0">
                  <ShoppingCart className="h-6 w-6 text-sky-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base sm:text-lg font-bold text-foreground">Retail Customers</h3>
                  <p className="text-xs text-muted-foreground">Speed & Volume · Walk-in & delivery</p>
                  <p className="text-2xl font-bold text-sky-600 dark:text-sky-400 tabular-nums mt-1">
                    {customers.filter(c => c.customer_type === 'retail').length}
                  </p>
                </div>
              </div>
              <Button className="w-full bg-sky-500 hover:bg-sky-600 text-white h-10 text-sm font-medium touch-manipulation">
                Manage Retail <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* Wholesale Accounts Card */}
          <Card className="relative overflow-hidden border border-border/20 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group" onClick={() => setViewMode('wholesale')}>
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-card to-card group-hover:from-purple-500/10 transition-colors" />
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 to-purple-400" />
            <CardContent className="relative p-4 sm:p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 rounded-xl bg-purple-500/20 group-hover:scale-110 transition-transform shrink-0">
                  <Building2 className="h-6 w-6 text-purple-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base sm:text-lg font-bold text-foreground">Wholesale Accounts</h3>
                  <p className="text-xs text-muted-foreground">Credit & Ledger · Account management</p>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 tabular-nums mt-1">
                    {customers.filter(c => c.customer_type === 'wholesale').length}
                  </p>
                </div>
              </div>
              <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white h-10 text-sm font-medium touch-manipulation">
                Manage Wholesale <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>


        <Dialog open={addCustomerDialogOpen} onOpenChange={setAddCustomerDialogOpen}>
          <DialogContent className="bg-card border-border max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Customer Type Toggle */}
              <div>
                <label className="text-sm font-medium text-foreground">Customer Type</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg mt-1">
                  <button type="button" onClick={() => { setNewCustomerType('retail'); setNewCustomer(p => ({...p, credit_limit: '10000'})); }}
                    className={`flex items-center justify-center gap-2 h-10 rounded-md text-sm font-semibold transition-all ${newCustomerType === 'retail' ? 'bg-sky-500 text-white shadow-md' : 'text-muted-foreground'}`}>
                    <ShoppingCart className="h-4 w-4" /> Retail
                  </button>
                  <button type="button" onClick={() => { setNewCustomerType('wholesale'); setNewCustomer(p => ({...p, credit_limit: '50000'})); }}
                    className={`flex items-center justify-center gap-2 h-10 rounded-md text-sm font-semibold transition-all ${newCustomerType === 'wholesale' ? 'bg-purple-600 text-white shadow-md' : 'text-muted-foreground'}`}>
                    <Building2 className="h-4 w-4" /> Wholesale
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Customer Name *</label>
                <Input
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  placeholder="Enter customer name"
                  className="mt-1 h-11"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Phone</label>
                <Input
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  placeholder="01XXX-XXXXXX"
                  className="mt-1 h-11"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Email</label>
                <Input
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                  placeholder="customer@example.com"
                  className="mt-1 h-11"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Address</label>
                <Input
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                  placeholder="Enter address"
                  className="mt-1 h-11"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Initial Due</label>
                  <Input
                    type="number"
                    value={newCustomer.total_due}
                    onChange={(e) => setNewCustomer({ ...newCustomer, total_due: e.target.value })}
                    placeholder="0"
                    className="mt-1 h-11"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Cylinders Due</label>
                  <Input
                    type="number"
                    value={newCustomer.cylinders_due}
                    onChange={(e) => setNewCustomer({ ...newCustomer, cylinders_due: e.target.value })}
                    placeholder="0"
                    className="mt-1 h-11"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Credit Limit ({BANGLADESHI_CURRENCY_SYMBOL})</label>
                <Input
                  type="number"
                  value={newCustomer.credit_limit}
                  onChange={(e) => setNewCustomer({ ...newCustomer, credit_limit: e.target.value })}
                  placeholder="10000"
                  className="mt-1 h-11"
                />
                <p className="text-xs text-muted-foreground mt-1">Maximum credit allowed</p>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setAddCustomerDialogOpen(false)} className="h-11">Cancel</Button>
              <Button
                onClick={handleAddCustomer}
                disabled={!newCustomer.name.trim()}
                className="h-11 bg-primary hover:bg-primary/90"
              >
                Add Customer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* History Dialog with Purchase History Tab */}
        <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
          <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader className="shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <History className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-lg">Customer History</DialogTitle>
                  <p className="text-sm text-muted-foreground">{selectedCustomer?.name}</p>
                </div>
              </div>
            </DialogHeader>

            <Tabs defaultValue="sales" className="flex-1 overflow-hidden flex flex-col">
              <TabsList className="grid w-full grid-cols-2 shrink-0">
                <TabsTrigger value="sales" className="gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Purchase History
                </TabsTrigger>
                <TabsTrigger value="payments" className="gap-2">
                  <Banknote className="h-4 w-4" />
                  Payments
                </TabsTrigger>
              </TabsList>

              <TabsContent value="sales" className="flex-1 overflow-auto mt-4">
                {salesHistory.length > 0 ? (
                  <div className="space-y-2">
                    {salesHistory.map((tx) => (
                      <Card
                        key={tx.id}
                        className="border border-border/50 shadow-sm hover:shadow-md transition-all cursor-pointer"
                        onClick={() => handleViewTransaction(tx)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="h-9 w-9 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                                <Receipt className="h-4 w-4 text-purple-500" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-mono font-semibold text-foreground text-sm">
                                  {tx.transaction_number}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(tx.created_at), 'MMM dd, yyyy • HH:mm')}
                                </p>
                                <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                  {tx.items}
                                </p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-bold text-foreground tabular-nums">
                                {BANGLADESHI_CURRENCY_SYMBOL}{tx.total.toLocaleString()}
                              </p>
                              <Badge
                                className={tx.payment_status === 'paid'
                                  ? 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30'
                                  : 'bg-amber-500/20 text-amber-600 border-amber-500/30'
                                }
                              >
                                {tx.payment_status}
                              </Badge>
                              <Button variant="ghost" size="sm" className="h-7 px-2 mt-1">
                                <Printer className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                      <ShoppingCart className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">No purchase history found</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="payments" className="flex-1 overflow-auto mt-4">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-card">
                    <TableRow className="border-border">
                      <TableHead className="text-muted-foreground font-semibold">Date</TableHead>
                      <TableHead className="text-muted-foreground font-semibold text-right">Amount</TableHead>
                      <TableHead className="text-muted-foreground font-semibold text-right">Cylinders</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedCustomer && getCustomerPayments(selectedCustomer.id).map((payment) => (
                      <TableRow key={payment.id} className="border-border">
                        <TableCell className="text-foreground">
                          {format(new Date(payment.payment_date), 'MMM dd, yyyy HH:mm')}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                            {BANGLADESHI_CURRENCY_SYMBOL}{Number(payment.amount).toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium text-foreground tabular-nums">
                          {payment.cylinders_collected}
                        </TableCell>
                      </TableRow>
                    ))}
                    {selectedCustomer && getCustomerPayments(selectedCustomer.id).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8">
                          <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                            <Receipt className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <p className="text-muted-foreground">No payment history found</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>

        {/* Invoice Dialog for Memo Reprint */}
        <InvoiceDialog
          open={invoiceDialogOpen}
          onOpenChange={setInvoiceDialogOpen}
          invoiceData={getInvoiceData()}
          businessName="Stock-X BD Ltd."
          businessPhone="+880 1XXX-XXXXXX"
          businessAddress="Dhaka, Bangladesh"
        />
      </div>
    );
  }

  // Retail Customers View
  if (viewMode === 'retail' || viewMode === 'wholesale') {
    const segmentCustomers = customers.filter(c => c.customer_type === (viewMode === 'retail' ? 'retail' : 'wholesale'));
    const isWholesale = viewMode === 'wholesale';
    const filtered = segmentCustomers.filter(c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone?.includes(searchQuery)
    );

    return (
      <div className="space-y-4 pb-4">
        <PremiumModuleHeader
          title={isWholesale ? 'Wholesale Accounts' : 'Retail Customers'}
          subtitle={isWholesale ? 'Credit & ledger management' : 'Speed & volume · Walk-in customers'}
          icon={isWholesale ? <Building2 className="h-6 w-6 text-primary-foreground" /> : <ShoppingCart className="h-6 w-6 text-primary-foreground" />}
          actions={
            <Button variant="outline" size="sm" className="h-10" onClick={() => setViewMode('main')}>
              ← Back
            </Button>
          }
        />

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Search ${isWholesale ? 'wholesale' : 'retail'} customers...`}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10 h-11"
          />
        </div>

        {filtered.length === 0 ? (
          <EmptyStateCard
            icon={<Users className="h-8 w-8" />}
            title={`No ${isWholesale ? 'wholesale' : 'retail'} customers yet`}
            subtitle={`Add your first ${isWholesale ? 'wholesale account' : 'retail customer'} to get started`}
          />
        ) : (
          <div className="space-y-2">
            {filtered.map(c => (
              <Card key={c.id} className="border-border/40 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${isWholesale ? 'bg-purple-500/20' : 'bg-sky-500/20'}`}>
                      <span className={`text-sm font-bold ${isWholesale ? 'text-purple-600' : 'text-sky-600'}`}>
                        {c.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground truncate">{c.name}</p>
                        <Badge className={`text-[10px] ${isWholesale ? 'bg-purple-500/20 text-purple-600 border-purple-500/30' : 'bg-sky-500/20 text-sky-600 border-sky-500/30'}`}>
                          {isWholesale ? 'Wholesale' : 'Retail'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{c.phone || 'No phone'}</p>
                      {isWholesale && c.credit_limit && (
                        <div className="mt-1.5">
                          {c.total_due > 0 && (
                            <p className="text-sm font-bold text-rose-600 dark:text-rose-400 tabular-nums mb-1">
                              {BANGLADESHI_CURRENCY_SYMBOL}{c.total_due.toLocaleString()} due
                            </p>
                          )}
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Credit used</span>
                            <span className="tabular-nums text-muted-foreground">
                              {BANGLADESHI_CURRENCY_SYMBOL}{(c.total_due || 0).toLocaleString()} / {BANGLADESHI_CURRENCY_SYMBOL}{c.credit_limit.toLocaleString()}
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                ((c.total_due || 0) / c.credit_limit) > 0.8
                                  ? 'bg-rose-500'
                                  : ((c.total_due || 0) / c.credit_limit) > 0.5
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, ((c.total_due || 0) / c.credit_limit) * 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 shrink-0 items-end">
                      {!isWholesale && c.total_due > 0 && (
                        <Badge variant="destructive" className="text-xs px-2 py-0.5">
                          {BANGLADESHI_CURRENCY_SYMBOL}{c.total_due.toLocaleString()}
                        </Badge>
                      )}
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-11 w-11 p-0 touch-manipulation"
                          title="View History"
                          onClick={() => { setSelectedCustomer(c); fetchCustomerSalesHistory(c.id); fetchPayments(); setHistoryDialogOpen(true); }}
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        {!isWholesale && c.phone && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-11 w-11 p-0 text-emerald-600 hover:bg-emerald-500/10 touch-manipulation"
                              asChild
                            >
                              <a href={`tel:${c.phone}`} aria-label={`Call ${c.name}`}>
                                <Phone className="h-4 w-4" />
                              </a>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-11 w-11 p-0 text-green-600 hover:bg-green-500/10 touch-manipulation"
                              asChild
                            >
                              <a
                                href={`https://wa.me/${c.phone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`WhatsApp ${c.name}`}
                              >
                                <MessageSquare className="h-4 w-4" />
                              </a>
                            </Button>
                          </>
                        )}
                        {isWholesale && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-11 w-11 p-0 text-purple-600 hover:text-purple-700 hover:bg-purple-500/10 touch-manipulation"
                            title="View Ledger"
                            onClick={() => { setSelectedCustomer(c); fetchCustomerSalesHistory(c.id); fetchPayments(); setHistoryDialogOpen(true); }}
                          >
                            <BookOpen className="h-4 w-4" />
                          </Button>
                        )}
                        {c.total_due > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-11 w-11 p-0 text-emerald-600 hover:bg-emerald-500/10 touch-manipulation"
                            title="Settle Account"
                            onClick={() => { setSelectedCustomer(c); fetchPayments(); setSettleDialogOpen(true); }}
                          >
                            <Banknote className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Customer History / Ledger Dialog */}
        <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
          <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader className="shrink-0">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${isWholesale ? 'bg-purple-500/20' : 'bg-sky-500/20'}`}>
                  {isWholesale ? <Building2 className="h-5 w-5 text-purple-600" /> : <ShoppingCart className="h-5 w-5 text-sky-600" />}
                </div>
                <div>
                  <DialogTitle className="text-lg">{selectedCustomer?.name}</DialogTitle>
                  <p className="text-sm text-muted-foreground">
                    {isWholesale ? 'Wholesale Account' : 'Retail Customer'} • {selectedCustomer?.phone || 'No phone'}
                  </p>
                </div>
              </div>
            </DialogHeader>

            {/* Wholesale credit summary bar */}
            {isWholesale && selectedCustomer?.credit_limit && (
              <div className="shrink-0 px-1 pb-1">
                <div className="p-3 rounded-xl bg-muted/40 border border-border/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">Credit Utilization</span>
                    </div>
                    <div className="flex gap-3">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Used</p>
                        <p className="text-sm font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                          {BANGLADESHI_CURRENCY_SYMBOL}{(selectedCustomer.total_due || 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Limit</p>
                        <p className="text-sm font-bold text-foreground tabular-nums">
                          {BANGLADESHI_CURRENCY_SYMBOL}{selectedCustomer.credit_limit.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        ((selectedCustomer.total_due || 0) / selectedCustomer.credit_limit) > 0.8
                          ? 'bg-rose-500'
                          : ((selectedCustomer.total_due || 0) / selectedCustomer.credit_limit) > 0.5
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, ((selectedCustomer.total_due || 0) / selectedCustomer.credit_limit) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            <Tabs defaultValue="ledger" className="flex-1 overflow-hidden flex flex-col">
              <TabsList className={`grid w-full shrink-0 ${isWholesale ? 'grid-cols-3' : 'grid-cols-2'}`}>
                {isWholesale && (
                  <TabsTrigger value="ledger" className="gap-1.5 text-xs sm:text-sm">
                    <TrendingUp className="h-3.5 w-3.5" />Ledger
                  </TabsTrigger>
                )}
                <TabsTrigger value="sales" className="gap-1.5 text-xs sm:text-sm">
                  <ShoppingCart className="h-3.5 w-3.5" />Purchases
                </TabsTrigger>
                <TabsTrigger value="payments" className="gap-1.5 text-xs sm:text-sm">
                  <Banknote className="h-3.5 w-3.5" />Payments
                </TabsTrigger>
              </TabsList>

              {/* LEDGER TAB — Combined chronological view with running balance */}
              {isWholesale && (
                <TabsContent value="ledger" className="flex-1 overflow-auto mt-4">
                  {(() => {
                    const custPayments = selectedCustomer ? getCustomerPayments(selectedCustomer.id) : [];
                    // Merge sales and payments into one ledger
                    type LedgerEntry = {
                      id: string; date: string; type: 'sale' | 'payment';
                      transactionNumber?: string; saleTotal?: number; paymentStatus?: string; items?: string;
                      amountPaid?: number; cylindersCollected?: number; notes?: string | null;
                    };
                    const ledgerEntries: LedgerEntry[] = [
                      ...salesHistory.map(tx => ({
                        id: tx.id, date: tx.created_at, type: 'sale' as const,
                        transactionNumber: tx.transaction_number, saleTotal: tx.total,
                        paymentStatus: tx.payment_status, items: tx.items,
                      })),
                      ...custPayments.map(p => ({
                        id: p.id, date: p.payment_date, type: 'payment' as const,
                        amountPaid: p.amount, cylindersCollected: p.cylinders_collected, notes: p.notes,
                      })),
                    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                    // Compute running balance (oldest to newest, then reverse display)
                    let runningBalance = 0;
                    const withBalance = [...ledgerEntries].reverse().map(e => {
                      if (e.type === 'sale') runningBalance += e.saleTotal || 0;
                      else runningBalance -= e.amountPaid || 0;
                      return { ...e, balanceAfter: runningBalance };
                    }).reverse();

                    if (withBalance.length === 0) {
                      return <div className="text-center py-12 text-muted-foreground">No ledger entries found</div>;
                    }
                    return (
                      <div className="space-y-2">
                        {withBalance.map(entry => (
                          <Card key={entry.id} className={`border shadow-sm ${entry.type === 'sale' ? 'border-rose-500/20 bg-rose-500/5' : 'border-emerald-500/20 bg-emerald-500/5'}`}>
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${entry.type === 'sale' ? 'bg-rose-500/20' : 'bg-emerald-500/20'}`}>
                                    {entry.type === 'sale'
                                      ? <Receipt className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                                      : <Banknote className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                    }
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <Badge className={`text-[10px] ${entry.type === 'sale' ? 'bg-rose-500/20 text-rose-600 border-rose-500/30' : 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30'}`}>
                                        {entry.type === 'sale' ? 'Sale' : 'Payment'}
                                      </Badge>
                                      {entry.transactionNumber && (
                                        <span className="font-mono text-xs text-muted-foreground">{entry.transactionNumber}</span>
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      {format(new Date(entry.date), 'MMM dd, yyyy • HH:mm')}
                                    </p>
                                    {entry.items && <p className="text-xs text-muted-foreground truncate max-w-[180px]">{entry.items}</p>}
                                    {entry.notes && <p className="text-xs italic text-muted-foreground truncate max-w-[180px]">{entry.notes}</p>}
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className={`font-bold tabular-nums text-sm ${entry.type === 'sale' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                    {entry.type === 'sale' ? '+' : '-'}{BANGLADESHI_CURRENCY_SYMBOL}{(entry.saleTotal || entry.amountPaid || 0).toLocaleString()}
                                  </p>
                                  <p className={`text-xs font-semibold tabular-nums ${entry.balanceAfter > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                    Bal: {BANGLADESHI_CURRENCY_SYMBOL}{Math.abs(entry.balanceAfter).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    );
                  })()}
                </TabsContent>
              )}

              <TabsContent value="sales" className="flex-1 overflow-auto mt-4">
                {salesHistory.length === 0
                  ? <div className="text-center py-8 text-muted-foreground">No purchases found</div>
                  : salesHistory.map(tx => (
                    <Card key={tx.id} className="border-border/50 shadow-sm mb-2 cursor-pointer" onClick={() => handleViewTransaction(tx)}>
                      <CardContent className="p-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="font-mono text-sm font-semibold">{tx.transaction_number}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(tx.created_at), 'MMM dd, yyyy')}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">{tx.items}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold tabular-nums">{BANGLADESHI_CURRENCY_SYMBOL}{tx.total.toLocaleString()}</p>
                          <Badge className={tx.payment_status === 'paid' || tx.payment_status === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-600 border-amber-500/30'
                          }>{tx.payment_status}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                }
              </TabsContent>

              <TabsContent value="payments" className="flex-1 overflow-auto mt-4">
                {selectedCustomer && getCustomerPayments(selectedCustomer.id).length === 0
                  ? <div className="text-center py-8 text-muted-foreground">No payments found</div>
                  : selectedCustomer && getCustomerPayments(selectedCustomer.id).map(p => (
                    <Card key={p.id} className="border-border/50 shadow-sm mb-2">
                      <CardContent className="p-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">{format(new Date(p.payment_date), 'MMM dd, yyyy HH:mm')}</p>
                          {p.notes && <p className="text-xs text-muted-foreground italic">{p.notes}</p>}
                          {p.cylinders_collected > 0 && (
                            <p className="text-xs text-muted-foreground">{p.cylinders_collected} cylinders collected</p>
                          )}
                        </div>
                        <p className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                          {BANGLADESHI_CURRENCY_SYMBOL}{Number(p.amount).toLocaleString()}
                        </p>
                      </CardContent>
                    </Card>
                  ))
                }
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
        <Dialog open={settleDialogOpen} onOpenChange={setSettleDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Settle Account — {selectedCustomer?.name}</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <div><label className="text-sm font-medium">Payment Amount ({BANGLADESHI_CURRENCY_SYMBOL})</label>
                <Input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} className="mt-1 h-11" placeholder="0" /></div>
              <div><label className="text-sm font-medium">Cylinders to Collect</label>
                <Input type="number" value={cylindersToCollect} onChange={e => setCylindersToCollect(e.target.value)} className="mt-1 h-11" placeholder="0" /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setSettleDialogOpen(false)}>Cancel</Button><Button onClick={handleSettleAccount}>Save Settlement</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (viewMode === 'due') {
    return (
      <div className="space-y-4 sm:space-y-6 pb-4">
        {/* Premium Header */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-rose-500/5 via-transparent to-rose-500/5 rounded-xl -z-10" />
          <div className="p-4 sm:p-0">
            <Button
              variant="ghost"
              onClick={() => setViewMode('main')}
              className="mb-3 -ml-2 text-muted-foreground hover:text-foreground h-9 px-3 text-sm touch-manipulation"
            >
              ← Back to Customer Management
            </Button>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center shadow-lg shrink-0">
                <UserX className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground tracking-tight">
                  Due Customers
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Manage pending payments & unreturned cylinders
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Premium Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {/* Due Accounts */}
          <Card className="relative overflow-hidden border border-border/20 shadow-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent" />
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-rose-400" />
            <CardContent className="relative p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground font-medium">Due Accounts</p>
                  <p className="text-2xl sm:text-3xl font-bold text-rose-600 dark:text-rose-400 mt-1 tabular-nums">{dueCustomers.length}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Total customers with outstanding balance</p>
                </div>
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-rose-500/20 flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5 sm:h-6 sm:w-6 text-rose-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Amount Due */}
          <Card className="relative overflow-hidden border border-border/20 shadow-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent" />
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-amber-400" />
            <CardContent className="relative p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground font-medium">Total Amount Due</p>
                  <p className="text-2xl sm:text-3xl font-bold text-amber-600 dark:text-amber-400 mt-1 tabular-nums">
                    {BANGLADESHI_CURRENCY_SYMBOL}{totalAmountDue.toLocaleString()}
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Sum of all pending payments</p>
                </div>
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                  <Banknote className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Cylinders Due */}
          <Card className="relative overflow-hidden border border-border/20 shadow-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent" />
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-purple-400" />
            <CardContent className="relative p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground font-medium">Cylinders Due</p>
                  <p className="text-2xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400 mt-1 tabular-nums">{totalCylindersDue}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Total unreturned cylinders</p>
                </div>
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
                  <Package className="h-5 w-5 sm:h-6 sm:w-6 text-purple-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 bg-card border-border shadow-sm"
          />
        </div>

        {/* Customer List - Mobile Cards / Desktop Table */}
        <Card className="relative overflow-hidden border border-border/20 shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-rose-400" />
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-rose-500/20 flex items-center justify-center">
                <UserX className="h-4 w-4 text-rose-500" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg text-foreground">
                  Due Accounts ({filteredDueCustomers.length})
                </CardTitle>
                <p className="text-xs text-muted-foreground">Customers with outstanding balance</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {/* Mobile Card View */}
            <div className="sm:hidden space-y-3">
              {filteredDueCustomers.map((customer) => (
                <Card key={customer.id} className="border border-border/50 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 bg-rose-500/10 shrink-0">
                          <AvatarFallback className="bg-rose-500/10 text-rose-600 font-semibold">
                            {getInitials(customer.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">{customer.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{customer.phone || customer.email || 'No contact'}</p>
                        </div>
                      </div>
                      {getBillingBadge(customer.billing_status, customer.total_due)}
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-rose-500/5 rounded-lg p-2.5">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Amount Due</p>
                        <p className="text-base font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                          {BANGLADESHI_CURRENCY_SYMBOL}{Number(customer.total_due).toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-purple-500/5 rounded-lg p-2.5">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Cylinders</p>
                        <p className="text-base font-bold text-purple-600 dark:text-purple-400 tabular-nums">
                          {customer.cylinders_due} pcs
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 h-10 bg-rose-500 hover:bg-rose-600 text-white font-medium touch-manipulation"
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setPaymentAmount(customer.total_due.toString());
                          setCylindersToCollect(customer.cylinders_due.toString());
                          setSettleDialogOpen(true);
                        }}
                      >
                        Settle Account
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-10 px-3 border-border touch-manipulation"
                        onClick={() => {
                          setSelectedCustomer(customer);
                          fetchCustomerSalesHistory(customer.id);
                          setHistoryDialogOpen(true);
                        }}
                      >
                        <History className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filteredDueCustomers.length === 0 && (
                <EmptyStateCard
                  icon={<UserCheck className="h-10 w-10" />}
                  title={searchQuery ? "No results found" : "No outstanding dues"}
                  subtitle={searchQuery ? `No customers match "${searchQuery}"` : "All customers are fully paid up"}
                  colorScheme="emerald"
                />
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground font-semibold">Customer</TableHead>
                    <TableHead className="text-muted-foreground font-semibold">Status</TableHead>
                    <TableHead className="text-muted-foreground font-semibold text-right">Amount Due</TableHead>
                    <TableHead className="text-muted-foreground font-semibold text-right">Cylinders</TableHead>
                    <TableHead className="text-muted-foreground font-semibold text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDueCustomers.map((customer) => (
                    <TableRow key={customer.id} className="border-border hover:bg-muted/30 transition-colors">
                      <TableCell className="py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 bg-rose-500/10">
                            <AvatarFallback className="bg-rose-500/10 text-rose-600 font-semibold">
                              {getInitials(customer.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-foreground">{customer.name}</p>
                            <p className="text-xs text-muted-foreground">{customer.phone || customer.email || 'No contact'}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        {getBillingBadge(customer.billing_status, customer.total_due)}
                      </TableCell>
                      <TableCell className="py-3 text-right">
                        <span className="font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                          {BANGLADESHI_CURRENCY_SYMBOL}{Number(customer.total_due).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 text-right font-medium text-purple-600 dark:text-purple-400 tabular-nums">
                        {customer.cylinders_due}
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            className="h-9 bg-rose-500 hover:bg-rose-600 text-white"
                            onClick={() => {
                              setSelectedCustomer(customer);
                              setPaymentAmount(customer.total_due.toString());
                              setCylindersToCollect(customer.cylinders_due.toString());
                              setSettleDialogOpen(true);
                            }}
                          >
                            Settle
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-9"
                            onClick={() => {
                              setSelectedCustomer(customer);
                              fetchCustomerSalesHistory(customer.id);
                              setHistoryDialogOpen(true);
                            }}
                          >
                            <History className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredDueCustomers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-0 border-0">
                        <EmptyStateCard
                          icon={<UserCheck className="h-10 w-10" />}
                          title={searchQuery ? "No results found" : "No outstanding dues"}
                          subtitle={searchQuery ? `No customers match "${searchQuery}"` : "All customers are fully paid up"}
                          colorScheme="emerald"
                          className="border-0 bg-transparent"
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Settle Account Dialog */}
        <Dialog open={settleDialogOpen} onOpenChange={setSettleDialogOpen}>
          <DialogContent className="bg-card border-border max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
                  <Banknote className="h-5 w-5 text-rose-500" />
                </div>
                <div>
                  <DialogTitle className="text-lg">Settle Account</DialogTitle>
                  <p className="text-sm text-muted-foreground">{selectedCustomer?.name}</p>
                </div>
              </div>
            </DialogHeader>
            <div className="py-4 space-y-4">
              {/* Payment Section */}
              <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Payment Collection</span>
                  <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/30">
                    Due: {BANGLADESHI_CURRENCY_SYMBOL}{selectedCustomer?.total_due.toLocaleString()}
                  </Badge>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium">Amount Received ({BANGLADESHI_CURRENCY_SYMBOL})</label>
                  <Input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="0"
                    className="mt-1.5 h-11 text-lg font-semibold"
                  />
                </div>
              </div>

              {/* Cylinder Section */}
              <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Cylinder Collection</span>
                  <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/30">
                    Due: {selectedCustomer?.cylinders_due || 0} pcs
                  </Badge>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium">Cylinders to Collect</label>
                  <Input
                    type="number"
                    value={cylindersToCollect}
                    onChange={(e) => setCylindersToCollect(e.target.value)}
                    placeholder="0"
                    className="mt-1.5 h-11 text-lg font-semibold"
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setSettleDialogOpen(false)} className="h-11">
                Cancel
              </Button>
              <Button
                className="h-11 bg-rose-500 hover:bg-rose-600 text-white font-medium"
                onClick={handleSettleAccount}
              >
                Confirm & Settle
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* History Dialog */}
        <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
          <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader className="shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <History className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-lg">Customer History</DialogTitle>
                  <p className="text-sm text-muted-foreground">{selectedCustomer?.name}</p>
                </div>
              </div>
            </DialogHeader>

            <Tabs defaultValue="sales" className="flex-1 overflow-hidden flex flex-col">
              <TabsList className="grid w-full grid-cols-2 shrink-0">
                <TabsTrigger value="sales" className="gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Purchase History
                </TabsTrigger>
                <TabsTrigger value="payments" className="gap-2">
                  <Banknote className="h-4 w-4" />
                  Payments
                </TabsTrigger>
              </TabsList>

              <TabsContent value="sales" className="flex-1 overflow-auto mt-4">
                {salesHistory.length > 0 ? (
                  <div className="space-y-2">
                    {salesHistory.map((tx) => (
                      <Card
                        key={tx.id}
                        className="border border-border/50 shadow-sm hover:shadow-md transition-all cursor-pointer"
                        onClick={() => handleViewTransaction(tx)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="h-9 w-9 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                                <Receipt className="h-4 w-4 text-purple-500" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-mono font-semibold text-foreground text-sm">
                                  {tx.transaction_number}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(tx.created_at), 'MMM dd, yyyy • HH:mm')}
                                </p>
                                <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                  {tx.items}
                                </p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-bold text-foreground tabular-nums">
                                {BANGLADESHI_CURRENCY_SYMBOL}{tx.total.toLocaleString()}
                              </p>
                              <Badge
                                className={tx.payment_status === 'paid'
                                  ? 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30'
                                  : 'bg-amber-500/20 text-amber-600 border-amber-500/30'
                                }
                              >
                                {tx.payment_status}
                              </Badge>
                              <Button variant="ghost" size="sm" className="h-7 px-2 mt-1">
                                <Printer className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                      <ShoppingCart className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">No purchase history found</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="payments" className="flex-1 overflow-auto mt-4">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-muted-foreground font-semibold">Date</TableHead>
                      <TableHead className="text-muted-foreground font-semibold text-right">Amount</TableHead>
                      <TableHead className="text-muted-foreground font-semibold text-right">Cylinders</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedCustomer && getCustomerPayments(selectedCustomer.id).map((payment) => (
                      <TableRow key={payment.id} className="border-border">
                        <TableCell className="text-foreground">
                          {format(new Date(payment.payment_date), 'MMM dd, yyyy HH:mm')}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                            {BANGLADESHI_CURRENCY_SYMBOL}{Number(payment.amount).toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium text-foreground tabular-nums">
                          {payment.cylinders_collected}
                        </TableCell>
                      </TableRow>
                    ))}
                    {selectedCustomer && getCustomerPayments(selectedCustomer.id).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8">
                          <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                            <Receipt className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <p className="text-muted-foreground">No payment history found</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>

        {/* Invoice Dialog for Memo Reprint */}
        <InvoiceDialog
          open={invoiceDialogOpen}
          onOpenChange={setInvoiceDialogOpen}
          invoiceData={getInvoiceData()}
          businessName="Stock-X BD Ltd."
          businessPhone="+880 1XXX-XXXXXX"
          businessAddress="Dhaka, Bangladesh"
        />
      </div>
    );
  }

  // Paid Customers View
  return (
    <div className="space-y-4 sm:space-y-6 pb-4">
      {/* Premium Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-emerald-500/5 rounded-xl -z-10" />
        <div className="p-4 sm:p-0">
          <Button
            variant="ghost"
            onClick={() => setViewMode('main')}
            className="mb-3 -ml-2 text-muted-foreground hover:text-foreground h-9 px-3 text-sm touch-manipulation"
          >
            ← Back to Customer Management
          </Button>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shrink-0">
              <UserCheck className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground tracking-tight">
                Paid Customers
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Accounts with no outstanding balance
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-11 bg-card border-border shadow-sm"
        />
      </div>

        {/* Customer List - Mobile Cards / Desktop Table */}
        <Card className="relative overflow-hidden border border-border/20 shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-400" />
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <UserCheck className="h-4 w-4 text-emerald-500" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg text-foreground">
                Paid Customers ({filteredPaidCustomers.length})
              </CardTitle>
              <p className="text-xs text-muted-foreground">All dues have been settled</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Mobile Card View */}
          <div className="sm:hidden space-y-3">
            {filteredPaidCustomers.length === 0 && (
              <EmptyStateCard
                icon={<Users className="h-10 w-10" />}
                title={searchQuery ? "No results found" : "No fully paid customers yet"}
                subtitle={searchQuery ? `No customers match "${searchQuery}"` : "Complete a sale with full payment to see customers here"}
                colorScheme="muted"
              />
            )}
            {filteredPaidCustomers.map((customer, index) => (
              <Card
                key={customer.id}
                className="border border-border/50 shadow-sm cursor-pointer hover:shadow-md transition-all"
                onClick={() => {
                  setSelectedCustomer(customer);
                  fetchCustomerSalesHistory(customer.id);
                  setHistoryDialogOpen(true);
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10 bg-emerald-500/10 shrink-0">
                      <AvatarFallback className="bg-emerald-500/10 text-emerald-600 font-semibold">
                        {getInitials(customer.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold text-foreground truncate">{customer.name}</p>
                        <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30 shrink-0">
                          Clear
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {customer.phone || customer.email || 'No contact'}
                      </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="font-medium">ID: CUST-{String(index + 1).padStart(3, '0')}</span>
                          {customer.last_order_date ? (
                            <button
                              className="text-primary underline-offset-2 hover:underline cursor-pointer touch-manipulation"
                              onClick={(e) => {
                                e.stopPropagation();
                                sessionStorage.setItem('pending-diary-filter', customer.name);
                                window.dispatchEvent(new CustomEvent('navigate-module', { detail: 'business-diary' }));
                              }}
                            >
                              Last: {format(new Date(customer.last_order_date), 'MMM dd, yyyy')}
                            </button>
                          ) : (
                            <span>No orders yet</span>
                          )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <Table className="min-w-[600px]">
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-semibold">Customer ID</TableHead>
                  <TableHead className="text-muted-foreground font-semibold">Customer</TableHead>
                  <TableHead className="text-muted-foreground font-semibold">Contact</TableHead>
                  <TableHead className="text-muted-foreground font-semibold">Last Order</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-center">Status</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPaidCustomers.map((customer, index) => (
                  <TableRow key={customer.id} className="border-border hover:bg-muted/30 transition-colors">
                    <TableCell className="py-3 font-mono text-sm text-muted-foreground">
                      CUST-{String(index + 1).padStart(3, '0')}
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 bg-emerald-500/10">
                          <AvatarFallback className="bg-emerald-500/10 text-emerald-600 font-semibold text-sm">
                            {getInitials(customer.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-foreground">{customer.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 text-muted-foreground">
                      {customer.phone || customer.email || 'N/A'}
                    </TableCell>
                    <TableCell className="py-3">
                      {customer.last_order_date ? (
                        <button
                          className="text-sm text-primary underline-offset-2 hover:underline cursor-pointer"
                          onClick={() => {
                            sessionStorage.setItem('pending-diary-filter', customer.name);
                            window.dispatchEvent(new CustomEvent('navigate-module', { detail: 'business-diary' }));
                          }}
                        >
                          {format(new Date(customer.last_order_date), 'MMM dd, yyyy')}
                        </button>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3 text-center">
                      <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">
                        Clear
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 text-center">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9"
                        onClick={() => {
                          setSelectedCustomer(customer);
                          fetchCustomerSalesHistory(customer.id);
                          setHistoryDialogOpen(true);
                        }}
                      >
                        <History className="h-4 w-4 mr-2" />
                        History
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredPaidCustomers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-0 border-0">
                      <EmptyStateCard
                        icon={<Users className="h-10 w-10" />}
                        title={searchQuery ? "No results found" : "No fully paid customers yet"}
                        subtitle={searchQuery ? `No customers match "${searchQuery}"` : "Complete a sale with full payment to see customers here"}
                        colorScheme="muted"
                        className="border-0 bg-transparent"
                      />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <History className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg">Customer History</DialogTitle>
                <p className="text-sm text-muted-foreground">{selectedCustomer?.name}</p>
              </div>
            </div>
          </DialogHeader>

          <Tabs defaultValue="sales" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-2 shrink-0">
              <TabsTrigger value="sales" className="gap-2">
                <ShoppingCart className="h-4 w-4" />
                Purchase History
              </TabsTrigger>
              <TabsTrigger value="payments" className="gap-2">
                <Banknote className="h-4 w-4" />
                Payments
              </TabsTrigger>
            </TabsList>

            <TabsContent value="sales" className="flex-1 overflow-auto mt-4">
              {salesHistory.length > 0 ? (
                <div className="space-y-2">
                  {salesHistory.map((tx) => (
                    <Card
                      key={tx.id}
                      className="border border-border/50 shadow-sm hover:shadow-md transition-all cursor-pointer"
                      onClick={() => handleViewTransaction(tx)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-9 w-9 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                              <Receipt className="h-4 w-4 text-purple-500" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-mono font-semibold text-foreground text-sm">
                                {tx.transaction_number}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(tx.created_at), 'MMM dd, yyyy • HH:mm')}
                              </p>
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {tx.items}
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-bold text-foreground tabular-nums">
                              {BANGLADESHI_CURRENCY_SYMBOL}{tx.total.toLocaleString()}
                            </p>
                            <Badge
                              className={tx.payment_status === 'paid'
                                ? 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-600 border-amber-500/30'
                              }
                            >
                              {tx.payment_status}
                            </Badge>
                            <Button variant="ghost" size="sm" className="h-7 px-2 mt-1">
                              <Printer className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                    <ShoppingCart className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">No purchase history found</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="payments" className="flex-1 overflow-auto mt-4">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-muted-foreground font-semibold">Date</TableHead>
                    <TableHead className="text-muted-foreground font-semibold text-right">Amount</TableHead>
                    <TableHead className="text-muted-foreground font-semibold text-right">Cylinders</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedCustomer && getCustomerPayments(selectedCustomer.id).map((payment) => (
                    <TableRow key={payment.id} className="border-border">
                      <TableCell className="text-foreground">
                        {format(new Date(payment.payment_date), 'MMM dd, yyyy HH:mm')}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                          {BANGLADESHI_CURRENCY_SYMBOL}{Number(payment.amount).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium text-foreground tabular-nums">
                        {payment.cylinders_collected}
                      </TableCell>
                    </TableRow>
                  ))}
                  {selectedCustomer && getCustomerPayments(selectedCustomer.id).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8">
                        <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                          <Receipt className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground">No payment history found</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Invoice Dialog for Memo Reprint */}
      <InvoiceDialog
        open={invoiceDialogOpen}
        onOpenChange={setInvoiceDialogOpen}
        invoiceData={getInvoiceData()}
        businessName="Stock-X BD Ltd."
        businessPhone="+880 1XXX-XXXXXX"
        businessAddress="Dhaka, Bangladesh"
      />
    </div>
  );
};
