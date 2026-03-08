-- 1) Canonical mapper: category_config.transaction_type -> products.action_type
CREATE OR REPLACE FUNCTION public.map_transaction_type_to_action_type(_transaction_type text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  RETURN CASE _transaction_type
    WHEN 'cart_purchase' THEN 'add_to_cart'
    WHEN 'buy_now' THEN 'buy_now'
    WHEN 'book_slot' THEN 'book'
    WHEN 'request_service' THEN 'request_service'
    WHEN 'request_quote' THEN 'request_quote'
    WHEN 'contact_only' THEN 'contact_seller'
    WHEN 'schedule_visit' THEN 'schedule_visit'
    ELSE 'add_to_cart'
  END;
END;
$$;

-- 2) Enforce action_type on product writes (insert/update)
CREATE OR REPLACE FUNCTION public.set_product_action_type_from_category()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tx_type text;
BEGIN
  SELECT cc.transaction_type
    INTO _tx_type
  FROM public.category_config cc
  WHERE cc.category::text = NEW.category::text
  LIMIT 1;

  NEW.action_type := public.map_transaction_type_to_action_type(_tx_type);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_product_action_type_from_category ON public.products;
CREATE TRIGGER trg_set_product_action_type_from_category
BEFORE INSERT OR UPDATE OF category, action_type
ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.set_product_action_type_from_category();

-- 3) Sync all existing products whenever category listing type changes
CREATE OR REPLACE FUNCTION public.sync_products_action_type_on_category_tx_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.transaction_type IS DISTINCT FROM OLD.transaction_type THEN
    UPDATE public.products p
    SET action_type = public.map_transaction_type_to_action_type(NEW.transaction_type)
    WHERE p.category::text = NEW.category::text;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_products_action_type_on_category_tx_change ON public.category_config;
CREATE TRIGGER trg_sync_products_action_type_on_category_tx_change
AFTER UPDATE OF transaction_type
ON public.category_config
FOR EACH ROW
EXECUTE FUNCTION public.sync_products_action_type_on_category_tx_change();