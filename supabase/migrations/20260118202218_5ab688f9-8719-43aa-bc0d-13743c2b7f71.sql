-- Phase 1: Database Enhancements for Stock-X ERP

-- 1. Add credit_limit to customers table
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS credit_limit numeric DEFAULT 10000;

-- 2. Add in_transit_cylinder to lpg_brands for tracking cylinders sent to plant
ALTER TABLE public.lpg_brands 
ADD COLUMN IF NOT EXISTS in_transit_cylinder integer DEFAULT 0;

-- 3. Add odometer tracking to vehicles
ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS last_odometer integer DEFAULT 0;

-- 4. Add warranty and damaged tracking to stoves
ALTER TABLE public.stoves 
ADD COLUMN IF NOT EXISTS warranty_months integer DEFAULT 12;
ALTER TABLE public.stoves 
ADD COLUMN IF NOT EXISTS is_damaged boolean DEFAULT false;

-- 5. Add price tracking to regulators (if not exists)
ALTER TABLE public.regulators 
ADD COLUMN IF NOT EXISTS price numeric DEFAULT 0;

-- 6. Create stock_movements table for audit trail
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_type text NOT NULL, -- 'load_out', 'receive', 'sale', 'void', 'exchange'
  brand_id uuid REFERENCES public.lpg_brands(id) ON DELETE SET NULL,
  from_status text, -- 'empty', 'full', 'in_transit', 'problem'
  to_status text,
  quantity integer NOT NULL DEFAULT 0,
  notes text,
  reference_id uuid, -- Transaction or order ID
  created_by uuid,
  owner_id uuid,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on stock_movements
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- RLS policies for stock_movements
CREATE POLICY "Team members can read own stock movements"
ON public.stock_movements
FOR SELECT
USING (owner_id = get_owner_id());

CREATE POLICY "Team admins can insert stock movements"
ON public.stock_movements
FOR INSERT
WITH CHECK (is_admin(auth.uid()) AND owner_id = get_owner_id());

CREATE POLICY "Team owners can delete stock movements"
ON public.stock_movements
FOR DELETE
USING (has_role(auth.uid(), 'owner'::app_role) AND owner_id = get_owner_id());

-- 7. Add trigger to auto-set owner_id for stock_movements
CREATE TRIGGER set_stock_movements_owner_id
BEFORE INSERT ON public.stock_movements
FOR EACH ROW
EXECUTE FUNCTION public.set_owner_id_on_insert();

-- 8. Add liters_filled to vehicle_costs for fuel tracking
ALTER TABLE public.vehicle_costs 
ADD COLUMN IF NOT EXISTS liters_filled numeric DEFAULT 0;

ALTER TABLE public.vehicle_costs 
ADD COLUMN IF NOT EXISTS odometer_reading integer DEFAULT 0;

-- 9. Add driver_id to pos_transactions for delivery assignment
ALTER TABLE public.pos_transactions 
ADD COLUMN IF NOT EXISTS driver_id uuid;

-- 10. Add is_voided column to pos_transactions for void tracking
ALTER TABLE public.pos_transactions 
ADD COLUMN IF NOT EXISTS is_voided boolean DEFAULT false;

ALTER TABLE public.pos_transactions 
ADD COLUMN IF NOT EXISTS voided_at timestamptz;

ALTER TABLE public.pos_transactions 
ADD COLUMN IF NOT EXISTS voided_by uuid;

ALTER TABLE public.pos_transactions 
ADD COLUMN IF NOT EXISTS void_reason text;