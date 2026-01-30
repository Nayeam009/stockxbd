import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Flame, AlertTriangle } from "lucide-react";
import type { Stove } from "@/hooks/useInventoryData";
import { cn } from "@/lib/utils";

interface StoveCardProps {
  stove: Stove;
  onUpdate: (id: string, value: number) => void;
  onDelete: (id: string) => void;
}

const getStockStatus = (quantity: number) => {
  if (quantity === 0) return { label: "Out of Stock", bgClass: "bg-destructive/10 text-destructive" };
  if (quantity < 10) return { label: "Low Stock", bgClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400" };
  return { label: "In Stock", bgClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" };
};

export const StoveCard = ({ stove, onUpdate, onDelete }: StoveCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(stove.quantity);
  const status = getStockStatus(stove.quantity);

  useEffect(() => { 
    setLocalValue(stove.quantity); 
  }, [stove.quantity]);

  const handleSave = () => {
    onUpdate(stove.id, localValue);
    setIsEditing(false);
  };

  return (
    <Card className={cn(
      "border-border hover:shadow-md transition-shadow",
      stove.is_damaged && "border-destructive/50 bg-destructive/5"
    )}>
      <CardHeader className="pb-2 px-3 sm:px-4 pt-3 sm:pt-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <div className="h-8 w-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <Flame className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="min-w-0">
              <span className="block truncate font-semibold">{stove.brand}</span>
              <Badge variant="outline" className="text-[10px] mt-0.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400">
                Model: {stove.model}
              </Badge>
            </div>
          </CardTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" 
            onClick={() => onDelete(stove.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="text-[10px]">
            {stove.burners === 1 ? "Single" : "Double"} Burner
          </Badge>
          <Badge className={cn("text-[10px]", status.bgClass)}>
            {status.label}
          </Badge>
          {stove.is_damaged && (
            <Badge variant="destructive" className="text-[10px]">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Damaged
            </Badge>
          )}
        </div>
        
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-muted-foreground">Quantity:</span>
          {isEditing ? (
            <Input
              type="number"
              value={localValue}
              onChange={(e) => setLocalValue(parseInt(e.target.value) || 0)}
              onBlur={handleSave}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") { setIsEditing(false); setLocalValue(stove.quantity); }
              }}
              className="h-8 w-20 text-center font-medium"
              autoFocus
              min={0}
            />
          ) : (
            <div
              onClick={() => setIsEditing(true)}
              className="px-3 py-1.5 bg-muted rounded-md cursor-pointer hover:bg-muted/80 transition-colors font-semibold text-sm min-w-[60px] text-center"
            >
              {stove.quantity}
            </div>
          )}
        </div>
        
        {stove.warranty_months && stove.warranty_months > 0 && (
          <p className="text-[10px] text-muted-foreground">
            Warranty: {stove.warranty_months} months
          </p>
        )}
      </CardContent>
    </Card>
  );
};
