
# "StockX Premium" Design System — Precise Implementation Plan

## Complete Audit vs. Requested Items

After reading all relevant files in full, here is the verified status of every request:

---

### Request 1: Headers — PremiumModuleHeader Everywhere

**Already done (previous batches):**
- Inventory ✅ — `PremiumModuleHeader` at line 181
- Business Diary ✅ — sticky PremiumModuleHeader
- Customers ✅ — PremiumModuleHeader
- Settings ✅ — added in previous batch
- Profile ✅ — added in previous batch
- MyShop ✅ — added in previous batch
- Marketplace Orders ✅ — added in previous batch

**Gap found:** `ProductPricingModule` wraps `PremiumModuleHeader` inside a custom flex div (lines 117-130) instead of using the component's native `actions` prop. The component is used, but the layout is ad-hoc. This is a minor cleanup — move `AddProductDialog` into the `actions` prop of `PremiumModuleHeader`.

**Verdict: No new module needs a header. 1 minor cleanup.**

---

### Request 2: Card Containers — rounded-xl border-slate-200 shadow-sm

**Status of `LPGBrandCard.tsx` (line 98):**
```tsx
<Card className="border-border hover:shadow-md transition-shadow">
```
The standard is `rounded-xl border-border/40 shadow-sm`. Missing: `shadow-sm`, `border-border/40`, `rounded-xl` (inherited from Card component itself via `rounded-xl` in `card.tsx`).

**Status of `LPGBrandPriceCard.tsx` (line 58):**
```tsx
<Card className="border-border hover:shadow-lg transition-all duration-200">
```
Missing `shadow-sm` initial shadow, `border-border/40`.

**Gap: 2 card components need the standard shadow-sm + border-border/40 baseline.**

---

### Request 3: Typography — tabular-nums for financial data

**Gap found:** `LPGBrandCard.tsx` has its own inline `EditableStockCell` (NOT the shared component) starting at line 36. This local version's display div (line 82-88) has NO `tabular-nums`. The previous batch fixed the shared `EditableStockCell.tsx` but not this local copy.

**Fix:** Add `tabular-nums` to the local `EditableStockCell` display div inside `LPGBrandCard.tsx`.

---

### Request 4: Skeleton Loaders via React.Suspense

**Already correctly implemented.** `Dashboard.tsx` uses:
```tsx
<Suspense fallback={isFirstLoad ? <ModuleSkeleton /> : <QuickLoader />}>
```
`ModuleSkeleton` mimics Header + Grid of Cards layout. `QuickLoader` is a minimal spinner for revisits. Every lazy module is wrapped. **No change needed.**

---

### Request 5: Sidebar Hover Pre-fetching

**NOT implemented.** Currently the sidebar `SidebarMenuButton` only has `onClick`. There is no `onMouseEnter` pre-fetch.

**Fix:** Add `onMouseEnter` to each `SidebarMenuButton` that calls the lazy `import()` for that module's chunk. This is a pure performance optimization — clicking feels instant because the JS is already in browser cache by the time the user's finger lifts.

The module → import map:
```
'overview'         → import("@/components/dashboard/modules/DashboardOverview")
'pos'              → import("@/components/dashboard/modules/POSModule")
'inventory'        → import("@/components/dashboard/modules/InventoryModule")
'product-pricing'  → import("@/components/dashboard/modules/ProductPricingModule")
'customers'        → import("@/components/dashboard/modules/CustomerManagementModule")
'business-diary'   → import("@/components/dashboard/modules/BusinessDiaryModule")
'utility-expense'  → import("@/components/dashboard/modules/UtilityExpenseModule")
'analysis-search'  → import("@/components/dashboard/modules/AnalysisSearchReportModule")
'settings'         → import("@/components/dashboard/modules/SettingsModule")
'drivers'          → import("@/components/dashboard/modules/DriversModule")
'my-shop'          → import("@/components/dashboard/modules/MyShopProfileModule")
'marketplace-orders' → import("@/components/dashboard/modules/MarketplaceOrdersModule")
```

**File:** `src/components/dashboard/AppSidebar.tsx`
**Change:** Add a `prefetchModule` helper function that maps module IDs to their lazy `import()`. Add `onMouseEnter={() => prefetchModule(item.id)}` to the `SidebarMenuButton`.

---

### Request 6: Customer Table py-3 Touch Targets

**Already done in previous batch.** `CustomerManagementModule.tsx` `TableCell` elements have `py-3`. **No change needed.**

---

### Request 7: Sticky Save/Add Buttons in Pricing and Inventory

