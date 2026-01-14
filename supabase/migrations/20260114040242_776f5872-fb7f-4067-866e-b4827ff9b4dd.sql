-- Function to update team member role (owner only)
CREATE OR REPLACE FUNCTION public.update_team_member_role(
  _member_id uuid,
  _new_role app_role,
  _owner_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  member_user_id uuid;
BEGIN
  -- Verify the caller is the owner of this team member
  SELECT tm.member_user_id INTO member_user_id
  FROM team_members tm
  WHERE tm.id = _member_id AND tm.owner_id = _owner_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Cannot change to owner role
  IF _new_role = 'owner' THEN
    RETURN false;
  END IF;
  
  -- Update team_members table
  UPDATE team_members SET role = _new_role WHERE id = _member_id;
  
  -- Update user_roles table
  UPDATE user_roles SET role = _new_role WHERE user_id = member_user_id;
  
  RETURN true;
END;
$$;

-- Function to remove team member (owner only)
CREATE OR REPLACE FUNCTION public.remove_team_member(
  _member_id uuid,
  _owner_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  member_user_id uuid;
BEGIN
  -- Verify the caller is the owner of this team member
  SELECT tm.member_user_id INTO member_user_id
  FROM team_members tm
  WHERE tm.id = _member_id AND tm.owner_id = _owner_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Delete from team_members
  DELETE FROM team_members WHERE id = _member_id;
  
  -- Reset their role to driver (default role)
  UPDATE user_roles SET role = 'driver' WHERE user_id = member_user_id;
  
  RETURN true;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.update_team_member_role(uuid, app_role, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_team_member(uuid, uuid) TO authenticated;