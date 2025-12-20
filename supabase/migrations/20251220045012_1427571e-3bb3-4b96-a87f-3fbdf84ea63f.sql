-- Create LPG brands table with proper cylinder tracking
CREATE TABLE public.lpg_brands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#22c55e',
  size TEXT NOT NULL DEFAULT '22mm',
  package_cylinder INTEGER NOT NULL DEFAULT 0,
  refill_cylinder INTEGER NOT NULL DEFAULT 0,
  empty_cylinder INTEGER NOT NULL DEFAULT 0,
  problem_cylinder INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.lpg_brands ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can read lpg brands" 
ON public.lpg_brands 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can insert lpg brands" 
ON public.lpg_brands 
FOR INSERT 
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Only admins can update lpg brands" 
ON public.lpg_brands 
FOR UPDATE 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Only owners can delete lpg brands" 
ON public.lpg_brands 
FOR DELETE 
USING (has_role(auth.uid(), 'owner'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_lpg_brands_updated_at
BEFORE UPDATE ON public.lpg_brands
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default Bangladeshi LPG brands
INSERT INTO public.lpg_brands (name, color, size, package_cylinder, refill_cylinder, empty_cylinder, problem_cylinder) VALUES
('Bashundhara LP Gas', '#ef4444', '22mm', 220, 850, 550, 15),
('Omera LPG', '#22c55e', '22mm', 215, 650, 400, 8),
('Petromax LPG', '#ec4899', '22mm', 212, 600, 300, 5),
('Beximco LPG', '#22c55e', '22mm', 225, 750, 500, 12),
('LAUGFS Gas', '#eab308', '22mm', 210, 480, 250, 4),
('BM Energy (BD) Ltd.', '#3b82f6', '22mm', 215, 450, 220, 9);