

# Business Diary Module - Complete Rebuild Plan

## Current State Analysis

After thorough examination of the codebase, I've identified the current implementation and issues that need optimization:

### Architecture Overview

The Business Diary currently has **two parallel data hooks**:
1. `useBusinessDiaryData.ts` (772 lines) - Full analytics hook with all data
2. `useBusinessDiaryQueries.ts` (527 lines) - TanStack Query-based hook for date-specific fetching

The module uses `useBusinessDiaryQueries.ts` in production but has code duplication.

### Issues Found

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 1 | **Duplicate data hooks** | Two hooks with similar logic | Code bloat, maintenance burden |
| 2 | **Missing Customer Debt Summary** | No visibility of Due/Partial customers | Business critical data hidden |
| 3 | **No Payment Status Filters** | Cannot filter by Paid/Partial/Due | Hard to track outstanding payments |
| 4 | **Staff/Vehicle Costs not synced** | `useBusinessDiaryQueries` missing staff_payments/vehicle_costs | Incomplete expense tracking |
| 5 | **COGS not displayed** | Calculated but not shown to user | Profitability insight missing |
| 6 | **No Date Range Selection** | Only single date picker | Cannot view weekly/monthly summaries |
| 7 | **No Export Functionality** | Cannot export data | Business reporting limitation |
| 8 | **Missing Quick Stats** | No visual KPI breakdown | Poor dashboard experience |
| 9 | **Hardcoded category list** | `EXPENSE_CATEGORIES` missing POB categories | Categories mismatch with actual data |
| 10 | **Mobile Tab Badge overlap** | Badge styling on mobile tabs | UI polish issue |

---

## Rebuild Architecture

### New Module Structure

```text
BusinessDiaryModule (Main Container)
├── BusinessDiaryHeader
│   ├── Title + Description
│   ├── View Mode Toggle (Cash Flow / Profit)
│   ├── Date Range Selector (Today / This Week / This Month / Custom)
│   └── Action Buttons (Add Expense / Export / Refresh)
│
├── BusinessDiarySummaryGrid (6 Cards)
│   ├── Total Sales (Cash Received)
│   ├── Total Expenses (Money Out)
│   ├── Net Profit/Loss
│   ├── Paid Customers
│   ├── Partial Paid Customers
│   └── Due Customers
│
├── BusinessDiaryFilters
│   ├── Search Bar (Product/Customer/Transaction)
│   ├── Payment Status Filter (All / Paid / Partial / Due)
│   └── Source Filter (POS / Online / Customer Payment / POB)
│
└── BusinessDiaryContent
    ├── Mobile: Tab View (Sales | Expenses)
    └── Desktop: Side-by-Side Panels
        ├── Sales Panel (with status grouping)
        │   ├── Paid Sales Section
        │   ├── Partial Paid Section
        │   └── Due Sales Section
        └── Expenses Panel (with source grouping)
            ├── POB Purchases
            ├── Staff Payments
            ├── Vehicle Costs
            └── Manual Expenses
```

---

## Part 1: Consolidate Data Hooks

### Remove Duplicate Hook
Delete or deprecate `useBusinessDiaryData.ts` and enhance `useBusinessDiaryQueries.ts` to include:

1. **Add Staff Payments & Vehicle Costs** to expense fetch
2. **Add Customer Debt Summary** calculation
3. **Add COGS integration** with product_prices lookup

### Enhanced Expense Fetching
```typescript
// Add to fetchExpensesData parallel queries
const [userRolesResult, pobResult, manualExpensesResult, staffPaymentsResult, vehicleCostsResult] = await Promise.all([
  supabase.from('user_roles').select('user_id, role'),
  supabase.from('pob_transactions')...,
  supabase.from('daily_expenses')...,
  supabase.from('staff_payments')
    .select('id, staff_id, amount, payment_date, notes, created_at, created_by, staff(name, role)')
    .eq('payment_date', date),
  supabase.from('vehicle_costs')
    .select('id, vehicle_id, amount, cost_type, cost_date, description, liters_filled, created_at, created_by, vehicles(name)')
    .eq('cost_date', date)
]);
```

---

## Part 2: Customer Debt Summary Integration

### Add New Interface
```typescript
interface CustomerDebtSummary {
  totalPaidCount: number;
  totalPaidAmount: number;
  partialPaidCount: number;
  partialPaidAmount: number;
  partialRemainingDue: number;
  dueCount: number;
  dueAmount: number;
}
```

