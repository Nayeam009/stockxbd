import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  ShoppingBag, 
  Trash2, 
  Cylinder, 
  ChefHat, 
  Gauge, 
  Building2, 
  ChevronDown,
  CheckCircle2,
  CreditCard,
  Loader2
} from "lucide-react";
import type { POBCartItem } from "@/hooks/usePOBCart";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
import { cn } from "@/lib/utils";

interface POBCartViewProps {
  items: POBCartItem[];
  onRemoveItem: (id: string) => void;
  subtotal: number;
  totalQty: number;
  supplierName: string;
  onSupplierChange: (value: string) => void;
  showSupplierInput: boolean;
  onShowSupplierInputChange: (show: boolean) => void;
  onCompletePurchase: (status: 'completed' | 'pending') => void;
  processing: boolean;
}

export const POBCartView = ({ 
  items, 
  onRemoveItem, 
  subtotal, 
  totalQty,
  supplierName, 
  onSupplierChange,
  showSupplierInput,
  onShowSupplierInputChange,
  onCompletePurchase, 
  processing 
}: POBCartViewProps) => {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <ShoppingBag className="h-16 w-16 opacity-30 mb-4" />
        <p className="font-semibold">Cart is empty</p>
        <p className="text-sm">Add products to get started</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Cart Items */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {items.map((item) => (
            <Card 
              key={item.id} 
              className="overflow-hidden border" 
              style={{ 
                borderLeftWidth: '4px', 
                borderLeftColor: item.brandColor || (
                  item.type === 'stove' ? 'hsl(var(--warning))' : 
                  item.type === 'regulator' ? 'hsl(262.1 83.3% 57.8%)' : 
                  'hsl(var(--primary))'
                ) 
              }}
            >
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-muted">
                    {item.type === 'lpg' && (
                      <Cylinder className="h-5 w-5" style={{ color: item.brandColor || 'hsl(var(--primary))' }} />
                    )}
                    {item.type === 'stove' && <ChefHat className="h-5 w-5 text-orange-500" />}
                    {item.type === 'regulator' && <Gauge className="h-5 w-5 text-violet-500" />}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.details}</p>
                    <p className="text-xs font-medium text-primary">
                      {item.quantity} × {BANGLADESHI_CURRENCY_SYMBOL}{item.companyPrice.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold">
                    {BANGLADESHI_CURRENCY_SYMBOL}{(item.quantity * item.companyPrice).toLocaleString()}
                  </p>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-destructive" 
                    onClick={() => onRemoveItem(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>
      
      {/* Checkout Section */}
      <div className="p-4 bg-muted/50 border-t space-y-3 pb-[env(safe-area-inset-bottom)]">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-2 border-emerald-500/30 bg-emerald-500/10">
            <CardContent className="p-3 text-center">
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Total Qty</p>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                {totalQty}
              </p>
            </CardContent>
          </Card>
          <Card className="border-2 border-primary/30 bg-primary/10">
            <CardContent className="p-3 text-center">
              <p className="text-xs font-bold text-primary">Total D.O.</p>
              <p className="text-xl font-black text-primary tabular-nums">
                {BANGLADESHI_CURRENCY_SYMBOL}{subtotal.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Optional Supplier - Collapsible */}
        <Collapsible open={showSupplierInput} onOpenChange={onShowSupplierInputChange}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span>Add Supplier (Optional)</span>
            </div>
            <ChevronDown className={cn("h-4 w-4 transition-transform", showSupplierInput && "rotate-180")} />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <Input
              placeholder="Enter supplier name..."
              value={supplierName}
              onChange={(e) => onSupplierChange(e.target.value)}
              className="h-11"
            />
            <p className="text-[10px] text-muted-foreground mt-1 text-center">
              If left empty, brand name will be used as supplier
            </p>
          </CollapsibleContent>
        </Collapsible>

        {/* Complete Purchase Buttons */}
        <div className="space-y-2">
          <Button 
            type="button" 
            size="lg" 
            className="w-full h-12 font-bold bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600" 
            onClick={() => onCompletePurchase('completed')}
            disabled={processing}
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
            onClick={() => onCompletePurchase('pending')}
            disabled={processing}
          >
            {processing ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : (
              <CreditCard className="h-5 w-5 mr-2" />
            )}
            Save as Credit
          </Button>
        </div>
      </div>
    </div>
  );
};
