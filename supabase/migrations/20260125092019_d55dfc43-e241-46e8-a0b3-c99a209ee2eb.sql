-- Security Fix Migration: Protect Sensitive Data

-- 1. Drop the existing public view that exposes sensitive data
DROP VIEW IF EXISTS public.shop_profiles_public;

-- 2. Create a new public view that EXCLUDES sensitive contact info
-- Only include non-sensitive data needed for marketplace browsing
CREATE VIEW public.shop_profiles_public
WITH (security_invoker=on) AS
SELECT 
    id,
    shop_name,
    description,
    address,
    division,
    district,
    thana,
    latitude,
    longitude,
    is_open,
    is_verified,
    rating,
    total_reviews,
    total_orders,
    delivery_fee,
    logo_url,
    cover_image_url,
    created_at,
    updated_at
    -- Explicitly EXCLUDES: owner_id, phone, whatsapp, bkash_number, nagad_number, rocket_number, online_payment_only
FROM public.shop_profiles;

-- 3. Grant SELECT on the new view to authenticated and anon users
GRANT SELECT ON public.shop_profiles_public TO anon, authenticated;

-- 4. Make cylinder-photos bucket private (requires shop owner + customer access only)
UPDATE storage.buckets 
SET public = false 
WHERE id = 'cylinder-photos';

-- 5. Drop the overly permissive storage policy for cylinder photos
DROP POLICY IF EXISTS "Public can view cylinder photos" ON storage.objects;

-- 6. Create restrictive storage policy - users can view their own OR shop owners viewing customer photos
CREATE POLICY "Users and shop owners can view cylinder photos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'cylinder-photos'
  AND (
    -- User viewing their own photo
    auth.uid()::text = (storage.foldername(name))[1]
    OR
    -- Shop owner viewing customer's photo for orders they received
    EXISTS (
      SELECT 1 FROM public.community_orders co
      JOIN public.shop_profiles sp ON sp.id = co.shop_id
      WHERE sp.owner_id = auth.uid()
      AND co.customer_id::text = (storage.foldername(name))[1]
    )
  )
);

-- 7. Ensure profiles RLS only allows owner access (already correct, but verify)
-- The existing policy "Users can view their own profile" with USING (auth.uid() = user_id) is correct
-- No changes needed for profiles table

-- 8. Verify community_orders RLS is properly restrictive
-- Existing policies:
--   - Customers can view own orders: USING (customer_id = auth.uid())
--   - Shop owners can view shop orders: USING (EXISTS (SELECT 1 FROM shop_profiles...))
-- These are correct - no changes needed