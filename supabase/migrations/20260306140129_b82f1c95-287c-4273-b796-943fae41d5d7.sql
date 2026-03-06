
-- =====================================================
-- BATCH 4: Marketplace Config, Gate, Coupons, Feature System
-- =====================================================

-- 1. service_category enum
DO $$ BEGIN
  CREATE TYPE service_category AS ENUM (
    'home_food', 'bakery', 'snacks', 'groceries', 'beverages',
    'tuition', 'daycare', 'coaching',
    'yoga', 'dance', 'music', 'art_craft', 'language', 'fitness',
    'electrician', 'plumber', 'carpenter', 'ac_service', 'pest_control', 'appliance_repair',
    'maid', 'cook', 'driver', 'nanny',
    'tailoring', 'laundry', 'beauty', 'mehendi', 'salon',
    'tax_consultant', 'it_support', 'tutoring', 'resume_writing',
    'equipment_rental', 'vehicle_rental', 'party_supplies', 'baby_gear',
    'furniture', 'electronics', 'books', 'toys', 'kitchen', 'clothing',
    'catering', 'decoration', 'photography', 'dj_music',
    'pet_food', 'pet_grooming', 'pet_sitting', 'dog_walking',
    'flat_rent', 'roommate', 'parking'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. parent_groups
CREATE TABLE IF NOT EXISTS public.parent_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  icon text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  requires_license boolean NOT NULL DEFAULT false,
  license_type_name text,
  license_description text,
  license_mandatory boolean NOT NULL DEFAULT false,
  layout_type text DEFAULT 'ecommerce',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.parent_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active parent groups" ON public.parent_groups FOR SELECT USING (is_active = true OR is_admin(auth.uid()));
CREATE POLICY "Only admins can manage parent groups" ON public.parent_groups FOR ALL USING (is_admin(auth.uid()));
CREATE INDEX IF NOT EXISTS idx_parent_groups_slug ON public.parent_groups (slug);
CREATE TRIGGER update_parent_groups_updated_at BEFORE UPDATE ON public.parent_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 3. category_config
CREATE TABLE IF NOT EXISTS public.category_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category service_category UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  parent_group TEXT NOT NULL REFERENCES public.parent_groups(slug) ON UPDATE CASCADE ON DELETE RESTRICT,
  is_physical_product BOOLEAN DEFAULT false,
  requires_preparation BOOLEAN DEFAULT false,
  requires_time_slot BOOLEAN DEFAULT false,
  requires_delivery BOOLEAN DEFAULT false,
  supports_cart BOOLEAN DEFAULT false,
  enquiry_only BOOLEAN DEFAULT false,
  has_quantity BOOLEAN DEFAULT true,
  has_duration BOOLEAN DEFAULT false,
  has_date_range BOOLEAN DEFAULT false,
  is_negotiable BOOLEAN DEFAULT false,
  layout_type text NOT NULL DEFAULT 'ecommerce',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.category_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active categories" ON public.category_config FOR SELECT USING (is_active = true OR public.is_admin(auth.uid()));
CREATE POLICY "Only admins can manage categories" ON public.category_config FOR ALL USING (public.is_admin(auth.uid()));
CREATE TRIGGER update_category_config_updated_at BEFORE UPDATE ON public.category_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- layout_type validation trigger
CREATE OR REPLACE FUNCTION public.validate_category_layout_type()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.layout_type NOT IN ('ecommerce', 'food', 'service') THEN
    RAISE EXCEPTION 'Invalid layout_type: %. Must be ecommerce, food, or service', NEW.layout_type;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_validate_category_layout_type BEFORE INSERT OR UPDATE ON public.category_config FOR EACH ROW EXECUTE FUNCTION public.validate_category_layout_type();

-- 4. admin_settings
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  is_active BOOLEAN DEFAULT false,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Only admins can manage settings" ON public.admin_settings FOR ALL USING (public.is_admin(auth.uid()));
CREATE TRIGGER update_admin_settings_updated_at BEFORE UPDATE ON public.admin_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 5. badge_config
CREATE TABLE IF NOT EXISTS public.badge_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tag_key text NOT NULL UNIQUE,
  badge_label text NOT NULL,
  color text NOT NULL DEFAULT 'bg-primary text-primary-foreground',
  priority integer NOT NULL DEFAULT 100,
  layout_visibility text[] NOT NULL DEFAULT ARRAY['ecommerce', 'food', 'service'],
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.badge_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Badge config is readable by everyone" ON public.badge_config FOR SELECT USING (true);
CREATE POLICY "Only admins can modify badge config" ON public.badge_config FOR ALL USING (public.is_admin(auth.uid()));

-- 6. system_settings
CREATE TABLE IF NOT EXISTS public.system_settings (
  key text NOT NULL PRIMARY KEY,
  value text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "System settings readable by everyone" ON public.system_settings FOR SELECT USING (true);
CREATE POLICY "Only admins can modify system settings" ON public.system_settings FOR ALL USING (public.is_admin(auth.uid()));

-- 7. marketplace_events
CREATE TABLE IF NOT EXISTS public.marketplace_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  seller_id uuid,
  category text,
  layout_type text,
  event_type text NOT NULL,
  user_id uuid,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.marketplace_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own events" ON public.marketplace_events FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Admins can read all events" ON public.marketplace_events FOR SELECT USING (public.is_admin(auth.uid()));
CREATE INDEX IF NOT EXISTS idx_marketplace_events_type ON public.marketplace_events (event_type, created_at DESC);

-- 8. device_tokens
CREATE TABLE IF NOT EXISTS public.device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, token)
);
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own tokens" ON public.device_tokens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own tokens" ON public.device_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own tokens" ON public.device_tokens FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own tokens" ON public.device_tokens FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_device_tokens_updated_at BEFORE UPDATE ON public.device_tokens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 9. seller_licenses
CREATE TABLE IF NOT EXISTS public.seller_licenses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id uuid NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.parent_groups(id) ON DELETE CASCADE,
  license_type text NOT NULL,
  license_number text,
  document_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  UNIQUE(seller_id, group_id)
);
ALTER TABLE public.seller_licenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sellers can view their own licenses" ON public.seller_licenses FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.seller_profiles WHERE seller_profiles.id = seller_licenses.seller_id AND seller_profiles.user_id = auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "Sellers can insert their own licenses" ON public.seller_licenses FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.seller_profiles WHERE seller_profiles.id = seller_licenses.seller_id AND seller_profiles.user_id = auth.uid()));
CREATE POLICY "Sellers can update their own licenses" ON public.seller_licenses FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.seller_profiles WHERE seller_profiles.id = seller_licenses.seller_id AND seller_profiles.user_id = auth.uid()) OR public.is_admin(auth.uid()));

