
CREATE TABLE public.session_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.service_bookings(id) ON DELETE CASCADE NOT NULL,
  buyer_id UUID NOT NULL,
  rating INTEGER NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(booking_id, buyer_id)
);

-- Validation trigger instead of CHECK constraint
CREATE OR REPLACE FUNCTION public.validate_session_feedback_rating()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_session_feedback_rating
  BEFORE INSERT OR UPDATE ON public.session_feedback
  FOR EACH ROW EXECUTE FUNCTION public.validate_session_feedback_rating();

ALTER TABLE public.session_feedback ENABLE ROW LEVEL SECURITY;

-- Buyer can read own feedback
CREATE POLICY "Buyers can read own feedback"
  ON public.session_feedback FOR SELECT
  TO authenticated
  USING (buyer_id = auth.uid());

-- Buyer can insert own feedback
CREATE POLICY "Buyers can insert own feedback"
  ON public.session_feedback FOR INSERT
  TO authenticated
  WITH CHECK (buyer_id = auth.uid());

-- Seller can read feedback for their bookings
CREATE POLICY "Sellers can read feedback for their bookings"
  ON public.session_feedback FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.service_bookings sb
      JOIN public.seller_profiles sp ON sp.id = sb.seller_id
      WHERE sb.id = session_feedback.booking_id
        AND sp.user_id = auth.uid()
    )
  );
