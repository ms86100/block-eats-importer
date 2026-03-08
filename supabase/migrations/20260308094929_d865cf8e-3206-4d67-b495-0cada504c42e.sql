-- Fix 1: Recreate get_unmet_demand to use correct column names
CREATE OR REPLACE FUNCTION public.get_unmet_demand(_society_id uuid, _seller_categories text[] DEFAULT NULL)
RETURNS TABLE(search_term text, search_count bigint, last_searched timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT sdl.search_term, COUNT(*)::bigint, MAX(sdl.searched_at)
  FROM public.search_demand_log sdl
  WHERE sdl.society_id = _society_id
  GROUP BY sdl.search_term
  ORDER BY COUNT(*) DESC LIMIT 20;
END;
$$;

-- Fix 2: Add missing foreign keys on service_bookings (buyer_id and seller_id only)
ALTER TABLE public.service_bookings
  ADD CONSTRAINT service_bookings_buyer_id_fkey
  FOREIGN KEY (buyer_id) REFERENCES public.profiles(id);

ALTER TABLE public.service_bookings
  ADD CONSTRAINT service_bookings_seller_id_fkey
  FOREIGN KEY (seller_id) REFERENCES public.seller_profiles(id);