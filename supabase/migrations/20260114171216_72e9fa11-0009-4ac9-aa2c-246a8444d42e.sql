-- ============================================
-- PHASE 1: Add owner_id and is_demo columns to all main tables
-- ============================================

-- Add columns to lpg_brands
ALTER TABLE public.lpg_brands 
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;

-- Add columns to stoves
ALTER TABLE public.stoves 
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;

-- Add columns to regulators
ALTER TABLE public.regulators 
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;

-- Add columns to customers
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;

-- Add columns to products
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;

-- Add columns to product_prices
ALTER TABLE public.product_prices 
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;

-- Add columns to orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;

-- Add columns to pos_transactions
ALTER TABLE public.pos_transactions 
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;

-- Add columns to daily_expenses
ALTER TABLE public.daily_expenses 
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;

-- Add columns to staff
ALTER TABLE public.staff 
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;

-- Add columns to staff_payments
ALTER TABLE public.staff_payments 
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;

-- Add columns to vehicles
ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;

-- Add columns to vehicle_costs
ALTER TABLE public.vehicle_costs 
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;

-- ============================================
-- PHASE 2: Create Helper Functions
-- ============================================

-- Function to get the owner_id for the current user
CREATE OR REPLACE FUNCTION public.get_owner_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    -- If user is a team member, get their owner's ID
    (SELECT owner_id FROM team_members WHERE member_user_id = auth.uid() LIMIT 1),
    -- Otherwise, if user is an owner, return their own ID
    CASE WHEN EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'owner'
    ) THEN auth.uid() ELSE NULL END
  )
$$;

-- Function to check if a record belongs to the current user's team
CREATE OR REPLACE FUNCTION public.is_same_team(_owner_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _owner_id = public.get_owner_id()
$$;

-- ============================================
-- PHASE 3: Create Trigger Function to auto-set owner_id
-- ============================================

CREATE OR REPLACE FUNCTION public.set_owner_id_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only set owner_id if it's not already set
  IF NEW.owner_id IS NULL THEN
    NEW.owner_id := public.get_owner_id();
  END IF;
  RETURN NEW;
END;
$$;

-- Create triggers for each table
DROP TRIGGER IF EXISTS set_owner_id_lpg_brands ON public.lpg_brands;
CREATE TRIGGER set_owner_id_lpg_brands
  BEFORE INSERT ON public.lpg_brands
  FOR EACH ROW EXECUTE FUNCTION public.set_owner_id_on_insert();

DROP TRIGGER IF EXISTS set_owner_id_stoves ON public.stoves;
CREATE TRIGGER set_owner_id_stoves
  BEFORE INSERT ON public.stoves
  FOR EACH ROW EXECUTE FUNCTION public.set_owner_id_on_insert();

DROP TRIGGER IF EXISTS set_owner_id_regulators ON public.regulators;
CREATE TRIGGER set_owner_id_regulators
  BEFORE INSERT ON public.regulators
  FOR EACH ROW EXECUTE FUNCTION public.set_owner_id_on_insert();

DROP TRIGGER IF EXISTS set_owner_id_customers ON public.customers;
CREATE TRIGGER set_owner_id_customers
  BEFORE INSERT ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_owner_id_on_insert();

DROP TRIGGER IF EXISTS set_owner_id_products ON public.products;
CREATE TRIGGER set_owner_id_products
  BEFORE INSERT ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_owner_id_on_insert();

DROP TRIGGER IF EXISTS set_owner_id_product_prices ON public.product_prices;
CREATE TRIGGER set_owner_id_product_prices
  BEFORE INSERT ON public.product_prices
  FOR EACH ROW EXECUTE FUNCTION public.set_owner_id_on_insert();

DROP TRIGGER IF EXISTS set_owner_id_orders ON public.orders;
CREATE TRIGGER set_owner_id_orders
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_owner_id_on_insert();

DROP TRIGGER IF EXISTS set_owner_id_pos_transactions ON public.pos_transactions;
CREATE TRIGGER set_owner_id_pos_transactions
  BEFORE INSERT ON public.pos_transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_owner_id_on_insert();

DROP TRIGGER IF EXISTS set_owner_id_daily_expenses ON public.daily_expenses;
CREATE TRIGGER set_owner_id_daily_expenses
  BEFORE INSERT ON public.daily_expenses
  FOR EACH ROW EXECUTE FUNCTION public.set_owner_id_on_insert();

DROP TRIGGER IF EXISTS set_owner_id_staff ON public.staff;
CREATE TRIGGER set_owner_id_staff
  BEFORE INSERT ON public.staff
  FOR EACH ROW EXECUTE FUNCTION public.set_owner_id_on_insert();

DROP TRIGGER IF EXISTS set_owner_id_staff_payments ON public.staff_payments;
CREATE TRIGGER set_owner_id_staff_payments
  BEFORE INSERT ON public.staff_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_owner_id_on_insert();

DROP TRIGGER IF EXISTS set_owner_id_vehicles ON public.vehicles;
CREATE TRIGGER set_owner_id_vehicles
  BEFORE INSERT ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.set_owner_id_on_insert();

DROP TRIGGER IF EXISTS set_owner_id_vehicle_costs ON public.vehicle_costs;
CREATE TRIGGER set_owner_id_vehicle_costs
  BEFORE INSERT ON public.vehicle_costs
  FOR EACH ROW EXECUTE FUNCTION public.set_owner_id_on_insert();

-- ============================================
-- PHASE 4: Update RLS Policies for owner scoping
-- ============================================

-- LPG_BRANDS policies
DROP POLICY IF EXISTS "Authenticated users can read lpg brands" ON public.lpg_brands;
CREATE POLICY "Team members can read own lpg brands"
  ON public.lpg_brands FOR SELECT
  USING (owner_id = public.get_owner_id());

DROP POLICY IF EXISTS "Only admins can insert lpg brands" ON public.lpg_brands;
CREATE POLICY "Team admins can insert lpg brands"
  ON public.lpg_brands FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()) AND owner_id = public.get_owner_id());

