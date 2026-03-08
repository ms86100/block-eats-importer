-- Backend enforcement: block cart mutations and order creation when seller store is closed

-- 1) Validate cart inserts/updates against seller availability window
create or replace function public.validate_cart_item_store_availability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller_id uuid;
  v_status jsonb;
  v_status_text text;
begin
  -- Product must be orderable
  select p.seller_id
    into v_seller_id
  from public.products p
  where p.id = new.product_id
    and p.is_available = true
    and p.approval_status = 'approved';

  if v_seller_id is null then
    raise exception 'PRODUCT_NOT_ORDERABLE' using errcode = 'P0001';
  end if;

  -- Seller must be open right now
  select public.compute_store_status(
    sp.availability_start,
    sp.availability_end,
    sp.operating_days,
    coalesce(sp.is_available, true)
  )
  into v_status
  from public.seller_profiles sp
  where sp.id = v_seller_id;

  if v_status is null then
    raise exception 'SELLER_NOT_FOUND' using errcode = 'P0001';
  end if;

  v_status_text := coalesce(v_status->>'status', 'closed');
  if v_status_text <> 'open' then
    raise exception 'STORE_CLOSED:%', v_status_text using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_cart_item_store_availability_trigger on public.cart_items;
create trigger validate_cart_item_store_availability_trigger
before insert or update of product_id, quantity
on public.cart_items
for each row
execute function public.validate_cart_item_store_availability();

-- 2) Enforce seller-open validation inside checkout RPC (server-side, non-bypassable)
create or replace function public.create_multi_vendor_orders(
  _buyer_id uuid,
  _seller_groups json,
  _delivery_address text,
  _notes text,
  _payment_method text,
  _payment_status text,
  _cart_total numeric,
  _coupon_id text default ''::text,
  _coupon_code text default ''::text,
  _coupon_discount numeric default 0,
  _has_urgent boolean default false,
  _delivery_fee numeric default 0,
  _fulfillment_type text default 'delivery'::text
)
returns json
language plpgsql
security definer
set search_path = public
as $function$
declare
  _seller_group json;
  _order_id uuid;
  _order_ids uuid[] := '{}';
  _item json;
  _society_id uuid;
  _total numeric;
  _seller_user_id uuid;
  _buyer_name text;
  _seller_id uuid;
  _seller_name text;
  _seller_status jsonb;
  _seller_status_text text;
  _closed_sellers text[] := '{}';
begin
  select p.society_id, p.name
    into _society_id, _buyer_name
  from public.profiles p
  where p.id = _buyer_id;

  -- Pre-validate all sellers first to avoid partial order creation
  for _seller_group in select * from json_array_elements(_seller_groups)
  loop
    _seller_id := (_seller_group->>'seller_id')::uuid;

    select sp.business_name,
           public.compute_store_status(
             sp.availability_start,
             sp.availability_end,
             sp.operating_days,
             coalesce(sp.is_available, true)
           )
      into _seller_name, _seller_status
    from public.seller_profiles sp
    where sp.id = _seller_id;

    if _seller_status is null then
      return json_build_object(
        'success', false,
        'error', 'seller_not_found',
        'seller_id', _seller_id
      );
    end if;

    _seller_status_text := coalesce(_seller_status->>'status', 'closed');
    if _seller_status_text <> 'open' then
      _closed_sellers := array_append(_closed_sellers, coalesce(_seller_name, 'Seller'));
    end if;
  end loop;

  if array_length(_closed_sellers, 1) > 0 then
    return json_build_object(
      'success', false,
      'error', 'store_closed',
      'closed_sellers', to_json(_closed_sellers)
    );
  end if;

  -- Existing order creation flow
  for _seller_group in select * from json_array_elements(_seller_groups)
  loop
    _total := 0;
    _order_id := gen_random_uuid();

    for _item in select * from json_array_elements(_seller_group->'items')
    loop
      _total := _total + ((_item->>'unit_price')::numeric * (_item->>'quantity')::int);
    end loop;

    insert into public.orders (
      id,
      buyer_id,
      seller_id,
      society_id,
      status,
      total_amount,
      payment_type,
      payment_status,
      delivery_address,
      notes,
      order_type,
      fulfillment_type
    )
    values (
      _order_id,
      _buyer_id,
      (_seller_group->>'seller_id')::uuid,
      _society_id,
      'placed',
      _total,
      _payment_method,
      _payment_status,
      _delivery_address,
      _notes,
      'purchase',
      _fulfillment_type
    );

    for _item in select * from json_array_elements(_seller_group->'items')
    loop
      insert into public.order_items (order_id, product_id, product_name, quantity, unit_price)
      values (
        _order_id,
        (_item->>'product_id')::uuid,
        _item->>'product_name',
        (_item->>'quantity')::int,
        (_item->>'unit_price')::numeric
      );
    end loop;

    select sp.user_id
      into _seller_user_id
    from public.seller_profiles sp
    where sp.id = (_seller_group->>'seller_id')::uuid;

    if _seller_user_id is not null then
      insert into public.notification_queue (user_id, type, title, body, reference_path, payload)
      values (
        _seller_user_id,
        'order',
        '🆕 New Order Received!',
        coalesce(_buyer_name, 'A buyer') || ' placed an order. Tap to view and accept.',
        '/orders/' || _order_id::text,
        jsonb_build_object('orderId', _order_id::text, 'status', 'placed', 'type', 'order')
      );
    end if;

    _order_ids := _order_ids || _order_id;
  end loop;

  delete from public.cart_items where user_id = _buyer_id;

  return json_build_object('success', true, 'order_ids', to_json(_order_ids));
end;
$function$;