### Calculate from Sales Data
```typescript
const customerDebtSummary = useMemo(() => {
  const paid = filteredSales.filter(s => s.paymentStatus === 'paid');
  const partial = filteredSales.filter(s => s.paymentStatus === 'partial');
  const due = filteredSales.filter(s => s.paymentStatus === 'due');
  
  return {
    totalPaidCount: paid.length,
    totalPaidAmount: paid.reduce((sum, s) => sum + s.totalAmount, 0),
    partialPaidCount: partial.length,
    partialPaidAmount: partial.reduce((sum, s) => sum + s.amountPaid, 0),
    partialRemainingDue: partial.reduce((sum, s) => sum + s.remainingDue, 0),
    dueCount: due.length,
    dueAmount: due.reduce((sum, s) => sum + s.totalAmount, 0)
  };
}, [filteredSales]);
```

---

## Part 3: Enhanced Summary Cards (6-Card Grid)

### New Grid Layout
```typescript
<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
  {/* 1. Total Sales */}
  <SummaryCard 
    title="Total Sales" 
    value={dayTotals.cashIn} 
    icon={ArrowUpRight}
    color="emerald"
    subtitle={`${filteredSales.length} transactions`}
  />
  
  {/* 2. Total Expenses */}
  <SummaryCard 
    title="Total Expenses" 
    value={dayTotals.cashOut} 
    icon={ArrowDownRight}
    color="rose"
    subtitle={`${filteredExpenses.length} entries`}
  />
  
  {/* 3. Net Profit/Loss */}
  <SummaryCard 
    title="Net Profit" 
    value={dayTotals.netCashFlow} 
    icon={dayTotals.netCashFlow >= 0 ? TrendingUp : TrendingDown}
    color={dayTotals.netCashFlow >= 0 ? 'primary' : 'destructive'}
  />
  
  {/* 4. Paid Customers */}
  <SummaryCard 
    title="Paid" 
    value={customerDebtSummary.totalPaidAmount} 
    icon={CheckCircle}
    color="emerald"
    subtitle={`${customerDebtSummary.totalPaidCount} customers`}
    onClick={() => setPaymentFilter('paid')}
  />
  
  {/* 5. Partial Paid */}
  <SummaryCard 
    title="Partial" 
    value={customerDebtSummary.partialPaidAmount} 
    icon={Clock}
    color="amber"
    subtitle={`Due: ৳${customerDebtSummary.partialRemainingDue.toLocaleString()}`}
    onClick={() => setPaymentFilter('partial')}
  />
  
  {/* 6. Due Customers */}
  <SummaryCard 
    title="Due" 
    value={customerDebtSummary.dueAmount} 
    icon={AlertCircle}
    color="rose"
    subtitle={`${customerDebtSummary.dueCount} unpaid`}
    onClick={() => setPaymentFilter('due')}
  />
</div>
```

---

## Part 4: Payment Status Filtering

### Add Filter State
```typescript
const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'partial' | 'due'>('all');
```

### Filter Sales by Payment Status
```typescript
const filteredSales = useMemo(() => {
  return sales.filter(s => {
    // Date filter
    if (dateFilter && s.date !== dateFilter) return false;
    
    // Payment status filter
    if (paymentFilter !== 'all' && s.paymentStatus !== paymentFilter) return false;
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return s.productName.toLowerCase().includes(query) ||
        s.customerName.toLowerCase().includes(query) ||
        s.transactionNumber.toLowerCase().includes(query) ||
        (s.customerPhone && s.customerPhone.includes(query));
    }
    return true;
  });
}, [sales, dateFilter, searchQuery, paymentFilter]);
```

### Filter Tabs UI
```typescript
<Tabs value={paymentFilter} onValueChange={(v) => setPaymentFilter(v as any)}>
  <TabsList className="grid grid-cols-4 h-10">
    <TabsTrigger value="all" className="text-xs">
      All <Badge className="ml-1">{sales.length}</Badge>
    </TabsTrigger>
    <TabsTrigger value="paid" className="text-xs text-emerald-600">
      Paid <Badge className="ml-1 bg-emerald-100">{paidCount}</Badge>
    </TabsTrigger>
    <TabsTrigger value="partial" className="text-xs text-amber-600">
      Partial <Badge className="ml-1 bg-amber-100">{partialCount}</Badge>
    </TabsTrigger>
    <TabsTrigger value="due" className="text-xs text-rose-600">
      Due <Badge className="ml-1 bg-rose-100">{dueCount}</Badge>
    </TabsTrigger>
  </TabsList>
</Tabs>
```

