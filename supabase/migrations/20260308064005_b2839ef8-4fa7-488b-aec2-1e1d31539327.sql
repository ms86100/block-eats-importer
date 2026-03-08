
-- Enhance reschedule function to notify seller when buyer reschedules
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
  _new_slot record;
  _hours_until numeric;
  _notice_hours numeric;
  _is_seller boolean;
  _seller_user_id uuid;
  _product_name text;
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
  _is_seller := EXISTS (
    SELECT 1 FROM public.seller_profiles WHERE user_id = _actor_id AND id = _booking.seller_id
  );

  IF NOT _is_seller AND _booking.buyer_id != _actor_id THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized to reschedule this booking');
  END IF;

  -- Buyer: check rescheduling notice period
  IF NOT _is_seller THEN
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

  -- 5. Prevent same-day past time
  IF _new_date::date = CURRENT_DATE AND _new_start_time::time < CURRENT_TIME THEN
    RETURN json_build_object('success', false, 'error', 'Cannot reschedule to a past time slot');
  END IF;

  -- 6. Atomically book new slot
  UPDATE public.service_slots
  SET booked_count = booked_count + 1
  WHERE id = _new_slot_id
    AND is_blocked = false
    AND booked_count < max_capacity
  RETURNING * INTO _new_slot;

  IF _new_slot IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'New slot is no longer available');
  END IF;

  -- 7. Release old slot
  IF _booking.slot_id IS NOT NULL THEN
    UPDATE public.service_slots
    SET booked_count = GREATEST(booked_count - 1, 0)
    WHERE id = _booking.slot_id;
  END IF;

  -- 8. Update booking
  UPDATE public.service_bookings
  SET slot_id = _new_slot_id,
      booking_date = _new_date::date,
      start_time = _new_start_time::time,
      end_time = _new_end_time::time,
      status = 'rescheduled',
      rescheduled_from = _booking_id,
      updated_at = now()
  WHERE id = _booking_id;

  -- 9. Update order
  UPDATE public.orders
  SET status = 'rescheduled', updated_at = now()
  WHERE id = _booking.order_id;

  -- 10. Enqueue notification to the other party
  SELECT p.name INTO _product_name FROM public.products p WHERE p.id = _booking.product_id;

  IF NOT _is_seller THEN
    -- Buyer rescheduled -> notify seller
    SELECT sp.user_id INTO _seller_user_id
    FROM public.seller_profiles sp WHERE sp.id = _booking.seller_id;

    IF _seller_user_id IS NOT NULL THEN
      INSERT INTO public.notification_queue (user_id, type, title, body, reference_path, payload)
      VALUES (
        _seller_user_id,
        'order',
        '🔄 Booking Rescheduled',
        COALESCE(_product_name, 'A service') || ' rescheduled to ' || _new_date || ' at ' || LEFT(_new_start_time, 5),
        '/orders/' || _booking.order_id::text,
        jsonb_build_object('orderId', _booking.order_id::text, 'status', 'rescheduled', 'type', 'order')
      );
    END IF;
  ELSE
    -- Seller rescheduled -> notify buyer
    INSERT INTO public.notification_queue (user_id, type, title, body, reference_path, payload)
    VALUES (
      _booking.buyer_id,
      'order',
      '🔄 Your Appointment Was Rescheduled',
      COALESCE(_product_name, 'Your appointment') || ' moved to ' || _new_date || ' at ' || LEFT(_new_start_time, 5),
      '/orders/' || _booking.order_id::text,
      jsonb_build_object('orderId', _booking.order_id::text, 'status', 'rescheduled', 'type', 'order')
    );
  END IF;

  RETURN json_build_object('success', true, 'booking_id', _booking_id);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;
