import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
import { Package, Flame, Gauge, AlertTriangle } from "lucide-react";

export interface ProductCardData {
  id: string;
  type: 'lpg' | 'stove' | 'regulator';
  name: string;
  subtitle: string;
  price: number;
  stock: number;
  color?: string;
  weight?: string;
  brandId?: string;
  cylinderType?: 'refill' | 'package';
  stoveId?: string;
  regulatorId?: string;
  burners?: number;
  regulatorType?: string;
}

interface POSProductCardProps {
  product: ProductCardData;
  onQuickAdd: (product: ProductCardData) => void;
  isSelected?: boolean;
}

const getProductIcon = (type: 'lpg' | 'stove' | 'regulator') => {
  switch (type) {
    case 'lpg':
      return Flame;
    case 'stove':
      return Package;
    case 'regulator':
      return Gauge;
    default:
      return Package;
  }
};

export const POSProductCard = memo(({ product, onQuickAdd, isSelected }: POSProductCardProps) => {
  const Icon = getProductIcon(product.type);
  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;

  return (
    <button
      onClick={() => !isOutOfStock && onQuickAdd(product)}
      disabled={isOutOfStock}
      className={cn(
        "relative flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl transition-all duration-200 min-h-[100px] sm:min-h-[120px] text-center touch-manipulation",
        "border-2 bg-card hover:shadow-lg active:scale-[0.98]",
        isSelected 
          ? "border-primary ring-2 ring-primary/20 bg-primary/5" 
          : "border-border hover:border-primary/50",
        isOutOfStock && "opacity-50 cursor-not-allowed bg-muted",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      )}
      style={{
        borderLeftColor: product.color || undefined,
        borderLeftWidth: product.color ? '4px' : undefined,
      }}
    >
      {/* Stock Badge */}
      {isLowStock && !isOutOfStock && (
        <Badge 
          variant="destructive" 
          className="absolute -top-1 -right-1 text-[10px] px-1.5 py-0 h-5 flex items-center gap-0.5"
        >
          <AlertTriangle className="h-2.5 w-2.5" />
          {product.stock}
        </Badge>
      )}
      
      {isOutOfStock && (
        <Badge 
          variant="destructive" 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs"
        >
          Out of Stock
        </Badge>
      )}

      {/* Icon */}
      <div 
        className={cn(
          "w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mb-2",
          "bg-primary/10"
        )}
        style={{
          backgroundColor: product.color ? `${product.color}20` : undefined,
        }}
      >
        <Icon 
          className="h-5 w-5 sm:h-6 sm:w-6"
          style={{ color: product.color || 'hsl(var(--primary))' }}
        />
      </div>

      {/* Product Name */}
      <span className="font-semibold text-xs sm:text-sm line-clamp-1 text-foreground">
        {product.name}
      </span>

      {/* Subtitle (weight/burners/type) */}
      <span className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1">
        {product.subtitle}
      </span>

      {/* Price */}
      <span className="font-bold text-sm sm:text-base text-primary mt-1">
        {BANGLADESHI_CURRENCY_SYMBOL}{product.price.toLocaleString()}
      </span>
    </button>
  );
});

POSProductCard.displayName = "POSProductCard";