-- 10. coupons
CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id uuid NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  society_id uuid NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  code text NOT NULL,
  description text,
  discount_type text NOT NULL DEFAULT 'percentage',
  discount_value numeric NOT NULL DEFAULT 0,
  min_order_amount numeric DEFAULT 0,
  max_discount_amount numeric DEFAULT NULL,
  usage_limit integer DEFAULT NULL,
  times_used integer NOT NULL DEFAULT 0,
  per_user_limit integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  show_to_buyers boolean NOT NULL DEFAULT true,
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(society_id, code)
);
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sellers can manage their own coupons" ON public.coupons FOR ALL
  USING (EXISTS (SELECT 1 FROM public.seller_profiles WHERE seller_profiles.id = coupons.seller_id AND seller_profiles.user_id = auth.uid()));
CREATE POLICY "Users can view active coupons in their society" ON public.coupons FOR SELECT
  USING (is_active = true AND society_id = get_user_society_id(auth.uid()) AND (expires_at IS NULL OR expires_at > now()) AND (starts_at <= now()));
CREATE POLICY "Admins can manage all coupons" ON public.coupons FOR ALL USING (is_admin(auth.uid()));
CREATE TRIGGER update_coupons_updated_at BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 11. coupon_redemptions
CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  discount_applied numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own redemptions" ON public.coupon_redemptions FOR SELECT USING (user_id = auth.uid() OR is_admin(auth.uid()));
CREATE POLICY "Users can create redemptions" ON public.coupon_redemptions FOR INSERT WITH CHECK (user_id = auth.uid());

