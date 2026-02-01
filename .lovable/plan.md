# Online Order Flow - Completed

## Fixes Applied

1. **Database**: Added `valve_size` column to `community_order_items` (backfilled all NULL values to '22mm')
2. **Order Creation**: Now stores `valve_size` when placing orders
3. **Inventory Sync**: Uses exact matching with `name`, `weight`, `size`, AND `is_active=true`
4. **Duplicate Prevention**: Checks for existing POS transaction before creating new one
5. **POS Items**: Fixed FK constraint issue by using `product_id: null`
6. **Interfaces**: Updated OrderItem and CommunityOrderItem with new fields

## Complete Flow
Customer → Order → Owner Confirms → POS Created → Dispatched → Delivered → Inventory Synced → Business Diary Tagged "Online"

## Technical Details

### Brand Matching (ShopOrdersTab.tsx lines 380-388)
```typescript
const { data: brand } = await supabase
  .from('lpg_brands')
  .select('id, refill_cylinder, package_cylinder, empty_cylinder, problem_cylinder')
  .eq('name', item.brand_name)
  .eq('owner_id', ownerId)
  .eq('weight', item.weight || '12kg')
  .eq('size', valveSize)
  .eq('is_active', true)
  .maybeSingle();
```

### Duplicate POS Prevention (lines 332-346)
```typescript
const { data: existingTxn } = await supabase
  .from('pos_transactions')
  .select('id, transaction_number')
  .eq('community_order_id', order.id)
  .maybeSingle();

if (!existingTxn) {
  // Create POS transaction
}
```

## Verification Checklist
- [x] valve_size stored in order items
- [x] Exact brand matching with all filters
- [x] POS transaction linked via community_order_id
- [x] Duplicate prevention in place
- [x] Inventory updates on delivery (refill--, empty++)
- [x] Business Diary shows online sales
- [x] Customer module tracks customers by phone
