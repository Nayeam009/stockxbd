
## Fix: Foreign Key Constraint Violation on POS Checkout

### Root Cause

The error `insert or update on table "pos_transaction_items" violates foreign key constraint "pos_transaction_items_product_id_fkey"` occurs because:

1. In `POSModule.tsx` line 270, the code builds the RPC payload with:
   ```js
   product_id: item.brandId || item.stoveId || item.regulatorId || null
   ```
2. The `pos_transaction_items.product_id` column has a foreign key pointing to the `products` table
3. But `brandId`, `stoveId`, and `regulatorId` are UUIDs from `lpg_brands`, `stoves`, and `regulators` tables — **not** from `products`
4. The database rejects the insert because those UUIDs don't exist in `products`

### Why This Is Correct By Design

The architecture memory note explicitly states: *"POS transaction items use a nullable product_id. This prevents silent insertion failures caused by foreign key constraint violations if a product reference is missing or invalid. By falling back to null instead of an incorrect ID, the system ensures that every sale—including those for custom or unlisted items—is accurately recorded."*

The actual inventory references are carried separately in the JSONB payload via `brand_id`, `stove_id`, `regulator_id` — the `product_id` field in the line item table is just for legacy/generic product lookup, not LPG inventory.

### Fix Plan

**Two-part fix:**

**Part 1 — Database migration (schema change):**
Drop the foreign key constraint `pos_transaction_items_product_id_fkey` from `pos_transaction_items`. The column remains nullable (which is correct), but it will no longer enforce a reference to the `products` table. This aligns with the existing architecture where inventory tracking is done via `brand_id`/`stove_id`/`regulator_id` in the RPC, not through `product_id`.

```sql
ALTER TABLE public.pos_transaction_items 
  DROP CONSTRAINT IF EXISTS pos_transaction_items_product_id_fkey;
```

**Part 2 — Code fix in `POSModule.tsx`:**
Set `product_id` to `null` always in the RPC payload (since it's not used for inventory lookup and causes FK violations). The inventory IDs are already correctly passed via `brand_id`, `stove_id`, and `regulator_id` in the same payload object.

```js
// Before (line 270):
product_id: item.brandId || item.stoveId || item.regulatorId || null,

// After:
product_id: null,  // FK is removed; inventory refs are in brand_id/stove_id/regulator_id
```

### What This Does NOT Break

- Inventory updates still work correctly — the `complete_pos_sale` RPC uses `brand_id`, `stove_id`, `regulator_id` from the JSONB to update `lpg_brands`, `stoves`, and `regulators`
- Transaction records are still fully inserted with all item details
- Business Diary aggregation is unaffected — it reads from `pos_transactions` and `pos_transaction_items.product_name`/`quantity`/`price`
- RLS policies are unaffected

### Files Changed

1. **Database migration** — Drop FK constraint on `pos_transaction_items.product_id`
2. **`src/components/dashboard/modules/POSModule.tsx`** — Set `product_id: null` in the RPC items payload
