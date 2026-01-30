
# Inventory + POB Module - Complete Rebuild Plan

## Current State Analysis

After thorough examination of the Inventory module (1,065 lines) and POB Drawer (1,935 lines), I've identified both strengths and issues that need to be addressed for a proper rebuild.

### Current Architecture
- **InventoryModule.tsx**: Main container with 3 tabs (LPG, Stoves, Regulators)
- **InventoryPOBDrawer.tsx**: Sheet-based drawer for Buy/Add operations
- **InventoryStatCard.tsx**: Reusable stat card component

### Issues Found

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 1 | **Monolithic POB Drawer** | Single 1,935 line file | Hard to maintain, slow initial render |
| 2 | **No loading skeleton** | Shows spinner only | Poor perceived performance |
| 3 | **Duplicate code in Mobile/Desktop views** | Cart rendered twice | Code bloat, maintenance burden |
| 4 | **No dedicated hooks** | All state in component | Poor separation of concerns |
| 5 | **Stock updates not atomic** | Sequential DB calls without transactions | Potential race conditions |
| 6 | **No quick stats** | Must navigate to Business Diary | Can't see today's purchases from POB |
| 7 | **No batch operations** | One item at a time only | Slow for large orders |
| 8 | **Mobile footer overlap potential** | No safe-area handling in drawer | May overlap bottom nav |
| 9 | **Missing real-time price preview** | Price only shown after calculation | UX friction |
| 10 | **No purchase history** | No way to view past POB transactions | Business reporting gap |

---

## Rebuild Architecture

### New Component Structure

```text
InventoryModule (Main Container - Optimized)
├── InventoryHeader
│   ├── Title + Quick Stats (Total Stock Value, Today's Purchases)
│   └── Action Buttons (Buy/Add by Type)
│
├── InventoryQuickStats (NEW - Summary Bar)
│   ├── Total Full Cylinders
│   ├── Total Empty Cylinders
│   ├── Today's Purchases
│   └── Low Stock Alert Badge
│
├── InventoryTabs (LPG | Stoves | Regulators)
│   ├── TabContent: Summary Cards + Filter Controls + Product Grid
│   │
│   ├── LPG Tab
│   │   ├── 4 Summary Cards (Package, Refill, Empty, Problem)
│   │   ├── Filter Bar (Valve Size + Weight + Search)
│   │   └── LPG Brand Cards Grid
│   │
│   ├── Stoves Tab
│   │   ├── 4 Summary Cards (Total, Single, Double, Damaged)
│   │   ├── Filter Bar (Burner Type + Damaged Toggle + Search)
│   │   └── Stove Cards Grid
│   │
│   └── Regulators Tab
│       ├── 3 Summary Cards (Total, 22mm, 20mm)
│       ├── Filter Bar (Size Toggle + Search)
│       └── Regulator Cards Grid
│
└── POBDrawer (Refactored - Modular)
    ├── POBHeader (Title + Mode Toggle)
    ├── POBProductForm (Type-specific inputs)
    ├── POBCart (Unified cart for all product types)
    └── POBCheckout (Payment status + Supplier)
```

### New POB Component Structure

```text
POBDrawer (Container - Reduced to ~400 lines)
├── usePOBData.ts (Centralized data hook)
├── usePOBCart.ts (Cart state management)
│
├── POBProductForm
│   ├── LPGForm (Brand + Cylinder Type + Weight + Qty by Valve Size)
│   ├── StoveForm (Brand + Model + Qty by Burner Type)
│   └── RegulatorForm (Brand + Qty by Valve Type)
│
├── POBCartView (Unified - No duplicate code)
│   ├── Cart Items List
│   ├── Summary Cards (Total Qty + Total D.O.)
│   └── Supplier Input (Collapsible)
│
└── POBCheckoutButtons
    ├── Complete (Paid) Button
    └── Save as Credit Button
```

---

## Part 1: Create Centralized Hooks

