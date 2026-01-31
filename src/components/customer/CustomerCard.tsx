import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { History, Banknote, Edit, Trash2 } from "lucide-react";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";

export interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  total_due: number;
  cylinders_due: number;
  billing_status: string;
  last_order_date: string | null;
  created_at: string;
}

interface CustomerCardProps {
  customer: Customer;
  variant: 'due' | 'paid';
  onSettle?: (customer: Customer) => void;
  onHistory?: (customer: Customer) => void;
  onEdit?: (customer: Customer) => void;
  onDelete?: (customer: Customer) => void;
}

const getInitials = (name: string) => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

const getBillingBadge = (status: string, totalDue: number) => {
  if (totalDue === 0) {
    return <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">Paid</Badge>;
  }
  if (status === 'overdue') {
    return <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30">Overdue</Badge>;
  }
  return <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30">Pending</Badge>;
};

export const CustomerCard = ({
  customer,
  variant,
  onSettle,
  onHistory,
  onEdit,
  onDelete
}: CustomerCardProps) => {
  const isDue = variant === 'due';
  const colorClass = isDue ? 'rose' : 'emerald';
  
  return (
    <Card className="border border-border/50 shadow-sm hover:shadow-md transition-all">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <Avatar className={`h-10 w-10 bg-${colorClass}-500/10 shrink-0`}>
              <AvatarFallback className={`bg-${colorClass}-500/10 text-${colorClass}-600 font-semibold`}>
                {getInitials(customer.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-semibold text-foreground truncate">{customer.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {customer.phone || customer.email || 'No contact'}
              </p>
            </div>
          </div>
          {getBillingBadge(customer.billing_status, customer.total_due)}
        </div>

        {isDue && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-rose-500/5 rounded-lg p-2.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Amount Due</p>
              <p className="text-base font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                {BANGLADESHI_CURRENCY_SYMBOL}{Number(customer.total_due).toLocaleString()}
              </p>
            </div>
            <div className="bg-purple-500/5 rounded-lg p-2.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Cylinders</p>
              <p className="text-base font-bold text-purple-600 dark:text-purple-400 tabular-nums">
                {customer.cylinders_due} pcs
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {isDue && onSettle && (
            <Button
              size="sm"
              className="flex-1 h-10 bg-rose-500 hover:bg-rose-600 text-white font-medium touch-manipulation"
              onClick={() => onSettle(customer)}
            >
              <Banknote className="h-4 w-4 mr-1.5" />
              Settle
            </Button>
          )}
          {onHistory && (
            <Button
              size="sm"
              variant="outline"
              className="h-10 px-3 border-border touch-manipulation"
              onClick={() => onHistory(customer)}
            >
              <History className="h-4 w-4" />
            </Button>
          )}
          {onEdit && (
            <Button
              size="sm"
              variant="ghost"
              className="h-10 px-3 touch-manipulation"
              onClick={() => onEdit(customer)}
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              size="sm"
              variant="ghost"
              className="h-10 px-3 text-destructive hover:text-destructive hover:bg-destructive/10 touch-manipulation"
              onClick={() => onDelete(customer)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
