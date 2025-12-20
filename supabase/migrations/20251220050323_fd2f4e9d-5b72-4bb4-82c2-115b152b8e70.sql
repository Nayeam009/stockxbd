-- Create stoves table for stock management
CREATE TABLE public.stoves (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  burners INTEGER NOT NULL DEFAULT 2,
  quantity INTEGER NOT NULL DEFAULT 0,
  price NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.stoves ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can read stoves"
ON public.stoves FOR SELECT
USING (true);

CREATE POLICY "Only admins can insert stoves"
ON public.stoves FOR INSERT
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Only admins can update stoves"
ON public.stoves FOR UPDATE
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Only owners can delete stoves"
ON public.stoves FOR DELETE
USING (has_role(auth.uid(), 'owner'));

-- Trigger for updated_at
CREATE TRIGGER update_stoves_updated_at
BEFORE UPDATE ON public.stoves
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default stove brands
INSERT INTO public.stoves (brand, model, burners, quantity, price) VALUES
('Walton', 'WGS-2B100', 2, 25, 2500),
('Walton', 'WGS-3B200', 3, 15, 3500),
('Walton', 'WGS-4B300', 4, 8, 4500),
('RFL', 'Gas Stove 2B', 2, 30, 2200),
('RFL', 'Gas Stove 3B', 3, 20, 3200),
('RFL', 'Gas Stove 4B', 4, 10, 4200),
('Minister', 'MS-2001', 2, 18, 2800),
('Minister', 'MS-3001', 3, 12, 3800),
('Jamuna', 'JGS-202', 2, 22, 2100),
('Jamuna', 'JGS-302', 3, 14, 3100),
('Nova', 'NG-2B', 2, 0, 1900),
('Nova', 'NG-3B', 3, 5, 2900);