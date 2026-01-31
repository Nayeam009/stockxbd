
# Product Pricing Module - Complete Rebuild Plan

## Current State Analysis

The existing `ProductPricingModule.tsx` is a **1,328-line monolithic component** with several issues that need to be addressed for proper optimization, design, and integration with other modules.

### Current Architecture
- **Single file**: All logic in one 1,328-line component
- **Basic resilient loading**: Has `initialLoading` and `softLoading` states (from previous work)
- **3 product tabs**: LPG, Stoves, Regulators
- **Inline editing**: Click-to-edit price cells
- **Brand grouping**: Groups similar brand names using normalization

### Issues Found

| # | Issue | Impact |
|---|-------|--------|
| 1 | **Monolithic component** (1,328 lines) | Hard to maintain, slow initial render |
| 2 | **No dedicated hook for pricing data** | State management scattered in component |
| 3 | **Duplicate EditablePriceCell rendering** | 6 inline implementations for each cell type |
| 4 | **No connection to Business Diary** | Price changes not logged as events |
| 5 | **No Online Ecosystem sync** | Price updates don't sync to shop_products |
| 6 | **Customer pricing tiers missing** | No retail/wholesale visibility per customer type |
| 7 | **No price history tracking** | Can't see when prices changed |
| 8 | **Mobile UX issues** | Touch targets inconsistent, some cards cramped |
| 9 | **No quick stats integration** | Missing revenue potential / profit margin insights |
| 10 | **No batch price update** | Can only update one price at a time |
| 11 | **Default pricing logic not visible** | Users can't see Refill (+20/+30) or Package (+50/+50) defaults |
| 12 | **No validation before save** | Negative prices or invalid data possible |

---

## Rebuild Architecture

### New Component Structure

```text
ProductPricingModule (Main Container - Optimized ~400 lines)
├── useProductPricingData.ts (Centralized data hook)
│   ├── TanStack Query for products + brands
│   ├── Real-time subscriptions (debounced)
│   ├── CRUD operations with timeout
│   └── Price calculation helpers
│
├── ProductPricingHeader
│   ├── Title + Stats Overview
│   ├── Add Product Button
│   └── Save Changes Button (with pending count badge)
│
├── ProductPricingQuickStats (NEW)
│   ├── Total Products
│   ├── LPG Pricing Count  
│   ├── Avg Profit Margin
│   └── Last Updated Indicator
│
├── ProductPricingTabs (LPG | Stoves | Regulators)
│   ├── LPG Tab
│   │   ├── Valve Size Toggle (22mm/20mm)
│   │   ├── Weight Dropdown
│   │   ├── Search Bar
│   │   └── LPG Brand Price Cards Grid
│   │
│   ├── Stoves Tab
│   │   ├── Search Bar
│   │   └── Stove Price Cards Grid
│   │
│   └── Regulators Tab
│       ├── Search Bar
│       └── Regulator Price Cards Grid
│
├── LPGBrandPriceCard (Extracted Component)
│   ├── Brand Header (Color + Name + Weight/Size Badges)
│   ├── Refill Section (3-column price grid)
│   ├── Package Section (3-column price grid)
│   └── Actions (Delete)
│
├── AccessoryPriceCard (Stoves + Regulators)
│   ├── Product Name + Badges
│   ├── 3-column price grid
│   └── Actions (Delete)
│
├── EditablePriceCell (Reusable - extracted)
│   ├── Label with icon
│   ├── Click-to-edit input
│   └── Modified indicator ring
│
├── AddProductDialog (Extracted)
│   ├── Product Type Selection
│   ├── Type-specific form fields
│   ├── Default pricing calculator
│   └── Validation + Submit
│
└── PricingModuleSkeleton (Loading state)
```

---

## Part 1: Create Centralized Hook

### New Hook: useProductPricingData

