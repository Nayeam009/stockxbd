-- Add weight column to lpg_brands table for tracking inventory by weight
ALTER TABLE public.lpg_brands 
ADD COLUMN IF NOT EXISTS weight TEXT DEFAULT '12kg';

-- Update existing records to have a default weight based on size
UPDATE public.lpg_brands 
SET weight = CASE 
  WHEN size = '22mm' THEN '12kg'
  WHEN size = '20mm' THEN '12kg'
  ELSE '12kg'
END
WHERE weight IS NULL OR weight = '';

-- Create index for faster queries by size and weight
CREATE INDEX IF NOT EXISTS idx_lpg_brands_size_weight ON public.lpg_brands(size, weight);