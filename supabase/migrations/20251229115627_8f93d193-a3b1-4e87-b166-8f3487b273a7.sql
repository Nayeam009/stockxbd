-- Add email and customer tracking fields to existing customers table
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS total_due NUMERIC DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS cylinders_due INTEGER DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS billing_status TEXT DEFAULT 'clear';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS last_order_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create customer payments table for tracking settlement history
CREATE TABLE IF NOT EXISTS public.customer_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  cylinders_collected INTEGER DEFAULT 0,
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on customer_payments
ALTER TABLE public.customer_payments ENABLE ROW LEVEL SECURITY;

-- RLS policies for customer_payments
CREATE POLICY "Admins can read customer payments" 
ON public.customer_payments 
FOR SELECT 
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert customer payments" 
ON public.customer_payments 
FOR INSERT 
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update customer payments" 
ON public.customer_payments 
FOR UPDATE 
USING (is_admin(auth.uid()));

CREATE POLICY "Owners can delete customer payments" 
ON public.customer_payments 
FOR DELETE 
USING (has_role(auth.uid(), 'owner'::app_role));

-- Create trigger for updated_at on customers
CREATE OR REPLACE TRIGGER update_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();