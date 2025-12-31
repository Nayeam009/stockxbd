-- Security improvements: Strengthen RLS policies for sensitive tables

-- 1. Update team_invites to require authentication for validation
DROP POLICY IF EXISTS "Anyone can validate unexpired invites" ON public.team_invites;

CREATE POLICY "Authenticated users can validate unexpired invites" 
ON public.team_invites 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND 
  used_at IS NULL AND 
  expires_at > now()
);

-- 2. Restrict staff salary data to owners only (not managers)
DROP POLICY IF EXISTS "Admins can manage staff" ON public.staff;

CREATE POLICY "Owners can manage staff" 
ON public.staff 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'owner'
  )
);

-- 3. Restrict staff_payments to owners only
DROP POLICY IF EXISTS "Admins can manage staff_payments" ON public.staff_payments;

CREATE POLICY "Owners can manage staff_payments" 
ON public.staff_payments 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'owner'
  )
);

-- 4. Restrict customer financial data (customer_payments) to owner and manager with created_by check
DROP POLICY IF EXISTS "Admins can manage customer_payments" ON public.customer_payments;

CREATE POLICY "Admins can view customer_payments" 
ON public.customer_payments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
  )
);

CREATE POLICY "Admins can insert customer_payments" 
ON public.customer_payments 
FOR INSERT 
WITH CHECK (
  auth.uid()::text = created_by::text AND
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
  )
);

CREATE POLICY "Owners can update customer_payments" 
ON public.customer_payments 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'owner'
  )
);

CREATE POLICY "Owners can delete customer_payments" 
ON public.customer_payments 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'owner'
  )
);

-- 5. Restrict daily_expenses to owner and manager with created_by validation
DROP POLICY IF EXISTS "Admins can manage daily_expenses" ON public.daily_expenses;

CREATE POLICY "Admins can view daily_expenses" 
ON public.daily_expenses 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
  )
);

CREATE POLICY "Admins can insert daily_expenses with created_by" 
ON public.daily_expenses 
FOR INSERT 
WITH CHECK (
  auth.uid()::text = created_by::text AND
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
  )
);

CREATE POLICY "Owners can update daily_expenses" 
ON public.daily_expenses 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'owner'
  )
);

CREATE POLICY "Owners can delete daily_expenses" 
ON public.daily_expenses 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'owner'
  )
);

-- 6. Restrict vehicle_costs to owners only for sensitive financial data
DROP POLICY IF EXISTS "Admins can manage vehicle_costs" ON public.vehicle_costs;

CREATE POLICY "Owners can manage vehicle_costs" 
ON public.vehicle_costs 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'owner'
  )
);

-- 7. Add time-based restriction for driver access to orders (drivers can only see recent assigned orders)
DROP POLICY IF EXISTS "Users can read own or assigned orders" ON public.orders;

CREATE POLICY "Admins can read all orders" 
ON public.orders 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
  )
);

CREATE POLICY "Drivers can read assigned recent orders" 
ON public.orders 
FOR SELECT 
USING (
  driver_id::text = auth.uid()::text AND 
  created_at > now() - interval '7 days'
);