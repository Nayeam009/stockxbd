
# Complete Authentication System Rebuild Plan

## Current State Analysis

The existing authentication system has several issues:
1. **Loading loop problems** - Infinite loading states due to race conditions
2. **Complex role management** - Mixing of `super_admin` with other roles
3. **Synthetic email confusion** - Using `@customer.stockx` and `@manager.stockx` domains
4. **Hardcoded storage keys** - Causing session detection failures across environments

---

## New Architecture: 4-Tier User Hierarchy

```text
+------------------+----------------------------------------+-------------------+
|     Role         |              Access                    |   Login Method    |
+------------------+----------------------------------------+-------------------+
| Admin            | Super Admin + Shop Owner privileges    | Email + Password  |
| (khnayeam009@)   | Global user management, Admin Panel    |                   |
+------------------+----------------------------------------+-------------------+
| Shop Owner       | Full shop management, Dashboard        | Email + Password  |
|                  | POS, Inventory, Team Management        |                   |
+------------------+----------------------------------------+-------------------+
| Manager          | Dashboard access (no admin panel)      | Invite Link only  |
|                  | POS, Inventory, Customer management    | Username+Password |
+------------------+----------------------------------------+-------------------+
| Customer         | LPG Community marketplace only         | Phone + Password  |
|                  | Order, Profile, Shop discovery         |                   |
+------------------+----------------------------------------+-------------------+
```

---

## Part 1: Database Schema (Foundation)

### Tables to Keep (Already Exist)
- `user_roles` - Stores role assignments (owner, manager, customer)
- `admin_users` - Super admin designation (separate for security)
- `profiles` - User profile data (name, phone, avatar)
- `team_members` - Links managers to shop owners
- `team_invites` - Secure invitation codes for managers

### Database Functions to Verify/Update

1. **`has_role(user_id, role)`** - Check if user has specific role
2. **`is_admin(user_id)`** - Check if user is owner OR manager
3. **`is_super_admin(user_id)`** - Check admin_users table
4. **`handle_new_user_role()`** - Trigger to assign default role on signup
5. **`get_owner_id()`** - Get the canonical owner for multi-tenant isolation

### Migration Required
- Remove any remaining `driver` or `staff` role references
- Ensure `app_role` enum only has: `owner`, `manager`, `customer`

---

## Part 2: Authentication Flow Redesign

### Sign Up Flows

**A. Customer Sign Up (Phone-based)**
```text
1. User selects "Customer" category
2. Enters: Phone Number + Password + Name (optional)
3. System creates synthetic email: 880XXXXXXXXX@customer.stockx
4. Creates user in auth.users
5. Trigger creates profile + assigns role='customer'
6. Redirect to /community
```

**B. Shop Owner Sign Up (Email-based)**
```text
1. User selects "Shop Owner" category
2. Enters: Email + Password + Name + Phone (optional)
3. Creates user in auth.users
4. Trigger creates profile + assigns role='owner'
5. Redirect to /dashboard
```

**C. Manager Sign Up (Invite-only)**
```text
1. Manager clicks invite link from owner
2. System validates invite code via validate_invite()
3. Manager enters: Username + Password + Name + Phone
4. Creates synthetic email: username@manager.stockx
5. mark_invite_used() links manager to owner
6. Assigns role='manager' + creates team_member record
7. Redirect to /dashboard
```

### Sign In Flow (Universal)
```text
1. User enters: Login ID + Password
2. Smart ID Resolution:
   - Contains @ -> Email (Owner/Admin login)
   - Matches BD phone pattern -> 880XXXXXXXXX@customer.stockx
   - Otherwise -> username@manager.stockx
3. Supabase signInWithPassword()
4. Fetch role from user_roles
5. Redirect based on role:
   - customer -> /community
   - owner/manager -> /dashboard
```

---

## Part 3: Protected Route Logic

### New ProtectedRoute.tsx Strategy

