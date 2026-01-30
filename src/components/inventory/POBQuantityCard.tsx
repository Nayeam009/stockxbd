import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Minus, CircleDot, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface ValveSizeQuantityCardProps {
  value: number;
  onChange: (value: number) => void;
  valveSize: '22mm' | '20mm';
  stockLabel?: string;
}

export const ValveSizeQuantityCard = ({ 
  value, 
  onChange, 
  valveSize, 
  stockLabel 
}: ValveSizeQuantityCardProps) => {
  const is22mm = valveSize === '22mm';
  
  return (
    <Card className={cn(
      "overflow-hidden border-2",
      is22mm ? "border-primary/30" : "border-amber-500/30"
    )}>
      <div className={cn(
        "p-2 text-center border-b",
        is22mm 
          ? "border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5" 
          : "border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-amber-500/5"
      )}>
        <div className={cn(
          "inline-flex items-center justify-center px-2.5 py-1 rounded-full text-white",
          is22mm ? "bg-primary" : "bg-amber-500"
        )}>
          <CircleDot className="h-3 w-3 mr-1" />
          <span className="text-xs font-bold">{valveSize}</span>
        </div>
        {stockLabel && (
          <p className="text-[10px] font-medium text-muted-foreground mt-1">
            Stock: <span className={cn("font-bold", is22mm ? "text-primary" : "text-amber-500")}>{stockLabel}</span>
          </p>
        )}
      </div>
      <CardContent className="p-2 space-y-1.5">
        <Input
          type="number"
          inputMode="numeric"
          value={value || ""}
          onChange={(e) => onChange(Math.max(0, parseInt(e.target.value) || 0))}
          className={cn(
            "w-full h-12 text-center text-xl font-extrabold border-2",
            is22mm ? "border-primary/30 text-primary" : "border-amber-500/30 text-amber-500"
          )}
          placeholder="0"
        />
        <div className="grid grid-cols-2 gap-1.5">
          <Button 
            type="button" 
            variant="outline" 
            className="h-10 font-bold text-xs" 
            onClick={() => onChange(Math.max(0, value - 10))}
          >
            <Minus className="h-3 w-3 mr-1" />10
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            className="h-10 font-bold text-xs" 
            onClick={() => onChange(value + 10)}
          >
            <Plus className="h-3 w-3 mr-1" />10
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

interface BurnerTypeQuantityCardProps {
  value: number;
  onChange: (value: number) => void;
  burnerType: 'single' | 'double';
  stockLabel?: string;
}

export const BurnerTypeQuantityCard = ({ 
  value, 
  onChange, 
  burnerType, 
  stockLabel 
}: BurnerTypeQuantityCardProps) => {
  const isSingle = burnerType === 'single';
  const label = isSingle ? 'Single' : 'Double';
  
  return (
    <Card className={cn(
      "overflow-hidden border-2",
      isSingle ? "border-amber-500/40" : "border-orange-500/40"
    )}>
      <div className={cn(
        "p-2 text-center border-b",
        isSingle 
          ? "border-amber-500/40 bg-gradient-to-br from-amber-500/10 to-amber-500/5" 
          : "border-orange-500/40 bg-gradient-to-br from-orange-500/10 to-orange-500/5"
      )}>
        <div className={cn(
          "inline-flex items-center justify-center px-2.5 py-1 rounded-full text-white",
          isSingle ? "bg-amber-500" : "bg-orange-500"
        )}>
          <Flame className="h-3 w-3 mr-1" />
          <span className="text-xs font-bold">{label}</span>
        </div>
        {stockLabel && (
          <p className="text-[10px] font-medium text-muted-foreground mt-1">
            Stock: <span className={cn("font-bold", isSingle ? "text-amber-500" : "text-orange-500")}>{stockLabel}</span>
          </p>
        )}
      </div>
      <CardContent className="p-2 space-y-1.5">
        <Input
          type="number"
          inputMode="numeric"
          value={value || ""}
          onChange={(e) => onChange(Math.max(0, parseInt(e.target.value) || 0))}
          className={cn(
            "w-full h-12 text-center text-xl font-extrabold border-2",
            isSingle ? "border-amber-500/40 text-amber-500" : "border-orange-500/40 text-orange-500"
          )}
          placeholder="0"
        />
        <div className="grid grid-cols-2 gap-1.5">
          <Button 
            type="button" 
            variant="outline" 
            className="h-10 font-bold text-xs" 
            onClick={() => onChange(Math.max(0, value - 5))}
          >
            <Minus className="h-3 w-3 mr-1" />5
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            className="h-10 font-bold text-xs" 
            onClick={() => onChange(value + 5)}
          >
            <Plus className="h-3 w-3 mr-1" />5
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
