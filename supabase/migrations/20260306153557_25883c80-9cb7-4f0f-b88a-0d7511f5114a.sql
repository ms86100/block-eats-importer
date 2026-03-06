-- Fix: recreate view without security definer (uses invoker's permissions by default)
DROP VIEW IF EXISTS public.transaction_audit_trail;
CREATE VIEW public.transaction_audit_trail WITH (security_invoker = true) AS
SELECT 
  o.id AS order_id,
  o.created_at AS order_date,
  o.status AS order_status,
  o.total_amount,
  o.payment_type,
  o.payment_status,
  o.society_id,
  o.buyer_id,
  o.seller_id,
  bp.name AS buyer_name,
  sp.business_name AS seller_name,
  pr.transaction_reference,
  pr.platform_fee,
  pr.net_amount
FROM public.orders o
LEFT JOIN public.profiles bp ON bp.id = o.buyer_id
LEFT JOIN public.seller_profiles sp ON sp.id = o.seller_id
LEFT JOIN public.payment_records pr ON pr.order_id = o.id;

-- Fix: set search_path on haversine_km
ALTER FUNCTION public.haversine_km(double precision, double precision, double precision, double precision) SET search_path = 'public';