
-- 1. Atomic slot booking function to prevent race conditions
CREATE OR REPLACE FUNCTION public.book_service_slot(
  _slot_id uuid,
  _buyer_id uuid,
  _seller_id uuid,
  _product_id uuid,
  _order_id uuid,
  _booking_date text,
  _start_time text,
  _end_time text,
  _location_type text DEFAULT 'at_seller',
  _buyer_address text DEFAULT NULL,
  _notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _slot record;
  _booking_id uuid;
  _existing_count int;
BEGIN
  -- 1. Check for duplicate booking (same buyer, same slot)
  SELECT COUNT(*) INTO _existing_count
  FROM public.service_bookings
  WHERE buyer_id = _buyer_id
    AND slot_id = _slot_id
    AND status NOT IN ('cancelled', 'no_show');

  IF _existing_count > 0 THEN
    RETURN json_build_object('success', false, 'error', 'You already have a booking for this time slot');
  END IF;

  -- 2. Check for overlapping booking (same buyer, same date, overlapping time)
  SELECT COUNT(*) INTO _existing_count
  FROM public.service_bookings
  WHERE buyer_id = _buyer_id
    AND booking_date = _booking_date::date
    AND status NOT IN ('cancelled', 'no_show')
    AND start_time < _end_time::time
    AND end_time > _start_time::time;

  IF _existing_count > 0 THEN
    RETURN json_build_object('success', false, 'error', 'You have an overlapping booking at this time');
  END IF;

  -- 3. Prevent booking past dates
  IF _booking_date::date < CURRENT_DATE THEN
    RETURN json_build_object('success', false, 'error', 'Cannot book a past date');
  END IF;

  -- 4. Prevent booking same-day if slot time already passed
  IF _booking_date::date = CURRENT_DATE AND _start_time::time < CURRENT_TIME THEN
    RETURN json_build_object('success', false, 'error', 'This time slot has already passed');
  END IF;

  -- 5. Atomically increment booked_count with row lock
  UPDATE public.service_slots
  SET booked_count = booked_count + 1
  WHERE id = _slot_id
    AND is_blocked = false
    AND booked_count < max_capacity
  RETURNING * INTO _slot;

  IF _slot IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Slot is no longer available');
  END IF;

  -- 6. Create service booking
  INSERT INTO public.service_bookings (
    order_id, slot_id, buyer_id, seller_id, product_id,
    booking_date, start_time, end_time, status, location_type, buyer_address
  ) VALUES (
    _order_id, _slot_id, _buyer_id, _seller_id, _product_id,
    _booking_date::date, _start_time::time, _end_time::time, 'requested',
    _location_type, _buyer_address
  )
  RETURNING id INTO _booking_id;

  RETURN json_build_object('success', true, 'booking_id', _booking_id);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 2. Atomic slot release function
CREATE OR REPLACE FUNCTION public.release_service_slot(_slot_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.service_slots
  SET booked_count = GREATEST(booked_count - 1, 0)
  WHERE id = _slot_id;
END;
$$;

-- 3. Cancellation policy check function
CREATE OR REPLACE FUNCTION public.can_cancel_booking(_booking_id uuid, _actor_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _booking record;
  _listing record;
  _hours_until numeric;
  _is_seller boolean;
  _cancel_fee numeric := 0;
BEGIN
  SELECT sb.*, sl.cancellation_notice_hours, sl.cancellation_fee_percentage
  INTO _booking
  FROM public.service_bookings sb
  LEFT JOIN public.service_listings sl ON sl.product_id = sb.product_id
  WHERE sb.id = _booking_id;

  IF _booking IS NULL THEN
    RETURN json_build_object('can_cancel', false, 'reason', 'Booking not found');
  END IF;

  IF _booking.status IN ('cancelled', 'completed', 'no_show') THEN
    RETURN json_build_object('can_cancel', false, 'reason', 'Booking is already ' || _booking.status);
  END IF;

  -- Check if actor is buyer or seller
  _is_seller := EXISTS (
    SELECT 1 FROM public.seller_profiles WHERE user_id = _actor_id AND id = _booking.seller_id
  );

  -- Sellers can always cancel
  IF _is_seller THEN
    RETURN json_build_object('can_cancel', true, 'fee_percentage', 0, 'reason', 'Seller cancellation');
  END IF;

  -- Buyer must own the booking
  IF _booking.buyer_id != _actor_id THEN
    RETURN json_build_object('can_cancel', false, 'reason', 'Not authorized');
  END IF;

  -- Calculate hours until appointment
  _hours_until := EXTRACT(EPOCH FROM (
    (_booking.booking_date + _booking.start_time) - now()
  )) / 3600;

  IF _hours_until < 0 THEN
    RETURN json_build_object('can_cancel', false, 'reason', 'Appointment has already started');
  END IF;

  -- Check notice period
  IF _booking.cancellation_notice_hours IS NOT NULL AND _hours_until < _booking.cancellation_notice_hours THEN
    _cancel_fee := COALESCE(_booking.cancellation_fee_percentage, 0);
    RETURN json_build_object(
      'can_cancel', true,
      'fee_percentage', _cancel_fee,
      'reason', format('Late cancellation (less than %s hours notice). %s%% fee applies.', _booking.cancellation_notice_hours, _cancel_fee)
    );
  END IF;

  RETURN json_build_object('can_cancel', true, 'fee_percentage', 0, 'reason', 'Within cancellation policy');
END;
$$;

-- 4. Insert policy for service_bookings allowing buyers to create
CREATE POLICY "sb_buyer_insert" ON public.service_bookings
  FOR INSERT TO authenticated
  WITH CHECK (buyer_id = auth.uid());

-- 5. Update policy for sellers to update booking status/staff
CREATE POLICY "sb_seller_update" ON public.service_bookings
  FOR UPDATE TO authenticated
  USING (seller_id IN (SELECT id FROM public.seller_profiles WHERE user_id = auth.uid()))
  WITH CHECK (seller_id IN (SELECT id FROM public.seller_profiles WHERE user_id = auth.uid()));

-- 6. Add index for duplicate booking prevention
CREATE INDEX IF NOT EXISTS idx_service_bookings_buyer_slot
  ON public.service_bookings(buyer_id, slot_id)
  WHERE status NOT IN ('cancelled', 'no_show');

-- 7. Add index for date-based lookups
CREATE INDEX IF NOT EXISTS idx_service_bookings_date_status
  ON public.service_bookings(booking_date, status);

-- 8. Add unique constraint to prevent double-booking at DB level
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_buyer_slot_active
  ON public.service_bookings(buyer_id, slot_id)
  WHERE status NOT IN ('cancelled', 'no_show');
