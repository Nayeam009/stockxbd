
# Customer Module Consolidation — Merge & Cleanup Strategy

## Accurate Assessment: What Already Exists vs. What the Prompt Asks For

After reading all 2,459 lines of `CustomerManagementModule.tsx`, `AppSidebar.tsx`, `MobileBottomNav.tsx`, `Dashboard.tsx`, and `App.tsx` in full, here is the ground truth:

### What Is Already Correctly Implemented (No Changes Needed)

**Routes / Zombie Files:**
- There are NO external routes (`/dashboard/due-list`, `/dashboard/paid-list`, `/dashboard/memo-recall`) in `App.tsx`. All views are controlled by an internal `viewMode` state within the single `CustomerManagementModule`. The routing is already clean.
- There are NO separate page files to delete (`DueListPage.tsx`, `PaidListPage.tsx`, etc.). These never existed as files.
- The sidebar has ONE `customers` entry — no duplicates.

**Memo Recall:**
- Already implemented as a search bar in the `main` view (lines 613-759). It searches `pos_transactions` by `transaction_number` (ilike `%query%`) AND customers by phone/name. Results show inline with click-to-view-invoice and click-to-view-customer-profile.

**Tabs (Ledger):**
- `Tabs` with "Ledger", "Purchases", "Payments" is already implemented in the wholesale history dialog (lines 1463-1556).

**Settle Due — Action, Not a Page:**
- Settlement is already an action: a "Settle Account" button opens a `PaymentModal` dialog (lines 1607-1622 in retail/wholesale view, lines 1908-1972 in the due view). It records to `customer_payments` table and updates `customers.total_due`.

### What Genuinely Needs Work (3 Real Gaps)

---

## Gap 1: `due` and `paid` Views Are Separate Sub-Pages — Should Be Tabs Inside Retail/Wholesale

**Current behavior:** The main view has 4 navigation cards:
- "Due Customers" → `setViewMode('due')` — renders a completely separate full-page view (lines 1628-2112)  
- "Paid Customers" → `setViewMode('paid')` — renders another full-page view (lines 2114-2459)
- "Retail Customers" → `setViewMode('retail')`
- "Wholesale Accounts" → `setViewMode('wholesale')`

**Problem:** The `due` and `paid` views are cross-cutting (they show ALL customers regardless of type). This means a wholesale customer with a due can appear in both the `due` view AND the `wholesale` view. The `retail` and `wholesale` sub-views already have Due/Paid data implicitly (the "Settle" button appears on any card with `total_due > 0`), but without tabs to filter.

**What the prompt asks for:** Add Due/Paid Tabs _inside_ the `retail` and `wholesale` views, then eliminate the separate `due` and `paid` view modes entirely, replacing the two top action cards with the retail/wholesale entry points.

**Implementation:**

**Step 1: Remove `due` and `paid` from `ViewMode`:**
```ts
// BEFORE:
type ViewMode = 'main' | 'due' | 'paid' | 'memo-search' | 'retail' | 'wholesale';

// AFTER:
type ViewMode = 'main' | 'retail' | 'wholesale';
```

**Step 2: Replace the main view's 4 action cards with 2 (Retail + Wholesale only):**

Remove the "Due Customers" and "Paid Customers" cards (lines 834-894). Keep the "Retail Customers" and "Wholesale Accounts" cards (lines 897-943) but move them up to fill that space.

The summary KPI grid (4 stats: Total Customers, Due Count, Total Due Amount, Clear Count — lines 762-831) stays — it provides the business overview the owner needs at a glance.

**Step 3: Add `Tabs` inside the retail/wholesale sub-view (`viewMode === 'retail' || viewMode === 'wholesale'`):**

Wrap the filtered customer list in shadcn `Tabs` with three tabs:
- **"All"** — `filtered` (the current default list, unchanged)
- **"Due"** — `filtered.filter(c => c.total_due > 0 || c.cylinders_due > 0)`
- **"Paid"** — `filtered.filter(c => c.total_due === 0 && c.cylinders_due === 0)`

