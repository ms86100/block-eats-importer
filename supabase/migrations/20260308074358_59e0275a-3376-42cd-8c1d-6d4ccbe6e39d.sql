
-- Seller recommendations table
CREATE TABLE public.seller_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  recommender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(seller_id, recommender_id)
);

ALTER TABLE public.seller_recommendations ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read recommendations
CREATE POLICY "Authenticated users can read recommendations"
  ON public.seller_recommendations FOR SELECT TO authenticated USING (true);

-- Users can insert their own recommendations
CREATE POLICY "Users can recommend sellers"
  ON public.seller_recommendations FOR INSERT TO authenticated
  WITH CHECK (recommender_id = auth.uid());

-- Users can delete their own recommendations
CREATE POLICY "Users can remove own recommendations"
  ON public.seller_recommendations FOR DELETE TO authenticated
  USING (recommender_id = auth.uid());

-- Function to get recommendation count and sample recommenders for a seller
CREATE OR REPLACE FUNCTION public.get_seller_recommendations(_seller_id uuid)
RETURNS TABLE(total_count bigint, recommenders json)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*),
    COALESCE(
      (SELECT json_agg(json_build_object('name', p.name, 'flat_number', p.flat_number, 'block', p.block))
       FROM (SELECT sr.recommender_id FROM public.seller_recommendations sr WHERE sr.seller_id = _seller_id ORDER BY sr.created_at DESC LIMIT 5) recent
       JOIN public.profiles p ON p.id = recent.recommender_id),
      '[]'::json
    )
  FROM public.seller_recommendations sr
  WHERE sr.seller_id = _seller_id;
END;
$$;
