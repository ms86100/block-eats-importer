
-- 1. Trust tier config table (Task 2 - Make seller trust badges configurable)
CREATE TABLE public.trust_tier_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_key text UNIQUE NOT NULL,
  tier_label text NOT NULL,
  min_orders integer NOT NULL DEFAULT 0,
  min_rating numeric NOT NULL DEFAULT 0,
  badge_color text NOT NULL DEFAULT 'muted',
  icon_name text NOT NULL DEFAULT 'Shield',
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed default tiers
INSERT INTO public.trust_tier_config (tier_key, tier_label, min_orders, min_rating, badge_color, icon_name, display_order) VALUES
  ('new', 'New Seller', 0, 0, 'muted', 'Shield', 0),
  ('tried', 'Community Tried', 5, 0, 'blue', 'ShieldCheck', 1),
  ('trusted', 'Community Trusted', 50, 0, 'primary', 'Award', 2),
  ('favorite', 'Community Favorite', 100, 4.5, 'amber', 'Crown', 3);

ALTER TABLE public.trust_tier_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read trust tiers" ON public.trust_tier_config FOR SELECT USING (true);

-- 2. RPC to get seller trust tier from DB (Task 2)
CREATE OR REPLACE FUNCTION public.get_seller_trust_tier(_seller_id uuid)
RETURNS TABLE(tier_key text, tier_label text, badge_color text, icon_name text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _orders integer;
  _rating numeric;
BEGIN
  SELECT COALESCE(sp.completed_order_count, 0), COALESCE(sp.rating, 0)
  INTO _orders, _rating
  FROM public.seller_profiles sp WHERE sp.id = _seller_id;

  RETURN QUERY
  SELECT t.tier_key, t.tier_label, t.badge_color, t.icon_name
  FROM public.trust_tier_config t
  WHERE t.is_active = true
    AND _orders >= t.min_orders
    AND _rating >= t.min_rating
  ORDER BY t.display_order DESC
  LIMIT 1;
END;
$$;

-- 3. RPC to check first order with seller (Task 1)
CREATE OR REPLACE FUNCTION public.check_first_order_batch(_buyer_id uuid, _seller_ids uuid[])
RETURNS TABLE(seller_id uuid, is_first_order boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT s.id,
    NOT EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.buyer_id = _buyer_id AND o.seller_id = s.id
        AND o.status IN ('completed', 'delivered', 'ready')
    )
  FROM unnest(_seller_ids) AS s(id);
END;
$$;

-- 4. Trigger to auto-recompute seller stats on order status change (Task 4)
CREATE OR REPLACE FUNCTION public.trigger_recompute_seller_stats()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status IN ('completed', 'cancelled', 'delivered') AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM public.recompute_seller_stats(NEW.seller_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recompute_seller_stats ON public.orders;
CREATE TRIGGER trg_recompute_seller_stats
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_recompute_seller_stats();

-- 5. RPC for society-scoped top products (Task 6)
CREATE OR REPLACE FUNCTION public.get_society_top_products(_society_id uuid, _limit integer DEFAULT 5)
RETURNS TABLE(product_id uuid, product_name text, image_url text, order_count bigint, seller_name text, seller_id uuid, price numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT oi.product_id, p.name, p.image_url, COUNT(*)::bigint AS order_count,
    sp.business_name, p.seller_id, p.price
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  JOIN public.products p ON p.id = oi.product_id
  LEFT JOIN public.seller_profiles sp ON sp.id = p.seller_id
  WHERE o.society_id = _society_id AND o.status NOT IN ('cancelled')
  GROUP BY oi.product_id, p.name, p.image_url, sp.business_name, p.seller_id, p.price
  ORDER BY order_count DESC
  LIMIT _limit;
END;
$$;

-- 6. RPC for trending products by society (Task 8)
CREATE OR REPLACE FUNCTION public.get_trending_products_by_society(_society_id uuid, _limit integer DEFAULT 10)
RETURNS TABLE(
  id uuid, name text, description text, price numeric, image_url text,
  category text, is_veg boolean, is_available boolean, is_bestseller boolean,
  is_recommended boolean, is_urgent boolean, seller_id uuid, created_at timestamptz,
  updated_at timestamptz, approval_status text,
  seller_business_name text, seller_rating numeric, seller_society_id uuid,
  seller_verification_status text, seller_fulfillment_mode text,
  seller_delivery_note text, seller_availability_start time, seller_availability_end time,
  seller_operating_days text[], seller_is_available boolean,
  seller_completed_order_count integer, seller_last_active_at timestamptz,
  order_count bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.name, p.description, p.price, p.image_url,
    p.category::text, p.is_veg, p.is_available, p.is_bestseller,
    p.is_recommended, p.is_urgent, p.seller_id, p.created_at, p.updated_at,
    p.approval_status::text,
    sp.business_name, sp.rating, sp.society_id,
    sp.verification_status::text, sp.fulfillment_mode::text,
    sp.delivery_note, sp.availability_start, sp.availability_end,
    sp.operating_days, sp.is_available,
    sp.completed_order_count, sp.last_active_at,
    COUNT(oi.id)::bigint AS order_count
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  JOIN public.products p ON p.id = oi.product_id
  JOIN public.seller_profiles sp ON sp.id = p.seller_id
  WHERE o.society_id = _society_id
    AND o.status NOT IN ('cancelled')
    AND o.created_at > now() - interval '7 days'
    AND p.is_available = true
    AND p.approval_status = 'approved'
    AND sp.verification_status = 'approved'
  GROUP BY p.id, p.name, p.description, p.price, p.image_url,
    p.category, p.is_veg, p.is_available, p.is_bestseller,
    p.is_recommended, p.is_urgent, p.seller_id, p.created_at, p.updated_at,
    p.approval_status,
    sp.business_name, sp.rating, sp.society_id,
    sp.verification_status, sp.fulfillment_mode,
    sp.delivery_note, sp.availability_start, sp.availability_end,
    sp.operating_days, sp.is_available,
    sp.completed_order_count, sp.last_active_at
  ORDER BY order_count DESC
  LIMIT _limit;
END;
$$;

-- 7. RPC for user frequent products (Task 9)
CREATE OR REPLACE FUNCTION public.get_user_frequent_products(_user_id uuid, _limit integer DEFAULT 12)
RETURNS TABLE(product_id uuid, product_name text, price numeric, image_url text, seller_id uuid, seller_name text, order_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.name, p.price, p.image_url, p.seller_id,
    sp.business_name, COUNT(*)::bigint AS order_count
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  JOIN public.products p ON p.id = oi.product_id
  LEFT JOIN public.seller_profiles sp ON sp.id = p.seller_id
  WHERE o.buyer_id = _user_id AND o.status = 'completed' AND p.is_available = true
  GROUP BY p.id, p.name, p.price, p.image_url, p.seller_id, sp.business_name
  ORDER BY order_count DESC
  LIMIT _limit;
END;
$$;

-- 8. RPC for batch delivery scores (Task 10)
CREATE OR REPLACE FUNCTION public.get_delivery_scores_batch(_seller_ids uuid[])
RETURNS TABLE(seller_id uuid, total_deliveries bigint, on_time_pct numeric, avg_delay_minutes numeric, completion_rate numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT o.seller_id,
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
  WHERE o.seller_id = ANY(_seller_ids)
  GROUP BY o.seller_id;
END;
$$;

-- 9. Payment settlements table (Task 14)
CREATE TABLE public.payment_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.seller_profiles(id),
  order_id uuid NOT NULL REFERENCES public.orders(id),
  gross_amount numeric NOT NULL DEFAULT 0,
  platform_fee numeric NOT NULL DEFAULT 0,
  net_amount numeric NOT NULL DEFAULT 0,
  settlement_status text NOT NULL DEFAULT 'pending',
  settlement_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_settlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sellers can view own settlements" ON public.payment_settlements
  FOR SELECT TO authenticated
  USING (seller_id IN (SELECT id FROM public.seller_profiles WHERE user_id = auth.uid()));
