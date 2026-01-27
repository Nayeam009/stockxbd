

# Fix Dashboard Loading/Reloading Issue

## Problem Analysis

The dashboard is stuck on "Loading your dashboard..." due to a complex authentication flow with multiple loading states that can get out of sync:

1. **ProtectedRoute** (line 150-158) - Shows loading while checking session and role
2. **useUserRole** hook - Has complex localStorage caching and module-level caches that can interfere
3. **Dashboard.tsx** (line 208) - Has `authLoading && !userRole` condition blocking render

The issue stems from remnants of the optimization code still present in `useUserRole.ts` - the complex caching logic with `localStorage`, module-level caches, and 10-minute cache durations is causing race conditions.

## Root Cause

The `useUserRole` hook has:
- 10 minute cache duration (line 21)
- localStorage persistence (lines 23-41) 
- Multiple async operations that can timeout
- Complex cache restoration logic

When combined with the ProtectedRoute check, this creates situations where:
1. ProtectedRoute is waiting for auth
2. useUserRole has stale cache
3. Both are showing loading states simultaneously

## Solution

Simplify the authentication flow to use direct Supabase queries without complex caching:

### Step 1: Simplify `useUserRole.ts`

Remove all optimization remnants:
- Remove module-level cache variables
- Remove localStorage persistence
- Remove 10-minute cache duration
- Use simple, direct Supabase queries
- Set loading to false immediately after fetch completes

### Step 2: Fix `ProtectedRoute.tsx`

Ensure loading state is properly managed:
- Add timeout protection to prevent infinite loading
- Ensure loading state is always set to false after checks

### Step 3: Simplify Dashboard Loading Check

Update the loading condition in Dashboard.tsx to be more permissive and render content faster.

## Technical Changes

### File: `src/hooks/useUserRole.ts`

```typescript
// BEFORE (Complex with caching)
let cachedRole: UserRole | null = null;
let cachedName: string | null = null;
let cachedUserId: string | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 600000; // 10 minutes

// AFTER (Simple, direct queries)
export const useUserRole = (): UserRoleData => {
  const [userRole, setUserRole] = useState<UserRole>('customer');
  const [userName, setUserName] = useState<string>('User');
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserData = useCallback(async () => {
    try {
      setError(null);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        setUserRole('customer');
        setUserName('Guest');
        setUserId(null);
        setLoading(false);
        return;
      }

      setUserId(session.user.id);

      // Fetch role and profile in parallel
      const [roleResult, profileResult] = await Promise.all([
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .maybeSingle(),
        supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', session.user.id)
          .maybeSingle()
      ]);

      const role = roleResult.data?.role as UserRole || 'customer';
      const displayName = profileResult.data?.full_name || 
                         session.user.email?.split('@')[0] || 'User';
      
      setUserRole(role);
      setUserName(displayName);
    } catch (err) {
      console.error('Error in useUserRole:', err);
      setError('Failed to load user data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserData();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchUserData();
    });

    return () => subscription.unsubscribe();
  }, [fetchUserData]);

  return { userRole, userName, userId, loading, error, refetch: fetchUserData };
};
```

### File: `src/components/auth/ProtectedRoute.tsx`

Add safety timeout to prevent infinite loading:

```typescript
useEffect(() => {
  mountedRef.current = true;
  checkAuthAndRole();

  // Safety timeout - prevent infinite loading
  const safetyTimeout = setTimeout(() => {
    if (mountedRef.current && loading) {
      console.warn('[ProtectedRoute] Safety timeout reached');
      setLoading(false);
    }
  }, 10000); // 10 second max wait

  // ... rest of subscription code

  return () => {
    mountedRef.current = false;
    clearTimeout(safetyTimeout);
    subscription.unsubscribe();
  };
}, [checkAuthAndRole]);
```

### File: `src/pages/Dashboard.tsx`

Simplify the loading condition:

```typescript
// BEFORE
if (authLoading && !userRole) {
  return <LoadingScreen />;
}

// AFTER - Show dashboard immediately if we have any role
if (authLoading && userRole === 'customer' && !userId) {
  return <LoadingScreen />;
}
```

## Expected Result

After these changes:
- Dashboard loads quickly without getting stuck
- Simple, direct Supabase queries
- No complex caching logic that can cause race conditions
- Safety timeout prevents infinite loading states
- User sees dashboard content faster

