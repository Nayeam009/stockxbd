-- Function to check if any owners exist (for first-time setup)
CREATE OR REPLACE FUNCTION public.owners_exist()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles WHERE role = 'owner'
  )
$$;

-- Allow anyone to call owners_exist check (needed for first-time registration)
GRANT EXECUTE ON FUNCTION public.owners_exist() TO anon;
GRANT EXECUTE ON FUNCTION public.owners_exist() TO authenticated;

-- Function to validate invite code (returns invite details if valid)
CREATE OR REPLACE FUNCTION public.validate_invite(_code text)
RETURNS TABLE(
  id uuid,
  role app_role,
  created_by uuid,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ti.id,
    ti.role,
    ti.created_by,
    ti.expires_at
  FROM team_invites ti
  WHERE ti.code = _code 
    AND ti.used_at IS NULL 
    AND ti.expires_at > now();
END;
$$;

-- Allow anyone to validate invites
GRANT EXECUTE ON FUNCTION public.validate_invite(text) TO anon;
GRANT EXECUTE ON FUNCTION public.validate_invite(text) TO authenticated;

-- Function to mark invite as used and add user to team
CREATE OR REPLACE FUNCTION public.mark_invite_used(_code text, _user_id uuid, _email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  invite_record RECORD;
  team_member_id uuid;
BEGIN
  -- Find and validate invite
  SELECT * INTO invite_record 
  FROM team_invites 
  WHERE code = _code 
    AND used_at IS NULL 
    AND expires_at > now();
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Mark invite as used
  UPDATE team_invites 
  SET used_at = now(), used_by = _user_id 
  WHERE id = invite_record.id;
  
  -- Add to team_members
  INSERT INTO team_members (owner_id, member_user_id, member_email, role, invite_id)
  VALUES (
    invite_record.created_by,
    _user_id,
    _email,
    invite_record.role,
    invite_record.id
  )
  RETURNING id INTO team_member_id;
  
  -- Update user role to match invite role
  UPDATE user_roles 
  SET role = invite_record.role 
  WHERE user_id = _user_id;
  
  -- If no role existed, insert one
  IF NOT FOUND THEN
    INSERT INTO user_roles (user_id, role)
    VALUES (_user_id, invite_record.role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN invite_record.id;
END;
$$;

-- Allow authenticated users to use invites
GRANT EXECUTE ON FUNCTION public.mark_invite_used(text, uuid, text) TO authenticated;

-- Update the handle_new_user_role function to make first user owner
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  has_owners boolean;
  assigned_role app_role;
BEGIN
  -- Check if any owners exist
  SELECT EXISTS(SELECT 1 FROM user_roles WHERE role = 'owner') INTO has_owners;
  
  -- First user becomes owner, all others start as driver
  IF NOT has_owners THEN
    assigned_role := 'owner';
  ELSE
    assigned_role := 'driver';
  END IF;
  
  -- Insert the role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;