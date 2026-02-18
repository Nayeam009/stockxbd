
# Global Form Audit — Mobile Usability Report & Optimization Plan

## Methodology
Scanned all form-containing files across: `CustomerManagementModule.tsx`, `ProductPricingModule.tsx`, `PriceSection.tsx`, `AddProductDialog.tsx`, `EditablePriceCell.tsx`, `InventoryPricingCard.tsx`, `InventoryPOBDrawer.tsx`, `BusinessDiaryModule.tsx`, `UtilityExpenseModule.tsx`, `POSModule.tsx`, and `SettingsModule.tsx`.

---

## Findings Summary

### Issue Category 1: `grid-cols-3` Without Mobile Stack — CRITICAL

The 3-column price grid (`Company | Wholesale | Retail`) is the single most impactful layout issue. It appears in **3 files** and renders three narrow `EditablePriceCell` boxes side-by-side on a 390px phone screen.

| File | Location | Current | Problem |
|---|---|---|---|
| `src/components/pricing/PriceSection.tsx` | Line 48 | `grid grid-cols-3 gap-3` | No `sm:` breakpoint — 3 tiny columns on mobile |
| `src/components/pricing/AccessoryPriceCard.tsx` | Line 58 | `grid grid-cols-3 gap-3` | Same — stoves & regulators both affected |
| `src/components/pricing/AddProductDialog.tsx` | Line 265 | `grid grid-cols-3 gap-3` | Inside a Dialog — worst case, keyboard hides the third column |
| `src/components/dashboard/modules/InventoryPricingCard.tsx` | Lines 249-280 | `w-16 h-8` inputs inside a table | `h-8` = 32px (below 44px standard), `w-16` = very narrow on mobile |

**Fix:** Change `grid grid-cols-3 gap-3` → `grid grid-cols-3 sm:grid-cols-3 gap-2 sm:gap-3` is not enough. The real fix is `grid grid-cols-1 sm:grid-cols-3 gap-3` so on mobile the three price cells stack vertically, each getting full width. On desktop they remain side-by-side.

### Issue Category 2: `h-10` / `h-8` Sub-Standard Touch Targets — HIGH

These were found in active form controls (not just icons):

| File | Element | Height | Impact |
|---|---|---|---|
| `ProductPricingModule.tsx` (lines 204, 221, 231) | Weight `Select`, Search `Input`, Refresh `Button` | `h-10` / `h-10` / `h-10 w-10` | 40px — 4px below 44px standard |
| `ProductPricingModule.tsx` (line 135) | Save button on desktop | `h-9` | 36px — 8px below standard |
| `InventoryPricingCard.tsx` (lines 253, 261, 269, 278) | Price `Input` cells inside table | `h-8` + `w-16` | 32px height AND only 64px wide — extremely hard to tap |
| `BusinessDiaryModule.tsx` (line 507) | Search bar | `h-10` | 40px — 4px below standard |
| `UtilityExpenseModule.tsx` (lines 704, 708) | Fuel detail inputs (Liters, Odometer) inside fuel cost sub-grid | `h-10` | 40px — 4px below standard |
| `PriceSection.tsx` (line 40) | Delete product button | `h-8 w-8` | 32px — icon button on pricing card |

### Issue Category 3: Missing `inputMode` on Financial Inputs — MEDIUM

`type="number"` alone is correct but `inputMode="numeric"` is missing on financial inputs in several places. Without `inputMode`, iOS opens a QWERTY keyboard then requires switching to the number pad manually.

Inputs with `type="number"` but **missing `inputMode`**:

