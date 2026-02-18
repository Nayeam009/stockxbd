
# Customer System Audit — Refactor & Build Plan

## Audit Findings

### Point 1: Duplicate Hunt — Findings

**Route Check — CLEAN (No Duplicate Routes)**

There are no separate `/retail-customers` or `/wholesale-customers` URL routes. The entire customer system lives under a single `CustomerManagementModule` component accessed at `/dashboard?module=customers`. The retail and wholesale views are internal `viewMode` states (`'retail'` | `'wholesale'`) inside that one module — not separate pages. The router in `App.tsx` confirms this: no `/customers`, `/retail-customers`, or `/wholesale-customers` paths exist.

**Component Check — PARTIAL REDUNDANCY FOUND**

The `src/components/customer/` directory contains 6 files that were built as standalone dialog components for an older, more modular pattern:

- `CustomerCard.tsx` — standalone card (never imported in dashboard)
- `CustomerAddDialog.tsx` — standalone add modal (never imported in dashboard)
- `CustomerEditDialog.tsx` — standalone edit dialog
- `CustomerHistoryDialog.tsx` — standalone history dialog
- `CustomerSettleDialog.tsx` — standalone settle dialog
- `CustomerDeleteDialog.tsx` — standalone delete dialog

**Critical Finding:** A search across `src/components/dashboard/modules/` confirms that **none of these 6 components are imported or used by the active `CustomerManagementModule.tsx`**. The module has fully re-implemented all dialogs inline, including its own `handleSettleAccount` logic (which now has the optimistic update), its own history dialog, and its own add-customer inline form. The `src/components/customer/` directory is **dead code** — it is exported by `index.ts` but never consumed by any active module.

**The Add Flow:** There is one "Add Customer" button in the module header that opens `addCustomerDialogOpen` state. This renders an inline JSX dialog (lines 2000-2168) inside `CustomerManagementModule.tsx` — not the `CustomerAddDialog` component from the customer folder. There are no separate `AddRetailCustomer.tsx` or `AddWholesaleCustomer.tsx` files. The inline dialog already handles type toggling (retail vs wholesale) with a `newCustomerType` state toggle.

**Conclusion for Point 1:**

- No duplicate URL routes — PASS
- 6 dead-code component files in `src/components/customer/` — all safe to delete
- No separate add-modal files to merge — the inline dialog is the smart unified component already

---

### Point 2: Ledger Logic Check — CONFIRMED FULLY SUPPORTED

**Database Schema Verification (live query result):**

- `pos_transactions.customer_id` — UUID, nullable → exists ✅
- `customer_payments.customer_id` — UUID, NOT nullable → exists ✅
- `customers.id` — UUID, NOT nullable → exists ✅

Both financial tables (`pos_transactions` and `customer_payments`) have a `customer_id` column. No JOIN through intermediary tables is required — you can query both directly by customer ID.

**Proof Queries (working today):**

```sql
-- Sales ledger for a customer
SELECT id, transaction_number, created_at, total, payment_status
FROM pos_transactions
WHERE customer_id = '[CUSTOMER_UUID]'
  AND is_voided = false
ORDER BY created_at DESC;

-- Payment ledger for a customer
SELECT id, amount, cylinders_collected, payment_date, notes
FROM customer_payments
WHERE customer_id = '[CUSTOMER_UUID]'
ORDER BY payment_date DESC;
```

**The `SaleEntry` type in `useBusinessDiaryQueries.ts` already carries `customerId: string | null`** (line 38). The Business Diary's `fetchSalesData` already fetches `customer_id` on every `pos_transaction` row (line 170) and already fetches `customer_id` on every `customer_payment` row (line 191). The `filteredSales` memo already filters by `s.customerName.includes(query)` which is the hook used by the "View Ledger" button implemented in the last task.

**Conclusion for Point 2:**

The foreign keys exist. A "Financial History" tab inside Wholesale Customer Details can be built by:
1. Adding a third tab "Ledger" to the existing 2-tab `historyDialogOpen` dialog (which currently shows "Purchase History" and "Payments")
2. Combining both `pos_transactions` and `customer_payments` results chronologically for a single customer
3. For wholesale accounts specifically, showing the running balance (credit used vs credit limit) at the top of the ledger tab

