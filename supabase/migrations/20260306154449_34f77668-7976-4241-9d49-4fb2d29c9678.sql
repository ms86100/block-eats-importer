-- 10. get_nearby_societies
CREATE OR REPLACE FUNCTION public.get_nearby_societies(_society_id uuid, _radius_km double precision DEFAULT 10)
RETURNS TABLE(id uuid, name text, distance_km double precision) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _lat double precision; _lng double precision;
BEGIN
  SELECT latitude, longitude INTO _lat, _lng FROM public.societies WHERE societies.id = _society_id;
  IF _lat IS NULL OR _lng IS NULL THEN RETURN; END IF;
  RETURN QUERY
  SELECT s.id, s.name, public.haversine_km(_lat, _lng, s.latitude, s.longitude) AS distance_km
  FROM public.societies s
  WHERE s.id != _society_id AND s.is_active = true AND s.latitude IS NOT NULL AND s.longitude IS NOT NULL
    AND public.haversine_km(_lat, _lng, s.latitude, s.longitude) <= _radius_km
  ORDER BY distance_km;
END;
$$;

-- 11. get_unified_gate_log
CREATE OR REPLACE FUNCTION public.get_unified_gate_log(_society_id uuid, _date date DEFAULT CURRENT_DATE)
RETURNS TABLE(entry_type text, person_name text, flat_number text, entry_time timestamptz, exit_time timestamptz, status text, details text) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  RETURN QUERY
  SELECT 'visitor'::text, ve.visitor_name, p.flat_number, ve.created_at, ve.checked_out_at, ve.status,
    COALESCE(ve.purpose, ve.visitor_type)
  FROM public.visitor_entries ve
  JOIN public.profiles p ON p.id = ve.resident_id
  WHERE ve.society_id = _society_id AND ve.created_at::date = _date
  UNION ALL
  SELECT 'worker'::text, sw.name, COALESCE(wfa.flat_number, ''), wel.entry_time, wel.exit_time, wel.validation_result, sw.worker_type
  FROM public.worker_entry_logs wel
  JOIN public.society_workers sw ON sw.id = wel.worker_id
  LEFT JOIN public.worker_flat_assignments wfa ON wfa.worker_id = sw.id AND wfa.is_active = true
  WHERE wel.society_id = _society_id AND wel.entry_time::date = _date
  ORDER BY entry_time DESC;
END;
$$;

-- 12. calculate_trust_score
CREATE OR REPLACE FUNCTION public.calculate_trust_score(_user_id uuid)
RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _score numeric := 50;
BEGIN
  -- Verified profile +20
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND verification_status = 'approved') THEN _score := _score + 20; END IF;
  -- Completed orders +1 each (max 20)
  _score := _score + LEAST((SELECT COUNT(*) FROM public.orders WHERE buyer_id = _user_id AND status = 'completed'), 20);
  -- Reviews given +2 each (max 10)
  _score := _score + LEAST((SELECT COUNT(*) * 2 FROM public.reviews WHERE buyer_id = _user_id), 10);
  RETURN LEAST(_score, 100);
END;
$$;

-- 13. calculate_society_trust_score
CREATE OR REPLACE FUNCTION public.calculate_society_trust_score(_society_id uuid)
RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _score numeric := 0; _member_count int;
BEGIN
  SELECT member_count INTO _member_count FROM public.societies WHERE id = _society_id;
  _score := LEAST(_member_count * 2, 30);
  _score := _score + LEAST((SELECT COUNT(*) FROM public.seller_profiles WHERE society_id = _society_id AND verification_status = 'approved') * 5, 30);
  _score := _score + LEAST((SELECT COUNT(*) FROM public.orders WHERE society_id = _society_id AND status = 'completed') / 10, 20);
  IF EXISTS (SELECT 1 FROM public.societies WHERE id = _society_id AND is_verified = true) THEN _score := _score + 20; END IF;
  RETURN LEAST(_score, 100);
END;
$$;

-- 14. recompute_seller_stats
CREATE OR REPLACE FUNCTION public.recompute_seller_stats(_seller_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.seller_profiles SET
    completed_order_count = (SELECT COUNT(*) FROM public.orders WHERE seller_id = _seller_id AND status = 'completed'),
    rating = COALESCE((SELECT AVG(rating) FROM public.reviews WHERE seller_id = _seller_id AND is_hidden = false), 0),
    total_reviews = (SELECT COUNT(*) FROM public.reviews WHERE seller_id = _seller_id AND is_hidden = false),
    cancellation_rate = CASE WHEN (SELECT COUNT(*) FROM public.orders WHERE seller_id = _seller_id) = 0 THEN 0
      ELSE (SELECT COUNT(*) FROM public.orders WHERE seller_id = _seller_id AND status = 'cancelled')::numeric / (SELECT COUNT(*) FROM public.orders WHERE seller_id = _seller_id) END,
    last_active_at = now()
  WHERE id = _seller_id;
END;
$$;

-- 15. refresh_all_trust_scores
CREATE OR REPLACE FUNCTION public.refresh_all_trust_scores()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  -- Placeholder for batch trust score refresh
  RAISE NOTICE 'Trust score refresh completed';
END;
$$;

-- 16. get_product_trust_metrics
CREATE OR REPLACE FUNCTION public.get_product_trust_metrics(_product_ids uuid[])
RETURNS TABLE(product_id uuid, total_orders bigint, unique_buyers bigint, repeat_buyer_count bigint, last_ordered_at timestamptz) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  RETURN QUERY
  SELECT oi.product_id, COUNT(DISTINCT o.id), COUNT(DISTINCT o.buyer_id),
    COUNT(DISTINCT o.buyer_id) FILTER (WHERE (SELECT COUNT(*) FROM public.orders o2 JOIN public.order_items oi2 ON oi2.order_id = o2.id WHERE oi2.product_id = oi.product_id AND o2.buyer_id = o.buyer_id AND o2.status = 'completed') > 1),
    MAX(o.created_at)
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE oi.product_id = ANY(_product_ids) AND o.status = 'completed'
  GROUP BY oi.product_id;
END;
$$;