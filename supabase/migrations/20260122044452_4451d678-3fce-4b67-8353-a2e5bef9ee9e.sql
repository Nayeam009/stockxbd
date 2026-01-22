-- Add 'customer' role to the existing app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'customer';

-- Create shop_profiles table for e-commerce marketplace
CREATE TABLE public.shop_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  shop_name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  cover_image_url TEXT,
  phone TEXT NOT NULL,
  whatsapp TEXT,
  address TEXT NOT NULL,
  division TEXT NOT NULL,
  district TEXT NOT NULL,
  thana TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  is_verified BOOLEAN DEFAULT FALSE,
  is_open BOOLEAN DEFAULT TRUE,
  delivery_fee DECIMAL DEFAULT 50,
  rating DECIMAL(3, 2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(owner_id)
);

-- Create shop_products table for public product listings
CREATE TABLE public.shop_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shop_profiles(id) ON DELETE CASCADE NOT NULL,
  product_type TEXT NOT NULL CHECK (product_type IN ('lpg_refill', 'lpg_package', 'stove', 'regulator', 'accessory')),
  brand_name TEXT NOT NULL,
  weight TEXT,
  valve_size TEXT CHECK (valve_size IN ('22mm', '20mm') OR valve_size IS NULL),
  price DECIMAL NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  image_url TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create community_orders table for e-commerce orders
CREATE TABLE public.community_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  shop_id UUID REFERENCES public.shop_profiles(id) NOT NULL,
  customer_id UUID REFERENCES auth.users(id) NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  division TEXT NOT NULL,
  district TEXT NOT NULL,
  thana TEXT,
  order_notes TEXT,
  subtotal DECIMAL NOT NULL,
  delivery_fee DECIMAL DEFAULT 50,
  total_amount DECIMAL NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'dispatched', 'delivered', 'cancelled', 'rejected')),
  payment_method TEXT DEFAULT 'cod' CHECK (payment_method IN ('cod', 'bkash', 'nagad', 'card')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid')),
  rejection_reason TEXT,
  confirmed_at TIMESTAMPTZ,
  dispatched_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create community_order_items table
CREATE TABLE public.community_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.community_orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.shop_products(id),
  product_name TEXT NOT NULL,
  product_type TEXT NOT NULL,
  brand_name TEXT,
  weight TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  price DECIMAL NOT NULL,
  return_cylinder_qty INTEGER DEFAULT 0,
  return_cylinder_type TEXT CHECK (return_cylinder_type IN ('empty', 'leaked') OR return_cylinder_type IS NULL),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create shop_reviews table
CREATE TABLE public.shop_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shop_profiles(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES auth.users(id) NOT NULL,
  order_id UUID REFERENCES public.community_orders(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(order_id)
);

-- Enable RLS on all tables
ALTER TABLE public.shop_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_reviews ENABLE ROW LEVEL SECURITY;

-- Shop profiles: Public read for open shops, owner manages their shop
CREATE POLICY "Public can view active shops" ON public.shop_profiles 
  FOR SELECT USING (is_open = true);

CREATE POLICY "Owner can insert own shop" ON public.shop_profiles 
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owner can update own shop" ON public.shop_profiles 
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Owner can delete own shop" ON public.shop_profiles 
  FOR DELETE USING (owner_id = auth.uid());

-- Shop products: Public read for available products, shop owner manages
CREATE POLICY "Public can view available products" ON public.shop_products 
  FOR SELECT USING (
    is_available = true AND 
    EXISTS (SELECT 1 FROM public.shop_profiles sp WHERE sp.id = shop_id AND sp.is_open = true)
  );

CREATE POLICY "Shop owner can view all own products" ON public.shop_products
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.shop_profiles sp WHERE sp.id = shop_id AND sp.owner_id = auth.uid())
  );

CREATE POLICY "Shop owner can insert products" ON public.shop_products 
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.shop_profiles sp WHERE sp.id = shop_id AND sp.owner_id = auth.uid())
  );

CREATE POLICY "Shop owner can update products" ON public.shop_products 
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.shop_profiles sp WHERE sp.id = shop_id AND sp.owner_id = auth.uid())
  );

CREATE POLICY "Shop owner can delete products" ON public.shop_products 
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.shop_profiles sp WHERE sp.id = shop_id AND sp.owner_id = auth.uid())
  );

-- Community orders: Customer and shop owner access
CREATE POLICY "Customers can view own orders" ON public.community_orders 
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Shop owners can view shop orders" ON public.community_orders 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.shop_profiles sp WHERE sp.id = shop_id AND sp.owner_id = auth.uid())
  );

CREATE POLICY "Customers can create orders" ON public.community_orders 
  FOR INSERT WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Shop owners can update order status" ON public.community_orders 
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.shop_profiles sp WHERE sp.id = shop_id AND sp.owner_id = auth.uid())
  );

-- Order items: Access through order
CREATE POLICY "Users can view order items for their orders" ON public.community_order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.community_orders co 
      WHERE co.id = order_id AND (
        co.customer_id = auth.uid() OR 
        EXISTS (SELECT 1 FROM public.shop_profiles sp WHERE sp.id = co.shop_id AND sp.owner_id = auth.uid())
      )
    )
  );

CREATE POLICY "Customers can create order items" ON public.community_order_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.community_orders co WHERE co.id = order_id AND co.customer_id = auth.uid())
  );

-- Shop reviews: Public read, customer write
CREATE POLICY "Public can view reviews" ON public.shop_reviews
  FOR SELECT USING (true);

CREATE POLICY "Customers can create reviews for their delivered orders" ON public.shop_reviews
  FOR INSERT WITH CHECK (
    customer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.community_orders co 
      WHERE co.id = order_id AND co.customer_id = auth.uid() AND co.status = 'delivered'
    )
  );

-- Enable realtime for community orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_orders;

-- Create function to generate order number
CREATE OR REPLACE FUNCTION public.generate_community_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number := 'LPG-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || SUBSTRING(NEW.id::TEXT, 1, 6);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for order number generation
CREATE TRIGGER set_community_order_number
  BEFORE INSERT ON public.community_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_community_order_number();

-- Create function to update shop stats on order completion
CREATE OR REPLACE FUNCTION public.update_shop_stats_on_order()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
    UPDATE public.shop_profiles 
    SET total_orders = total_orders + 1, updated_at = NOW()
    WHERE id = NEW.shop_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_shop_stats_trigger
  AFTER UPDATE ON public.community_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_shop_stats_on_order();

-- Create function to update shop rating on review
CREATE OR REPLACE FUNCTION public.update_shop_rating_on_review()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.shop_profiles 
  SET 
    rating = (SELECT AVG(rating)::DECIMAL(3,2) FROM public.shop_reviews WHERE shop_id = NEW.shop_id),
    total_reviews = (SELECT COUNT(*) FROM public.shop_reviews WHERE shop_id = NEW.shop_id),
    updated_at = NOW()
  WHERE id = NEW.shop_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_shop_rating_trigger
  AFTER INSERT ON public.shop_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_shop_rating_on_review();