-- 12. trigger_errors
CREATE TABLE IF NOT EXISTS public.trigger_errors (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trigger_name text NOT NULL,
  table_name text NOT NULL,
  error_message text NOT NULL,
  error_detail text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.trigger_errors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Only admins can view trigger errors" ON public.trigger_errors FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "System can insert trigger errors" ON public.trigger_errors FOR INSERT WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_trigger_errors_created_at ON public.trigger_errors (created_at DESC);

-- 13. gate_entries
CREATE TABLE IF NOT EXISTS public.gate_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id),
  society_id uuid NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  entry_time timestamptz NOT NULL DEFAULT now(),
  entry_type text NOT NULL DEFAULT 'qr_verified',
  verified_by uuid REFERENCES public.profiles(id),
  confirmation_status text DEFAULT 'not_required',
  flat_number text,
  resident_name text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gate_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Security officers can insert gate entries" ON public.gate_entries FOR INSERT TO authenticated WITH CHECK (public.is_security_officer(auth.uid(), society_id));
CREATE POLICY "Security officers can view society entries" ON public.gate_entries FOR SELECT TO authenticated USING (public.is_security_officer(auth.uid(), society_id));
CREATE POLICY "Residents can view own entries" ON public.gate_entries FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Society admins can view all entries" ON public.gate_entries FOR SELECT TO authenticated USING (public.is_society_admin(auth.uid(), society_id));
CREATE INDEX IF NOT EXISTS idx_gate_entries_society_time ON public.gate_entries (society_id, entry_time DESC);

-- 14. manual_entry_requests
CREATE TABLE IF NOT EXISTS public.manual_entry_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id uuid NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  flat_number text NOT NULL,
  claimed_name text NOT NULL,
  requested_by uuid REFERENCES public.profiles(id),
  resident_id uuid REFERENCES public.profiles(id),
  status text NOT NULL DEFAULT 'pending',
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes')
);
ALTER TABLE public.manual_entry_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Security officers can create manual requests" ON public.manual_entry_requests FOR INSERT TO authenticated WITH CHECK (public.is_security_officer(auth.uid(), society_id));
CREATE POLICY "Security officers can view requests" ON public.manual_entry_requests FOR SELECT TO authenticated USING (public.is_security_officer(auth.uid(), society_id));
CREATE POLICY "Residents can view requests for their flat" ON public.manual_entry_requests FOR SELECT TO authenticated USING (resident_id = auth.uid());
CREATE POLICY "Residents can update their requests" ON public.manual_entry_requests FOR UPDATE TO authenticated USING (resident_id = auth.uid());

-- 15. project_towers
CREATE TABLE IF NOT EXISTS public.project_towers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  total_floors INTEGER NOT NULL DEFAULT 0,
  expected_completion DATE,
  revised_completion DATE,
  delay_reason TEXT,
  delay_category TEXT,
  current_stage TEXT NOT NULL DEFAULT 'foundation',
  current_percentage INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.project_towers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Society members can view towers" ON public.project_towers FOR SELECT USING (society_id = get_user_society_id(auth.uid()) OR is_admin(auth.uid()));
CREATE POLICY "Admins can insert towers" ON public.project_towers FOR INSERT WITH CHECK (society_id = get_user_society_id(auth.uid()) AND is_admin(auth.uid()));
CREATE POLICY "Admins can update towers" ON public.project_towers FOR UPDATE USING (society_id = get_user_society_id(auth.uid()) AND is_admin(auth.uid()));
CREATE POLICY "Admins can delete towers" ON public.project_towers FOR DELETE USING (society_id = get_user_society_id(auth.uid()) AND is_admin(auth.uid()));

