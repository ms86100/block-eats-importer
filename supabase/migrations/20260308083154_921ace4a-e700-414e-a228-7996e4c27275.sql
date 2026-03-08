
-- Task 1: Drop and recreate get_seller_trust_snapshot with cancelled_orders
DROP FUNCTION IF EXISTS public.get_seller_trust_snapshot(uuid);

CREATE OR REPLACE FUNCTION public.get_seller_trust_snapshot(_seller_id uuid)
 RETURNS TABLE(completed_orders bigint, cancelled_orders bigint, unique_customers bigint, repeat_customer_pct numeric, avg_response_min numeric, recent_order_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM public.orders WHERE seller_id = _seller_id AND status = 'completed'),
    (SELECT COUNT(*) FROM public.orders WHERE seller_id = _seller_id AND status = 'cancelled'),
    (SELECT COUNT(DISTINCT buyer_id) FROM public.orders WHERE seller_id = _seller_id AND status = 'completed'),
    CASE WHEN (SELECT COUNT(DISTINCT buyer_id) FROM public.orders WHERE seller_id = _seller_id AND status = 'completed') = 0 THEN 0
      ELSE (SELECT COUNT(DISTINCT buyer_id) FILTER (WHERE cnt > 1) * 100.0 / COUNT(DISTINCT buyer_id) FROM (SELECT buyer_id, COUNT(*) as cnt FROM public.orders WHERE seller_id = _seller_id AND status = 'completed' GROUP BY buyer_id) sub) END,
    COALESCE((SELECT sp.avg_response_minutes FROM public.seller_profiles sp WHERE sp.id = _seller_id), 0),
    (SELECT COUNT(*) FROM public.orders WHERE seller_id = _seller_id AND status = 'completed' AND created_at > now() - interval '30 days');
END;
$function$;

-- Task 3: Add growth columns to trust_tier_config
ALTER TABLE public.trust_tier_config ADD COLUMN IF NOT EXISTS growth_label text;
ALTER TABLE public.trust_tier_config ADD COLUMN IF NOT EXISTS growth_icon text;

-- Task 5: Create RPC for search suggestions aggregation
CREATE OR REPLACE FUNCTION public.get_society_search_suggestions(_society_id uuid, _limit integer DEFAULT 8)
 RETURNS TABLE(term text, count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT LOWER(TRIM(sdl.search_term)) AS term, COUNT(*) AS count
  FROM public.search_demand_log sdl
  WHERE sdl.society_id = _society_id
    AND sdl.created_at > now() - interval '14 days'
    AND LENGTH(TRIM(sdl.search_term)) >= 2
  GROUP BY LOWER(TRIM(sdl.search_term))
  HAVING COUNT(*) >= 2
  ORDER BY count DESC
  LIMIT _limit;
END;
$function$;

-- Task 6: Implement refresh_all_trust_scores
CREATE OR REPLACE FUNCTION public.refresh_all_trust_scores()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.seller_profiles sp SET trust_score = (
    0.4 * (1 - COALESCE(sp.cancellation_rate, 0))
    + 0.3 * COALESCE(sp.repeat_customer_pct, 0) / 100.0
    + 0.2 * COALESCE(sp.on_time_delivery_pct, 0) / 100.0
    + 0.1 * LEAST(COALESCE(sp.rating, 0) / 5.0, 1)
  ) * 100
  WHERE sp.verification_status = 'approved';
END;
$function$;

-- Task 3: Drop and recreate get_seller_trust_tier with growth columns
DROP FUNCTION IF EXISTS public.get_seller_trust_tier(uuid);

CREATE OR REPLACE FUNCTION public.get_seller_trust_tier(_seller_id uuid)
 RETURNS TABLE(tier_key text, tier_label text, badge_color text, icon_name text, growth_label text, growth_icon text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _orders integer;
  _rating numeric;
BEGIN
  SELECT COALESCE(sp.completed_order_count, 0), COALESCE(sp.rating, 0)
  INTO _orders, _rating
  FROM public.seller_profiles sp WHERE sp.id = _seller_id;

  RETURN QUERY
  SELECT t.tier_key, t.tier_label, t.badge_color, t.icon_name, t.growth_label, t.growth_icon
  FROM public.trust_tier_config t
  WHERE t.is_active = true
    AND _orders >= t.min_orders
    AND _rating >= t.min_rating
  ORDER BY t.display_order DESC
  LIMIT 1;
END;
$function$;

-- Task 8: Settlement trigger on order delivery
CREATE OR REPLACE FUNCTION public.create_settlement_on_delivery()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _gross numeric;
  _fee_pct numeric;
  _platform_fee numeric;
BEGIN
  IF NEW.status = 'delivered' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    _gross := COALESCE(NEW.total_amount, 0);
    
    SELECT COALESCE(NULLIF(value, '')::numeric, 0) INTO _fee_pct
    FROM public.system_settings WHERE key = 'platform_fee_percent';
    
    IF _fee_pct IS NULL THEN _fee_pct := 0; END IF;
    
    _platform_fee := ROUND(_gross * _fee_pct / 100, 2);
    
    INSERT INTO public.payment_settlements (seller_id, order_id, gross_amount, platform_fee, net_amount, settlement_status)
    VALUES (NEW.seller_id, NEW.id, _gross, _platform_fee, _gross - _platform_fee, 'pending')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_create_settlement_on_delivery ON public.orders;
CREATE TRIGGER trg_create_settlement_on_delivery
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.create_settlement_on_delivery();