```typescript
// src/hooks/useProductPricingData.ts
export function useProductPricingData() {
  const queryClient = useQueryClient();
  
  // Products query with timeout
  const { data: products, isLoading, error, refetch } = useQuery({
    queryKey: ['product-pricing-products'],
    queryFn: async () => {
      const fetchPromise = supabase
        .from('product_prices')
        .select('*')
        .eq('is_active', true)
        .order('product_name');
      
      const { data } = await withTimeout(fetchPromise, 12000, 'Product Pricing');
      return data || [];
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
  
  // LPG Brands query
  const { data: lpgBrands } = useQuery({
    queryKey: ['product-pricing-lpg-brands'],
    queryFn: async () => {
      const { data } = await supabase
        .from('lpg_brands')
        .select('id, name, color, size, weight')
        .eq('is_active', true);
      return data || [];
    },
    staleTime: 60_000,
  });
  
  // Real-time subscriptions (debounced)
  useEffect(() => {
    const debouncedRefetch = debounce(() => refetch(), 1000);
    
    const channel = supabase
      .channel('pricing-realtime-v2')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'product_prices' },
        debouncedRefetch
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'lpg_brands' },
        debouncedRefetch
      )
      .subscribe();
    
    return () => supabase.removeChannel(channel);
  }, [refetch]);
  
  // Mutations
  const updatePrices = async (updates: Record<string, Partial<ProductPrice>>) => {...};
  const addProduct = async (product: NewProduct) => {...};
  const deleteProduct = async (id: string) => {...};
  
  // Computed values
  const lpgProducts = products?.filter(p => p.product_type === 'lpg') || [];
  const stoveProducts = products?.filter(p => p.product_type === 'stove') || [];
  const regulatorProducts = products?.filter(p => p.product_type === 'regulator') || [];
  
  return {
    products, lpgProducts, stoveProducts, regulatorProducts,
    lpgBrands, isLoading, error, refetch,
    updatePrices, addProduct, deleteProduct
  };
}
```

---

## Part 2: Extract Reusable Components

### EditablePriceCell Component

```typescript
// src/components/pricing/EditablePriceCell.tsx
interface EditablePriceCellProps {
  productId: string;
  field: 'company_price' | 'distributor_price' | 'retail_price' | 'package_price';
  value: number;
  label: string;
  icon: LucideIcon;
  colorClass: string;
  isModified: boolean;
  onValueChange: (productId: string, field: string, value: number) => void;
}

export const EditablePriceCell = ({
  productId, field, value, label, icon: Icon, colorClass, isModified, onValueChange
}: EditablePriceCellProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Touch-friendly: 48px minimum target
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-medium">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      <div
        onClick={() => setIsEditing(true)}
        className={cn(
          "px-3 py-2.5 rounded-lg cursor-pointer transition-all text-center min-h-[44px] flex items-center justify-center",
          colorClass,
          isModified && "ring-2 ring-primary ring-offset-1"
        )}
      >
        {isEditing ? (
          <Input
            ref={inputRef}
            type="number"
            value={localValue}
            onChange={(e) => setLocalValue(Number(e.target.value))}
            onBlur={() => {
              onValueChange(productId, field, localValue);
              setIsEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onValueChange(productId, field, localValue);
                setIsEditing(false);
              }
              if (e.key === 'Escape') setIsEditing(false);
            }}
            className="h-7 text-center font-semibold border-0 bg-transparent p-0 text-base"
            autoFocus
            min={0}
          />
        ) : (
          <span className="font-semibold text-sm sm:text-base tabular-nums">
            ৳{value.toLocaleString()}
          </span>
        )}
      </div>
    </div>
  );
};
```

### LPGBrandPriceCard Component

```typescript
// src/components/pricing/LPGBrandPriceCard.tsx
interface LPGBrandPriceCardProps {
  brand: GroupedBrand;
  refillProduct: ProductPrice | null;
  packageProduct: ProductPrice | null;
  editedPrices: Record<string, Partial<ProductPrice>>;
  onPriceChange: (id: string, field: string, value: number) => void;
  onDelete: (id: string) => void;
  valveSize: '22mm' | '20mm';
}

export const LPGBrandPriceCard = ({
  brand, refillProduct, packageProduct, editedPrices, onPriceChange, onDelete, valveSize
}: LPGBrandPriceCardProps) => {
  const brandColor = getLpgColorByValveSize(brand.name, valveSize);
  
  // Calculate profit margins
  const refillMargin = refillProduct 
    ? refillProduct.retail_price - refillProduct.company_price 
    : 0;
  
  return (
    <Card className="border-border hover:shadow-lg transition-all duration-200">
      {/* Header */}
      <CardHeader className="pb-3 px-4 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2.5 text-base sm:text-lg font-semibold">
            <span
              className="h-5 w-5 rounded-full ring-2 ring-offset-2 shadow-sm"
              style={{ backgroundColor: brandColor }}
            />
            {brand.name}
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant="secondary">{brand.weight}</Badge>
            <Badge variant="outline">{valveSize}</Badge>
          </div>
        </div>
        {/* Profit indicator */}
        {refillMargin > 0 && (
          <div className="text-xs text-emerald-600 mt-1">
            Profit: ৳{refillMargin}/unit
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
            colorScheme="blue"
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
            colorScheme="emerald"
          />
        )}
        
        {/* Empty state */}
        {!refillProduct && !packageProduct && (
          <EmptyPricingState brandName={brand.name} weight={brand.weight} />
        )}
      </CardContent>
    </Card>
  );
};
```

