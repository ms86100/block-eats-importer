
-- ============================================
-- BATCH 1: New tables with NO FK deps on other new tables
-- ============================================

-- 1. attribute_block_library
CREATE TABLE IF NOT EXISTS public.attribute_block_library (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  block_type text NOT NULL,
  category_hints text[] DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  description text DEFAULT NULL,
  display_name text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  icon text DEFAULT NULL,
  is_active boolean NOT NULL DEFAULT true,
  renderer_type text NOT NULL DEFAULT 'text',
  schema jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- 2. authorized_persons
CREATE TABLE IF NOT EXISTS public.authorized_persons (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  flat_number text NOT NULL,
  is_active boolean DEFAULT true,
  person_name text NOT NULL,
  phone text DEFAULT NULL,
  photo_url text DEFAULT NULL,
  relationship text NOT NULL DEFAULT 'family',
  resident_id uuid NOT NULL REFERENCES public.profiles(id),
  society_id uuid NOT NULL REFERENCES public.societies(id),
  updated_at timestamptz DEFAULT now()
);

-- 3. campaigns
CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  body text NOT NULL,
  cleaned_count integer NOT NULL DEFAULT 0,
  completed_at timestamptz DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  data jsonb DEFAULT NULL,
  failed_count integer NOT NULL DEFAULT 0,
  sent_by uuid NOT NULL REFERENCES public.profiles(id),
  sent_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  target_platform text NOT NULL DEFAULT 'fcm',
  target_society_id uuid DEFAULT NULL REFERENCES public.societies(id),
  target_user_ids text[] DEFAULT NULL,
  targeted_count integer NOT NULL DEFAULT 0,
  title text NOT NULL
);

-- 4. category_status_flows
CREATE TABLE IF NOT EXISTS public.category_status_flows (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor text NOT NULL DEFAULT 'system',
  created_at timestamptz DEFAULT now(),
  is_terminal boolean DEFAULT false,
  parent_group text NOT NULL,
  sort_order integer NOT NULL,
  status_key text NOT NULL,
  transaction_type text NOT NULL
);

-- 5. collective_buy_requests
CREATE TABLE IF NOT EXISTS public.collective_buy_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  current_quantity integer NOT NULL DEFAULT 0,
  description text DEFAULT NULL,
  expires_at timestamptz DEFAULT NULL,
  image_url text DEFAULT NULL,
  min_quantity integer NOT NULL DEFAULT 1,
  product_name text NOT NULL,
  society_id uuid NOT NULL REFERENCES public.societies(id),
  status text NOT NULL DEFAULT 'open',
  target_price numeric DEFAULT NULL,
  unit text NOT NULL DEFAULT 'unit',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 6. collective_buy_participants
CREATE TABLE IF NOT EXISTS public.collective_buy_participants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  joined_at timestamptz NOT NULL DEFAULT now(),
  quantity integer NOT NULL DEFAULT 1,
  request_id uuid NOT NULL REFERENCES public.collective_buy_requests(id),
  user_id uuid NOT NULL REFERENCES public.profiles(id)
);

-- 7. delivery_partner_pool
CREATE TABLE IF NOT EXISTS public.delivery_partner_pool (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  added_by uuid DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean DEFAULT true,
  is_available boolean DEFAULT true,
  name text NOT NULL,
  phone text NOT NULL,
  photo_url text DEFAULT NULL,
  rating numeric DEFAULT NULL,
  society_id uuid NOT NULL REFERENCES public.societies(id),
  total_deliveries integer DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid DEFAULT NULL,
  vehicle_number text DEFAULT NULL,
  vehicle_type text DEFAULT NULL
);

-- 8. notification_preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  orders boolean NOT NULL DEFAULT true,
  promotions boolean NOT NULL DEFAULT true,
  sounds boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL
);

-- 9. order_status_config
CREATE TABLE IF NOT EXISTS public.order_status_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  color text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  status_key text NOT NULL
);

-- 10. price_history
CREATE TABLE IF NOT EXISTS public.price_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  changed_at timestamptz NOT NULL DEFAULT now(),
  changed_by uuid DEFAULT NULL REFERENCES public.profiles(id),
  new_price numeric NOT NULL,
  old_price numeric NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id)
);

-- 11. push_logs
CREATE TABLE IF NOT EXISTS public.push_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  level text NOT NULL DEFAULT 'info',
  message text NOT NULL,
  metadata jsonb DEFAULT NULL,
  user_id uuid DEFAULT NULL REFERENCES public.profiles(id)
);

-- 12. search_demand_log
CREATE TABLE IF NOT EXISTS public.search_demand_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category text DEFAULT NULL,
  search_term text NOT NULL,
  searched_at timestamptz NOT NULL DEFAULT now(),
  society_id uuid NOT NULL REFERENCES public.societies(id)
);

-- 13. seller_form_configs
CREATE TABLE IF NOT EXISTS public.seller_form_configs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  category text DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  seller_id uuid NOT NULL REFERENCES public.seller_profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 14. seller_reputation_ledger
CREATE TABLE IF NOT EXISTS public.seller_reputation_ledger (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_detail jsonb DEFAULT NULL,
  event_type text NOT NULL,
  is_positive boolean NOT NULL DEFAULT true,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  seller_id uuid NOT NULL REFERENCES public.seller_profiles(id)
);