No schema migration needed — the data relationships already exist.

---

### Point 3: UX Friction Analysis — GAPS FOUND

**Wholesale "Current Due" display (lines 1250-1251 and 1234-1247):**

Current state: `<Badge variant="destructive" className="text-[10px]">Due: ৳X</Badge>` — this is a small 10px badge on the right column of the card. The `text-[10px]` class makes it barely readable on mobile. The credit bar below the name is correct but also uses a `h-1.5` height (6px) which is very thin on small screens.

Friction found:
- Due badge is `text-[10px]` — too small for mobile readability
- The due amount is NOT shown in bold/red text independently — only inside a small badge
- The credit utilization bar is `h-1.5` (6px) — too thin for quick visual scan

**Retail List action buttons (lines 1253-1276):**

Current state: All action buttons in the retail/wholesale list are `h-8 w-8` (32px). This falls **below** the 44px minimum touch target standard documented in the project's own mobile optimization memory.

Specific findings:
- History button: `h-8 w-8` = 32px — 12px below the 44px minimum
- Ledger button (wholesale): `h-8 w-8` = 32px — same issue
- Settle button: `h-8 w-8` = 32px — same issue

The Due Customers mobile card (lines 1488-1511) uses `h-10` (40px) buttons — still 4px below the 44px standard.

**Retail card — Call/WhatsApp buttons — MISSING ENTIRELY**

The retail list view (`viewMode === 'retail'`) at lines 1217-1282 renders customer cards with only: `History`, `Ledger` (wholesale only), and `Settle` (if due). There are **no Call or WhatsApp quick-action buttons** on the retail cards, despite the customer cards in the `src/components/customer/CustomerCard.tsx` file defining this as a needed feature and the module having `Phone` imported from lucide-react.

---

## Refactor & Build Plan

### Part 1 — Files to DELETE (Dead Code Cleanup)

The following 7 files are confirmed dead code — they are defined but never imported by any active dashboard module, page, or route. They can be safely deleted:

| # | File | Why Safe to Delete |
|---|---|---|
| 1 | `src/components/customer/CustomerCard.tsx` | Never imported in any active module |
| 2 | `src/components/customer/CustomerAddDialog.tsx` | CustomerManagementModule uses its own inline add form |
| 3 | `src/components/customer/CustomerEditDialog.tsx` | No edit flow currently wired in dashboard |
| 4 | `src/components/customer/CustomerHistoryDialog.tsx` | Module uses inline dialog at lines 1684-1808 |
| 5 | `src/components/customer/CustomerSettleDialog.tsx` | Module uses inline dialog with optimistic update |
| 6 | `src/components/customer/CustomerDeleteDialog.tsx` | No delete flow currently wired in dashboard |
| 7 | `src/components/customer/index.ts` | Barrel export for the above dead files |

**Note:** Before deleting, confirm `CustomerCard` is not used by the LPG Community pages (community customer display). A search confirmed it is not — community pages use their own `ShopCard`, `OrderCard` components. Safe to delete.

---

### Part 2 — Customer Ledger Tab Schema

Add a third tab "Ledger" to the `historyDialogOpen` dialog inside `CustomerManagementModule.tsx`. Change the `TabsList` from `grid-cols-2` to `grid-cols-3`.

**Data model for the combined ledger:**

```typescript
interface LedgerEntry {
  id: string;
  date: string; // ISO timestamp for sorting
  type: 'sale' | 'payment';
  // Sale fields
  transactionNumber?: string;
  items?: string;
  saleTotal?: number;
  paymentStatus?: string;
  // Payment fields
  amountPaid?: number;
  cylindersCollected?: number;
  // Running balance
  balanceAfter: number; // computed client-side
}
```

**Query logic** (already proven via DB audit):

