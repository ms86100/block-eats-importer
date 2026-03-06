-- Haversine distance function
CREATE OR REPLACE FUNCTION public.haversine_km(lat1 double precision, lon1 double precision, lat2 double precision, lon2 double precision)
RETURNS double precision
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 6371 * 2 * asin(sqrt(
    sin(radians(lat2 - lat1) / 2) ^ 2 +
    cos(radians(lat1)) * cos(radians(lat2)) * sin(radians(lon2 - lon1) / 2) ^ 2
  ))
$$;

-- Accept worker job function
CREATE OR REPLACE FUNCTION public.accept_worker_job(_job_id uuid, _worker_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.worker_job_requests
  SET status = 'accepted', assigned_worker_id = _worker_id, accepted_at = now(), updated_at = now()
  WHERE id = _job_id AND status = 'open';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job request not found or already accepted';
  END IF;
END;
$$;

-- Search marketplace function
CREATE OR REPLACE FUNCTION public.search_marketplace(_query text, _society_id uuid DEFAULT NULL, _limit int DEFAULT 20, _offset int DEFAULT 0)
RETURNS TABLE(id uuid, name text, price numeric, image_url text, seller_id uuid, business_name text, category text, listing_type text, relevance real)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.name, p.price, p.image_url, p.seller_id, sp.business_name, p.category::text, p.listing_type, 
    ts_rank(to_tsvector('english', coalesce(p.name,'') || ' ' || coalesce(p.description,'') || ' ' || coalesce(sp.business_name,'')), plainto_tsquery('english', _query)) AS relevance
  FROM public.products p
  JOIN public.seller_profiles sp ON sp.id = p.seller_id
  WHERE p.is_available = true
    AND sp.verification_status = 'approved'
    AND (_society_id IS NULL OR sp.society_id = _society_id)
    AND (to_tsvector('english', coalesce(p.name,'') || ' ' || coalesce(p.description,'') || ' ' || coalesce(sp.business_name,'')) @@ plainto_tsquery('english', _query))
  ORDER BY relevance DESC
  LIMIT _limit OFFSET _offset;
END;
$$;

-- Transaction audit trail view
CREATE OR REPLACE VIEW public.transaction_audit_trail AS
SELECT 
  o.id AS order_id,
  o.created_at AS order_date,
  o.status AS order_status,
  o.total_amount,
  o.payment_type,
  o.payment_status,
  o.society_id,
  o.buyer_id,
  o.seller_id,
  bp.name AS buyer_name,
  sp.business_name AS seller_name,
  pr.transaction_reference,
  pr.platform_fee,
  pr.net_amount
FROM public.orders o
LEFT JOIN public.profiles bp ON bp.id = o.buyer_id
LEFT JOIN public.seller_profiles sp ON sp.id = o.seller_id
LEFT JOIN public.payment_records pr ON pr.order_id = o.id;