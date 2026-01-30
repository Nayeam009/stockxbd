import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Cylinder, ChefHat, Gauge } from "lucide-react";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
import type { POBCartItem } from "@/hooks/usePOBCart";

interface POBCartItemCardProps {
  item: POBCartItem;
  onRemove: (id: string) => void;
}

export const POBCartItemCard = ({ item, onRemove }: POBCartItemCardProps) => {
  const getBorderColor = () => {
    if (item.brandColor) return item.brandColor;
    if (item.type === 'stove') return 'hsl(var(--warning))';
    if (item.type === 'regulator') return 'hsl(210, 100%, 50%)';
    return 'hsl(var(--primary))';
  };

  const getIcon = () => {
    if (item.type === 'lpg') {
      return <Cylinder className="h-5 w-5" style={{ color: item.brandColor || 'hsl(var(--primary))' }} />;
    }
    if (item.type === 'stove') {
      return <ChefHat className="h-5 w-5 text-amber-500" />;
    }
    return <Gauge className="h-5 w-5 text-blue-500" />;
  };

  return (
    <Card 
      className="overflow-hidden border" 
      style={{ borderLeftWidth: '4px', borderLeftColor: getBorderColor() }}
    >
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-muted flex-shrink-0">
            {getIcon()}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{item.name}</p>
            <p className="text-xs text-muted-foreground truncate">{item.details}</p>
            <p className="text-xs font-medium text-primary">
              {item.quantity} × {BANGLADESHI_CURRENCY_SYMBOL}{item.companyPrice.toLocaleString()}
            </p>
          </div>
        </div>
        <div className="text-right flex-shrink-0 ml-2">
          <p className="font-bold tabular-nums">
            {BANGLADESHI_CURRENCY_SYMBOL}{(item.quantity * item.companyPrice).toLocaleString()}
          </p>
          <Button 
            type="button" 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-destructive mt-1" 
            onClick={() => onRemove(item.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