---

## Part 3: Module Integrations

### 1. Business Diary Integration

When prices are updated, log an event to `daily_expenses` or a new `price_history` table:

```typescript
// In useProductPricingData - after updatePrices mutation
const logPriceChange = async (productName: string, oldPrice: number, newPrice: number) => {
  // Option 1: Log as expense adjustment (for tracking)
  await supabase.from('stock_movements').insert({
    movement_type: 'price_adjustment',
    notes: `Price updated: ${productName} - ৳${oldPrice} → ৳${newPrice}`,
    quantity: 0,
    created_by: userId
  });
  
  // The Business Diary real-time subscription will pick this up
};
```

### 2. Online Ecosystem Sync

When retail prices change, sync to `shop_products`:

```typescript
// In useProductPricingData
const syncToShopProducts = async (productId: string, newRetailPrice: number) => {
  // Get shop_id for current user
  const { data: shop } = await supabase
    .from('shop_profiles')
    .select('id')
    .eq('owner_id', userId)
    .single();
  
  if (shop) {
    // Update shop_products price
    await supabase
      .from('shop_products')
      .update({ price: newRetailPrice })
      .eq('shop_id', shop.id)
      .eq('product_type', 'lpg_refill')
      // Match by brand name
      .ilike('brand_name', productName);
    
    toast.success("Online price synced!");
  }
};
```

### 3. Customer Module Integration

Add customer type indicator to pricing cards showing which price applies:

```typescript
// Visual indicator in price cells
<div className="text-[9px] text-muted-foreground mt-0.5">
  {field === 'retail_price' && '(Retail Customer)'}
  {field === 'distributor_price' && '(Wholesale Customer)'}
</div>
```

### 4. Utility Expense Integration

Staff salary and vehicle costs are already tracked separately. The connection is through the Business Diary which aggregates all expense sources.

---

## Part 4: Quick Stats Integration

### ProductPricingQuickStats Component

```typescript
// src/components/pricing/ProductPricingQuickStats.tsx
export const ProductPricingQuickStats = ({ products }: { products: ProductPrice[] }) => {
  const lpgCount = products.filter(p => p.product_type === 'lpg').length;
  const stoveCount = products.filter(p => p.product_type === 'stove').length;
  const regulatorCount = products.filter(p => p.product_type === 'regulator').length;
  
  // Calculate average margin
  const lpgProducts = products.filter(p => p.product_type === 'lpg');
  const avgMargin = lpgProducts.length > 0
    ? lpgProducts.reduce((sum, p) => sum + (p.retail_price - p.company_price), 0) / lpgProducts.length
    : 0;
  
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
      <StatCard 
        title="Total Products" 
        value={products.length}
        icon={<DollarSign />}
        colorScheme="primary"
      />
      <StatCard
        title="LPG Prices"
        value={lpgCount}
        icon={<Package />}
        colorScheme="primary"
      />
      <StatCard
        title="Avg Margin"
        value={`৳${Math.round(avgMargin)}`}
        icon={<TrendingUp />}
        colorScheme="emerald"
      />
      <StatCard
        title="Stoves + Regulators"
        value={stoveCount + regulatorCount}
        icon={<Wrench />}
        colorScheme="purple"
      />
    </div>
  );
};
```

---

## Part 5: Default Pricing Calculator

### Add Auto-Calculate Button

When user enters Company price, offer to auto-calculate Wholesale and Retail:

```typescript
// In AddProductDialog
const calculateDefaultPrices = (companyPrice: number, variant: 'Refill' | 'Package') => {
  if (variant === 'Refill') {
    return {
      distributor_price: companyPrice + 20,  // +20 for wholesale
      retail_price: companyPrice + 20 + 30,  // +30 more for retail
    };
  } else {
    return {
      distributor_price: companyPrice + 50,  // +50 for wholesale
      retail_price: companyPrice + 50 + 50,  // +50 more for retail
    };
  }
};

// UI Button
<Button 
  variant="outline" 
  size="sm"
  onClick={() => {
    const calculated = calculateDefaultPrices(newProduct.company_price, newProduct.variant);
    setNewProduct(prev => ({ ...prev, ...calculated }));
  }}
>
  <Calculator className="h-4 w-4 mr-1" />
  Auto-Calculate
</Button>
```

---

## Part 6: Mobile Optimization

### Key Mobile Improvements

