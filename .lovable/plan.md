
# Customer Auto-Fill & Address Persistence Plan

## Current Issues Identified

### Issue 1: Address Data Not Persisted to Database
The `useCustomerData` hook currently:
- Fetches only `full_name, phone, avatar_url` from the `profiles` table
- Stores address data (division, district, thana, streetAddress) only in React state
- Address data is lost on page refresh because it's not saved to any database table

### Issue 2: Saved Addresses Not Persisted
The `savedAddresses` array and `defaultAddress` are stored in React state only - they disappear when the user refreshes the page.

### Issue 3: POS Auto-fill Working BUT Profile-Based Auto-Fill Limited
- POS customer lookup works correctly by searching the `customers` table by phone
- Customer checkout tries to auto-fill from `useCustomerData` but since address isn't loaded from DB, repeat orders don't auto-fill

---

## Solution Architecture

### Database Changes

**Option A: Add address columns to `profiles` table (Recommended)**

Add columns to store the customer's default shipping address:
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS default_division TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS default_district TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS default_thana TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS street_address TEXT;
```

**Option B: Create a `customer_addresses` table**

For multiple saved addresses - but this adds complexity. For now, we'll persist the default address in the profiles table and use localStorage for multiple addresses.

---

## Implementation Plan

### 1. Database Migration - Add Address Columns to Profiles

Add default shipping address fields to the `profiles` table so customer address persists across sessions.

**SQL Migration:**
```sql
-- Add address columns to profiles table for customer auto-fill
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS default_division TEXT,
ADD COLUMN IF NOT EXISTS default_district TEXT,
ADD COLUMN IF NOT EXISTS default_thana TEXT,
ADD COLUMN IF NOT EXISTS street_address TEXT;
```

---

### 2. Update `useCustomerData` Hook - Load & Save Address from Database

**File**: `src/hooks/useCustomerData.ts`

**Changes:**

1. **Load address from profiles table:**
   ```typescript
   const { data: profile } = await supabase
     .from('profiles')
     .select('full_name, phone, avatar_url, default_division, default_district, default_thana, street_address')
     .eq('user_id', user.id)
     .single();

   if (profile) {
     setCustomerData(prev => ({
       ...prev,
       profile: {
         name: profile.full_name || '',
         phone: profile.phone || '',
         email: user.email || ''
       },
       defaultAddress: {
         division: profile.default_division || '',
         district: profile.default_district || '',
         thana: profile.default_thana || '',
         streetAddress: profile.street_address || ''
       }
     }));
   }
   ```

2. **Save address to profiles table:**
   ```typescript
   const saveCustomerData = useCallback(async (data: Partial<CustomerData>, syncToServer = true) => {
     const updated = { ...customerData, ...data };
     setCustomerData(updated);

     if (syncToServer) {
       const { data: { user } } = await supabase.auth.getUser();
       if (user) {
         await supabase
           .from('profiles')
           .upsert({
             user_id: user.id,
             full_name: updated.profile.name,
             phone: updated.profile.phone,
             default_division: updated.defaultAddress.division,
             default_district: updated.defaultAddress.district,
             default_thana: updated.defaultAddress.thana,
             street_address: updated.defaultAddress.streetAddress,
             updated_at: new Date().toISOString()
           }, { onConflict: 'user_id' });
       }
     }
   }, [customerData]);
   ```

3. **Add localStorage fallback for savedAddresses array:**
   ```typescript
   // On load: also check localStorage for savedAddresses
   const savedAddressesStr = localStorage.getItem('lpg-saved-addresses');
   if (savedAddressesStr) {
     const savedAddresses = JSON.parse(savedAddressesStr);
     setCustomerData(prev => ({ ...prev, savedAddresses }));
   }

   // On save: persist savedAddresses to localStorage
   localStorage.setItem('lpg-saved-addresses', JSON.stringify(updated.savedAddresses));
   ```

---

### 3. Update CustomerCheckout.tsx - Save Address After Successful Order

**File**: `src/pages/CustomerCheckout.tsx`

The current code already calls `saveCustomerData` after order placement (line 239-242). After the hook update, this will now persist to the database correctly.

---

### 4. Update CustomerProfile.tsx - Persist Address When Saving Profile

**File**: `src/pages/CustomerProfile.tsx`

Update `handleSaveProfile` (around line 185-218) to also save address fields:

```typescript
const { error } = await supabase
  .from('profiles')
  .upsert({
    user_id: user.id,
    full_name: fullName,
    phone: phone,
    default_division: division,
    default_district: district,
    default_thana: thana,
    street_address: address,
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id' });
```

---

### 5. POS Customer Auto-Fill (Already Working)

The `POSCustomerLookup.tsx` component already auto-fills customer data from the `customers` table when a phone number is entered. This is working correctly.

When a customer is found:
- Name is auto-filled (read-only display)
- Address is auto-filled (read-only display)
- Due amount is shown if applicable

When creating a new customer:
- Name and address input fields appear
- Data is saved to `customers` table on transaction completion

---

## Files to Modify

| File | Changes |
|------|---------|
| **Database Migration** | Add 4 address columns to `profiles` table |
| `src/hooks/useCustomerData.ts` | Load/save address from `profiles`, localStorage for savedAddresses |
| `src/pages/CustomerProfile.tsx` | Include address fields in profile save |
| `src/pages/CustomerCheckout.tsx` | Already calls saveCustomerData (will work after hook update) |

---

## Auto-Fill Flow After Implementation

### Customer Flow (Online Marketplace):
1. Customer registers and places first order
2. Address saved to `profiles` table via `saveCustomerData`
3. Next checkout: `useCustomerData` loads address from database
4. Form auto-fills with "Saved Address" badge
5. Customer can clear and enter new address if needed

### Shop Owner/Manager Flow (POS):
1. Enter customer phone in POS
2. System searches `customers` table (300ms debounce)
3. If found: Auto-fill name, address, show dues badge
4. If new: Show input fields for name/address
5. On sale completion: New customer saved to `customers` table

---

## Technical Summary

**What Gets Persisted:**
- Customer name and phone -> `profiles` table
- Default address (division, district, thana, street) -> `profiles` table
- Multiple saved addresses -> localStorage (with label like "Home", "Office")
- POS customers -> `customers` table (separate from logged-in user profiles)

**Auto-Fill Sources:**
- Checkout form: `profiles` table via `useCustomerData`
- POS: `customers` table via phone lookup
- Browser native: HTML `autocomplete` attributes on inputs
