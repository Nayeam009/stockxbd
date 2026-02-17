
-- ============================================
-- Step 1: Create atomic POS sale RPC function
-- ============================================
CREATE OR REPLACE FUNCTION public.complete_pos_sale(
  p_transaction_number TEXT,
  p_customer_id UUID DEFAULT NULL,
  p_subtotal NUMERIC DEFAULT 0,
  p_discount NUMERIC DEFAULT 0,
  p_total NUMERIC DEFAULT 0,
  p_payment_method payment_method DEFAULT 'cash',
  p_payment_status TEXT DEFAULT 'paid',
  p_notes TEXT DEFAULT NULL,
  p_is_online_order BOOLEAN DEFAULT FALSE,
  p_community_order_id UUID DEFAULT NULL,
  p_items JSONB DEFAULT '[]'::JSONB,
  p_return_items JSONB DEFAULT '[]'::JSONB,
  p_remaining_due NUMERIC DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_owner_id UUID;
  v_txn_id UUID;
  v_item JSONB;
  v_brand RECORD;
  v_stove RECORD;
  v_regulator RECORD;
  v_field TEXT;
  v_current INT;
BEGIN
  -- Auth check
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  IF NOT public.is_admin(v_user_id) THEN
    RAISE EXCEPTION 'Only administrators can complete sales';
  END IF;
  
  v_owner_id := public.get_owner_id();
  
  -- 1. Insert POS transaction
  INSERT INTO pos_transactions (
    transaction_number, customer_id, subtotal, discount, total,
    payment_method, payment_status, notes, created_by, owner_id,
    is_online_order, community_order_id
  ) VALUES (
    p_transaction_number, p_customer_id, p_subtotal, p_discount, p_total,
    p_payment_method, p_payment_status, p_notes, v_user_id, v_owner_id,
    p_is_online_order, p_community_order_id
  ) RETURNING id INTO v_txn_id;
  
  -- 2. Insert transaction items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO pos_transaction_items (
      transaction_id, product_id, product_name, quantity, unit_price, total_price, created_by
    ) VALUES (
      v_txn_id,
      CASE WHEN (v_item->>'product_id') IS NOT NULL AND (v_item->>'product_id') != '' 
           THEN (v_item->>'product_id')::UUID ELSE NULL END,
      v_item->>'product_name',
      (v_item->>'quantity')::INT,
      (v_item->>'unit_price')::NUMERIC,
      (v_item->>'total_price')::NUMERIC,
      v_user_id
    );
    
    -- 3. Update inventory based on item type
    IF (v_item->>'item_type') = 'lpg' AND (v_item->>'brand_id') IS NOT NULL THEN
      SELECT * INTO v_brand FROM lpg_brands WHERE id = (v_item->>'brand_id')::UUID AND owner_id = v_owner_id;
      IF FOUND THEN
        IF (v_item->>'cylinder_type') = 'refill' THEN
          UPDATE lpg_brands SET refill_cylinder = GREATEST(0, refill_cylinder - (v_item->>'quantity')::INT)
          WHERE id = v_brand.id;
        ELSIF (v_item->>'cylinder_type') = 'package' THEN
          UPDATE lpg_brands SET package_cylinder = GREATEST(0, package_cylinder - (v_item->>'quantity')::INT)
          WHERE id = v_brand.id;
        END IF;
      END IF;
    
    ELSIF (v_item->>'item_type') = 'stove' AND (v_item->>'stove_id') IS NOT NULL THEN
      UPDATE stoves SET quantity = GREATEST(0, quantity - (v_item->>'quantity')::INT), updated_at = now()
      WHERE id = (v_item->>'stove_id')::UUID AND owner_id = v_owner_id;
    
    ELSIF (v_item->>'item_type') = 'regulator' AND (v_item->>'regulator_id') IS NOT NULL THEN
      UPDATE regulators SET quantity = GREATEST(0, quantity - (v_item->>'quantity')::INT), updated_at = now()
      WHERE id = (v_item->>'regulator_id')::UUID AND owner_id = v_owner_id;
    END IF;
  END LOOP;
  
  -- 4. Process return cylinders
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_return_items)
  LOOP
    SELECT * INTO v_brand FROM lpg_brands WHERE id = (v_item->>'brand_id')::UUID AND owner_id = v_owner_id;
    IF FOUND THEN
      IF (v_item->>'is_leaked')::BOOLEAN THEN
        UPDATE lpg_brands SET problem_cylinder = problem_cylinder + (v_item->>'quantity')::INT WHERE id = v_brand.id;
      ELSE
        UPDATE lpg_brands SET empty_cylinder = empty_cylinder + (v_item->>'quantity')::INT WHERE id = v_brand.id;
      END IF;
    END IF;
  END LOOP;
  
  -- 5. Update customer dues if credit sale
  IF p_customer_id IS NOT NULL AND p_remaining_due > 0 THEN
    UPDATE customers SET
      total_due = COALESCE(total_due, 0) + p_remaining_due,
      billing_status = 'pending',
      last_order_date = now()
    WHERE id = p_customer_id AND owner_id = v_owner_id;
  ELSIF p_customer_id IS NOT NULL THEN
    UPDATE customers SET last_order_date = now()
    WHERE id = p_customer_id AND owner_id = v_owner_id;
  END IF;
  
  RETURN v_txn_id;
END;
$$;

-- ============================================
-- Step 3: Clean up duplicate RLS on customer_payments
-- ============================================
DROP POLICY IF EXISTS "Admins can insert customer_payments" ON customer_payments;
DROP POLICY IF EXISTS "Admins can view customer_payments" ON customer_payments;
DROP POLICY IF EXISTS "Owners can delete customer_payments" ON customer_payments;
DROP POLICY IF EXISTS "Owners can update customer_payments" ON customer_payments;

-- ============================================
-- Step 4: Tighten customer_payments RLS with owner scoping
-- ============================================
DROP POLICY IF EXISTS "Admins can read customer payments" ON customer_payments;
CREATE POLICY "Admins can read customer payments" ON customer_payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = customer_payments.customer_id
        AND c.owner_id = get_owner_id()
    )
  );

DROP POLICY IF EXISTS "Admins can insert customer payments" ON customer_payments;
CREATE POLICY "Admins can insert customer payments" ON customer_payments
  FOR INSERT WITH CHECK (
    is_admin(auth.uid()) AND EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = customer_payments.customer_id
        AND c.owner_id = get_owner_id()
    )
  );

DROP POLICY IF EXISTS "Admins can update customer payments" ON customer_payments;
CREATE POLICY "Admins can update customer payments" ON customer_payments
  FOR UPDATE USING (
    is_admin(auth.uid()) AND EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = customer_payments.customer_id
        AND c.owner_id = get_owner_id()
    )
  );

DROP POLICY IF EXISTS "Owners can delete customer payments" ON customer_payments;
CREATE POLICY "Owners can delete customer payments" ON customer_payments
  FOR DELETE USING (
    has_role(auth.uid(), 'owner') AND EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = customer_payments.customer_id
        AND c.owner_id = get_owner_id()
    )
  );
