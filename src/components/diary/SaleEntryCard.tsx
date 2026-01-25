import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Receipt, 
  CreditCard, 
  Banknote, 
  Smartphone, 
  User, 
  Clock,
  ArrowUpRight,
  Eye,
  Hash,
  Phone,
  RotateCcw,
  Crown,
  UserCog,
  Truck,
  Users,
  Globe
} from "lucide-react";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
import { format } from "date-fns";
import { SaleEntry } from "@/hooks/useBusinessDiaryData";

interface SaleEntryCardProps {
  entry: SaleEntry;
  onViewDetails?: (entry: SaleEntry) => void;
}

const paymentMethodConfig: Record<string, { icon: React.ComponentType<any>; color: string; bgColor: string; label: string }> = {
  cash: { icon: Banknote, color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/40', label: 'Cash' },
  bkash: { icon: Smartphone, color: 'text-pink-600 dark:text-pink-400', bgColor: 'bg-pink-100 dark:bg-pink-900/40', label: 'bKash' },
  nagad: { icon: Smartphone, color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-100 dark:bg-orange-900/40', label: 'Nagad' },
  rocket: { icon: Smartphone, color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-900/40', label: 'Rocket' },
  card: { icon: CreditCard, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/40', label: 'Card' }
};

const statusConfig: Record<string, { color: string; bgColor: string; label: string }> = {
  paid: { color: 'text-emerald-700 dark:text-emerald-300', bgColor: 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-800', label: 'Paid' },
  due: { color: 'text-rose-700 dark:text-rose-300', bgColor: 'bg-rose-100 dark:bg-rose-900/40 border-rose-200 dark:border-rose-800', label: 'Due' },
  partial: { color: 'text-amber-700 dark:text-amber-300', bgColor: 'bg-amber-100 dark:bg-amber-900/40 border-amber-200 dark:border-amber-800', label: 'Partial' }
};

const staffRoleConfig: Record<string, { icon: React.ComponentType<any>; color: string; bgColor: string; label: string }> = {
  owner: { icon: Crown, color: 'text-purple-700 dark:text-purple-300', bgColor: 'bg-purple-100 dark:bg-purple-900/40', label: 'Owner' },
  manager: { icon: UserCog, color: 'text-blue-700 dark:text-blue-300', bgColor: 'bg-blue-100 dark:bg-blue-900/40', label: 'Manager' },
  driver: { icon: Truck, color: 'text-amber-700 dark:text-amber-300', bgColor: 'bg-amber-100 dark:bg-amber-900/40', label: 'Driver' },
  staff: { icon: Users, color: 'text-slate-700 dark:text-slate-300', bgColor: 'bg-slate-100 dark:bg-slate-900/40', label: 'Staff' },
  unknown: { icon: User, color: 'text-gray-700 dark:text-gray-300', bgColor: 'bg-gray-100 dark:bg-gray-900/40', label: 'Staff' }
};

export const SaleEntryCard = ({ entry, onViewDetails }: SaleEntryCardProps) => {
  // Safely get payment config with fallback
  const paymentConfig = paymentMethodConfig[entry.paymentMethod] || paymentMethodConfig.cash;
  const PaymentIcon = paymentConfig.icon;
  
  // Status is already normalized by the hook - trust it directly
  const statusConf = statusConfig[entry.paymentStatus] || statusConfig.paid;
  const roleConf = staffRoleConfig[entry.staffRole] || staffRoleConfig.unknown;
  const RoleIcon = roleConf.icon;
  
  const isPayment = entry.type === 'payment';
  const hasReturnCylinders = entry.returnCylinders && entry.returnCylinders.length > 0;

  // Get status bar color based on payment status
  const getStatusBarColor = () => {
    if (entry.paymentStatus === 'paid') return 'bg-emerald-400';
    if (entry.paymentStatus === 'due') return 'bg-rose-400';
    return 'bg-amber-400';
  };

  return (
    <Card className={`
      border overflow-hidden transition-all duration-300 hover:shadow-lg group
      ${isPayment 
        ? 'bg-gradient-to-r from-emerald-50/80 to-card dark:from-emerald-950/30 dark:to-card border-emerald-200/60 dark:border-emerald-800/40' 
        : 'bg-card hover:bg-gradient-to-r hover:from-muted/30 hover:to-card border-border/60'
      }
    `}>
      {/* Top Color Bar - Based on Payment Status */}
      <div className={`h-1 ${getStatusBarColor()}`} />
      
      <CardContent className="p-3.5 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Left: Product/Transaction Info */}
          <div className="flex-1 min-w-0 space-y-2.5">
            {/* Header Row with Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              {isPayment ? (
                <Badge variant="outline" className="bg-success/15 text-success border-success/30 text-xs font-medium">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  Payment
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs font-medium">
                  <Receipt className="h-3 w-3 mr-1" />
                  Sale
                </Badge>
              )}
              {entry.isOnlineOrder && (
                <Badge className="bg-primary text-primary-foreground text-xs font-medium">
                  <Globe className="h-3 w-3 mr-1" />
                  Online
                </Badge>
              )}
              <Badge variant="outline" className={`${statusConf.bgColor} ${statusConf.color} text-xs font-medium border`} aria-label={`Payment status: ${statusConf.label}`}>
                {statusConf.label}
              </Badge>
              {entry.transactionType === 'wholesale' && (
                <Badge variant="secondary" className="text-xs bg-secondary/20 text-secondary-foreground dark:bg-secondary/30 border-0">
                  Wholesale
                </Badge>
              )}
            </div>

            {/* Product Name */}
            <div>
              <h4 className="font-semibold text-sm sm:text-base text-foreground leading-tight line-clamp-1 group-hover:text-primary transition-colors">
                {entry.productName}
              </h4>
              {entry.productDetails && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{entry.productDetails}</p>
              )}
            </div>

            {/* Return Cylinders (only for Refill sales) */}
            {hasReturnCylinders && (
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="bg-accent/15 text-accent border-accent/30 text-xs">
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Return: {entry.returnCylinders.map(r => `${r.quantity}x ${r.brand}`).join(', ')}
                </Badge>
              </div>
            )}

            {/* Customer & Time Info */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                <User className="h-3 w-3" />
                <span className="font-medium">{entry.customerName}</span>
              </span>
              {entry.customerPhone && (
                <span className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                  <Phone className="h-3 w-3" />
                  <span className="font-medium">{entry.customerPhone}</span>
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                {format(new Date(entry.timestamp), 'hh:mm a')}
              </span>
            </div>

            {/* Transaction Number */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground font-mono bg-muted/70 px-2 py-1 rounded flex items-center gap-1">
                <Hash className="h-2.5 w-2.5" />
                {entry.transactionNumber}
              </span>
              <span className="text-[10px] text-muted-foreground">
                via <span className="font-medium">{entry.source}</span>
              </span>
            </div>
          </div>

          {/* Right: Amount, Staff & Payment */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            {/* Staff Role Badge */}
            <Badge variant="outline" className={`${roleConf.bgColor} ${roleConf.color} border-0 text-xs font-medium px-2 py-1`}>
              <RoleIcon className="h-3 w-3 mr-1" />
              {roleConf.label}
            </Badge>
            
            {/* Amount with Emphasis */}
            <div className="text-right">
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-success tabular-nums">
                +{BANGLADESHI_CURRENCY_SYMBOL}{entry.totalAmount.toLocaleString()}
              </p>
            </div>

            {/* Payment Method Badge */}
            <Badge variant="outline" className={`${paymentConfig.bgColor} ${paymentConfig.color} border-0 text-xs font-medium px-2.5 py-1`}>
              <PaymentIcon className="h-3 w-3 mr-1.5" />
              {paymentConfig.label}
            </Badge>

            {/* View Details Button */}
            {onViewDetails && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-10 w-10 sm:h-8 sm:w-auto sm:px-3 text-xs hover:bg-primary/10 hover:text-primary touch-manipulation"
                onClick={() => onViewDetails(entry)}
                aria-label={`View details for transaction ${entry.transactionNumber}`}
              >
                <Eye className="h-4 w-4 sm:mr-1" aria-hidden="true" />
                <span className="hidden sm:inline">View</span>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