```tsx
// State to add:
const [customerTab, setCustomerTab] = useState<'all' | 'due' | 'paid'>('all');

// Inside the retail/wholesale view, replace the bare list with:
<Tabs value={customerTab} onValueChange={(v) => setCustomerTab(v as any)}>
  <TabsList className="grid w-full grid-cols-3">
    <TabsTrigger value="all" className="text-xs gap-1">
      <Users className="h-3.5 w-3.5" />
      All ({filtered.length})
    </TabsTrigger>
    <TabsTrigger value="due" className="text-xs gap-1">
      <UserX className="h-3.5 w-3.5" />
      Due ({filtered.filter(c => c.total_due > 0 || c.cylinders_due > 0).length})
    </TabsTrigger>
    <TabsTrigger value="paid" className="text-xs gap-1">
      <UserCheck className="h-3.5 w-3.5" />
      Paid ({filtered.filter(c => c.total_due === 0 && c.cylinders_due === 0).length})
    </TabsTrigger>
  </TabsList>
  <TabsContent value="all">{/* current card list */}</TabsContent>
  <TabsContent value="due">{/* Due filter cards — with Settle button always visible */}</TabsContent>
  <TabsContent value="paid">{/* Paid filter cards */}</TabsContent>
</Tabs>
```

The `customerTab` state resets to `'all'` when switching between retail/wholesale views.

**Step 4: Remove the standalone `due` and `paid` view mode render blocks (lines 1628-2459).** These ~830 lines of duplicated view code are replaced entirely by the tab system inside the retail/wholesale view.

---

## Gap 2: Memo ID Search in Retail/Wholesale Sub-Views

**Current behavior:** The Memo Recall search is ONLY in the `main` view. The retail and wholesale sub-views have a plain name/phone filter input (line 1256).

**What the prompt asks for:** The search bar in `retail` and `wholesale` views should also accept a Memo ID (transaction_number like `TXN-20250618-0001`) to find the linked customer.

**Implementation:**

Enhance the retail/wholesale search input to detect a Memo ID pattern. When the search query matches `TXN-` prefix (or any all-caps alphanumeric with dashes), run the existing `handleMemoSearch` logic inline rather than filtering by name/phone.

Add a state for memo search within the sub-view:
```ts
const [subViewMemoResults, setSubViewMemoResults] = useState<MemoSearchResult[]>([]);
const [subViewMemoLoading, setSubViewMemoLoading] = useState(false);
```

The search logic:
```ts
// Enhanced filter function in retail/wholesale view:
const isMemoSearch = searchQuery.match(/^[A-Z]+-\d{8}-\d{4}$/i) || searchQuery.toLowerCase().startsWith('txn-');

// If memo search: show results from supabase pos_transactions query
// If not memo search: current name/phone filter (unchanged)
```

When a Memo ID result is clicked, find the linked `customer_id` and auto-open that customer's history dialog (same as clicking the History button on a customer card). This is the "redirect to customer profile" behavior from the spec.

**The database query for Memo ID search** (for both main view and sub-view):
```sql
SELECT 
  pt.id,
  pt.transaction_number,
  pt.created_at,
  pt.total,
  pt.subtotal,
  pt.discount,
  pt.payment_status,
  pt.payment_method,
  pt.customer_id,
  pti.product_name, pti.quantity, pti.unit_price, pti.total_price
FROM pos_transactions pt
LEFT JOIN pos_transaction_items pti ON pti.transaction_id = pt.id
WHERE LOWER(pt.transaction_number) LIKE LOWER('%{query}%')
ORDER BY pt.created_at DESC
LIMIT 10;
```
(The `.select()` call using Supabase JS client is already correctly written in `handleMemoSearch` at lines 297-313.)

---

## Gap 3: Sticky Due Summary in the "Due" Tab

**Current behavior:** The separate `due` view (being deleted) has a 3-stat summary card showing Due Accounts count, Total Amount Due, Cylinders Due. This useful context is lost when we merge into tabs.

**Fix:** Inside the retail/wholesale view, when `customerTab === 'due'`, show a compact summary row above the list:

```tsx
{customerTab === 'due' && (
  <div className="grid grid-cols-3 gap-2 mb-3">
    <div className="bg-rose-500/10 rounded-xl p-3 text-center">
      <p className="text-lg font-bold text-rose-600 tabular-nums">
        {dueFiltered.length}
      </p>
      <p className="text-[10px] text-muted-foreground uppercase">Accounts</p>
    </div>
    <div className="bg-amber-500/10 rounded-xl p-3 text-center">
      <p className="text-sm font-bold text-amber-600 tabular-nums truncate">
        {BANGLADESHI_CURRENCY_SYMBOL}{dueFiltered.reduce((s,c) => s + c.total_due, 0).toLocaleString()}
      </p>
      <p className="text-[10px] text-muted-foreground uppercase">Amount</p>
    </div>
    <div className="bg-purple-500/10 rounded-xl p-3 text-center">
      <p className="text-lg font-bold text-purple-600 tabular-nums">
        {dueFiltered.reduce((s,c) => s + c.cylinders_due, 0)}
      </p>
      <p className="text-[10px] text-muted-foreground uppercase">Cylinders</p>
    </div>
  </div>
)}
```

---

## Complete File Change Summary

