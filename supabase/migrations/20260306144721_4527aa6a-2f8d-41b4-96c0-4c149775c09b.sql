
-- Create handle_new_user trigger function that auto-creates profile + buyer role
-- This runs as SECURITY DEFINER so it bypasses RLS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _meta jsonb;
  _society_id uuid;
  _raw_society text;
  _verification_status text := 'pending';
BEGIN
  _meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  
  -- Extract and validate society_id from metadata
  _raw_society := _meta->>'society_id';
  IF _raw_society IS NOT NULL 
     AND _raw_society != 'pending' 
     AND _raw_society ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    _society_id := _raw_society::uuid;
    -- Check if society has auto-approve
    IF EXISTS (SELECT 1 FROM public.societies WHERE id = _society_id AND auto_approve_residents = true) THEN
      _verification_status := 'approved';
    END IF;
  ELSE
    _society_id := NULL;
  END IF;

  -- Insert profile
  INSERT INTO public.profiles (
    id, email, name, phone, flat_number, block, phase, society_id, verification_status
  ) VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(_meta->>'name', _meta->>'full_name', 'User'),
    _meta->>'phone',
    COALESCE(_meta->>'flat_number', ''),
    COALESCE(_meta->>'block', ''),
    _meta->>'phase',
    _society_id,
    _verification_status
  )
  ON CONFLICT (id) DO UPDATE SET
    society_id = COALESCE(EXCLUDED.society_id, profiles.society_id),
    name = COALESCE(NULLIF(EXCLUDED.name, 'User'), profiles.name),
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    flat_number = COALESCE(NULLIF(EXCLUDED.flat_number, ''), profiles.flat_number),
    block = COALESCE(NULLIF(EXCLUDED.block, ''), profiles.block),
    phase = COALESCE(EXCLUDED.phase, profiles.phase);

  -- Insert default buyer role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'buyer')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
