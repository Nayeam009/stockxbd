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
import { SaleEntry } from "@/hooks/queries/useBusinessDiaryQueries";

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
  const paymentConfig = paymentMethodConfig[entry.paymentMethod] || paymentMethodConfig.cash;
  const PaymentIcon = paymentConfig.icon;
  const statusConf = statusConfig[entry.paymentStatus] || statusConfig.paid;
  const roleConf = staffRoleConfig[entry.staffRole] || staffRoleConfig.unknown;
  const RoleIcon = roleConf.icon;
  const isPayment = entry.type === 'payment';
  const hasReturnCylinders = entry.returnCylinders && entry.returnCylinders.length > 0;

  const getStatusBarColor = () => {
    if (entry.paymentStatus === 'paid') return 'bg-emerald-400';
    if (entry.paymentStatus === 'due') return 'bg-rose-400';
    return 'bg-amber-400';
  };

  return (
    <Card className={`border overflow-hidden transition-all duration-300 hover:shadow-lg group
      ${isPayment ? 'bg-gradient-to-r from-emerald-50/80 to-card dark:from-emerald-950/30 dark:to-card border-emerald-200/60 dark:border-emerald-800/40'
        : 'bg-card hover:bg-gradient-to-r hover:from-muted/30 hover:to-card border-border/60'}`}>
      <div className={`h-1 ${getStatusBarColor()}`} />
      <CardContent className="p-3 sm:p-3.5">
        <div className="flex items-start justify-between gap-2.5">
          {/* Left: Product/Transaction Info */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Header Badges */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {isPayment ? (
                <Badge variant="outline" className="bg-success/15 text-success border-success/30 text-[10px] font-medium h-5">
                  <ArrowUpRight className="h-2.5 w-2.5 mr-0.5" />Payment
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[10px] font-medium h-5">
                  <Receipt className="h-2.5 w-2.5 mr-0.5" />Sale
                </Badge>
              )}
              {entry.isOnlineOrder && (
                <Badge className="bg-primary text-primary-foreground text-[10px] font-medium h-5">
                  <Globe className="h-2.5 w-2.5 mr-0.5" />Online
                </Badge>
              )}
              <Badge variant="outline" className={`${statusConf.bgColor} ${statusConf.color} text-[10px] font-medium border h-5`}>
                {statusConf.label}
              </Badge>
              {entry.transactionType === 'wholesale' && (
                <Badge variant="secondary" className="text-[10px] bg-secondary/20 h-5">Wholesale</Badge>
              )}
            </div>

            {/* Product Name */}
            <div>
              <h4 className="font-semibold text-sm text-foreground leading-tight line-clamp-1 group-hover:text-primary transition-colors">
                {entry.productName}
              </h4>
              {entry.productDetails && (
                <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{entry.productDetails}</p>
              )}
            </div>

            {/* Return Cylinders */}
            {hasReturnCylinders && (
              <Badge variant="outline" className="bg-accent/15 text-accent border-accent/30 text-[10px] h-5">
                <RotateCcw className="h-2.5 w-2.5 mr-0.5" />
                Return: {entry.returnCylinders.map(r => `${r.quantity}x ${r.brand}`).join(', ')}
              </Badge>
            )}

            {/* Customer & Time */}
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1 bg-muted/50 px-1.5 py-0.5 rounded">
                <User className="h-2.5 w-2.5" />{entry.customerName}
              </span>
              {entry.customerPhone && (
                <span className="flex items-center gap-1 bg-muted/50 px-1.5 py-0.5 rounded">
                  <Phone className="h-2.5 w-2.5" />{entry.customerPhone}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="h-2.5 w-2.5" />{format(new Date(entry.timestamp), 'hh:mm a')}
              </span>
            </div>

            {/* Transaction Number */}
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-muted-foreground font-mono bg-muted/70 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                <Hash className="h-2 w-2" />{entry.transactionNumber}
              </span>
              <span className="text-[9px] text-muted-foreground">via {entry.source}</span>
            </div>
          </div>

          {/* Right: Amount & Actions */}
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <Badge variant="outline" className={`${roleConf.bgColor} ${roleConf.color} border-0 text-[10px] font-medium px-1.5 py-0.5 h-5`}>
              <RoleIcon className="h-2.5 w-2.5 mr-0.5" />{roleConf.label}
            </Badge>

            <div className="text-right">
              <p className="text-base sm:text-lg font-bold text-success tabular-nums">
                +{BANGLADESHI_CURRENCY_SYMBOL}{(entry.amountPaid ?? entry.totalAmount).toLocaleString()}
              </p>
              {entry.paymentStatus === 'partial' && entry.remainingDue > 0 && (
                <p className="text-[10px] text-muted-foreground">
                  Total: {BANGLADESHI_CURRENCY_SYMBOL}{entry.totalAmount.toLocaleString()}
                </p>
              )}
            </div>

            <Badge variant="outline" className={`${paymentConfig.bgColor} ${paymentConfig.color} border-0 text-[10px] font-medium px-1.5 py-0.5 h-5`}>
              <PaymentIcon className="h-2.5 w-2.5 mr-0.5" />{paymentConfig.label}
            </Badge>

            {onViewDetails && (
              <Button variant="ghost" size="sm" className="h-8 w-8 sm:h-7 sm:w-auto sm:px-2 text-[10px] hover:bg-primary/10 hover:text-primary touch-manipulation"
                onClick={() => onViewDetails(entry)}>
                <Eye className="h-3.5 w-3.5 sm:mr-1" />
                <span className="hidden sm:inline">View</span>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
