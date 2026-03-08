ALTER TABLE public.seller_profiles 
  ADD COLUMN IF NOT EXISTS daily_order_limit integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS low_stock_alert_threshold integer DEFAULT 3;