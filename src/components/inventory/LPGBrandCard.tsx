import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Package, AlertTriangle } from "lucide-react";
import { getLpgColorByValveSize } from "@/lib/brandConstants";
import type { LPGBrand } from "@/hooks/useInventoryData";
import { cn } from "@/lib/utils";

interface LPGBrandCardProps {
  brand: LPGBrand;
  selectedWeight: string;
  onUpdate: (id: string, field: string, value: number) => void;
  onDelete: (id: string) => void;
}

// Status helper
const getLpgStatus = (brand: LPGBrand) => {
  const total = brand.package_cylinder + brand.refill_cylinder;
  if (total === 0) return { label: "Out of Stock", color: "bg-red-500" };
  if (total < 10) return { label: "Low Stock", color: "bg-yellow-500" };
  return { label: "In Stock", color: "bg-green-500" };
};

// Editable Stock Cell Component
interface EditableStockCellProps {
  value: number;
  itemId: string;
  field: string;
  label: string;
  bgColor?: string;
  onUpdate: (id: string, field: string, value: number) => void;
}

const EditableStockCell = ({ 
  value, 
  itemId, 
  field, 
  label, 
  bgColor = "bg-muted", 
  onUpdate 
}: EditableStockCellProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => { 
    setLocalValue(value); 
  }, [value]);

  const handleSave = () => {
    onUpdate(itemId, field, localValue);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-[10px] sm:text-xs text-muted-foreground">{label}</span>
        <Input
          type="number"
          value={localValue}
          onChange={(e) => setLocalValue(parseInt(e.target.value) || 0)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") { setIsEditing(false); setLocalValue(value); }
          }}
          className="h-10 w-full text-center font-medium"
          autoFocus
          min={0}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] sm:text-xs text-muted-foreground">{label}</span>
      <div
        onClick={() => setIsEditing(true)}
        className={cn(
          "px-2 sm:px-3 py-2 rounded-md cursor-pointer transition-all text-center font-medium text-sm sm:text-base hover:opacity-80",
          bgColor
        )}
      >
        {value}
      </div>
    </div>
  );
};

export const LPGBrandCard = ({ brand, selectedWeight, onUpdate, onDelete }: LPGBrandCardProps) => {
  const status = getLpgStatus(brand);
  const brandColor = getLpgColorByValveSize(brand.name, brand.size as "22mm" | "20mm");
  
  return (
    <Card className="border-border hover:shadow-md transition-shadow">
      <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-4 pt-3 sm:pt-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <span 
              className="h-4 w-4 sm:h-5 sm:w-5 rounded-full flex-shrink-0 ring-2 ring-offset-1 ring-offset-background shadow-sm" 
              style={{ backgroundColor: brandColor, boxShadow: `0 0 8px ${brandColor}40` }}
              title={`${brand.name} (${brand.size})`}
            />
            <span className="truncate">{brand.name}</span>
          </CardTitle>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Badge className={cn(status.color, "text-white text-[10px] sm:text-xs border-0")}>
              {status.label}
            </Badge>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" 
              onClick={() => onDelete(brand.id)} 
              aria-label={`Delete ${brand.name} brand`}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </div>
        </div>
        <div className="flex gap-1.5 mt-1">
          <Badge variant="outline" className="text-[10px] sm:text-xs">{selectedWeight}</Badge>
          <Badge variant="secondary" className="text-[10px] sm:text-xs">{brand.size}</Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-2 px-3 sm:px-4 pb-3 sm:pb-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <EditableStockCell 
            value={brand.package_cylinder} 
            itemId={brand.id} 
            field="package_cylinder" 
            label="Package" 
            bgColor="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" 
            onUpdate={onUpdate} 
          />
          <EditableStockCell 
            value={brand.refill_cylinder} 
            itemId={brand.id} 
            field="refill_cylinder" 
            label="Refill" 
            bgColor="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" 
            onUpdate={onUpdate} 
          />
          <EditableStockCell 
            value={brand.empty_cylinder} 
            itemId={brand.id} 
            field="empty_cylinder" 
            label="Empty" 
            bgColor="bg-gray-100 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300" 
            onUpdate={onUpdate} 
          />
          <EditableStockCell 
            value={brand.problem_cylinder} 
            itemId={brand.id} 
            field="problem_cylinder" 
            label="Problem" 
            bgColor="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" 
            onUpdate={onUpdate} 
          />
        </div>
        
        {(brand.in_transit_cylinder || 0) > 0 && (
          <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-md text-amber-700 dark:text-amber-400 text-xs">
            <Package className="h-3.5 w-3.5" />
            <span>In Transit: {brand.in_transit_cylinder}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
