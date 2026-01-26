-- Fix the default role in user_roles table from 'driver' to 'customer'
ALTER TABLE public.user_roles ALTER COLUMN role SET DEFAULT 'customer'::app_role;

-- Fix the default role in team_members table from 'driver' to 'manager'
ALTER TABLE public.team_members ALTER COLUMN role SET DEFAULT 'manager'::app_role;