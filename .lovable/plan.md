
# Form Mobile Optimization — Precise Implementation Plan

## Accurate Audit: What's Already Done vs. What Needs Work

After reading the live code across all affected files, several items from the prompt are already fully implemented. This plan only targets genuine gaps.

### Already Implemented (No Changes Needed)

- `MobileFormActions` component exists with `h-12` on mobile, `h-11` on desktop, sticky positioning
- `PriceSection.tsx` already uses `grid-cols-1 sm:grid-cols-3` (fixed in prior session)
- `InventoryPOBDrawer` already uses `Sheet` with `side={isMobile ? "bottom" : "right"}` — the Drawer vs. Modal pattern is already in place for Inventory
- All Customer module financial inputs already have `inputMode="numeric"`
- All action buttons in Retail/Wholesale cards are already `h-11 w-11 touch-manipulation`
- `MobileFormActions` is already wired into Add Customer dialog and both Settle dialogs

### Genuine Gaps Found (Changes Required)

---

## Gap 1 — Phone Field Missing `type="tel"` (CustomerManagementModule)

**Location:** Add Customer dialog, lines 978-984

The phone `Input` has no `type` attribute at all. Without `type="tel"`, iOS and Android open QWERTY keyboard instead of the dial pad. This is the highest-impact single fix.

```tsx
// BEFORE (line 978-984):
<Input
  value={newCustomer.phone}
  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
  placeholder="01XXX-XXXXXX"
  className="mt-1 h-11"
/>

// AFTER:
<Input
  type="tel"
  inputMode="tel"
  autoComplete="tel"
  value={newCustomer.phone}
  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
  placeholder="01XXX-XXXXXX"
  className="mt-1 h-12 text-base"
/>
```

---

## Gap 2 — Form Input Heights `h-11` → `h-12` + `text-base` to Prevent iOS Auto-Zoom

**Context:** The iOS zoom prevention threshold is 16px font size. The `Input` component in `src/components/ui/input.tsx` uses `text-base` by default. However, several form inputs in the Customer dialogs add custom height classes (`h-11`) without `text-base`, and on some iOS versions the browser overrides to a smaller size causing the auto-zoom.

**Rule from prompt:** All form inputs must be `h-12` (48px) on mobile.

**Files and specific inputs to upgrade:**

### CustomerManagementModule.tsx — Add Customer Dialog

All 8 `Input` fields currently at `h-11` need `h-12 text-base`:
- Customer Name (`className="mt-1 h-11"` → `"mt-1 h-12 text-base"`)
- Phone (also gets `type="tel"` from Gap 1)
- Email (`className="mt-1 h-11"` → `"mt-1 h-12 text-base"`)
- Address (`className="mt-1 h-11"` → `"mt-1 h-12 text-base"`)
- Initial Due (`className="mt-1 h-11"` → `"mt-1 h-12 text-base"`)
- Cylinders Due (`className="mt-1 h-11"` → `"mt-1 h-12 text-base"`)
- Credit Limit (`className="mt-1 h-11"` → `"mt-1 h-12 text-base"`)
- Company Name (wholesale) (`className="mt-1 h-11"` → `"mt-1 h-12 text-base"`)
- Trade License (wholesale) (`className="mt-1 h-11"` → `"mt-1 h-12 text-base"`)

The Customer Type toggle buttons (`h-10`) should also increase to `h-12` for consistency.

### CustomerManagementModule.tsx — Settle Account Dialogs

Two settle dialogs (retail at line 1604-1608, wholesale at lines 1925-1954) have `h-11` inputs:
- Payment Amount: `h-11 text-lg font-semibold` → `h-12 text-base font-semibold`  
- Cylinders to Collect: `h-11` → `h-12 text-base`

### BusinessDiaryModule.tsx — Add Expense Dialog

- Amount input: already `h-11 text-lg font-semibold` → upgrade to `h-12 text-base font-semibold`
- Description input: `h-11` → `h-12 text-base`
- Category SelectTrigger: `h-11` → `h-12`
- Save button at line 459: currently `h-11` → upgrade to `h-12` and replace with `MobileFormActions` for keyboard safety

---

## Gap 3 — Add Expense Dialog Missing `MobileFormActions` (BusinessDiaryModule)

**Location:** `src/components/dashboard/modules/BusinessDiaryModule.tsx`, lines 459-462

The Add Expense dialog has a plain full-width `Button` at the bottom. This button is NOT sticky — when the keyboard opens on mobile, it scrolls off screen and the user cannot save.

**Current structure:**
```tsx
<DialogContent className="max-w-[95vw] sm:max-w-md">
  <DialogHeader>...</DialogHeader>
  <div className="space-y-4 py-4">
    {/* category, amount, description fields */}
    <Button onClick={handleAddExpense} className="w-full h-11" disabled={...}>
      Save Expense
    </Button>
  </div>
</DialogContent>
```

