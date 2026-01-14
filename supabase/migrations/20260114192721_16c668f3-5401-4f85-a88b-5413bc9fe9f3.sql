CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  has_owners boolean;
  assigned_role app_role;
  requested_role text;
BEGIN
  -- Check if any owners exist
  SELECT EXISTS(SELECT 1 FROM user_roles WHERE role = 'owner') INTO has_owners;
  
  -- First user always becomes owner
  IF NOT has_owners THEN
    assigned_role := 'owner';
  ELSE
    -- Check if user requested a specific role during signup
    requested_role := NEW.raw_user_meta_data->>'requested_role';
    
    IF requested_role IS NOT NULL AND requested_role IN ('owner', 'manager', 'driver') THEN
      assigned_role := requested_role::app_role;
    ELSE
      assigned_role := 'driver';
    END IF;
  END IF;
  
  -- Insert the role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;