DROP POLICY IF EXISTS "Only admins can update lpg brands" ON public.lpg_brands;
CREATE POLICY "Team admins can update lpg brands"
  ON public.lpg_brands FOR UPDATE
  USING (public.is_admin(auth.uid()) AND owner_id = public.get_owner_id())
  WITH CHECK (public.is_admin(auth.uid()) AND owner_id = public.get_owner_id());

DROP POLICY IF EXISTS "Only owners can delete lpg brands" ON public.lpg_brands;
CREATE POLICY "Team owners can delete lpg brands"
  ON public.lpg_brands FOR DELETE
  USING (public.has_role(auth.uid(), 'owner') AND owner_id = public.get_owner_id());

-- STOVES policies
DROP POLICY IF EXISTS "Authenticated users can read stoves" ON public.stoves;
CREATE POLICY "Team members can read own stoves"
  ON public.stoves FOR SELECT
  USING (owner_id = public.get_owner_id());

DROP POLICY IF EXISTS "Only admins can insert stoves" ON public.stoves;
CREATE POLICY "Team admins can insert stoves"
  ON public.stoves FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()) AND owner_id = public.get_owner_id());

DROP POLICY IF EXISTS "Only admins can update stoves" ON public.stoves;
CREATE POLICY "Team admins can update stoves"
  ON public.stoves FOR UPDATE
  USING (public.is_admin(auth.uid()) AND owner_id = public.get_owner_id())
  WITH CHECK (public.is_admin(auth.uid()) AND owner_id = public.get_owner_id());

DROP POLICY IF EXISTS "Only owners can delete stoves" ON public.stoves;
CREATE POLICY "Team owners can delete stoves"
  ON public.stoves FOR DELETE
  USING (public.has_role(auth.uid(), 'owner') AND owner_id = public.get_owner_id());

-- REGULATORS policies
DROP POLICY IF EXISTS "Authenticated users can read regulators" ON public.regulators;
CREATE POLICY "Team members can read own regulators"
  ON public.regulators FOR SELECT
  USING (owner_id = public.get_owner_id());

DROP POLICY IF EXISTS "Only admins can insert regulators" ON public.regulators;
CREATE POLICY "Team admins can insert regulators"
  ON public.regulators FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()) AND owner_id = public.get_owner_id());

