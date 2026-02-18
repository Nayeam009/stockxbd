-- Add tax_rate and currency_symbol columns to shop_profiles
ALTER TABLE public.shop_profiles 
  ADD COLUMN IF NOT EXISTS tax_rate NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency_symbol TEXT DEFAULT '৳';