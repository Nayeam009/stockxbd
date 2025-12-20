-- Create customers table with proper RLS for sensitive PII
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Only admins (owner/manager) can read customer data
CREATE POLICY "Only admins can view customers"
ON public.customers
FOR SELECT
USING (is_admin(auth.uid()));

-- Authenticated users can create customers (when making transactions)
CREATE POLICY "Authenticated users can create customers"
ON public.customers
FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Only admins can update customer info
CREATE POLICY "Only admins can update customers"
ON public.customers
FOR UPDATE
USING (is_admin(auth.uid()));

-- Only owners can delete customers
CREATE POLICY "Only owners can delete customers"
ON public.customers
FOR DELETE
USING (has_role(auth.uid(), 'owner'));

-- Add customer_id reference to pos_transactions
ALTER TABLE public.pos_transactions ADD COLUMN customer_id UUID REFERENCES public.customers(id);

-- Migrate existing customer data to customers table (if any exists)
INSERT INTO public.customers (name, phone, created_by)
SELECT DISTINCT customer_name, customer_phone, created_by
FROM public.pos_transactions
WHERE customer_name IS NOT NULL;

-- Update transactions to reference customer records
UPDATE public.pos_transactions t
SET customer_id = c.id
FROM public.customers c
WHERE t.customer_name = c.name AND (t.customer_phone = c.phone OR (t.customer_phone IS NULL AND c.phone IS NULL));

-- Remove PII columns from transactions table
ALTER TABLE public.pos_transactions DROP COLUMN customer_name;
ALTER TABLE public.pos_transactions DROP COLUMN customer_phone;