import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Building, Truck, Store } from 'lucide-react';
import { EditablePriceCell } from './EditablePriceCell';
import type { ProductPrice } from '@/hooks/useProductPricingData';

interface PriceSectionProps {
  type: 'Refill' | 'Package';
  product: ProductPrice;
  editedPrices: Record<string, Partial<ProductPrice>>;
  onPriceChange: (id: string, field: string, value: number) => void;
  onDelete: (id: string) => void;
  getValue: (product: ProductPrice, field: keyof ProductPrice) => number;
}

export const PriceSection = ({
  type,
  product,
  editedPrices,
  onPriceChange,
  onDelete,
  getValue
}: PriceSectionProps) => {
  const isRefill = type === 'Refill';
  const badgeClass = isRefill 
    ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
    : "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300";

  // Calculate profit margin
  const companyPrice = getValue(product, 'company_price');
  const retailPrice = getValue(product, 'retail_price');
  const margin = retailPrice - companyPrice;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge className={`${badgeClass} text-xs px-3 py-1 font-medium`}>
            {type === 'Package' ? 'Package (New)' : type}
          </Badge>
          {margin > 0 && (
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
              +৳{margin} profit
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive/60 hover:text-destructive hover:bg-destructive/10"
          onClick={() => onDelete(product.id)}
          aria-label={`Delete ${type} pricing`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      
      <div className="grid grid-cols-3 gap-3">
        <EditablePriceCell
          productId={product.id}
          field="company_price"
          value={getValue(product, 'company_price')}
          label="Company"
          icon={Building}
          colorClass="bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30"
          isModified={editedPrices[product.id]?.company_price !== undefined}
          onValueChange={onPriceChange}
        />
        <EditablePriceCell
          productId={product.id}
          field="distributor_price"
          value={getValue(product, 'distributor_price')}
          label="Wholesale"
          icon={Truck}
          colorClass="bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30"
          isModified={editedPrices[product.id]?.distributor_price !== undefined}
          onValueChange={onPriceChange}
          customerType="wholesale"
        />
        <EditablePriceCell
          productId={product.id}
          field="retail_price"
          value={getValue(product, 'retail_price')}
          label="Retail"
          icon={Store}
          colorClass="bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30"
          isModified={editedPrices[product.id]?.retail_price !== undefined}
          onValueChange={onPriceChange}
          customerType="retail"
        />
      </div>
    </div>
  );
};
