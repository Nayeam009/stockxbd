
# POS Module - Complete Rebuild Plan

## Current State Analysis

After thorough examination of the POS module (2,607 lines), I've identified both strengths and issues that need to be addressed for a proper rebuild.

### Current Architecture
The POS module is a single large component that handles:
- Product selection (LPG, Stove, Regulator)
- Cart management (Sale Items + Return Items)
- Customer lookup (Phone-first flow)
- Payment processing (Paid/Partial/Due)
- Inventory updates
- Invoice generation

### Issues Found

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 1 | **Monolithic component** | Single 2,607 line file | Hard to maintain, slow initial render |
| 2 | **No loading skeleton** | Loading state shows spinner only | Poor perceived performance |
| 3 | **Inline price calculations** | Price lookups scattered throughout | Inconsistent pricing, hard to debug |
| 4 | **Mobile footer overlap** | `bottom-16` fixed footer | Overlaps with bottom nav on some devices |
| 5 | **No quick actions** | Must navigate through forms | Slow for repeat operations |
| 6 | **Missing product images** | Only color badges | Less visual recognition |
| 7 | **No offline queue** | Fails silently offline | Sales lost during network issues |
| 8 | **Complex state management** | 40+ useState hooks | Hard to track, potential race conditions |
| 9 | **No transaction summary** | Must check Business Diary | Can't see today's stats from POS |
| 10 | **Slow product grid scroll** | All products rendered | Performance issue with large inventories |

---

## Rebuild Architecture

### New Component Structure

```text
POSModule (Main Container - Optimized)
├── POSHeader
│   ├── Title + Stats Mini-bar (Today's Sales, Items Sold)
│   ├── Barcode Scanner Button
│   └── Clear All Button
│
├── POSSummaryBar (NEW - Quick Stats)
│   ├── Today's Sales Count
│   ├── Today's Revenue
│   └── Pending Online Orders Badge
│
├── POSTableTabs (Mobile: Toggle, Desktop: Side-by-side)
│   ├── SaleTable (Products being sold)
│   └── ReturnTable (Cylinders being returned)
│
├── POSControlBar (Optimized Filters)
│   ├── Row 1: Retail/Wholesale + Weight Select + Search
│   ├── Row 2: Cylinder Type (Refill/Package) + Valve Size (22mm/20mm)
│   └── Row 3: Desktop Selling/Return Toggle + Product Tabs (LPG/Stove/Regulator)
│
├── POSProductGrid (Virtualized for performance)
│   ├── LPG Cards (Brand color strip, stock preview, price)
│   ├── Stove Cards (Brand, model, burners, price)
│   ├── Regulator Cards (Brand, type, price)
│   └── Custom Product Buttons
│
├── POSCustomerSection (Phone-first flow)
│   ├── Phone Input (Auto-lookup)
│   ├── Customer Status Badge (Found/New/Due Warning)
│   ├── Name + Location Fields
│   └── Settlement + Seller Display
│
└── POSStickyFooter (Mobile-optimized)
    ├── Total Amount
    ├── Item Count
    └── PROCEED TO PAY Button
```

---

## Part 1: Component Modularization

### Extract into Sub-Components

| Component | Responsibility | Lines Saved |
|-----------|---------------|-------------|
| `POSProductCard.tsx` | Individual product display with stock preview | ~100 |
| `POSSaleTable.tsx` | Sale items list with quantity controls | ~80 |
| `POSReturnTable.tsx` | Return cylinders list with leaked toggle | ~70 |
| `POSCustomerLookup.tsx` | Phone-first customer flow | ~150 |
| `POSPaymentDrawer.tsx` | Payment modal with status selection | ~100 |
| `POSQuickStats.tsx` | Today's sales summary | ~50 |
| `usePOSData.ts` | Centralized data fetching hook | ~100 |
| `usePOSCart.ts` | Cart state management hook | ~150 |

### New Hook: usePOSData
```typescript
// Centralize all POS data fetching
export function usePOSData() {
  const queryClient = useQueryClient();
  
  const { data: lpgBrands, isLoading: lpgLoading } = useQuery({
    queryKey: ['pos-lpg-brands'],
    queryFn: () => supabase.from('lpg_brands').select('*').eq('is_active', true),
    staleTime: 30_000
  });
  
  const { data: productPrices } = useQuery({
    queryKey: ['pos-prices'],
    queryFn: () => supabase.from('product_prices').select('*').eq('is_active', true),
    staleTime: 30_000
  });
  
  // Real-time subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('pos-realtime-v3')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lpg_brands' }, 
          () => queryClient.invalidateQueries({ queryKey: ['pos-lpg-brands'] }))
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);
  
  return { lpgBrands, productPrices, isLoading: lpgLoading };
}
```

