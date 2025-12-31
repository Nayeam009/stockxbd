-- ============================================
-- SECURITY FIX: Update RLS Policies for Sensitive Data
-- ============================================

-- 1. Fix staff table - Only admins should read staff data
DROP POLICY IF EXISTS "Authenticated users can read staff" ON public.staff;
CREATE POLICY "Only admins can read staff" 
ON public.staff 
FOR SELECT 
USING (is_admin(auth.uid()));

-- 2. Fix staff_payments table - Only admins should read payment data
DROP POLICY IF EXISTS "Authenticated users can read staff payments" ON public.staff_payments;
CREATE POLICY "Only admins can read staff payments" 
ON public.staff_payments 
FOR SELECT 
USING (is_admin(auth.uid()));

-- 3. Fix daily_expenses table - Only admins should read expenses
DROP POLICY IF EXISTS "Authenticated users can read expenses" ON public.daily_expenses;
CREATE POLICY "Only admins can read expenses" 
ON public.daily_expenses 
FOR SELECT 
USING (is_admin(auth.uid()));

-- 4. Fix vehicle_costs table - Only admins should read vehicle costs
DROP POLICY IF EXISTS "Authenticated users can read vehicle costs" ON public.vehicle_costs;
CREATE POLICY "Only admins can read vehicle costs" 
ON public.vehicle_costs 
FOR SELECT 
USING (is_admin(auth.uid()));

-- 5. Fix vehicles table - Only admins should read vehicles
DROP POLICY IF EXISTS "Authenticated users can read vehicles" ON public.vehicles;
CREATE POLICY "Only admins can read vehicles" 
ON public.vehicles 
FOR SELECT 
USING (is_admin(auth.uid()));

-- 6. Fix orders table - Users can only see orders they created or are assigned to
DROP POLICY IF EXISTS "Authenticated users can read orders" ON public.orders;
CREATE POLICY "Users can read own or assigned orders" 
ON public.orders 
FOR SELECT 
USING (
  auth.uid() = created_by 
  OR auth.uid() = driver_id 
  OR is_admin(auth.uid())
);

-- 7. Fix order_items table - Match orders access
DROP POLICY IF EXISTS "Authenticated users can read order items" ON public.order_items;
CREATE POLICY "Users can read order items for accessible orders" 
ON public.order_items 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_items.order_id 
    AND (orders.created_by = auth.uid() OR orders.driver_id = auth.uid() OR is_admin(auth.uid()))
  )
);

-- 8. Fix cylinder_exchanges - Users can only see their own exchanges or admins see all
DROP POLICY IF EXISTS "Authenticated users can read exchanges" ON public.cylinder_exchanges;
CREATE POLICY "Users can read own exchanges, admins all" 
ON public.cylinder_exchanges 
FOR SELECT 
USING (auth.uid() = user_id OR is_admin(auth.uid()));

-- 9. Fix community_posts - Require authentication to read
DROP POLICY IF EXISTS "Authenticated users can read posts" ON public.community_posts;
CREATE POLICY "Authenticated users can read posts" 
ON public.community_posts 
FOR SELECT 
TO authenticated
USING (is_active = true);

-- 10. Fix community_post_comments - Require authentication
DROP POLICY IF EXISTS "Authenticated users can read comments" ON public.community_post_comments;
CREATE POLICY "Authenticated users can read comments" 
ON public.community_post_comments 
FOR SELECT 
TO authenticated
USING (true);

-- 11. Fix community_post_likes - Require authentication
DROP POLICY IF EXISTS "Authenticated users can read likes" ON public.community_post_likes;
CREATE POLICY "Authenticated users can read likes" 
ON public.community_post_likes 
FOR SELECT 
TO authenticated
USING (true);

-- 12. Fix product_prices - Restrict to authenticated users
DROP POLICY IF EXISTS "Authenticated users can read product prices" ON public.product_prices;
CREATE POLICY "Authenticated users can read product prices" 
ON public.product_prices 
FOR SELECT 
TO authenticated
USING (true);

-- 13. Fix products - Restrict to authenticated users  
DROP POLICY IF EXISTS "Authenticated users can read products" ON public.products;
CREATE POLICY "Authenticated users can read products" 
ON public.products 
FOR SELECT 
TO authenticated
USING (true);

-- 14. Fix lpg_brands - Restrict to authenticated users
DROP POLICY IF EXISTS "Authenticated users can read lpg brands" ON public.lpg_brands;
CREATE POLICY "Authenticated users can read lpg brands" 
ON public.lpg_brands 
FOR SELECT 
TO authenticated
USING (true);

-- 15. Fix stoves - Restrict to authenticated users
DROP POLICY IF EXISTS "Authenticated users can read stoves" ON public.stoves;
CREATE POLICY "Authenticated users can read stoves" 
ON public.stoves 
FOR SELECT 
TO authenticated
USING (true);

-- 16. Fix regulators - Restrict to authenticated users
DROP POLICY IF EXISTS "Authenticated users can read regulators" ON public.regulators;
CREATE POLICY "Authenticated users can read regulators" 
ON public.regulators 
FOR SELECT 
TO authenticated
USING (true);