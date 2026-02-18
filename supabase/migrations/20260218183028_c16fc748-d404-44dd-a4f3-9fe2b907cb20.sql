
CREATE OR REPLACE FUNCTION public.get_monthly_revenue_stats()
 RETURNS TABLE(current_month numeric, last_month numeric, growth_percent numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH pos_revenue AS (
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
  ),
  payment_revenue AS (
    SELECT 
      COALESCE(SUM(CASE 
        WHEN DATE_TRUNC('month', cp.payment_date) = DATE_TRUNC('month', CURRENT_DATE)
        THEN cp.amount ELSE 0 
      END), 0) as current_month,
      COALESCE(SUM(CASE 
        WHEN DATE_TRUNC('month', cp.payment_date) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
        THEN cp.amount ELSE 0 
      END), 0) as last_month
    FROM customer_payments cp
    JOIN customers c ON c.id = cp.customer_id
    WHERE c.owner_id = get_owner_id()
      AND cp.payment_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
  )
  SELECT 
    (p.current_month + r.current_month) AS current_month,
    (p.last_month + r.last_month) AS last_month,
    CASE 
      WHEN (p.last_month + r.last_month) > 0 
      THEN ROUND((((p.current_month + r.current_month) - (p.last_month + r.last_month)) / (p.last_month + r.last_month)) * 100, 1)
      ELSE 0 
    END as growth_percent
  FROM pos_revenue p, payment_revenue r;
$function$