```text
┌─────────────────────────────────────────────────────┐
│                   Component Mount                    │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│   1. Check localStorage for cached session          │
│      hasValidStoredSession() -> boolean             │
└─────────────────────────────────────────────────────┘
                         │
            ┌────────────┴────────────┐
            │                         │
         Yes │                         │ No
            ▼                         ▼
┌───────────────────┐    ┌───────────────────────────┐
│ Render immediately │    │ Show loading spinner      │
│ (optimistic)       │    │ Call getSession() with    │
│                    │    │ 8s timeout                │
└───────────────────┘    └───────────────────────────┘
            │                         │
            ▼                         ▼
┌─────────────────────────────────────────────────────┐
│   2. onAuthStateChange listener (runs async)        │
│      - SIGNED_IN -> set authenticated=true          │
│      - SIGNED_OUT -> clear session, redirect        │
│      - TOKEN_REFRESHED -> skip role fetch           │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│   3. Safety Timeout (5s with session, 10s without)  │
│      - Prevents infinite loading                    │
│      - If hasStoredSession -> allow access anyway   │
│      - If no session -> redirect to /auth           │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│   4. Role-based Redirect                            │
│      - customer on /dashboard -> /community         │
│      - owner/manager -> allow /dashboard            │
└─────────────────────────────────────────────────────┘
```

---

## Part 4: Auth Utilities Optimization

### authUtils.ts Functions

| Function | Purpose | Timeout |
|----------|---------|---------|
| `getAuthTokenStorageKey()` | Dynamic key detection (sb-*-auth-token) | N/A |
| `getStoredSessionSnapshot()` | Extract userId, email, expiresAt from localStorage | N/A |
| `hasValidStoredSession()` | Check if stored session is valid (60s buffer) | N/A |
| `clearStoredAuthSession()` | Clear all auth data + cached roles | N/A |
| `getSessionWithTimeout()` | Fetch session with timeout protection | 8000ms |
| `isRefreshTokenError()` | Detect stale refresh token errors | N/A |

---

## Part 5: Role Hook Optimization

### useUserRole.ts Strategy

```text
1. SYNC: Read cached role from sessionStorage
2. RENDER: Show UI immediately with cached role
3. ASYNC: Fetch fresh role from database (non-blocking)
4. UPDATE: Cache new role, update UI if changed
5. TIMEOUT: 5s max for database fetch
```

---

## Part 6: Files to Modify

### Core Auth Files
| File | Changes |
|------|---------|
| `src/pages/Auth.tsx` | Simplify, fix role assignment |
| `src/components/auth/ProtectedRoute.tsx` | Hardened timeout logic |
| `src/lib/authUtils.ts` | Dynamic key detection |
| `src/hooks/useUserRole.ts` | Cached role with background refresh |

### Dashboard Files
| File | Changes |
|------|---------|
| `src/pages/Dashboard.tsx` | Remove loading loops |
| `src/hooks/useDashboardData.ts` | Add timeout protection |
| `src/components/dashboard/AppSidebar.tsx` | Role-based menu |
| `src/components/dashboard/DashboardHeader.tsx` | Admin badge logic |

### Edge Functions
| File | Changes |
|------|---------|
| `supabase/functions/register-team-member/index.ts` | Keep as-is (secure) |
| `supabase/functions/verify-owner/index.ts` | Review for role validation |

---

## Part 7: Security Checklist

1. **Roles in separate table** - user_roles with RLS
2. **Admin check server-side** - is_super_admin() is SECURITY DEFINER
3. **No hardcoded admin check** - Always query admin_users table
4. **Rate limiting** - rate_limit_attempts table + check_rate_limit()
5. **Invite validation** - Server-side via validate_invite()
6. **Session cleanup** - Clear all sensitive data on logout

---

## Implementation Order

| Step | Task | Priority |
|------|------|----------|
| 1 | Verify database schema (roles, admin_users) | High |
| 2 | Fix authUtils.ts dynamic key detection | High |
| 3 | Harden ProtectedRoute.tsx with timeouts | High |
| 4 | Optimize useUserRole.ts caching | High |
| 5 | Simplify Auth.tsx sign up/in flows | High |
| 6 | Add timeout protection to useDashboardData.ts | Medium |
| 7 | Update Dashboard.tsx loading logic | Medium |
| 8 | Test all 4 user types end-to-end | High |

---

## Testing Scenarios

1. **New Customer**: Phone signup -> /community redirect
2. **New Owner**: Email signup -> /dashboard redirect  
3. **New Manager**: Invite link -> join team -> /dashboard
4. **Returning User**: Login with any ID type -> correct redirect
5. **Session Expiry**: Refresh with stale token -> clear + redirect to /auth
6. **Offline**: No network -> show offline error, allow retry
7. **Admin Access**: khnayeam009@gmail.com -> Admin panel visible

---

## Success Criteria

- No infinite loading loops on any route
- All 4 user types can sign up and sign in
- Role-based redirects work correctly
- Dashboard loads within 3 seconds
- Session persistence works across page refreshes
- Stale sessions are detected and cleared automatically