| File | Field | Fix |
|---|---|---|
| `CustomerManagementModule.tsx` (lines 1007, 1017, 1028) | Initial Due, Cylinders Due, Credit Limit in Add Customer form | Add `inputMode="numeric"` |
| `CustomerManagementModule.tsx` (lines 1604, 1606) | Payment Amount, Cylinders to Collect (settle dialog — retail/main view) | Add `inputMode="numeric"` |
| `CustomerManagementModule.tsx` (lines 1921, 1941) | Amount Received, Cylinders to Collect (wholesale settle dialog) | Add `inputMode="numeric"` |
| `POSModule.tsx` (line 647) | Custom brand price input | Add `inputMode="numeric"` |
| `AddProductDialog.tsx` (lines 268, 286, 294) | Company, Wholesale, Retail price inputs | Add `inputMode="numeric"` |
| `InventoryPricingCard.tsx` (lines 250, 258, 266, 275) | All 4 price table inputs | Add `inputMode="numeric"` |
| `EditablePriceCell.tsx` (line 93) | The inline price edit input (inside click-to-edit cell) | Add `inputMode="numeric"` |
| `BusinessDiaryModule.tsx` (line 451) | Expense Amount | Add `inputMode="numeric"` |

### Issue Category 4: Large Modals Without Mobile-Safe `max-h` — MEDIUM

The Customer History/Ledger dialog uses `max-w-2xl max-h-[90vh]`. On mobile, `max-w-2xl` = 672px, but the dialog is constrained by `100vw` anyway. However, the issue is that on **Android Chrome with the address bar visible**, `100vh` overestimates the visible area, causing the bottom of the dialog to be clipped behind the browser chrome. The recommended fix is `max-h-[85dvh]` (using dynamic viewport height `dvh`) which accounts for floating navigation bars.

Affected dialogs:
- `CustomerManagementModule.tsx` — 4 history/ledger dialogs at `max-h-[90vh]` (lines 1074, 1401, 1966, 2313)

### Issue Category 5: 2-Column Price Grid Inside Vehicle Cost Dialog — LOW

`UtilityExpenseModule.tsx` line 701 and 717: Two `grid-cols-2` sub-grids inside the Add Vehicle Cost dialog. These are `Liters Filled | Odometer (km)` and `Amount | Date`. At 390px width with dialog padding, each cell is ~160px — just barely acceptable but both have `h-10` inputs (40px) instead of the 44px standard.

---

## Part 1 — Files Requiring Layout Refactoring

Ranked by severity:

**P0 — Critical (price grids 3-column not stacking on mobile):**
1. `src/components/pricing/PriceSection.tsx` — change `grid-cols-3` → `grid-cols-1 sm:grid-cols-3`
2. `src/components/pricing/AccessoryPriceCard.tsx` — same change
3. `src/components/pricing/AddProductDialog.tsx` — price grid inside dialog needs same treatment

**P1 — High (sub-standard touch targets in functional controls):**
4. `src/components/dashboard/modules/InventoryPricingCard.tsx` — table price inputs `h-8 w-16` → `h-11 w-20`
5. `src/components/dashboard/modules/ProductPricingModule.tsx` — search `h-10` → `h-11`, weight select `h-10` → `h-11`
6. `src/components/dashboard/modules/BusinessDiaryModule.tsx` — search input `h-10` → `h-11`

**P2 — Medium (keyboard safety):**
7. `src/components/dashboard/modules/CustomerManagementModule.tsx` — 4 history dialogs `max-h-[90vh]` → `max-h-[85dvh]`

---

## Part 2 — Proposed `<MobileFormActions />` Reusable Component

A new shared component at `src/components/shared/MobileFormActions.tsx` to replace the generic `DialogFooter` in all modals. The component renders differently based on context:

- **Inside a dialog on mobile**: renders as a sticky pinned footer inside the `DialogContent` scroll area, so the buttons are always visible when the keyboard is open
- **Desktop**: renders as a standard inline `DialogFooter`

```typescript
// src/components/shared/MobileFormActions.tsx

interface MobileFormActionsProps {
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel: string;
  cancelLabel?: string;
  confirmVariant?: 'default' | 'destructive' | 'emerald' | 'rose';
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
}
```

Renders as:
```tsx
// Mobile: sticky bottom inside dialog scroll container
<div className="sticky bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm pt-3 pb-safe border-t border-border/50 flex gap-3 sm:static sm:border-0 sm:bg-transparent sm:pt-0 sm:pb-0">
  <Button variant="outline" className="flex-1 h-12 sm:h-11" onClick={onCancel}>
    {cancelLabel ?? 'Cancel'}
  </Button>
  <Button className="flex-1 h-12 sm:h-11" onClick={onConfirm} disabled={disabled || loading}>
    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : confirmLabel}
  </Button>
</div>
```

