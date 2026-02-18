
-- Add p_driver_id parameter to complete_pos_sale RPC
-- Pure additive change: DEFAULT NULL ensures all existing callers work unchanged

CREATE OR REPLACE FUNCTION public.complete_pos_sale(
  p_transaction_number text,
  p_customer_id uuid DEFAULT NULL::uuid,
  p_subtotal numeric DEFAULT 0,
  p_discount numeric DEFAULT 0,
  p_total numeric DEFAULT 0,
  p_payment_method payment_method DEFAULT 'cash'::payment_method,
  p_payment_status text DEFAULT 'paid'::text,
  p_notes text DEFAULT NULL::text,
  p_is_online_order boolean DEFAULT false,
  p_community_order_id uuid DEFAULT NULL::uuid,
  p_items jsonb DEFAULT '[]'::jsonb,
  p_return_items jsonb DEFAULT '[]'::jsonb,
  p_remaining_due numeric DEFAULT 0,
  p_driver_id uuid DEFAULT NULL::uuid
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_owner_id UUID;
  v_txn_id UUID;
  v_item JSONB;
  v_brand RECORD;
  v_stove RECORD;
  v_regulator RECORD;
  v_qty INT;
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

  -- ====================================================
  -- PRE-CHECK: Validate stock availability for all items
  -- before touching any rows (prevents silent oversell)
  -- ====================================================
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := (v_item->>'quantity')::INT;
    
    IF (v_item->>'item_type') = 'lpg' AND (v_item->>'brand_id') IS NOT NULL THEN
      SELECT * INTO v_brand FROM lpg_brands 
        WHERE id = (v_item->>'brand_id')::UUID AND owner_id = v_owner_id;
      
      IF NOT FOUND THEN
        RAISE EXCEPTION 'LPG brand not found: %', (v_item->>'brand_id');
      END IF;
      
      IF (v_item->>'cylinder_type') = 'refill' THEN
        IF v_brand.refill_cylinder < v_qty THEN
          RAISE EXCEPTION 'Insufficient stock for % (Refill). Available: %, Requested: %',
            v_brand.name, v_brand.refill_cylinder, v_qty;
        END IF;
      ELSIF (v_item->>'cylinder_type') = 'package' THEN
        IF v_brand.package_cylinder < v_qty THEN
          RAISE EXCEPTION 'Insufficient stock for % (Package). Available: %, Requested: %',
            v_brand.name, v_brand.package_cylinder, v_qty;
        END IF;
      END IF;
    
    ELSIF (v_item->>'item_type') = 'stove' AND (v_item->>'stove_id') IS NOT NULL THEN
      SELECT * INTO v_stove FROM stoves 
        WHERE id = (v_item->>'stove_id')::UUID AND owner_id = v_owner_id;
      IF FOUND AND v_stove.quantity < v_qty THEN
        RAISE EXCEPTION 'Insufficient stock for stove % %. Available: %, Requested: %',
          v_stove.brand, v_stove.model, v_stove.quantity, v_qty;
      END IF;
    
    ELSIF (v_item->>'item_type') = 'regulator' AND (v_item->>'regulator_id') IS NOT NULL THEN
      SELECT * INTO v_regulator FROM regulators 
        WHERE id = (v_item->>'regulator_id')::UUID AND owner_id = v_owner_id;
      IF FOUND AND v_regulator.quantity < v_qty THEN
        RAISE EXCEPTION 'Insufficient stock for regulator % %. Available: %, Requested: %',
          v_regulator.brand, v_regulator.type, v_regulator.quantity, v_qty;
      END IF;
    END IF;
  END LOOP;
  -- ====================================================
  -- END PRE-CHECK
  -- ====================================================
  
  -- 1. Insert POS transaction (now includes driver_id)
  INSERT INTO pos_transactions (
    transaction_number, customer_id, subtotal, discount, total,
    payment_method, payment_status, notes, created_by, owner_id,
    is_online_order, community_order_id, driver_id
  ) VALUES (
    p_transaction_number, p_customer_id, p_subtotal, p_discount, p_total,
    p_payment_method, p_payment_status, p_notes, v_user_id, v_owner_id,
    p_is_online_order, p_community_order_id, p_driver_id
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
          UPDATE lpg_brands SET refill_cylinder = refill_cylinder - (v_item->>'quantity')::INT
          WHERE id = v_brand.id;
        ELSIF (v_item->>'cylinder_type') = 'package' THEN
          UPDATE lpg_brands SET package_cylinder = package_cylinder - (v_item->>'quantity')::INT
          WHERE id = v_brand.id;
        END IF;
      END IF;
    
    ELSIF (v_item->>'item_type') = 'stove' AND (v_item->>'stove_id') IS NOT NULL THEN
      UPDATE stoves SET quantity = quantity - (v_item->>'quantity')::INT, updated_at = now()
      WHERE id = (v_item->>'stove_id')::UUID AND owner_id = v_owner_id;
    
    ELSIF (v_item->>'item_type') = 'regulator' AND (v_item->>'regulator_id') IS NOT NULL THEN
      UPDATE regulators SET quantity = quantity - (v_item->>'quantity')::INT, updated_at = now()
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
$function$;
