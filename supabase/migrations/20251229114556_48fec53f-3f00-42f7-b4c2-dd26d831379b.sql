-- Create daily_expenses table
CREATE TABLE public.daily_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL,
  description TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Enable RLS
ALTER TABLE public.daily_expenses ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can read expenses" 
ON public.daily_expenses 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can insert expenses" 
ON public.daily_expenses 
FOR INSERT 
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Only admins can update expenses" 
ON public.daily_expenses 
FOR UPDATE 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Only owners can delete expenses" 
ON public.daily_expenses 
FOR DELETE 
USING (has_role(auth.uid(), 'owner'::app_role));