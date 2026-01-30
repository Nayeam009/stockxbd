import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Gauge, AlertTriangle } from "lucide-react";
import type { Regulator } from "@/hooks/useInventoryData";
import { cn } from "@/lib/utils";

interface RegulatorCardProps {
  regulator: Regulator;
  onUpdate: (id: string, value: number) => void;
  onDelete: (id: string) => void;
}

const getStockStatus = (quantity: number) => {
  if (quantity === 0) return { label: "Out of Stock", bgClass: "bg-destructive/10 text-destructive" };
  if (quantity < 10) return { label: "Low Stock", bgClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400" };
  return { label: "In Stock", bgClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" };
};

export const RegulatorCard = ({ regulator, onUpdate, onDelete }: RegulatorCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(regulator.quantity);
  const status = getStockStatus(regulator.quantity);

  useEffect(() => { 
    setLocalValue(regulator.quantity); 
  }, [regulator.quantity]);

  const handleSave = () => {
    onUpdate(regulator.id, localValue);
    setIsEditing(false);
  };

  return (
    <Card className={cn(
      "border-border hover:shadow-md transition-shadow",
      regulator.is_defective && "border-destructive/50 bg-destructive/5"
    )}>
      <CardHeader className="pb-2 px-3 sm:px-4 pt-3 sm:pt-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <div className="h-8 w-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              <Gauge className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <span className="truncate font-semibold">{regulator.brand}</span>
          </CardTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" 
            onClick={() => onDelete(regulator.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="text-[10px]">
            {regulator.type}
          </Badge>
          <Badge className={cn("text-[10px]", status.bgClass)}>
            {status.label}
          </Badge>
          {regulator.is_defective && (
            <Badge variant="destructive" className="text-[10px]">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Defective
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
                if (e.key === "Escape") { setIsEditing(false); setLocalValue(regulator.quantity); }
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
              {regulator.quantity}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