1. **Touch Targets**: All clickable elements minimum 44px height
2. **Safe Area**: Bottom padding for mobile navigation
3. **Responsive Grid**: 1 column on mobile, 2-3 on larger screens
4. **Sticky Header**: Save button always visible
5. **Bottom Sheet Dialog**: Add Product dialog slides up from bottom on mobile

```typescript
// Mobile-optimized price card grid
<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
  {brands.map(brand => <LPGBrandPriceCard key={brand.name} ... />)}
</div>

// Sticky save button for mobile
<div className="fixed bottom-20 right-4 sm:relative sm:bottom-auto sm:right-auto z-50 sm:z-auto">
  <Button 
    onClick={saveChanges}
    disabled={!hasChanges || isSaving}
    className="h-12 sm:h-9 rounded-full sm:rounded-lg shadow-lg sm:shadow-none"
  >
    <Save className="h-5 w-5 sm:h-4 sm:w-4" />
    <span className="ml-2">Save ({pendingCount})</span>
  </Button>
</div>
```

---

## Part 7: Validation & Error Handling

### Price Validation

```typescript
const validatePrices = (prices: Partial<ProductPrice>): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (prices.company_price !== undefined && prices.company_price < 0) {
    errors.push("Company price cannot be negative");
  }
  if (prices.retail_price !== undefined && prices.retail_price < (prices.company_price || 0)) {
    errors.push("Retail price should be higher than company price");
  }
  if (prices.distributor_price !== undefined && 
      prices.distributor_price < (prices.company_price || 0)) {
    errors.push("Wholesale price should be higher than company price");
  }
  
  return { valid: errors.length === 0, errors };
};
```

---

## Implementation Checklist

| Step | File | Action | Priority |
|------|------|--------|----------|
| 1 | `src/hooks/useProductPricingData.ts` | Create centralized data hook | Critical |
| 2 | `src/components/pricing/EditablePriceCell.tsx` | Extract reusable price cell | High |
| 3 | `src/components/pricing/LPGBrandPriceCard.tsx` | Extract LPG card | High |
| 4 | `src/components/pricing/AccessoryPriceCard.tsx` | Extract accessory card | High |
| 5 | `src/components/pricing/ProductPricingQuickStats.tsx` | Add quick stats | High |
| 6 | `src/components/pricing/AddProductDialog.tsx` | Extract add dialog | High |
| 7 | `src/components/pricing/PricingModuleSkeleton.tsx` | Add skeleton loader | Medium |
| 8 | `ProductPricingModule.tsx` | Refactor main container | High |
| 9 | Integrate shop_products sync | Online Ecosystem | Medium |
| 10 | Add price history logging | Business Diary | Medium |

---

## Success Criteria

After implementation:
1. **Component Size**: Main module reduced from 1,328 lines to ~400 lines
2. **Loading Experience**: Skeleton shows immediately, never stuck
3. **Mobile UX**: 48px touch targets, sticky save button, responsive grids
4. **Module Sync**: Price changes auto-sync to Online Shop products
5. **Business Diary**: Price updates logged for audit trail
6. **Validation**: No negative prices, logical price hierarchy
7. **Real-Time**: Debounced updates, no UI flicker
8. **Quick Stats**: Profit margins visible at a glance

---

## Testing Scenarios

1. **Edit LPG Price**: Change company price → Wholesale/Retail update → Save → Business Diary logs event
2. **Add New Product**: Open dialog → Select type → Enter prices → Auto-calculate → Save
3. **Delete Product**: Click delete → Confirm → Product removed → Online shop synced
4. **Mobile Flow**: Open on phone → Navigate tabs → Edit price → Sticky save button works
5. **Real-Time Sync**: Update price in POB module → Product Pricing updates automatically
6. **Validation**: Enter negative price → Error shown → Cannot save
7. **Offline Recovery**: Go offline → Edit prices → Come online → Changes saved
8. **Search**: Type brand name → Only matching brands shown

---

## Files to Create

### New Files:
- `src/hooks/useProductPricingData.ts`
- `src/components/pricing/EditablePriceCell.tsx`
- `src/components/pricing/LPGBrandPriceCard.tsx`
- `src/components/pricing/AccessoryPriceCard.tsx`
- `src/components/pricing/ProductPricingQuickStats.tsx`
- `src/components/pricing/AddProductDialog.tsx`
- `src/components/pricing/PricingModuleSkeleton.tsx`
- `src/components/pricing/PriceSection.tsx`

### Modified Files:
- `src/components/dashboard/modules/ProductPricingModule.tsx` (Major refactor)
