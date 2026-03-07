
-- 1. Create the function for enqueuing buyer notifications on status change
CREATE OR REPLACE FUNCTION public.fn_enqueue_order_status_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_seller_name text;
  v_title text;
  v_body text;
BEGIN
  -- Skip if status didn't change
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  -- Get seller business name
  SELECT sp.business_name INTO v_seller_name
  FROM public.seller_profiles sp WHERE sp.id = NEW.seller_id;

  -- Build notification content based on new status
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
    ELSE
      RETURN NEW; -- Unknown status, skip notification
  END CASE;

  -- Enqueue notification for the buyer
  INSERT INTO public.notification_queue (user_id, type, title, body, reference_path, payload)
  VALUES (
    NEW.buyer_id,
    'order',
    v_title,
    v_body,
    '/orders/' || NEW.id::text,
    jsonb_build_object('orderId', NEW.id::text, 'status', NEW.status::text, 'type', 'order_status')
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'fn_enqueue_order_status_notification failed for order %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- 2. Create the function for enqueuing seller notifications on new order (if missing)
CREATE OR REPLACE FUNCTION public.fn_enqueue_new_order_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_seller_user_id uuid;
  v_buyer_name text;
BEGIN
  -- Get seller user_id
  SELECT sp.user_id INTO v_seller_user_id
  FROM public.seller_profiles sp WHERE sp.id = NEW.seller_id;

  IF v_seller_user_id IS NULL THEN RETURN NEW; END IF;

  -- Get buyer name
  SELECT p.name INTO v_buyer_name
  FROM public.profiles p WHERE p.id = NEW.buyer_id;

  INSERT INTO public.notification_queue (user_id, type, title, body, reference_path, payload)
  VALUES (
    v_seller_user_id,
    'order',
    '🆕 New Order Received!',
    COALESCE(v_buyer_name, 'A buyer') || ' placed an order. Tap to view and accept.',
    '/orders/' || NEW.id::text,
    jsonb_build_object('orderId', NEW.id::text, 'status', NEW.status::text, 'type', 'order')
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'fn_enqueue_new_order_notification failed for order %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- 3. Create INSERT trigger (restore)
DROP TRIGGER IF EXISTS trg_enqueue_new_order_notification ON public.orders;
CREATE TRIGGER trg_enqueue_new_order_notification
  AFTER INSERT ON public.orders FOR EACH ROW
  EXECUTE FUNCTION public.fn_enqueue_new_order_notification();

-- 4. Create UPDATE trigger for status changes
DROP TRIGGER IF EXISTS trg_enqueue_order_status_notification ON public.orders;
CREATE TRIGGER trg_enqueue_order_status_notification
  AFTER UPDATE ON public.orders FOR EACH ROW
  EXECUTE FUNCTION public.fn_enqueue_order_status_notification();