DROP POLICY IF EXISTS "Only admins can update regulators" ON public.regulators;
CREATE POLICY "Team admins can update regulators"
  ON public.regulators FOR UPDATE
  USING (public.is_admin(auth.uid()) AND owner_id = public.get_owner_id())
  WITH CHECK (public.is_admin(auth.uid()) AND owner_id = public.get_owner_id());

DROP POLICY IF EXISTS "Only owners can delete regulators" ON public.regulators;
CREATE POLICY "Team owners can delete regulators"
  ON public.regulators FOR DELETE
  USING (public.has_role(auth.uid(), 'owner') AND owner_id = public.get_owner_id());

-- CUSTOMERS policies
DROP POLICY IF EXISTS "Only admins can view customers" ON public.customers;
CREATE POLICY "Team members can read own customers"
  ON public.customers FOR SELECT
  USING (owner_id = public.get_owner_id());

DROP POLICY IF EXISTS "Authenticated users can create customers" ON public.customers;
CREATE POLICY "Team members can insert customers"
  ON public.customers FOR INSERT
  WITH CHECK (owner_id = public.get_owner_id());

DROP POLICY IF EXISTS "Only admins can update customers" ON public.customers;
CREATE POLICY "Team admins can update customers"
  ON public.customers FOR UPDATE
  USING (public.is_admin(auth.uid()) AND owner_id = public.get_owner_id())
  WITH CHECK (public.is_admin(auth.uid()) AND owner_id = public.get_owner_id());

DROP POLICY IF EXISTS "Only owners can delete customers" ON public.customers;
CREATE POLICY "Team owners can delete customers"
  ON public.customers FOR DELETE
  USING (public.has_role(auth.uid(), 'owner') AND owner_id = public.get_owner_id());

-- PRODUCTS policies
DROP POLICY IF EXISTS "Authenticated users can read products" ON public.products;
CREATE POLICY "Team members can read own products"
  ON public.products FOR SELECT
  USING (owner_id = public.get_owner_id());

DROP POLICY IF EXISTS "Only admins can insert products" ON public.products;
CREATE POLICY "Team admins can insert products"
  ON public.products FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()) AND owner_id = public.get_owner_id());

DROP POLICY IF EXISTS "Only admins can update products" ON public.products;
CREATE POLICY "Team admins can update products"
  ON public.products FOR UPDATE
  USING (public.is_admin(auth.uid()) AND owner_id = public.get_owner_id())
  WITH CHECK (public.is_admin(auth.uid()) AND owner_id = public.get_owner_id());

DROP POLICY IF EXISTS "Only owners can delete products" ON public.products;
CREATE POLICY "Team owners can delete products"
  ON public.products FOR DELETE
  USING (public.has_role(auth.uid(), 'owner') AND owner_id = public.get_owner_id());

-- PRODUCT_PRICES policies
DROP POLICY IF EXISTS "Authenticated users can read product prices" ON public.product_prices;
CREATE POLICY "Team members can read own product prices"
  ON public.product_prices FOR SELECT
  USING (owner_id = public.get_owner_id());

DROP POLICY IF EXISTS "Only admins can insert product prices" ON public.product_prices;
CREATE POLICY "Team admins can insert product prices"
  ON public.product_prices FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()) AND owner_id = public.get_owner_id());

DROP POLICY IF EXISTS "Only admins can update product prices" ON public.product_prices;
CREATE POLICY "Team admins can update product prices"
  ON public.product_prices FOR UPDATE
  USING (public.is_admin(auth.uid()) AND owner_id = public.get_owner_id())
  WITH CHECK (public.is_admin(auth.uid()) AND owner_id = public.get_owner_id());

DROP POLICY IF EXISTS "Only owners can delete product prices" ON public.product_prices;
CREATE POLICY "Team owners can delete product prices"
  ON public.product_prices FOR DELETE
  USING (public.has_role(auth.uid(), 'owner') AND owner_id = public.get_owner_id());

-- ORDERS policies
DROP POLICY IF EXISTS "Admins can read all orders" ON public.orders;
DROP POLICY IF EXISTS "Drivers can read assigned recent orders" ON public.orders;
CREATE POLICY "Team members can read own orders"
  ON public.orders FOR SELECT
  USING (owner_id = public.get_owner_id());

