-- Add is_defective column to regulators table (matching is_damaged in stoves table)
ALTER TABLE public.regulators 
ADD COLUMN IF NOT EXISTS is_defective boolean DEFAULT false;