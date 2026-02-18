
# Retail / Wholesale Customer Segmentation Roadmap

## Database Audit Results

The `customers` table currently has these columns:
`id, name, phone, address, email, total_due, cylinders_due, billing_status, last_order_date, credit_limit, owner_id, created_by, is_demo, created_at, updated_at`

**Critical finding:** NO `customer_type` column exists. All 19 existing customers have `credit_limit = 10000` (the default). There are no existing wholesalers — a clean slate for the migration.

**No extra wholesale-specific columns needed** beyond `customer_type`. The existing `credit_limit` column already serves the "wholesale credit limit" purpose. `company_name` and `trade_license_no` would be over-engineering for an LPG shop CRM — the owner sets wholesale price in Product Pricing, not per-customer. This keeps the data model clean.

---

## Phase 1 — Database Migration

### SQL Changes (1 migration)

```sql
-- Add customer_type column with 'retail' as default
ALTER TABLE public.customers 
  ADD COLUMN customer_type TEXT NOT NULL DEFAULT 'retail' 
  CHECK (customer_type IN ('retail', 'wholesale'));

-- Migrate all existing customers to 'retail' (the default covers it,
-- but this explicit UPDATE ensures data integrity for any NULL edge cases)
UPDATE public.customers SET customer_type = 'retail' WHERE customer_type IS NULL;

-- Set higher default credit limit for wholesale-aware future inserts
-- (no change to existing data — retail stays at 10,000)
```

**Risk: Zero** — `DEFAULT 'retail'` means all existing rows automatically get the correct value. No NULL migration issues. The existing `credit_limit` column continues to serve both types (retail default: 10,000; wholesale: owner sets a higher value like 50,000 or 100,000 when adding).

---

## Phase 2 — SharedCustomer Interface Update

**File:** `src/hooks/useSharedQueries.ts`

The `SharedCustomer` interface must gain the new field so it flows to all consumers (POS, CustomerManagement, POSCustomerLookup):

```typescript
export interface SharedCustomer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  total_due: number;
  cylinders_due: number;
  billing_status: string;
  last_order_date: string | null;
  credit_limit?: number;
  customer_type: 'retail' | 'wholesale';  // NEW
  created_at: string;
}
```

The `fetchCustomers()` function in `useSharedQueries.ts` already selects `'*'` so no query change is needed — the new column arrives automatically.

---

## Phase 3 — Customer Management Module Refactor

**File:** `src/components/dashboard/modules/CustomerManagementModule.tsx`

### 3A — Local `Customer` Interface Update

Add `customer_type` to the local interface and to the mapping from `sharedCustomers`:

```typescript
interface Customer {
  // ...existing fields...
  customer_type: 'retail' | 'wholesale';
}

// In the mapping:
customer_type: (c as any).customer_type || 'retail',
```

### 3B — New ViewMode

Extend the `ViewMode` type:
```typescript
type ViewMode = 'main' | 'due' | 'paid' | 'retail' | 'wholesale';
```

### 3C — New Customer Type Tab on Main View

Replace the existing 2-card grid (Due / Paid) with a **3-section layout**:
1. The existing `Due Customers` and `Paid Customers` action cards — kept as-is
2. A new **Customer Segments** section below the stats with two new entry cards:

**Retail Customers card** (sky/blue theme):
- Shows count of retail customers
- "Manage Retail" → sets `viewMode = 'retail'`

**Wholesale Customers card** (purple/amber theme):
- Shows count of wholesale customers  
- Metrics: total due amount from wholesale only, credit utilization count
- "Manage Wholesale" → sets `viewMode = 'wholesale'`

### 3D — Retail View (`viewMode === 'retail'`)

Speed-optimized. Shows only `customer_type === 'retail'` customers. Focus:
- Mobile card layout with Name + Phone + Last Visit date + Total Spent (sum from history — derived from `total_due`)
- Quick search bar
- "Quick Add" button (only requires Name + Phone, defaults to retail)
- History and Settle actions remain the same

### 3E — Wholesale View (`viewMode === 'wholesale'`)

Account-management focused. Shows only `customer_type === 'wholesale'` customers. Focus:
- Credit Limit vs Current Due progress bar on each customer card
- "Bulk Payment" entry: a drawer that lets the owner record payments for multiple wholesale customers in one flow without re-opening dialogs for each
- Ledger History tab in the history dialog (already exists as the "Sales + Payments" history — just scoped to wholesale)
- Elevated visual treatment (purple/amber theme to distinguish from retail)

### 3F — Add Customer Dialog Update

**File:** `src/components/customer/CustomerAddDialog.tsx` and inline dialog in `CustomerManagementModule.tsx`

Add a **Customer Type** radio/toggle at the top of the form:
- `Retail` (default) — credit limit defaults to 10,000
- `Wholesale` — credit limit field becomes editable and defaults to 50,000

When type = `wholesale`, the insert includes `customer_type: 'wholesale'` and the higher credit limit.

