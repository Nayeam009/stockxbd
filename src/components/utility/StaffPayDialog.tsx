import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Banknote, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
import { logger } from "@/lib/logger";
import type { StaffWithPayments } from "./StaffCard";

interface StaffPayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: StaffWithPayments | null;
  mode: 'salary' | 'bonus';
  onSuccess: () => void;
}

export const StaffPayDialog = ({
  open,
  onOpenChange,
  staff,
  mode,
  onSuccess
}: StaffPayDialogProps) => {
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (staff && open) {
      setAmount(mode === 'salary' ? staff.remaining : 0);
      setNote("");
    }
  }, [staff, open, mode]);

  const handleSubmit = async () => {
    if (!staff || amount <= 0) {
      toast({ title: "Please enter a valid amount", variant: "destructive" });
      return;
    }

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: ownerId } = await supabase.rpc("get_owner_id");
      if (!user) return;

      const noteText = mode === 'bonus' 
        ? `Bonus: ${note || 'Performance bonus'}` 
        : note || null;

      // Insert payment
      const { error: paymentError } = await supabase.from("staff_payments").insert({
        staff_id: staff.id,
        amount: amount,
        notes: noteText,
        payment_date: format(new Date(), "yyyy-MM-dd"),
        created_by: user.id,
        owner_id: ownerId || user.id
      });

      if (paymentError) {
        throw paymentError;
      }

      // Auto-sync to daily expenses for Business Diary
      await supabase.from("daily_expenses").insert({
        expense_date: format(new Date(), "yyyy-MM-dd"),
        category: "Staff",
        description: mode === 'bonus' 
          ? `Bonus - ${staff.name}: ${note || 'Performance bonus'}`
          : `Salary Payment - ${staff.name}${note ? ': ' + note : ''}`,
        amount: amount,
        created_by: user.id,
        owner_id: ownerId || user.id
      });

      toast({ 
        title: mode === 'bonus' 
          ? "Bonus recorded successfully" 
          : "Payment recorded successfully" 
      });
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      logger.error(`Error processing ${mode}`, error, { component: 'StaffPayDialog' });
      toast({ 
        title: `Error processing ${mode}`, 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isSalary = mode === 'salary';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-[95vw] sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${isSalary ? 'bg-emerald-500/20' : 'bg-amber-500/20'}`}>
              <Banknote className={`h-5 w-5 ${isSalary ? 'text-emerald-500' : 'text-amber-500'}`} />
            </div>
            <div>
              <DialogTitle className="text-lg">
                {isSalary ? 'Pay Salary' : 'Give Bonus'}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">{staff?.name}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Staff Summary */}
          {isSalary && staff && (
            <div className="grid grid-cols-3 gap-2 p-3 bg-muted/30 rounded-xl">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Salary</p>
                <p className="text-sm font-bold tabular-nums">
                  {BANGLADESHI_CURRENCY_SYMBOL}{Number(staff.salary).toLocaleString()}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-emerald-600">Paid</p>
                <p className="text-sm font-bold text-emerald-600 tabular-nums">
                  {BANGLADESHI_CURRENCY_SYMBOL}{staff.totalPaid.toLocaleString()}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-rose-600">Due</p>
                <p className="text-sm font-bold text-rose-600 tabular-nums">
                  {BANGLADESHI_CURRENCY_SYMBOL}{staff.remaining.toLocaleString()}
                </p>
              </div>
            </div>
          )}

          {/* Amount */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {isSalary ? 'Payment Amount' : 'Bonus Amount'} ({BANGLADESHI_CURRENCY_SYMBOL})
            </Label>
            <Input
              type="number"
              inputMode="numeric"
              value={amount || ""}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="h-12 text-lg font-semibold text-center"
              placeholder="0"
            />
          </div>

          {/* Quick Amount Buttons for Salary */}
          {isSalary && staff && (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1 h-9"
                onClick={() => setAmount(staff.remaining)}
              >
                Full Due
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1 h-9"
                onClick={() => setAmount(Math.round(staff.remaining / 2))}
              >
                Half
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1 h-9"
                onClick={() => setAmount(1000)}
              >
                1,000
              </Button>
            </div>
          )}

          {/* Note */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {isSalary ? 'Note (Optional)' : 'Bonus Reason'}
            </Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={isSalary ? "e.g., Advance payment" : "e.g., Performance bonus, Festival bonus"}
              className="resize-none"
              rows={2}
            />
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
            onClick={handleSubmit}
            className={`h-11 ${isSalary ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'}`}
            disabled={isLoading || amount <= 0}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              isSalary ? 'Pay Now' : 'Give Bonus'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
