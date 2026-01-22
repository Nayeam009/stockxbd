-- Fix function search path issues for newly created functions
CREATE OR REPLACE FUNCTION public.generate_community_order_number()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.order_number := 'LPG-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || SUBSTRING(NEW.id::TEXT, 1, 6);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_shop_stats_on_order()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
    UPDATE public.shop_profiles 
    SET total_orders = total_orders + 1, updated_at = NOW()
    WHERE id = NEW.shop_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_shop_rating_on_review()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.shop_profiles 
  SET 
    rating = (SELECT AVG(rating)::DECIMAL(3,2) FROM public.shop_reviews WHERE shop_id = NEW.shop_id),
    total_reviews = (SELECT COUNT(*) FROM public.shop_reviews WHERE shop_id = NEW.shop_id),
    updated_at = NOW()
  WHERE id = NEW.shop_id;
  RETURN NEW;
END;
$$;