-- 16. snag_tickets
CREATE TABLE IF NOT EXISTS public.snag_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  tower_id UUID REFERENCES public.project_towers(id) ON DELETE SET NULL,
  flat_number TEXT NOT NULL,
  reported_by UUID NOT NULL REFERENCES public.profiles(id),
  title TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  description TEXT NOT NULL,
  photo_urls TEXT[] DEFAULT '{}'::TEXT[],
  status TEXT NOT NULL DEFAULT 'reported',
  sla_deadline TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '72 hours'),
  assigned_to_name TEXT,
  acknowledged_at TIMESTAMPTZ,
  fixed_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.snag_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view snag tickets" ON public.snag_tickets FOR SELECT USING (reported_by = auth.uid() OR (society_id = get_user_society_id(auth.uid()) AND is_admin(auth.uid())));
CREATE POLICY "Members can create snag tickets" ON public.snag_tickets FOR INSERT WITH CHECK (reported_by = auth.uid() AND society_id = get_user_society_id(auth.uid()));
CREATE POLICY "Admins can update snag tickets" ON public.snag_tickets FOR UPDATE USING (society_id = get_user_society_id(auth.uid()) AND (is_admin(auth.uid()) OR reported_by = auth.uid()));
CREATE INDEX IF NOT EXISTS idx_snag_tickets_society_status ON public.snag_tickets(society_id, status);

-- 17. builder_societies
CREATE TABLE IF NOT EXISTS public.builder_societies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_id uuid NOT NULL REFERENCES public.builders(id) ON DELETE CASCADE,
  society_id uuid NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(builder_id, society_id)
);
ALTER TABLE public.builder_societies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Builder societies visible to builder members" ON public.builder_societies FOR SELECT
  USING (is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM builder_members bm WHERE bm.builder_id = builder_societies.builder_id AND bm.user_id = auth.uid()));
CREATE POLICY "Only platform admins can manage builder societies" ON public.builder_societies FOR ALL USING (is_admin(auth.uid()));

-- 18. builder_announcements
CREATE TABLE IF NOT EXISTS public.builder_announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  builder_id UUID NOT NULL REFERENCES public.builders(id),
  society_id UUID NOT NULL REFERENCES public.societies(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'update',
  posted_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.builder_announcements ENABLE ROW LEVEL SECURITY;

-- 19. platform_features
CREATE TABLE IF NOT EXISTS public.platform_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text UNIQUE NOT NULL,
  feature_name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'operations',
  is_core boolean NOT NULL DEFAULT false,
  is_experimental boolean NOT NULL DEFAULT false,
  society_configurable boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_features ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view features" ON public.platform_features FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage features" ON public.platform_features FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER update_platform_features_updated_at BEFORE UPDATE ON public.platform_features FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 20. feature_packages
CREATE TABLE IF NOT EXISTS public.feature_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_name text NOT NULL,
  description text,
  price_tier text NOT NULL DEFAULT 'free',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.feature_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view packages" ON public.feature_packages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage packages" ON public.feature_packages FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER update_feature_packages_updated_at BEFORE UPDATE ON public.feature_packages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 21. feature_package_items
CREATE TABLE IF NOT EXISTS public.feature_package_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES public.feature_packages(id) ON DELETE CASCADE,
  feature_id uuid NOT NULL REFERENCES public.platform_features(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  UNIQUE(package_id, feature_id)
);
ALTER TABLE public.feature_package_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view package items" ON public.feature_package_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage package items" ON public.feature_package_items FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 22. builder_feature_packages
CREATE TABLE IF NOT EXISTS public.builder_feature_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_id uuid NOT NULL REFERENCES public.builders(id) ON DELETE CASCADE,
  package_id uuid NOT NULL REFERENCES public.feature_packages(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  assigned_by uuid REFERENCES public.profiles(id),
  UNIQUE(builder_id, package_id)
);
ALTER TABLE public.builder_feature_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage builder packages" ON public.builder_feature_packages FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Builder members can view own packages" ON public.builder_feature_packages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.builder_members bm WHERE bm.builder_id = builder_feature_packages.builder_id AND bm.user_id = auth.uid() AND bm.deactivated_at IS NULL));

