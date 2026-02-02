
# Plan: Add Real-Time Stock Preview for Gas Stoves & Regulators in POS

## Problem Identified
The POS product cards for **Gas Stoves** and **Regulators** don't show real-time stock changes when items are added to the cart. Unlike LPG cylinders which use the `pendingStock` prop to preview the stock reduction, stoves and regulators directly display their database quantity without accounting for items currently in the cart.

## Root Cause Analysis

```text
┌─────────────────────────────────────────────────────────────────┐
│ LPG Cards (Working)                                             │
├─────────────────────────────────────────────────────────────────┤
│ • Receives pendingStock = cart.getPendingStock(brandId, type)   │
│ • Displays: displayStock = baseStock - pendingStock             │
│ • Shows: "10 (-2)" when 2 items are in cart                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Stove/Regulator Cards (NOT Working)                             │
├─────────────────────────────────────────────────────────────────┤
│ • No pendingStock prop                                          │
│ • Displays: stove.quantity directly                             │
│ • Shows: "10" even when 5 items are in cart                     │
└─────────────────────────────────────────────────────────────────┘
```

## Technical Solution

### Step 1: Add Pending Stock Functions to `usePOSCart.ts`

Add two new functions to calculate pending quantities for stoves and regulators:

```typescript
// Get pending stock for a stove by ID
const getPendingStoveStock = useCallback((stoveId: string) => {
  return saleItems
    .filter(i => i.type === 'stove' && i.stoveId === stoveId)
    .reduce((sum, i) => sum + i.quantity, 0);
}, [saleItems]);

// Get pending stock for a regulator by ID
const getPendingRegulatorStock = useCallback((regulatorId: string) => {
  return saleItems
    .filter(i => i.type === 'regulator' && i.regulatorId === regulatorId)
    .reduce((sum, i) => sum + i.quantity, 0);
}, [saleItems]);
```

### Step 2: Update `StoveProductCard` Component

Modify the card to accept and display `pendingStock`:

```typescript
interface StoveCardProps {
  stove: Stove;
  price: number;
  pendingStock: number;  // NEW
  onClick: () => void;
}

// Calculate display stock
const displayStock = Math.max(0, stove.quantity - pendingStock);
const isOutOfStock = displayStock <= 0;

// Badge display
{displayStock > 0 ? (
  <span className="flex items-center gap-0.5">
    {displayStock}
    {pendingStock > 0 && (
      <span className="text-amber-600">(-{pendingStock})</span>
    )}
  </span>
) : 'Out'}
```

### Step 3: Update `RegulatorProductCard` Component

Same changes as StoveProductCard:

```typescript
interface RegulatorCardProps {
  regulator: Regulator;
  price: number;
  pendingStock: number;  // NEW
  onClick: () => void;
}

// Calculate display stock
const displayStock = Math.max(0, regulator.quantity - pendingStock);
const isOutOfStock = displayStock <= 0;
```

### Step 4: Update `POSModule.tsx` to Pass Pending Stock

Pass the pending stock when rendering stove and regulator cards:

```typescript
// Stoves
<StoveProductCard 
  key={stove.id} 
  stove={stove} 
  price={getStovePrice(stove.brand, stove.model) || stove.price}
  pendingStock={cart.getPendingStoveStock(stove.id)}  // NEW
  onClick={() => cart.addStoveToCart(...)} 
/>

// Regulators
<RegulatorProductCard 
  key={reg.id} 
  regulator={reg} 
  price={getRegulatorPrice(reg.brand, reg.type) || reg.price || 0}
  pendingStock={cart.getPendingRegulatorStock(reg.id)}  // NEW
  onClick={() => cart.addRegulatorToCart(...)} 
/>
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/usePOSCart.ts` | Add `getPendingStoveStock` and `getPendingRegulatorStock` functions |
| `src/components/pos/POSProductCard.tsx` | Update `StoveProductCard` and `RegulatorProductCard` to accept and display `pendingStock` |
| `src/components/dashboard/modules/POSModule.tsx` | Pass `pendingStock` prop to stove and regulator cards |

## Expected Behavior After Fix

```text
Before:
┌────────────┐  ┌────────────┐
│ Stove      │  │ Stove      │
│ qty: 10    │  │ qty: 10    │  (Still shows 10 after adding 3)
└────────────┘  └────────────┘

After:
┌────────────┐  ┌────────────┐
│ Stove      │  │ Stove      │
│ qty: 7(-3) │  │ qty: 7(-3) │  (Shows 7 with pending indicator)
└────────────┘  └────────────┘
```

When items are added to the cart:
- Badge shows reduced stock with pending count in amber
- "Out" badge appears when display stock reaches 0
- Card becomes disabled when out of stock
- After sale completion, database updates and real-time subscription refreshes the actual quantity
