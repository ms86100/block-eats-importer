
-- =============================================================
-- Phase 1: Service Booking Infrastructure
-- Tables: service_listings, service_availability_schedules, service_slots, service_bookings
-- =============================================================

-- 1. service_listings - extends products for service-specific metadata
CREATE TABLE public.service_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  service_type text NOT NULL DEFAULT 'scheduled' CHECK (service_type IN ('scheduled', 'on_demand', 'group', 'recurring')),
  location_type text NOT NULL DEFAULT 'at_seller' CHECK (location_type IN ('home_visit', 'at_seller', 'online')),
  duration_minutes int NOT NULL DEFAULT 60,
  buffer_minutes int NOT NULL DEFAULT 0,
  max_bookings_per_slot int NOT NULL DEFAULT 1,
  price_model text NOT NULL DEFAULT 'fixed' CHECK (price_model IN ('fixed', 'hourly', 'tiered')),
  cancellation_notice_hours int NOT NULL DEFAULT 24,
  rescheduling_notice_hours int NOT NULL DEFAULT 12,
  cancellation_fee_percentage numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id)
);

CREATE TRIGGER set_service_listings_updated_at
  BEFORE UPDATE ON public.service_listings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.service_listings ENABLE ROW LEVEL SECURITY;

-- Read: authenticated users
CREATE POLICY "service_listings_select" ON public.service_listings
  FOR SELECT TO authenticated USING (true);

-- Insert/Update: seller who owns the product or admin
CREATE POLICY "service_listings_insert" ON public.service_listings
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products p
      JOIN public.seller_profiles sp ON sp.id = p.seller_id
      WHERE p.id = product_id AND (sp.user_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

CREATE POLICY "service_listings_update" ON public.service_listings
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      JOIN public.seller_profiles sp ON sp.id = p.seller_id
      WHERE p.id = product_id AND (sp.user_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

CREATE POLICY "service_listings_delete" ON public.service_listings
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      JOIN public.seller_profiles sp ON sp.id = p.seller_id
      WHERE p.id = product_id AND (sp.user_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

-- 2. service_availability_schedules - weekly schedule per service/seller
CREATE TABLE public.service_availability_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  day_of_week int NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(seller_id, product_id, day_of_week)
);

ALTER TABLE public.service_availability_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sas_select" ON public.service_availability_schedules
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "sas_insert" ON public.service_availability_schedules
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.seller_profiles sp
      WHERE sp.id = seller_id AND (sp.user_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

CREATE POLICY "sas_update" ON public.service_availability_schedules
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.seller_profiles sp
      WHERE sp.id = seller_id AND (sp.user_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

CREATE POLICY "sas_delete" ON public.service_availability_schedules
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.seller_profiles sp
      WHERE sp.id = seller_id AND (sp.user_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

-- 3. service_slots - pre-generated concrete slots
CREATE TABLE public.service_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  slot_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  max_capacity int NOT NULL DEFAULT 1,
  booked_count int NOT NULL DEFAULT 0,
  is_blocked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, slot_date, start_time)
);

ALTER TABLE public.service_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "slots_select" ON public.service_slots
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "slots_modify" ON public.service_slots
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.seller_profiles sp
      WHERE sp.id = seller_id AND (sp.user_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

-- 4. service_bookings - links orders to specific slots
CREATE TABLE public.service_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  slot_id uuid NOT NULL REFERENCES public.service_slots(id),
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id),
  booking_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  location_type text NOT NULL DEFAULT 'at_seller',
  buyer_address text,
  status text NOT NULL DEFAULT 'confirmed',
  rescheduled_from uuid REFERENCES public.service_bookings(id),
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_service_bookings_updated_at
  BEFORE UPDATE ON public.service_bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.service_bookings ENABLE ROW LEVEL SECURITY;

-- Buyer reads own
CREATE POLICY "sb_buyer_select" ON public.service_bookings
  FOR SELECT TO authenticated
  USING (buyer_id = auth.uid());

-- Seller reads own
CREATE POLICY "sb_seller_select" ON public.service_bookings
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.seller_profiles sp
      WHERE sp.id = seller_id AND sp.user_id = auth.uid()
    )
  );

-- Admin reads all
CREATE POLICY "sb_admin_select" ON public.service_bookings
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- Insert: authenticated (buyer creating booking)
CREATE POLICY "sb_insert" ON public.service_bookings
  FOR INSERT TO authenticated
  WITH CHECK (buyer_id = auth.uid());

-- Update: buyer or seller or admin
CREATE POLICY "sb_update" ON public.service_bookings
  FOR UPDATE TO authenticated
  USING (
    buyer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.seller_profiles sp WHERE sp.id = seller_id AND sp.user_id = auth.uid())
    OR public.is_admin(auth.uid())
  );

