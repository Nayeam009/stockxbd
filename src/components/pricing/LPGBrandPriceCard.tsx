import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { PriceSection } from './PriceSection';
import { getLpgColorByValveSize } from '@/lib/brandConstants';
import type { GroupedBrand, ProductPrice } from '@/hooks/useProductPricingData';

interface LPGBrandPriceCardProps {
  brand: GroupedBrand;
  refillProduct: ProductPrice | null;
  packageProduct: ProductPrice | null;
  editedPrices: Record<string, Partial<ProductPrice>>;
  onPriceChange: (id: string, field: string, value: number) => void;
  onDelete: (id: string) => void;
  getValue: (product: ProductPrice, field: keyof ProductPrice) => number;
  valveSize: '22mm' | '20mm';
  selectedWeight: string;
}

export const LPGBrandPriceCard = ({
  brand,
  refillProduct,
  packageProduct,
  editedPrices,
  onPriceChange,
  onDelete,
  getValue,
  valveSize,
  selectedWeight
}: LPGBrandPriceCardProps) => {
  const brandColor = getLpgColorByValveSize(brand.name, valveSize);

  // Calculate total potential profit
  const refillMargin = refillProduct 
    ? getValue(refillProduct, 'retail_price') - getValue(refillProduct, 'company_price')
    : 0;
  const packageMargin = packageProduct
    ? getValue(packageProduct, 'retail_price') - getValue(packageProduct, 'company_price')
    : 0;

  // Empty state - no pricing set
  if (!refillProduct && !packageProduct) {
    return (
      <Card className="border-dashed border-2 opacity-70 hover:opacity-100 transition-opacity">
        <CardHeader className="pb-3 px-4 pt-4">
          <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
            <span
              className="h-4 w-4 rounded-full flex-shrink-0 ring-2 ring-offset-2 ring-offset-background"
              style={{ backgroundColor: brandColor }}
            />
            <span className="truncate">{brand.name}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span>No pricing set for {selectedWeight}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border hover:shadow-lg transition-all duration-200">
      {/* Header */}
      <CardHeader className="pb-3 px-4 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2.5 text-base sm:text-lg font-semibold">
            <span
              className="h-5 w-5 rounded-full flex-shrink-0 ring-2 ring-offset-2 ring-offset-background shadow-sm"
              style={{ 
                backgroundColor: brandColor,
                boxShadow: `0 0 10px ${brandColor}50`
              }}
              title={`${brand.name} (${valveSize})`}
            />
            <span className="truncate">{brand.name}</span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs px-2.5 py-0.5 font-medium">
              {selectedWeight}
            </Badge>
            <Badge variant="outline" className="text-[10px] px-2 py-0.5">
              {valveSize}
            </Badge>
          </div>
        </div>
        
        {/* Profit summary */}
        {(refillMargin > 0 || packageMargin > 0) && (
          <div className="flex gap-3 mt-2 text-xs">
            {refillMargin > 0 && (
              <span className="text-emerald-600 dark:text-emerald-400">
                Refill: +৳{refillMargin}
              </span>
            )}
            {packageMargin > 0 && (
              <span className="text-blue-600 dark:text-blue-400">
                Package: +৳{packageMargin}
              </span>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-5 px-4 pb-4">
        {/* Refill Section */}
        {refillProduct && (
          <PriceSection
            type="Refill"
            product={refillProduct}
            editedPrices={editedPrices}
            onPriceChange={onPriceChange}
            onDelete={onDelete}
            getValue={getValue}
          />
        )}

        {/* Package Section */}
        {packageProduct && (
          <PriceSection
            type="Package"
            product={packageProduct}
            editedPrices={editedPrices}
            onPriceChange={onPriceChange}
            onDelete={onDelete}
            getValue={getValue}
          />
        )}
      </CardContent>
    </Card>
  );
};
