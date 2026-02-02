-- Phase 1-2: Add search indexes and unified search RPC function

-- Enable pg_trgm extension for fuzzy search (may already exist)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Search optimization indexes
CREATE INDEX IF NOT EXISTS idx_customers_name_trgm ON customers USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_number ON pos_transactions(transaction_number);
CREATE INDEX IF NOT EXISTS idx_community_orders_customer_status ON community_orders(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_staff_name_trgm ON staff USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON vehicles(license_plate);

-- Notification optimization indexes  
CREATE INDEX IF NOT EXISTS idx_lpg_brands_stock ON lpg_brands((package_cylinder + refill_cylinder)) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_community_orders_shop_status ON community_orders(shop_id, status);
CREATE INDEX IF NOT EXISTS idx_cylinder_exchange_status ON cylinder_exchange_requests(status);

-- Unified search RPC function for Global Search
CREATE OR REPLACE FUNCTION search_all_entities(p_query TEXT, p_owner_id UUID)
RETURNS TABLE(
  entity_type TEXT,
  entity_id UUID,
  title TEXT,
  subtitle TEXT,
  metadata JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  search_pattern TEXT;
BEGIN
  search_pattern := '%' || LOWER(p_query) || '%';
  
  RETURN QUERY
  -- Customers search
  SELECT 
    'customer'::TEXT,
    c.id,
    c.name,
    COALESCE(c.phone, 'No phone'),
    jsonb_build_object('due', COALESCE(c.total_due, 0), 'cylinders_due', COALESCE(c.cylinders_due, 0))
  FROM customers c
  WHERE c.owner_id = p_owner_id
    AND (LOWER(c.name) LIKE search_pattern OR c.phone LIKE search_pattern)
  
  UNION ALL
  
  -- Sales transactions search
  SELECT 
    'sale'::TEXT,
    pt.id,
    pt.transaction_number,
    pt.payment_method::TEXT,
    jsonb_build_object('total', pt.total, 'date', pt.created_at::TEXT)
  FROM pos_transactions pt
  WHERE pt.owner_id = p_owner_id
    AND LOWER(pt.transaction_number) LIKE search_pattern
  
  UNION ALL
  
  -- Staff search
  SELECT 
    'staff'::TEXT,
    s.id,
    s.name,
    s.role,
    jsonb_build_object('salary', s.salary, 'phone', COALESCE(s.phone, ''))
  FROM staff s
  WHERE s.owner_id = p_owner_id
    AND s.is_active = true
    AND LOWER(s.name) LIKE search_pattern
  
  UNION ALL
  
  -- Vehicles search
  SELECT 
    'vehicle'::TEXT,
    v.id,
    v.name,
    COALESCE(v.license_plate, 'No plate'),
    jsonb_build_object('odometer', COALESCE(v.last_odometer, 0))
  FROM vehicles v
  WHERE v.owner_id = p_owner_id
    AND v.is_active = true
    AND (LOWER(v.name) LIKE search_pattern OR LOWER(v.license_plate) LIKE search_pattern)
  
  UNION ALL
  
  -- Community orders search (by order number)
  SELECT 
    'order'::TEXT,
    co.id,
    co.order_number,
    co.customer_name,
    jsonb_build_object('total', co.total_amount, 'status', co.status, 'phone', co.customer_phone)
  FROM community_orders co
  JOIN shop_profiles sp ON sp.id = co.shop_id
  WHERE sp.owner_id = p_owner_id
    AND (LOWER(co.order_number) LIKE search_pattern OR LOWER(co.customer_name) LIKE search_pattern OR co.customer_phone LIKE search_pattern)
  
  UNION ALL
  
  -- LPG brands search
  SELECT 
    'stock'::TEXT,
    lb.id,
    lb.name || ' (' || lb.size || ')',
    lb.weight,
    jsonb_build_object('package', lb.package_cylinder, 'refill', lb.refill_cylinder, 'empty', lb.empty_cylinder, 'total', lb.package_cylinder + lb.refill_cylinder)
  FROM lpg_brands lb
  WHERE lb.owner_id = p_owner_id
    AND lb.is_active = true
    AND LOWER(lb.name) LIKE search_pattern
  
  LIMIT 30;
END;
$$;

-- Notification counts RPC for quick badge counts
CREATE OR REPLACE FUNCTION get_notification_counts(p_owner_id UUID)
RETURNS TABLE(
  low_stock_count BIGINT,
  pending_orders_count BIGINT,
  overdue_payments_count BIGINT,
  exchange_requests_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Low stock (cylinders < 10)
    (SELECT COUNT(*) FROM lpg_brands WHERE owner_id = p_owner_id AND is_active = true AND (package_cylinder + refill_cylinder) < 10),
    -- Pending community orders
    (SELECT COUNT(*) FROM community_orders co JOIN shop_profiles sp ON sp.id = co.shop_id WHERE sp.owner_id = p_owner_id AND co.status = 'pending'),
    -- Customers with high dues (> 10000)
    (SELECT COUNT(*) FROM customers WHERE owner_id = p_owner_id AND total_due > 10000),
    -- Pending exchange requests (incoming)
    (SELECT COUNT(*) FROM cylinder_exchange_requests cer JOIN shop_profiles sp ON sp.id = cer.target_shop_id WHERE sp.owner_id = p_owner_id AND cer.status = 'pending');
END;
$$;