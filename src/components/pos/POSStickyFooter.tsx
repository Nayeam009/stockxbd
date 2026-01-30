import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";

interface POSStickyFooterProps {
  total: number;
  itemCount: number;
  onProceed: () => void;
  disabled: boolean;
  processing: boolean;
}

export const POSStickyFooter = ({
  total,
  itemCount,
  onProceed,
  disabled,
  processing
}: POSStickyFooterProps) => {
  if (itemCount === 0) return null;

  return (
    <div className={cn(
      "fixed left-0 right-0 z-40",
      "bg-card/95 backdrop-blur-sm border-t border-border shadow-lg",
      // Mobile: above bottom nav (h-16 = 64px + safe area)
      "bottom-[calc(64px+env(safe-area-inset-bottom))] md:bottom-0",
      "safe-area-pb"
    )}>
      <div className="flex items-center justify-between p-3 max-w-7xl mx-auto gap-4">
        <div className="min-w-0">
          <p className="text-2xl font-bold text-foreground tabular-nums truncate">
            {BANGLADESHI_CURRENCY_SYMBOL}{total.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">
            {itemCount} item{itemCount !== 1 ? 's' : ''}
          </p>
        </div>

        <Button
          size="lg"
          onClick={onProceed}
          disabled={disabled || processing}
          className={cn(
            "h-12 px-6 min-w-[140px]",
            "bg-emerald-600 hover:bg-emerald-700",
            "text-base font-semibold shadow-lg",
            "active:scale-[0.98] transition-transform"
          )}
        >
          {processing ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            'PROCEED →'
          )}
        </Button>
      </div>
    </div>
  );
};
