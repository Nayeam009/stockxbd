-- Add address columns to profiles table for customer auto-fill
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS default_division TEXT,
ADD COLUMN IF NOT EXISTS default_district TEXT,
ADD COLUMN IF NOT EXISTS default_thana TEXT,
ADD COLUMN IF NOT EXISTS street_address TEXT;