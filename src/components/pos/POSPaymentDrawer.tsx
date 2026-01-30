import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Loader2 } from "lucide-react";
import { useMemo } from "react";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";

interface POSPaymentDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  paymentAmount: string;
  onPaymentAmountChange: (value: string) => void;
  onComplete: () => void;
  processing: boolean;
  hasCustomer: boolean;
}

export const POSPaymentDrawer = ({
  open,
  onOpenChange,
  total,
  paymentAmount,
  onPaymentAmountChange,
  onComplete,
  processing,
  hasCustomer
}: POSPaymentDrawerProps) => {
  const paidAmount = parseFloat(paymentAmount) || 0;

  const paymentStatus = useMemo(() => {
    if (paidAmount >= total) return 'paid';
    if (paidAmount === 0) return 'due';
    return 'partial';
  }, [paidAmount, total]);

  const statusColors = {
    paid: 'bg-emerald-500',
    partial: 'bg-amber-500',
    due: 'bg-rose-500'
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>Complete Payment</DrawerTitle>
        </DrawerHeader>
        <div className="p-4 space-y-4">
          {/* Total Display */}
          <div className="text-center py-4 bg-muted/50 rounded-xl">
            <p className="text-sm text-muted-foreground">Total Bill</p>
            <p className="text-4xl font-bold text-foreground tabular-nums">
              {BANGLADESHI_CURRENCY_SYMBOL}{total.toLocaleString()}
            </p>
          </div>

          {/* Amount Input */}
          <div>
            <Label className="text-sm font-medium">Amount Paid</Label>
            <Input
              type="number"
              value={paymentAmount}
              onChange={(e) => onPaymentAmountChange(e.target.value)}
              placeholder="Enter amount..."
              className="h-12 text-xl font-semibold mt-1.5"
              autoFocus
            />
          </div>

          {/* Payment Status Indicator */}
          <div className="flex items-center justify-center gap-4 py-3">
            {[
              { id: 'paid', label: 'PAID' },
              { id: 'partial', label: 'PARTIAL' },
              { id: 'due', label: 'DUE' },
            ].map((status) => (
              <div
                key={status.id}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                  paymentStatus === status.id
                    ? `${statusColors[status.id as keyof typeof statusColors]} text-white`
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${
                  paymentStatus === status.id ? 'bg-white' : 'bg-muted-foreground/50'
                }`} />
                <span className="text-sm font-medium">{status.label}</span>
              </div>
            ))}
          </div>

          {/* Remaining Due Display */}
          {paymentStatus === 'partial' && (
            <div className="text-center py-2 px-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Remaining Due: <span className="font-bold tabular-nums">{BANGLADESHI_CURRENCY_SYMBOL}{(total - paidAmount).toLocaleString()}</span>
              </p>
            </div>
          )}

          {/* Due Warning */}
          {(paymentStatus === 'due' || paymentStatus === 'partial') && !hasCustomer && (
            <p className="text-xs text-destructive text-center">
              ⚠ Credit/partial payment requires a customer with phone number
            </p>
          )}
        </div>
        <DrawerFooter className="flex-row gap-3">
          <Button
            variant="outline"
            className="flex-1 h-12"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          {paymentStatus === 'paid' ? (
            <Button
              className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700"
              onClick={onComplete}
              disabled={processing}
            >
              {processing ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Confirm & Print'}
            </Button>
          ) : paymentStatus === 'partial' ? (
            <Button
              className="flex-1 h-12 bg-amber-500 hover:bg-amber-600 text-white"
              onClick={onComplete}
              disabled={processing || !hasCustomer}
            >
              {processing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                `Save Partial (৳${paidAmount.toLocaleString()} paid)`
              )}
            </Button>
          ) : (
            <Button
              className="flex-1 h-12"
              variant="outline"
              onClick={onComplete}
              disabled={processing || !hasCustomer}
            >
              {processing ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save as Due'}
            </Button>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
