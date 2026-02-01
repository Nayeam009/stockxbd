
# Rebuild Settings Module

## Overview
This plan addresses identified issues in the Settings module to improve design, optimization, and connectivity with all other modules. The goal is to create a professional, modular settings interface with real-time synchronization and a cleaner architecture.

---

## Current Issues Identified

### 1. **Large Monolithic Files**
- `SettingsModule.tsx` is 880 lines - too large
- `TeamSettingsSection.tsx` is 904 lines - needs splitting
- Mixed concerns: Profile, Theme, Security, Team, Shop all bundled together

### 2. **No Real-time Subscriptions**
- Team member changes not reflected in real-time
- Shop profile updates not synced
- Pending invites not updated when used by manager

### 3. **Duplicate Functionality**
- Shop profile editing exists in both `TeamSettingsSection.tsx` AND `MyShopProfileModule.tsx`
- Business info duplicated between settings and My Shop module
- Confusing UX - users don't know where to edit shop details

### 4. **Missing Loading States**
- No skeleton loading for settings sections
- Profile data loads with no visual feedback
- Team members fetch without loading indicator on initial load

### 5. **Inconsistent Design**
- Not using shared `PremiumModuleHeader` component
- Custom profile header differs from other modules' premium headers
- Section navigation differs from other modules (e.g., MyShopProfileModule uses Tabs)

### 6. **Performance Issues**
- Multiple independent useEffect calls fetching data separately
- No memoization on computed values
- LocalStorage reads on every render for notification settings

### 7. **Missing Features**
- No avatar upload functionality in Account section
- No session management (view active sessions)
- No export personal data option (GDPR consideration)

---

## Part 1: Component Architecture

### New File Structure
```text
src/components/settings/
  SettingsSkeleton.tsx (NEW)          - Loading skeleton
  ProfileCard.tsx (NEW)               - User profile header card
  SecuritySection.tsx (NEW)           - Password & danger zone
  NotificationSection.tsx (RENAMED)   - Rename PushNotificationCard
  AdvancedSection.tsx (NEW)           - Backup, cache, data management
  TeamInviteCard.tsx (NEW)            - QR/Link invite generation
  TeamMembersCard.tsx (NEW)           - Team member list & management
  index.ts (NEW)                      - Central exports
  
  AccountSettingsSection.tsx          - KEEP (minor updates)
  BackupRestoreCard.tsx              - KEEP (no changes)
  PrinterSettingsSection.tsx         - KEEP (no changes)
  TeamSettingsSection.tsx            - REFACTOR (remove shop profile, split into cards)
  
  REMOVE:
  ShopProfileCard.tsx                - REMOVE (duplicates MyShopProfileModule)
  ShopProductsCard.tsx               - REMOVE (duplicates MyShopProfileModule)
  ProfileSharingCard.tsx             - REMOVE (unused)
  
src/components/dashboard/modules/
  SettingsModule.tsx                 - REFACTOR (~400 lines)
```

---

## Part 2: Remove Duplicate Shop Profile

### Problem
Shop profile editing exists in TWO places:
1. `Settings > Team & Business > Shop Profile` (TeamSettingsSection.tsx lines 450-577)
2. `My Shop Profile` module (MyShopProfileModule.tsx)

This creates confusion for users and maintenance burden.

### Solution
- **Remove** shop profile form from Settings/TeamSettingsSection
- Add a **quick link card** to navigate to My Shop Profile module
- Keep Team Management (invites, members) in Settings

### Updated TeamSettingsSection Structure
```typescript
// BEFORE: Shop Profile + Manager Invite + Team Management (904 lines)
// AFTER: Manager Invite + Team Management + Link to Shop Profile (~400 lines)

<Card>Quick Link to My Shop Profile</Card>
<TeamInviteCard />
<TeamMembersCard />
```

---

## Part 3: Real-time Subscriptions

### Add Supabase Subscriptions
```typescript
useEffect(() => {
  const channel = supabase
    .channel('settings-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members' }, debouncedRefetch)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'team_invites' }, fetchPendingInvites)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, fetchProfile)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'user_roles' }, fetchUserRole)
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, [debouncedRefetch, fetchPendingInvites]);
```

### Tables to Subscribe
| Table | Trigger | Update |
|-------|---------|--------|
| `team_members` | Member joins/leaves | Refresh team list |
| `team_invites` | Invite used/expired | Refresh pending invites |
| `profiles` | Profile update | Refresh user display name/avatar |
| `user_roles` | Role change | Refresh permissions |

---

## Part 4: Premium Design Updates

### Profile Header
Use consistent design with other modules:
```typescript
// Current: Custom inline design
// New: Use Avatar with gradient background + role badge
<Card className="relative overflow-hidden">
  <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-r from-primary/20 to-primary/5" />
  <CardContent className="pt-16 pb-6 relative">
    <Avatar className="h-20 w-20 border-4 border-background shadow-xl absolute -top-10 left-6">
      {/* Avatar content */}
    </Avatar>
    {/* Name, email, role badge */}
  </CardContent>
</Card>
```

