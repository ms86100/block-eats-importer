
-- 1. Slot soft-locking table
CREATE TABLE public.slot_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID REFERENCES public.service_slots(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '5 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_slot_holds_slot_id ON public.slot_holds(slot_id);
CREATE INDEX idx_slot_holds_expires ON public.slot_holds(expires_at);

ALTER TABLE public.slot_holds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own holds" ON public.slot_holds FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can read their own holds" ON public.slot_holds FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own holds" ON public.slot_holds FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- RPC to hold a slot (upsert, auto-clean expired)
CREATE OR REPLACE FUNCTION public.hold_service_slot(_slot_id uuid, _user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Clean expired holds
  DELETE FROM public.slot_holds WHERE expires_at < now();
  
  -- Check if another user holds this slot
  IF EXISTS (SELECT 1 FROM public.slot_holds WHERE slot_id = _slot_id AND user_id != _user_id AND expires_at > now()) THEN
    RETURN json_build_object('success', false, 'error', 'Slot is temporarily held by another user');
  END IF;
  
  -- Upsert hold for this user
  INSERT INTO public.slot_holds (slot_id, user_id, expires_at)
  VALUES (_slot_id, _user_id, now() + interval '5 minutes')
  ON CONFLICT DO NOTHING;
  
  RETURN json_build_object('success', true);
END;
$$;

-- RPC to release a hold
CREATE OR REPLACE FUNCTION public.release_slot_hold(_slot_id uuid, _user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.slot_holds WHERE slot_id = _slot_id AND user_id = _user_id;
END;
$$;

-- 2. Preparation instructions on service_listings
ALTER TABLE public.service_listings ADD COLUMN IF NOT EXISTS preparation_instructions TEXT;

-- 3. Slot waitlist table
CREATE TABLE public.slot_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID REFERENCES public.service_slots(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  buyer_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notified_at TIMESTAMPTZ,
  UNIQUE(slot_id, buyer_id)
);

CREATE INDEX idx_slot_waitlist_slot ON public.slot_waitlist(slot_id);

ALTER TABLE public.slot_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can join waitlist" ON public.slot_waitlist FOR INSERT TO authenticated WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Buyers can view own waitlist" ON public.slot_waitlist FOR SELECT TO authenticated USING (auth.uid() = buyer_id);
CREATE POLICY "Buyers can leave waitlist" ON public.slot_waitlist FOR DELETE TO authenticated USING (auth.uid() = buyer_id);

-- Trigger: when a slot's booked_count decreases, notify first waitlisted buyer
CREATE OR REPLACE FUNCTION public.notify_waitlist_on_slot_release()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _waitlisted record;
  _product_name text;
BEGIN
  IF NEW.booked_count < OLD.booked_count AND NEW.booked_count < NEW.max_capacity THEN
    SELECT * INTO _waitlisted FROM public.slot_waitlist
    WHERE slot_id = NEW.id AND notified_at IS NULL
    ORDER BY created_at LIMIT 1;
    
    IF _waitlisted IS NOT NULL THEN
      SELECT name INTO _product_name FROM public.products WHERE id = _waitlisted.product_id;
      
      INSERT INTO public.notification_queue (user_id, type, title, body, reference_path, payload)
      VALUES (
        _waitlisted.buyer_id,
        'order',
        '🎉 Slot Available!',
        COALESCE(_product_name, 'A service') || ' slot on ' || NEW.slot_date || ' at ' || LEFT(NEW.start_time::text, 5) || ' is now available. Book now!',
        '/marketplace',
        jsonb_build_object('type', 'waitlist', 'slotId', NEW.id::text, 'productId', _waitlisted.product_id::text)
      );
      
      UPDATE public.slot_waitlist SET notified_at = now() WHERE id = _waitlisted.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_waitlist_on_slot_release
AFTER UPDATE OF booked_count ON public.service_slots
FOR EACH ROW EXECUTE FUNCTION public.notify_waitlist_on_slot_release();
