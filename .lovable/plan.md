

# Rebuild Settings Module - Complete Plan

## Overview
This plan completely rebuilds the Settings module addressing all identified issues with a focus on 4 user types: **Admin**, **Shop Owners**, **Managers**, and **Customers**.

---

## Current Issues Summary

| Issue | Description |
|-------|-------------|
| Large Files | SettingsModule.tsx (880 lines) + TeamSettingsSection.tsx (904 lines) = 1784 lines |
| Duplicate Shop Profile | Shop profile in both Settings AND MyShopProfileModule |
| No Real-time Sync | Team changes, invites not reflected without refresh |
| No Loading Skeleton | Profile/team data loads without visual feedback |
| No Avatar Upload | Users cannot upload profile pictures |
| Role-based Gaps | Missing role-specific features for Admin/Manager/Customer |
| Performance Issues | Multiple separate fetches, no memoization |

---

## Part 1: New Component Architecture

### File Structure

```text
src/components/settings/
  SettingsSkeleton.tsx (NEW)         - Loading skeleton for all sections
  ProfileCard.tsx (NEW)              - User profile with avatar upload
  SecuritySection.tsx (NEW)          - Password change + danger zone
  SessionInfoCard.tsx (NEW)          - Current session info
  TeamInviteCard.tsx (NEW)           - QR/Link invite (extracted)
  TeamMembersCard.tsx (NEW)          - Team member list (extracted)
  index.ts (NEW)                     - Central exports
  
  AccountSettingsSection.tsx         - ENHANCE (add avatar upload)
  BackupRestoreCard.tsx             - KEEP
  PrinterSettingsSection.tsx        - KEEP
  PushNotificationCard.tsx          - KEEP
  TeamSettingsSection.tsx           - MAJOR REFACTOR (remove shop profile)
  
  TO REMOVE (duplicate MyShopProfileModule):
  ShopProfileCard.tsx               - DELETE
  ShopProductsCard.tsx              - DELETE
  ProfileSharingCard.tsx            - DELETE

src/components/dashboard/modules/
  SettingsModule.tsx                - REFACTOR (~400 lines)
```

---

## Part 2: Role-Based Settings Access

### 4 User Types Visibility Matrix

| Section | Admin | Owner | Manager | Customer |
|---------|-------|-------|---------|----------|
| Account (Profile + Appearance) | Yes | Yes | Yes | Yes |
| Team & Business | No | Yes | View Only | No |
| Notifications | Yes | Yes | Yes | Yes |
| Security (Password + Delete) | Yes | Yes | Yes | Yes |
| Advanced (Backup/Data) | Yes | Yes | Yes | No |
| Printer | No | Yes | Yes | No |
| Admin Panel Link | Yes | No | No | No |

### Implementation

```typescript
const getSections = (userRole: string, isAdmin: boolean) => {
  const baseSections = [
    { id: 'account', title: 'Account', ownerOnly: false },
    { id: 'notifications', title: 'Notifications', ownerOnly: false },
    { id: 'security', title: 'Security', ownerOnly: false },
  ];
  
  if (isAdmin) {
    baseSections.push({ id: 'admin', title: 'Admin Panel', ownerOnly: false });
  }
  
  if (userRole === 'owner') {
    baseSections.splice(1, 0, { id: 'team', title: 'Team & Business', ownerOnly: true });
    baseSections.push({ id: 'advanced', title: 'Advanced', ownerOnly: true });
    baseSections.push({ id: 'printer', title: 'Printer', ownerOnly: true });
  } else if (userRole === 'manager') {
    baseSections.push({ id: 'advanced', title: 'Advanced', ownerOnly: false });
    baseSections.push({ id: 'printer', title: 'Printer', ownerOnly: false });
  }
  
  return baseSections;
};
```

---

## Part 3: Remove Duplicate Shop Profile

### Problem
Shop profile editing exists in TWO places:
1. `TeamSettingsSection.tsx` (lines 450-577)
2. `MyShopProfileModule.tsx`

### Solution
1. **Remove** shop profile form from TeamSettingsSection entirely
2. **Add** a "Quick Link" card that navigates to My Shop Profile module
3. **Keep** only Team Management (invites, members) in Settings

### New TeamSettingsSection Structure (~350 lines)

```typescript
// Removed: Shop Profile Form (130+ lines)
// Keep: Manager Invite Card + Team Members Card
// Add: Navigation Card to My Shop Profile

<Card className="bg-gradient-to-br from-emerald-500/10 to-green-500/5 border-emerald-500/20">
  <CardContent className="flex items-center justify-between p-4">
    <div className="flex items-center gap-3">
      <Store className="h-6 w-6 text-emerald-500" />
      <div>
        <p className="font-medium">My Shop Profile</p>
        <p className="text-sm text-muted-foreground">Manage your online store</p>
      </div>
    </div>
    <Button onClick={() => navigate('/dashboard?module=my-shop')}>
      Open <ExternalLink className="h-4 w-4 ml-2" />
    </Button>
  </CardContent>
</Card>

<TeamInviteCard />
<TeamMembersCard />
```

---

## Part 4: Real-time Subscriptions

### Add Supabase Subscriptions

```typescript
useEffect(() => {
  const channel = supabase
    .channel('settings-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members' }, debouncedRefetchTeam)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'team_invites' }, debouncedRefetchInvites)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, debouncedRefetchProfile)
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, [debouncedRefetchTeam, debouncedRefetchInvites, debouncedRefetchProfile]);
```

