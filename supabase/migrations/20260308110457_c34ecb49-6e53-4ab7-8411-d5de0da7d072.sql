
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_action_type_valid;
ALTER TABLE public.products ADD CONSTRAINT products_action_type_valid
CHECK (action_type IS NULL OR action_type IN (
  'add_to_cart','buy_now','book','request_service',
  'request_quote','contact_seller','schedule_visit','make_offer'
));
