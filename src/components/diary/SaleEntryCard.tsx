import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Receipt, 
  CreditCard, 
  Banknote, 
  Smartphone, 
  User, 
  Package, 
  Clock,
  ArrowUpRight,
  Eye
} from "lucide-react";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
import { format } from "date-fns";
import { SaleEntry } from "@/hooks/useBusinessDiaryData";

interface SaleEntryCardProps {
  entry: SaleEntry;
  onViewDetails?: (entry: SaleEntry) => void;
}

const paymentMethodConfig: Record<string, { icon: React.ComponentType<any>; color: string; label: string }> = {
  cash: { icon: Banknote, color: 'text-green-600 bg-green-100 dark:bg-green-900/30', label: 'Cash' },
  bkash: { icon: Smartphone, color: 'text-pink-600 bg-pink-100 dark:bg-pink-900/30', label: 'bKash' },
  nagad: { icon: Smartphone, color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30', label: 'Nagad' },
  rocket: { icon: Smartphone, color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30', label: 'Rocket' },
  card: { icon: CreditCard, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30', label: 'Card' }
};

const statusConfig: Record<string, { color: string; label: string }> = {
  paid: { color: 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30', label: 'Paid' },
  due: { color: 'bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30', label: 'Due' },
  partial: { color: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30', label: 'Partial' }
};

export const SaleEntryCard = ({ entry, onViewDetails }: SaleEntryCardProps) => {
  const paymentConfig = paymentMethodConfig[entry.paymentMethod] || paymentMethodConfig.cash;
  const PaymentIcon = paymentConfig.icon;
  const statusConf = statusConfig[entry.paymentStatus];
  
  const isPayment = entry.type === 'payment';

  return (
    <Card className={`border transition-all duration-200 hover:shadow-md ${isPayment ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20' : 'border-border'}`}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Left: Product/Transaction Info */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Header Row */}
            <div className="flex items-center gap-2 flex-wrap">
              {isPayment ? (
                <Badge variant="outline" className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-xs">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  Payment
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs">
                  <Receipt className="h-3 w-3 mr-1" />
                  Sale
                </Badge>
              )}
              <Badge variant="outline" className={statusConf.color + " text-xs"}>
                {statusConf.label}
              </Badge>
              {entry.transactionType === 'wholesale' && (
                <Badge variant="secondary" className="text-xs">Wholesale</Badge>
              )}
            </div>

            {/* Product Name */}
            <div>
              <h4 className="font-semibold text-sm sm:text-base text-foreground truncate">
                {entry.productName}
              </h4>
              {entry.productDetails && (
                <p className="text-xs text-muted-foreground">{entry.productDetails}</p>
              )}
            </div>

            {/* Customer & Staff Info */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {entry.customerName}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(new Date(entry.timestamp), 'hh:mm a')}
              </span>
            </div>

            {/* Transaction Number */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                {entry.transactionNumber}
              </span>
              <span className="text-[10px] text-muted-foreground">
                via {entry.source}
              </span>
            </div>
          </div>

          {/* Right: Amount & Payment */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            {/* Amount */}
            <div className="text-right">
              <p className="text-lg sm:text-xl font-bold text-green-600 dark:text-green-400">
                +{BANGLADESHI_CURRENCY_SYMBOL}{entry.totalAmount.toLocaleString()}
              </p>
            </div>

            {/* Payment Method Badge */}
            <Badge variant="outline" className={paymentConfig.color + " text-xs"}>
              <PaymentIcon className="h-3 w-3 mr-1" />
              {paymentConfig.label}
            </Badge>

            {/* View Details Button (Mobile-friendly) */}
            {onViewDetails && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 px-2 text-xs"
                onClick={() => onViewDetails(entry)}
              >
                <Eye className="h-3 w-3 mr-1" />
                View
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