---

## Phase 4 — POS Module Integration (Filter by saleType)

**File:** `src/components/pos/POSCustomerLookup.tsx`

### The Core Logic

The POS already has `saleType: 'retail' | 'wholesale'` state (line 103 of `POSModule.tsx`). This must be passed down to `POSCustomerLookup` and used to filter the Browse list and the phone lookup.

**Current `POSCustomerLookupProps`:**
```typescript
interface POSCustomerLookupProps {
  customers: Customer[];
  ...
}
```

**Updated:**
```typescript
interface POSCustomerLookupProps {
  customers: Customer[];
  saleType: 'retail' | 'wholesale';  // NEW
  ...
}
```

### Filter Behavior

In `POSCustomerLookup`, filter the `filteredCustomers` for the Browse dialog:
```typescript
// When saleType is wholesale, show ALL customers but highlight wholesale ones
// When saleType is retail, show ALL customers (owner may sell retail to any)
// But WARN if selecting a wholesale customer for a retail sale

const filteredCustomers = customerSearch
  ? customers.filter(c => 
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phone?.includes(customerSearch)
    )
  : customers;

// Show a type badge on each customer in the browse list
// 🔵 Retail | 🟣 Wholesale
```

**Phone lookup auto-detection:** When a customer is found by phone, show their type as a badge next to "Old Customer":
- Blue badge for Retail
- Purple badge for Wholesale

**Context-aware warning:** If `saleType === 'retail'` and the looked-up customer is `customer_type === 'wholesale'`, show a subtle amber notice: "This is a wholesale account. Switch to Wholesale sale type?" — with a link/button to switch.

**In `POSModule.tsx`:** Pass `saleType` to `POSCustomerLookup`:
```tsx
<POSCustomerLookup
  customers={customers}
  saleType={saleType}  // NEW
  ...
/>
```

---

## Phase 5 — New Customer Creation in POS (Preserves Type)

When POS creates a new customer (`status === 'new'`), it must pass `customer_type`. The POS determines this from its own `saleType`:

```typescript
// In handleCompleteSale (POSModule.tsx), when inserting new customer:
const { data: newCust } = await supabase.from('customers').insert({
  name: sanitizeString(customerState.newCustomerName),
  phone: normalizedPhone,
  address: customerState.newCustomerAddress || null,
  customer_type: saleType,  // NEW: 'retail' or 'wholesale'
  created_by: user.id,
  owner_id: ownerId || user.id
}).select().single();
```

---

## Complete File Change Summary

| # | File | Change | Type | Risk |
|---|---|---|---|---|
| 1 | **DB Migration** | Add `customer_type TEXT DEFAULT 'retail'` to `customers` table | Schema | Zero — additive |
| 2 | `src/hooks/useSharedQueries.ts` | Add `customer_type` to `SharedCustomer` interface | Interface | Zero — additive |
| 3 | `src/components/dashboard/modules/CustomerManagementModule.tsx` | Add `customer_type` to local interface + mapping; add `retail`/`wholesale` view modes; add segment cards; add Bulk Payment feature for wholesale | Feature | Low |
| 4 | `src/components/customer/CustomerAddDialog.tsx` | Add Customer Type toggle (Retail/Wholesale) + conditional credit limit default | Feature | Zero |
| 5 | `src/components/pos/POSCustomerLookup.tsx` | Accept `saleType` prop; show customer type badges in Browse list; add cross-type warning | Feature | Zero |
| 6 | `src/components/dashboard/modules/POSModule.tsx` | Pass `saleType` to `POSCustomerLookup`; pass `saleType` when creating new customers | Logic | Zero |

**Total: 1 DB migration + 5 component files. Zero new dependencies. Zero breaking changes.**

---

## What Is NOT Changing

- The `complete_pos_sale` RPC function — no changes needed, it already handles customer creation
- The `credit_limit` enforcement logic — already works, wholesale customers will simply get a higher limit set by the owner
- RLS policies — no changes needed (retail/wholesale is a business-layer distinction, not a security boundary)
- The `customers` table RLS — policies already scope by `owner_id` which is correct
- Existing customer data — all 19 existing customers default cleanly to `'retail'`
- The `SharedCustomer` fetch query — already uses `select('*')`, new column arrives automatically

---

## UI Design for the New Segment Cards

```text
┌─────────────────────────────┐  ┌─────────────────────────────┐
│ 🔵 Retail Customers         │  │ 🟣 Wholesale Accounts        │
│ 15 customers                │  │ 4 accounts                  │
│ Focus: Speed & Volume       │  │ Focus: Credit & Ledger      │
│ Last Visit • Total Spent    │  │ Credit Limit • Due Amount   │
│ [Manage Retail →]          │  │ [Manage Wholesale →]        │
└─────────────────────────────┘  └─────────────────────────────┘
```

The existing "Due / Paid" summary cards remain on the main view as they are cross-type totals.
