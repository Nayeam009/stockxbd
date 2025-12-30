-- Create team_invites table for secure invite storage
CREATE TABLE public.team_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  role public.app_role NOT NULL DEFAULT 'driver',
  created_by UUID NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE NULL,
  used_by UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

-- Only owners can create invites
CREATE POLICY "Owners can create invites" 
ON public.team_invites 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'owner'
  )
);

-- Only owners can view invites they created
CREATE POLICY "Owners can view their invites" 
ON public.team_invites 
FOR SELECT 
USING (created_by = auth.uid());

-- Only owners can delete invites they created
CREATE POLICY "Owners can delete their invites" 
ON public.team_invites 
FOR DELETE 
USING (created_by = auth.uid());

-- Allow users to validate invite codes (needed for signup flow)
CREATE POLICY "Anyone can validate unexpired invites" 
ON public.team_invites 
FOR SELECT 
USING (
  expires_at > now() 
  AND used_at IS NULL
);

-- Create team_members table for tracking team relationships
CREATE TABLE public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  member_user_id UUID NOT NULL UNIQUE,
  member_email TEXT NOT NULL,
  role public.app_role NOT NULL DEFAULT 'driver',
  invite_id UUID REFERENCES public.team_invites(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Owners can view their team members
CREATE POLICY "Owners can view their team" 
ON public.team_members 
FOR SELECT 
USING (owner_id = auth.uid());

-- Owners can add team members
CREATE POLICY "Owners can add team members" 
ON public.team_members 
FOR INSERT 
WITH CHECK (owner_id = auth.uid());

-- Owners can remove team members
CREATE POLICY "Owners can remove team members" 
ON public.team_members 
FOR DELETE 
USING (owner_id = auth.uid());

-- Members can view their own membership
CREATE POLICY "Members can view their own membership" 
ON public.team_members 
FOR SELECT 
USING (member_user_id = auth.uid());