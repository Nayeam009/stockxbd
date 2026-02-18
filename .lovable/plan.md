
# Customer Management System — Final Completion Plan

## What Is Already Done (No Rework)
After reading the live code carefully, these items from the prompt are **already implemented** by the previous sessions:

- Call button (Phone icon, `tel:` link) on retail cards — **done** (lines 1282-1292)
- WhatsApp button (MessageSquare icon, `wa.me` link) on retail cards — **done** (lines 1293-1308)
- 44px touch targets (`h-11 w-11`) on all action buttons — **done**
- Wholesale "due amount" shown as large bold rose-colored text — **done** (lines 1239-1242)
- Credit bar with green→amber→red color interpolation — **done** (lines 1250-1261)
- Ledger tab in the retail/wholesale view dialog — **done** (lines 1413-1491)

## What Still Needs Building — 4 Precise Changes

---

### Change 1: Database Migration — Wholesale-Specific Fields
The `customers` table has no `company_name` or `trade_license` columns. The form toggle already exists (retail/wholesale selector at line 950), but the wholesale-exclusive fields are not stored or displayed.

**Migration:**
```sql
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS trade_license text;
```

No RLS changes needed — the existing `owner_id = get_owner_id()` policies on `customers` cover these new columns automatically.

---

### Change 2: Add `company_name` + `trade_license` Fields to the Add Customer Form
**File:** `src/components/dashboard/modules/CustomerManagementModule.tsx`

**State change:** Add `company_name: ""` and `trade_license: ""` to the `newCustomer` state object (line 157-165).

**Form change:** Inside the existing Add Customer dialog, conditionally render two new fields when `newCustomerType === 'wholesale'`:

```tsx
{newCustomerType === 'wholesale' && (
  <>
    <div>
      <label className="text-sm font-medium text-foreground">Company Name</label>
      <Input
        value={newCustomer.company_name}
        onChange={(e) => setNewCustomer({ ...newCustomer, company_name: e.target.value })}
        placeholder="Company or business name"
        className="mt-1 h-11"
      />
    </div>
    <div>
      <label className="text-sm font-medium text-foreground">Trade License No.</label>
      <Input
        value={newCustomer.trade_license}
        onChange={(e) => setNewCustomer({ ...newCustomer, trade_license: e.target.value })}
        placeholder="e.g. TL-2024-XXXXX"
        className="mt-1 h-11"
      />
    </div>
  </>
)}
```

**Insert change:** Add `company_name` and `trade_license` to the `.insert()` call in `handleAddCustomer` (line 504-518).

**Display change:** In the wholesale customer card (line 1229-1263), show `company_name` below the customer name if present, in `text-xs text-muted-foreground italic` style.

**Interface change:** Add `company_name?: string` and `trade_license?: string` to the `Customer` interface (line 61-74). Add them to the `SharedCustomer` mapping (lines 128-141).

---

### Change 3: "Last Visited" on Retail Cards (Visual Hierarchy Polish)
**File:** `src/components/dashboard/modules/CustomerManagementModule.tsx`

The `last_order_date` column already exists on `customers` and is already mapped to the local `Customer` interface. It just isn't displayed anywhere on retail cards.

**Where:** In the retail card body (lines 1229-1263), after `{c.phone || 'No phone'}` for retail customers, add:

```tsx
{!isWholesale && c.last_order_date && (
  <p className="text-xs text-muted-foreground mt-0.5">
    Visited {formatDistanceToNow(new Date(c.last_order_date), { addSuffix: true })}
  </p>
)}
{!isWholesale && !c.last_order_date && (
  <p className="text-xs text-muted-foreground/50 mt-0.5">No purchase yet</p>
)}
```

**Import needed:** `formatDistanceToNow` from `date-fns` — already installed, just needs to be added to the import line (line 48).

---

### Change 4: Sticky Search Bar + "Add Customer" on Retail/Wholesale Sub-views
**File:** `src/components/dashboard/modules/CustomerManagementModule.tsx`

**Where:** The retail/wholesale sub-view (lines 1189-1554). Currently, the `PremiumModuleHeader` and the search input are plain `div`s that scroll away.

**What:** Wrap the search bar + Add Customer button in a `sticky top-0 z-20 bg-background/95 backdrop-blur-sm pb-3 pt-1 -mx-4 px-4` div so it sticks to the top of the scrollable module pane when scrolling through long customer lists.

The "Add Customer" button should be promoted from the main view into the retail/wholesale view header as well, since users should be able to add customers from within those sub-views. The existing `PremiumModuleHeader` actions slot already takes a `Button` — just replace the back-only button with a flex row: `[← Back]` on the left and `[+ Add]` on the right.

**Also fix:** The `historyDialogOpen` dialog at lines 1040-1165 (in the `main` view context) still only has 2 tabs and is never given the wholesale ledger treatment. But since that dialog is only opened from the `memo-search` / main view context where `isWholesale` is undefined, this is acceptable. The wholesale ledger dialog (lines 1341-1541) is the correct one and is already complete.

---

## File Change Summary

| # | Category | Action | File / SQL |
|---|---|---|---|
| 1 | DB Migration | Add `company_name` + `trade_license` columns to `customers` | SQL migration |
| 2 | Form | Add 2 conditional wholesale fields + insert them | `CustomerManagementModule.tsx` lines ~157, ~504 |
| 3 | Card Display | Show `company_name` on wholesale card | `CustomerManagementModule.tsx` lines ~1229 |
| 4 | Card Display | Show "Visited X days ago" on retail cards | `CustomerManagementModule.tsx` lines ~1236 |
| 5 | UX | Sticky search bar in retail/wholesale sub-views | `CustomerManagementModule.tsx` lines ~1202 |
| 6 | UX | Add "Add Customer" button in sub-view header | `CustomerManagementModule.tsx` lines ~1191 |

**1 migration. 1 file modified. Zero new dependencies. Zero new files.**

---

## Technical Notes

- `formatDistanceToNow` is in `date-fns` which is already installed (v3.6.0) — no new install needed
- The `SharedCustomer` type from `useSharedQueries.ts` will need `company_name` and `trade_license` added to the select query so the shared cache returns these new fields. The select at `fetchCustomers()` uses `select('*')` already — the new columns will come through automatically after the migration
- The `Customer` interface needs `company_name?: string` and `trade_license?: string` added so TypeScript accepts them from the shared query mapping
- The `newCustomer` state reset in `handleAddCustomer` (line 529) needs to include `company_name: ""` and `trade_license: ""` to avoid stale values on dialog reopen
