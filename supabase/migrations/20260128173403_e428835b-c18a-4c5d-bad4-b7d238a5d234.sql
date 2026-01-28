-- Instead of changing enum (which requires dropping many policies), 
-- just update the data and ensure the admin user is set up properly

-- Step 1: Update any driver roles to manager
UPDATE public.user_roles SET role = 'manager' WHERE role = 'driver';
UPDATE public.team_members SET role = 'manager' WHERE role = 'driver';
UPDATE public.team_invites SET role = 'manager' WHERE role = 'driver';

-- Step 2: Set default to manager for team_invites (not driver)
ALTER TABLE public.team_invites ALTER COLUMN role SET DEFAULT 'manager'::app_role;

-- Step 3: Ensure khnayeam009@gmail.com has owner role and admin access
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  SELECT id INTO admin_user_id FROM auth.users WHERE email = 'khnayeam009@gmail.com' LIMIT 1;
  
  IF admin_user_id IS NOT NULL THEN
    -- Ensure they have owner role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'owner')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Update any existing roles to owner for this user
    UPDATE public.user_roles SET role = 'owner' WHERE user_id = admin_user_id;
    
    -- Ensure they're in admin_users table (super admin)
    INSERT INTO public.admin_users (user_id, created_by)
    VALUES (admin_user_id, admin_user_id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
END $$;

-- Step 4: Clean up old enum types from failed migrations
DROP TYPE IF EXISTS public.app_role_new;
DROP TYPE IF EXISTS public.app_role_v2;
DROP TYPE IF EXISTS public.app_role_v3;