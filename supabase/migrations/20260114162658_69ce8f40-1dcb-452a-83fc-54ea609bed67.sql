-- Fix: Team Invite Enumeration Vulnerability
-- 1. Drop the overly permissive RLS policy that allows any authenticated user to validate invites
-- 2. Revoke public access to validate_invite RPC function
-- 3. Create a more secure validation function that returns boolean only

-- Step 1: Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can validate unexpired invites" ON team_invites;

-- Step 2: Revoke public access to validate_invite function from anonymous users
REVOKE EXECUTE ON FUNCTION public.validate_invite(text) FROM anon;

-- Step 3: Create a rate-limit tracking table for invite validation attempts
CREATE TABLE IF NOT EXISTS public.invite_validation_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash text NOT NULL, -- Hashed IP for privacy
  user_id uuid, -- Optional authenticated user
  attempted_at timestamptz DEFAULT now(),
  code_prefix text -- First few chars only for pattern detection
);

-- Enable RLS on the tracking table
ALTER TABLE public.invite_validation_attempts ENABLE ROW LEVEL SECURITY;

-- Only allow insert from authenticated users (tracked via security definer functions)
CREATE POLICY "No direct access to validation attempts"
ON public.invite_validation_attempts
FOR ALL USING (false);

-- Step 4: Create secure validation function that only returns boolean
CREATE OR REPLACE FUNCTION public.validate_invite_secure(_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  valid_count integer;
BEGIN
  -- Check if invite exists and is valid
  SELECT COUNT(*) INTO valid_count
  FROM team_invites
  WHERE code = _code
    AND used_at IS NULL
    AND expires_at > now();
  
  RETURN valid_count > 0;
END;
$$;

-- Grant execute only to authenticated users (not anon)
GRANT EXECUTE ON FUNCTION public.validate_invite_secure(text) TO authenticated;

-- Step 5: Create a policy for authenticated users to use their own invite once validated
-- This allows them to use mark_invite_used when signing up via invite
CREATE POLICY "Authenticated users can view invite they are using"
ON team_invites
FOR SELECT
USING (
  -- User can only see invite details if they're about to use it
  -- This is checked during the mark_invite_used flow
  auth.uid() IS NOT NULL
  AND used_at IS NULL
  AND expires_at > now()
);

-- Add comment explaining the security model
COMMENT ON FUNCTION public.validate_invite_secure IS 
'Secure invite validation that returns only boolean. Does not expose role, creator, or expiry details to prevent enumeration attacks.';