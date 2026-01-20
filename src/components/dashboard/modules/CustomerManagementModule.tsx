import { useState, useEffect } from "react";
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
  Receipt
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
import { sanitizeString, customerSchema } from "@/lib/validationSchemas";
import { logger } from "@/lib/logger";

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

type ViewMode = 'main' | 'due' | 'paid';

interface POSTransaction {
  id: string;
  transaction_number: string;
  created_at: string;
  total: number;
  payment_status: string;
  items?: string;
}

export const CustomerManagementModule = () => {
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<ViewMode>('main');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [payments, setPayments] = useState<CustomerPayment[]>([]);
  const [salesHistory, setSalesHistory] = useState<POSTransaction[]>([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    fetchCustomers();
    fetchPayments();

    // Real-time subscription
    const channel = supabase
      .channel('customer-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => {
        fetchCustomers();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pos_transactions' }, () => {
        if (selectedCustomer) {
          fetchCustomerSalesHistory(selectedCustomer.id);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedCustomer]);

  const fetchCustomers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: "Error fetching customers", description: error.message, variant: "destructive" });
    } else {
      setCustomers(data || []);
    }
    setLoading(false);
  };

  const fetchPayments = async () => {
    const { data, error } = await supabase
      .from('customer_payments')
      .select('*')
      .order('payment_date', { ascending: false });

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
        payment_status,
        pos_transaction_items (product_name, quantity)
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) {
      const history: POSTransaction[] = data.map(t => ({
        id: t.id,
        transaction_number: t.transaction_number,
        created_at: t.created_at,
        total: Number(t.total),
        payment_status: t.payment_status,
        items: t.pos_transaction_items?.map((i: any) => `${i.quantity}x ${i.product_name}`).join(', ') || 'N/A'
      }));
      setSalesHistory(history);
    }
  };

  const dueCustomers = customers.filter(c => c.total_due > 0 || c.cylinders_due > 0);
  const paidCustomers = customers.filter(c => c.total_due === 0 && c.cylinders_due === 0);

  const filteredDueCustomers = dueCustomers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPaidCustomers = paidCustomers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalAmountDue = dueCustomers.reduce((sum, c) => sum + Number(c.total_due), 0);
  const totalCylindersDue = dueCustomers.reduce((sum, c) => sum + c.cylinders_due, 0);

  const handleSettleAccount = async () => {
    if (!selectedCustomer) return;

    const amount = parseFloat(paymentAmount) || 0;
    const cylinders = parseInt(cylindersToCollect) || 0;

    const { data: { user } } = await supabase.auth.getUser();
    
    // Record the payment
    const { error: paymentError } = await supabase
      .from('customer_payments')
      .insert({
        customer_id: selectedCustomer.id,
        amount: amount,
        cylinders_collected: cylinders,
        created_by: user?.id
      });

    if (paymentError) {
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
        created_by: user?.id
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
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Paid</Badge>;
    }
    if (status === 'overdue') {
      return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Overdue</Badge>;
    }
    return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pending</Badge>;
  };

  // Main View
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
                  Manage accounts • Track dues • Collect payments
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
          <DialogContent className="bg-card border-border">
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
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Email</label>
                <Input
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                  placeholder="customer@example.com"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Phone</label>
                <Input
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  placeholder="+880 1XXX-XXXXXX"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Address</label>
                <Input
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                  placeholder="Enter address"
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Initial Due Amount</label>
                  <Input
                    type="number"
                    value={newCustomer.total_due}
                    onChange={(e) => setNewCustomer({ ...newCustomer, total_due: e.target.value })}
                    placeholder="0"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Cylinders Due</label>
                  <Input
                    type="number"
                    value={newCustomer.cylinders_due}
                    onChange={(e) => setNewCustomer({ ...newCustomer, cylinders_due: e.target.value })}
                    placeholder="0"
                    className="mt-1"
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
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">Maximum credit allowed for this customer</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddCustomerDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleAddCustomer}
                disabled={!newCustomer.name.trim()}
                className="bg-primary hover:bg-primary/90"
              >
                Add Customer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Due Customers View
  if (viewMode === 'due') {
    return (
      <div className="space-y-6">
        <div>
          <Button 
            variant="ghost" 
            onClick={() => setViewMode('main')}
            className="mb-4 text-muted-foreground hover:text-foreground"
          >
            ← Back to Customer Management
          </Button>
          <h2 className="text-3xl font-bold text-foreground">Due Customers</h2>
          <p className="text-muted-foreground">Manage customers with pending or overdue payments or unreturned cylinders.</p>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-muted-foreground">Due Accounts</p>
                  <h3 className="text-3xl font-bold text-foreground mt-1">{dueCustomers.length}</h3>
                  <p className="text-xs text-muted-foreground mt-1">Total customers with outstanding balance.</p>
                </div>
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-muted-foreground">Total Amount Due</p>
                  <h3 className="text-3xl font-bold text-foreground mt-1">৳{totalAmountDue.toLocaleString()}</h3>
                  <p className="text-xs text-muted-foreground mt-1">Sum of all pending and overdue payments.</p>
                </div>
                <Banknote className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-muted-foreground">Total Cylinders Due</p>
                  <h3 className="text-3xl font-bold text-foreground mt-1">{totalCylindersDue}</h3>
                  <p className="text-xs text-muted-foreground mt-1">Total number of unreturned cylinders.</p>
                </div>
                <Package className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Customer Table */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserX className="h-5 w-5 text-destructive" />
                <CardTitle className="text-foreground">Due Customer Accounts ({filteredDueCustomers.length})</CardTitle>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search due customers by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-80 bg-background"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-muted-foreground">Customer</TableHead>
                  <TableHead className="text-muted-foreground">Billing Status</TableHead>
                  <TableHead className="text-muted-foreground text-right">Amount Due</TableHead>
                  <TableHead className="text-muted-foreground text-right">Cylinders Due</TableHead>
                  <TableHead className="text-muted-foreground text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDueCustomers.map((customer) => (
                  <TableRow key={customer.id} className="border-border">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 bg-muted">
                          <AvatarFallback className="bg-muted text-muted-foreground">
                            {getInitials(customer.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">{customer.name}</p>
                          <p className="text-sm text-muted-foreground">{customer.email || customer.phone || 'No contact'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getBillingBadge(customer.billing_status, customer.total_due)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-destructive">
                      ৳{Number(customer.total_due).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-medium text-destructive">
                      {customer.cylinders_due}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
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
                          variant="ghost"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setSelectedCustomer(customer);
                            fetchCustomerSalesHistory(customer.id);
                            setHistoryDialogOpen(true);
                          }}
                        >
                          <History className="h-4 w-4 mr-1" />
                          History
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredDueCustomers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No due customers found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Settle Account Dialog */}
        <Dialog open={settleDialogOpen} onOpenChange={setSettleDialogOpen}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Settle Account for {selectedCustomer?.name}</DialogTitle>
              <p className="text-sm text-muted-foreground">Record a payment and/or collect returned cylinders.</p>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div>
                <h4 className="font-medium text-foreground mb-3">Payment Details</h4>
                <div className="bg-background rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Remaining Due:</span>
                    <span className="font-medium text-foreground">৳{Number(selectedCustomer?.total_due || 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Payment Amount</label>
                    <Input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="0"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-foreground mb-3">Cylinder Collection</h4>
                <div className="bg-background rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cylinders Due:</span>
                    <span className="font-medium text-foreground">{selectedCustomer?.cylinders_due || 0}</span>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Cylinders to Collect</label>
                    <Input
                      type="number"
                      value={cylindersToCollect}
                      onChange={(e) => setCylindersToCollect(e.target.value)}
                      placeholder="0"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSettleDialogOpen(false)}>Cancel</Button>
              <Button 
                className="bg-destructive hover:bg-destructive/90"
                onClick={handleSettleAccount}
              >
                Confirm & Settle
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* History Dialog */}
        <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
          <DialogContent className="bg-card border-border max-w-2xl">
            <DialogHeader>
              <DialogTitle>Payment History - {selectedCustomer?.name}</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-muted-foreground">Date</TableHead>
                    <TableHead className="text-muted-foreground text-right">Amount Paid</TableHead>
                    <TableHead className="text-muted-foreground text-right">Cylinders Collected</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedCustomer && getCustomerPayments(selectedCustomer.id).map((payment) => (
                    <TableRow key={payment.id} className="border-border">
                      <TableCell className="text-foreground">
                        {format(new Date(payment.payment_date), 'MMM dd, yyyy HH:mm')}
                      </TableCell>
                      <TableCell className="text-right text-green-500">
                        ৳{Number(payment.amount).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-foreground">
                        {payment.cylinders_collected}
                      </TableCell>
                    </TableRow>
                  ))}
                  {selectedCustomer && getCustomerPayments(selectedCustomer.id).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        No payment history found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Paid Customers View
  return (
    <div className="space-y-6">
      <div>
        <Button 
          variant="ghost" 
          onClick={() => setViewMode('main')}
          className="mb-4 text-muted-foreground hover:text-foreground"
        >
          ← Back to Customer Management
        </Button>
        <h2 className="text-3xl font-bold text-foreground">Paid Customers</h2>
        <p className="text-muted-foreground">A list of customers with no outstanding balance.</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search paid customers by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-card border-border"
        />
      </div>

      {/* Customer Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-green-500" />
            <div>
              <CardTitle className="text-foreground">Paid Customers ({filteredPaidCustomers.length})</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">These customers have settled all their dues.</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-muted-foreground">Customer ID</TableHead>
                <TableHead className="text-muted-foreground">Name</TableHead>
                <TableHead className="text-muted-foreground">Email</TableHead>
                <TableHead className="text-muted-foreground">Last Order</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPaidCustomers.map((customer, index) => (
                <TableRow key={customer.id} className="border-border">
                  <TableCell className="font-medium text-foreground">
                    CUST-{String(index + 1).padStart(3, '0')}
                  </TableCell>
                  <TableCell className="text-foreground">{customer.name}</TableCell>
                  <TableCell className="text-muted-foreground">{customer.email || 'N/A'}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {customer.last_order_date 
                      ? format(new Date(customer.last_order_date), 'yyyy-MM-dd')
                      : 'N/A'}
                  </TableCell>
                </TableRow>
              ))}
              {filteredPaidCustomers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No paid customers found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
