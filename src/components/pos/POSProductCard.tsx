import { Badge } from "@/components/ui/badge";
import { Cylinder, ChefHat, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
import type { LPGBrand, Stove, Regulator } from "@/hooks/usePOSData";

// ============= LPG PRODUCT CARD =============
interface LPGCardProps {
  brand: LPGBrand;
  cylinderType: 'refill' | 'package';
  weight: string;
  valveSize?: string;
  price: number;
  pendingStock: number;
  pendingReturns?: number;
  pendingProblem?: number;
  isSaleMode: boolean;
  onClick: () => void;
}

export const LPGProductCard = ({
  brand,
  cylinderType,
  weight,
  valveSize,
  price,
  pendingStock,
  pendingReturns = 0,
  pendingProblem = 0,
  isSaleMode,
  onClick
}: LPGCardProps) => {
  const baseStock = cylinderType === 'refill' ? brand.refill_cylinder : brand.package_cylinder;
  const displayStock = Math.max(0, baseStock - pendingStock);
  const isOutOfStock = displayStock <= 0;
  const previewEmpty = brand.empty_cylinder + pendingReturns;

  return (
    <button
      onClick={onClick}
      disabled={isSaleMode && isOutOfStock}
      className={cn(
        "relative p-2.5 rounded-lg text-left transition-all",
        "hover:shadow-md active:scale-[0.98]",
        "min-h-[88px]", // Touch-friendly
        isSaleMode && isOutOfStock && "opacity-50 cursor-not-allowed",
        isSaleMode
          ? "border border-transparent hover:border-emerald-500/50 bg-card"
          : "border border-transparent hover:border-amber-500/50 bg-card"
      )}
    >
      {/* Brand Color Strip */}
      <div
        className="absolute top-0 left-0 bottom-0 w-1.5 rounded-l-lg"
        style={{ backgroundColor: brand.color }}
      />

      <div className="pl-2">
        {/* Header: Icon + Stock Badge */}
        <div className="flex items-start justify-between gap-1">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm"
            style={{ backgroundColor: brand.color }}
          >
            <Cylinder className="h-4 w-4 text-white" />
          </div>

          {isSaleMode ? (
            <Badge
              variant={displayStock > 5 ? "secondary" : displayStock > 0 ? "outline" : "destructive"}
              className="text-[9px] px-1.5 h-5 font-semibold"
            >
              {displayStock > 0 ? (
                <span className="flex items-center gap-0.5">
                  {displayStock}
                  {pendingStock > 0 && (
                    <span className="text-amber-600 dark:text-amber-400">(-{pendingStock})</span>
                  )}
                </span>
              ) : 'Out'}
            </Badge>
          ) : (
            <Badge
              variant="secondary"
              className="text-[9px] px-1.5 h-5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
            >
              Empty: {previewEmpty}
              {pendingReturns > 0 && (
                <span className="text-emerald-600 dark:text-emerald-400">(+{pendingReturns})</span>
              )}
            </Badge>
          )}
        </div>

        {/* Body: Name + Weight + Valve Size */}
        <div className="mt-1.5">
          <p className="font-semibold text-xs truncate">{brand.name}</p>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span>{weight}</span>
            {valveSize && (
              <Badge variant="outline" className="h-4 px-1 text-[8px] font-medium">
                {valveSize}
              </Badge>
            )}
          </div>
        </div>

        {/* Footer: Price or Return Info */}
        {isSaleMode ? (
          <p className="font-bold text-sm text-emerald-600 mt-1.5 tabular-nums">
            {BANGLADESHI_CURRENCY_SYMBOL}{price.toLocaleString()}
          </p>
        ) : (
          <div className="mt-1.5">
            <p className="text-[10px] text-amber-600 font-medium">Tap to add return</p>
            {pendingProblem > 0 && (
              <p className="text-[9px] text-rose-500">Leaked: +{pendingProblem}</p>
            )}
          </div>
        )}
      </div>
    </button>
  );
};

// ============= STOVE PRODUCT CARD =============
interface StoveCardProps {
  stove: Stove;
  price: number;
  onClick: () => void;
}

export const StoveProductCard = ({ stove, price, onClick }: StoveCardProps) => {
  const isOutOfStock = stove.quantity <= 0;

  return (
    <button
      onClick={onClick}
      disabled={isOutOfStock}
      className={cn(
        "relative p-2.5 rounded-lg text-left transition-all",
        "hover:shadow-md active:scale-[0.98]",
        "min-h-[88px]",
        isOutOfStock && "opacity-50 cursor-not-allowed",
        "border border-transparent hover:border-primary/50 bg-card"
      )}
    >
      {/* Orange Strip for Stoves */}
      <div className="absolute top-0 left-0 bottom-0 w-1.5 rounded-l-lg bg-orange-500" />

      <div className="pl-2">
        <div className="flex items-start justify-between gap-1">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm bg-orange-500">
            <ChefHat className="h-4 w-4 text-white" />
          </div>
          <Badge
            variant={stove.quantity > 3 ? "secondary" : stove.quantity > 0 ? "outline" : "destructive"}
            className="text-[9px] px-1.5 h-5"
          >
            {stove.quantity > 0 ? stove.quantity : 'Out'}
          </Badge>
        </div>

        <div className="mt-1.5">
          <p className="font-semibold text-xs truncate">{stove.brand}</p>
          <p className="text-[10px] text-muted-foreground">{stove.model}</p>
        </div>

        <div className="flex items-center justify-between mt-1.5">
          <p className="font-bold text-sm text-primary tabular-nums">
            {BANGLADESHI_CURRENCY_SYMBOL}{(price || stove.price).toLocaleString()}
          </p>
          <Badge variant="outline" className="text-[8px] px-1 h-4 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            {stove.burners}B
          </Badge>
        </div>
      </div>
    </button>
  );
};

// ============= REGULATOR PRODUCT CARD =============
interface RegulatorCardProps {
  regulator: Regulator;
  price: number;
  onClick: () => void;
}

export const RegulatorProductCard = ({ regulator, price, onClick }: RegulatorCardProps) => {
  const isOutOfStock = regulator.quantity <= 0;

  return (
    <button
      onClick={onClick}
      disabled={isOutOfStock}
      className={cn(
        "relative p-2.5 rounded-lg text-left transition-all",
        "hover:shadow-md active:scale-[0.98]",
        "min-h-[88px]",
        isOutOfStock && "opacity-50 cursor-not-allowed",
        "border border-transparent hover:border-primary/50 bg-card"
      )}
    >
      {/* Blue Strip for Regulators */}
      <div className="absolute top-0 left-0 bottom-0 w-1.5 rounded-l-lg bg-blue-500" />

      <div className="pl-2">
        <div className="flex items-start justify-between gap-1">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm bg-blue-500">
            <Gauge className="h-4 w-4 text-white" />
          </div>
          <Badge
            variant={regulator.quantity > 3 ? "secondary" : regulator.quantity > 0 ? "outline" : "destructive"}
            className="text-[9px] px-1.5 h-5"
          >
            {regulator.quantity > 0 ? regulator.quantity : 'Out'}
          </Badge>
        </div>

        <div className="mt-1.5">
          <p className="font-semibold text-xs truncate">{regulator.brand}</p>
          <p className="text-[10px] text-muted-foreground">{regulator.type}</p>
        </div>

        <p className="font-bold text-sm text-primary mt-1.5 tabular-nums">
          {BANGLADESHI_CURRENCY_SYMBOL}{(price || regulator.price || 0).toLocaleString()}
        </p>
      </div>
    </button>
  );
};

// ============= CUSTOM ADD CARD =============
interface CustomAddCardProps {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}

export const CustomAddCard = ({ label, icon, onClick }: CustomAddCardProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "p-2.5 rounded-lg text-left transition-all",
        "border-2 border-dashed border-muted-foreground/30",
        "hover:border-primary/50 hover:bg-muted/50",
        "min-h-[88px] flex flex-col items-center justify-center gap-2"
      )}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-muted">
        {icon}
      </div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
    </button>
  );
};
