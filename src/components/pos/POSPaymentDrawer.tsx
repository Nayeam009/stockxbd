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

type PaymentMethodType = 'cash' | 'bkash' | 'nagad' | 'rocket';

interface POSPaymentDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  paymentAmount: string;
  onPaymentAmountChange: (value: string) => void;
  paymentMethod: PaymentMethodType;
  onPaymentMethodChange: (method: PaymentMethodType) => void;
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
  paymentMethod,
  onPaymentMethodChange,
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

          {/* Payment Method Selector */}
          <div>
            <p className="text-sm font-medium text-foreground mb-2">Payment Method</p>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'cash' as PaymentMethodType, label: 'Cash', emoji: '💵' },
                { id: 'bkash' as PaymentMethodType, label: 'bKash', emoji: '🅱' },
                { id: 'nagad' as PaymentMethodType, label: 'Nagad', emoji: '🟠' },
                { id: 'rocket' as PaymentMethodType, label: 'Rocket', emoji: '🚀' },
              ].map(method => (
                <button
                  key={method.id}
                  onClick={() => onPaymentMethodChange(method.id)}
                  className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border-2 transition-all text-xs font-semibold ${
                    paymentMethod === method.id
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-muted/30 text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  <span className="text-lg">{method.emoji}</span>
                  <span>{method.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <Label className="text-sm font-medium">Amount Paid</Label>
          <Input
              type="number"
              value={paymentAmount}
              onChange={(e) => onPaymentAmountChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (!processing) onComplete();
                }
              }}
              placeholder="Enter amount..."
              className="h-12 text-xl font-semibold mt-1.5"
              autoFocus
            />
          </div>

          {/* Payment Status Indicator */}
          <div className="flex items-center justify-center gap-4 py-3">
            {[
              { id: 'paid', label: 'PAID', color: 'bg-emerald-500' },
              { id: 'partial', label: 'PARTIAL', color: 'bg-amber-500' },
              { id: 'due', label: 'DUE', color: 'bg-rose-500' },
            ].map((status) => (
              <div
                key={status.id}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                  paymentStatus === status.id
                    ? `${status.color} text-white`
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