### New Hook: usePOSCart
```typescript
// Centralize cart state management
export function usePOSCart() {
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [discount, setDiscount] = useState(0);
  
  const addToCart = useCallback((item: SaleItem) => {
    setSaleItems(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, item];
    });
  }, []);
  
  const subtotal = useMemo(() => saleItems.reduce((sum, i) => sum + i.price * i.quantity, 0), [saleItems]);
  const total = useMemo(() => Math.max(0, subtotal - discount), [subtotal, discount]);
  
  const clearCart = useCallback(() => {
    setSaleItems([]);
    setReturnItems([]);
    setDiscount(0);
  }, []);
  
  return { saleItems, returnItems, subtotal, total, addToCart, clearCart };
}
```

---

## Part 2: Loading & Skeleton States

### Add POSSkeleton Component
```typescript
const POSSkeleton = () => (
  <div className="space-y-3 animate-pulse">
    {/* Header Skeleton */}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="h-9 w-9 rounded-lg bg-muted" />
        <div className="h-6 w-20 bg-muted rounded" />
      </div>
      <div className="flex gap-1.5">
        <div className="h-8 w-8 bg-muted rounded" />
        <div className="h-8 w-8 bg-muted rounded" />
      </div>
    </div>
    
    {/* Stats Bar Skeleton */}
    <div className="flex gap-2">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex-1 h-16 bg-muted rounded-lg" />
      ))}
    </div>
    
    {/* Product Grid Skeleton */}
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="h-24 bg-muted rounded-lg" />
      ))}
    </div>
  </div>
);
```

---

## Part 3: Quick Stats Integration

### Add Today's Summary Bar
```typescript
const POSQuickStats = () => {
  const { data: stats } = useQuery({
    queryKey: ['pos-today-stats'],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data } = await supabase
        .from('pos_transactions')
        .select('total')
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`)
        .eq('is_voided', false);
      
      const totalSales = data?.length || 0;
      const totalRevenue = data?.reduce((sum, t) => sum + Number(t.total), 0) || 0;
      
      // Get pending online orders
      const { count } = await supabase
        .from('community_orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      
      return { totalSales, totalRevenue, pendingOrders: count || 0 };
    },
    staleTime: 60_000,
    refetchInterval: 30_000
  });
  
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-2.5 text-center">
        <p className="text-lg font-bold text-emerald-600 tabular-nums">{stats?.totalSales || 0}</p>
        <p className="text-[10px] text-muted-foreground">Sales Today</p>
      </div>
      <div className="bg-primary/10 rounded-lg p-2.5 text-center">
        <p className="text-lg font-bold text-primary tabular-nums">৳{(stats?.totalRevenue || 0).toLocaleString()}</p>
        <p className="text-[10px] text-muted-foreground">Revenue</p>
      </div>
      {stats?.pendingOrders > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-2.5 text-center relative">
          <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-amber-500">
            {stats.pendingOrders}
          </Badge>
          <p className="text-lg font-bold text-amber-600">Online</p>
          <p className="text-[10px] text-muted-foreground">Pending</p>
        </div>
      )}
    </div>
  );
};
```

---

## Part 4: Optimized Product Card

### Enhanced Product Card with Stock Preview
```typescript
interface POSProductCardProps {
  brand: LPGBrand;
  cylinderType: 'refill' | 'package';
  saleType: 'retail' | 'wholesale';
  weight: string;
  price: number;
  pendingStock: number;
  isSaleMode: boolean;
  onAddToSale: () => void;
  onAddToReturn: () => void;
}

