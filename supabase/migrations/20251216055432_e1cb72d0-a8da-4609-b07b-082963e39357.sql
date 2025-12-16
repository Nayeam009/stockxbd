-- Create product categories enum
CREATE TYPE public.product_category AS ENUM ('lpg_cylinder', 'stove', 'regulator', 'accessory');

-- Create payment method enum
CREATE TYPE public.payment_method AS ENUM ('cash', 'bkash', 'nagad', 'rocket', 'card');

-- Create products table for inventory
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category product_category NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'unit',
  sku TEXT UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transactions table for sales
CREATE TABLE public.pos_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_number TEXT NOT NULL UNIQUE,
  customer_name TEXT,
  customer_phone TEXT,
  subtotal DECIMAL(10,2) NOT NULL,
  discount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  payment_method payment_method NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'completed',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transaction items table
CREATE TABLE public.pos_transaction_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES public.pos_transactions(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security (public access for now as no auth is implemented)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_transaction_items ENABLE ROW LEVEL SECURITY;

-- Create policies for public read/write access (can be restricted later with auth)
CREATE POLICY "Allow public read access to products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to products" ON public.products FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to products" ON public.products FOR UPDATE USING (true);

CREATE POLICY "Allow public read access to transactions" ON public.pos_transactions FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to transactions" ON public.pos_transactions FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read access to transaction items" ON public.pos_transaction_items FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to transaction items" ON public.pos_transaction_items FOR INSERT WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to generate transaction number
CREATE OR REPLACE FUNCTION public.generate_transaction_number()
RETURNS TEXT AS $$
DECLARE
  today_date TEXT;
  daily_count INTEGER;
BEGIN
  today_date := TO_CHAR(NOW(), 'YYYYMMDD');
  SELECT COUNT(*) + 1 INTO daily_count 
  FROM public.pos_transactions 
  WHERE DATE(created_at) = CURRENT_DATE;
  RETURN 'TXN-' || today_date || '-' || LPAD(daily_count::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Insert default products for LPG business
INSERT INTO public.products (name, category, price, stock_quantity, unit, sku) VALUES
  ('12kg LPG Cylinder (Full)', 'lpg_cylinder', 1250.00, 50, 'unit', 'LPG-12KG-FULL'),
  ('12kg LPG Cylinder (Refill)', 'lpg_cylinder', 950.00, 100, 'unit', 'LPG-12KG-REFILL'),
  ('22kg LPG Cylinder (Full)', 'lpg_cylinder', 2200.00, 30, 'unit', 'LPG-22KG-FULL'),
  ('22kg LPG Cylinder (Refill)', 'lpg_cylinder', 1750.00, 80, 'unit', 'LPG-22KG-REFILL'),
  ('5kg LPG Cylinder (Full)', 'lpg_cylinder', 650.00, 40, 'unit', 'LPG-5KG-FULL'),
  ('5kg LPG Cylinder (Refill)', 'lpg_cylinder', 450.00, 60, 'unit', 'LPG-5KG-REFILL'),
  ('Single Burner Stove', 'stove', 850.00, 25, 'unit', 'STOVE-SINGLE'),
  ('Double Burner Stove', 'stove', 1500.00, 20, 'unit', 'STOVE-DOUBLE'),
  ('Auto-Ignition Stove', 'stove', 2200.00, 15, 'unit', 'STOVE-AUTO'),
  ('Standard Regulator', 'regulator', 350.00, 50, 'unit', 'REG-STD'),
  ('High-Pressure Regulator', 'regulator', 550.00, 30, 'unit', 'REG-HP'),
  ('Gas Pipe (6ft)', 'accessory', 150.00, 100, 'unit', 'PIPE-6FT'),
  ('Gas Pipe (10ft)', 'accessory', 220.00, 80, 'unit', 'PIPE-10FT'),
  ('Pipe Clamp', 'accessory', 25.00, 200, 'unit', 'CLAMP');

-- Enable realtime for products table
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;