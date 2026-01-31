import React, { useState, useEffect, useCallback, useRef } from "react";
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
  X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
import { sanitizeString, customerSchema } from "@/lib/validationSchemas";
import { logger } from "@/lib/logger";
import { InvoiceDialog } from "@/components/invoice/InvoiceDialog";

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

type ViewMode = 'main' | 'due' | 'paid' | 'memo-search';

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
  const [viewMode, setViewMode] = useState<ViewMode>('main');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [payments, setPayments] = useState<CustomerPayment[]>([]);
  const [salesHistory, setSalesHistory] = useState<POSTransaction[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [softLoading, setSoftLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [settleDialogOpen, setSettleDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [salesHistoryDialogOpen, setSalesHistoryDialogOpen] = useState(false);
  const [addCustomerDialogOpen, setAddCustomerDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [cylindersToCollect, setCylindersToCollect] = useState("");
  const [historyTab, setHistoryTab] = useState<'payments' | 'sales'>('sales');
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

  const fetchCustomers = useCallback(async (isSoftRefresh = false) => {
    if (!isSoftRefresh && customers.length === 0) {
      setInitialLoading(true);
    } else {
      setSoftLoading(true);
    }
    setLoadError(null);

    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );

      const fetchPromise = supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;

      if (error) {
        throw error;
      }
      setCustomers(data || []);
    } catch (error: any) {
      logger.error('Error fetching customers', error, { component: 'CustomerManagement' });
      if (customers.length === 0) {
        setLoadError(error.message || 'Failed to load customers');
      }
    } finally {
      setInitialLoading(false);
      setSoftLoading(false);
    }
  }, [customers.length]);

  const fetchPayments = async () => {
    const { data, error } = await supabase
      .from('customer_payments')
      .select('*')
      .order('payment_date', { ascending: false });

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
          results.push({ type: 'customer', customer: c });
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
            results.push({ type: 'customer', customer: c });
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

    const { data: { user } } = await supabase.auth.getUser();

    // Record the payment with today's date
    const { error: paymentError } = await supabase
      .from('customer_payments')
      .insert({
        customer_id: selectedCustomer.id,
        amount: amount,
        cylinders_collected: cylinders,
        created_by: user?.id,
        payment_date: new Date().toISOString().split('T')[0] // Today's date for Business Diary filtering
      });

    if (paymentError) {
      logger.error('Error recording payment', paymentError, { component: 'CustomerManagement' });
      toast({ title: "Error recording payment", description: paymentError.message, variant: "destructive" });
      return;
    }

    // Update customer record
    const newTotalDue = Math.max(0, selectedCustomer.total_due - amount);
    const newCylindersDue = Math.max(0, selectedCustomer.cylinders_due - cylinders);
    const newStatus = newTotalDue === 0 && newCylindersDue === 0 ? 'clear' :
      newTotalDue > 0 ? 'pending' : 'pending';

    const { error: updateError } = await supabase
      .from('customers')
      .update({
        total_due: newTotalDue,
        cylinders_due: newCylindersDue,
        billing_status: newStatus
      })
      .eq('id', selectedCustomer.id);

    if (updateError) {
      logger.error('Error updating customer dues', updateError, { component: 'CustomerManagement' });
      toast({ title: "Error updating customer", description: updateError.message, variant: "destructive" });
      return;
    }

    toast({ title: "Account settled successfully" });
    setSettleDialogOpen(false);
    setPaymentAmount("");
    setCylindersToCollect("");
    setSelectedCustomer(null);
    fetchCustomers();
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
        billing_status: totalDue > 0 || cylindersDue > 0 ? 'pending' : 'clear',
        created_by: user?.id,
        owner_id: ownerId || user?.id // Ensure owner_id is set
      });

    if (error) {
      logger.error('Error adding customer', error, { component: 'CustomerManagement' });
      toast({ title: "Error adding customer", description: "Failed to add customer", variant: "destructive" });
      return;
    }

    toast({ title: "Customer added successfully" });
    setAddCustomerDialogOpen(false);
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
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 rounded-xl -z-10" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-0">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground tracking-tight">
                  Customer Management
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Manage accounts • Track dues • Recall memos
                </p>
              </div>
            </div>
            <Button
              onClick={() => setAddCustomerDialogOpen(true)}
              size="sm"
              className="h-11 w-full sm:w-auto bg-primary hover:bg-primary/90 shadow-lg touch-manipulation"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Customer
            </Button>
          </div>
        </div>

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
          <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300">
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
          <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300">
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
          <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300">
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
          <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300">
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
          <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group">
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
          <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group">
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

        {/* Add Customer Dialog */}
        <Dialog open={addCustomerDialogOpen} onOpenChange={setAddCustomerDialogOpen}>
          <DialogContent className="bg-card border-border max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
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

  // Due Customers View
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
          <Card className="relative overflow-hidden border-0 shadow-lg">
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
          <Card className="relative overflow-hidden border-0 shadow-lg">
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
          <Card className="relative overflow-hidden border-0 shadow-lg">
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
        <Card className="relative overflow-hidden border-0 shadow-lg">
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
                <div className="text-center py-12">
                  <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                    <UserCheck className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground font-medium">No due customers found</p>
                  <p className="text-xs text-muted-foreground mt-1">All accounts are settled!</p>
                </div>
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block">
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
                      <TableCell>
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
                      <TableCell>
                        {getBillingBadge(customer.billing_status, customer.total_due)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                          {BANGLADESHI_CURRENCY_SYMBOL}{Number(customer.total_due).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium text-purple-600 dark:text-purple-400 tabular-nums">
                        {customer.cylinders_due}
                      </TableCell>
                      <TableCell>
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
                      <TableCell colSpan={5} className="text-center py-12">
                        <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                          <UserCheck className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground font-medium">No due customers found</p>
                        <p className="text-xs text-muted-foreground mt-1">All accounts are settled!</p>
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
      <Card className="relative overflow-hidden border-0 shadow-lg">
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
                        <span>
                          {customer.last_order_date
                            ? `Last: ${format(new Date(customer.last_order_date), 'MMM dd, yyyy')}`
                            : 'No orders yet'}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredPaidCustomers.length === 0 && (
              <div className="text-center py-12">
                <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium">No paid customers found</p>
                <p className="text-xs text-muted-foreground mt-1">Try adjusting your search</p>
              </div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block">
            <Table>
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
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      CUST-{String(index + 1).padStart(3, '0')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 bg-emerald-500/10">
                          <AvatarFallback className="bg-emerald-500/10 text-emerald-600 font-semibold text-sm">
                            {getInitials(customer.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-foreground">{customer.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {customer.phone || customer.email || 'N/A'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {customer.last_order_date
                        ? format(new Date(customer.last_order_date), 'MMM dd, yyyy')
                        : 'N/A'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">
                        Clear
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
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
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                        <Users className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground font-medium">No paid customers found</p>
                      <p className="text-xs text-muted-foreground mt-1">Try adjusting your search</p>
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