DROP POLICY IF EXISTS "Authenticated users can create orders" ON public.orders;
CREATE POLICY "Team members can insert orders"
  ON public.orders FOR INSERT
  WITH CHECK (owner_id = public.get_owner_id());

DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
CREATE POLICY "Team admins can update orders"
  ON public.orders FOR UPDATE
  USING (public.is_admin(auth.uid()) AND owner_id = public.get_owner_id())
  WITH CHECK (public.is_admin(auth.uid()) AND owner_id = public.get_owner_id());

DROP POLICY IF EXISTS "Owners can delete orders" ON public.orders;
CREATE POLICY "Team owners can delete orders"
  ON public.orders FOR DELETE
  USING (public.has_role(auth.uid(), 'owner') AND owner_id = public.get_owner_id());

-- POS_TRANSACTIONS policies
DROP POLICY IF EXISTS "Authenticated users can create transactions" ON public.pos_transactions;
DROP POLICY IF EXISTS "Users read own transactions, admins read all" ON public.pos_transactions;
CREATE POLICY "Team members can read own transactions"
  ON public.pos_transactions FOR SELECT
  USING (owner_id = public.get_owner_id());

CREATE POLICY "Team members can insert transactions"
  ON public.pos_transactions FOR INSERT
  WITH CHECK (owner_id = public.get_owner_id());

-- DAILY_EXPENSES policies
DROP POLICY IF EXISTS "Admins can insert daily_expenses with created_by" ON public.daily_expenses;
DROP POLICY IF EXISTS "Admins can view daily_expenses" ON public.daily_expenses;
DROP POLICY IF EXISTS "Only admins can insert expenses" ON public.daily_expenses;
DROP POLICY IF EXISTS "Only admins can read expenses" ON public.daily_expenses;
DROP POLICY IF EXISTS "Only admins can update expenses" ON public.daily_expenses;
DROP POLICY IF EXISTS "Only owners can delete expenses" ON public.daily_expenses;
DROP POLICY IF EXISTS "Owners can delete daily_expenses" ON public.daily_expenses;
DROP POLICY IF EXISTS "Owners can update daily_expenses" ON public.daily_expenses;

CREATE POLICY "Team members can read own expenses"
  ON public.daily_expenses FOR SELECT
  USING (owner_id = public.get_owner_id());

CREATE POLICY "Team admins can insert expenses"
  ON public.daily_expenses FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()) AND owner_id = public.get_owner_id());

CREATE POLICY "Team admins can update expenses"
  ON public.daily_expenses FOR UPDATE
  USING (public.is_admin(auth.uid()) AND owner_id = public.get_owner_id())
  WITH CHECK (public.is_admin(auth.uid()) AND owner_id = public.get_owner_id());

CREATE POLICY "Team owners can delete expenses"
  ON public.daily_expenses FOR DELETE
  USING (public.has_role(auth.uid(), 'owner') AND owner_id = public.get_owner_id());

-- STAFF policies
DROP POLICY IF EXISTS "Only admins can insert staff" ON public.staff;
DROP POLICY IF EXISTS "Only admins can read staff" ON public.staff;
DROP POLICY IF EXISTS "Only admins can update staff" ON public.staff;
DROP POLICY IF EXISTS "Only owners can delete staff" ON public.staff;
DROP POLICY IF EXISTS "Owners can manage staff" ON public.staff;

CREATE POLICY "Team members can read own staff"
  ON public.staff FOR SELECT
  USING (owner_id = public.get_owner_id());

CREATE POLICY "Team admins can insert staff"
  ON public.staff FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()) AND owner_id = public.get_owner_id());

CREATE POLICY "Team admins can update staff"
  ON public.staff FOR UPDATE
  USING (public.is_admin(auth.uid()) AND owner_id = public.get_owner_id())
  WITH CHECK (public.is_admin(auth.uid()) AND owner_id = public.get_owner_id());

CREATE POLICY "Team owners can delete staff"
  ON public.staff FOR DELETE
  USING (public.has_role(auth.uid(), 'owner') AND owner_id = public.get_owner_id());