### Section Navigation
Keep current sidebar/section pattern but polish:
- Add subtle hover animations
- Add icons to match content
- Add count badges where applicable (e.g., Team: 3 members)

### Mobile Improvements
- Ensure all touch targets are 48px minimum
- Add swipe-back gesture support for mobile detail views
- Improve section transitions with fade animations

---

## Part 5: New Features

### 1. Avatar Upload
Add photo upload to Account section:
```typescript
<div className="relative group">
  <Avatar className="h-20 w-20">
    <AvatarImage src={avatarUrl} />
    <AvatarFallback>{initials}</AvatarFallback>
  </Avatar>
  <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 rounded-full cursor-pointer transition-opacity">
    <Camera className="h-6 w-6 text-white" />
    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
  </label>
</div>
```

### 2. Session Info Card
Show current session info:
```typescript
<Card>
  <CardHeader>
    <CardTitle>Current Session</CardTitle>
  </CardHeader>
  <CardContent>
    <div>Logged in as: {userEmail}</div>
    <div>Last login: {lastLoginDate}</div>
    <Button variant="outline">Sign Out All Devices</Button>
  </CardContent>
</Card>
```

### 3. Loading Skeleton
Create `SettingsSkeleton.tsx`:
```typescript
export const SettingsSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    <Skeleton className="h-32 w-full rounded-xl" />
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

### 1. Memoized Data Fetching
```typescript
const fetchUserData = useCallback(async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  
  // Parallel fetching
  const [roleData, profileData] = await Promise.all([
    supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle(),
    supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle()
  ]);
  
  // Set state once
  setUserRole(roleData?.data?.role || 'customer');
  setProfile(profileData?.data);
}, []);
```

### 2. LocalStorage Lazy Load
```typescript
// Load settings once on mount, not on every render
const [notificationSettings] = useState(() => {
  const saved = localStorage.getItem("notification-settings");
  return saved ? JSON.parse(saved) : defaultSettings;
});
```

### 3. Debounced Real-time Updates
800ms debounce on subscription callbacks to prevent rapid re-renders.

---

## Part 7: Module Connectivity

### Settings ↔ Other Modules
| Settings Change | Affected Modules |
|-----------------|------------------|
| Profile name change | Dashboard header, Business Diary (created_by names) |
| Theme change | All modules (via ThemeContext) |
| Language change | All modules (via LanguageContext) |
| Printer settings | POS, Invoice generation |
| Notification settings | All notification triggers |
| Team member added | Dashboard (role-based access), POS (driver assignment) |

---

## Part 8: Implementation Steps

### Step 1: Create New Sub-components
- `SettingsSkeleton.tsx` - Loading state
- `ProfileCard.tsx` - User profile display with avatar upload
- `SecuritySection.tsx` - Password change + danger zone
- `TeamInviteCard.tsx` - QR/Link generation only
- `TeamMembersCard.tsx` - Member list + remove functionality

### Step 2: Refactor TeamSettingsSection
- Remove shop profile form entirely (lines 450-577)
- Add navigation card to My Shop Profile
- Split into TeamInviteCard + TeamMembersCard
- Add real-time subscriptions
- Reduce to ~300 lines

### Step 3: Refactor Main SettingsModule
- Use new sub-components
- Add real-time sync indicator badge
- Add proper loading states
- Reduce to ~350 lines

### Step 4: Update AccountSettingsSection
- Add avatar upload functionality
- Add session info display
- Improve error handling

### Step 5: Clean Up Unused Files
- Remove `ShopProfileCard.tsx`
- Remove `ShopProductsCard.tsx`
- Remove `ProfileSharingCard.tsx`
- Update index exports

---

## Technical Details

### Database Tables Used
- `profiles` - User profile data
- `user_roles` - User role (owner/manager/customer)
- `team_members` - Team membership
- `team_invites` - Pending invitations
- `shop_profiles` - Shop info (link only, not edit)

### Storage Buckets
- `avatars` - For avatar/logo uploads

### LocalStorage Keys
- `app-theme` - Theme preference
- `app-language` - Language preference
- `notification-settings` - Notification toggles
- `printer-settings` - Printer configuration

---

## Summary of Changes

| Aspect | Before | After |
|--------|--------|-------|
| Total Lines | 1784 (880 + 904) | ~750 (350 + 300 + 100 skeleton) |
| Components | 2 large files | 6 focused components |
| Real-time | None | Team, invites, profile sync |
| Duplicate Shop | In Settings + MyShop | MyShop only (link in Settings) |
| Loading | No skeleton | Professional skeleton |
| Avatar Upload | Not available | Implemented in Account |
| Performance | Multiple fetches | Parallel fetching + memoization |

This rebuild ensures the Settings module is cleaner, more maintainable, and properly connected with the rest of the ERP system while eliminating duplicate functionality with the My Shop Profile module.
