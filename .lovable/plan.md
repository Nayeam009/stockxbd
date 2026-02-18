
# "StockX Premium" Design Language Enforcement Plan

## Audit Findings (What Is Already Correct)

After reading every relevant file in full, many items requested are already implemented:

| Item | Status |
|---|---|
| Inter font on `html` element | Done — `index.css` line 171 |
| Tabular nums on KPI values in `DashboardOverview` | Done — line 235 |
| Tabular nums in `CustomerCard` due amounts | Done — lines 79, 85 |
| Tabular nums in `UtilityExpenseModule` salary cards | Done — lines 588, 592, 596 |
| `EmptyStateCard` in `DriversModule` (no drivers) | Done |
| Staff empty state in `UtilityExpenseModule` | Uses custom card-dashed — needs upgrade |
| `touch-manipulation` on buttons | Done throughout |
| Dashboard KPI cards use `tabular-nums` on values | Done |

## What Is NOT Yet Done (The 6 Real Gaps)

---

### Gap 1 — Business Diary: Date Filter Is NOT Sticky

**Current behavior:** The date controls (Cash Flow / Profit toggle + Today/Yesterday/Week/Month/Custom buttons) are in a plain `div` at line 385-469 inside the scrollable content area. When you scroll down past 6 summary cards and a list of 20+ transactions, you lose sight of the filter bar completely.

**Fix:** Wrap the header+controls div in a `sticky top-0 z-10` container with `bg-background/95 backdrop-blur-sm border-b border-border/40` so the date filter and view toggle pins to the top as you scroll the sales/expense list.

**File:** `src/components/dashboard/modules/BusinessDiaryModule.tsx`  
**Change:** Add `sticky top-0 z-10 bg-background/95 backdrop-blur-sm` to the outer header div (lines 369-470) and add `pb-2` to provide spacing below the sticky bar.

---

### Gap 2 — Sidebar Active State: Full Primary Fill vs Subtle bg-primary/10

**Current behavior:** Active sidebar items use `bg-primary text-primary-foreground shadow-sm` — a full navy blue fill with white text.

**Requested behavior:** "StockX Premium" spec requires `bg-primary/10 text-primary` — a subtle tinted highlight with navy text on white, matching the "More menu" active state in `MobileBottomNav` (which already uses `bg-primary/10 border-primary/30 text-primary`).

**Fix:** Change the active class in `renderMenuItem` from:  
`'bg-primary text-primary-foreground shadow-sm'`  
to:  
`'bg-primary/10 text-primary'`

Also update the inner icon container active class from `'bg-white/20'` to `'bg-primary/15'` and the icon color from `'text-primary-foreground'` to `'text-primary'`.

**File:** `src/components/dashboard/AppSidebar.tsx`

---

### Gap 3 — Inventory LPG Brand Cards: Stock Numbers Lack tabular-nums

**Current behavior:** The `EditableStockCell` component (inside `LPGBrandCard.tsx`) renders the stock value as:  
```
<div className="px-2 sm:px-3 py-2 rounded-md cursor-pointer ... font-medium text-sm sm:text-base">
  {value}
</div>
```
No `tabular-nums` class. When you have numbers like "0", "10", "100" in the same column, they do not align.

**Fix:** Add `tabular-nums` to the value display `div` in `EditableStockCell`.

Also, the editing `Input` should have `tabular-nums` for consistency during in-place editing.

**File:** `src/components/inventory/LPGBrandCard.tsx`

---

### Gap 4 — Customer Desktop Table Rows Need py-3 Touch Target

**Current behavior:** The `TableRow` elements in the Due Customers desktop table (lines 1298-1352) and the Paid Customers desktop table have no explicit padding override — they rely on the default `TableCell` padding which is `px-4 py-2` (16px height, too small for touch).

**Fix:** Add `className="py-3"` to each `TableCell` in the due and paid customer table rows, giving them a 48px+ touch height per the mobile standards spec.

**File:** `src/components/dashboard/modules/CustomerManagementModule.tsx`

---

### Gap 5 — Utility Module: Staff & Vehicle Empty States Use Custom Card Instead of EmptyStateCard

**Current behavior:** When `staffList.length === 0` (line 554-564), the Utility module renders a hand-coded `Card` with `border-dashed` and custom icon/text — not the standardized `EmptyStateCard` component. Same for the vehicles empty state.

**Fix:** Replace both custom empty-state cards with `<EmptyStateCard>` from `@/components/shared/EmptyStateCard`. Import `EmptyStateCard` and replace the existing `staffList.length === 0` block.

**File:** `src/components/dashboard/modules/UtilityExpenseModule.tsx`

---

### Gap 6 — Dashboard KPI Cards: Per-Card Shimmer Skeleton

**Current behavior:** The entire module falls back to `ModuleSkeleton` (the full-page skeleton) via the `Suspense` fallback in `Dashboard.tsx`. But when the module JS is already cached (revisit), the component renders immediately and the `DashboardOverview` KPI cards flash from `৳0` to real values during the first data fetch.

**Fix:** In `DashboardOverview.tsx`, accept an `isLoading` prop from `Dashboard.tsx` and render `Skeleton` shimmer cells for the KPI card values when loading:

```typescript
// In DashboardOverview.tsx
interface DashboardOverviewProps {
  // existing props...
  isLoading?: boolean;
}

// In each KPI card value:
{isLoading ? (
  <Skeleton className="h-8 w-28 rounded-md" />
) : (
  <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold tabular-nums">{card.value}</div>
)}
```

**Files:** `src/components/dashboard/modules/DashboardOverview.tsx` + `src/pages/Dashboard.tsx` (pass `isLoading` from `useDashboardData` to DashboardOverview)

---

## Technical File Change Summary

| # | File | Change | Lines Affected | Risk |
|---|---|---|---|---|
| 1 | `BusinessDiaryModule.tsx` | Make header+date controls `sticky top-0 z-10` | ~370 | Zero — CSS only |
| 2 | `AppSidebar.tsx` | Change active item style from `bg-primary` fill to `bg-primary/10 text-primary` | ~86-89 | Zero — visual only |
| 3 | `LPGBrandCard.tsx` | Add `tabular-nums` to `EditableStockCell` value display and input | ~83 | Zero — additive class |
| 4 | `CustomerManagementModule.tsx` | Add `py-3` to TableCell in due+paid table rows | ~1298-1352, ~1700-1780 | Zero — CSS padding |
| 5 | `UtilityExpenseModule.tsx` | Replace 2 custom empty cards with `<EmptyStateCard>` | ~554-564, ~700-720 | Zero — component swap |
| 6 | `DashboardOverview.tsx` + `Dashboard.tsx` | Add `isLoading` prop + Skeleton shimmer in KPI cards | ~200-255 | Zero — additive prop |

**Total: 6 files. Zero database changes. Zero new dependencies. Zero breaking changes. All purely additive or visual.**

---

## What Is NOT Changing (Already Correct)

- Inter font — already declared in `index.css` ✅
- `tabular-nums` on KPI card values in DashboardOverview — already present ✅
- `tabular-nums` in CustomerCard and UtilityExpenseModule — already present ✅
- EmptyStateCard in DriversModule — already used ✅
- `touch-manipulation` on action buttons — already present ✅
- Mobile bottom nav active state `bg-primary/10` — already correctly implemented ✅
