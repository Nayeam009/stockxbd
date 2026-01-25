-- Phase 1: Database Schema Updates for Online Shop & LPG Community Ecosystem

-- 1.1 Create customer_cylinder_profiles table
CREATE TABLE public.customer_cylinder_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_name TEXT NOT NULL,
  weight TEXT NOT NULL DEFAULT '12kg',
  valve_size TEXT NOT NULL DEFAULT '22mm',
  cylinder_photo_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.customer_cylinder_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customer_cylinder_profiles
CREATE POLICY "Users can view own cylinder profile"
ON public.customer_cylinder_profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cylinder profile"
ON public.customer_cylinder_profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cylinder profile"
ON public.customer_cylinder_profiles
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cylinder profile"
ON public.customer_cylinder_profiles
FOR DELETE
USING (auth.uid() = user_id);

-- Shop owners can view customer cylinder profiles for orders
CREATE POLICY "Shop owners can view customer profiles for their orders"
ON public.customer_cylinder_profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM community_orders co
    JOIN shop_profiles sp ON sp.id = co.shop_id
    WHERE co.customer_id = customer_cylinder_profiles.user_id
    AND sp.owner_id = auth.uid()
  )
);

-- 1.2 Add payment fields to shop_profiles
ALTER TABLE public.shop_profiles 
ADD COLUMN IF NOT EXISTS bkash_number TEXT,
ADD COLUMN IF NOT EXISTS nagad_number TEXT,
ADD COLUMN IF NOT EXISTS rocket_number TEXT,
ADD COLUMN IF NOT EXISTS online_payment_only BOOLEAN DEFAULT false;

-- 1.3 Add transaction ID and reserved_at to community_orders
ALTER TABLE public.community_orders 
ADD COLUMN IF NOT EXISTS payment_trx_id TEXT,
ADD COLUMN IF NOT EXISTS reserved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS return_cylinder_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS verified_by UUID;

-- 1.4 Add reserved_stock to shop_products for stock reservation
ALTER TABLE public.shop_products
ADD COLUMN IF NOT EXISTS reserved_stock INTEGER DEFAULT 0;

-- 1.5 Create storage bucket for cylinder photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('cylinder-photos', 'cylinder-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for cylinder-photos bucket
CREATE POLICY "Authenticated users can upload cylinder photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'cylinder-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Public can view cylinder photos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'cylinder-photos');

CREATE POLICY "Users can update own cylinder photos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'cylinder-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own cylinder photos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'cylinder-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 1.6 Create updated_at trigger for customer_cylinder_profiles
CREATE TRIGGER update_customer_cylinder_profiles_updated_at
BEFORE UPDATE ON public.customer_cylinder_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for new table
ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_cylinder_profiles;