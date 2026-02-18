
# Fix Plan: 3 Build Errors + Complete Tax & Currency Wiring

## Root Cause Analysis

### Error 1 — POSModule.tsx line 389: `Type 'Element' is not assignable to type 'string'`
The `PremiumModuleHeader` interface declares `subtitle: string`, but the last edit passed a JSX element:
```tsx
subtitle={<span>Point of Sale — Fast Checkout <span className="hidden sm:inline">• Enter to Pay</span></span>}
```
TypeScript rejects this because the interface says `subtitle` is a `string`. 

**Fix:** Change the `subtitle` type in `PremiumModuleHeader.tsx` from `string` to `ReactNode`. This is the correct fix because it makes the component more flexible for all callers (several modules already pass plain strings, which are valid `ReactNode`). No other files need to change.

---

### Error 2 & 3 — UtilityExpenseModule.tsx lines 334-335: `Property 'liters_filled'/'odometer_reading' does not exist on type`
The code constructs `costData` as an object literal with 6 properties, and TypeScript infers its type rigidly. Then it tries to conditionally add `liters_filled` and `odometer_reading` to that inferred type:
```typescript
const costData = { vehicle_id, cost_type, description, amount, cost_date, created_by };
// ERROR: TypeScript infers exact type — can't add new keys after the fact
if (newCost.cost_type === "Fuel") {
  costData.liters_filled = ...; // ← Error: property doesn't exist on inferred type
  costData.odometer_reading = ...; // ← Error: same
}
```
**Fix:** Declare `costData` with an explicit type that includes the optional fields upfront, so TypeScript knows those keys can exist:
```typescript
const costData: {
  vehicle_id: string;
  cost_type: string;
  description: string | null;
  amount: number;
  cost_date: string;
  created_by: string;
  liters_filled?: number | null;
  odometer_reading?: number | null;
} = { ... };
```
This is a zero-risk type annotation fix — no runtime behavior changes.

---

## Tax & Currency Wiring (Complete the Previous Plan)

The backend is already done (columns exist). The hooks are already done (`useShopSettings`, `usePOSCart(taxRate)`). The remaining wiring is:

### File 1: `src/components/shared/PremiumModuleHeader.tsx`
Change `subtitle: string` → `subtitle: ReactNode`.

### File 2: `src/components/dashboard/modules/UtilityExpenseModule.tsx`
Fix `costData` type annotation (lines 324-335).

### File 3: `src/components/dashboard/modules/POSModule.tsx`
Two changes:
1. Import `useShopSettings` and pass `taxRate` to `usePOSCart`.
2. Pass `currencySymbol` to the payment drawer and invoice template so they display the correct symbol instead of the hardcoded `BANGLADESHI_CURRENCY_SYMBOL`.

Currently line 70 reads `const cart = usePOSCart();` with no tax rate. Change to:
```tsx
const { data: shopSettings } = useShopSettings();
const cart = usePOSCart(shopSettings?.taxRate ?? 0);
```
Then pass `cart.tax`, `taxRate: shopSettings?.taxRate`, and `currencySymbol: shopSettings?.currencySymbol ?? '৳'` down to the invoice data.

### File 4: `src/components/dashboard/modules/SettingsModule.tsx`
Add a **"Financial Preferences"** card to the Owner-only `financial` section. This card will have:
- Tax Rate (%) — numeric input, 0–99, saves to `shop_profiles.tax_rate`
- Currency Symbol — text input, max 3 chars, saves to `shop_profiles.currency_symbol`
- A "Save Changes" button that calls `useUpdateShopSettings` mutation

The section should appear in the left nav only when `userRole === 'owner'`, alongside the existing Team & Business section.

---

## Summary of Changes

| File | Change | Severity |
|---|---|---|
| `src/components/shared/PremiumModuleHeader.tsx` | `subtitle: string` → `subtitle: ReactNode` | Fixes Error 1 |
| `src/components/dashboard/modules/UtilityExpenseModule.tsx` | Explicit type on `costData` | Fixes Errors 2 & 3 |
| `src/components/dashboard/modules/POSModule.tsx` | Wire `useShopSettings` into `usePOSCart`, pass tax/currency to invoice | Tax integration |
| `src/components/dashboard/modules/SettingsModule.tsx` | Add Financial Preferences section | Settings UI |

**Total: 4 files. Zero database changes (columns already exist). Zero new dependencies.**
