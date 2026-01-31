
# Rebuild Customer & Utility Expense Modules

## Overview
This plan addresses issues in both modules to improve design, optimization, and module connectivity. The goal is to create professional, mobile-first interfaces with real-time synchronization across all connected modules.

---

## Part 1: Customer Management Module Rebuild

### Current Issues Identified
1. **Missing Real-time Subscriptions**: No live updates when customer data changes from POS or other modules
2. **Duplicate Code**: History dialogs appear twice (in main view and due view)
3. **No Edit Customer Feature**: Cannot modify existing customer details
4. **Missing Delete Confirmation**: No confirmation dialog for destructive actions
5. **No Loading States for Sub-actions**: History and payment actions lack loading feedback
6. **Large Component Size**: 1900+ lines in single file needs splitting

### Design Improvements
1. **Unified Component Architecture**:
   - Split into smaller, focused components
   - Create `CustomerStatCard.tsx`, `CustomerCard.tsx`, `CustomerHistoryDialog.tsx`, `CustomerSettleDialog.tsx`

2. **Mobile-First Redesign**:
   - Use shared `PremiumModuleHeader` and `PremiumStatCard` components for consistency
   - 48px minimum touch targets on all interactive elements
   - Swipe-to-action on customer cards (settle/history shortcuts)

3. **Real-time Sync Integration**:
   ```text
   +----------------+     +------------------+     +-----------------+
   |      POS       | --> | customers table  | <-- | Customer Module |
   | (creates/links |     | (real-time sub)  |     | (view/manage)   |
   |   customers)   |     +------------------+     +-----------------+
   +----------------+             |
                                  v
                    +---------------------------+
                    |     Business Diary        |
                    | (tracks payment history)  |
                    +---------------------------+
   ```

### Implementation Steps

**Step 1: Extract Sub-components**
- `CustomerStatCard.tsx` - Reusable KPI cards using `PremiumStatCard`
- `CustomerCard.tsx` - Individual customer display card
- `CustomerHistoryDialog.tsx` - Purchase & payment history dialog
- `CustomerSettleDialog.tsx` - Account settlement dialog
- `CustomerAddDialog.tsx` - Add new customer dialog

**Step 2: Add Real-time Subscriptions**
```typescript
// Add to CustomerManagementModule
useEffect(() => {
  const channel = supabase
    .channel('customer-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, refetch)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_payments' }, fetchPayments)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pos_transactions' }, refetch)
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, [refetch, fetchPayments]);
```

**Step 3: Add Edit Customer Feature**
- Add "Edit" button on customer cards
- Create `CustomerEditDialog.tsx` with form validation
- Update customer in database with proper RLS compliance

**Step 4: Add Delete with Confirmation**
- Add `AlertDialog` for delete confirmation
- Show customer's outstanding dues before deletion
- Prevent deletion if customer has active due

**Step 5: Module Connectivity Fixes**
- Link customer settlements to `daily_expenses` with proper category
- Ensure POS transactions correctly update customer due amounts
- Sync with Business Diary for payment tracking

---

## Part 2: Utility Expense Module Rebuild

### Current Issues Identified
1. **Missing owner_id on inserts**: Staff payments and vehicle costs may not have owner_id set
2. **No Edit Functionality**: Cannot modify existing staff or vehicle records
3. **Limited History View**: Staff payment history lacks detail and filtering
4. **No Fuel Efficiency Tracking**: Vehicle costs collect odometer but don't calculate MPG/KPL
5. **Missing Confirmation Dialogs**: Delete actions lack confirmation

### Design Improvements

1. **Enhanced KPI Dashboard**:
   - Add trend indicators (vs last month)
   - Add fuel efficiency metrics for vehicles
   - Show salary completion percentage

2. **Improved Staff Management**:
   - Add staff profile pictures (avatar with initials)
   - Add advance payment tracking
   - Add salary slip generation

3. **Enhanced Vehicle Tracking**:
   - Fuel efficiency calculations (km/L)
   - Maintenance reminders
   - Cost breakdown by vehicle

### Implementation Steps

