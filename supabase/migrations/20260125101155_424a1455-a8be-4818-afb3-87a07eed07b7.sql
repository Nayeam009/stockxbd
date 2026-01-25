-- Fix the handle_new_user_role() trigger function to properly handle 'customer' role
-- This fixes the critical bug where customers were incorrectly assigned 'driver' role

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
  
  -- First user always becomes owner (bootstrap case)
  IF NOT has_owners THEN
    assigned_role := 'owner';
  ELSE
    -- Check if user requested a specific role during signup
    requested_role := NEW.raw_user_meta_data->>'requested_role';
    
    -- SECURITY: Only 'customer' and 'owner' roles can be requested from client-side signup
    -- Team roles (manager, driver, staff) MUST be assigned via Edge Function with owner verification
    IF requested_role = 'customer' THEN
      assigned_role := 'customer';
    ELSIF requested_role = 'owner' THEN
      -- Allow owner self-registration for new shop owners
      assigned_role := 'owner';
    ELSE
      -- Default fallback for edge cases (team members bypass this via Edge Function)
      assigned_role := 'customer';
    END IF;
  END IF;
  
  -- Insert the role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;