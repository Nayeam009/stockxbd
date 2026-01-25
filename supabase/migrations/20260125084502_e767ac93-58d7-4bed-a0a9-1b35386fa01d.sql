-- =====================================================
-- PHASE 3: HIGH-PERFORMANCE BACKEND OPTIMIZATION
-- Inventory Summary Table + RPC Functions
-- =====================================================

-- Create the inventory_summary table for pre-calculated aggregations
CREATE TABLE IF NOT EXISTS public.inventory_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  brand_name text NOT NULL,
  valve_size text NOT NULL DEFAULT '22mm',
  weight text NOT NULL DEFAULT '12kg',
  count_package integer NOT NULL DEFAULT 0,
  count_refill integer NOT NULL DEFAULT 0,
  count_empty integer NOT NULL DEFAULT 0,
  count_problem integer NOT NULL DEFAULT 0,
  total_full integer GENERATED ALWAYS AS (count_package + count_refill) STORED,
  last_updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(owner_id, brand_name, valve_size, weight)
);

-- Enable RLS
ALTER TABLE public.inventory_summary ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Team members can read own summary
CREATE POLICY "Team members can read own summary"
  ON public.inventory_summary FOR SELECT
  USING (owner_id = get_owner_id());

-- RLS Policy: System can insert/update via trigger
CREATE POLICY "System can manage summary"
  ON public.inventory_summary FOR ALL
  USING (owner_id = get_owner_id())
  WITH CHECK (owner_id = get_owner_id());

-- Create trigger function to auto-sync inventory summary
CREATE OR REPLACE FUNCTION public.sync_inventory_summary()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.inventory_summary (
    owner_id, brand_name, valve_size, weight,
    count_package, count_refill, count_empty, count_problem
  )
  VALUES (
    COALESCE(NEW.owner_id, OLD.owner_id),
    COALESCE(NEW.name, OLD.name),
    COALESCE(NEW.size, OLD.size, '22mm'),
    COALESCE(NEW.weight, OLD.weight, '12kg'),
    COALESCE(NEW.package_cylinder, 0),
    COALESCE(NEW.refill_cylinder, 0),
    COALESCE(NEW.empty_cylinder, 0),
    COALESCE(NEW.problem_cylinder, 0)
  )
  ON CONFLICT (owner_id, brand_name, valve_size, weight)
  DO UPDATE SET
    count_package = COALESCE(NEW.package_cylinder, 0),
    count_refill = COALESCE(NEW.refill_cylinder, 0),
    count_empty = COALESCE(NEW.empty_cylinder, 0),
    count_problem = COALESCE(NEW.problem_cylinder, 0),
    last_updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Attach trigger to lpg_brands table
DROP TRIGGER IF EXISTS trigger_sync_inventory_summary ON public.lpg_brands;
CREATE TRIGGER trigger_sync_inventory_summary
  AFTER INSERT OR UPDATE ON public.lpg_brands
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_inventory_summary();

-- Seed initial data from existing lpg_brands
INSERT INTO public.inventory_summary (
  owner_id, brand_name, valve_size, weight,
  count_package, count_refill, count_empty, count_problem
)
SELECT 
  owner_id, name, size, COALESCE(weight, '12kg'),
  package_cylinder, refill_cylinder, empty_cylinder, problem_cylinder
FROM public.lpg_brands
WHERE is_active = true AND owner_id IS NOT NULL
ON CONFLICT (owner_id, brand_name, valve_size, weight) DO UPDATE SET
  count_package = EXCLUDED.count_package,
  count_refill = EXCLUDED.count_refill,
  count_empty = EXCLUDED.count_empty,
  count_problem = EXCLUDED.count_problem,
  last_updated_at = now();

-- =====================================================
-- RPC FUNCTIONS FOR DASHBOARD AGGREGATIONS
-- =====================================================

-- RPC: Get today's sales total (single number, not raw data)
CREATE OR REPLACE FUNCTION public.get_today_sales_total()
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(total), 0)
  FROM pos_transactions
  WHERE owner_id = get_owner_id()
    AND DATE(created_at) = CURRENT_DATE
    AND is_voided = false;
$$;

-- RPC: Get today's expenses total
CREATE OR REPLACE FUNCTION public.get_today_expenses_total()
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(amount), 0)
  FROM daily_expenses
  WHERE owner_id = get_owner_id()
    AND expense_date = CURRENT_DATE;
$$;

-- RPC: Get inventory totals (pre-aggregated)
CREATE OR REPLACE FUNCTION public.get_inventory_totals()
RETURNS TABLE(
  total_full bigint,
  total_empty bigint,
  total_package bigint,
  total_refill bigint,
  total_problem bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COALESCE(SUM(count_package + count_refill), 0)::bigint as total_full,
    COALESCE(SUM(count_empty), 0)::bigint as total_empty,
    COALESCE(SUM(count_package), 0)::bigint as total_package,
    COALESCE(SUM(count_refill), 0)::bigint as total_refill,
    COALESCE(SUM(count_problem), 0)::bigint as total_problem
  FROM inventory_summary
  WHERE owner_id = get_owner_id();
$$;

-- RPC: Get monthly revenue stats with growth calculation
CREATE OR REPLACE FUNCTION public.get_monthly_revenue_stats()
RETURNS TABLE(
  current_month numeric,
  last_month numeric,
  growth_percent numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH monthly AS (
    SELECT 
      COALESCE(SUM(CASE 
        WHEN DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
        THEN total ELSE 0 
      END), 0) as current_month,
      COALESCE(SUM(CASE 
        WHEN DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
        THEN total ELSE 0 
      END), 0) as last_month
    FROM pos_transactions
    WHERE owner_id = get_owner_id()
      AND is_voided = false
      AND created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
  )
  SELECT 
    current_month,
    last_month,
    CASE 
      WHEN last_month > 0 
      THEN ROUND(((current_month - last_month) / last_month) * 100, 1)
      ELSE 0 
    END as growth_percent
  FROM monthly;
$$;

-- RPC: Get customer stats
CREATE OR REPLACE FUNCTION public.get_customer_stats()
RETURNS TABLE(
  total_customers bigint,
  customers_with_due bigint,
  total_due_amount numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COUNT(*)::bigint as total_customers,
    COUNT(*) FILTER (WHERE total_due > 0)::bigint as customers_with_due,
    COALESCE(SUM(total_due), 0) as total_due_amount
  FROM customers
  WHERE owner_id = get_owner_id();
$$;

-- RPC: Get active orders count
CREATE OR REPLACE FUNCTION public.get_active_orders_count()
RETURNS TABLE(
  pending_count bigint,
  dispatched_count bigint,
  total_active bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COUNT(*) FILTER (WHERE status = 'pending')::bigint as pending_count,
    COUNT(*) FILTER (WHERE status IN ('confirmed', 'dispatched'))::bigint as dispatched_count,
    COUNT(*) FILTER (WHERE status IN ('pending', 'confirmed', 'dispatched'))::bigint as total_active
  FROM community_orders co
  JOIN shop_profiles sp ON sp.id = co.shop_id
  WHERE sp.owner_id = auth.uid();
$$;