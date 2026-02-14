
DROP FUNCTION IF EXISTS public.get_active_orders_count();

CREATE OR REPLACE FUNCTION public.get_active_orders_count()
 RETURNS TABLE(pending_count bigint, confirmed_count bigint, dispatched_count bigint, total_active bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    COUNT(*) FILTER (WHERE status = 'pending')::bigint as pending_count,
    COUNT(*) FILTER (WHERE status = 'confirmed')::bigint as confirmed_count,
    COUNT(*) FILTER (WHERE status = 'dispatched')::bigint as dispatched_count,
    COUNT(*) FILTER (WHERE status IN ('pending', 'confirmed', 'dispatched'))::bigint as total_active
  FROM community_orders co
  JOIN shop_profiles sp ON sp.id = co.shop_id
  WHERE sp.owner_id = auth.uid();
$function$;