```typescript
const fetchLedger = async (customerId: string) => {
  const [salesRes, paymentsRes] = await Promise.all([
    supabase
      .from('pos_transactions')
      .select('id, transaction_number, created_at, total, payment_status, pos_transaction_items(product_name, quantity)')
      .eq('customer_id', customerId)
      .eq('is_voided', false)
      .order('created_at', { ascending: false }),
    supabase
      .from('customer_payments')
      .select('id, amount, cylinders_collected, payment_date, notes')
      .eq('customer_id', customerId)
      .order('payment_date', { ascending: false })
  ]);
  // Merge, sort by date, compute running balance
};
```

**UI — Wholesale-specific enrichment:**

For wholesale customers, the ledger tab header shows:
- Credit Limit: ৳50,000
- Current Balance Used: ৳12,000 (24% of limit)
- Progress bar (existing credit bar, promoted to full-width)

For retail customers, the ledger tab header shows a simpler summary: Total Purchased | Total Paid | Total Outstanding.

**No migration needed** — `customer_id` FK exists on both tables.

---

### Part 3 — Mobile UX Fixes

Three specific changes to `CustomerManagementModule.tsx`:

**Fix A — Wholesale "Current Due" visibility (lines ~1250-1251)**

Change the due badge from `text-[10px]` to a more prominent inline display above the credit bar:

```tsx
// BEFORE: small destructive badge
<Badge variant="destructive" className="text-[10px]">Due: ৳{c.total_due.toLocaleString()}</Badge>

// AFTER: bold inline amount shown directly, badge just for status
{c.total_due > 0 && (
  <p className="text-sm font-bold text-rose-600 tabular-nums">
    ৳{c.total_due.toLocaleString()} due
  </p>
)}
```

Also increase the credit bar height from `h-1.5` to `h-2` and add color interpolation: green when < 50% used, amber when 50-80%, red when > 80%.

**Fix B — Touch target upgrade for list action buttons (lines ~1253-1276)**

Upgrade all action buttons in the retail/wholesale list from `h-8 w-8` (32px) to `h-11 w-11` (44px) — meeting the project's own documented mobile standard:

```tsx
// BEFORE:
<Button variant="ghost" size="sm" className="h-8 w-8 p-0" ...>

// AFTER:
<Button variant="ghost" size="sm" className="h-11 w-11 p-0 touch-manipulation" ...>
```

This applies to: History button, Ledger button (wholesale), Settle button.

**Fix C — Add Call/WhatsApp quick-action buttons to Retail cards**

The retail customer list has no quick-contact buttons at all. Add two icon-only buttons after the History button, conditionally rendered when `c.phone` is present:

```tsx
{c.phone && (
  <>
    <Button
      variant="ghost"
      size="sm"
      className="h-11 w-11 p-0 text-emerald-600 hover:bg-emerald-500/10 touch-manipulation"
      asChild
    >
      <a href={`tel:${c.phone}`} aria-label={`Call ${c.name}`}>
        <Phone className="h-4 w-4" />
      </a>
    </Button>
    <Button
      variant="ghost"
      size="sm"
      className="h-11 w-11 p-0 text-green-600 hover:bg-green-500/10 touch-manipulation"
      asChild
    >
      <a
        href={`https://wa.me/${c.phone.replace(/\D/g, '')}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`WhatsApp ${c.name}`}
      >
        <MessageSquare className="h-4 w-4" />
      </a>
    </Button>
  </>
)}
```

Import `MessageSquare` from lucide-react (already partially imported, `Phone` is already imported at line 38 of the module).

---

## Summary of All Changes

| # | Category | Action | File |
|---|---|---|---|
| 1-7 | Cleanup | DELETE 7 dead code files | `src/components/customer/*` |
| 8 | Build | Add "Ledger" as 3rd tab in customer history dialog | `CustomerManagementModule.tsx` |
| 9 | Build | Fetch and display combined ledger entries (sales + payments) | `CustomerManagementModule.tsx` |
| 10 | UX Fix | Wholesale due amount — larger text + smarter credit bar color | `CustomerManagementModule.tsx` |
| 11 | UX Fix | Upgrade action buttons from 32px to 44px touch targets | `CustomerManagementModule.tsx` |
| 12 | UX Fix | Add Call/WhatsApp buttons to retail customer cards | `CustomerManagementModule.tsx` |

**Zero schema migrations required. Zero new dependencies. 7 files deleted. 1 file modified.**
