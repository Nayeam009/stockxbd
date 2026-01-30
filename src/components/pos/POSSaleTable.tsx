import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShoppingCart, Plus, Minus, X, Cylinder, ChefHat, Gauge, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
import type { SaleItem } from "@/hooks/usePOSCart";

interface POSSaleTableProps {
  items: SaleItem[];
  itemsCount: number;
  isActive: boolean;
  onActivate: () => void;
  onUpdateQuantity: (id: string, change: number) => void;
  onRemove: (id: string) => void;
}

export const POSSaleTable = ({
  items,
  itemsCount,
  isActive,
  onActivate,
  onUpdateQuantity,
  onRemove
}: POSSaleTableProps) => {
  const getItemIcon = (type: string) => {
    switch (type) {
      case 'lpg': return Cylinder;
      case 'stove': return ChefHat;
      case 'regulator': return Gauge;
      default: return Package;
    }
  };

  return (
    <Card className={cn(
      "border-2 border-emerald-200 dark:border-emerald-900",
      !isActive && "hidden lg:block"
    )}>
      <CardHeader
        className="py-2 px-3 bg-emerald-50 dark:bg-emerald-950/30 cursor-pointer"
        onClick={onActivate}
      >
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-emerald-600" />
            Products Sold
          </span>
          <Badge className="bg-emerald-600">{itemsCount}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        <ScrollArea className="h-[140px] sm:h-[160px]">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-6">
              <ShoppingCart className="h-8 w-8 opacity-30 mb-2" />
              <p className="text-xs">Select products below</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {items.map(item => {
                const ItemIcon = getItemIcon(item.type);
                return (
                  <div key={item.id} className="flex items-center gap-2 p-2 rounded-lg bg-card border">
                    <div
                      className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: item.brandColor || 'hsl(var(--muted))' }}
                    >
                      <ItemIcon className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs truncate">{item.name}</p>
                      <p className="text-[9px] text-muted-foreground truncate">{item.details}</p>
                    </div>
                    <div className="flex items-center gap-1 bg-muted rounded px-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => onUpdateQuantity(item.id, -1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-5 text-center text-xs font-bold tabular-nums">{item.quantity}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => onUpdateQuantity(item.id, 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs font-bold text-emerald-600 tabular-nums min-w-[50px] text-right">
                      {BANGLADESHI_CURRENCY_SYMBOL}{(item.price * item.quantity).toLocaleString()}
                    </p>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 min-w-[28px] text-destructive hover:bg-destructive/10 flex-shrink-0"
                      onClick={() => onRemove(item.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