### New Hook: useInventoryData
```typescript
// src/hooks/useInventoryData.ts
export function useInventoryData() {
  const queryClient = useQueryClient();
  
  const { data: lpgBrands, isLoading: lpgLoading } = useQuery({
    queryKey: ['inventory-lpg-brands'],
    queryFn: async () => {
      const { data } = await supabase
        .from('lpg_brands')
        .select('*')
        .eq('is_active', true)
        .order('name');
      return data || [];
    },
    staleTime: 30_000
  });
  
  const { data: stoves } = useQuery({...});
  const { data: regulators } = useQuery({...});
  
  // Aggregated totals using RPC
  const { data: totals } = useQuery({
    queryKey: ['inventory-totals'],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_inventory_totals');
      return data;
    },
    staleTime: 60_000
  });
  
  // Real-time subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('inventory-realtime-v4')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lpg_brands' }, 
          () => queryClient.invalidateQueries({ queryKey: ['inventory-lpg-brands'] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stoves' }, 
          () => queryClient.invalidateQueries({ queryKey: ['inventory-stoves'] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'regulators' }, 
          () => queryClient.invalidateQueries({ queryKey: ['inventory-regulators'] }))
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [queryClient]);
  
  return { lpgBrands, stoves, regulators, totals, isLoading: lpgLoading };
}
```

### New Hook: usePOBCart
```typescript
// src/hooks/usePOBCart.ts
export interface POBCartItem {
  id: string;
  type: 'lpg' | 'stove' | 'regulator';
  name: string;
  details: string;
  companyPrice: number;
  quantity: number;
  brandId?: string;
  cylinderType?: 'refill' | 'package';
  weight?: string;
  valveSize?: string;
  brandColor?: string;
}

export function usePOBCart() {
  const [items, setItems] = useState<POBCartItem[]>([]);
  const [supplierName, setSupplierName] = useState('');
  const [pobMode, setPobMode] = useState<'buy' | 'add'>('buy');
  
  const addItem = useCallback((item: POBCartItem) => {
    setItems(prev => [...prev, item]);
  }, []);
  
  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);
  
  const clearCart = useCallback(() => {
    setItems([]);
    setSupplierName('');
  }, []);
  
  const subtotal = useMemo(() => 
    items.reduce((sum, i) => sum + i.companyPrice * i.quantity, 0), [items]
  );
  
  const totalQty = useMemo(() => 
    items.reduce((sum, i) => sum + i.quantity, 0), [items]
  );
  
  return { 
    items, addItem, removeItem, clearCart, 
    supplierName, setSupplierName,
    pobMode, setPobMode,
    subtotal, totalQty 
  };
}
```

---

## Part 2: Loading & Skeleton States

### Add InventorySkeleton Component
```typescript
// src/components/inventory/InventorySkeleton.tsx
const InventorySkeleton = () => (
  <div className="space-y-4 animate-pulse">
    {/* Header Skeleton */}
    <div className="flex items-center gap-3">
      <div className="h-12 w-12 rounded-2xl bg-muted" />
      <div className="space-y-2">
        <div className="h-6 w-32 bg-muted rounded" />
        <div className="h-4 w-48 bg-muted rounded" />
      </div>
    </div>
    
    {/* Tabs Skeleton */}
    <div className="flex gap-2">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-10 w-24 bg-muted rounded-lg" />
      ))}
    </div>
    
    {/* Stats Grid Skeleton */}
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-20 bg-muted rounded-lg" />
      ))}
    </div>
    
    {/* Product Cards Skeleton */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-48 bg-muted rounded-lg" />
      ))}
    </div>
  </div>
);
```

---

## Part 3: Quick Stats Integration

