-- Security Fix 1: Create a public view for shop_profiles that hides owner_id
CREATE VIEW public.shop_profiles_public
WITH (security_invoker=on) AS
SELECT 
  id, shop_name, description, phone, whatsapp, address, 
  division, district, thana, latitude, longitude,
  logo_url, cover_image_url, is_open, is_verified,
  rating, total_reviews, total_orders, delivery_fee,
  created_at, updated_at
FROM public.shop_profiles
WHERE is_open = true;

-- Security Fix 2: Create rate_limit_attempts table for edge function protection
CREATE TABLE public.rate_limit_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  action text NOT NULL,
  email text,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  success boolean DEFAULT false
);

-- Create index for efficient lookups
CREATE INDEX idx_rate_limit_ip_action_time 
ON public.rate_limit_attempts(ip_address, action, attempted_at DESC);

CREATE INDEX idx_rate_limit_email_action_time 
ON public.rate_limit_attempts(email, action, attempted_at DESC);

-- Enable RLS on rate_limit_attempts
ALTER TABLE public.rate_limit_attempts ENABLE ROW LEVEL SECURITY;

-- Only service role can manage this table (via edge functions)
CREATE POLICY "Service role only"
ON public.rate_limit_attempts FOR ALL
USING (false)
WITH CHECK (false);

-- Security Fix 3: Strengthen team_invites policy - drop the weak one
DROP POLICY IF EXISTS "Authenticated users can view invite they are using" ON public.team_invites;

-- Create a more secure policy that requires exact code match via RPC only
-- Invites should only be viewable by the creator or via secure RPC
CREATE POLICY "Only creators can view their invites"
ON public.team_invites FOR SELECT
USING (created_by = auth.uid());

-- Security Fix 4: Create helper function for rate limiting
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _ip_address text,
  _action text,
  _max_attempts integer DEFAULT 5,
  _window_minutes integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  attempt_count integer;
BEGIN
  -- Count attempts in the time window
  SELECT COUNT(*) INTO attempt_count
  FROM rate_limit_attempts
  WHERE ip_address = _ip_address
    AND action = _action
    AND attempted_at > now() - (_window_minutes || ' minutes')::interval;
  
  RETURN attempt_count < _max_attempts;
END;
$$;

-- Security Fix 5: Create function to record rate limit attempt
CREATE OR REPLACE FUNCTION public.record_rate_limit_attempt(
  _ip_address text,
  _action text,
  _email text DEFAULT NULL,
  _success boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO rate_limit_attempts (ip_address, action, email, success)
  VALUES (_ip_address, _action, _email, _success);
  
  -- Cleanup old entries (older than 24 hours)
  DELETE FROM rate_limit_attempts 
  WHERE attempted_at < now() - interval '24 hours';
END;
$$;