-- STAFF_PAYMENTS policies
DROP POLICY IF EXISTS "Only admins can insert staff payments" ON public.staff_payments;
DROP POLICY IF EXISTS "Only admins can read staff payments" ON public.staff_payments;
DROP POLICY IF EXISTS "Only admins can update staff payments" ON public.staff_payments;
DROP POLICY IF EXISTS "Only owners can delete staff payments" ON public.staff_payments;
DROP POLICY IF EXISTS "Owners can manage staff_payments" ON public.staff_payments;

CREATE POLICY "Team members can read own staff payments"
  ON public.staff_payments FOR SELECT
  USING (owner_id = public.get_owner_id());

CREATE POLICY "Team admins can insert staff payments"
  ON public.staff_payments FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()) AND owner_id = public.get_owner_id());

CREATE POLICY "Team admins can update staff payments"
  ON public.staff_payments FOR UPDATE
  USING (public.is_admin(auth.uid()) AND owner_id = public.get_owner_id())
  WITH CHECK (public.is_admin(auth.uid()) AND owner_id = public.get_owner_id());

CREATE POLICY "Team owners can delete staff payments"
  ON public.staff_payments FOR DELETE
  USING (public.has_role(auth.uid(), 'owner') AND owner_id = public.get_owner_id());

-- VEHICLES policies
DROP POLICY IF EXISTS "Only admins can insert vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Only admins can read vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Only admins can update vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Only owners can delete vehicles" ON public.vehicles;

CREATE POLICY "Team members can read own vehicles"
  ON public.vehicles FOR SELECT
  USING (owner_id = public.get_owner_id());

CREATE POLICY "Team admins can insert vehicles"
  ON public.vehicles FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()) AND owner_id = public.get_owner_id());

CREATE POLICY "Team admins can update vehicles"
  ON public.vehicles FOR UPDATE
  USING (public.is_admin(auth.uid()) AND owner_id = public.get_owner_id())
  WITH CHECK (public.is_admin(auth.uid()) AND owner_id = public.get_owner_id());

CREATE POLICY "Team owners can delete vehicles"
  ON public.vehicles FOR DELETE
  USING (public.has_role(auth.uid(), 'owner') AND owner_id = public.get_owner_id());

-- VEHICLE_COSTS policies
DROP POLICY IF EXISTS "Only admins can insert vehicle costs" ON public.vehicle_costs;
DROP POLICY IF EXISTS "Only admins can read vehicle costs" ON public.vehicle_costs;
DROP POLICY IF EXISTS "Only admins can update vehicle costs" ON public.vehicle_costs;
DROP POLICY IF EXISTS "Only owners can delete vehicle costs" ON public.vehicle_costs;
DROP POLICY IF EXISTS "Owners can manage vehicle_costs" ON public.vehicle_costs;

CREATE POLICY "Team members can read own vehicle costs"
  ON public.vehicle_costs FOR SELECT
  USING (owner_id = public.get_owner_id());

CREATE POLICY "Team admins can insert vehicle costs"
  ON public.vehicle_costs FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()) AND owner_id = public.get_owner_id());

CREATE POLICY "Team admins can update vehicle costs"
  ON public.vehicle_costs FOR UPDATE
  USING (public.is_admin(auth.uid()) AND owner_id = public.get_owner_id())
  WITH CHECK (public.is_admin(auth.uid()) AND owner_id = public.get_owner_id());

CREATE POLICY "Team owners can delete vehicle costs"
  ON public.vehicle_costs FOR DELETE
  USING (public.has_role(auth.uid(), 'owner') AND owner_id = public.get_owner_id());

-- ============================================
-- PHASE 5: Create Demo Data Seeding Function
-- ============================================

