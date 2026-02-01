# Plan Completed

The online marketplace inventory sync has been fixed:

## Changes Made

1. **Database**: Added `valve_size` column to `community_order_items` table
2. **Order Creation** (`useCommunityData.ts`): Now stores `valve_size` when creating order items
3. **Inventory Sync** (`ShopOrdersTab.tsx`): 
   - Updated `OrderItem` interface with `product_id`, `valve_size`, `return_cylinder_brand`
   - Fixed brand lookup to use EXACT `.eq()` matching instead of loose `.ilike()`
   - Added `size` (valve_size) filter to brand query
   - Added fallback to fetch valve_size from `shop_products` via `product_id`
   - Added support for different brand return cylinders

## Result

Online orders now properly:
- Create POS transactions on confirmation
- Sync inventory on delivery (refill/package -qty, empty/problem +return_qty)
- Use exact brand + weight + size matching for accuracy
