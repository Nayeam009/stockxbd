

# Phase 2: Database and Core Logic Refinement -- Audit Results

## What Already Exists (No New Tables Needed)

The requested tables map directly to existing infrastructure:

### 1. "lpg_inventory" Already Exists as `lpg_brands` + `product_prices`

| Requested Column | Existing Implementation |
|---|---|
| `brand` | `lpg_brands.name` (text) |
| `cylinder_size` | `lpg_brands.weight` (e.g., "12kg", "35kg") + `lpg_brands.size` (valve: "22mm"/"20mm") |
| `stock_status` (Full/Empty) | Split into 4 granular columns: `package_cylinder`, `refill_cylinder`, `empty_cylinder`, `problem_cylinder` |
| `quantity` | Sum of the above columns per status |
| `buy_price` / `sell_price` | Stored in `product_prices` table with `company_price`, `distributor_price`, `retail_price`, `package_price` per variant (Refill/Package) |

Additionally, an `inventory_summary` materialized view exists with a `sync_inventory_summary` trigger that auto-updates aggregated counts.

### 2. "daily_transactions" Already Exists Across Multiple Tables

| Requested Column | Existing Implementation |
|---|---|
| `transaction_type` (Income) | `pos_transactions` (sales) + `customer_payments` (due collections) |
| `transaction_type` (Expense) | `pob_transactions` (purchases) + `daily_expenses` (manual) + `staff_payments` + `vehicle_costs` |
| `category` | `daily_expenses.category` (Utility, Salary, etc.) + auto-categorized from source table |
| `amount` | Each table has its own `total` / `amount` column |
| `payment_method` | `pos_transactions.payment_method` (enum: cash, bkash, nagad, rocket, due, partial) |
| `date` | `created_at` on all tables, `expense_date` on `daily_expenses` |

The `useBusinessDiaryData` hook already aggregates all 5 source tables into unified `SaleEntry[]` and `ExpenseEntry[]` arrays with analytics (daily/weekly/monthly/yearly profit calculations).

### 3. RLS Policies Already Enforce Multi-Tenant Isolation

All tables use a consistent pattern:
- `owner_id = get_owner_id()` for SELECT (team members see only their shop's data)
- `is_admin(auth.uid())` for INSERT/UPDATE (only owners and managers can modify)
- `has_role(auth.uid(), 'owner')` for DELETE (only owners can delete)
- `is_super_admin(auth.uid())` for admin-level access

---

## Actual Gaps Found (What Needs Fixing)

### Gap 1: POS Inventory Updates Are Not Atomic
**Problem:** When a sale completes in `POSModule.tsx`, inventory is updated via 3-5 separate `supabase.update()` calls. If one fails mid-sequence, the transaction is recorded but inventory is partially updated.

**Fix:** Create a single Postgres RPC function `complete_pos_sale` that wraps all updates in a database transaction.

### Gap 2: `customer_payments` Has No `owner_id` Scoping
**Problem:** The `customer_payments` table has no `owner_id` column. RLS relies on `is_admin(auth.uid())` which allows any admin to see all payments across all shops. The `fetchPayments` function in CustomerManagement also has no team filter.

**Fix:** The table relies on the `customers` foreign key for implicit scoping (each customer belongs to an owner). However, the RLS policy should be tightened to check that the payment's customer belongs to the caller's team.

### Gap 3: `staff_payments` and `vehicle_costs` Fetches in Business Diary Are Unbounded
**Problem:** `useBusinessDiaryData` applies a 30-day filter to `pos_transactions` and `pob_transactions` but NOT to `staff_payments` (line 436) or `vehicle_costs` (line 457). These fetch ALL records with only a `.limit(200)`.

**Fix:** Apply the same `thirtyDaysAgo` date filter to these queries.

### Gap 4: Duplicate RLS Policies on `customer_payments`
**Problem:** The `customer_payments` table has duplicate INSERT, SELECT, UPDATE, and DELETE policies (e.g., "Admins can insert customer payments" AND "Admins can insert customer_payments"). This is redundant and confusing.

**Fix:** Clean up duplicate policies, keeping only the simpler `is_admin()` versions.

---

## Implementation Plan

### Step 1: Create Atomic POS Sale RPC
Create a database function `complete_pos_sale` that:
- Inserts the `pos_transactions` record
- Inserts all `pos_transaction_items`
- Updates `lpg_brands` inventory (decrement refill/package, increment empty)
- Updates `stoves` / `regulators` quantities
- Updates `customers.total_due` if payment is due/partial
- Inserts into `daily_expenses` if needed
- All within a single transaction (automatic rollback on failure)

### Step 2: Fix Unbounded Fetches in Business Diary
Add `thirtyDaysAgo` date filter to `staff_payments` and `vehicle_costs` queries in `useBusinessDiaryData.ts`.

### Step 3: Clean Up Duplicate RLS on `customer_payments`
Drop the 4 duplicate policies and keep the cleaner versions.

### Step 4: Tighten `customer_payments` RLS
Update SELECT/INSERT policies to verify the payment's `customer_id` belongs to the caller's team via `customers.owner_id = get_owner_id()`.

---

## Technical Details

### Files to Modify
- **New migration**: Atomic POS RPC function + RLS cleanup
- `src/hooks/useBusinessDiaryData.ts`: Add date filters to staff/vehicle queries
- `src/components/dashboard/modules/POSModule.tsx`: Call RPC instead of individual updates

### No New Tables Required
The existing schema (`lpg_brands` + `product_prices` + `inventory_summary` + `pos_transactions` + `pob_transactions` + `daily_expenses` + `staff_payments` + `vehicle_costs`) already provides full coverage for both Inventory and Business Diary requirements. Creating duplicate tables would fragment the data and break existing module integrations.

### TypeScript Types
The `src/integrations/supabase/types.ts` file is auto-generated from the database schema. No manual updates are needed -- it will regenerate automatically after the migration runs.

