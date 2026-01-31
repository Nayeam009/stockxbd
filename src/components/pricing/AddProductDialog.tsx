import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Calculator, Loader2 } from 'lucide-react';
import { BrandSelect } from '@/components/shared/BrandSelect';
import { calculateDefaultPrices } from '@/lib/brandConstants';
import type { NewProductData, LpgBrand } from '@/hooks/useProductPricingData';
import { WEIGHT_OPTIONS_22MM, WEIGHT_OPTIONS_20MM } from '@/hooks/useProductPricingData';

interface AddProductDialogProps {
  lpgBrands: LpgBrand[];
  onAddProduct: (product: NewProductData) => Promise<boolean>;
}

export const AddProductDialog = ({ lpgBrands, onAddProduct }: AddProductDialogProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [newProduct, setNewProduct] = useState<NewProductData>({
    product_type: "lpg",
    brand_id: "",
    product_name: "",
    size: "12kg",
    variant: "Refill",
    company_price: 0,
    distributor_price: 0,
    retail_price: 0,
    package_price: 0,
  });

  const handleAutoCalculate = () => {
    if (newProduct.company_price <= 0) return;
    
    const variant = newProduct.variant === 'Package' ? 'package' : 'refill';
    const calculated = calculateDefaultPrices(newProduct.company_price, variant);
    
    setNewProduct(prev => ({
      ...prev,
      distributor_price: calculated.wholesale,
      retail_price: calculated.retail,
    }));
  };

  const handleSubmit = async () => {
    if (!newProduct.product_name && newProduct.product_type === 'lpg' && !newProduct.brand_id) {
      return;
    }

    setIsSubmitting(true);
    const success = await onAddProduct(newProduct);
    setIsSubmitting(false);

    if (success) {
      setDialogOpen(false);
      resetForm();
    }
  };

  const resetForm = () => {
    setNewProduct({
      product_type: "lpg",
      brand_id: "",
      product_name: "",
      size: "12kg",
      variant: "Refill",
      company_price: 0,
      distributor_price: 0,
      retail_price: 0,
      package_price: 0,
    });
  };

  const getBrandType = () => {
    switch (newProduct.product_type) {
      case 'lpg': return 'lpg' as const;
      case 'stove': return 'stove' as const;
      case 'regulator': return 'regulator' as const;
      default: return 'lpg' as const;
    }
  };

  const handleBrandChange = (brandName: string) => {
    if (newProduct.product_type === 'lpg') {
      const matchingBrand = lpgBrands.find(b => 
        b.name.toLowerCase() === brandName.toLowerCase()
      );
      
      const productName = `${brandName} ${newProduct.size}`;
      
      setNewProduct(prev => ({
        ...prev,
        brand_id: matchingBrand?.id || "",
        product_name: productName,
      }));
    } else {
      setNewProduct(prev => ({
        ...prev,
        product_name: brandName,
      }));
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 h-11 sm:h-9">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Product</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Product Price</DialogTitle>
          <DialogDescription>
            Set up pricing for a new product. Use auto-calculate for quick setup.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Product Type */}
          <div className="space-y-2">
            <Label>Product Type</Label>
            <Select
              value={newProduct.product_type}
              onValueChange={(value) => {
                setNewProduct(prev => ({ 
                  ...prev, 
                  product_type: value,
                  brand_id: "",
                  product_name: "",
                  variant: value === 'lpg' ? 'Refill' : '',
                }));
              }}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lpg">LPG Cylinder</SelectItem>
                <SelectItem value="stove">Gas Stove</SelectItem>
                <SelectItem value="regulator">Regulator</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Brand Selection */}
          <div className="space-y-2">
            <Label>{newProduct.product_type === 'lpg' ? 'Brand' : 'Product Name'}</Label>
            <BrandSelect
              type={getBrandType()}
              value={newProduct.product_name.split(' ')[0] || ""}
              onChange={handleBrandChange}
              placeholder={`Select ${newProduct.product_type === 'lpg' ? 'brand' : 'product'}`}
            />
          </div>

          {/* LPG-specific fields */}
          {newProduct.product_type === 'lpg' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Weight</Label>
                  <Select
                    value={newProduct.size}
                    onValueChange={(value) => {
                      const brandName = newProduct.product_name.split(' ')[0];
                      setNewProduct(prev => ({
                        ...prev,
                        size: value,
                        product_name: brandName ? `${brandName} ${value}` : '',
                      }));
                    }}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[...WEIGHT_OPTIONS_22MM, ...WEIGHT_OPTIONS_20MM]
                        .filter((w, i, arr) => arr.findIndex(x => x.value === w.value) === i)
                        .map(w => (
                          <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>
                        ))
                      }
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Variant</Label>
                  <Select
                    value={newProduct.variant}
                    onValueChange={(value) => setNewProduct(prev => ({ ...prev, variant: value }))}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Refill">Refill</SelectItem>
                      <SelectItem value="Package">Package (New)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          {/* Stove/Regulator variant */}
          {newProduct.product_type !== 'lpg' && (
            <div className="space-y-2">
              <Label>Variant / Model</Label>
              <Input
                value={newProduct.variant}
                onChange={(e) => setNewProduct(prev => ({ ...prev, variant: e.target.value }))}
                placeholder={newProduct.product_type === 'stove' ? '2 Burner' : '22mm'}
                className="h-11"
              />
            </div>
          )}

          {/* Pricing Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Pricing</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAutoCalculate}
                disabled={newProduct.company_price <= 0}
                className="gap-1.5 h-8"
              >
                <Calculator className="h-3.5 w-3.5" />
                Auto-Calculate
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground">
              {newProduct.variant === 'Refill' 
                ? 'Refill: Company + ৳20 = Wholesale, + ৳30 = Retail'
                : 'Package: Company + ৳50 = Wholesale, + ৳50 = Retail'
              }
            </p>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Company</Label>
                <Input
                  type="number"
                  value={newProduct.company_price || ''}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, company_price: Number(e.target.value) }))}
                  placeholder="0"
                  className="h-11 text-center font-medium"
                  min={0}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Wholesale</Label>
                <Input
                  type="number"
                  value={newProduct.distributor_price || ''}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, distributor_price: Number(e.target.value) }))}
                  placeholder="0"
                  className="h-11 text-center font-medium"
                  min={0}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Retail</Label>
                <Input
                  type="number"
                  value={newProduct.retail_price || ''}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, retail_price: Number(e.target.value) }))}
                  placeholder="0"
                  className="h-11 text-center font-medium"
                  min={0}
                />
              </div>
            </div>

            {/* Package Price (only for Package variant) */}
            {newProduct.variant === 'Package' && (
              <div className="space-y-1.5">
                <Label className="text-xs">Package Price (Full cylinder + deposit)</Label>
                <Input
                  type="number"
                  value={newProduct.package_price || ''}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, package_price: Number(e.target.value) }))}
                  placeholder="0"
                  className="h-11 font-medium"
                  min={0}
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setDialogOpen(false)} className="h-11">
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || (!newProduct.product_name && !newProduct.brand_id)}
            className="h-11 min-w-[100px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              'Add Product'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