-- 23. society_feature_overrides
CREATE TABLE IF NOT EXISTS public.society_feature_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id uuid NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  feature_id uuid NOT NULL REFERENCES public.platform_features(id) ON DELETE CASCADE,
  is_enabled boolean NOT NULL,
  overridden_by uuid REFERENCES public.profiles(id),
  overridden_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(society_id, feature_id)
);
ALTER TABLE public.society_feature_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage all overrides" ON public.society_feature_overrides FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Society admins can view own overrides" ON public.society_feature_overrides FOR SELECT TO authenticated USING (public.is_society_admin(auth.uid(), society_id));
CREATE POLICY "Society admins can manage own overrides" ON public.society_feature_overrides FOR INSERT TO authenticated WITH CHECK (public.is_society_admin(auth.uid(), society_id));
CREATE POLICY "Society admins can update own overrides" ON public.society_feature_overrides FOR UPDATE TO authenticated USING (public.is_society_admin(auth.uid(), society_id));
CREATE POLICY "Society admins can delete own overrides" ON public.society_feature_overrides FOR DELETE TO authenticated USING (public.is_society_admin(auth.uid(), society_id));
CREATE POLICY "Society members can view overrides" ON public.society_feature_overrides FOR SELECT TO authenticated USING (public.get_user_society_id(auth.uid()) = society_id);

-- 24. Add extra columns to products and orders for services/rentals
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS service_duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS rental_period_type TEXT,
  ADD COLUMN IF NOT EXISTS min_rental_duration INTEGER,
  ADD COLUMN IF NOT EXISTS max_rental_duration INTEGER,
  ADD COLUMN IF NOT EXISTS condition TEXT,
  ADD COLUMN IF NOT EXISTS is_negotiable BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS location_required BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS available_slots JSONB;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'purchase',
  ADD COLUMN IF NOT EXISTS scheduled_date DATE,
  ADD COLUMN IF NOT EXISTS scheduled_time_start TIME,
  ADD COLUMN IF NOT EXISTS scheduled_time_end TIME,
  ADD COLUMN IF NOT EXISTS rental_start_date DATE,
  ADD COLUMN IF NOT EXISTS rental_end_date DATE,
  ADD COLUMN IF NOT EXISTS deposit_paid BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS deposit_refunded BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS coupon_id uuid REFERENCES public.coupons(id) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fulfillment_type text NOT NULL DEFAULT 'self_pickup',
  ADD COLUMN IF NOT EXISTS delivery_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS idempotency_key text;

-- Add new order_status enum values
DO $$ BEGIN
  ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'enquired';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'quoted';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'scheduled';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'in_progress';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'returned';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'ready';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 25. Helper functions
CREATE OR REPLACE FUNCTION public.is_builder_for_society(_user_id uuid, _society_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.builder_members bm
    JOIN public.builder_societies bs ON bs.builder_id = bm.builder_id
    WHERE bm.user_id = _user_id AND bs.society_id = _society_id AND bm.deactivated_at IS NULL
  )
$$;