-- 5. Add service booking status flow for all service parent groups
-- transaction_type = 'service_booking' for the new appointment lifecycle
INSERT INTO public.category_status_flows (parent_group, transaction_type, status_key, sort_order, actor, is_terminal) VALUES
  -- home_services
  ('home_services', 'service_booking', 'requested', 10, 'buyer', false),
  ('home_services', 'service_booking', 'confirmed', 20, 'seller', false),
  ('home_services', 'service_booking', 'scheduled', 30, 'seller', false),
  ('home_services', 'service_booking', 'on_the_way', 40, 'seller', false),
  ('home_services', 'service_booking', 'arrived', 50, 'seller', false),
  ('home_services', 'service_booking', 'in_progress', 60, 'seller', false),
  ('home_services', 'service_booking', 'completed', 70, 'seller', true),
  ('home_services', 'service_booking', 'cancelled', 80, 'buyer', true),
  ('home_services', 'service_booking', 'rescheduled', 15, 'buyer', false),
  ('home_services', 'service_booking', 'no_show', 75, 'seller', true),
  -- personal_care
  ('personal_care', 'service_booking', 'requested', 10, 'buyer', false),
  ('personal_care', 'service_booking', 'confirmed', 20, 'seller', false),
  ('personal_care', 'service_booking', 'scheduled', 30, 'seller', false),
  ('personal_care', 'service_booking', 'on_the_way', 40, 'seller', false),
  ('personal_care', 'service_booking', 'arrived', 50, 'seller', false),
  ('personal_care', 'service_booking', 'in_progress', 60, 'seller', false),
  ('personal_care', 'service_booking', 'completed', 70, 'seller', true),
  ('personal_care', 'service_booking', 'cancelled', 80, 'buyer', true),
  ('personal_care', 'service_booking', 'rescheduled', 15, 'buyer', false),
  ('personal_care', 'service_booking', 'no_show', 75, 'seller', true),
  -- education_learning
  ('education_learning', 'service_booking', 'requested', 10, 'buyer', false),
  ('education_learning', 'service_booking', 'confirmed', 20, 'seller', false),
  ('education_learning', 'service_booking', 'scheduled', 30, 'seller', false),
  ('education_learning', 'service_booking', 'in_progress', 60, 'seller', false),
  ('education_learning', 'service_booking', 'completed', 70, 'seller', true),
  ('education_learning', 'service_booking', 'cancelled', 80, 'buyer', true),
  ('education_learning', 'service_booking', 'rescheduled', 15, 'buyer', false),
  ('education_learning', 'service_booking', 'no_show', 75, 'seller', true),
  -- professional
  ('professional', 'service_booking', 'requested', 10, 'buyer', false),
  ('professional', 'service_booking', 'confirmed', 20, 'seller', false),
  ('professional', 'service_booking', 'scheduled', 30, 'seller', false),
  ('professional', 'service_booking', 'on_the_way', 40, 'seller', false),
  ('professional', 'service_booking', 'arrived', 50, 'seller', false),
  ('professional', 'service_booking', 'in_progress', 60, 'seller', false),
  ('professional', 'service_booking', 'completed', 70, 'seller', true),
  ('professional', 'service_booking', 'cancelled', 80, 'buyer', true),
  ('professional', 'service_booking', 'rescheduled', 15, 'buyer', false),
  ('professional', 'service_booking', 'no_show', 75, 'seller', true),
  -- events
  ('events', 'service_booking', 'requested', 10, 'buyer', false),
  ('events', 'service_booking', 'confirmed', 20, 'seller', false),
  ('events', 'service_booking', 'scheduled', 30, 'seller', false),
  ('events', 'service_booking', 'in_progress', 60, 'seller', false),
  ('events', 'service_booking', 'completed', 70, 'seller', true),
  ('events', 'service_booking', 'cancelled', 80, 'buyer', true),
  ('events', 'service_booking', 'rescheduled', 15, 'buyer', false),
  ('events', 'service_booking', 'no_show', 75, 'seller', true),
  -- pets
  ('pets', 'service_booking', 'requested', 10, 'buyer', false),
  ('pets', 'service_booking', 'confirmed', 20, 'seller', false),
  ('pets', 'service_booking', 'scheduled', 30, 'seller', false),
  ('pets', 'service_booking', 'on_the_way', 40, 'seller', false),
  ('pets', 'service_booking', 'arrived', 50, 'seller', false),
  ('pets', 'service_booking', 'in_progress', 60, 'seller', false),
  ('pets', 'service_booking', 'completed', 70, 'seller', true),
  ('pets', 'service_booking', 'cancelled', 80, 'buyer', true),
  ('pets', 'service_booking', 'rescheduled', 15, 'buyer', false),
  ('pets', 'service_booking', 'no_show', 75, 'seller', true),
  -- domestic_help
  ('domestic_help', 'service_booking', 'requested', 10, 'buyer', false),
  ('domestic_help', 'service_booking', 'confirmed', 20, 'seller', false),
  ('domestic_help', 'service_booking', 'scheduled', 30, 'seller', false),
  ('domestic_help', 'service_booking', 'on_the_way', 40, 'seller', false),
  ('domestic_help', 'service_booking', 'arrived', 50, 'seller', false),
  ('domestic_help', 'service_booking', 'in_progress', 60, 'seller', false),
  ('domestic_help', 'service_booking', 'completed', 70, 'seller', true),
  ('domestic_help', 'service_booking', 'cancelled', 80, 'buyer', true),
  ('domestic_help', 'service_booking', 'rescheduled', 15, 'buyer', false),
  ('domestic_help', 'service_booking', 'no_show', 75, 'seller', true);