CREATE OR REPLACE FUNCTION public.seed_demo_data(_owner_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert demo LPG brands
  INSERT INTO lpg_brands (name, size, weight, package_cylinder, refill_cylinder, empty_cylinder, color, owner_id, is_demo, created_by)
  VALUES 
    ('Omera', '22mm', '12kg', 5, 10, 3, '#22c55e', _owner_id, true, _owner_id),
    ('Bashundhara', '22mm', '12kg', 8, 15, 2, '#3b82f6', _owner_id, true, _owner_id),
    ('Totalgaz', '20mm', '12kg', 3, 7, 1, '#f59e0b', _owner_id, true, _owner_id),
    ('Jamuna', '22mm', '5.5kg', 4, 8, 2, '#ef4444', _owner_id, true, _owner_id);
  
  -- Insert demo stoves
  INSERT INTO stoves (brand, model, burners, quantity, price, owner_id, is_demo, created_by)
  VALUES 
    ('RFL', 'Economy 2B', 2, 5, 2500, _owner_id, true, _owner_id),
    ('Walton', 'Premium 3B', 3, 3, 4500, _owner_id, true, _owner_id),
    ('Minister', 'Standard 2B', 2, 4, 3000, _owner_id, true, _owner_id);
  
  -- Insert demo regulators
  INSERT INTO regulators (brand, type, quantity, owner_id, is_demo, created_by)
  VALUES 
    ('HP', '22mm', 10, _owner_id, true, _owner_id),
    ('HP', '20mm', 8, _owner_id, true, _owner_id),
    ('Supergas', '22mm', 6, _owner_id, true, _owner_id);
  
  -- Insert demo customers
  INSERT INTO customers (name, phone, address, total_due, cylinders_due, owner_id, is_demo, created_by)
  VALUES 
    ('Demo Restaurant', '01700000001', 'Dhanmondi, Dhaka', 2500, 2, _owner_id, true, _owner_id),
    ('Demo Household', '01700000002', 'Mirpur, Dhaka', 0, 1, _owner_id, true, _owner_id),
    ('Demo Shop', '01700000003', 'Gulshan, Dhaka', 5000, 3, _owner_id, true, _owner_id);
  
  -- Insert demo product prices
  INSERT INTO product_prices (product_type, product_name, size, variant, company_price, distributor_price, retail_price, package_price, owner_id, is_demo, created_by)
  VALUES 
    ('LPG', 'Omera 12kg', '12kg', 'Refill', 950, 1050, 1200, 3500, _owner_id, true, _owner_id),
    ('LPG', 'Bashundhara 12kg', '12kg', 'Refill', 940, 1040, 1180, 3400, _owner_id, true, _owner_id),
    ('LPG', 'Totalgaz 12kg', '12kg', 'Refill', 960, 1060, 1220, 3600, _owner_id, true, _owner_id),
    ('Stove', 'RFL Economy 2B', NULL, '2 Burner', 2000, 2200, 2500, 0, _owner_id, true, _owner_id),
    ('Regulator', 'HP 22mm', '22mm', 'Standard', 350, 400, 500, 0, _owner_id, true, _owner_id);
  
  -- Insert demo staff
  INSERT INTO staff (name, role, phone, salary, owner_id, is_demo, created_by)
  VALUES 
    ('Demo Driver', 'Driver', '01800000001', 15000, _owner_id, true, _owner_id),
    ('Demo Helper', 'Helper', '01800000002', 10000, _owner_id, true, _owner_id);
  
  -- Insert demo vehicles
  INSERT INTO vehicles (name, license_plate, owner_id, is_demo, created_by)
  VALUES 
    ('Demo Truck 1', 'DHA-KA-11-1234', _owner_id, true, _owner_id),
    ('Demo Van', 'DHA-KA-22-5678', _owner_id, true, _owner_id);

END;
$$;

-- ============================================
-- PHASE 6: Create function to delete demo data
-- ============================================

CREATE OR REPLACE FUNCTION public.delete_demo_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _owner_id UUID;
BEGIN
  _owner_id := public.get_owner_id();
  
  IF _owner_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated and part of a team';
  END IF;
  
  -- Only owners can delete demo data
  IF NOT public.has_role(auth.uid(), 'owner') THEN
    RAISE EXCEPTION 'Only owners can delete demo data';
  END IF;
  
  -- Delete demo data from all tables
  DELETE FROM vehicle_costs WHERE owner_id = _owner_id AND is_demo = true;
  DELETE FROM vehicles WHERE owner_id = _owner_id AND is_demo = true;
  DELETE FROM staff_payments WHERE owner_id = _owner_id AND is_demo = true;
  DELETE FROM staff WHERE owner_id = _owner_id AND is_demo = true;
  DELETE FROM daily_expenses WHERE owner_id = _owner_id AND is_demo = true;
  DELETE FROM pos_transactions WHERE owner_id = _owner_id AND is_demo = true;
  DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE owner_id = _owner_id AND is_demo = true);
  DELETE FROM orders WHERE owner_id = _owner_id AND is_demo = true;
  DELETE FROM product_prices WHERE owner_id = _owner_id AND is_demo = true;
  DELETE FROM products WHERE owner_id = _owner_id AND is_demo = true;
  DELETE FROM customers WHERE owner_id = _owner_id AND is_demo = true;
  DELETE FROM regulators WHERE owner_id = _owner_id AND is_demo = true;
  DELETE FROM stoves WHERE owner_id = _owner_id AND is_demo = true;
  DELETE FROM lpg_brands WHERE owner_id = _owner_id AND is_demo = true;
