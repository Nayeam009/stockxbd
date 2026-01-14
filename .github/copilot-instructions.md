# StockXBD AI Agent Instructions

## Project Overview
**StockXBD** is a comprehensive POS and inventory management system for LPG cylinder distribution businesses in Bangladesh. Built with Vite, React, TypeScript, and shadcn-ui with Tailwind CSS. Backend is Supabase (PostgreSQL + Auth).

## Architecture & Key Patterns

### Frontend Stack
- **Framework**: React 18 + TypeScript
- **Build**: Vite (dev server on port 8080)
- **UI Components**: shadcn-ui (Radix UI primitives) + Tailwind CSS
- **Routing**: React Router v6 (pages: Welcome, Auth, Dashboard, NotFound)
- **State Management**: React Context (ThemeContext, LanguageContext) + Supabase Realtime subscriptions
- **Forms**: React Hook Form + Zod validation
- **Data Fetching**: Direct Supabase client calls (no React Query despite being installed)
- **UI Notifications**: Sonner (toast) and custom Toaster component

### Directory Structure
```
src/
├── pages/              # Route-level components (Auth, Dashboard, Welcome)
├── components/
│   ├── auth/          # ProtectedRoute wrapper
│   ├── dashboard/     # Dashboard layout + 19 feature modules
│   │   └── modules/   # Feature modules (see Module Pattern below)
│   ├── ui/            # shadcn-ui components
│   ├── notifications/
│   ├── invoice/
│   ├── settings/
│   └── pos/
├── contexts/          # ThemeContext, LanguageContext
├── hooks/             # Custom hooks (useDashboardData, useBackupRestore, etc.)
├── integrations/
│   └── supabase/      # client.ts (Supabase instance), types.ts (auto-generated)
├── lib/               # Utilities: validationSchemas, pdfExport, bangladeshConstants
└── assets/
```

### Core Patterns

#### Module Pattern (19 dashboard modules)
Each module is a standalone feature exported as `export const ModuleName = () => {}`:
- **Examples**: `AnalysisModule`, `POSModule`, `CustomerManagementModule`, `ExchangeModule`
- **Structure**: Local `useState` for UI state + `useEffect` for Supabase fetching
- **Realtime**: Subscribe to table changes with `supabase.channel('table-name').on('postgres_changes', {...}).subscribe()`
- **Type Safety**: Defined interfaces in each module matching database schema

#### Data Fetching Pattern
```typescript
// Direct Supabase calls in useEffect/components - NO React Query
const { data, error } = await supabase
  .from('table_name')
  .select('field1, field2, nested_relations(*)')
  .order('created_at', { ascending: false });

// For realtime: subscribe to changes and refetch
const channel = supabase.channel('change-key')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'name' }, () => {
    fetchData(); // Refetch handler
  })
  .subscribe();
```

#### Authentication & Protected Routes
- `ProtectedRoute` wrapper checks Supabase session (SupaAuth)
- User profiles stored in `profiles` table, roles in `user_roles` table
- Session persists via localStorage

#### Validation Pattern
- **Schema-based**: Use Zod (`validationSchemas.ts`) for customer, order, POS transaction validation
- **Sanitization**: Helper functions like `sanitizeString()`, `parsePositiveNumber()`
- **Max field lengths**: 100 chars (names), 500 chars (addresses)

### Business Domain

**Key Tables & Relationships**:
- **Products**: `lpg_brands`, `stoves`, `regulators` (with pricing variants)
- **Transactions**: `pos_transactions` (point-of-sale) + `pos_transaction_items`
- **Orders**: `orders` + `order_items` (wholesale/delivery orders)
- **Inventory**: Cylinder/stove stock tracked with `currentStock`, `minStock`, `maxStock`
- **Customers**: Payment history, outstanding balances, loyalty points
- **Operations**: Staff, vehicles, daily expenses, cylinder exchanges

**Bangladesh-Specific Details**:
- Currency symbol: `BANGLADESHI_CURRENCY_SYMBOL` from `src/lib/bangladeshConstants.ts`
- Payment methods: Cash, bKash, Nagad, Rocket, Bank, Credit
- Product types: Cylinders (12kg refill/package), Stoves, Regulators
- Multi-language support (Bangla/English) via `LanguageContext`

## Critical Workflows

### Running the App
```bash
npm run dev        # Vite dev server on localhost:8080
npm run build      # Production build
npm run lint       # ESLint check (strict rules disabled for unused vars & any)
```

### Adding New Dashboard Modules
1. Create `src/components/dashboard/modules/NewModule.tsx`
2. Export `export const NewModule = () => { ... }`
3. Define local state with `useState`
4. Fetch Supabase data in `useEffect`
5. Add realtime subscription if needed
6. Register in Dashboard.tsx module list

### Supabase Integration
- **Config**: `supabase/config.toml`
- **Migrations**: Auto-generated in `supabase/migrations/`
- **Types**: Auto-generated `src/integrations/supabase/types.ts` - **DO NOT EDIT**
- **Client**: `src/integrations/supabase/client.ts` uses env vars `VITE_SUPABASE_URL` & `VITE_SUPABASE_PUBLISHABLE_KEY`

### Common Tasks

**Fetching related data**:
```typescript
// Use dot notation to select nested relationships
const { data } = await supabase
  .from('orders')
  .select('*, order_items(id, product_name, quantity)')
  .order('created_at', { ascending: false });
```

**Type-safe responses**: Use interfaces defined in module or from `types.ts` Database union type.

**Error handling**: Catch with `error.message`, show via `toast()` from Sonner:
```typescript
import { toast } from "sonner";
toast.error("Error message");
```

**PDF export**: Use `src/lib/pdfExport.ts` for invoice generation.

**File uploads**: Handled in ProfileModule (avatar to Supabase storage).

## Editor Config & Extensions
- **ESLint**: Disabled for unused vars & `any` type (flexible dev setup)
- **Tailwind**: Custom CSS variables for light/dark theme colors
- **Components.json**: shadcn-ui configuration

## Important Conventions
- **No trailing semicolons** in variable/const declarations (React Refresh style)
- **Use `useLanguage()` hook** for translatable UI strings
- **Lazy load modules** in Dashboard to avoid initial render bloat
- **Realtime subscriptions** must unsubscribe in cleanup function to prevent memory leaks
- **Zod validation** for all user inputs (sanitize strings, validate numbers)
- **Type matching**: Return types from Supabase must match interface definitions

## Common Gotchas
- **Auto-generated types**: Never manually edit `src/integrations/supabase/types.ts`
- **Realtime listeners**: Always cleanup subscriptions in `useEffect` return
- **Null handling**: Supabase nullable fields may return `null` - use optional chaining
- **Timestamps**: Stored as ISO strings - use `date-fns` for formatting
- **Stock calculations**: Cylinders have refill + package variants - sum both for total stock
