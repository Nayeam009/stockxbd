
CREATE OR REPLACE FUNCTION public.get_today_sales_total()
RETURNS numeric
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(pos_total, 0) + COALESCE(payment_total, 0)
  FROM (
    SELECT
      (SELECT SUM(total)
       FROM pos_transactions
       WHERE owner_id = get_owner_id()
         AND DATE(created_at) = CURRENT_DATE
         AND is_voided = false) AS pos_total,
      (SELECT SUM(cp.amount)
       FROM customer_payments cp
       JOIN customers c ON c.id = cp.customer_id
       WHERE c.owner_id = get_owner_id()
         AND DATE(cp.payment_date) = CURRENT_DATE) AS payment_total
  ) sub;
$$;