---

## Part 5: Date Range Selector

### Add Date Range Options
```typescript
type DateRangeOption = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

const [dateRangeOption, setDateRangeOption] = useState<DateRangeOption>('today');
const [customDateRange, setCustomDateRange] = useState<{ start: string; end: string } | null>(null);

const dateRange = useMemo(() => {
  const today = new Date();
  switch (dateRangeOption) {
    case 'today':
      return { start: format(today, 'yyyy-MM-dd'), end: format(today, 'yyyy-MM-dd') };
    case 'yesterday':
      return { start: format(subDays(today, 1), 'yyyy-MM-dd'), end: format(subDays(today, 1), 'yyyy-MM-dd') };
    case 'week':
      return { start: format(startOfWeek(today), 'yyyy-MM-dd'), end: format(endOfWeek(today), 'yyyy-MM-dd') };
    case 'month':
      return { start: format(startOfMonth(today), 'yyyy-MM-dd'), end: format(endOfMonth(today), 'yyyy-MM-dd') };
    case 'custom':
      return customDateRange || { start: format(today, 'yyyy-MM-dd'), end: format(today, 'yyyy-MM-dd') };
  }
}, [dateRangeOption, customDateRange]);
```

---

## Part 6: Source Filtering for Expenses

### Add Source Filter
```typescript
const [expenseSourceFilter, setExpenseSourceFilter] = useState<'all' | 'pob' | 'salary' | 'vehicle' | 'manual'>('all');

const filteredExpenses = useMemo(() => {
  return expenses.filter(e => {
    if (dateFilter && e.date !== dateFilter) return false;
    if (expenseSourceFilter !== 'all' && e.type !== expenseSourceFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return e.category.toLowerCase().includes(query) ||
        e.description.toLowerCase().includes(query);
    }
    return true;
  });
}, [expenses, dateFilter, searchQuery, expenseSourceFilter]);
```

---

## Part 7: Real-Time Sync Optimization

### Consolidate Subscriptions
The current implementation in `useBusinessDiaryQueries.ts` already has good real-time sync. Ensure these tables are covered:
- `pos_transactions`
- `pos_transaction_items`
- `customer_payments`
- `pob_transactions`
- `pob_transaction_items`
- `staff_payments` (Currently missing in queries hook)
- `vehicle_costs` (Currently missing in queries hook)
- `daily_expenses`

### Fix Missing Subscriptions
```typescript
.on('postgres_changes', { event: '*', schema: 'public', table: 'staff_payments' }, debouncedInvalidate)
.on('postgres_changes', { event: '*', schema: 'public', table: 'vehicle_costs' }, debouncedInvalidate)
```

---

## Part 8: Update Expense Categories

### Enhanced Category Map
```typescript
const EXPENSE_CATEGORIES = [
  // Utility Expenses
  { value: 'Utilities', label: 'Utilities', icon: '💡' },
  { value: 'Rent', label: 'Rent', icon: '🏠' },
  { value: 'Maintenance', label: 'Maintenance', icon: '🔧' },
  // Labor/Service
  { value: 'Loading', label: 'Loading/Labor', icon: '👷' },
  { value: 'Entertainment', label: 'Entertainment', icon: '☕' },
  // Business
  { value: 'Marketing', label: 'Marketing', icon: '📢' },
  { value: 'Bank', label: 'Bank Charges', icon: '🏦' },
  // Other
  { value: 'Other', label: 'Other', icon: '📦' }
];
```

---

## Part 9: Mobile UI Optimizations

### Touch-Friendly Cards
- Minimum height: 64px for all interactive cards
- Touch targets: 48px minimum
- Swipe gestures: Enable horizontal swipe for quick actions

### Compact Mobile Summary
```typescript
{/* Mobile: Horizontal Scroll Summary */}
{isMobile ? (
  <ScrollArea orientation="horizontal" className="w-full">
    <div className="flex gap-2 pb-2" style={{ minWidth: 'max-content' }}>
      {summaryCards.map(card => <CompactSummaryCard key={card.id} {...card} />)}
    </div>
  </ScrollArea>
) : (
  <div className="grid grid-cols-6 gap-3">
    {summaryCards.map(card => <SummaryCard key={card.id} {...card} />)}
  </div>
)}
```

---

## Part 10: View Details Dialog