CREATE OR REPLACE FUNCTION public.can_write_to_society(_user_id uuid, _society_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT (
    get_user_society_id(_user_id) = _society_id
    OR is_admin(_user_id)
    OR is_society_admin(_user_id, _society_id)
    OR is_builder_for_society(_user_id, _society_id)
  )
$$;

CREATE OR REPLACE FUNCTION public.is_builder_member(_user_id uuid, _builder_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.builder_members WHERE user_id = _user_id AND builder_id = _builder_id
  ) OR public.is_admin(_user_id)
$$;

CREATE OR REPLACE FUNCTION public.can_manage_society(_user_id uuid, _society_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_society_admin(_user_id, _society_id)
  OR EXISTS (
    SELECT 1 FROM public.builder_societies bs
    JOIN public.builder_members bm ON bm.builder_id = bs.builder_id
    WHERE bs.society_id = _society_id AND bm.user_id = _user_id
  )
$$;

-- builder_announcements policies (need is_builder_for_society)
CREATE POLICY "Builder members can create announcements" ON public.builder_announcements FOR INSERT WITH CHECK (is_builder_for_society(auth.uid(), society_id));
CREATE POLICY "Society members can read announcements" ON public.builder_announcements FOR SELECT
  USING (society_id IN (SELECT p.society_id FROM public.profiles p WHERE p.id = auth.uid() AND p.society_id IS NOT NULL)
    OR is_builder_for_society(auth.uid(), society_id)
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- 26. get_effective_society_features RPC
CREATE OR REPLACE FUNCTION public.get_effective_society_features(_society_id uuid)
RETURNS TABLE (feature_key text, is_enabled boolean, source text, society_configurable boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' SET statement_timeout TO '5s' AS $$
BEGIN
  RETURN QUERY
  WITH builder_for_society AS (
    SELECT bs.builder_id FROM builder_societies bs WHERE bs.society_id = _society_id LIMIT 1
  ),
  package_features AS (
    SELECT pf.feature_key, fpi.enabled AS is_enabled, pf.id AS feature_id, pf.is_core, pf.society_configurable
    FROM builder_for_society bfs
    JOIN builder_feature_packages bfp ON bfp.builder_id = bfs.builder_id AND (bfp.expires_at IS NULL OR bfp.expires_at > now())
    JOIN feature_package_items fpi ON fpi.package_id = bfp.package_id
    JOIN platform_features pf ON pf.id = fpi.feature_id
  ),
  overrides AS (
    SELECT sfo.feature_id, sfo.is_enabled FROM society_feature_overrides sfo WHERE sfo.society_id = _society_id
  )
  SELECT pf_agg.feature_key,
    CASE WHEN pf_agg.is_core THEN true WHEN o.feature_id IS NOT NULL THEN o.is_enabled ELSE pf_agg.is_enabled END,
    CASE WHEN pf_agg.is_core THEN 'core' WHEN o.feature_id IS NOT NULL THEN 'override' ELSE 'package' END,
    pf_agg.society_configurable
  FROM (SELECT pff.feature_key, pff.feature_id, pff.is_core, pff.society_configurable, bool_or(pff.is_enabled) AS is_enabled FROM package_features pff GROUP BY pff.feature_key, pff.feature_id, pff.is_core, pff.society_configurable) pf_agg
  LEFT JOIN overrides o ON o.feature_id = pf_agg.feature_id
  UNION ALL
  SELECT pf2.feature_key, true, 'core', pf2.society_configurable FROM platform_features pf2
  WHERE pf2.is_core = true AND NOT EXISTS (SELECT 1 FROM builder_for_society bfs2 JOIN builder_feature_packages bfp2 ON bfp2.builder_id = bfs2.builder_id JOIN feature_package_items fpi2 ON fpi2.package_id = bfp2.package_id AND fpi2.feature_id = pf2.id)
  UNION ALL
  SELECT pf3.feature_key,
    CASE WHEN pf3.is_core THEN true WHEN o3.feature_id IS NOT NULL THEN o3.is_enabled ELSE true END,
    CASE WHEN o3.feature_id IS NOT NULL THEN 'override' ELSE 'default' END,
    pf3.society_configurable
  FROM platform_features pf3
  LEFT JOIN society_feature_overrides o3 ON o3.feature_id = pf3.id AND o3.society_id = _society_id
  WHERE NOT EXISTS (SELECT 1 FROM builder_for_society);
END;
$$;

CREATE OR REPLACE FUNCTION public.is_feature_enabled_for_society(_society_id uuid, _feature_key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE((SELECT ef.is_enabled FROM public.get_effective_society_features(_society_id) ef WHERE ef.feature_key = _feature_key LIMIT 1), true)
$$;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.gate_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.manual_entry_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.builder_announcements;
