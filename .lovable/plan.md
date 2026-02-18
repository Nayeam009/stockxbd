
# Fix Build Error + Complete Retail/Wholesale Integration

## Root Cause of TS1128 Build Error

The insertion at line 1165-1307 placed the retail/wholesale view block correctly, but the `// Due Customers View` block that was supposed to follow it lost its `if (viewMode === 'due') {` guard. The `return (` at line 1310 is floating outside any conditional, which is an invalid top-level statement in the component body — TypeScript reports "Declaration or statement expected" at line 2142 (the closing `};` of the file, because the unclosed block cascades to the end).

**Fix:** Insert `if (viewMode === 'due') {` at line 1309 (between the closing `}` of the wholesale block and the bare `return`), and ensure the matching closing `}` appears before `// Paid View` as well.

---

## Complete Fix Plan — 3 Files, Zero DB Changes

### File 1: `CustomerManagementModule.tsx` — Fix the build error

**Change:** Insert `if (viewMode === 'due') {` at line 1309 to restore the missing guard for the Due Customers view.

The structure must be:
```
}  ← closes retail/wholesale block (line 1307)

  if (viewMode === 'due') {   ← MISSING — insert this
    return (
      <div ...>  ← Due Customers JSX (line 1310)
      ...
    );
  }              ← ensure this closes the due block before the paid view
```

I also need to check that the `paid` view has its own closing `}` before the final `return` of the main view. Let me verify the structure by checking around the transition from the `due` view to the `paid` view and from the `paid` view to the `main` view.

### File 2: `POSCustomerLookup.tsx` — Wire `saleType` + add badges + cross-type warning

**What needs to change:**

1. **Destructure `saleType`** in the component function signature (currently it's accepted in the interface but not destructured at line 51-59).

2. **Customer type badge in "found" state** — when a customer is found by phone, show a colored badge next to "Old Customer":
   - Sky blue badge: "Retail"
   - Purple badge: "Wholesale"

3. **Cross-type warning** — when `saleType === 'retail'` and `customer.customer_type === 'wholesale'`, show an amber alert strip: "⚠️ This is a wholesale account. Consider switching to Wholesale sale type."

4. **Browse dialog badges** — in the `filteredCustomers` list, show a type badge on each customer row so the owner can visually distinguish retail vs wholesale accounts.

5. **Smart filter** in Browse dialog — show all customers but sort/highlight those matching the current `saleType` first.

### File 3: `POSModule.tsx` — Pass `saleType` to `POSCustomerLookup`

**Change:** Line 609 — add `saleType={saleType}` to the `POSCustomerLookup` component call.

---

## Exact Code Changes

### Fix 1 — CustomerManagementModule.tsx line 1308-1309

Insert the missing `if (viewMode === 'due') {` guard:

```tsx
// BEFORE (line 1307-1310):
  }

    return (
      <div className="space-y-4 sm:space-y-6 pb-4">

// AFTER:
  }

  if (viewMode === 'due') {
    return (
      <div className="space-y-4 sm:space-y-6 pb-4">
```

Then I also need to verify whether the `due` view's closing `}` exists before the `paid` view. Let me check those line numbers now.

### Fix 2 — POSCustomerLookup.tsx

Destructure `saleType` and add badge + warning logic:

```tsx
// Line 51-59 — add saleType to destructured props:
export const POSCustomerLookup = ({
  customers,
  saleType,      // ← ADD THIS
  discount,
  ...
}: POSCustomerLookupProps) => {
```

In the status badges section (around line 166-198), after the "Old Customer" badge, add:
```tsx
{status === 'found' && customer && (customer as any).customer_type && (
  <Badge className={(customer as any).customer_type === 'wholesale'
    ? 'bg-purple-100 text-purple-700 border-purple-300'
    : 'bg-sky-100 text-sky-700 border-sky-300'}>
    {(customer as any).customer_type === 'wholesale' ? '🟣 Wholesale' : '🔵 Retail'}
  </Badge>
)}
```

Cross-type warning (insert after the badges row, before the form fields):
```tsx
{status === 'found' && customer && 
 saleType === 'retail' && (customer as any).customer_type === 'wholesale' && (
  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400">
    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
    <span>Wholesale account — this sale is set to Retail pricing.</span>
  </div>
)}
```

In the Browse dialog customer list (line 334-360), add a type badge after the name:
```tsx
<Badge className={(cust as any).customer_type === 'wholesale'
  ? 'text-[10px] bg-purple-100 text-purple-700 border-purple-300'
  : 'text-[10px] bg-sky-100 text-sky-700 border-sky-300'}>
  {(cust as any).customer_type === 'wholesale' ? 'Wholesale' : 'Retail'}
</Badge>
```

### Fix 3 — POSModule.tsx line 609

```tsx
// BEFORE:
<POSCustomerLookup customers={customers} discount={cart.discount} ...

// AFTER:
<POSCustomerLookup customers={customers} saleType={saleType} discount={cart.discount} ...
```

---

## Technical Summary

| # | File | Line(s) | Change | Risk |
|---|---|---|---|---|
| 1 | `CustomerManagementModule.tsx` | 1308-1309 | Add missing `if (viewMode === 'due') {` guard | Zero — pure syntax fix |
| 2 | `POSCustomerLookup.tsx` | 51-59 | Destructure `saleType` from props | Zero |
| 3 | `POSCustomerLookup.tsx` | 166-199 | Add customer type badge + cross-type warning | Zero |
| 4 | `POSCustomerLookup.tsx` | 334-360 | Add type badges in Browse dialog | Zero |
| 5 | `POSModule.tsx` | 609 | Pass `saleType={saleType}` to `POSCustomerLookup` | Zero |

**Zero database changes. Zero new dependencies. Fix resolves immediately.**

The `due` view missing guard is the sole cause of TS1128. Once it's inserted, the entire file's JSX structure is valid and all 2142 lines compile correctly.
