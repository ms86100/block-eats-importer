
-- Phase 2: Service features tables

-- 1. Add service feature flags to category_config
ALTER TABLE public.category_config
  ADD COLUMN IF NOT EXISTS supports_addons boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS supports_recurring boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS supports_staff_assignment boolean NOT NULL DEFAULT false;

-- 2. Service staff table
CREATE TABLE public.service_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  photo_url text,
  specializations text[] DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.service_staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read service staff"
  ON public.service_staff FOR SELECT TO authenticated USING (true);

CREATE POLICY "Sellers can manage their own staff"
  ON public.service_staff FOR ALL TO authenticated
  USING (seller_id IN (SELECT id FROM public.seller_profiles WHERE user_id = auth.uid()))
  WITH CHECK (seller_id IN (SELECT id FROM public.seller_profiles WHERE user_id = auth.uid()));

CREATE TRIGGER update_service_staff_updated_at
  BEFORE UPDATE ON public.service_staff
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 3. Service addons table
CREATE TABLE public.service_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.service_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read active addons"
  ON public.service_addons FOR SELECT TO authenticated USING (true);

CREATE POLICY "Sellers can manage addons for their products"
  ON public.service_addons FOR ALL TO authenticated
  USING (product_id IN (SELECT id FROM public.products WHERE seller_id IN (SELECT id FROM public.seller_profiles WHERE user_id = auth.uid())))
  WITH CHECK (product_id IN (SELECT id FROM public.products WHERE seller_id IN (SELECT id FROM public.seller_profiles WHERE user_id = auth.uid())));

-- 4. Service booking addons junction table
CREATE TABLE public.service_booking_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.service_bookings(id) ON DELETE CASCADE,
  addon_id uuid NOT NULL REFERENCES public.service_addons(id) ON DELETE CASCADE,
  addon_name text NOT NULL,
  addon_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.service_booking_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own booking addons"
  ON public.service_booking_addons FOR SELECT TO authenticated
  USING (booking_id IN (SELECT id FROM public.service_bookings WHERE buyer_id = auth.uid() OR seller_id IN (SELECT id FROM public.seller_profiles WHERE user_id = auth.uid())));

CREATE POLICY "Authenticated can insert booking addons"
  ON public.service_booking_addons FOR INSERT TO authenticated
  WITH CHECK (booking_id IN (SELECT id FROM public.service_bookings WHERE buyer_id = auth.uid()));

-- 5. Add staff_id to service_bookings
ALTER TABLE public.service_bookings
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.service_staff(id) ON DELETE SET NULL;

-- 6. Recurring booking configs
CREATE TABLE public.service_recurring_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.service_bookings(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  frequency text NOT NULL DEFAULT 'weekly',
  day_of_week integer NOT NULL,
  preferred_time time NOT NULL,
  start_date date NOT NULL,
  end_date date,
  is_active boolean NOT NULL DEFAULT true,
  last_generated_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.service_recurring_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can read their own recurring configs"
  ON public.service_recurring_configs FOR SELECT TO authenticated
  USING (buyer_id = auth.uid());

CREATE POLICY "Buyers can manage their own recurring configs"
  ON public.service_recurring_configs FOR ALL TO authenticated
  USING (buyer_id = auth.uid())
  WITH CHECK (buyer_id = auth.uid());

CREATE POLICY "Sellers can read recurring configs for their bookings"
  ON public.service_recurring_configs FOR SELECT TO authenticated
  USING (seller_id IN (SELECT id FROM public.seller_profiles WHERE user_id = auth.uid()));

CREATE TRIGGER update_recurring_config_updated_at
  BEFORE UPDATE ON public.service_recurring_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 7. Add reminder tracking to service_bookings
ALTER TABLE public.service_bookings
  ADD COLUMN IF NOT EXISTS reminder_24h_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_1h_sent_at timestamptz;
