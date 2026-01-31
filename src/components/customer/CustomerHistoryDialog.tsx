import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  History, ShoppingCart, Banknote, Receipt, Printer, Loader2 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
import { logger } from "@/lib/logger";
import type { Customer } from "./CustomerCard";

interface POSTransaction {
  id: string;
  transaction_number: string;
  created_at: string;
  total: number;
  subtotal: number;
  discount: number;
  payment_status: string;
  payment_method: string;
  items?: string;
  pos_transaction_items?: Array<{
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
}

interface CustomerPayment {
  id: string;
  customer_id: string;
  amount: number;
  cylinders_collected: number;
  payment_date: string;
  notes: string | null;
}

interface CustomerHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  onViewTransaction?: (transaction: POSTransaction) => void;
}

export const CustomerHistoryDialog = ({
  open,
  onOpenChange,
  customer,
  onViewTransaction
}: CustomerHistoryDialogProps) => {
  const [salesHistory, setSalesHistory] = useState<POSTransaction[]>([]);
  const [payments, setPayments] = useState<CustomerPayment[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && customer) {
      fetchData();
    }
  }, [open, customer]);

  const fetchData = async () => {
    if (!customer) return;
    setIsLoading(true);

    try {
      // Fetch sales history
      const { data: salesData } = await supabase
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
          pos_transaction_items (product_name, quantity, unit_price, total_price)
        `)
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (salesData) {
        const history: POSTransaction[] = salesData.map(t => ({
          id: t.id,
          transaction_number: t.transaction_number,
          created_at: t.created_at,
          total: Number(t.total),
          subtotal: Number(t.subtotal),
          discount: Number(t.discount),
          payment_status: t.payment_status,
          payment_method: t.payment_method,
          items: t.pos_transaction_items?.map((i: any) => `${i.quantity}x ${i.product_name}`).join(', ') || 'N/A',
          pos_transaction_items: t.pos_transaction_items
        }));
        setSalesHistory(history);
      }

      // Fetch payments
      const { data: paymentsData } = await supabase
        .from('customer_payments')
        .select('*')
        .eq('customer_id', customer.id)
        .order('payment_date', { ascending: false });

      if (paymentsData) {
        setPayments(paymentsData);
      }
    } catch (error) {
      logger.error('Error fetching customer history', error, { component: 'CustomerHistoryDialog' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <History className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg">Customer History</DialogTitle>
              <p className="text-sm text-muted-foreground">{customer?.name}</p>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="sales" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-2 shrink-0">
              <TabsTrigger value="sales" className="gap-2">
                <ShoppingCart className="h-4 w-4" />
                Purchases ({salesHistory.length})
              </TabsTrigger>
              <TabsTrigger value="payments" className="gap-2">
                <Banknote className="h-4 w-4" />
                Payments ({payments.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="sales" className="flex-1 overflow-auto mt-4">
              {salesHistory.length > 0 ? (
                <div className="space-y-2">
                  {salesHistory.map((tx) => (
                    <Card
                      key={tx.id}
                      className="border border-border/50 shadow-sm hover:shadow-md transition-all cursor-pointer"
                      onClick={() => onViewTransaction?.(tx)}
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
                              className={(tx.payment_status === 'paid' || tx.payment_status === 'completed')
                                ? 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-600 border-amber-500/30'
                              }
                            >
                              {(tx.payment_status === 'completed' || tx.payment_status === 'paid') ? 'Paid' : tx.payment_status === 'partial' ? 'Partial' : 'Due'}
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
              {payments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-muted-foreground font-semibold">Date</TableHead>
                      <TableHead className="text-muted-foreground font-semibold text-right">Amount</TableHead>
                      <TableHead className="text-muted-foreground font-semibold text-right">Cylinders</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
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
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                    <Receipt className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">No payment history found</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};
