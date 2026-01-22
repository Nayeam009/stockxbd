-- Create the missing multi-tenant security functions
-- These functions are critical for RLS policy enforcement

-- 1. Create get_owner_id function
-- Returns the owner_id for the current user (their own ID if owner, or their owner's ID if team member)
CREATE OR REPLACE FUNCTION public.get_owner_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    -- If user is owner, return their own ID
    WHEN EXISTS(
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'owner'
    ) THEN auth.uid()
    -- If user is team member, return their owner's ID
    ELSE (
      SELECT owner_id FROM team_members 
      WHERE member_user_id = auth.uid()
      LIMIT 1
    )
  END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_owner_id() TO authenticated;

-- 2. Create is_same_team function
-- Checks if a given owner_id matches the current user's team
CREATE OR REPLACE FUNCTION public.is_same_team(_owner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _owner_id = get_owner_id();
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_same_team(uuid) TO authenticated;

-- 3. Create set_owner_id_on_insert trigger function
-- Automatically sets owner_id on INSERT if not provided
CREATE OR REPLACE FUNCTION public.set_owner_id_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.owner_id IS NULL THEN
    NEW.owner_id := get_owner_id();
  END IF;
  RETURN NEW;
END;
$$;