-- Fix infinite recursion in admin_users RLS policies
-- The current policies query admin_users to check if user is admin, causing recursion

-- Drop the problematic policies
DROP POLICY IF EXISTS "Admins can view admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Admins can insert admin users" ON public.admin_users;

-- Create new policies using the SECURITY DEFINER function to avoid recursion
-- Users can view admin_users if they are a super admin (uses is_super_admin function which bypasses RLS)
CREATE POLICY "Super admins can view admin users"
  ON public.admin_users
  FOR SELECT
  USING (public.is_super_admin(auth.uid()));

-- Super admins can insert new admin users
CREATE POLICY "Super admins can insert admin users"
  ON public.admin_users
  FOR INSERT
  WITH CHECK (public.is_super_admin(auth.uid()));

-- Super admins can delete admin users
CREATE POLICY "Super admins can delete admin users"
  ON public.admin_users
  FOR DELETE
  USING (public.is_super_admin(auth.uid()));