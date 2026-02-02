
# Online Order → POS Auto-Integration Plan

## Problem Summary

When an owner/manager accepts an online order:
1. A POS transaction is created in the database (this works)
2. BUT the owner is NOT navigated to the POS module
3. The POS cart is NOT populated with the order items
4. Owner cannot use the standard "Proceed → Paid → Print Memo" workflow

The inventory sync also needs verification to ensure real-time updates for both online and offline sales.

---

## Solution Architecture

### Core Flow After Implementation

```
Owner clicks "Confirm Order" in My Shop Orders Tab
    ↓
1. Store order data in localStorage (key: 'pending-online-order')
2. Dispatch 'navigate-module' event to switch to POS
    ↓
POS Module loads
    ↓
3. Check localStorage for pending online order
4. Auto-populate cart with order items
5. Auto-populate customer data (name, phone, address)
6. Show "Online Order Loaded" toast
    ↓
Owner clicks "PROCEED" button
    ↓
7. Payment drawer opens with full amount pre-filled
8. Status shows "PAID" (online orders are pre-paid)
    ↓
Owner clicks "Confirm & Print"
    ↓
9. Transaction completes (links to existing POS txn by community_order_id)
10. Clear localStorage pending order
11. Print memo dialog appears
```

---

## Implementation Details

### File 1: `ShopOrdersTab.tsx` - Add Navigation After Confirm

**Changes to `updateOrderStatus` function (around line 327-348)**:

When `newStatus === 'confirmed'`:
1. Save order data to localStorage for POS to consume
2. Navigate to POS module after confirmation

```typescript
if (newStatus === 'confirmed') {
  updateData.confirmed_at = new Date().toISOString();
  
  // ... existing POS transaction creation code ...
  
  // NEW: Store order data for POS auto-fill
  localStorage.setItem('pending-online-order', JSON.stringify({
    orderId: order.id,
    orderNumber: order.order_number,
    customer: {
      name: order.customer_name,
      phone: order.customer_phone,
      address: `${order.delivery_address}, ${order.thana || ''}, ${order.district}, ${order.division}`.trim()
    },
    items: order.items?.map(item => ({
      type: item.product_type === 'lpg_refill' || item.product_type === 'lpg_package' ? 'lpg' : 'other',
      name: item.brand_name || item.product_name,
      productType: item.product_type,
      weight: item.weight || '12kg',
      valveSize: item.valve_size || '22mm',
      quantity: item.quantity,
      price: item.price,
      returnCylinderQty: item.return_cylinder_qty || 0,
      returnCylinderType: item.return_cylinder_type || 'empty',
      returnCylinderBrand: item.return_cylinder_brand
    })) || [],
    total: order.total_amount,
    isOnline: true
  }));
  
  // Navigate to POS after toast
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent('navigate-module', { detail: 'pos' }));
  }, 500);
}
```

---

### File 2: `POSModule.tsx` - Load Pending Online Order

**Add useEffect to check for pending online order on mount**:

