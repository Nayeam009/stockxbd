

# Fix Online Marketplace Inventory & System Integration Issues

## Root Cause Analysis

Based on my investigation, I found the following critical issues:

### Issue 1: Inventory Not Updating After Online Sales
**Problem**: When an online order is marked as "Delivered", the inventory sync is failing because:
1. The brand lookup query uses `ilike('%${item.brand_name}%')` which is unreliable when multiple brands have similar names
2. The query is **missing the `size` (valve_size) filter** - there are TWO "Fresh 12kg 22mm" brands with different inventories
3. `.maybeSingle()` returns null or a random match when multiple records exist

**Evidence**: 
- Database shows "Fresh" brand has `refill_cylinder: 2` with `updated_at: 2026-01-29` - NOT updated when the 2026-02-01 order was delivered
- Two "Fresh" brands exist: `id:4a6061b4...` (refill:2) and `id:e87f5be1...` (refill:22)

### Issue 2: Missing Valve Size in Order Items
**Problem**: The `community_order_items` table doesn't store `valve_size`, making it impossible to accurately match inventory

**Solution**: Store valve_size when creating order items, and use `product_id` to look up the shop_product to get accurate valve_size

### Issue 3: Brand Matching Logic is Too Loose
**Problem**: Using `ilike('%{brand}%')` for brand matching is dangerous - "Fresh" could match "Fresh LPG", "Fresh Gas", etc.

**Solution**: Use exact match and include valve_size filter

---

## Technical Implementation Plan

### Step 1: Add Valve Size Column to Order Items Table

```sql
ALTER TABLE community_order_items ADD COLUMN valve_size text;
```

This allows accurate inventory matching.

### Step 2: Update Order Item Creation (useCommunityData.ts)

Modify the `placeOrder` function to include `valve_size`:

```typescript
// In useCommunityData.ts, lines 326-337
const orderItems = items.map(item => ({
  order_id: orderData.id,
  product_id: item.id,
  product_name: `${item.brand_name} ${item.weight || ''}`.trim(),
  product_type: item.product_type,
  brand_name: item.brand_name,
  weight: item.weight,
  valve_size: item.valve_size || '22mm',  // ADD THIS
  quantity: item.quantity,
  price: item.price,
  return_cylinder_qty: item.return_cylinder_qty || 0,
  return_cylinder_type: item.return_cylinder_type
}));
```

### Step 3: Update OrderItem Interface (ShopOrdersTab.tsx)

Add `valve_size` to the OrderItem interface:

```typescript
interface OrderItem {
  id: string;
  product_name: string;
  product_type: string;
  brand_name: string | null;
  weight: string | null;
  valve_size: string | null;  // ADD THIS
  quantity: number;
  price: number;
  return_cylinder_qty: number;
  return_cylinder_type: 'empty' | 'leaked' | null;
}
```

### Step 4: Fix Inventory Sync Logic (ShopOrdersTab.tsx)

Replace the unreliable brand lookup with accurate matching:

```typescript
// Current broken code (lines 346-352):
const { data: brand } = await supabase
  .from('lpg_brands')
  .select('id, refill_cylinder, package_cylinder, empty_cylinder, problem_cylinder, weight')
  .ilike('name', `%${item.brand_name}%`)  // BROKEN - too loose
  .eq('owner_id', ownerId)
  .eq('weight', item.weight || '12kg')
  .maybeSingle();

// Fixed code:
// First try to get valve_size from shop_products via product_id
let valveSize = item.valve_size || '22mm';
if (!item.valve_size && item.product_id) {
  const { data: shopProduct } = await supabase
    .from('shop_products')
    .select('valve_size')
    .eq('id', item.product_id)
    .maybeSingle();
  if (shopProduct?.valve_size) {
    valveSize = shopProduct.valve_size;
  }
}

const { data: brand } = await supabase
  .from('lpg_brands')
  .select('id, refill_cylinder, package_cylinder, empty_cylinder, problem_cylinder, weight')
  .eq('name', item.brand_name)  // EXACT match, not ilike
  .eq('owner_id', ownerId)
  .eq('weight', item.weight || '12kg')
  .eq('size', valveSize)  // ADD valve_size filter
  .maybeSingle();
```

### Step 5: Add product_id to OrderItem Interface

```typescript
interface OrderItem {
  id: string;
  product_id: string | null;  // ADD THIS - to lookup shop_products
  product_name: string;
  product_type: string;
  brand_name: string | null;
  weight: string | null;
  valve_size: string | null;
  quantity: number;
  price: number;
  return_cylinder_qty: number;
  return_cylinder_type: 'empty' | 'leaked' | null;
}
```

### Step 6: Ensure Return Cylinder Brand Matching

For return cylinders, we also need to update the matching. Currently the return cylinder doesn't track brand properly for inventory sync. Add logic to handle return cylinder brand:

```typescript
// After updating sold stock, also handle return cylinder for different brand scenario
const returnBrand = item.return_cylinder_brand || item.brand_name;
if (returnBrand && returnBrand !== item.brand_name && item.return_cylinder_qty > 0) {
  // Different brand return - find that brand's inventory
  const { data: returnBrandData } = await supabase
    .from('lpg_brands')
    .select('id, empty_cylinder, problem_cylinder')
    .eq('name', returnBrand)
    .eq('owner_id', ownerId)
    .eq('weight', item.weight || '12kg')
    .eq('size', valveSize)
    .maybeSingle();
    
  if (returnBrandData) {
    const returnUpdatePayload: Record<string, any> = {
      updated_at: new Date().toISOString()
    };
    if (item.return_cylinder_type === 'leaked') {
      returnUpdatePayload.problem_cylinder = (returnBrandData.problem_cylinder || 0) + item.return_cylinder_qty;
    } else {
      returnUpdatePayload.empty_cylinder = (returnBrandData.empty_cylinder || 0) + item.return_cylinder_qty;
    }
    await supabase.from('lpg_brands').update(returnUpdatePayload).eq('id', returnBrandData.id);
  }
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/dashboard/modules/shop-profile/ShopOrdersTab.tsx` | Fix OrderItem interface, fix inventory sync brand matching with exact name and size filter |
| `src/hooks/useCommunityData.ts` | Add valve_size when creating order items |
| Database Migration | Add `valve_size` column to `community_order_items` table |

---

## Verification Checklist

After implementation:
- [ ] Create a new online order for "Fresh 12kg 22mm Refill"
- [ ] Confirm the order → Verify POS transaction created
- [ ] Dispatch the order → Verify status changes
- [ ] Deliver the order → Verify:
  - Refill stock decreases by quantity sold
  - Empty stock increases by return cylinder quantity
  - Business Diary shows the sale tagged as "Online"
  - Customer module has the customer record

---

## Summary of Fixes

| Problem | Root Cause | Solution |
|---------|------------|----------|
| Inventory not updating | Brand lookup uses loose `ilike` matching and missing size filter | Use exact `eq` match with `name`, `weight`, AND `size` |
| Wrong brand matched | Multiple brands with same name/weight but different sizes | Add valve_size to order items and use it in query |
| Inconsistent sync | Query returns wrong or no brand | Fallback to shop_products via product_id for valve_size |

This plan ensures the complete online order flow properly syncs with inventory, POS, Customer module, and Business Diary.

