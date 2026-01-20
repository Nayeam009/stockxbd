-- Create pob_transactions table for tracking purchases from suppliers
CREATE TABLE public.pob_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_number TEXT NOT NULL UNIQUE,
  supplier_name TEXT NOT NULL DEFAULT 'Company',
  subtotal NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  payment_status TEXT NOT NULL DEFAULT 'completed',
  notes TEXT,
  is_voided BOOLEAN DEFAULT false,
  void_reason TEXT,
  voided_at TIMESTAMP WITH TIME ZONE,
  voided_by UUID,
  created_by UUID,
  owner_id UUID,
  is_demo BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create pob_transaction_items table for line items
CREATE TABLE public.pob_transaction_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES public.pob_transactions(id) ON DELETE CASCADE,
  product_type TEXT NOT NULL,
  product_name TEXT NOT NULL,
  brand_id UUID,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total_price NUMERIC NOT NULL DEFAULT 0,
  cylinder_type TEXT,
  weight TEXT,
  size TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.pob_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pob_transaction_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pob_transactions
CREATE POLICY "Users can view pob_transactions in their team"
  ON public.pob_transactions FOR SELECT
  USING (public.is_same_team(owner_id));

CREATE POLICY "Admins can insert pob_transactions"
  ON public.pob_transactions FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update pob_transactions"
  ON public.pob_transactions FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- RLS Policies for pob_transaction_items
CREATE POLICY "Users can view pob_transaction_items in their team"
  ON public.pob_transaction_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.pob_transactions pt
    WHERE pt.id = transaction_id AND public.is_same_team(pt.owner_id)
  ));

CREATE POLICY "Admins can insert pob_transaction_items"
  ON public.pob_transaction_items FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

-- Create function to generate POB transaction number
CREATE OR REPLACE FUNCTION public.generate_pob_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  today_date TEXT;
  transaction_count INTEGER;
  new_number TEXT;
BEGIN
  -- Get today's date in YYYYMMDD format
  today_date := to_char(CURRENT_DATE, 'YYYYMMDD');
  
  -- Count existing POB transactions for today
  SELECT COUNT(*) INTO transaction_count
  FROM public.pob_transactions
  WHERE DATE(created_at) = CURRENT_DATE;
  
  -- Generate new transaction number: POB-YYYYMMDD-XXXX
  new_number := 'POB-' || today_date || '-' || LPAD((transaction_count + 1)::TEXT, 4, '0');
  
  RETURN new_number;
END;
$$;

-- Create triggers to auto-set owner_id
CREATE TRIGGER set_pob_transactions_owner_id
  BEFORE INSERT ON public.pob_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_owner_id_on_insert();

-- Create indexes for performance
CREATE INDEX idx_pob_transactions_owner_id ON public.pob_transactions(owner_id);
CREATE INDEX idx_pob_transactions_created_at ON public.pob_transactions(created_at);
CREATE INDEX idx_pob_transaction_items_transaction_id ON public.pob_transaction_items(transaction_id);