const POSProductCard = ({ 
  brand, cylinderType, saleType, weight, price, 
  pendingStock, isSaleMode, onAddToSale, onAddToReturn 
}: POSProductCardProps) => {
  const baseStock = cylinderType === 'refill' ? brand.refill_cylinder : brand.package_cylinder;
  const displayStock = Math.max(0, baseStock - pendingStock);
  const isOutOfStock = displayStock <= 0;
  
  return (
    <button
      onClick={isSaleMode ? onAddToSale : onAddToReturn}
      disabled={isSaleMode && isOutOfStock}
      className={cn(
        "relative p-3 rounded-xl text-left transition-all",
        "hover:shadow-md active:scale-[0.98]",
        "min-h-[88px]", // Touch-friendly minimum height
        isSaleMode && isOutOfStock && "opacity-50 cursor-not-allowed",
        isSaleMode ? "hover:border-emerald-500/50" : "hover:border-amber-500/50",
        "border border-transparent bg-card"
      )}
    >
      {/* Brand Color Strip */}
      <div
        className="absolute top-0 left-0 bottom-0 w-1.5 rounded-l-xl"
        style={{ backgroundColor: brand.color }}
      />
      
      <div className="pl-2.5 flex flex-col h-full justify-between">
        {/* Header: Icon + Stock Badge */}
        <div className="flex items-start justify-between gap-1">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm"
            style={{ backgroundColor: brand.color }}
          >
            <Cylinder className="h-4.5 w-4.5 text-white" />
          </div>
          
          {isSaleMode ? (
            <Badge
              variant={displayStock > 5 ? "secondary" : displayStock > 0 ? "outline" : "destructive"}
              className="text-[10px] px-1.5 h-5 font-semibold"
            >
              {displayStock > 0 ? (
                <span className="flex items-center gap-0.5">
                  {displayStock}
                  {pendingStock > 0 && (
                    <span className="text-amber-600 dark:text-amber-400 text-[8px]">(-{pendingStock})</span>
                  )}
                </span>
              ) : 'Out'}
            </Badge>
          ) : (
            <Badge className="text-[10px] px-1.5 h-5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              Empty: {brand.empty_cylinder}
            </Badge>
          )}
        </div>
        
        {/* Body: Name + Weight */}
        <div className="mt-1.5">
          <p className="font-semibold text-sm truncate">{brand.name}</p>
          <p className="text-[10px] text-muted-foreground">{weight} • {cylinderType}</p>
        </div>
        
        {/* Footer: Price */}
        {isSaleMode ? (
          <p className="font-bold text-base text-emerald-600 mt-1.5 tabular-nums">
            ৳{price.toLocaleString()}
          </p>
        ) : (
          <p className="text-[10px] text-amber-600 font-medium mt-1.5">
            Tap to add return
          </p>
        )}
      </div>
    </button>
  );
};
```

---

## Part 5: Mobile-Optimized Sticky Footer

### Fix Bottom Navigation Overlap
```typescript
const POSStickyFooter = ({ 
  total, 
  itemCount, 
  onProceed, 
  disabled 
}: { 
  total: number; 
  itemCount: number; 
  onProceed: () => void; 
  disabled: boolean;
}) => (
  <div className={cn(
    "fixed left-0 right-0 z-40",
    "bg-card/95 backdrop-blur-sm border-t border-border shadow-lg",
    // Mobile: above bottom nav (h-16 = 64px + safe area)
    "bottom-[calc(64px+env(safe-area-inset-bottom))] md:bottom-0",
    "safe-area-pb"
  )}>
    <div className="flex items-center justify-between p-3 max-w-7xl mx-auto gap-4">
      <div className="min-w-0">
        <p className="text-2xl font-bold text-foreground tabular-nums truncate">
          ৳{total.toLocaleString()}
        </p>
        <p className="text-xs text-muted-foreground">
          {itemCount} item{itemCount !== 1 ? 's' : ''}
        </p>
      </div>
      
      <Button
        size="lg"
        onClick={onProceed}
        disabled={disabled}
        className={cn(
          "h-12 px-6 min-w-[140px]",
          "bg-emerald-600 hover:bg-emerald-700",
          "text-base font-semibold shadow-lg"
        )}
      >
        PROCEED →
      </Button>
    </div>
  </div>
);
```

---

## Part 6: Business Diary Integration

### Real-Time Sync Flow
The POS is already connected to Business Diary through the `pos_transactions` table. The `useBusinessDiaryQueries` hook subscribes to changes:

```typescript
// Already implemented in useBusinessDiaryQueries.ts lines 579-595
.on('postgres_changes', { event: '*', schema: 'public', table: 'pos_transactions' }, debouncedInvalidate)
.on('postgres_changes', { event: '*', schema: 'public', table: 'pos_transaction_items' }, debouncedInvalidate)
```

### Ensure Payment Status Sync
```typescript
// In handleCompleteSale - Already correctly implements:
payment_status: finalPaymentStatus, // 'paid' | 'partial' | 'due'
notes: finalPaymentStatus === 'partial' ? `Paid: ৳${actualAmountPaid}, Remaining: ৳${remainingDue}` : null,
```

### Customer Module Sync
```typescript
// Customer dues are updated correctly (lines 1247-1278)
if ((finalPaymentStatus === 'due' || finalPaymentStatus === 'partial') && customerId) {
  await supabase.from('customers').update({
    total_due: (customer.total_due || 0) + remainingDue,
    cylinders_due: (customer.cylinders_due || 0) + totalCylinderDebt,
    billing_status: remainingDue > 0 ? 'pending' : 'clear',
    last_order_date: new Date().toISOString()
  }).eq('id', customerId);
}
```

---

## Part 7: Online Order Integration

### Accept Online Orders in POS
When an online order is accepted, it should auto-populate POS:

```typescript
// Add to POSModule
const handleAcceptOnlineOrder = useCallback(async (orderId: string) => {
  // Fetch order details
  const { data: order } = await supabase
    .from('community_orders')
    .select(`
      *,
      community_order_items (*)
    `)
    .eq('id', orderId)
    .single();
  
  if (!order) return;
  
  // Pre-fill customer
  setPhoneQuery(order.customer_phone);
  setCustomerName(order.customer_name);
  
  // Add items to cart
  order.community_order_items.forEach(item => {
    const saleItem: SaleItem = {
      id: `online-${item.id}`,
      type: 'lpg',
      name: item.brand_name,
      details: `${item.weight} • ${item.product_type} • Online Order`,
      price: Number(item.price),
      quantity: item.quantity,
      cylinderType: 'refill',
      brandId: item.product_id,
      weight: item.weight,
      mouthSize: '22mm',
      brandColor: '#3b82f6'
    };
    setSaleItems(prev => [...prev, saleItem]);
  });
  
  // Add return cylinders
  order.community_order_items
    .filter(item => item.return_cylinder_qty > 0)
    .forEach(item => {
      setReturnItems(prev => [...prev, {
        id: `return-online-${item.id}`,
        brandId: item.product_id || '',
        brandName: item.return_cylinder_brand || item.brand_name,
        brandColor: '#6b7280',
        quantity: item.return_cylinder_qty,
        isLeaked: false,
        weight: item.weight || '12kg'
      }]);
    });
  
  toast.success('Online order loaded into POS');
}, []);
```

---

## Part 8: Touch Target Optimization

### Ensure 48px Minimum Touch Targets
```typescript
// Product cards: min-h-[88px] (already good)
// Buttons: h-10 minimum (need to verify)
// Input fields: h-11 with input-accessible class

