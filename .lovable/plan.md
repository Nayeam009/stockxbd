

# Admin Panel Rebuild Plan

## Current State Analysis

After thoroughly examining the codebase, I've identified several issues that need to be fixed for a proper admin panel implementation:

### Issues Found

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 1 | **RLS blocks profile access** | `profiles` table RLS policy | Admin can only see their own profile, not other users' names |
| 2 | **No admin verification** | `AdminPanelModule.tsx` | Component doesn't verify admin status - relies only on parent |
| 3 | **Missing phone numbers** | User data display | Phone numbers aren't shown for customer identification |
| 4 | **Poor error handling** | `fetchUsers()` function | No retry logic or proper error states |
| 5 | **No real-time updates** | User list | Changes don't sync in real-time |
| 6 | **Missing email data** | UserData interface | Only shows name, not email for identification |
| 7 | **No admin self-protection** | Block/Delete actions | Admin could accidentally block/delete themselves |
| 8 | **Missing loading skeletons** | User list | Shows only spinner, no skeleton preview |
| 9 | **No pagination** | User list with ScrollArea | Will be slow with many users |
| 10 | **Legacy `super_admin` reference** | AppSidebar line 64 | Type reference still exists |

---

## Architecture Overview

```text
┌─────────────────────────────────────────────────────────────────┐
│                     Admin Panel Module                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Admin Access Check (Server-side via admin_users table)    │ │
│  │  - If not admin: Show "Access Denied" message              │ │
│  │  - If admin: Show admin interface                          │ │
│  └────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Stats Grid (6 cards)                                       ││
│  │  [Total Users] [Owners] [Managers] [Customers] [Shops]     ││
│  │  [Blocked]                                                  ││
│  └─────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  User Management Card                                       ││
│  │  ┌───────────────────────────────────────────────────────┐ ││
│  │  │  Search Bar + Refresh Button                          │ ││
│  │  └───────────────────────────────────────────────────────┘ ││
│  │  ┌───────────────────────────────────────────────────────┐ ││
│  │  │  Filter Tabs: [All] [Owners] [Managers] [Customers]   │ ││
│  │  │               [Blocked]                                │ ││
│  │  └───────────────────────────────────────────────────────┘ ││
│  │  ┌───────────────────────────────────────────────────────┐ ││
│  │  │  User List (Virtual Scroll for performance)           │ ││
│  │  │  ┌─────────────────────────────────────────────────┐  │ ││
│  │  │  │ Avatar | Name | Phone/Email | Role | Shop | Act │  │ ││
│  │  │  └─────────────────────────────────────────────────┘  │ ││
│  │  └───────────────────────────────────────────────────────┘ ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## Part 1: Database Fix - Admin Profile Access

### Problem
The `profiles` table has RLS that only allows users to view their own profile:
```sql
-- Current policy
Policy Name: Users can view their own profile
Using Expression: (auth.uid() = user_id)
```

### Solution
Create a new policy that allows admins to view all profiles for management purposes.

**Migration Required:**
```sql
-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.user_id = auth.uid()
  )
);
```

---

## Part 2: Enhanced UserData Interface

### Current Interface
```typescript
interface UserData {
  id: string;
  email: string;          // Actually stores name, confusing
  created_at: string;
  role: string;
  is_blocked: boolean;
  has_shop: boolean;
  shop_name?: string;
}
```

### New Interface
```typescript
interface UserData {
  id: string;
  fullName: string;         // Renamed for clarity
  phone: string | null;     // Added for customer identification
  email: string | null;     // Actual email from auth (if available)
  role: 'owner' | 'manager' | 'customer';
  isBlocked: boolean;       // camelCase consistency
  isAdmin: boolean;         // Flag if user is also admin
  hasShop: boolean;         // camelCase
  shopName: string | null;  // camelCase
  createdAt: string;        // camelCase
}
```

---

## Part 3: Admin Access Verification

### Add Server-Side Admin Check
```typescript
// Add at start of AdminPanelModule
const [isVerifiedAdmin, setIsVerifiedAdmin] = useState<boolean | null>(null);

useEffect(() => {
  const verifyAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsVerifiedAdmin(false);
      return;
    }
    
    const { data } = await supabase
      .from('admin_users')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    
    setIsVerifiedAdmin(!!data);
  };
  
  verifyAdmin();
}, []);

