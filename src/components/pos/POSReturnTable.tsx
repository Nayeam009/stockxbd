import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeftRight, Plus, Minus, X, Cylinder } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReturnItem } from "@/hooks/usePOSCart";

interface POSReturnTableProps {
  items: ReturnItem[];
  itemsCount: number;
  refillCylindersCount: number;
  hasRefillInCart: boolean;
  isReturnCountMatched: boolean;
  isActive: boolean;
  onActivate: () => void;
  onUpdateQuantity: (id: string, change: number) => void;
  onRemove: (id: string) => void;
  onToggleLeaked: (id: string) => void;
}

export const POSReturnTable = ({
  items,
  itemsCount,
  refillCylindersCount,
  hasRefillInCart,
  isReturnCountMatched,
  isActive,
  onActivate,
  onUpdateQuantity,
  onRemove,
  onToggleLeaked
}: POSReturnTableProps) => {
  return (
    <Card className={cn(
      "border-2",
      hasRefillInCart && !isReturnCountMatched
        ? "border-destructive/50 dark:border-destructive/30"
        : "border-amber-200 dark:border-amber-900",
      !isActive && "hidden lg:block"
    )}>
      <CardHeader
        className={cn(
          "py-2 px-3 cursor-pointer",
          hasRefillInCart && !isReturnCountMatched
            ? "bg-destructive/10"
            : "bg-amber-50 dark:bg-amber-950/30"
        )}
        onClick={onActivate}
      >
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <ArrowLeftRight className={cn(
              "h-4 w-4",
              hasRefillInCart && !isReturnCountMatched
                ? "text-destructive"
                : "text-amber-600"
            )} />
            Return Cylinder
          </span>
          <Badge className={hasRefillInCart && !isReturnCountMatched ? "bg-destructive" : "bg-amber-500"}>
            {itemsCount}
          </Badge>
        </CardTitle>
        {hasRefillInCart && !isReturnCountMatched && (
          <p className="text-[10px] text-destructive">⚠ Must return {refillCylindersCount} cylinder(s)</p>
        )}
      </CardHeader>
      <CardContent className="p-2">
        <ScrollArea className="h-[140px] sm:h-[160px]">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-6">
              <ArrowLeftRight className="h-8 w-8 opacity-30 mb-2" />
              <p className="text-xs">
                {hasRefillInCart ? 'Select return cylinders below' : 'Return applies to Refill sales'}
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {items.map(item => (
                <div key={item.id} className="flex items-center gap-2 p-2 rounded-lg bg-card border">
                  <div
                    className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: item.brandColor }}
                  >
                    <Cylinder className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs truncate">{item.brandName}</p>
                    <div className="flex items-center gap-1">
                      <Checkbox
                        checked={item.isLeaked}
                        onCheckedChange={() => onToggleLeaked(item.id)}
                        className="h-3 w-3"
                      />
                      <span className={cn(
                        "text-[9px]",
                        item.isLeaked ? "text-rose-600 font-medium" : "text-muted-foreground"
                      )}>
                        {item.isLeaked ? "Leaked ⚠" : "Leaked?"}
                      </span>
                    </div>
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
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 min-w-[28px] text-destructive hover:bg-destructive/10 flex-shrink-0"
                    onClick={() => onRemove(item.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
