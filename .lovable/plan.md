

# Fix Online Marketplace, Shop & Customer Issues - Complete Plan

## Overview
This plan addresses all identified issues in the Online Marketplace (LPG Community), Shop Management, and Customer-facing components. The focus is on fixing bugs, improving data flow, adding missing features, and optimizing performance.

---

## Issues Identified

### Category 1: Data Flow & Consistency Issues

| Issue | Location | Description |
|-------|----------|-------------|
| N+1 Query Problem | `ShopOrdersTab.tsx` line 143-150 | Fetches order items one-by-one in a loop instead of batch |
| Missing phone/WhatsApp display | `shop_profiles_public` view | Phone not included in public view but needed on shop detail page |
| Cart persistence issues | `CustomerCart.tsx`, `ShopProfile.tsx` | Cart syncs to localStorage but no validation if shop_id is present |
| Missing shop_id fallback | `CustomerCheckout.tsx` line 185 | Already has fallback but inconsistent with other components |

### Category 2: Missing Features

| Feature | Location | Description |
|---------|----------|-------------|
| Inventory sync on delivery | `ShopOrdersTab.tsx` | "Verify Empty Return" button exists but doesn't update inventory |
| Customer cylinder verification | Order acceptance | Shop owner should see customer cylinder photo before accepting |
| Order items display | `OrderCard.tsx` | Order card doesn't show what products were ordered |
| WhatsApp/Phone on public shop | `ShopCard.tsx` | No contact info visible until you open shop detail |

### Category 3: UX/Performance Issues

| Issue | Location | Impact |
|-------|----------|--------|
| No skeleton on shop products tab | `ShopProductsTab.tsx` | Flash of empty content during load |
| Redundant data fetching | Multiple hooks | `useCommunityData` and `useCommunityQueries` both used in some places |
| Missing real-time on customer orders | `CustomerOrders.tsx` | Customer doesn't see order status updates in real-time |
| No pull-to-refresh on mobile | Community pages | Mobile users expect this pattern |

### Category 4: Logic Issues

| Issue | Location | Description |
|-------|----------|-------------|
| Wholesale/Retail price not differentiated | `OnlineProductSelector.tsx` | Shows same price regardless of customer type (owner vs customer) |
| Return cylinder brand validation | `OnlineProductSelector.tsx` | Should validate return brand matches buy brand per requirements |
| Order status flow gap | `ShopOrdersTab.tsx` | Missing "preparing" status in workflow |
| Self-order test flag not visually clear | Order cards | Test orders should be more prominently marked |

---

## Part 1: Fix N+1 Query in Shop Orders

### Current Code Problem (`ShopOrdersTab.tsx` lines 143-150)
```typescript
// BAD: N+1 - fetches items one by one
const ordersWithItems = await Promise.all(
  (ordersData || []).map(async (order) => {
    const { data: items } = await supabase
      .from('community_order_items')
      .select('*')
      .eq('order_id', order.id);
    return { ...order, items: items || [] };
  })
);
```

### Fixed Code
```typescript
// GOOD: Batch fetch all items in single query
const orderIds = (ordersData || []).map(o => o.id);
const { data: allItems } = await supabase
  .from('community_order_items')
  .select('*')
  .in('order_id', orderIds);

// Map items to orders
const itemsMap = new Map<string, OrderItem[]>();
allItems?.forEach(item => {
  const existing = itemsMap.get(item.order_id) || [];
  itemsMap.set(item.order_id, [...existing, item]);
});

const ordersWithItems = (ordersData || []).map(order => ({
  ...order,
  items: itemsMap.get(order.id) || []
}));
```

---

## Part 2: Add Real-time to Customer Orders Page

### File: `CustomerOrders.tsx`
Add Supabase subscription for order status updates:

```typescript
useEffect(() => {
  if (!currentUser?.id) return;

  const channel = supabase
    .channel('customer-orders-realtime')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'community_orders',
        filter: `customer_id=eq.${currentUser.id}`
      },
      () => {
        refetch(); // Trigger TanStack Query refetch
        toast({ title: "Order updated!", description: "Your order status has changed" });
      }
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, [currentUser?.id, refetch]);
```

---

## Part 3: Add Order Items Display to OrderCard

### File: `OrderCard.tsx`
Add items summary section:

