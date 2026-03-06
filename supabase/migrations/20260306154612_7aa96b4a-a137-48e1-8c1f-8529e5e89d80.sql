-- 27. create_multi_vendor_orders
CREATE OR REPLACE FUNCTION public.create_multi_vendor_orders(
  _buyer_id uuid, _seller_groups json, _delivery_address text, _notes text,
  _payment_method text, _payment_status text, _cart_total numeric,
  _coupon_id text DEFAULT '', _coupon_code text DEFAULT '', _coupon_discount numeric DEFAULT 0,
  _has_urgent boolean DEFAULT false, _delivery_fee numeric DEFAULT 0, _fulfillment_type text DEFAULT 'delivery'
)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _seller_group json; _order_id uuid; _order_ids uuid[] := '{}';
  _item json; _society_id uuid; _total numeric;
BEGIN
  SELECT p.society_id INTO _society_id FROM public.profiles p WHERE p.id = _buyer_id;

  FOR _seller_group IN SELECT * FROM json_array_elements(_seller_groups)
  LOOP
    _total := 0;
    _order_id := gen_random_uuid();
    
    FOR _item IN SELECT * FROM json_array_elements(_seller_group->'items')
    LOOP
      _total := _total + ((_item->>'unit_price')::numeric * (_item->>'quantity')::int);
    END LOOP;

    INSERT INTO public.orders (id, buyer_id, seller_id, society_id, status, total_amount, payment_type, payment_status, delivery_address, notes, order_type, fulfillment_type)
    VALUES (_order_id, _buyer_id, (_seller_group->>'seller_id')::uuid, _society_id, 'placed', _total, _payment_method, _payment_status::public.payment_status, _delivery_address, _notes, 'purchase', _fulfillment_type);

    FOR _item IN SELECT * FROM json_array_elements(_seller_group->'items')
    LOOP
      INSERT INTO public.order_items (order_id, product_id, product_name, quantity, unit_price)
      VALUES (_order_id, (_item->>'product_id')::uuid, _item->>'product_name', (_item->>'quantity')::int, (_item->>'unit_price')::numeric);
    END LOOP;

    _order_ids := _order_ids || _order_id;
  END LOOP;

  -- Clear cart
  DELETE FROM public.cart_items WHERE user_id = _buyer_id;

  RETURN json_build_object('success', true, 'order_ids', to_json(_order_ids));
END;
$$;

-- 28. search_marketplace (overloaded - original signature)
DROP FUNCTION IF EXISTS public.search_marketplace(text, uuid, int, int);
CREATE OR REPLACE FUNCTION public.search_marketplace(search_term text, user_society_id uuid DEFAULT NULL)
RETURNS TABLE(
  seller_id uuid, user_id uuid, business_name text, description text, categories text[],
  primary_group text, cover_image_url text, profile_image_url text,
  is_available boolean, is_featured boolean, rating numeric, total_reviews int,
  matching_products json
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  RETURN QUERY
  SELECT sp.id, sp.user_id, sp.business_name, sp.description, 
    ARRAY(SELECT unnest(sp.categories)::text), sp.primary_group,
    sp.cover_image_url, sp.profile_image_url, sp.is_available, sp.is_featured, sp.rating, sp.total_reviews,
    COALESCE((SELECT json_agg(json_build_object('id', p.id, 'name', p.name, 'price', p.price, 'image_url', p.image_url, 'category', p.category))
      FROM public.products p WHERE p.seller_id = sp.id AND p.is_available = true
      AND (p.name ILIKE '%' || search_term || '%' OR p.description ILIKE '%' || search_term || '%')), '[]'::json)
  FROM public.seller_profiles sp
  WHERE sp.verification_status = 'approved'
    AND (user_society_id IS NULL OR sp.society_id = user_society_id)
    AND (sp.business_name ILIKE '%' || search_term || '%'
      OR EXISTS (SELECT 1 FROM public.products p WHERE p.seller_id = sp.id AND p.is_available = true AND (p.name ILIKE '%' || search_term || '%' OR p.description ILIKE '%' || search_term || '%')))
  ORDER BY sp.is_featured DESC, sp.rating DESC;
END;
$$;

-- 29. search_nearby_sellers
CREATE OR REPLACE FUNCTION public.search_nearby_sellers(
  _buyer_society_id uuid, _radius_km double precision DEFAULT 10,
  _search_term text DEFAULT NULL, _category text DEFAULT NULL
)
RETURNS TABLE(
  seller_id uuid, user_id uuid, business_name text, description text, categories text[],
  primary_group text, cover_image_url text, profile_image_url text,
  is_available boolean, is_featured boolean, rating numeric, total_reviews int,
  matching_products json, distance_km double precision,
  society_name text, availability_start text, availability_end text
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _lat double precision; _lng double precision;
BEGIN
  SELECT latitude, longitude INTO _lat, _lng FROM public.societies WHERE id = _buyer_society_id;
  IF _lat IS NULL THEN RETURN; END IF;
  RETURN QUERY
  SELECT sp.id, sp.user_id, sp.business_name, sp.description,
    ARRAY(SELECT unnest(sp.categories)::text), sp.primary_group,
    sp.cover_image_url, sp.profile_image_url, sp.is_available, sp.is_featured, sp.rating, sp.total_reviews,
    '[]'::json, public.haversine_km(_lat, _lng, s.latitude, s.longitude),
    s.name, sp.availability_start, sp.availability_end
  FROM public.seller_profiles sp
  JOIN public.societies s ON s.id = sp.society_id
  WHERE sp.verification_status = 'approved' AND sp.society_id != _buyer_society_id
    AND s.latitude IS NOT NULL AND s.longitude IS NOT NULL
    AND public.haversine_km(_lat, _lng, s.latitude, s.longitude) <= _radius_km
    AND (_category IS NULL OR _category = ANY(sp.categories::text[]))
    AND (_search_term IS NULL OR sp.business_name ILIKE '%' || _search_term || '%')
  ORDER BY public.haversine_km(_lat, _lng, s.latitude, s.longitude);
END;
$$;