### Sale Entry Details Dialog
```typescript
const [selectedSale, setSelectedSale] = useState<SaleEntry | null>(null);

<Dialog open={!!selectedSale} onOpenChange={() => setSelectedSale(null)}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Transaction Details</DialogTitle>
    </DialogHeader>
    {selectedSale && (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <InfoRow label="Transaction #" value={selectedSale.transactionNumber} />
          <InfoRow label="Date" value={format(new Date(selectedSale.timestamp), 'PPpp')} />
          <InfoRow label="Customer" value={selectedSale.customerName} />
          <InfoRow label="Phone" value={selectedSale.customerPhone || 'N/A'} />
          <InfoRow label="Product" value={selectedSale.productName} />
          <InfoRow label="Quantity" value={selectedSale.quantity.toString()} />
          <InfoRow label="Total Bill" value={`৳${selectedSale.totalAmount.toLocaleString()}`} />
          <InfoRow label="Amount Paid" value={`৳${selectedSale.amountPaid.toLocaleString()}`} />
          <InfoRow label="Remaining Due" value={`৳${selectedSale.remainingDue.toLocaleString()}`} />
          <InfoRow label="Payment Method" value={selectedSale.paymentMethod} />
          <InfoRow label="Status" value={selectedSale.paymentStatus} />
          <InfoRow label="Sold By" value={selectedSale.staffName} />
        </div>
        {selectedSale.returnCylinders.length > 0 && (
          <div>
            <Label>Return Cylinders</Label>
            <div className="flex gap-2 mt-1">
              {selectedSale.returnCylinders.map((r, i) => (
                <Badge key={i} variant="outline">{r.quantity}x {r.brand}</Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    )}
  </DialogContent>
</Dialog>
```

---

## Implementation Checklist

| Step | File | Action | Priority |
|------|------|--------|----------|
| 1 | `useBusinessDiaryQueries.ts` | Add staff_payments & vehicle_costs to expense fetch | Critical |
| 2 | `useBusinessDiaryQueries.ts` | Add staff_payments & vehicle_costs real-time subscriptions | Critical |
| 3 | `BusinessDiaryModule.tsx` | Add customer debt summary calculation | High |
| 4 | `BusinessDiaryModule.tsx` | Expand to 6-card summary grid | High |
| 5 | `BusinessDiaryModule.tsx` | Add payment status filter tabs | High |
| 6 | `BusinessDiaryModule.tsx` | Add date range selector | Medium |
| 7 | `BusinessDiaryModule.tsx` | Add expense source filter | Medium |
| 8 | `BusinessDiaryModule.tsx` | Add view details dialogs | Medium |
| 9 | `SaleEntryCard.tsx` | Pass onViewDetails handler | Medium |
| 10 | `ExpenseEntryCard.tsx` | Add onViewDetails handler | Medium |
| 11 | Delete | `useBusinessDiaryData.ts` (keep as backup/analytics) | Low |

---

## Success Criteria

After implementation:
1. **Complete Data Integration**: All sales (POS + Online + Customer Payments) and expenses (POB + Staff + Vehicle + Manual) display correctly
2. **Customer Debt Visibility**: Summary cards show Paid/Partial/Due counts and amounts
3. **Payment Filtering**: Can filter sales by payment status
4. **Real-Time Sync**: Changes from POS, POB, Utility Expense modules appear instantly
5. **Mobile Optimized**: 48px touch targets, horizontal scroll summaries, responsive layout
6. **Date Flexibility**: Can view today, yesterday, this week, this month, or custom range
7. **Source Tracking**: Each entry shows clear source (POS, Online Order, POB, Staff Salary, Vehicle Cost, Manual)

---

## Testing Scenarios

1. **POS Sale Sync**: Complete a cash sale in POS -> Should appear in Business Diary within 2 seconds
2. **Due Sale**: Create a Due sale in POS -> Should appear in Diary with red "Due" badge
3. **Partial Payment**: Create partial payment -> Shows in Partial section with remaining due
4. **POB Purchase**: Add POB transaction -> Shows in Expenses as "LPG Purchase"
5. **Staff Salary**: Pay salary in Utility Expense -> Shows in Expenses as "Staff Salary"
6. **Vehicle Cost**: Add fuel cost -> Shows in Expenses as "Vehicle Fuel"
7. **Manual Expense**: Add utility bill -> Shows in Expenses as "Utilities"
8. **Filter Test**: Click "Due" summary card -> Sales list filters to only Due transactions
9. **Date Change**: Switch to yesterday -> Shows previous day's data
10. **Real-Time**: In another tab, complete a sale -> Diary updates without refresh