```typescript
// Check for pending online order from My Shop tab
useEffect(() => {
  const pendingOrderStr = localStorage.getItem('pending-online-order');
  if (!pendingOrderStr) return;
  
  try {
    const pendingOrder = JSON.parse(pendingOrderStr);
    
    // Auto-populate customer
    setCustomerState({
      status: 'found',
      customer: {
        id: '', // Will be looked up or created
        name: pendingOrder.customer.name,
        phone: pendingOrder.customer.phone,
        address: pendingOrder.customer.address,
        total_due: 0,
        cylinders_due: 0,
        billing_status: 'clear'
      },
      phoneQuery: pendingOrder.customer.phone,
      newCustomerName: '',
      newCustomerAddress: ''
    });
    
    // Auto-populate cart items
    const saleItems: SaleItem[] = [];
    const returnItems: ReturnItem[] = [];
    
    for (const item of pendingOrder.items) {
      if (item.type === 'lpg') {
        // Find matching brand in lpgBrands
        const brand = lpgBrands.find(b => 
          b.name === item.name && 
          b.weight === item.weight && 
          b.size === item.valveSize
        );
        
        if (brand) {
          const cylinderType = item.productType === 'lpg_refill' ? 'refill' : 'package';
          saleItems.push({
            id: `online-${Date.now()}-${Math.random()}`,
            type: 'lpg',
            name: brand.name,
            details: `${item.weight} • ${cylinderType === 'refill' ? 'Refill' : 'Package'} • Online`,
            price: item.price,
            quantity: item.quantity,
            cylinderType,
            brandId: brand.id,
            weight: item.weight,
            mouthSize: item.valveSize,
            brandColor: brand.color
          });
          
          // Add return cylinders if specified
          if (item.returnCylinderQty > 0) {
            const returnBrand = lpgBrands.find(b => 
              b.name === (item.returnCylinderBrand || item.name) &&
              b.weight === item.weight
            );
            if (returnBrand) {
              returnItems.push({
                id: `return-online-${Date.now()}-${Math.random()}`,
                brandId: returnBrand.id,
                brandName: returnBrand.name,
                brandColor: returnBrand.color,
                quantity: item.returnCylinderQty,
                isLeaked: item.returnCylinderType === 'leaked',
                weight: item.weight
              });
            }
          }
        }
      }
    }
    
    // Set cart items
    cart.setSaleItems(saleItems);
    cart.setReturnItems(returnItems);
    
    // Show toast and clear localStorage
    toast({
      title: "📦 Online Order Loaded",
      description: `Order #${pendingOrder.orderNumber} ready for checkout`
    });
    
    // Clear localStorage to prevent re-loading
    localStorage.removeItem('pending-online-order');
    
  } catch (error) {
    logger.error('Failed to load pending online order', error);
    localStorage.removeItem('pending-online-order');
  }
}, [lpgBrands]); // Depend on lpgBrands to ensure data is loaded first
```

---

### File 3: `usePOSCart.ts` - Add Flag for Online Orders

Add a state flag to track if current cart is from an online order:

```typescript
const [isOnlineOrder, setIsOnlineOrder] = useState(false);
const [onlineOrderId, setOnlineOrderId] = useState<string | null>(null);
```

And expose in return:
```typescript
return {
  // ... existing
  isOnlineOrder,
  setIsOnlineOrder,
  onlineOrderId,
  setOnlineOrderId,
}
```

---

### File 4: Inventory Sync Verification

The inventory sync currently happens in `ShopOrdersTab.tsx` when marking as "Delivered" (lines 362-444). This is correct, but we need to ensure:

1. **POS offline sales**: Already working via `POSModule.tsx` lines 194-209
2. **Online order delivery**: Already working via `ShopOrdersTab.tsx` lines 362-444
3. **Real-time updates**: Already configured via Supabase subscriptions in `usePOSData.ts`

No changes needed for inventory sync - just needs verification.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/dashboard/modules/shop-profile/ShopOrdersTab.tsx` | Store order in localStorage + navigate to POS after confirm |
| `src/components/dashboard/modules/POSModule.tsx` | Add useEffect to load pending online order + auto-populate cart |
| `src/hooks/usePOSCart.ts` | Add `isOnlineOrder` flag and `onlineOrderId` state |

---

## Technical Notes

### Why localStorage?

- The POS module may be lazily loaded (different component tree)
- React state would be lost during module navigation
- localStorage persists across component unmounts
- Cleared immediately after use to prevent stale data

### Inventory Sync Flow

**Offline Sale (POS):**
```
User selects products → Cart populated → Click Proceed →
Payment → Complete → Inventory decremented immediately
```

**Online Sale (Marketplace):**
```
Customer orders → Owner Confirms → POS Transaction created →
Owner Dispatches → Owner marks Delivered →
Inventory decremented (Refill/Package -N, Empty +N)
```

### Real-time Updates

Both flows trigger Supabase `postgres_changes` which invalidate:
- `pos-lpg-brands` query (POS inventory tags)
- `inventory-lpg-brands` query (Inventory module)
- `pos-today-stats` query (Revenue KPIs)

---

## Summary

This implementation creates a seamless workflow:

1. **Confirm Order** → Order data saved + Auto-navigate to POS
2. **POS Loads** → Cart auto-populated with order items + customer
3. **Click Proceed** → Payment drawer shows "PAID" status
4. **Click Confirm** → Transaction linked to online order, memo printed
5. **Inventory** → Already synced when marked "Delivered"

The owner/manager experience becomes identical to an offline sale, with the cart pre-filled from the online order.