-- 15. seller_settlements
CREATE TABLE IF NOT EXISTS public.seller_settlements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  delivery_fee_share numeric NOT NULL DEFAULT 0,
  eligible_at timestamptz DEFAULT NULL,
  gross_amount numeric NOT NULL DEFAULT 0,
  hold_reason text DEFAULT NULL,
  net_amount numeric NOT NULL DEFAULT 0,
  order_id uuid NOT NULL REFERENCES public.orders(id),
  platform_fee numeric NOT NULL DEFAULT 0,
  razorpay_transfer_id text DEFAULT NULL,
  seller_id uuid NOT NULL REFERENCES public.seller_profiles(id),
  settled_at timestamptz DEFAULT NULL,
  settlement_status text NOT NULL DEFAULT 'pending',
  society_id uuid NOT NULL REFERENCES public.societies(id),
  updated_at timestamptz DEFAULT NULL,
  CONSTRAINT seller_settlements_order_id_key UNIQUE (order_id)
);

-- 16. society_budgets
CREATE TABLE IF NOT EXISTS public.society_budgets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_amount numeric NOT NULL DEFAULT 0,
  category text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  fiscal_year text NOT NULL DEFAULT '2025-26',
  society_id uuid NOT NULL REFERENCES public.societies(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 17. society_features
CREATE TABLE IF NOT EXISTS public.society_features (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  feature_key text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  society_id uuid NOT NULL REFERENCES public.societies(id)
);

-- 18. society_notices
CREATE TABLE IF NOT EXISTS public.society_notices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attachment_urls text[] DEFAULT NULL,
  body text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now(),
  is_pinned boolean NOT NULL DEFAULT false,
  posted_by uuid NOT NULL REFERENCES public.profiles(id),
  society_id uuid NOT NULL REFERENCES public.societies(id),
  title text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 19. society_report_cards
CREATE TABLE IF NOT EXISTS public.society_report_cards (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  generated_at timestamptz NOT NULL DEFAULT now(),
  month text NOT NULL,
  report_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  society_id uuid NOT NULL REFERENCES public.societies(id)
);

-- 20. stock_watchlist
CREATE TABLE IF NOT EXISTS public.stock_watchlist (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  notified_at timestamptz DEFAULT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id),
  user_id uuid NOT NULL REFERENCES public.profiles(id)
);

-- 21. subcategories
CREATE TABLE IF NOT EXISTS public.subcategories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_config_id uuid NOT NULL REFERENCES public.category_config(id),
  color text DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  description_placeholder text DEFAULT NULL,
  display_name text NOT NULL,
  display_order integer DEFAULT 0,
  duration_label text DEFAULT NULL,
  icon text DEFAULT NULL,
  image_url text DEFAULT NULL,
  is_active boolean NOT NULL DEFAULT true,
  name_placeholder text DEFAULT NULL,
  price_label text DEFAULT NULL,
  show_duration_field boolean DEFAULT false,
  show_veg_toggle boolean DEFAULT false,
  slug text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 22. supported_languages
CREATE TABLE IF NOT EXISTS public.supported_languages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ai_name text NOT NULL DEFAULT '',
  bcp47_tag text NOT NULL DEFAULT '',
  code text NOT NULL,
  created_at timestamptz DEFAULT now(),
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  name text NOT NULL,
  native_name text NOT NULL
);

-- 23. visitor_types
CREATE TABLE IF NOT EXISTS public.visitor_types (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  display_order integer DEFAULT 0,
  icon text DEFAULT NULL,
  is_active boolean DEFAULT true,
  label text NOT NULL,
  society_id uuid DEFAULT NULL REFERENCES public.societies(id),
  type_key text NOT NULL
);

-- 24. worker_attendance
CREATE TABLE IF NOT EXISTS public.worker_attendance (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  check_in_at timestamptz NOT NULL DEFAULT now(),
  check_out_at timestamptz DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  entry_method text DEFAULT NULL,
  society_id uuid NOT NULL REFERENCES public.societies(id),
  verified_by uuid DEFAULT NULL,
  worker_id uuid NOT NULL REFERENCES public.society_workers(id)
);

-- 25. worker_leave_records
CREATE TABLE IF NOT EXISTS public.worker_leave_records (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  leave_date date NOT NULL,
  leave_type text NOT NULL DEFAULT 'full_day',
  marked_by uuid DEFAULT NULL,
  reason text DEFAULT NULL,
  society_id uuid NOT NULL REFERENCES public.societies(id),
  worker_id uuid NOT NULL REFERENCES public.society_workers(id)
);

-- 26. worker_salary_records
CREATE TABLE IF NOT EXISTS public.worker_salary_records (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  month text NOT NULL,
  notes text DEFAULT NULL,
  paid_date date DEFAULT NULL,
  resident_id uuid NOT NULL REFERENCES public.profiles(id),
  society_id uuid NOT NULL REFERENCES public.societies(id),
  status text NOT NULL DEFAULT 'pending',
  worker_id uuid NOT NULL REFERENCES public.society_workers(id)
);

-- 27. job_tts_cache
CREATE TABLE IF NOT EXISTS public.job_tts_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  job_id uuid NOT NULL REFERENCES public.worker_job_requests(id),
  language_code text NOT NULL,
  summary_text text NOT NULL
);

-- Enable RLS on all new tables
ALTER TABLE public.attribute_block_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authorized_persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_status_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collective_buy_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collective_buy_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_partner_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_demand_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_form_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_reputation_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.society_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.society_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.society_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.society_report_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supported_languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_leave_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_salary_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_tts_cache ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies for new tables (authenticated read access)
CREATE POLICY "authenticated_read" ON public.attribute_block_library FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read" ON public.category_status_flows FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read" ON public.order_status_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read" ON public.supported_languages FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read" ON public.visitor_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read" ON public.subcategories FOR SELECT TO authenticated USING (true);