Apply this to these dialogs in priority order:
1. Add Customer dialog (CustomerManagementModule) — long form, most at risk
2. Settle Account dialog (CustomerManagementModule) — financial input, high use
3. Add Expense dialog (BusinessDiaryModule) — frequent daily action
4. Add Staff / Add Vehicle Cost dialogs (UtilityExpenseModule)
5. Add Product Price dialog (AddProductDialog)

---

## Part 3 — Complete `inputMode` Fix List

Every `type="number"` input that is missing `inputMode` that must be corrected. Financial prices use `inputMode="numeric"` (integer taka amounts). Decimal quantities like fuel liters use `inputMode="decimal"`.

| # | File | Field | Add |
|---|---|---|---|
| 1 | `CustomerManagementModule.tsx:1007` | Initial Due | `inputMode="numeric"` |
| 2 | `CustomerManagementModule.tsx:1017` | Cylinders Due | `inputMode="numeric"` |
| 3 | `CustomerManagementModule.tsx:1028` | Credit Limit | `inputMode="numeric"` |
| 4 | `CustomerManagementModule.tsx:1604` | Payment Amount (retail settle) | `inputMode="numeric"` |
| 5 | `CustomerManagementModule.tsx:1606` | Cylinders to Collect (retail settle) | `inputMode="numeric"` |
| 6 | `CustomerManagementModule.tsx:1921` | Amount Received (wholesale settle) | `inputMode="numeric"` |
| 7 | `CustomerManagementModule.tsx:1941` | Cylinders to Collect (wholesale settle) | `inputMode="numeric"` |
| 8 | `POSModule.tsx:647` | Custom brand price | `inputMode="numeric"` |
| 9 | `AddProductDialog.tsx:268` | Company price | `inputMode="numeric"` |
| 10 | `AddProductDialog.tsx:286` | Wholesale price | `inputMode="numeric"` |
| 11 | `AddProductDialog.tsx:294` | Retail price | `inputMode="numeric"` |
| 12 | `AddProductDialog.tsx:309` | Package price | `inputMode="numeric"` |
| 13 | `InventoryPricingCard.tsx:250` | Company price in table | `inputMode="numeric"` |
| 14 | `InventoryPricingCard.tsx:258` | Distributor price in table | `inputMode="numeric"` |
| 15 | `InventoryPricingCard.tsx:266` | Retail price in table | `inputMode="numeric"` |
| 16 | `InventoryPricingCard.tsx:275` | Package price in table | `inputMode="numeric"` |
| 17 | `EditablePriceCell.tsx:93` | Inline price edit cell | `inputMode="numeric"` |
| 18 | `BusinessDiaryModule.tsx:451` | Expense amount | `inputMode="numeric"` |

---

## Implementation Order

All changes target **zero new files except `MobileFormActions`** and modify only the 8 files listed:

1. Create `src/components/shared/MobileFormActions.tsx` — the reusable sticky-footer button component
2. Fix `PriceSection.tsx` + `AccessoryPriceCard.tsx` — 3-col to 1-col-mobile (`grid-cols-1 sm:grid-cols-3`)
3. Fix `AddProductDialog.tsx` — price grid + all 4 missing `inputMode`
4. Fix `EditablePriceCell.tsx` — add `inputMode="numeric"` to the inline editor input
5. Fix `InventoryPricingCard.tsx` — table inputs `h-8 w-16` → `h-11 w-20` + `inputMode="numeric"` on all 4 inputs
6. Fix `CustomerManagementModule.tsx` — 7 missing `inputMode` attributes + 4 dialogs `max-h-[85dvh]` + replace `DialogFooter` in Add Customer and Settle dialogs with `MobileFormActions`
7. Fix `BusinessDiaryModule.tsx` — search `h-10` → `h-11`, expense amount missing `inputMode`
8. Fix `ProductPricingModule.tsx` — search `h-10` → `h-11`, weight select `h-10` → `h-11`

**Total: 1 new file. 8 files modified. 0 schema changes.**
