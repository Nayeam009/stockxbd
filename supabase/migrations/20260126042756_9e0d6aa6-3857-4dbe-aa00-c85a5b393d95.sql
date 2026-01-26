-- Step 1: Migrate all driver users to manager role
UPDATE public.user_roles 
SET role = 'manager'::app_role 
WHERE role = 'driver'::app_role;

-- Step 2: Migrate all driver team members to manager
UPDATE public.team_members 
SET role = 'manager'::app_role 
WHERE role = 'driver'::app_role;

-- Step 3: Update handle_new_user_role function to default to customer (not driver)
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  has_owners boolean;
  assigned_role app_role;
  requested_role text;
BEGIN
  -- Check if any owners exist
  SELECT EXISTS(SELECT 1 FROM user_roles WHERE role = 'owner') INTO has_owners;
  
  -- First user always becomes owner (bootstrap case)
  IF NOT has_owners THEN
    assigned_role := 'owner';
  ELSE
    -- Check if user requested a specific role during signup
    requested_role := NEW.raw_user_meta_data->>'requested_role';
    
    -- SECURITY: Only 'customer' and 'owner' roles can be requested from client-side signup
    -- Manager role MUST be assigned via Edge Function with owner verification
    IF requested_role = 'customer' THEN
      assigned_role := 'customer';
    ELSIF requested_role = 'owner' THEN
      -- Allow owner self-registration for new shop owners
      assigned_role := 'owner';
    ELSE
      -- Default fallback - all users are customers unless explicitly set
      assigned_role := 'customer';
    END IF;
  END IF;
  
  -- Insert the role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$function$;

-- Step 4: Update remove_team_member function to reset to customer (not driver)
CREATE OR REPLACE FUNCTION public.remove_team_member(_member_id uuid, _owner_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  
  -- Reset their role to customer (default role for non-team members)
  UPDATE user_roles SET role = 'customer' WHERE user_id = member_user_id;
  
  RETURN true;
END;
$function$;

-- Step 5: Update update_team_member_role to only allow manager (simplified)
CREATE OR REPLACE FUNCTION public.update_team_member_role(_member_id uuid, _new_role app_role, _owner_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  
  -- Only allow manager role for team members (simplified role system)
  IF _new_role NOT IN ('manager') THEN
    RETURN false;
  END IF;
  
  -- Update team_members table
  UPDATE team_members SET role = _new_role WHERE id = _member_id;
  
  -- Update user_roles table
  UPDATE user_roles SET role = _new_role WHERE user_id = member_user_id;
  
  RETURN true;
END;
$function$;