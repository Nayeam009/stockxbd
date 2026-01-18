import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
import { Plus, Minus, Check } from "lucide-react";
import { CartItem } from "./POSQuickCart";

interface LPGBrand {
  id: string;
  name: string;
  weight: string;
  size: string;
  refill_cylinder: number;
  package_cylinder: number;
  empty_cylinder: number;
}

interface POSEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: CartItem | null;
  lpgBrands: LPGBrand[];
  onUpdate: (updatedItem: CartItem) => void;
  getPrice: (brandId: string, cylinderType: 'refill' | 'package', saleType: 'retail' | 'wholesale') => number;
}

export const POSEditSheet = ({
  open,
  onOpenChange,
  item,
  lpgBrands,
  onUpdate,
  getPrice,
}: POSEditSheetProps) => {
  const [cylinderType, setCylinderType] = useState<'refill' | 'package'>('refill');
  const [saleType, setSaleType] = useState<'retail' | 'wholesale'>('retail');
  const [returnBrandId, setReturnBrandId] = useState<string>('none');
  const [price, setPrice] = useState(0);
  const [quantity, setQuantity] = useState(1);

  // Initialize form when item changes
  useEffect(() => {
    if (item) {
      setCylinderType(item.cylinderType || 'refill');
      setReturnBrandId(item.returnBrandId || 'none');
      setPrice(item.price);
      setQuantity(item.quantity);
      
      // Determine sale type from price
      if (item.brandId) {
        const retailPrice = getPrice(item.brandId, item.cylinderType || 'refill', 'retail');
        const wholesalePrice = getPrice(item.brandId, item.cylinderType || 'refill', 'wholesale');
        setSaleType(item.price === wholesalePrice ? 'wholesale' : 'retail');
      }
    }
  }, [item, getPrice]);

  // Update price when options change
  useEffect(() => {
    if (item?.brandId) {
      const newPrice = getPrice(item.brandId, cylinderType, saleType);
      if (newPrice > 0) {
        setPrice(newPrice);
      }
    }
  }, [item?.brandId, cylinderType, saleType, getPrice]);

  const handleSave = () => {
    if (!item) return;

    const brand = lpgBrands.find(b => b.id === item.brandId);
    const returnBrand = returnBrandId !== 'none' ? lpgBrands.find(b => b.id === returnBrandId) : undefined;

    const updatedItem: CartItem = {
      ...item,
      name: `${brand?.name || item.name} - ${cylinderType === 'refill' ? 'Refill' : 'Package'}`,
      details: `${brand?.weight || ''}, ${saleType}${returnBrand ? `, Return: ${returnBrand.name}` : ''}`,
      price,
      quantity,
      cylinderType,
      returnBrand: returnBrand?.name,
      returnBrandId: returnBrand?.id,
    };

    onUpdate(updatedItem);
    onOpenChange(false);
  };

  if (!item) return null;

  const brand = lpgBrands.find(b => b.id === item.brandId);
  const availableStock = cylinderType === 'refill' 
    ? brand?.refill_cylinder || 0 
    : brand?.package_cylinder || 0;

  // Filter return brands to same size
  const compatibleReturnBrands = lpgBrands.filter(b => b.size === brand?.size);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[85vh] rounded-t-2xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-lg">
            Edit: {brand?.name} {brand?.weight}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5 pb-4">
          {/* Cylinder Type */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Cylinder Type</Label>
            <RadioGroup
              value={cylinderType}
              onValueChange={(v) => setCylinderType(v as 'refill' | 'package')}
              className="flex gap-3"
            >
              <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${cylinderType === 'refill' ? 'border-primary bg-primary/5' : 'border-muted'}`}>
                <RadioGroupItem value="refill" id="edit-refill" />
                <span className="font-medium">Refill</span>
                <span className="text-xs text-muted-foreground">({brand?.refill_cylinder || 0})</span>
              </label>
              <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${cylinderType === 'package' ? 'border-primary bg-primary/5' : 'border-muted'}`}>
                <RadioGroupItem value="package" id="edit-package" />
                <span className="font-medium">Package</span>
                <span className="text-xs text-muted-foreground">({brand?.package_cylinder || 0})</span>
              </label>
            </RadioGroup>
          </div>

          {/* Sale Type */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Sale Type</Label>
            <RadioGroup
              value={saleType}
              onValueChange={(v) => setSaleType(v as 'retail' | 'wholesale')}
              className="flex gap-3"
            >
              <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${saleType === 'retail' ? 'border-primary bg-primary/5' : 'border-muted'}`}>
                <RadioGroupItem value="retail" id="edit-retail" />
                <span className="font-medium">Retail</span>
              </label>
              <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${saleType === 'wholesale' ? 'border-primary bg-primary/5' : 'border-muted'}`}>
                <RadioGroupItem value="wholesale" id="edit-wholesale" />
                <span className="font-medium">Wholesale</span>
              </label>
            </RadioGroup>
          </div>

          {/* Return Cylinder (only for refill) */}
          {cylinderType === 'refill' && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Return Cylinder</Label>
              <Select value={returnBrandId} onValueChange={setReturnBrandId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select return brand" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No return</SelectItem>
                  {compatibleReturnBrands.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} ({b.weight})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Price */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Price</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {BANGLADESHI_CURRENCY_SYMBOL}
              </span>
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                className="pl-8 text-lg font-semibold"
              />
            </div>
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Quantity</Label>
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className="h-12 w-12"
              >
                <Minus className="h-5 w-5" />
              </Button>
              <span className="text-2xl font-bold w-16 text-center">{quantity}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(quantity + 1)}
                disabled={quantity >= availableStock}
                className="h-12 w-12"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>
            {quantity >= availableStock && (
              <p className="text-xs text-destructive text-center">Max stock reached</p>
            )}
          </div>

          {/* Total */}
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">Item Total</p>
            <p className="text-2xl font-bold text-primary">
              {BANGLADESHI_CURRENCY_SYMBOL}{(price * quantity).toLocaleString()}
            </p>
          </div>
        </div>

        <SheetFooter className="pt-2">
          <Button onClick={handleSave} className="w-full h-12" size="lg">
            <Check className="h-5 w-5 mr-2" />
            Update Item
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
