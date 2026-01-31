import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Banknote, Gift, History, Trash2, Edit } from "lucide-react";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";

export interface StaffPayment {
  id: string;
  staff_id: string;
  amount: number;
  payment_date: string;
  notes: string | null;
}

export interface Staff {
  id: string;
  name: string;
  role: string;
  salary: number;
  phone: string | null;
  is_active: boolean;
}

export interface StaffWithPayments extends Staff {
  payments: StaffPayment[];
  totalPaid: number;
  remaining: number;
  lastPaid: string | null;
  status: "Paid" | "Partial" | "Unpaid";
}

interface StaffCardProps {
  staff: StaffWithPayments;
  onPay?: (staff: StaffWithPayments) => void;
  onBonus?: (staff: StaffWithPayments) => void;
  onHistory?: (staff: StaffWithPayments) => void;
  onEdit?: (staff: StaffWithPayments) => void;
  onDelete?: (staff: StaffWithPayments) => void;
}

const getInitials = (name: string) => {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "Paid": 
      return <Badge className="bg-emerald-500/90 hover:bg-emerald-500 text-white text-[10px] font-medium px-2 py-0.5">Paid</Badge>;
    case "Partial": 
      return <Badge className="bg-amber-500/90 hover:bg-amber-500 text-white text-[10px] font-medium px-2 py-0.5">Partial</Badge>;
    default: 
      return <Badge className="bg-rose-500/90 hover:bg-rose-500 text-white text-[10px] font-medium px-2 py-0.5">Unpaid</Badge>;
  }
};

export const StaffCard = ({
  staff,
  onPay,
  onBonus,
  onHistory,
  onEdit,
  onDelete
}: StaffCardProps) => {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-11 w-11 border-2 border-background shadow-sm">
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold text-sm">
                {getInitials(staff.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{staff.name}</p>
              <p className="text-xs text-muted-foreground">{staff.role}</p>
            </div>
          </div>
          {getStatusBadge(staff.status)}
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="p-2.5 bg-muted/50 rounded-lg text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Salary</p>
            <p className="text-sm font-bold tabular-nums">
              {BANGLADESHI_CURRENCY_SYMBOL}{Number(staff.salary).toLocaleString()}
            </p>
          </div>
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg text-center">
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Paid</p>
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {BANGLADESHI_CURRENCY_SYMBOL}{staff.totalPaid.toLocaleString()}
            </p>
          </div>
          <div className="p-2.5 bg-rose-50 dark:bg-rose-950/30 rounded-lg text-center">
            <p className="text-[10px] text-rose-600 dark:text-rose-400 uppercase tracking-wide">Due</p>
            <p className="text-sm font-bold text-rose-600 dark:text-rose-400 tabular-nums">
              {BANGLADESHI_CURRENCY_SYMBOL}{staff.remaining.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4">
          <Button 
            size="sm"
            className="flex-1 h-10"
            onClick={() => onPay?.(staff)}
            disabled={staff.status === "Paid"}
          >
            <Banknote className="h-4 w-4 mr-1.5" />
            Pay Salary
          </Button>
          <Button 
            variant="outline"
            size="sm"
            className="h-10 w-10 p-0"
            onClick={() => onBonus?.(staff)}
          >
            <Gift className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            className="h-10 w-10 p-0"
            onClick={() => onHistory?.(staff)}
          >
            <History className="h-4 w-4" />
          </Button>
          {onEdit && (
            <Button 
              variant="ghost" 
              size="sm"
              className="h-10 w-10 p-0"
              onClick={() => onEdit(staff)}
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="sm"
            className="h-10 w-10 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete?.(staff)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