```typescript
{/* Order Items Summary */}
{order.items && order.items.length > 0 && (
  <div className="space-y-1.5 py-2 border-t border-border">
    <p className="text-xs text-muted-foreground font-medium">Items:</p>
    {order.items.slice(0, 3).map((item, idx) => (
      <div key={idx} className="flex items-center justify-between text-sm">
        <span className="text-foreground">
          {item.product_name} x{item.quantity}
        </span>
        <span className="text-muted-foreground tabular-nums">
          ৳{(item.price * item.quantity).toLocaleString()}
        </span>
      </div>
    ))}
    {order.items.length > 3 && (
      <p className="text-xs text-muted-foreground">
        +{order.items.length - 3} more items
      </p>
    )}
  </div>
)}
```

---

## Part 4: Add Inventory Sync on Delivery Verification

### File: `ShopOrdersTab.tsx`
When "Verify Empty Return" is clicked, update inventory:

```typescript
const handleVerifyDelivery = async (order: CommunityOrder) => {
  if (!order.items) return;

  try {
    // 1. Update order status
    await supabase
      .from('community_orders')
      .update({
        status: 'delivered',
        delivered_at: new Date().toISOString(),
        return_cylinder_verified: true,
        verified_at: new Date().toISOString(),
        verified_by: (await supabase.auth.getUser()).data.user?.id
      })
      .eq('id', order.id);

    // 2. Update inventory for each refill item
    for (const item of order.items) {
      if (item.product_type === 'lpg_refill') {
        // Find matching LPG brand
        const { data: brand } = await supabase
          .from('lpg_brands')
          .select('id, refill_cylinder, empty_cylinder')
          .eq('name', item.brand_name)
          .eq('weight', item.weight)
          .eq('owner_id', ownerId)
          .single();

        if (brand) {
          // Reduce refill, increase empty
          await supabase
            .from('lpg_brands')
            .update({
              refill_cylinder: Math.max(0, brand.refill_cylinder - item.quantity),
              empty_cylinder: brand.empty_cylinder + (item.return_cylinder_qty || 0)
            })
            .eq('id', brand.id);
        }
      }
    }

    toast({ title: "Delivery verified", description: "Inventory updated" });
    fetchData();
  } catch (error) {
    toast({ title: "Error", variant: "destructive" });
  }
};
```

---

## Part 5: Add Customer Cylinder Photo to Order Acceptance

### File: `ShopOrdersTab.tsx`
When owner views pending order, show customer cylinder photo:

```typescript
// Fetch customer cylinder profile when viewing order
const [customerCylinder, setCustomerCylinder] = useState<any>(null);

const fetchCustomerCylinder = async (customerId: string) => {
  const { data } = await supabase
    .from('customer_cylinder_profiles')
    .select('*')
    .eq('user_id', customerId)
    .maybeSingle();
  setCustomerCylinder(data);
};

// In order card:
{customerCylinder?.cylinder_photo_url && (
  <div className="mt-2">
    <p className="text-xs text-muted-foreground mb-1">Customer's Cylinder</p>
    <img 
      src={customerCylinder.cylinder_photo_url} 
      alt="Customer cylinder"
      className="w-20 h-20 object-cover rounded-lg border"
    />
    <Badge className="mt-1">
      {customerCylinder.brand_name} • {customerCylinder.weight}
    </Badge>
  </div>
)}
```

---

## Part 6: Add Return Brand Validation

### File: `OnlineProductSelector.tsx`
Add validation that return cylinder brand matches purchase brand:

```typescript
const handleCheckout = () => {
  // ... existing validation ...

  // NEW: Validate return brand matches buy brand
  for (const item of saleItems.filter(i => i.product.product_type === 'lpg_refill')) {
    const linkedReturn = returnItems.find(r => 
      r.brandName === item.product.brand_name && r.weight === item.product.weight
    );
    
    if (!linkedReturn) {
      toast({
        title: "Return Brand Mismatch",
        description: `For ${item.product.brand_name}, you must return the same brand cylinder`,
        variant: "destructive"
      });
      return;
    }
  }

  // Continue with checkout...
};
```

---

## Part 7: Add Wholesale/Retail Price Differentiation

### File: `OnlineProductSelector.tsx`
Show different prices based on customer type:

