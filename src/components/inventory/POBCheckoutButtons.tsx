import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, CreditCard } from "lucide-react";

interface POBCheckoutButtonsProps {
  onComplete: () => void;
  onSaveCredit: () => void;
  processing: boolean;
  disabled?: boolean;
}

export const POBCheckoutButtons = ({ 
  onComplete, 
  onSaveCredit, 
  processing,
  disabled = false
}: POBCheckoutButtonsProps) => {
  return (
    <div className="space-y-2">
      <Button 
        type="button" 
        size="lg" 
        className="w-full h-12 font-bold bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-500/90 hover:to-emerald-600/90" 
        onClick={onComplete}
        disabled={processing || disabled}
      >
        {processing ? (
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
        ) : (
          <CheckCircle2 className="h-5 w-5 mr-2" />
        )}
        Complete (Paid)
      </Button>
      <Button 
        type="button" 
        size="lg" 
        variant="outline"
        className="w-full h-12 font-bold border-2 border-amber-500 text-amber-600 hover:bg-amber-500/10" 
        onClick={onSaveCredit}
        disabled={processing || disabled}
      >
        {processing ? (
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
        ) : (
          <CreditCard className="h-5 w-5 mr-2" />
        )}
        Save as Credit
      </Button>
    </div>
  );
};
