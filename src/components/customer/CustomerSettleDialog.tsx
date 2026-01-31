import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Banknote, Package, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
import { logger } from "@/lib/logger";
import type { Customer } from "./CustomerCard";

interface CustomerSettleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  onSuccess: () => void;
}

export const CustomerSettleDialog = ({
  open,
  onOpenChange,
  customer,
  onSuccess
}: CustomerSettleDialogProps) => {
  const [paymentAmount, setPaymentAmount] = useState("");
  const [cylindersToCollect, setCylindersToCollect] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Reset form when customer changes
  const resetForm = () => {
    if (customer) {
      setPaymentAmount(customer.total_due.toString());
      setCylindersToCollect(customer.cylinders_due.toString());
    }
  };

  const handleSettleAccount = async () => {
    if (!customer) return;
    setIsLoading(true);

    const amount = parseFloat(paymentAmount) || 0;
    const cylinders = parseInt(cylindersToCollect) || 0;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: ownerId } = await supabase.rpc("get_owner_id");

      // Record the payment
      const { error: paymentError } = await supabase
        .from('customer_payments')
        .insert({
          customer_id: customer.id,
          amount: amount,
          cylinders_collected: cylinders,
          created_by: user?.id,
          payment_date: new Date().toISOString().split('T')[0]
        });

      if (paymentError) {
        throw paymentError;
      }

      // Update customer record
      const newTotalDue = Math.max(0, customer.total_due - amount);
      const newCylindersDue = Math.max(0, customer.cylinders_due - cylinders);
      const newStatus = newTotalDue === 0 && newCylindersDue === 0 ? 'clear' : 'pending';

      const { error: updateError } = await supabase
        .from('customers')
        .update({
          total_due: newTotalDue,
          cylinders_due: newCylindersDue,
          billing_status: newStatus
        })
        .eq('id', customer.id);

      if (updateError) {
        throw updateError;
      }

      // Auto-sync to daily expenses for Business Diary tracking
      if (amount > 0) {
        await supabase.from('daily_expenses').insert({
          expense_date: new Date().toISOString().split('T')[0],
          category: 'Customer Settlement',
          description: `Payment received from ${customer.name}`,
          amount: -amount, // Negative because it's income
          created_by: user?.id,
          owner_id: ownerId || user?.id
        });
      }

      toast({ title: "Account settled successfully" });
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      logger.error('Error settling account', error, { component: 'CustomerSettleDialog' });
      toast({ 
        title: "Error settling account", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (isOpen) resetForm();
    }}>
      <DialogContent className="bg-card border-border max-w-[95vw] sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
              <Banknote className="h-5 w-5 text-rose-500" />
            </div>
            <div>
              <DialogTitle className="text-lg">Settle Account</DialogTitle>
              <p className="text-sm text-muted-foreground">{customer?.name}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Dues Summary */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-muted/30 rounded-xl">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Amount Due</p>
              <p className="text-lg font-bold text-rose-600 tabular-nums">
                {BANGLADESHI_CURRENCY_SYMBOL}{customer?.total_due?.toLocaleString() || 0}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Cylinders Due</p>
              <p className="text-lg font-bold text-purple-600 tabular-nums">
                {customer?.cylinders_due || 0} pcs
              </p>
            </div>
          </div>

          {/* Payment Amount */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Banknote className="h-4 w-4 text-emerald-500" />
              Payment Amount ({BANGLADESHI_CURRENCY_SYMBOL})
            </Label>
            <Input
              type="number"
              inputMode="numeric"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              className="h-12 text-lg font-semibold text-center"
              placeholder="0"
            />
          </div>

          {/* Cylinders to Collect */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Package className="h-4 w-4 text-purple-500" />
              Cylinders to Collect
            </Label>
            <Input
              type="number"
              inputMode="numeric"
              value={cylindersToCollect}
              onChange={(e) => setCylindersToCollect(e.target.value)}
              className="h-12 text-lg font-semibold text-center"
              placeholder="0"
            />
          </div>

          {/* Quick Amount Buttons */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 h-9"
              onClick={() => setPaymentAmount((customer?.total_due || 0).toString())}
            >
              Full Amount
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 h-9"
              onClick={() => setPaymentAmount(((customer?.total_due || 0) / 2).toString())}
            >
              Half
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 h-9"
              onClick={() => {
                setPaymentAmount("0");
                setCylindersToCollect((customer?.cylinders_due || 0).toString());
              }}
            >
              Cylinders Only
            </Button>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-11"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSettleAccount}
            className="h-11 bg-emerald-600 hover:bg-emerald-700"
            disabled={isLoading || (!parseFloat(paymentAmount) && !parseInt(cylindersToCollect))}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              'Confirm Settlement'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