// Show access denied if not admin
if (isVerifiedAdmin === false) {
  return <AccessDeniedCard />;
}
```

---

## Part 4: Enhanced Data Fetching

### New Fetch Logic with Parallel Queries + Timeout
```typescript
const fetchUsers = async () => {
  setLoading(true);
  setError(null);
  
  try {
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout')), 10000)
    );
    
    const fetchPromise = Promise.all([
      supabase.from('user_roles').select('user_id, role'),
      supabase.from('profiles').select('user_id, full_name, phone'),
      supabase.from('user_status').select('user_id, is_blocked'),
      supabase.from('shop_profiles').select('owner_id, shop_name'),
      supabase.from('admin_users').select('user_id'),
    ]);
    
    const results = await Promise.race([fetchPromise, timeoutPromise]);
    // Process and combine data...
    
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
```

---

## Part 5: Self-Protection Logic

### Prevent Admin Self-Actions
```typescript
const currentUserId = useRef<string | null>(null);

// Get current user on mount
useEffect(() => {
  supabase.auth.getUser().then(({ data }) => {
    currentUserId.current = data.user?.id || null;
  });
}, []);

// In user row actions
const isCurrentUser = user.id === currentUserId.current;

<Button
  disabled={isCurrentUser}
  title={isCurrentUser ? "Cannot block yourself" : undefined}
>
  {isCurrentUser ? "You" : "Block"}
</Button>
```

---

## Part 6: Loading Skeleton Component

### Add UserCardSkeleton
```typescript
const UserCardSkeleton = () => (
  <div className="flex items-center justify-between p-3 rounded-lg border bg-card animate-pulse">
    <div className="flex items-center gap-3 flex-1">
      <div className="h-10 w-10 rounded-full bg-muted" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-32 bg-muted rounded" />
        <div className="h-3 w-20 bg-muted rounded" />
      </div>
    </div>
    <div className="flex gap-2">
      <div className="h-8 w-16 bg-muted rounded" />
      <div className="h-8 w-8 bg-muted rounded" />
    </div>
  </div>
);
```

---

## Part 7: Real-Time Updates

### Add Supabase Subscription
```typescript
useEffect(() => {
  const channel = supabase
    .channel('admin-users-changes')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'user_roles' }, 
      () => fetchUsers()
    )
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'user_status' }, 
      () => fetchUsers()
    )
    .subscribe();
  
  return () => {
    supabase.removeChannel(channel);
  };
}, []);
```

---

## Part 8: Clean Up Legacy References

### Fix AppSidebar.tsx Line 64
```typescript
// Current (line 64)
case 'super_admin':
  return 'bg-primary/15 text-primary border-primary/30';

// Fixed - Remove super_admin case entirely or rename
// super_admin is no longer a user role, admin status is separate
```

### Fix DashboardHeader.tsx Lines 68-70, 83-84
Remove `super_admin` references from role switch statements.

---

## Implementation Checklist

| Step | File | Action | Priority |
|------|------|--------|----------|
| 1 | Database | Add RLS policy for admin profile access | Critical |
| 2 | `AdminPanelModule.tsx` | Add server-side admin verification | Critical |
| 3 | `AdminPanelModule.tsx` | Fix UserData interface with proper types | High |
| 4 | `AdminPanelModule.tsx` | Add self-protection logic | High |
| 5 | `AdminPanelModule.tsx` | Add loading skeletons | Medium |
| 6 | `AdminPanelModule.tsx` | Add real-time subscriptions | Medium |
| 7 | `AdminPanelModule.tsx` | Improve error handling with retry | Medium |
| 8 | `AppSidebar.tsx` | Remove `super_admin` reference | Low |
| 9 | `DashboardHeader.tsx` | Remove `super_admin` reference | Low |

---

## New Features to Add

1. **Search by phone number** - Customers often identified by phone
2. **Admin badge indicator** - Show if a user is also an admin
3. **Block reason input** - Allow admin to add reason when blocking
4. **Confirmation with user details** - Show more info in dialogs
5. **Empty state with illustration** - Better UX when no users match filter

---

## UI/UX Improvements

1. **Color-coded user cards**:
   - Owner: Primary gradient border
   - Manager: Secondary subtle background
   - Customer: Accent subtle background
   - Blocked: Red/destructive subtle background

2. **Mobile optimizations**:
   - Swipeable user cards for actions
   - Bottom sheet for user details
   - Compact view on small screens

3. **Accessibility**:
   - Proper ARIA labels on all buttons
   - Keyboard navigation support
   - Focus indicators

---

## Success Criteria

After implementation:
1. Admin panel only accessible to verified admins (server-side check)
2. Admin can see all user names and phone numbers
3. Admin cannot block/delete themselves
4. User list updates in real-time when changes occur
5. Loading states show skeletons, not just spinners
6. No TypeScript errors or legacy role references
7. All actions show proper confirmation dialogs
8. Mobile-responsive with 44px+ touch targets

---

## Testing Scenarios

1. Non-admin access: Navigate to `/dashboard?module=admin-panel` as non-admin user -> Should see "Access Denied"
2. Admin access: Login as admin (khnayeam009@gmail.com) -> Should see full panel
3. Block user: Click block on a user -> Confirm -> User should appear in Blocked tab
4. Unblock user: Click unblock on blocked user -> Confirm -> User should return to normal
5. Self-protection: Admin should see "You" badge on their own row, buttons disabled
6. Search: Type phone number -> Should filter to matching users
7. Tab filtering: Click each tab -> Should show only matching role users
8. Real-time: In another tab, change a user role -> Admin panel should update