### Add Today's Purchase Summary
```typescript
// src/components/inventory/InventoryQuickStats.tsx
const InventoryQuickStats = () => {
  const { data: stats } = useQuery({
    queryKey: ['inventory-today-stats'],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      // Get today's POB transactions
      const { data: pobTxns } = await supabase
        .from('pob_transactions')
        .select('total')
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`);
      
      const todayPurchases = pobTxns?.length || 0;
      const todaySpent = pobTxns?.reduce((sum, t) => sum + Number(t.total), 0) || 0;
      
      // Get inventory totals using RPC
      const { data: totals } = await supabase.rpc('get_inventory_totals');
      
      // Get low stock alerts
      const { data: lowStock } = await supabase
        .from('lpg_brands')
        .select('id')
        .eq('is_active', true)
        .or('refill_cylinder.lt.5,package_cylinder.lt.5');
      
      return { 
        todayPurchases, 
        todaySpent,
        totalFull: totals?.total_full || 0,
        totalEmpty: totals?.total_empty || 0,
        lowStockCount: lowStock?.length || 0
      };
    },
    staleTime: 60_000,
    refetchInterval: 30_000
  });
  
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      <Card className="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/50">
        <CardContent className="p-3 flex items-center gap-2">
          <Package className="h-5 w-5 text-emerald-600" />
          <div>
            <p className="text-lg font-bold text-emerald-700 tabular-nums">{stats?.totalFull || 0}</p>
            <p className="text-[10px] text-muted-foreground">Full Cylinders</p>
          </div>
        </CardContent>
      </Card>
      <Card className="bg-gray-50 dark:bg-gray-950/30 border-gray-200/50">
        <CardContent className="p-3 flex items-center gap-2">
          <Cylinder className="h-5 w-5 text-gray-600" />
          <div>
            <p className="text-lg font-bold text-gray-700 tabular-nums">{stats?.totalEmpty || 0}</p>
            <p className="text-[10px] text-muted-foreground">Empty</p>
          </div>
        </CardContent>
      </Card>
      <Card className="bg-primary/10 border-primary/20">
        <CardContent className="p-3 flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-primary" />
          <div>
            <p className="text-lg font-bold text-primary tabular-nums">{stats?.todayPurchases || 0}</p>
            <p className="text-[10px] text-muted-foreground">Purchases Today</p>
          </div>
        </CardContent>
      </Card>
      {(stats?.lowStockCount || 0) > 0 && (
        <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200/50">
          <CardContent className="p-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-lg font-bold text-amber-700 tabular-nums">{stats?.lowStockCount}</p>
              <p className="text-[10px] text-muted-foreground">Low Stock</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
```

---

## Part 4: Modular POB Drawer Components

### Extract POBProductForm
```typescript
// src/components/inventory/POBProductForm.tsx
interface POBProductFormProps {
  productType: 'lpg' | 'stove' | 'regulator';
  pobMode: 'buy' | 'add';
  onAddToCart: (item: POBCartItem) => void;
  valveSizeStats: { "22mm": StockStats; "20mm": StockStats };
  stoveBurnerStats: { single: number; double: number };
  regulatorValveStats: { "22mm": number; "20mm": number };
}

export const POBProductForm = ({ 
  productType, pobMode, onAddToCart, 
  valveSizeStats, stoveBurnerStats, regulatorValveStats 
}: POBProductFormProps) => {
  // Render type-specific form
  if (productType === 'lpg') return <LPGForm {...formProps} />;
  if (productType === 'stove') return <StoveForm {...formProps} />;
  if (productType === 'regulator') return <RegulatorForm {...formProps} />;
  return null;
};
```

### Extract POBCartView (Unified - No Duplicate Code)
```typescript
// src/components/inventory/POBCartView.tsx
interface POBCartViewProps {
  items: POBCartItem[];
  onRemoveItem: (id: string) => void;
  subtotal: number;
  totalQty: number;
  supplierName: string;
  onSupplierChange: (value: string) => void;
  onCompletePurchase: (status: 'completed' | 'pending') => void;
  processing: boolean;
}

export const POBCartView = ({ 
  items, onRemoveItem, subtotal, totalQty,
  supplierName, onSupplierChange, onCompletePurchase, processing 
}: POBCartViewProps) => {
  const [showSupplierInput, setShowSupplierInput] = useState(false);
  
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <ShoppingBag className="h-16 w-16 opacity-30 mb-4" />
        <p className="font-semibold">Cart is empty</p>
        <p className="text-sm">Add products to get started</p>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* Cart Items - Single Implementation */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {items.map(item => (
            <POBCartItemCard key={item.id} item={item} onRemove={onRemoveItem} />
          ))}
        </div>
      </ScrollArea>
      
      {/* Checkout Section */}
      <div className="p-4 bg-muted/50 border-t space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <SummaryCard label="Total Qty" value={totalQty} variant="success" />
          <SummaryCard label="Total D.O." value={`৳${subtotal.toLocaleString()}`} variant="primary" />
        </div>
        
        {/* Supplier Input */}
        <SupplierCollapsible 
          open={showSupplierInput} 
          onOpenChange={setShowSupplierInput}
          value={supplierName}
          onChange={onSupplierChange}
        />
        
        {/* Checkout Buttons */}
        <POBCheckoutButtons 
          onComplete={() => onCompletePurchase('completed')}
          onSaveCredit={() => onCompletePurchase('pending')}
          processing={processing}
        />
      </div>
    </div>
  );
};
```

---

## Part 5: Business Diary Integration

### Real-Time Sync Flow
The POB is already connected to Business Diary through `daily_expenses` and `pob_transactions` tables:

```typescript
// In handleCompletePurchase (already implemented correctly)
await supabase.from('daily_expenses').insert({
  category: expenseCategory,
  amount: total,
  description: `${txnNumber}: ${finalSupplier} - ${itemNames}`,
  expense_date: today.toISOString().slice(0, 10),
  created_by: userId
});
```

### Verify Real-Time Subscriptions in Business Diary
```typescript
// Already in useBusinessDiaryQueries.ts - Verify these exist:
.on('postgres_changes', { event: '*', schema: 'public', table: 'pob_transactions' }, debouncedInvalidate)
.on('postgres_changes', { event: '*', schema: 'public', table: 'pob_transaction_items' }, debouncedInvalidate)
.on('postgres_changes', { event: '*', schema: 'public', table: 'daily_expenses' }, debouncedInvalidate)
```

---

## Part 6: Product Pricing Auto-Sync

### Enhanced Price Update with Notification
```typescript
// Already implemented in POBDrawer - Verify behavior:
const updateProductPricing = async (
  type: 'lpg' | 'stove' | 'regulator',
  productName: string,
  companyPrice: number,
  options: {...}
): Promise<{ priceChanged: boolean; oldPrice?: number }> => {
  // Updates company_price in product_prices table
  // Returns whether price changed for notification
};

// Show notification when price changes:
if (priceChanged && oldPrice) {
  toast({ 
    title: "Price Updated!", 
    description: `${productName}: ৳${oldPrice.toLocaleString()} → ৳${companyPrice.toLocaleString()}`
  });
}
```

---

## Part 7: Inventory Cards Optimization

### Unified LPG Brand Card with Inline Editing
```typescript
// src/components/inventory/LPGBrandCard.tsx
interface LPGBrandCardProps {
  brand: LPGBrand;
  onUpdate: (id: string, field: string, value: number) => void;
  onDelete: (id: string) => void;
}

export const LPGBrandCard = ({ brand, onUpdate, onDelete }: LPGBrandCardProps) => {
  const status = getLpgStatus(brand);
  const brandColor = getLpgColorByValveSize(brand.name, brand.size as "22mm" | "20mm");
  
  return (
    <Card className="border-border hover:shadow-md transition-shadow">
      <CardHeader className="pb-2 px-3 pt-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span 
              className="h-5 w-5 rounded-full ring-2 ring-offset-1 shadow-sm" 
              style={{ backgroundColor: brandColor }}
            />
            <span className="font-semibold truncate">{brand.name}</span>
          </div>
          <Badge className={`${status.color} text-white text-[10px]`}>{status.label}</Badge>
        </div>
        <div className="flex gap-1.5 mt-1">
          <Badge variant="outline" className="text-[10px]">{brand.weight}</Badge>
          <Badge variant="secondary" className="text-[10px]">{brand.size}</Badge>
        </div>
      </CardHeader>
      
      <CardContent className="px-3 pb-3">
        {/* 2x2 Grid for Stock Types */}
        <div className="grid grid-cols-2 gap-2">
          <EditableStockCell 
            value={brand.package_cylinder} 
            field="package_cylinder" 
            label="Package" 
            icon={Package}
            color="emerald"
            onUpdate={(val) => onUpdate(brand.id, 'package_cylinder', val)}
          />
          <EditableStockCell 
            value={brand.refill_cylinder} 
            field="refill_cylinder" 
            label="Refill" 
            icon={Cylinder}
            color="blue"
            onUpdate={(val) => onUpdate(brand.id, 'refill_cylinder', val)}
          />
          <EditableStockCell 
            value={brand.empty_cylinder} 
            field="empty_cylinder" 
            label="Empty" 
            icon={CircleDashed}
            color="gray"
            onUpdate={(val) => onUpdate(brand.id, 'empty_cylinder', val)}
          />
          <EditableStockCell 
            value={brand.problem_cylinder} 
            field="problem_cylinder" 
            label="Problem" 
            icon={AlertTriangle}
            color="red"
            onUpdate={(val) => onUpdate(brand.id, 'problem_cylinder', val)}
          />
        </div>
        
        {/* Delete Button */}
        <div className="flex justify-end mt-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-destructive"
            onClick={() => onDelete(brand.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
```

---

## Part 8: Mobile-Optimized POB Drawer

### Fix Safe Area Handling
```typescript
// POB Drawer with proper safe areas
<Sheet open={open} onOpenChange={onOpenChange}>
  <SheetContent 
    side={isMobile ? "bottom" : "right"} 
    className={cn(
      isMobile ? "h-[90vh] rounded-t-3xl" : "w-[550px] max-w-full",
      "flex flex-col",
      "pb-[env(safe-area-inset-bottom)]" // Handle safe area
    )}
  >
    {/* Header - Fixed */}
    <POBHeader productType={productType} pobMode={pobMode} onModeChange={setPobMode} />
    
    {/* Content - Scrollable */}
    <ScrollArea className="flex-1">
      {mobileStep === 'product' ? (
        <POBProductForm {...formProps} />
      ) : (
        <POBCartView {...cartProps} />
      )}
    </ScrollArea>
    
    {/* Mobile Step Navigation */}
    {isMobile && (
      <div className="p-4 border-t bg-background">
        {mobileStep === 'product' ? (
          <Button 
            onClick={() => setMobileStep('cart')} 
            disabled={items.length === 0}
            className="w-full h-12"
          >
            <ShoppingCart className="h-5 w-5 mr-2" />
            View Cart ({items.length})
          </Button>
        ) : (
          <Button 
            variant="outline" 
            onClick={() => setMobileStep('product')}
            className="w-full h-12"
          >
            ← Back to Products
          </Button>
        )}
      </div>
    )}
  </SheetContent>
</Sheet>
```

---

## Part 9: Online Marketplace Sync

### Inventory to Shop Products Sync
When stock changes, update shop products availability:

```typescript
// In useInventoryData - Add marketplace sync
useEffect(() => {
  const syncToMarketplace = async (brand: LPGBrand) => {
    const totalStock = brand.package_cylinder + brand.refill_cylinder;
    
    // Update shop_products availability
    await supabase
      .from('shop_products')
      .update({ 
        is_available: totalStock > 0,
        reserved_stock: Math.min(totalStock, 5) // Reserve safety stock
      })
      .ilike('brand_name', brand.name)
      .eq('weight', brand.weight);
  };
  
  // Subscribe to inventory changes
  const channel = supabase
    .channel('inventory-marketplace-sync')
    .on('postgres_changes', 
      { event: 'UPDATE', schema: 'public', table: 'lpg_brands' }, 
      (payload) => syncToMarketplace(payload.new as LPGBrand)
    )
    .subscribe();
  
  return () => supabase.removeChannel(channel);
}, []);
```

---

## Implementation Checklist

| Step | File | Action | Priority |
|------|------|--------|----------|
| 1 | `src/hooks/useInventoryData.ts` | Create centralized inventory data hook | Critical |
| 2 | `src/hooks/usePOBCart.ts` | Create POB cart state hook | Critical |
| 3 | `src/components/inventory/InventorySkeleton.tsx` | Add loading skeleton | High |
| 4 | `src/components/inventory/InventoryQuickStats.tsx` | Add summary stats bar | High |
| 5 | `src/components/inventory/LPGBrandCard.tsx` | Extract LPG card component | High |
| 6 | `src/components/inventory/StoveCard.tsx` | Extract stove card component | High |
| 7 | `src/components/inventory/RegulatorCard.tsx` | Extract regulator card component | High |
| 8 | `src/components/inventory/POBProductForm.tsx` | Extract product form component | High |
| 9 | `src/components/inventory/POBCartView.tsx` | Unified cart view (no duplicates) | High |
| 10 | `src/components/inventory/POBCheckoutButtons.tsx` | Extract checkout buttons | Medium |
| 11 | `InventoryModule.tsx` | Refactor to use new hooks/components | High |
| 12 | `InventoryPOBDrawer.tsx` | Refactor to use modular components | High |

---

## Success Criteria

After implementation:
1. **Component Size**: POB Drawer reduced from 1,935 lines to ~600 lines
2. **Loading Experience**: Skeleton shows immediately, content loads smoothly
3. **Mobile UX**: Safe area handling, 48px touch targets, no overlap
4. **Quick Stats**: Today's purchases visible in Inventory header
5. **Real-Time**: Stock updates instantly sync to POS, Business Diary, and Marketplace
6. **Price Sync**: POB purchases auto-update company prices with notifications
7. **Code Quality**: No duplicate cart rendering, clean separation of concerns
8. **Performance**: Product grids use virtualization for large inventories

---

## Testing Scenarios

1. **Buy LPG (D.O.)**: Add cylinders with D.O. -> Empty reduces, Refill increases -> Business Diary shows expense
2. **Add Stock Only**: Add existing stock -> Only refill/package increases (no empty reduction)
3. **Stove Purchase**: Buy stoves -> Stock increases -> Price updated in Product Pricing
4. **Regulator Purchase**: Buy regulators -> Stock increases -> Expense logged
5. **Credit Purchase**: Save as credit -> Payment status = pending -> Tracked for follow-up
6. **Price Change Detection**: Buy at different price -> Toast shows old -> new price
7. **Mobile Flow**: Open POB on mobile -> Add items -> View cart -> Complete purchase
8. **Real-Time Sync**: Complete POB -> Business Diary updates within 2 seconds
9. **Low Stock Alert**: Reduce stock below 5 -> Alert badge appears in stats
10. **Marketplace Sync**: Stock drops to 0 -> Shop product shows "Out of Stock"

---

## Files to Create/Modify

### New Files:
- `src/hooks/useInventoryData.ts`
- `src/hooks/usePOBCart.ts`
- `src/components/inventory/InventorySkeleton.tsx`
- `src/components/inventory/InventoryQuickStats.tsx`
- `src/components/inventory/LPGBrandCard.tsx`
- `src/components/inventory/StoveCard.tsx`
- `src/components/inventory/RegulatorCard.tsx`
- `src/components/inventory/POBProductForm.tsx`
- `src/components/inventory/POBCartView.tsx`
- `src/components/inventory/POBCheckoutButtons.tsx`
- `src/components/inventory/EditableStockCell.tsx`

### Modified Files:
- `src/components/dashboard/modules/InventoryModule.tsx` (Major refactor)
- `src/components/inventory/InventoryPOBDrawer.tsx` (Major refactor)
