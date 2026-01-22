-- Add customer_type and is_self_order columns to community_orders
ALTER TABLE community_orders 
ADD COLUMN IF NOT EXISTS customer_type TEXT DEFAULT 'retail' CHECK (customer_type IN ('retail', 'wholesale'));

ALTER TABLE community_orders 
ADD COLUMN IF NOT EXISTS is_self_order BOOLEAN DEFAULT false;

-- Create cylinder_exchange_requests table for owner-to-owner exchanges
CREATE TABLE IF NOT EXISTS public.cylinder_exchange_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_shop_id UUID REFERENCES shop_profiles(id) ON DELETE CASCADE NOT NULL,
  target_shop_id UUID REFERENCES shop_profiles(id) ON DELETE CASCADE NOT NULL,
  requester_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  brand_name TEXT NOT NULL,
  weight TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed')),
  notes TEXT,
  response_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Enable RLS on cylinder_exchange_requests
ALTER TABLE public.cylinder_exchange_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Owners can view requests they sent or received
CREATE POLICY "Owners can view their exchange requests"
  ON public.cylinder_exchange_requests FOR SELECT
  USING (
    requester_id = auth.uid() 
    OR target_shop_id IN (SELECT id FROM shop_profiles WHERE owner_id = auth.uid())
  );

-- RLS Policy: Owners can create exchange requests
CREATE POLICY "Owners can create exchange requests"
  ON public.cylinder_exchange_requests FOR INSERT
  WITH CHECK (requester_id = auth.uid());

-- RLS Policy: Target shop owners can update requests (accept/reject)
CREATE POLICY "Target shop owners can update requests"
  ON public.cylinder_exchange_requests FOR UPDATE
  USING (target_shop_id IN (SELECT id FROM shop_profiles WHERE owner_id = auth.uid()));

-- Enable realtime for cylinder_exchange_requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.cylinder_exchange_requests;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cylinder_exchange_requester ON public.cylinder_exchange_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_cylinder_exchange_target ON public.cylinder_exchange_requests(target_shop_id);
CREATE INDEX IF NOT EXISTS idx_cylinder_exchange_status ON public.cylinder_exchange_requests(status);