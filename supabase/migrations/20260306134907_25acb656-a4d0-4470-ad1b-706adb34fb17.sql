
-- ============================================================
-- BATCH 2: Supporting tables + get_user_auth_context function
-- ============================================================

-- 1. Additional columns on societies that the app expects
ALTER TABLE public.societies
  ADD COLUMN IF NOT EXISTS auto_approve_residents boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_method text DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS builder_id uuid,
  ADD COLUMN IF NOT EXISTS max_society_admins integer DEFAULT 5;

-- 2. Society Admins table
CREATE TABLE IF NOT EXISTS public.society_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id uuid NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'admin',
  appointed_by uuid REFERENCES public.profiles(id),
  deactivated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(society_id, user_id)
);
ALTER TABLE public.society_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Society members can view admins" ON public.society_admins
  FOR SELECT TO authenticated
  USING (society_id = get_user_society_id(auth.uid()) OR is_admin(auth.uid()));

CREATE POLICY "Society admins can insert" ON public.society_admins
  FOR INSERT TO authenticated
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Society admins can update" ON public.society_admins
  FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()));

-- 3. Builders table
CREATE TABLE IF NOT EXISTS public.builders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_url text,
  contact_email text,
  contact_phone text,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.builders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active builders" ON public.builders
  FOR SELECT TO authenticated
  USING (is_active = true OR is_admin(auth.uid()));

CREATE POLICY "Admins can manage builders" ON public.builders
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- 4. Builder Members table
CREATE TABLE IF NOT EXISTS public.builder_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_id uuid NOT NULL REFERENCES public.builders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  deactivated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(builder_id, user_id)
);
ALTER TABLE public.builder_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Builder members can view their builder" ON public.builder_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Admins can manage builder members" ON public.builder_members
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- 5. Security Staff table
CREATE TABLE IF NOT EXISTS public.security_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  society_id uuid NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'security_officer',
  is_active boolean DEFAULT true,
  deactivated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.security_staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Society members can view security staff" ON public.security_staff
  FOR SELECT TO authenticated
  USING (society_id = get_user_society_id(auth.uid()) OR is_admin(auth.uid()));

CREATE POLICY "Admins can manage security staff" ON public.security_staff
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- 6. Unique partial indexes on profiles (prevent duplicate email/phone)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_unique
  ON public.profiles (email)
  WHERE email IS NOT NULL AND email != '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_phone_unique
  ON public.profiles (phone)
  WHERE phone IS NOT NULL AND phone != '';

-- 7. Auto-approve resident trigger
CREATE OR REPLACE FUNCTION public.auto_approve_resident()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.society_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.societies
      WHERE id = NEW.society_id AND auto_approve_residents = true
    ) THEN
      NEW.verification_status := 'approved';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_approve_resident
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_approve_resident();

-- 8. is_society_admin helper function
CREATE OR REPLACE FUNCTION public.is_society_admin(_user_id uuid, _society_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.society_admins
    WHERE user_id = _user_id
      AND society_id = _society_id
      AND deactivated_at IS NULL
  ) OR public.is_admin(_user_id)
$$;

-- 9. is_security_officer function (called by the app)
CREATE OR REPLACE FUNCTION public.is_security_officer(_user_id uuid, _society_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.security_staff
    WHERE user_id = _user_id
      AND society_id = _society_id
      AND is_active = true
      AND deactivated_at IS NULL
  )
$$;

-- 10. get_user_auth_context — the critical function the frontend calls
CREATE OR REPLACE FUNCTION public.get_user_auth_context(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _profile jsonb;
  _society jsonb;
  _roles jsonb;
  _seller_profiles jsonb;
  _society_admin_role jsonb;
  _builder_ids jsonb;
  _is_security_officer boolean;
  _is_worker boolean;
  _society_id uuid;
BEGIN
  -- Profile
  SELECT to_jsonb(p.*) INTO _profile
  FROM public.profiles p
  WHERE p.id = _user_id;

  IF _profile IS NULL THEN
    RETURN jsonb_build_object(
      'profile', null,
      'society', null,
      'roles', '[]'::jsonb,
      'seller_profiles', '[]'::jsonb,
      'society_admin_role', null,
      'builder_ids', '[]'::jsonb,
      'is_security_officer', false,
      'is_worker', false
    );
  END IF;

  _society_id := (_profile->>'society_id')::uuid;

  -- Society
  IF _society_id IS NOT NULL THEN
    SELECT to_jsonb(s.*) INTO _society
    FROM public.societies s
    WHERE s.id = _society_id;
  END IF;

  -- Roles
  SELECT coalesce(jsonb_agg(to_jsonb(r.*)), '[]'::jsonb) INTO _roles
  FROM public.user_roles r
  WHERE r.user_id = _user_id;

  -- Seller profiles
  SELECT coalesce(jsonb_agg(to_jsonb(sp.*)), '[]'::jsonb) INTO _seller_profiles
  FROM public.seller_profiles sp
  WHERE sp.user_id = _user_id;

  -- Society admin role
  SELECT to_jsonb(sa.*) INTO _society_admin_role
  FROM public.society_admins sa
  WHERE sa.user_id = _user_id
    AND sa.deactivated_at IS NULL
  LIMIT 1;

  -- Builder IDs
  SELECT coalesce(jsonb_agg(bm.builder_id), '[]'::jsonb) INTO _builder_ids
  FROM public.builder_members bm
  WHERE bm.user_id = _user_id
    AND bm.deactivated_at IS NULL;

  -- Security officer check
  IF _society_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.security_staff
      WHERE user_id = _user_id AND society_id = _society_id AND is_active = true AND deactivated_at IS NULL
    ) INTO _is_security_officer;
  ELSE
    _is_security_officer := false;
  END IF;

  -- Worker check
  _is_worker := public.has_role(_user_id, 'security_officer');

  RETURN jsonb_build_object(
    'profile', _profile,
    'society', _society,
    'roles', _roles,
    'seller_profiles', _seller_profiles,
    'society_admin_role', _society_admin_role,
    'builder_ids', _builder_ids,
    'is_security_officer', _is_security_officer,
    'is_worker', _is_worker
  );
END;
$$;

-- 11. Enable realtime for role-related tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_roles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.security_staff;
ALTER PUBLICATION supabase_realtime ADD TABLE public.society_admins;
ALTER PUBLICATION supabase_realtime ADD TABLE public.builder_members;

-- 12. Performance indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role ON public.user_roles(user_id, role);
CREATE INDEX IF NOT EXISTS idx_profiles_society_verification ON public.profiles(society_id, verification_status);
CREATE INDEX IF NOT EXISTS idx_seller_profiles_society_verification ON public.seller_profiles(society_id, verification_status);
CREATE INDEX IF NOT EXISTS idx_orders_buyer_status ON public.orders(buyer_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_seller_status ON public.orders(seller_id, status);
