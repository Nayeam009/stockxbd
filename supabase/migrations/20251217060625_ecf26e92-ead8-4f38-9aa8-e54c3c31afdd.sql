-- Add created_by column to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Add created_by column to pos_transactions table  
ALTER TABLE public.pos_transactions ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Allow public read access to products" ON public.products;
DROP POLICY IF EXISTS "Allow public insert access to products" ON public.products;
DROP POLICY IF EXISTS "Allow public update access to products" ON public.products;
DROP POLICY IF EXISTS "Allow public read access to transactions" ON public.pos_transactions;
DROP POLICY IF EXISTS "Allow public insert access to transactions" ON public.pos_transactions;
DROP POLICY IF EXISTS "Allow public read access to transaction items" ON public.pos_transaction_items;
DROP POLICY IF EXISTS "Allow public insert access to transaction items" ON public.pos_transaction_items;

-- Create secure policies for products (authenticated users only)
CREATE POLICY "Authenticated users can read products"
ON public.products FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert products"
ON public.products FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update products"
ON public.products FOR UPDATE
TO authenticated
USING (true);

-- Create secure policies for pos_transactions (authenticated users only)
CREATE POLICY "Authenticated users can read transactions"
ON public.pos_transactions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert transactions"
ON public.pos_transactions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Create secure policies for pos_transaction_items (authenticated users only)
CREATE POLICY "Authenticated users can read transaction items"
ON public.pos_transaction_items FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert transaction items"
ON public.pos_transaction_items FOR INSERT
TO authenticated
WITH CHECK (true);