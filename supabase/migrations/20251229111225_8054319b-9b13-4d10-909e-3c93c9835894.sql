-- Add authentication check to generate_transaction_number function
CREATE OR REPLACE FUNCTION public.generate_transaction_number()
RETURNS TEXT AS $$
DECLARE
  today_date TEXT;
  daily_count INTEGER;
BEGIN
  -- Check authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  today_date := TO_CHAR(NOW(), 'YYYYMMDD');
  SELECT COUNT(*) + 1 INTO daily_count 
  FROM public.pos_transactions 
  WHERE DATE(created_at) = CURRENT_DATE;
  RETURN 'TXN-' || today_date || '-' || LPAD(daily_count::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add authentication check to generate_order_number function
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT AS $$
DECLARE
  today_date TEXT;
  daily_count INTEGER;
BEGIN
  -- Check authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  today_date := TO_CHAR(NOW(), 'YYYYMMDD');
  SELECT COUNT(*) + 1 INTO daily_count 
  FROM public.orders 
  WHERE DATE(created_at) = CURRENT_DATE;
  RETURN 'ORD-' || today_date || '-' || LPAD(daily_count::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;