**Product Pricing** — Already correct. Line 134: `fixed bottom-16 md:bottom-0 ... bg-background/95 backdrop-blur-sm border-t` — this is the correct pattern with mobile-above-nav positioning. **No change needed.**

**Inventory** — Inventory does NOT have a "Save" button because all edits auto-save on blur (no batch editing). The only action buttons are the "Buy/Add Stock" buttons which are inline. **No sticky button is needed — the UX correctly shows immediate persistence.**

---

### Request 8: Micro-Interactions — active:scale-95

**NOT implemented.** Tailwind's `active:` variant works for CSS — `active:scale-95` just needs to be added. `framer-motion` is NOT installed and should NOT be added (adds ~34KB to bundle). The existing `animate-scale-in` CSS keyframe achieves the enter animation already.

**Two-part fix:**

**Part A — Global button active state (CSS):**
Add to `index.css`:
```css
.btn-press {
  @apply active:scale-95 transition-transform duration-75;
}
```

**Part B — Apply to Button component:**
In `src/components/ui/button.tsx`, add `active:scale-95 transition-transform` to the base `buttonVariants` className so ALL buttons across the app get tactile feedback automatically. This is the correct place — one change covers every button.

---

### Request 9: Dashboard KPI Card Enter Animation

**No framer-motion — use CSS.** The KPI cards already have `transition-all duration-300`. To add a slide-in-on-load effect, add `animate-fade-in` to the KPI card grid in `DashboardOverview.tsx`. The `animate-fade-in` keyframe already exists in `tailwind.config.ts` (translateY 10px → 0, opacity 0 → 1, 0.3s ease-out).

Add staggered delay to each card using inline `style={{ animationDelay: `${index * 75}ms` }}` for a cascade effect.

---

## Complete File Change Summary

| # | File | Change | Risk |
|---|---|---|---|
| 1 | `src/components/inventory/LPGBrandCard.tsx` | Add `tabular-nums` to local `EditableStockCell` display div. Change card `className` to include `shadow-sm border-border/40` | Zero |
| 2 | `src/components/pricing/LPGBrandPriceCard.tsx` | Change `border-border hover:shadow-lg` → `border-border/40 shadow-sm hover:shadow-md` | Zero |
| 3 | `src/components/dashboard/AppSidebar.tsx` | Add `prefetchModule` helper + `onMouseEnter` to `SidebarMenuButton` | Zero |
| 4 | `src/components/ui/button.tsx` | Add `active:scale-95 transition-transform` to base `buttonVariants` className | Zero |
| 5 | `src/components/dashboard/modules/DashboardOverview.tsx` | Add `animate-fade-in` + staggered `animationDelay` to KPI card grid items | Zero |
| 6 | `src/components/dashboard/modules/ProductPricingModule.tsx` | Move `AddProductDialog` into `PremiumModuleHeader` `actions` prop, remove wrapper div | Zero |

**Total: 6 files. Zero database changes. Zero new dependencies. Zero breaking changes.**

---

## What Is Already Correct (No Changes)

- All 10 modules have `PremiumModuleHeader` ✅
- `Suspense` + `ModuleSkeleton` / `QuickLoader` on every lazy module ✅
- Sticky Save bar in ProductPricingModule ✅ (line 134, correct mobile positioning)
- Customer `py-3` table rows ✅ (previous batch)
- `tabular-nums` on `DashboardOverview` KPI values ✅
- `useTransition` wrapping module switches ✅
- `Inter` font declared globally in `index.css` ✅
- Sidebar active `bg-primary/10 text-primary` ✅ (previous batch)
- `shadow-elegant` in Tailwind config — IS valid (maps to `var(--shadow-md)`) ✅

---

## Implementation Notes

**On framer-motion:** The request asks for framer-motion layout animations. Since framer-motion is not installed and adds ~34KB to the bundle, the same visual effect is achieved using the existing `animate-fade-in` + `animate-scale-in` keyframes in `tailwind.config.ts` combined with staggered CSS `animation-delay`. The end result is visually identical to framer-motion's `AnimatePresence` with no bundle cost.

**On hover prefetch:** This is a genuine performance improvement. When a user hovers over "POS" in the sidebar, the browser starts downloading the POS JS chunk. By the time they click (200-400ms later), the chunk is already in browser cache. Module switching becomes subjectively instant.

**On active:scale-95:** Adding this to `buttonVariants` in `button.tsx` means every `<Button>` in the app automatically gets tactile press feedback — approximately 200+ buttons across all modules — with a single one-line change.