| # | Action | File | Lines Affected |
|---|---|---|---|
| 1 | Remove `'due'` and `'paid'` from ViewMode union | `CustomerManagementModule.tsx` | Line 60 |
| 2 | Remove "Due Customers" and "Paid Customers" action cards from main view | `CustomerManagementModule.tsx` | Lines 834-894 |
| 3 | Add `customerTab` state (`'all'|'due'|'paid'`) | `CustomerManagementModule.tsx` | After line 161 |
| 4 | Add 3-tab `Tabs` component inside retail/wholesale view (replacing bare list) | `CustomerManagementModule.tsx` | Lines 1265-1403 |
| 5 | Add compact due-summary strip shown when `customerTab === 'due'` | `CustomerManagementModule.tsx` | Inside new tab content |
| 6 | Enhance search to detect Memo ID pattern in retail/wholesale sub-view | `CustomerManagementModule.tsx` | Lines 1254-1264 |
| 7 | **Delete** the standalone `due` view render block | `CustomerManagementModule.tsx` | Lines 1628-2112 (entire `if (viewMode === 'due')` block) |
| 8 | **Delete** the standalone `paid` view render block | `CustomerManagementModule.tsx` | Lines 2114-2459 (the final `return` block) |

**Total: 0 new files. 0 schema changes. 1 file modified.**

---

## Cleanup Directive — Files and Routes to Delete

After a complete audit:

**External Routes in `App.tsx`:** None to delete. There are no `/dashboard/due-list`, `/dashboard/memo-recall`, or `/dashboard/paid-list` routes in `App.tsx` — they never existed.

**Separate page files:** None to delete. `DueListPage.tsx`, `PaidListPage.tsx`, `MemoRecallPage.tsx` — none of these files exist.

**Sidebar items:** No redundant items. The sidebar has a single "Customers" entry routing to `module=customers`. The `customers` case in `Dashboard.tsx` renders `<CustomerManagementModule />` and will continue to do so.

**The only real deletion** is internal to `CustomerManagementModule.tsx`:
- Delete `viewMode === 'due'` render block (~484 lines, 1628-2112)
- Delete `viewMode === 'paid'` render block (~345 lines, 2114-2459)  
- Remove `'due'` and `'paid'` from the `ViewMode` type
- Remove the 2 action cards that navigated to those views

This reduces the module from **2,459 lines to approximately 1,630 lines** — a 34% reduction.

---

## What the Retail Sub-View Looks Like After the Change

```text
┌─────────────────────────────────────────────────────────┐
│ [← Back]  Retail Customers     [+ Add]                  │
├─────────────────────────────────────────────────────────┤
│ [🔍 Search by name, phone, or Memo ID (TXN-...)...]      │  ← sticky
├─────────────────────────────────────────────────────────┤
│ [  All (32)  ] [  Due (8)  ] [  Paid (24)  ]            │  ← NEW TABS
├─────────────────────────────────────────────────────────┤
│  When "Due" tab active — compact stats strip:           │
│  ┌────────────┬──────────────┬────────────┐            │
│  │  8 accts   │ ৳ 48,500    │  5 cyls    │            │
│  └────────────┴──────────────┴────────────┘            │
├─────────────────────────────────────────────────────────┤
│ Customer Card — Name, phone, "Visited X days ago"       │
│ [History] [📞] [WhatsApp] [Settle ৳]    ← action row   │
├─────────────────────────────────────────────────────────┤
│ Customer Card ...                                       │
└─────────────────────────────────────────────────────────┘
```

The "Settle Due" button already appears conditionally on any card with `total_due > 0` (line 1386-1396) — it will still appear in both the "All" and "Due" tabs naturally.

---

## Technical Notes

- `customerTab` state should reset to `'all'` when `viewMode` changes (add `useEffect` that watches `viewMode` and calls `setCustomerTab('all')`)
- The Memo ID pattern detection uses: `searchQuery.trim().match(/^[A-Z]+-\d+/i)` — matches `TXN-20250618-0001`, `POB-20250618-0001`, `LPG-20250618-abc123`, etc.
- When a Memo ID is detected in the sub-view search, run `handleMemoSearch(searchQuery)` and show results as an overlay dropdown above the list (same UI pattern as the main view's memo recall card). On selecting a result whose `customer_type` doesn't match the current sub-view, show a toast: "This customer is in [Wholesale/Retail] — switching view".
- The `dueFiltered` variable computed as `filtered.filter(c => c.total_due > 0 || c.cylinders_due > 0)` and `paidFiltered` as `filtered.filter(c => c.total_due === 0 && c.cylinders_due === 0)` are derived values inside the existing conditional block — no new state needed for these.