**Step 1: Fix owner_id Assignment**
```typescript
// Ensure owner_id is set on all inserts
const { data: ownerId } = await supabase.rpc("get_owner_id");

await supabase.from("staff").insert({
  ...newStaff,
  created_by: user.user.id,
  owner_id: ownerId || user.user.id // Critical fix
});
```

**Step 2: Add Edit Functionality**
- Create `StaffEditDialog.tsx` for editing staff details
- Create `VehicleEditDialog.tsx` for vehicle details
- Add inline editing for quick salary adjustments

**Step 3: Enhance History Dialogs**
- Add date range filtering to staff payment history
- Show running balance calculations
- Add print/export functionality for payment records

**Step 4: Add Fuel Efficiency Metrics**
```typescript
// Calculate fuel efficiency
const calculateEfficiency = (costs: VehicleCost[]): number => {
  const fuelCosts = costs.filter(c => c.cost_type === 'Fuel' && c.liters_filled && c.odometer_reading);
  if (fuelCosts.length < 2) return 0;

  // Sort by odometer to get distance traveled
  const sorted = fuelCosts.sort((a, b) => (a.odometer_reading || 0) - (b.odometer_reading || 0));
  const totalKm = (sorted[sorted.length - 1].odometer_reading || 0) - (sorted[0].odometer_reading || 0);
  const totalLiters = sorted.slice(1).reduce((sum, c) => sum + (c.liters_filled || 0), 0);

  return totalLiters > 0 ? totalKm / totalLiters : 0;
};
```

**Step 5: Add Delete Confirmations**
- Wrap all delete actions in `AlertDialog`
- Show impact warning (e.g., "This will remove 5 payment records")

---

## Part 3: Module Connectivity Matrix

| Source Action | Target Updates |
|---------------|----------------|
| POS Sale (Due) | customers.total_due++, Business Diary |
| Customer Settlement | customers.total_due--, daily_expenses, customer_payments |
| Staff Salary Payment | staff_payments, daily_expenses (auto) |
| Vehicle Cost Added | vehicle_costs, daily_expenses (auto) |
| POB Purchase | daily_expenses (already connected) |

---

## Part 4: File Structure After Rebuild

```text
src/components/
  customer/
    CustomerStatCard.tsx (NEW)
    CustomerCard.tsx (NEW)
    CustomerHistoryDialog.tsx (NEW)
    CustomerSettleDialog.tsx (NEW)
    CustomerAddDialog.tsx (NEW)
    CustomerEditDialog.tsx (NEW)
  utility/
    StaffCard.tsx (NEW)
    StaffPayDialog.tsx (NEW)
    StaffHistoryDialog.tsx (NEW)
    StaffEditDialog.tsx (NEW)
    VehicleCard.tsx (NEW)
    VehicleCostDialog.tsx (NEW)
    VehicleEditDialog.tsx (NEW)
    FuelEfficiencyCard.tsx (NEW)
  dashboard/modules/
    CustomerManagementModule.tsx (REFACTORED - reduced to ~400 lines)
    UtilityExpenseModule.tsx (REFACTORED - reduced to ~400 lines)
```

---

## Technical Details

### Database Changes
None required - all tables already exist with proper structure.

### Performance Optimizations
1. **Debounced Real-time**: 800ms debounce on subscription callbacks
2. **Virtualized Lists**: For customers with 100+ records
3. **Memoized Calculations**: All sum/filter operations wrapped in `useMemo`
4. **Lazy Loading**: Sub-dialogs lazy loaded to reduce initial bundle

### Mobile Responsiveness
- All cards use responsive grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
- Touch targets minimum 44px (mostly 48px)
- Input fields use `input-accessible` class (16px font to prevent iOS zoom)
- Bottom padding accounts for mobile navigation

---

## Summary of Changes

| Module | Before | After |
|--------|--------|-------|
| Customer Management | 1908 lines, no real-time | ~400 lines, full real-time sync |
| Utility Expense | 881 lines, limited features | ~400 lines, fuel tracking, edit support |
| Connectivity | Partial sync | Full bi-directional sync |
| Components | Monolithic | Modular (12 new sub-components) |

This rebuild ensures both modules are professional, optimized, and fully connected with POS, Business Diary, and Inventory modules.
