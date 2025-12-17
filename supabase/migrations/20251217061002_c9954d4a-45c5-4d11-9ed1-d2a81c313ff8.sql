-- Create app_role enum for role-based access
CREATE TYPE public.app_role AS ENUM ('owner', 'manager', 'driver');

-- Create user_roles table for proper role management
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'driver',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents infinite recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user is owner or manager
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('owner', 'manager')
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can read own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Owners can manage all roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'owner'))
WITH CHECK (public.has_role(auth.uid(), 'owner'));

-- Drop existing policies on pos_transactions
DROP POLICY IF EXISTS "Authenticated users can read transactions" ON public.pos_transactions;
DROP POLICY IF EXISTS "Authenticated users can insert transactions" ON public.pos_transactions;

-- Create new secure policies for pos_transactions
-- Users can only read their own transactions, owners/managers can read all
CREATE POLICY "Users read own transactions, admins read all"
ON public.pos_transactions FOR SELECT
TO authenticated
USING (
  auth.uid() = created_by 
  OR public.is_admin(auth.uid())
);

CREATE POLICY "Authenticated users can create transactions"
ON public.pos_transactions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Drop existing policies on pos_transaction_items
DROP POLICY IF EXISTS "Authenticated users can read transaction items" ON public.pos_transaction_items;
DROP POLICY IF EXISTS "Authenticated users can insert transaction items" ON public.pos_transaction_items;

-- Add created_by to transaction_items for proper RLS
ALTER TABLE public.pos_transaction_items ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Create secure policies for pos_transaction_items
CREATE POLICY "Users read own transaction items, admins read all"
ON public.pos_transaction_items FOR SELECT
TO authenticated
USING (
  auth.uid() = created_by 
  OR public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.pos_transactions t 
    WHERE t.id = transaction_id AND (t.created_by = auth.uid() OR public.is_admin(auth.uid()))
  )
);

CREATE POLICY "Authenticated users can create transaction items"
ON public.pos_transaction_items FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Drop and recreate policies on products
DROP POLICY IF EXISTS "Authenticated users can read products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can insert products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can update products" ON public.products;

-- Products: all authenticated can read, only admins can modify
CREATE POLICY "Authenticated users can read products"
ON public.products FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admins can insert products"
ON public.products FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can update products"
ON public.products FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Only owners can delete products"
ON public.products FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'owner'));

-- Create trigger to auto-assign role on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'driver'));
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();