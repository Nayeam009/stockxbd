-- Create regulators table for stock management
CREATE TABLE public.regulators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT '22mm',
  quantity INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.regulators ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can read regulators"
ON public.regulators FOR SELECT
USING (true);

CREATE POLICY "Only admins can insert regulators"
ON public.regulators FOR INSERT
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Only admins can update regulators"
ON public.regulators FOR UPDATE
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Only owners can delete regulators"
ON public.regulators FOR DELETE
USING (has_role(auth.uid(), 'owner'));

-- Trigger for updated_at
CREATE TRIGGER update_regulators_updated_at
BEFORE UPDATE ON public.regulators
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default Bangladeshi regulator brands
INSERT INTO public.regulators (brand, type, quantity) VALUES
('Sena', '20mm', 150),
('Sena', '22mm', 80),
('Pamir', '20mm', 120),
('Pamir', '22mm', 60),
('Bono', '20mm', 30),
('Bono', '22mm', 90),
('FAT', '20mm', 0),
('FAT', '22mm', 45),
('Nova', '20mm', 75),
('Nova', '22mm', 100);