**Fix:** Add `overflow-y-auto` to the DialogContent, move the save button outside the scroll container and replace with `MobileFormActions`:
```tsx
<DialogContent className="max-w-[95vw] sm:max-w-md flex flex-col max-h-[85dvh]">
  <DialogHeader>...</DialogHeader>
  <div className="space-y-4 py-4 overflow-y-auto flex-1">
    {/* category, amount, description */}
  </div>
  <MobileFormActions
    onCancel={() => setAddDialogOpen(false)}
    onConfirm={handleAddExpense}
    confirmLabel="Save Expense"
    disabled={!newExpense.amount || !newExpense.category}
  />
</DialogContent>
```

`MobileFormActions` must be imported in BusinessDiaryModule.

---

## Gap 4 — Initial Due / Cylinders Due 2-Column Grid in Add Customer

**Location:** Lines 1004-1026 of CustomerManagementModule

The `grid grid-cols-2 gap-4` grid for Initial Due + Cylinders Due renders two `h-11` inputs side-by-side. At 320px (iPhone SE) with dialog padding, each input is ~130px wide — too narrow for comfortable numeric entry on the phone.

**Fix:** Stack to single column on mobile, 2 columns only on `sm:`:
```tsx
// BEFORE:
<div className="grid grid-cols-2 gap-4">

// AFTER:
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
```

This lets each numeric input use the full dialog width on phones, while desktop keeps them side-by-side.

---

## Gap 5 — Add Customer Dialog Should Use `Sheet` on Mobile (Drawer vs. Modal)

**Location:** CustomerManagementModule.tsx line 947

The Add Customer dialog uses `<Dialog>` on all screen sizes. For wholesale customers with 8+ fields, this is a tall modal that the keyboard pushes up. The `useIsMobile` hook is already imported via `date-fns` and the `InventoryPOBDrawer` already demonstrates the pattern.

**Pattern to apply** (same as InventoryPOBDrawer):
```tsx
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

// Inside the component:
const isMobile = useIsMobile();

// Replace the Dialog wrapping the add customer form:
{isMobile ? (
  <Sheet open={addCustomerDialogOpen} onOpenChange={setAddCustomerDialogOpen}>
    <SheetContent side="bottom" className="h-[92dvh] rounded-t-2xl flex flex-col overflow-hidden p-0 pb-[env(safe-area-inset-bottom)]">
      <SheetHeader className="px-4 pt-4 pb-3 border-b shrink-0">
        <SheetTitle>Add New Customer</SheetTitle>
      </SheetHeader>
      <div className="flex-1 overflow-y-auto px-4 pt-4 space-y-4">
        {/* All form fields — identical content */}
      </div>
      <div className="px-4 pt-2 pb-4 shrink-0">
        <MobileFormActions ... />
      </div>
    </SheetContent>
  </Sheet>
) : (
  <Dialog open={addCustomerDialogOpen} onOpenChange={setAddCustomerDialogOpen}>
    {/* existing Dialog content */}
  </Dialog>
)}
```

**Note:** `Sheet` and `SheetContent` are already installed and used in `InventoryPOBDrawer`. No new dependency needed.

---

## File Change Summary

| # | File | Change | Scope |
|---|---|---|---|
| 1 | `CustomerManagementModule.tsx` | Add `type="tel" inputMode="tel" autoComplete="tel"` to phone input | 3 lines |
| 2 | `CustomerManagementModule.tsx` | Upgrade 9 Add Customer inputs from `h-11` → `h-12 text-base` | ~20 lines |
| 3 | `CustomerManagementModule.tsx` | Upgrade customer type toggle buttons from `h-10` → `h-12` | 2 lines |
| 4 | `CustomerManagementModule.tsx` | Upgrade 4 Settle dialog inputs from `h-11` → `h-12 text-base` (both dialogs) | ~8 lines |
| 5 | `CustomerManagementModule.tsx` | Change `grid-cols-2` → `grid-cols-1 sm:grid-cols-2` for due fields | 1 line |
| 6 | `CustomerManagementModule.tsx` | Wrap Add Customer form in `Sheet` on mobile, `Dialog` on desktop | ~30 lines |
| 7 | `CustomerManagementModule.tsx` | Import `useIsMobile`, `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle` | 2 import lines |
| 8 | `BusinessDiaryModule.tsx` | Upgrade Add Expense inputs to `h-12` + SelectTrigger to `h-12` | ~4 lines |
| 9 | `BusinessDiaryModule.tsx` | Replace plain Save button with `MobileFormActions` + make dialog flex scrollable | ~10 lines |
| 10 | `BusinessDiaryModule.tsx` | Import `MobileFormActions` | 1 import line |

**Zero schema migrations. Zero new dependencies. 2 files modified.**

---

## What Is NOT Changed (Already Correct)

- `PriceSection.tsx` — `grid-cols-1 sm:grid-cols-3` is already in place
- `InventoryPOBDrawer` — already uses Sheet/bottom drawer on mobile
- All financial `inputMode="numeric"` attributes are already present
- `MobileFormActions` component is already built correctly (h-12 mobile, h-11 desktop)
- All Customer card action buttons are already `h-11 w-11 touch-manipulation`
- Settle dialogs already use `MobileFormActions`
