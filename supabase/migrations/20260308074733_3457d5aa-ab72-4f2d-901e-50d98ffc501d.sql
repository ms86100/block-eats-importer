
-- Trigger to log price changes (idempotent)
CREATE OR REPLACE FUNCTION public.log_price_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.price IS DISTINCT FROM NEW.price THEN
    INSERT INTO public.price_history (product_id, old_price, new_price)
    VALUES (NEW.id, OLD.price, NEW.price);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_price_change ON public.products;
CREATE TRIGGER trg_log_price_change
  AFTER UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.log_price_change();

-- Delivery reliability function
CREATE OR REPLACE FUNCTION public.get_seller_delivery_score(_seller_id uuid)
RETURNS TABLE(
  total_deliveries bigint,
  on_time_pct numeric,
  avg_delay_minutes numeric,
  completion_rate numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(da.id),
    CASE WHEN COUNT(da.id) = 0 THEN 0
      ELSE ROUND(COUNT(*) FILTER (WHERE da.status = 'delivered' AND (da.eta_minutes IS NULL OR EXTRACT(EPOCH FROM (da.delivered_at - da.assigned_at)) / 60 <= da.eta_minutes * 1.2)) * 100.0 / NULLIF(COUNT(*), 0), 1)
    END,
    COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (da.delivered_at - da.assigned_at)) / 60) FILTER (WHERE da.delivered_at IS NOT NULL), 1), 0),
    CASE WHEN COUNT(da.id) = 0 THEN 0
      ELSE ROUND(COUNT(*) FILTER (WHERE da.status = 'delivered') * 100.0 / NULLIF(COUNT(*), 0), 1)
    END
  FROM public.delivery_assignments da
  JOIN public.orders o ON o.id = da.order_id
  WHERE o.seller_id = _seller_id;
END;
$$;

-- Price stability function
CREATE OR REPLACE FUNCTION public.get_price_stability(_product_id uuid)
RETURNS TABLE(
  days_stable integer,
  price_change numeric,
  direction text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _last_change record;
BEGIN
  SELECT * INTO _last_change
  FROM public.price_history
  WHERE product_id = _product_id
  ORDER BY changed_at DESC LIMIT 1;

  IF _last_change IS NULL THEN
    RETURN QUERY SELECT
      EXTRACT(DAY FROM now() - (SELECT created_at FROM public.products WHERE id = _product_id))::integer,
      0::numeric,
      'stable'::text;
  ELSE
    RETURN QUERY SELECT
      EXTRACT(DAY FROM now() - _last_change.changed_at)::integer,
      ABS(_last_change.new_price - _last_change.old_price),
      CASE WHEN _last_change.new_price > _last_change.old_price THEN 'up'
           WHEN _last_change.new_price < _last_change.old_price THEN 'down'
           ELSE 'stable' END;
  END IF;
END;
$$;

-- Refund tier function
CREATE OR REPLACE FUNCTION public.get_refund_tier(_amount numeric)
RETURNS json LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public'
AS $$
BEGIN
  IF _amount < 200 THEN
    RETURN json_build_object('tier', 'instant', 'label', 'Instant Refund', 'description', 'Processed immediately');
  ELSIF _amount <= 1000 THEN
    RETURN json_build_object('tier', '24h', 'label', '24h Review', 'description', 'Reviewed within 24 hours');
  ELSE
    RETURN json_build_object('tier', 'mediation', 'label', 'Dispute Mediation', 'description', 'Handled by community committee');
  END IF;
END;
$$;