-- 6. Update notification trigger to handle new service statuses
CREATE OR REPLACE FUNCTION public.fn_enqueue_order_status_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_seller_name text;
  v_title text;
  v_body text;
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  SELECT sp.business_name INTO v_seller_name
  FROM public.seller_profiles sp WHERE sp.id = NEW.seller_id;

  CASE NEW.status
    WHEN 'accepted' THEN
      v_title := '✅ Order Accepted!';
      v_body := COALESCE(v_seller_name, 'The seller') || ' has accepted your order.';
    WHEN 'preparing' THEN
      v_title := '👨‍🍳 Being Prepared';
      v_body := 'Your order is being prepared by ' || COALESCE(v_seller_name, 'the seller') || '.';
    WHEN 'ready' THEN
      v_title := '🎉 Order Ready!';
      v_body := 'Your order from ' || COALESCE(v_seller_name, 'the seller') || ' is ready for pickup!';
    WHEN 'picked_up' THEN
      v_title := '📦 Order Picked Up';
      v_body := 'Your order has been picked up for delivery.';
    WHEN 'delivered' THEN
      v_title := '🚚 Order Delivered!';
      v_body := 'Your order from ' || COALESCE(v_seller_name, 'the seller') || ' has been delivered.';
    WHEN 'completed' THEN
      v_title := '⭐ Order Completed';
      v_body := 'Your order is complete. Leave a review for ' || COALESCE(v_seller_name, 'the seller') || '!';
    WHEN 'cancelled' THEN
      v_title := '❌ Order Cancelled';
      v_body := 'Your order from ' || COALESCE(v_seller_name, 'the seller') || ' has been cancelled.';
    WHEN 'quoted' THEN
      v_title := '💰 Quote Received';
      v_body := COALESCE(v_seller_name, 'The seller') || ' sent you a price quote.';
    WHEN 'scheduled' THEN
      v_title := '📅 Booking Confirmed';
      v_body := 'Your booking with ' || COALESCE(v_seller_name, 'the seller') || ' has been confirmed.';
    WHEN 'confirmed' THEN
      v_title := '✅ Appointment Confirmed';
      v_body := 'Your appointment with ' || COALESCE(v_seller_name, 'the seller') || ' is confirmed.';
    WHEN 'on_the_way' THEN
      v_title := '🚗 On The Way';
      v_body := COALESCE(v_seller_name, 'The service provider') || ' is on the way to you.';
    WHEN 'arrived' THEN
      v_title := '📍 Arrived';
      v_body := COALESCE(v_seller_name, 'The service provider') || ' has arrived.';
    WHEN 'in_progress' THEN
      v_title := '🔧 Service In Progress';
      v_body := 'Your service with ' || COALESCE(v_seller_name, 'the seller') || ' is in progress.';
    WHEN 'rescheduled' THEN
      v_title := '🔄 Appointment Rescheduled';
      v_body := 'Your appointment with ' || COALESCE(v_seller_name, 'the seller') || ' has been rescheduled.';
    WHEN 'no_show' THEN
      v_title := '⚠️ No Show';
      v_body := 'You were marked as a no-show for your appointment with ' || COALESCE(v_seller_name, 'the seller') || '.';
    WHEN 'requested' THEN
      v_title := '📋 Booking Requested';
      v_body := 'Your service booking with ' || COALESCE(v_seller_name, 'the seller') || ' has been submitted.';
    ELSE
      RETURN NEW;
  END CASE;

  INSERT INTO public.notification_queue (user_id, type, title, body, reference_path, payload)
  VALUES (
    NEW.buyer_id, 'order', v_title, v_body,
    '/orders/' || NEW.id::text,
    jsonb_build_object('orderId', NEW.id::text, 'status', NEW.status::text, 'type', 'order_status')
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'fn_enqueue_order_status_notification failed for order %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$function$;

-- 7. Create indexes for performance
CREATE INDEX idx_service_slots_product_date ON public.service_slots(product_id, slot_date);
CREATE INDEX idx_service_slots_seller_date ON public.service_slots(seller_id, slot_date);
CREATE INDEX idx_service_bookings_buyer ON public.service_bookings(buyer_id);
CREATE INDEX idx_service_bookings_seller ON public.service_bookings(seller_id);
CREATE INDEX idx_service_bookings_slot ON public.service_bookings(slot_id);
CREATE INDEX idx_service_availability_seller ON public.service_availability_schedules(seller_id);