```typescript
interface OnlineProductSelectorProps {
  products: ShopProduct[];
  onCheckout: (items: CartItem[]) => void;
  isWholesale?: boolean; // Already exists
  shopId?: string;
}

// In product display:
const getDisplayPrice = (product: ShopProduct) => {
  // If wholesale customer, apply 10% discount (or fetch from pricing table)
  if (isWholesale) {
    return Math.round(product.price * 0.9); // 10% wholesale discount
  }
  return product.price;
};

// Show price badge:
<Badge className={isWholesale ? "bg-blue-500" : "bg-emerald-500"}>
  {isWholesale ? "Wholesale" : "Retail"}: ৳{getDisplayPrice(product)}
</Badge>
```

---

## Part 8: Fix Missing Loading States

### File: `ShopProductsTab.tsx`
Add skeleton loading:

```typescript
if (loading) {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-10 w-24 rounded-md" />
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
```

---

## Part 9: Consolidate Community Data Hooks

### Issue
Two hooks exist: `useCommunityData.ts` (original) and `useCommunityQueries.ts` (TanStack Query optimized).

### Solution
Gradually migrate to TanStack Query version:
1. `CustomerOrders.tsx` - Already uses `useCommunityQueries` (good)
2. `Community.tsx` - Still uses `useCommunityData` - migrate
3. `ShopProfile.tsx` - Still uses `useCommunityData` - migrate

### Migration Pattern
```typescript
// Before (useCommunityData)
const { shops, loading, fetchShops } = useCommunityData();

// After (useCommunityQueries) 
const { data: shops = [], isLoading: loading, refetch } = useShopList(filters);
```

---

## Part 10: Add Phone/WhatsApp to Shop Card (Optional Display)

### Issue
Shop cards don't show contact info - users must click to see it.

### Solution
Add subtle contact action on hover/focus:

```typescript
// In ShopCard.tsx - add quick contact buttons on hover
<div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
  {shop.phone && (
    <a href={`tel:${shop.phone}`} onClick={(e) => e.stopPropagation()}>
      <Button size="icon" variant="secondary" className="h-8 w-8">
        <Phone className="h-4 w-4" />
      </Button>
    </a>
  )}
</div>
```

Note: Phone data is only available for authenticated users viewing shop detail page for security.

---

## Implementation Steps

### Step 1: Fix N+1 Query (Critical)
- Update `ShopOrdersTab.tsx` with batch fetch

### Step 2: Add Real-time to Customer Orders
- Add Supabase subscription in `CustomerOrders.tsx`

### Step 3: Add Order Items to OrderCard
- Update `OrderCard.tsx` to display items summary

### Step 4: Implement Inventory Sync on Delivery
- Add `handleVerifyDelivery` function with inventory updates

### Step 5: Add Customer Cylinder Photo Display
- Fetch and display cylinder profile in order acceptance flow

### Step 6: Add Return Brand Validation
- Update `OnlineProductSelector.tsx` checkout validation

### Step 7: Add Loading Skeletons
- Update `ShopProductsTab.tsx` and other components

### Step 8: Migrate to TanStack Query
- Update `Community.tsx` to use cached queries

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/dashboard/modules/shop-profile/ShopOrdersTab.tsx` | Fix N+1, add inventory sync, add cylinder photo |
| `src/pages/CustomerOrders.tsx` | Add real-time subscription |
| `src/components/community/OrderCard.tsx` | Add items display |
| `src/components/community/OnlineProductSelector.tsx` | Add brand validation, wholesale pricing |
| `src/components/dashboard/modules/shop-profile/ShopProductsTab.tsx` | Add loading skeleton |
| `src/pages/Community.tsx` | Migrate to TanStack Query |

---

## Summary

| Aspect | Before | After |
|--------|--------|-------|
| Order fetch | N+1 (100 orders = 101 queries) | Batch (100 orders = 2 queries) |
| Customer real-time | No real-time updates | Live order status updates |
| Order items visibility | Hidden | Visible in order cards |
| Inventory sync | Manual only | Auto-sync on delivery verification |
| Return brand validation | None | Enforced same-brand return |
| Loading states | Missing in some areas | Skeleton everywhere |
| Query hooks | Two separate systems | Unified TanStack Query |

This plan ensures the marketplace, shop management, and customer experience work seamlessly as a unified e-commerce ecosystem.

