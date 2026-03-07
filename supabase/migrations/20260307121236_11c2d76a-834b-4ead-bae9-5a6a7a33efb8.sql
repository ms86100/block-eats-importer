
CREATE OR REPLACE FUNCTION public.create_multi_vendor_orders(_buyer_id uuid, _seller_groups json, _delivery_address text, _notes text, _payment_method text, _payment_status text, _cart_total numeric, _coupon_id text DEFAULT ''::text, _coupon_code text DEFAULT ''::text, _coupon_discount numeric DEFAULT 0, _has_urgent boolean DEFAULT false, _delivery_fee numeric DEFAULT 0, _fulfillment_type text DEFAULT 'delivery'::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _seller_group json; _order_id uuid; _order_ids uuid[] := '{}';
  _item json; _society_id uuid; _total numeric;
  _seller_user_id uuid; _buyer_name text;
BEGIN
  SELECT p.society_id, p.name INTO _society_id, _buyer_name
  FROM public.profiles p WHERE p.id = _buyer_id;

  FOR _seller_group IN SELECT * FROM json_array_elements(_seller_groups)
  LOOP
    _total := 0;
    _order_id := gen_random_uuid();

    FOR _item IN SELECT * FROM json_array_elements(_seller_group->'items')
    LOOP
      _total := _total + ((_item->>'unit_price')::numeric * (_item->>'quantity')::int);
    END LOOP;

    INSERT INTO public.orders (id, buyer_id, seller_id, society_id, status, total_amount, payment_type, payment_status, delivery_address, notes, order_type, fulfillment_type)
    VALUES (_order_id, _buyer_id, (_seller_group->>'seller_id')::uuid, _society_id, 'placed', _total, _payment_method, _payment_status, _delivery_address, _notes, 'purchase', _fulfillment_type);

    FOR _item IN SELECT * FROM json_array_elements(_seller_group->'items')
    LOOP
      INSERT INTO public.order_items (order_id, product_id, product_name, quantity, unit_price)
      VALUES (_order_id, (_item->>'product_id')::uuid, _item->>'product_name', (_item->>'quantity')::int, (_item->>'unit_price')::numeric);
    END LOOP;

    SELECT sp.user_id INTO _seller_user_id
    FROM public.seller_profiles sp
    WHERE sp.id = (_seller_group->>'seller_id')::uuid;

    IF _seller_user_id IS NOT NULL THEN
      INSERT INTO public.notification_queue (user_id, type, title, body, reference_path, payload)
      VALUES (
        _seller_user_id,
        'order',
        '🆕 New Order Received!',
        COALESCE(_buyer_name, 'A buyer') || ' placed an order. Tap to view and accept.',
        '/orders/' || _order_id::text,
        jsonb_build_object('orderId', _order_id::text, 'status', 'placed', 'type', 'order')
      );
    END IF;

    _order_ids := _order_ids || _order_id;
  END LOOP;

  DELETE FROM public.cart_items WHERE user_id = _buyer_id;

  RETURN json_build_object('success', true, 'order_ids', to_json(_order_ids));
END;
$function$;
