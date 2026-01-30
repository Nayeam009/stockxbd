
# Dashboard Rebuild Plan

## Current State Analysis

After thorough examination of the codebase, I identified the following issues that need fixing:

### Issues Found

| Issue | Location | Impact |
|-------|----------|--------|
| 1. **Legacy `super_admin` role reference** | `MobileBottomNav.tsx` line 10 | Type mismatch, unnecessary role |
| 2. **Unused `safetyTimeoutReached` state** | `Dashboard.tsx` line 63 | Dead code, memory waste |
| 3. **Missing expenses integration** | `DashboardOverview.tsx` line 36 | Hardcoded `todayExpenses = 0` |
| 4. **Stale module references in navigation** | Multiple files | `lpg-stock`, `staff-salary` not mapped |
| 5. **Incomplete role cleanup in types** | `MobileBottomNav.tsx` | Contains `super_admin` in interface |

---

## Rebuild Architecture

### Dashboard Shell Structure

```text
┌─────────────────────────────────────────────────────────────────┐
│  SidebarProvider (defaultOpen=false)                            │
├─────────────┬───────────────────────────────────────────────────┤
│  AppSidebar │              Main Content Area                    │
│  (Desktop)  │  ┌────────────────────────────────────────────┐   │
│             │  │  DashboardHeader                           │   │
│  - Overview │  │  (Search, Notifications, Admin, Settings)  │   │
│  - Admin    │  ├────────────────────────────────────────────┤   │
│  - Diary    │  │                                            │   │
│  - POS      │  │  Active Module Content                     │   │
│  - My Shop  │  │  (Lazy loaded with Suspense)               │   │
│  - Inventory│  │                                            │   │
│  - Pricing  │  │  Wrapped in OfflineErrorBoundary           │   │
│  - Customers│  │                                            │   │
│  - Expenses │  ├────────────────────────────────────────────┤   │
│  - Analysis │  │  MobileBottomNav (md:hidden)               │   │
│  - Settings │  │  (Home, Diary, POS, MyShop, More)          │   │
│             │  └────────────────────────────────────────────┘   │
└─────────────┴───────────────────────────────────────────────────┘
```

---

## Part 1: Fix Type Consistency

### File: `src/components/dashboard/MobileBottomNav.tsx`

**Current (Line 10)**:
```typescript
userRole: 'owner' | 'manager' | 'super_admin';
```

**Fixed**:
```typescript
userRole: 'owner' | 'manager';
```

**Additional Changes**:
- Remove all `super_admin` from `roles` arrays in navItems (lines 14-34, 37-67)
- These items should only have `['owner', 'manager']`

---

## Part 2: Clean Dead Code in Dashboard.tsx

### Remove Unused State (Line 63)

**Current**:
```typescript
const [safetyTimeoutReached, setSafetyTimeoutReached] = useState(false);
```

**Action**: Delete this line - it's never used anywhere in the component.

---

## Part 3: Fix Expenses Integration in DashboardOverview

### Current Issue (Line 36)

```typescript
const todayExpenses = 0; // Will be calculated from expenses module
```

This is hardcoded to 0, making the profit calculation inaccurate.

### Solution

Integrate with `useBusinessDiaryData` hook or pass expenses from parent:

1. Modify `useDashboardData.ts` to also fetch today's expenses from `daily_expenses` table
2. Add `todayExpenses` to the `DashboardAnalytics` interface
3. Pass real expense data to `DashboardOverview`

**New Analytics Field**:
```typescript
// In useDashboardData.ts
interface DashboardAnalytics {
  // ... existing fields
  todayExpenses: number; // Add this
}
```

**Fetch Logic**:
```typescript
// Add to parallel fetch
const expensesResult = await supabase
  .from('daily_expenses')
  .select('amount')
  .eq('expense_date', today);

const todayExpenses = expensesResult.data?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
```

---

## Part 4: Fix Navigation Module Mappings

### Issue in GlobalCommandPalette.tsx

Actions reference modules that don't exist in the switch statement:
- `action-add-stock` → navigates to `lpg-stock` (should be `inventory`)
- `action-pay-salary` → navigates to `staff-salary` (doesn't exist)

### Fix Actions (lines 130-137)

```typescript
case 'action-add-stock':
  setActiveModule('inventory');  // Changed from 'lpg-stock'
  setTimeout(() => toast.info('Click "Add Brand" to add new stock'), 500);
  break;
case 'action-pay-salary':
  setActiveModule('utility-expense');  // Changed from 'staff-salary'
  setTimeout(() => toast.info('Go to Staff Salary tab to make payment'), 500);
  break;
```

### DashboardOverview Quick Action (Line 283)

```typescript
onClick={() => setActiveModule?.('inventory')}  // Changed from 'lpg-stock'
```

---

## Part 5: Module Navigation Order Consistency

### File: `src/hooks/useSwipeNavigation.ts`

Ensure module order matches sidebar order:

```typescript
const allModules = [
  { id: 'overview', roles: ['owner', 'manager'] },
  { id: 'business-diary', roles: ['owner', 'manager'] },
  { id: 'pos', roles: ['owner', 'manager'] },
  { id: 'my-shop', roles: ['owner', 'manager'] },
  { id: 'inventory', roles: ['owner', 'manager'] },
  { id: 'product-pricing', roles: ['owner', 'manager'] },
  { id: 'customers', roles: ['owner', 'manager'] },
  { id: 'utility-expense', roles: ['owner', 'manager'] },
  { id: 'analysis-search', roles: ['owner', 'manager'] },
  { id: 'settings', roles: ['owner', 'manager'] },
];
```

---

## Part 6: Add Real-Time Expense Sync

### File: `src/hooks/useDashboardData.ts`

Add expense subscription to the real-time channel (Line 436):

```typescript
.on('postgres_changes', { event: '*', schema: 'public', table: 'daily_expenses' }, debouncedRefetch)
```

---

## Implementation Checklist

| Step | File | Action | Priority |
|------|------|--------|----------|
| 1 | `MobileBottomNav.tsx` | Remove `super_admin` from interface and arrays | High |
| 2 | `Dashboard.tsx` | Remove unused `safetyTimeoutReached` state | Medium |
| 3 | `useDashboardData.ts` | Add `todayExpenses` fetch and real-time sync | High |
| 4 | `DashboardOverview.tsx` | Use `analytics.todayExpenses` instead of hardcoded 0 | High |
| 5 | `GlobalCommandPalette.tsx` | Fix module navigation mappings | Medium |
| 6 | `useSwipeNavigation.ts` | Verify module order matches sidebar | Low |

---

## Success Criteria

After implementing this plan:

1. **No TypeScript errors** - All role types are consistent (`'owner' | 'manager'`)
2. **Accurate profit calculation** - Dashboard shows real expenses from `daily_expenses` table
3. **Working quick actions** - All navigation commands route to valid modules
4. **Real-time sync** - Expenses update automatically when added via Business Diary
5. **Clean code** - No dead code or unused state variables
6. **Consistent navigation** - Swipe gestures match sidebar order

---

## Testing Requirements

After implementation, verify:

1. Dashboard loads within 3 seconds for authenticated users
2. KPI cards show accurate Today's Sale, Expense, and Profit
3. Quick Actions navigate to correct modules
4. Swipe gestures work on mobile (left/right)
5. Real-time updates work when sales/expenses are added
6. Admin panel only visible to admin user (khnayeam009@gmail.com)
7. Customer users redirect to /community (not dashboard)
