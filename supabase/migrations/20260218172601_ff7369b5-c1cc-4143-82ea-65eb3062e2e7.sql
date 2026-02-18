-- Add customer_type column with 'retail' as default
ALTER TABLE public.customers 
  ADD COLUMN customer_type TEXT NOT NULL DEFAULT 'retail' 
  CHECK (customer_type IN ('retail', 'wholesale'));

-- Ensure all existing customers have 'retail' type
UPDATE public.customers SET customer_type = 'retail' WHERE customer_type IS NULL;