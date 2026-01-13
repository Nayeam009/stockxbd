-- Fix CLIENT_SIDE_AUTH: Update trigger to ALWAYS assign 'driver' role, ignoring any client-supplied role
-- This prevents privilege escalation attacks where users modify signup payload to claim owner/manager roles

-- Drop and recreate the handle_new_user_role trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER AS $$
BEGIN
  -- SECURITY FIX: Always assign 'driver' role for new users
  -- Previously this used COALESCE with raw_user_meta_data which allowed client-side privilege escalation
  -- Owners must manually promote users to higher roles through the team management interface
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'driver'::app_role);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix RPC_BYPASS: Update generate_transaction_number to require admin role
CREATE OR REPLACE FUNCTION public.generate_transaction_number()
RETURNS TEXT AS $$
DECLARE
  today_date TEXT;
  transaction_count INTEGER;
  new_number TEXT;
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- SECURITY FIX: Check if user has admin role (owner or manager)
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only administrators can generate transaction numbers';
  END IF;
  
  -- Get today's date in YYYYMMDD format
  today_date := to_char(CURRENT_DATE, 'YYYYMMDD');
  
  -- Count existing transactions for today
  SELECT COUNT(*) INTO transaction_count
  FROM public.pos_transactions
  WHERE DATE(created_at) = CURRENT_DATE;
  
  -- Generate new transaction number: TXN-YYYYMMDD-XXXX
  new_number := 'TXN-' || today_date || '-' || LPAD((transaction_count + 1)::TEXT, 4, '0');
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix RPC_BYPASS: Update generate_order_number to require admin role
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT AS $$
DECLARE
  today_date TEXT;
  order_count INTEGER;
  new_number TEXT;
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- SECURITY FIX: Check if user has admin role (owner or manager)
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only administrators can generate order numbers';
  END IF;
  
  -- Get today's date in YYYYMMDD format
  today_date := to_char(CURRENT_DATE, 'YYYYMMDD');
  
  -- Count existing orders for today
  SELECT COUNT(*) INTO order_count
  FROM public.orders
  WHERE DATE(created_at) = CURRENT_DATE;
  
  -- Generate new order number: ORD-YYYYMMDD-XXXX
  new_number := 'ORD-' || today_date || '-' || LPAD((order_count + 1)::TEXT, 4, '0');
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;