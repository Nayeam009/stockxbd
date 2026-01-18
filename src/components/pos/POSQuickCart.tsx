import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
import { Plus, Minus, Trash2, ShoppingCart, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CartItem {
  id: string;
  type: 'lpg' | 'stove' | 'regulator' | 'custom';
  name: string;
  details: string;
  price: number;
  quantity: number;
  returnBrand?: string;
  returnBrandId?: string;
  cylinderType?: 'refill' | 'package';
  brandId?: string;
  stoveId?: string;
  regulatorId?: string;
}

interface POSQuickCartProps {
  items: CartItem[];
  onUpdateQuantity: (id: string, change: number) => void;
  onRemoveItem: (id: string) => void;
  onEditItem?: (item: CartItem) => void;
}

export const POSQuickCart = ({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onEditItem,
}: POSQuickCartProps) => {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center px-4">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-muted flex items-center justify-center mb-4">
          <ShoppingCart className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground/50" />
        </div>
        <p className="text-muted-foreground font-medium">Cart is empty</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Tap a product to add it
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">
            Cart ({items.length} {items.length === 1 ? 'item' : 'items'})
          </span>
        </div>
        <span className="font-bold text-primary">
          {BANGLADESHI_CURRENCY_SYMBOL}{total.toLocaleString()}
        </span>
      </div>

      {/* Cart Items */}
      <ScrollArea className="flex-1">
        <div className="divide-y">
          {items.map((item) => (
            <div
              key={item.id}
              className={cn(
                "p-3 sm:p-4 bg-card hover:bg-muted/30 transition-colors",
                "group"
              )}
            >
              <div className="flex items-start gap-3">
                {/* Item Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm sm:text-base truncate">
                    {item.name}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">
                    {item.details}
                  </p>
                  <p className="text-sm font-semibold text-primary mt-1">
                    {BANGLADESHI_CURRENCY_SYMBOL}{item.price.toLocaleString()}
                    {item.quantity > 1 && (
                      <span className="text-xs text-muted-foreground ml-1">
                        × {item.quantity} = {BANGLADESHI_CURRENCY_SYMBOL}{(item.price * item.quantity).toLocaleString()}
                      </span>
                    )}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 sm:gap-2">
                  {/* Edit Button (for LPG to change cylinder type etc) */}
                  {onEditItem && item.type === 'lpg' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEditItem(item)}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                  )}

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onUpdateQuantity(item.id, -1)}
                      disabled={item.quantity <= 1}
                      className="h-8 w-8 sm:h-9 sm:w-9 hover:bg-background"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-8 text-center font-semibold text-sm">
                      {item.quantity}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onUpdateQuantity(item.id, 1)}
                      className="h-8 w-8 sm:h-9 sm:w-9 hover:bg-background"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Delete */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveItem(item.id)}
                    className="h-8 w-8 sm:h-9 sm:w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
