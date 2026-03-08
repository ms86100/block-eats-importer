
-- Atomic reschedule function to prevent race conditions
CREATE OR REPLACE FUNCTION public.reschedule_service_booking(
  _booking_id uuid,
  _new_slot_id uuid,
  _new_date text,
  _new_start_time text,
  _new_end_time text,
  _actor_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _booking record;
  _listing record;
  _new_slot record;
  _hours_until numeric;
  _notice_hours numeric;
BEGIN
  -- 1. Get booking with lock
  SELECT * INTO _booking
  FROM public.service_bookings
  WHERE id = _booking_id
  FOR UPDATE;

  IF _booking IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Booking not found');
  END IF;

  -- 2. Check status allows reschedule
  IF _booking.status NOT IN ('requested', 'confirmed', 'scheduled', 'rescheduled') THEN
    RETURN json_build_object('success', false, 'error', 'Cannot reschedule a ' || _booking.status || ' booking');
  END IF;

  -- 3. Verify actor is buyer or seller
  IF _booking.buyer_id != _actor_id THEN
    -- Check if seller
    IF NOT EXISTS (SELECT 1 FROM public.seller_profiles WHERE user_id = _actor_id AND id = _booking.seller_id) THEN
      RETURN json_build_object('success', false, 'error', 'Not authorized to reschedule this booking');
    END IF;
  ELSE
    -- Buyer: check rescheduling notice period
    SELECT sl.rescheduling_notice_hours INTO _notice_hours
    FROM public.service_listings sl
    WHERE sl.product_id = _booking.product_id;

    _hours_until := EXTRACT(EPOCH FROM (
      (_booking.booking_date + _booking.start_time) - now()
    )) / 3600;

    IF _notice_hours IS NOT NULL AND _hours_until < _notice_hours THEN
      RETURN json_build_object('success', false, 'error',
        format('Rescheduling requires at least %s hours notice', _notice_hours));
    END IF;
  END IF;

  -- 4. Prevent booking past dates
  IF _new_date::date < CURRENT_DATE THEN
    RETURN json_build_object('success', false, 'error', 'Cannot reschedule to a past date');
  END IF;

  -- 5. Atomically book new slot
  UPDATE public.service_slots
  SET booked_count = booked_count + 1
  WHERE id = _new_slot_id
    AND is_blocked = false
    AND booked_count < max_capacity
  RETURNING * INTO _new_slot;

  IF _new_slot IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'New slot is no longer available');
  END IF;

  -- 6. Release old slot
  IF _booking.slot_id IS NOT NULL THEN
    UPDATE public.service_slots
    SET booked_count = GREATEST(booked_count - 1, 0)
    WHERE id = _booking.slot_id;
  END IF;

  -- 7. Update booking
  UPDATE public.service_bookings
  SET slot_id = _new_slot_id,
      booking_date = _new_date::date,
      start_time = _new_start_time::time,
      end_time = _new_end_time::time,
      status = 'rescheduled',
      rescheduled_from = _booking_id,
      updated_at = now()
  WHERE id = _booking_id;

  -- 8. Update order
  UPDATE public.orders
  SET status = 'rescheduled', updated_at = now()
  WHERE id = _booking.order_id;

  RETURN json_build_object('success', true, 'booking_id', _booking_id);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;
