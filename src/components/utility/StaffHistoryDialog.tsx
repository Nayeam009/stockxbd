import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, Loader2, Receipt } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
import { logger } from "@/lib/logger";
import type { StaffWithPayments, StaffPayment } from "./StaffCard";

interface StaffHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: StaffWithPayments | null;
}

export const StaffHistoryDialog = ({
  open,
  onOpenChange,
  staff
}: StaffHistoryDialogProps) => {
  const [payments, setPayments] = useState<StaffPayment[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && staff) {
      fetchPaymentHistory();
    }
  }, [open, staff]);

  const fetchPaymentHistory = async () => {
    if (!staff) return;
    setIsLoading(true);

    try {
      // Fetch last 6 months of payments
      const sixMonthsAgo = subMonths(new Date(), 6);
      
      const { data, error } = await supabase
        .from('staff_payments')
        .select('*')
        .eq('staff_id', staff.id)
        .gte('payment_date', format(sixMonthsAgo, 'yyyy-MM-dd'))
        .order('payment_date', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      logger.error('Error fetching staff payment history', error, { component: 'StaffHistoryDialog' });
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate running balance
  const getRunningBalance = (): { salary: number; paid: number; remaining: number } => {
    if (!staff) return { salary: 0, paid: 0, remaining: 0 };
    
    const currentMonthStart = startOfMonth(new Date());
    const currentMonthEnd = endOfMonth(new Date());
    
    const thisMonthPayments = payments.filter(p => {
      const date = new Date(p.payment_date);
      return date >= currentMonthStart && date <= currentMonthEnd;
    });
    
    const totalPaidThisMonth = thisMonthPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    
    return {
      salary: staff.salary,
      paid: totalPaidThisMonth,
      remaining: Math.max(0, staff.salary - totalPaidThisMonth)
    };
  };

  const balance = getRunningBalance();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <History className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg">Payment History</DialogTitle>
              <p className="text-sm text-muted-foreground">{staff?.name} • {staff?.role}</p>
            </div>
          </div>
        </DialogHeader>

        {/* Current Month Summary */}
        {staff && (
          <div className="grid grid-cols-3 gap-2 p-3 bg-muted/30 rounded-xl shrink-0">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Salary</p>
              <p className="text-sm font-bold tabular-nums">
                {BANGLADESHI_CURRENCY_SYMBOL}{balance.salary?.toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-emerald-600">Paid</p>
              <p className="text-sm font-bold text-emerald-600 tabular-nums">
                {BANGLADESHI_CURRENCY_SYMBOL}{balance.paid?.toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-rose-600">Due</p>
              <p className="text-sm font-bold text-rose-600 tabular-nums">
                {BANGLADESHI_CURRENCY_SYMBOL}{balance.remaining?.toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : payments.length > 0 ? (
          <ScrollArea className="flex-1 mt-4">
            <div className="space-y-2 pr-4">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <Receipt className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {format(new Date(payment.payment_date), 'MMM dd, yyyy')}
                      </p>
                      {payment.notes && (
                        <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                          {payment.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-600 tabular-nums">
                      +{BANGLADESHI_CURRENCY_SYMBOL}{Number(payment.amount).toLocaleString()}
                    </p>
                    {payment.notes?.includes('Bonus') && (
                      <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30">
                        Bonus
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-12">
            <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
              <Receipt className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No payment history found</p>
            <p className="text-xs text-muted-foreground mt-1">Last 6 months</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
