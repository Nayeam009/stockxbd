
# Plan: Add Real-Time Stock Preview for Gas Stoves & Regulators in POS

## ✅ COMPLETED

All changes have been implemented successfully.

## Summary of Changes

### 1. `src/hooks/usePOSCart.ts`
- Added `getPendingStoveStock(stoveId)` function to calculate pending stove quantities in cart
- Added `getPendingRegulatorStock(regulatorId)` function to calculate pending regulator quantities in cart
- Exported both functions in the return object

### 2. `src/components/pos/POSProductCard.tsx`
- Updated `StoveProductCard` to accept optional `pendingStock` prop
- Updated `RegulatorProductCard` to accept optional `pendingStock` prop
- Both cards now calculate `displayStock = Math.max(0, quantity - pendingStock)`
- Badge shows pending indicator in amber color (e.g., "7 (-3)")
- Cards become disabled when `displayStock <= 0`

### 3. `src/components/dashboard/modules/POSModule.tsx`
- Updated stove card rendering to pass `pendingStock={cart.getPendingStoveStock(stove.id)}`
- Updated regulator card rendering to pass `pendingStock={cart.getPendingRegulatorStock(reg.id)}`

## Expected Behavior

When stoves/regulators are added to the cart:
- Badge shows reduced stock with pending count in amber (e.g., "7 (-3)")
- "Out" badge appears when display stock reaches 0
- Card becomes disabled when out of stock
- After sale completion, database updates and real-time subscription refreshes the actual quantity