// Update all interactive elements:
<Button size="sm" className="h-10 min-w-[44px]" /> // Not h-8
<Input className="h-11 input-accessible" /> // Not h-10
<Select>
  <SelectTrigger className="h-10" />
</Select>
```

---

## Implementation Checklist

| Step | File | Action | Priority |
|------|------|--------|----------|
| 1 | `src/hooks/usePOSData.ts` | Create centralized data hook | Critical |
| 2 | `src/hooks/usePOSCart.ts` | Create cart state hook | Critical |
| 3 | `src/components/pos/POSProductCard.tsx` | Extract product card component | High |
| 4 | `src/components/pos/POSSkeleton.tsx` | Add loading skeleton | High |
| 5 | `src/components/pos/POSQuickStats.tsx` | Add today's stats bar | High |
| 6 | `src/components/pos/POSStickyFooter.tsx` | Fix mobile footer overlap | High |
| 7 | `src/components/pos/POSPaymentDrawer.tsx` | Extract payment modal | Medium |
| 8 | `src/components/pos/POSCustomerLookup.tsx` | Extract customer section | Medium |
| 9 | `POSModule.tsx` | Refactor to use new hooks/components | High |
| 10 | `POSModule.tsx` | Add online order integration handler | Medium |

---

## Success Criteria

After implementation:
1. **Component Size**: Main module reduced from 2,607 lines to ~1,000 lines
2. **Loading Experience**: Skeleton shows immediately, content loads smoothly
3. **Mobile UX**: Footer doesn't overlap with bottom nav, 48px touch targets
4. **Quick Stats**: Today's sales visible without leaving POS
5. **Online Orders**: Can accept and process community orders directly in POS
6. **Real-Time**: Inventory updates instantly, Business Diary syncs within 2 seconds
7. **Payment Flow**: Paid/Partial/Due correctly tracked and synced to Customer module
8. **Performance**: Product grid scrolls smoothly with 100+ products

---

## Testing Scenarios

1. **Quick Sale**: Add product -> Proceed -> Pay Full -> Verify in Business Diary (2s max)
2. **Due Sale**: Add product -> No payment -> Save as Due -> Verify in Customer module
3. **Partial Payment**: Enter ৳500 for ৳1000 bill -> Save -> Verify remaining ৳500 in dues
4. **Return Cylinder**: Add Refill -> Add matching Return -> Complete sale -> Verify inventory
5. **Online Order**: Accept pending order -> Auto-fills cart -> Complete -> Order status updates
6. **Mobile Footer**: On mobile, footer visible above bottom nav, no overlap
7. **Offline Handling**: Disconnect network -> Attempt sale -> Show offline warning
8. **Large Inventory**: 50+ brands -> Grid scrolls smoothly without lag

---

## Files to Create/Modify

### New Files:
- `src/hooks/usePOSData.ts`
- `src/hooks/usePOSCart.ts`
- `src/components/pos/POSProductCard.tsx`
- `src/components/pos/POSSkeleton.tsx`
- `src/components/pos/POSQuickStats.tsx`
- `src/components/pos/POSStickyFooter.tsx`
- `src/components/pos/POSPaymentDrawer.tsx`
- `src/components/pos/POSCustomerLookup.tsx`
- `src/components/pos/POSSaleTable.tsx`
- `src/components/pos/POSReturnTable.tsx`

### Modified Files:
- `src/components/dashboard/modules/POSModule.tsx` (Major refactor)
