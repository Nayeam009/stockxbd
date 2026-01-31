import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Building, Truck, Store } from 'lucide-react';
import { EditablePriceCell } from './EditablePriceCell';
import type { ProductPrice } from '@/hooks/useProductPricingData';

interface AccessoryPriceCardProps {
  product: ProductPrice;
  editedPrices: Record<string, Partial<ProductPrice>>;
  onPriceChange: (id: string, field: string, value: number) => void;
  onDelete: (id: string) => void;
  getValue: (product: ProductPrice, field: keyof ProductPrice) => number;
}

export const AccessoryPriceCard = ({
  product,
  editedPrices,
  onPriceChange,
  onDelete,
  getValue
}: AccessoryPriceCardProps) => {
  // Keep accessory cards compact; margin is still implicit (Retail - Company)

  return (
    <Card className="border-border hover:shadow-md transition-shadow">
      <CardHeader className="pb-3 px-4 pt-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm sm:text-base truncate flex-1">
            {product.product_name}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive/60 hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
            onClick={() => onDelete(product.id)}
            aria-label={`Delete ${product.product_name}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          {product.size && (
            <Badge variant="secondary" className="text-[10px] sm:text-xs">
              {product.size}
            </Badge>
          )}
          {product.variant && (
            <Badge variant="outline" className="text-[10px] sm:text-xs">
              {product.variant}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="px-4 pb-4">
        <div className="grid grid-cols-3 gap-3">
          <EditablePriceCell
            productId={product.id}
            field="company_price"
            value={getValue(product, 'company_price')}
            label="Company"
            icon={Building}
            colorClass="bg-orange-100 dark:bg-orange-900/30 hover:bg-orange-200 dark:hover:bg-orange-900/40"
            isModified={editedPrices[product.id]?.company_price !== undefined}
            onValueChange={onPriceChange}
          />
          <EditablePriceCell
            productId={product.id}
            field="distributor_price"
            value={getValue(product, 'distributor_price')}
            label="Wholesale"
            icon={Truck}
            colorClass="bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/40"
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
            colorClass="bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/40"
            isModified={editedPrices[product.id]?.retail_price !== undefined}
            onValueChange={onPriceChange}
            customerType="retail"
          />
        </div>
      </CardContent>
    </Card>
  );
};