### Debounce Strategy
- 800ms debounce on all subscription callbacks
- Prevents UI flicker during rapid updates

---

## Part 5: New Features

### 1. Avatar Upload (AccountSettingsSection)

```typescript
// Add avatar upload with camera icon overlay
<div className="relative group">
  <Avatar className="h-24 w-24 border-4 border-primary/20">
    <AvatarImage src={avatarUrl} />
    <AvatarFallback>{initials}</AvatarFallback>
  </Avatar>
  <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 rounded-full cursor-pointer transition-opacity">
    <Camera className="h-6 w-6 text-white" />
    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
  </label>
</div>
```

### 2. Session Info Card (New Component)

```typescript
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <LogIn className="h-5 w-5" />
      Current Session
    </CardTitle>
  </CardHeader>
  <CardContent className="space-y-3">
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">Logged in as</span>
      <span className="font-medium">{userEmail}</span>
    </div>
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">Role</span>
      <Badge>{userRole}</Badge>
    </div>
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">Session started</span>
      <span className="font-mono text-sm">{sessionStart}</span>
    </div>
    <Separator />
    <Button variant="outline" className="w-full" onClick={handleSignOut}>
      <LogOut className="h-4 w-4 mr-2" /> Sign Out
    </Button>
  </CardContent>
</Card>
```

### 3. Loading Skeleton

```typescript
export const SettingsSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    {/* Profile Card Skeleton */}
    <div className="flex items-center gap-4 p-6 border rounded-xl">
      <Skeleton className="h-16 w-16 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-6 w-16" />
      </div>
    </div>
    {/* Section Navigation Skeleton */}
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-xl" />
      ))}
    </div>
  </div>
);
```

---

## Part 6: Performance Optimizations

### 1. Parallel Data Fetching

```typescript
const fetchUserData = useCallback(async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  
  // Parallel fetching - single await for all data
  const [roleResult, profileResult, adminResult] = await Promise.all([
    supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle(),
    supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.rpc('is_super_admin', { _user_id: user.id })
  ]);
  
  // Set state in batch
  setUserRole(roleResult.data?.role || 'customer');
  setProfile(profileResult.data);
  setIsAdmin(adminResult.data || false);
  setLoading(false);
}, []);
```

### 2. Lazy LocalStorage Load

```typescript
// Load settings once on mount via useState initializer
const [notifications] = useState(() => {
  const saved = localStorage.getItem("notification-settings");
  return saved ? JSON.parse(saved) : defaultSettings;
});
```

### 3. Memoized Sections

```typescript
const visibleSections = useMemo(() => 
  getSections(userRole, isAdmin),
  [userRole, isAdmin]
);
```

---

## Part 7: Implementation Steps

### Step 1: Create New Sub-components
- `SettingsSkeleton.tsx` - Loading state
- `ProfileCard.tsx` - User profile with avatar upload
- `SecuritySection.tsx` - Password + danger zone  
- `SessionInfoCard.tsx` - Current session info
- `TeamInviteCard.tsx` - QR/Link generation (extracted)
- `TeamMembersCard.tsx` - Member list (extracted)
- `index.ts` - Central exports

### Step 2: Refactor TeamSettingsSection
- Remove shop profile form (lines 450-577)
- Add navigation card to My Shop Profile module
- Extract TeamInviteCard and TeamMembersCard
- Add real-time subscriptions
- Target: ~350 lines

### Step 3: Refactor Main SettingsModule
- Use new sub-components
- Implement role-based section visibility
- Add parallel data fetching
- Add loading skeleton
- Add real-time sync indicator
- Target: ~400 lines

### Step 4: Update AccountSettingsSection
- Add avatar upload functionality
- Add session info display
- Add proper loading states
- Improve error handling

### Step 5: Delete Unused Files
- Remove `ShopProfileCard.tsx`
- Remove `ShopProductsCard.tsx`  
- Remove `ProfileSharingCard.tsx`

---

## Part 8: Technical Details

### Database Tables Used
- `profiles` - User profile data (with avatar_url)
- `user_roles` - User role (owner/manager/customer)
- `admin_users` - Admin status check
- `team_members` - Team membership
- `team_invites` - Pending invitations

### Storage Buckets
- `avatars` - For avatar uploads (already exists)

### LocalStorage Keys
- `app-theme` - Theme preference
- `app-language` - Language preference
- `notification-settings` - Notification toggles
- `printer-settings` - Printer configuration

---

## Summary of Changes

| Aspect | Before | After |
|--------|--------|-------|
| Total Lines | 1784 (880 + 904) | ~750 (400 + 350) |
| Components | 2 large files | 8 focused components |
| Real-time | None | Team, invites, profile sync |
| Duplicate Shop | In Settings + MyShop | MyShop only (link in Settings) |
| Loading | No skeleton | Professional skeleton |
| Avatar Upload | Not available | Implemented in Account |
| Role-based Access | Basic | 4-tier (Admin/Owner/Manager/Customer) |
| Performance | Sequential fetches | Parallel fetching + memoization |
| Files Deleted | 0 | 3 (duplicate components) |

This rebuild ensures the Settings module is cleaner, properly role-based for all 4 user types, and fully connected with the rest of the ERP system while eliminating duplicate functionality with the My Shop Profile module.