END;
$$;

-- ============================================
-- PHASE 7: Create function to count demo data
-- ============================================

CREATE OR REPLACE FUNCTION public.count_demo_data()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _owner_id UUID;
  _count INTEGER := 0;
BEGIN
  _owner_id := public.get_owner_id();
  
  IF _owner_id IS NULL THEN
    RETURN 0;
  END IF;
  
  SELECT 
    (SELECT COUNT(*) FROM lpg_brands WHERE owner_id = _owner_id AND is_demo = true) +
    (SELECT COUNT(*) FROM stoves WHERE owner_id = _owner_id AND is_demo = true) +
    (SELECT COUNT(*) FROM regulators WHERE owner_id = _owner_id AND is_demo = true) +
    (SELECT COUNT(*) FROM customers WHERE owner_id = _owner_id AND is_demo = true) +
    (SELECT COUNT(*) FROM products WHERE owner_id = _owner_id AND is_demo = true) +
    (SELECT COUNT(*) FROM product_prices WHERE owner_id = _owner_id AND is_demo = true) +
    (SELECT COUNT(*) FROM orders WHERE owner_id = _owner_id AND is_demo = true) +
    (SELECT COUNT(*) FROM staff WHERE owner_id = _owner_id AND is_demo = true) +
    (SELECT COUNT(*) FROM vehicles WHERE owner_id = _owner_id AND is_demo = true)
  INTO _count;
  
  RETURN COALESCE(_count, 0);
END;
$$;

-- ============================================
-- PHASE 8: Migrate existing data (set owner_id = created_by)
-- ============================================

UPDATE lpg_brands SET owner_id = created_by WHERE owner_id IS NULL AND created_by IS NOT NULL;
UPDATE stoves SET owner_id = created_by WHERE owner_id IS NULL AND created_by IS NOT NULL;
UPDATE regulators SET owner_id = created_by WHERE owner_id IS NULL AND created_by IS NOT NULL;
UPDATE customers SET owner_id = created_by WHERE owner_id IS NULL AND created_by IS NOT NULL;
UPDATE products SET owner_id = created_by WHERE owner_id IS NULL AND created_by IS NOT NULL;
UPDATE product_prices SET owner_id = created_by WHERE owner_id IS NULL AND created_by IS NOT NULL;
UPDATE orders SET owner_id = created_by WHERE owner_id IS NULL AND created_by IS NOT NULL;
UPDATE pos_transactions SET owner_id = created_by WHERE owner_id IS NULL AND created_by IS NOT NULL;
UPDATE daily_expenses SET owner_id = created_by WHERE owner_id IS NULL AND created_by IS NOT NULL;
UPDATE staff SET owner_id = created_by WHERE owner_id IS NULL AND created_by IS NOT NULL;
UPDATE staff_payments SET owner_id = created_by WHERE owner_id IS NULL AND created_by IS NOT NULL;
UPDATE vehicles SET owner_id = created_by WHERE owner_id IS NULL AND created_by IS NOT NULL;
UPDATE vehicle_costs SET owner_id = created_by WHERE owner_id IS NULL AND created_by IS NOT NULL;