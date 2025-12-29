-- Create vehicles table
CREATE TABLE public.vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  license_plate TEXT,
  created_by UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create vehicle_costs table
CREATE TABLE public.vehicle_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE NOT NULL,
  cost_type TEXT NOT NULL,
  description TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  cost_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create staff table
CREATE TABLE public.staff (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Staff',
  salary NUMERIC NOT NULL DEFAULT 0,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create staff_payments table  
CREATE TABLE public.staff_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create product_prices table for multi-tier pricing
CREATE TABLE public.product_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_type TEXT NOT NULL, -- 'lpg', 'stove', 'regulator'
  brand_id UUID,
  product_name TEXT NOT NULL,
  size TEXT,
  variant TEXT, -- 'refill', 'package' for LPG
  company_price NUMERIC NOT NULL DEFAULT 0,
  distributor_price NUMERIC NOT NULL DEFAULT 0,
  retail_price NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_prices ENABLE ROW LEVEL SECURITY;

-- Vehicles policies
CREATE POLICY "Authenticated users can read vehicles" ON public.vehicles FOR SELECT USING (true);
CREATE POLICY "Only admins can insert vehicles" ON public.vehicles FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Only admins can update vehicles" ON public.vehicles FOR UPDATE USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Only owners can delete vehicles" ON public.vehicles FOR DELETE USING (has_role(auth.uid(), 'owner'::app_role));

-- Vehicle costs policies
CREATE POLICY "Authenticated users can read vehicle costs" ON public.vehicle_costs FOR SELECT USING (true);
CREATE POLICY "Only admins can insert vehicle costs" ON public.vehicle_costs FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Only admins can update vehicle costs" ON public.vehicle_costs FOR UPDATE USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Only owners can delete vehicle costs" ON public.vehicle_costs FOR DELETE USING (has_role(auth.uid(), 'owner'::app_role));

-- Staff policies
CREATE POLICY "Authenticated users can read staff" ON public.staff FOR SELECT USING (true);
CREATE POLICY "Only admins can insert staff" ON public.staff FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Only admins can update staff" ON public.staff FOR UPDATE USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Only owners can delete staff" ON public.staff FOR DELETE USING (has_role(auth.uid(), 'owner'::app_role));

-- Staff payments policies
CREATE POLICY "Authenticated users can read staff payments" ON public.staff_payments FOR SELECT USING (true);
CREATE POLICY "Only admins can insert staff payments" ON public.staff_payments FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Only admins can update staff payments" ON public.staff_payments FOR UPDATE USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Only owners can delete staff payments" ON public.staff_payments FOR DELETE USING (has_role(auth.uid(), 'owner'::app_role));

-- Product prices policies
CREATE POLICY "Authenticated users can read product prices" ON public.product_prices FOR SELECT USING (true);
CREATE POLICY "Only admins can insert product prices" ON public.product_prices FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Only admins can update product prices" ON public.product_prices FOR UPDATE USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Only owners can delete product prices" ON public.product_prices FOR DELETE USING (has_role(auth.uid(), 'owner'::app_role));

-- Add triggers for updated_at
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON public.staff FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_product_prices_updated_at BEFORE UPDATE ON public.product_prices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();