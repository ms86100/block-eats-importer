
-- =====================================================
-- BATCH 5-7: Remaining tables (infrastructure, workers, reports, archives)
-- =====================================================

-- 1. reports
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL,
  reported_user_id UUID,
  reported_seller_id UUID,
  report_type TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can create reports" ON public.reports FOR INSERT WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "Users can view their own reports" ON public.reports FOR SELECT USING (reporter_id = auth.uid() OR is_admin(auth.uid()));
CREATE POLICY "Admins can update reports" ON public.reports FOR UPDATE USING (is_admin(auth.uid()));
CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 2. warnings
CREATE TABLE IF NOT EXISTS public.warnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  issued_by UUID NOT NULL,
  reason TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning',
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.warnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own warnings" ON public.warnings FOR SELECT USING (user_id = auth.uid() OR is_admin(auth.uid()));
CREATE POLICY "Admins can create warnings" ON public.warnings FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Users can acknowledge their warnings" ON public.warnings FOR UPDATE USING (user_id = auth.uid() OR is_admin(auth.uid()));

-- 3. project_documents
CREATE TABLE IF NOT EXISTS public.project_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  tower_id UUID REFERENCES public.project_towers(id) ON DELETE SET NULL,
  category TEXT NOT NULL DEFAULT 'other',
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Society members can view documents" ON public.project_documents FOR SELECT USING (society_id = get_user_society_id(auth.uid()) OR is_admin(auth.uid()));
CREATE POLICY "Admins can insert documents" ON public.project_documents FOR INSERT WITH CHECK (uploaded_by = auth.uid() AND can_write_to_society(auth.uid(), society_id) AND (is_admin(auth.uid()) OR is_society_admin(auth.uid(), society_id) OR is_builder_for_society(auth.uid(), society_id)));
CREATE POLICY "Admins can update documents" ON public.project_documents FOR UPDATE USING (society_id = get_user_society_id(auth.uid()) AND is_admin(auth.uid()));
CREATE POLICY "Admins can delete documents" ON public.project_documents FOR DELETE USING (society_id = get_user_society_id(auth.uid()) AND is_admin(auth.uid()));

-- 4. project_questions
CREATE TABLE IF NOT EXISTS public.project_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  asked_by UUID NOT NULL REFERENCES public.profiles(id),
  category TEXT NOT NULL DEFAULT 'general',
  question_text TEXT NOT NULL,
  is_answered BOOLEAN NOT NULL DEFAULT false,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.project_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Society members can view questions" ON public.project_questions FOR SELECT USING (society_id = get_user_society_id(auth.uid()) OR is_admin(auth.uid()));
CREATE POLICY "Members can ask questions" ON public.project_questions FOR INSERT WITH CHECK (asked_by = auth.uid() AND can_write_to_society(auth.uid(), society_id));
CREATE POLICY "Admins can update questions" ON public.project_questions FOR UPDATE USING (society_id = get_user_society_id(auth.uid()) AND is_admin(auth.uid()));
CREATE POLICY "Authors and admins can delete questions" ON public.project_questions FOR DELETE USING (asked_by = auth.uid() OR (society_id = get_user_society_id(auth.uid()) AND is_admin(auth.uid())));

-- 5. project_answers
CREATE TABLE IF NOT EXISTS public.project_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.project_questions(id) ON DELETE CASCADE,
  answered_by UUID NOT NULL REFERENCES public.profiles(id),
  answer_text TEXT NOT NULL,
  is_official BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.project_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Society members can view answers" ON public.project_answers FOR SELECT USING (EXISTS (SELECT 1 FROM project_questions pq WHERE pq.id = project_answers.question_id AND (pq.society_id = get_user_society_id(auth.uid()) OR is_admin(auth.uid()))));
CREATE POLICY "Society members can post answers" ON public.project_answers FOR INSERT WITH CHECK (answered_by = auth.uid() AND EXISTS (SELECT 1 FROM project_questions pq WHERE pq.id = project_answers.question_id AND pq.society_id = get_user_society_id(auth.uid())));
CREATE POLICY "Admins can update answers" ON public.project_answers FOR UPDATE USING (answered_by = auth.uid() OR is_admin(auth.uid()));
CREATE POLICY "Authors and admins can delete answers" ON public.project_answers FOR DELETE USING (answered_by = auth.uid() OR is_admin(auth.uid()));

-- 6. parking_slots
CREATE TABLE IF NOT EXISTS public.parking_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  society_id UUID NOT NULL REFERENCES public.societies(id),
  slot_number TEXT NOT NULL,
  slot_type TEXT NOT NULL DEFAULT 'car',
  tower_id UUID REFERENCES public.project_towers(id),
  assigned_to UUID REFERENCES public.profiles(id),
  vehicle_number TEXT,
  vehicle_type TEXT,
  is_occupied BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(society_id, slot_number)
);
ALTER TABLE public.parking_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Society members can view parking slots" ON public.parking_slots FOR SELECT USING (society_id = get_user_society_id(auth.uid()) OR is_admin(auth.uid()));
CREATE POLICY "Admins can manage parking slots" ON public.parking_slots FOR ALL USING (is_society_admin(auth.uid(), society_id) OR is_admin(auth.uid()));

-- 7. parking_violations
CREATE TABLE IF NOT EXISTS public.parking_violations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  society_id UUID NOT NULL REFERENCES public.societies(id),
  slot_id UUID REFERENCES public.parking_slots(id),
  reported_by UUID NOT NULL REFERENCES public.profiles(id),
  vehicle_number TEXT,
  violation_type TEXT NOT NULL DEFAULT 'unauthorized',
  description TEXT,
  photo_url TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.parking_violations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Society members can view violations" ON public.parking_violations FOR SELECT USING (society_id = get_user_society_id(auth.uid()) OR is_admin(auth.uid()));
CREATE POLICY "Members can report violations" ON public.parking_violations FOR INSERT WITH CHECK (reported_by = auth.uid() AND can_write_to_society(auth.uid(), society_id));
CREATE POLICY "Admins can update violations" ON public.parking_violations FOR UPDATE USING (is_society_admin(auth.uid(), society_id) OR is_admin(auth.uid()));

-- 8. visitor_entries
CREATE TABLE IF NOT EXISTS public.visitor_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id uuid NOT NULL REFERENCES public.societies(id),
  resident_id uuid NOT NULL REFERENCES public.profiles(id),
  visitor_name text NOT NULL,
  visitor_phone text,
  visitor_type text NOT NULL DEFAULT 'guest',
  purpose text,
  expected_date date,
  expected_time time,
  otp_code text,
  otp_expires_at timestamptz,
  is_preapproved boolean NOT NULL DEFAULT false,
  is_recurring boolean NOT NULL DEFAULT false,
  recurring_days text[],
  status text NOT NULL DEFAULT 'expected',
  checked_in_at timestamptz,
  checked_out_at timestamptz,
  vehicle_number text,
  photo_url text,
  flat_number text,
  guard_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.visitor_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Residents can view own visitors" ON public.visitor_entries FOR SELECT USING (resident_id = auth.uid() OR (society_id = get_user_society_id(auth.uid()) AND (is_admin(auth.uid()) OR is_society_admin(auth.uid(), society_id))));
CREATE POLICY "Members can create visitor entries" ON public.visitor_entries FOR INSERT WITH CHECK (resident_id = auth.uid() AND can_write_to_society(auth.uid(), society_id));
CREATE POLICY "Residents can update own visitors" ON public.visitor_entries FOR UPDATE USING (resident_id = auth.uid() OR (society_id = get_user_society_id(auth.uid()) AND (is_admin(auth.uid()) OR is_society_admin(auth.uid(), society_id))));
CREATE POLICY "Residents can delete own visitors" ON public.visitor_entries FOR DELETE USING (resident_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_visitor_entries_society_status ON public.visitor_entries(society_id, status);

-- 9. payment_milestones
CREATE TABLE IF NOT EXISTS public.payment_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id uuid NOT NULL REFERENCES public.societies(id),
  tower_id uuid REFERENCES public.project_towers(id),
  title text NOT NULL,
  description text,
  milestone_stage text NOT NULL DEFAULT 'booking',
  amount_percentage numeric NOT NULL DEFAULT 0,
  due_date date,
  status text NOT NULL DEFAULT 'upcoming',
  linked_milestone_id uuid REFERENCES public.construction_milestones(id),
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Society members can view payment milestones" ON public.payment_milestones FOR SELECT USING (society_id = get_user_society_id(auth.uid()) OR is_admin(auth.uid()));
CREATE POLICY "Admins can manage payment milestones" ON public.payment_milestones FOR INSERT WITH CHECK (can_write_to_society(auth.uid(), society_id) AND (is_admin(auth.uid()) OR is_society_admin(auth.uid(), society_id) OR is_builder_for_society(auth.uid(), society_id)));
CREATE POLICY "Admins can update payment milestones" ON public.payment_milestones FOR UPDATE USING ((society_id = get_user_society_id(auth.uid()) AND (is_admin(auth.uid()) OR is_society_admin(auth.uid(), society_id))) OR is_admin(auth.uid()));
CREATE POLICY "Admins can delete payment milestones" ON public.payment_milestones FOR DELETE USING ((society_id = get_user_society_id(auth.uid()) AND (is_admin(auth.uid()) OR is_society_admin(auth.uid(), society_id))) OR is_admin(auth.uid()));

-- 10. resident_payments
CREATE TABLE IF NOT EXISTS public.resident_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id uuid NOT NULL REFERENCES public.payment_milestones(id),
  resident_id uuid NOT NULL REFERENCES public.profiles(id),
  society_id uuid NOT NULL REFERENCES public.societies(id),
  amount numeric NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  receipt_url text,
  transaction_reference text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(milestone_id, resident_id)
);
ALTER TABLE public.resident_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Residents can view own payments" ON public.resident_payments FOR SELECT USING (resident_id = auth.uid() OR (society_id = get_user_society_id(auth.uid()) AND (is_admin(auth.uid()) OR is_society_admin(auth.uid(), society_id))));
CREATE POLICY "Residents can update own payments" ON public.resident_payments FOR UPDATE USING (resident_id = auth.uid() OR (society_id = get_user_society_id(auth.uid()) AND (is_admin(auth.uid()) OR is_society_admin(auth.uid(), society_id))));
CREATE POLICY "Admins can insert payments" ON public.resident_payments FOR INSERT WITH CHECK ((society_id = get_user_society_id(auth.uid()) AND (is_admin(auth.uid()) OR is_society_admin(auth.uid(), society_id))) OR resident_id = auth.uid());

-- 11. inspection_checklists
CREATE TABLE IF NOT EXISTS public.inspection_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id uuid NOT NULL REFERENCES public.societies(id),
  tower_id uuid REFERENCES public.project_towers(id),
  flat_number text NOT NULL,
  resident_id uuid NOT NULL REFERENCES public.profiles(id),
  inspection_date date,
  status text NOT NULL DEFAULT 'draft',
  overall_score numeric DEFAULT 0,
  total_items integer NOT NULL DEFAULT 0,
  passed_items integer NOT NULL DEFAULT 0,
  failed_items integer NOT NULL DEFAULT 0,
  notes text,
  submitted_at timestamptz,
  builder_acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.inspection_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Residents can view own checklists" ON public.inspection_checklists FOR SELECT USING (resident_id = auth.uid() OR (society_id = get_user_society_id(auth.uid()) AND (is_admin(auth.uid()) OR is_society_admin(auth.uid(), society_id))) OR is_admin(auth.uid()));
CREATE POLICY "Members can create checklists" ON public.inspection_checklists FOR INSERT WITH CHECK (resident_id = auth.uid() AND can_write_to_society(auth.uid(), society_id));
CREATE POLICY "Residents can update own checklists" ON public.inspection_checklists FOR UPDATE USING (resident_id = auth.uid() OR (society_id = get_user_society_id(auth.uid()) AND (is_admin(auth.uid()) OR is_society_admin(auth.uid(), society_id))));

-- 12. inspection_items
CREATE TABLE IF NOT EXISTS public.inspection_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid NOT NULL REFERENCES public.inspection_checklists(id) ON DELETE CASCADE,
  category text NOT NULL,
  item_name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'not_checked',
  severity text DEFAULT 'minor',
  photo_urls text[] DEFAULT '{}',
  notes text,
  display_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.inspection_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Items visible with checklist access" ON public.inspection_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.inspection_checklists ic WHERE ic.id = inspection_items.checklist_id AND (ic.resident_id = auth.uid() OR (ic.society_id = get_user_society_id(auth.uid()) AND (is_admin(auth.uid()) OR is_society_admin(auth.uid(), ic.society_id))))));
CREATE POLICY "Owners can manage items" ON public.inspection_items FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.inspection_checklists ic WHERE ic.id = inspection_items.checklist_id AND ic.resident_id = auth.uid()));
CREATE POLICY "Owners can update items" ON public.inspection_items FOR UPDATE USING (EXISTS (SELECT 1 FROM public.inspection_checklists ic WHERE ic.id = inspection_items.checklist_id AND ic.resident_id = auth.uid()));
CREATE POLICY "Owners can delete items" ON public.inspection_items FOR DELETE USING (EXISTS (SELECT 1 FROM public.inspection_checklists ic WHERE ic.id = inspection_items.checklist_id AND ic.resident_id = auth.uid()));

-- 13. domestic_help_entries
CREATE TABLE IF NOT EXISTS public.domestic_help_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  society_id UUID NOT NULL REFERENCES public.societies(id),
  resident_id UUID NOT NULL REFERENCES public.profiles(id),
  help_name TEXT NOT NULL,
  help_phone TEXT,
  help_type TEXT NOT NULL DEFAULT 'maid',
  photo_url TEXT,
  flat_number TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.domestic_help_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Residents can view domestic help" ON public.domestic_help_entries FOR SELECT USING (society_id = get_user_society_id(auth.uid()) OR is_admin(auth.uid()));
CREATE POLICY "Members can add domestic help" ON public.domestic_help_entries FOR INSERT WITH CHECK (resident_id = auth.uid() AND can_write_to_society(auth.uid(), society_id));
CREATE POLICY "Residents can update domestic help" ON public.domestic_help_entries FOR UPDATE USING (resident_id = auth.uid() OR is_society_admin(auth.uid(), society_id) OR is_admin(auth.uid()));
CREATE POLICY "Residents can delete domestic help" ON public.domestic_help_entries FOR DELETE USING (resident_id = auth.uid() OR is_admin(auth.uid()));

-- 14. domestic_help_attendance
CREATE TABLE IF NOT EXISTS public.domestic_help_attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  help_entry_id UUID NOT NULL REFERENCES public.domestic_help_entries(id) ON DELETE CASCADE,
  society_id UUID NOT NULL REFERENCES public.societies(id),
  check_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  check_out_at TIMESTAMPTZ,
  marked_by UUID NOT NULL REFERENCES public.profiles(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.domestic_help_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Society members can view attendance" ON public.domestic_help_attendance FOR SELECT USING (society_id = get_user_society_id(auth.uid()) OR is_admin(auth.uid()));
CREATE POLICY "Members can mark attendance" ON public.domestic_help_attendance FOR INSERT WITH CHECK (marked_by = auth.uid() AND can_write_to_society(auth.uid(), society_id));
CREATE POLICY "Members can update attendance" ON public.domestic_help_attendance FOR UPDATE USING (marked_by = auth.uid() OR is_society_admin(auth.uid(), society_id) OR is_admin(auth.uid()));

-- 15. parcel_entries
CREATE TABLE IF NOT EXISTS public.parcel_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  society_id UUID NOT NULL REFERENCES public.societies(id),
  resident_id UUID NOT NULL REFERENCES public.profiles(id),
  flat_number TEXT,
  courier_name TEXT,
  tracking_number TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'received',
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  collected_at TIMESTAMPTZ,
  collected_by TEXT,
  photo_url TEXT,
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.parcel_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Residents can view their own parcels" ON public.parcel_entries FOR SELECT USING (resident_id = auth.uid() OR is_society_admin(auth.uid(), society_id) OR is_admin(auth.uid()));
CREATE POLICY "Members can log parcels" ON public.parcel_entries FOR INSERT WITH CHECK (resident_id = auth.uid() AND can_write_to_society(auth.uid(), society_id));
CREATE POLICY "Admins can update parcels" ON public.parcel_entries FOR UPDATE USING (resident_id = auth.uid() OR is_society_admin(auth.uid(), society_id) OR is_admin(auth.uid()));
CREATE POLICY "Admins can delete parcels" ON public.parcel_entries FOR DELETE USING (is_society_admin(auth.uid(), society_id) OR is_admin(auth.uid()));

-- 16. delivery_partners
CREATE TABLE IF NOT EXISTS public.delivery_partners (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  society_id uuid NOT NULL REFERENCES public.societies(id),
  name text NOT NULL,
  provider_type text NOT NULL DEFAULT '3pl',
  api_config jsonb DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.delivery_partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Society members can view delivery partners" ON public.delivery_partners FOR SELECT USING (society_id = public.get_user_society_id(auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage delivery partners" ON public.delivery_partners FOR INSERT WITH CHECK (public.is_admin(auth.uid()) OR public.is_society_admin(auth.uid(), society_id));
CREATE POLICY "Admins can update delivery partners" ON public.delivery_partners FOR UPDATE USING (public.is_admin(auth.uid()) OR public.is_society_admin(auth.uid(), society_id));
CREATE TRIGGER update_delivery_partners_updated_at BEFORE UPDATE ON public.delivery_partners FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 17. delivery_assignments
CREATE TABLE IF NOT EXISTS public.delivery_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id),
  partner_id uuid REFERENCES public.delivery_partners(id),
  society_id uuid NOT NULL REFERENCES public.societies(id),
  rider_name text,
  rider_phone text,
  rider_photo_url text,
  status text NOT NULL DEFAULT 'pending',
  gate_entry_id uuid,
  otp_hash text,
  otp_expires_at timestamptz,
  otp_attempt_count integer NOT NULL DEFAULT 0,
  max_otp_attempts integer NOT NULL DEFAULT 3,
  delivery_fee numeric NOT NULL DEFAULT 0,
  partner_payout numeric NOT NULL DEFAULT 0,
  platform_margin numeric NOT NULL DEFAULT 0,
  pickup_at timestamptz,
  at_gate_at timestamptz,
  delivered_at timestamptz,
  failed_reason text,
  attempt_count integer NOT NULL DEFAULT 0,
  external_tracking_id text,
  idempotency_key text NOT NULL,
  eta_minutes int,
  distance_meters int,
  last_location_lat double precision,
  last_location_lng double precision,
  last_location_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT delivery_assignments_order_id_key UNIQUE (order_id),
  CONSTRAINT delivery_assignments_idempotency_key UNIQUE (idempotency_key)
);
ALTER TABLE public.delivery_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Relevant users can view delivery assignments" ON public.delivery_assignments FOR SELECT USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.buyer_id = auth.uid() OR EXISTS (SELECT 1 FROM public.seller_profiles sp WHERE sp.id = o.seller_id AND sp.user_id = auth.uid()))) OR public.is_admin(auth.uid()) OR public.is_society_admin(auth.uid(), society_id));
CREATE TRIGGER update_delivery_assignments_updated_at BEFORE UPDATE ON public.delivery_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE INDEX IF NOT EXISTS idx_delivery_assignments_society ON public.delivery_assignments(society_id);

-- 18. delivery_tracking_logs
CREATE TABLE IF NOT EXISTS public.delivery_tracking_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id uuid NOT NULL REFERENCES public.delivery_assignments(id),
  status text NOT NULL,
  location_lat numeric,
  location_lng numeric,
  note text,
  source text NOT NULL DEFAULT 'system',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.delivery_tracking_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Relevant users can view tracking logs" ON public.delivery_tracking_logs FOR SELECT USING (EXISTS (SELECT 1 FROM public.delivery_assignments da JOIN public.orders o ON o.id = da.order_id WHERE da.id = assignment_id AND (o.buyer_id = auth.uid() OR EXISTS (SELECT 1 FROM public.seller_profiles sp WHERE sp.id = o.seller_id AND sp.user_id = auth.uid()) OR public.is_admin(auth.uid()) OR public.is_society_admin(auth.uid(), da.society_id))));

-- 19. delivery_locations
CREATE TABLE IF NOT EXISTS public.delivery_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.delivery_assignments(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  speed_kmh double precision,
  heading double precision,
  accuracy_meters double precision,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.delivery_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "delivery_locations_select" ON public.delivery_locations FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.delivery_assignments da JOIN public.orders o ON o.id = da.order_id WHERE da.id = delivery_locations.assignment_id AND (o.buyer_id = auth.uid() OR EXISTS (SELECT 1 FROM public.seller_profiles sp WHERE sp.id = o.seller_id AND sp.user_id = auth.uid()))));

-- 20. collective_escalations
CREATE TABLE IF NOT EXISTS public.collective_escalations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  society_id UUID NOT NULL REFERENCES public.societies(id),
  category TEXT NOT NULL,
  tower_id UUID REFERENCES public.project_towers(id),
  snag_count INTEGER NOT NULL DEFAULT 0,
  resident_count INTEGER NOT NULL DEFAULT 0,
  sample_photos TEXT[] DEFAULT '{}'::TEXT[],
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);
ALTER TABLE public.collective_escalations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Society members can view escalations" ON public.collective_escalations FOR SELECT USING (society_id = get_user_society_id(auth.uid()) OR is_admin(auth.uid()));
CREATE POLICY "Admins can update escalations" ON public.collective_escalations FOR UPDATE USING (is_society_admin(auth.uid(), society_id) OR is_admin(auth.uid()));
CREATE POLICY "Service role inserts escalations" ON public.collective_escalations FOR INSERT WITH CHECK (true);

-- 21. society_reports
CREATE TABLE IF NOT EXISTS public.society_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  society_id UUID NOT NULL REFERENCES public.societies(id),
  report_month TEXT NOT NULL,
  report_data JSONB NOT NULL DEFAULT '{}'::JSONB,
  trust_score NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(society_id, report_month)
);
ALTER TABLE public.society_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Society members can view reports" ON public.society_reports FOR SELECT USING (society_id = get_user_society_id(auth.uid()) OR is_admin(auth.uid()));
CREATE POLICY "Service role inserts reports" ON public.society_reports FOR INSERT WITH CHECK (true);

-- 22. society_workers
CREATE TABLE IF NOT EXISTS public.society_workers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  society_id uuid NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  worker_type text NOT NULL DEFAULT 'general',
  skills jsonb DEFAULT '[]'::jsonb,
  languages text[] DEFAULT '{}',
  is_verified boolean DEFAULT false,
  is_available boolean DEFAULT true,
  rating numeric(3,2) DEFAULT 0,
  total_jobs integer DEFAULT 0,
  total_ratings integer DEFAULT 0,
  photo_url text,
  status text NOT NULL DEFAULT 'active',
  suspension_reason text,
  allowed_shift_start time,
  allowed_shift_end time,
  active_days text[] DEFAULT '{Mon,Tue,Wed,Thu,Fri,Sat,Sun}',
  entry_frequency text DEFAULT 'daily',
  emergency_contact_phone text,
  category_id uuid,
  registered_by uuid REFERENCES public.profiles(id),
  deactivated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, society_id)
);
ALTER TABLE public.society_workers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workers can view own record" ON public.society_workers FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Society admin manages workers" ON public.society_workers FOR ALL TO authenticated USING (public.is_society_admin(auth.uid(), society_id)) WITH CHECK (public.is_society_admin(auth.uid(), society_id));
CREATE POLICY "Residents can view society workers" ON public.society_workers FOR SELECT TO authenticated USING (society_id = public.get_user_society_id(auth.uid()) AND is_available = true AND deactivated_at IS NULL);
CREATE POLICY "Platform admin full access workers" ON public.society_workers FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Worker can update own record" ON public.society_workers FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER update_society_workers_updated_at BEFORE UPDATE ON public.society_workers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 23. society_worker_categories
CREATE TABLE IF NOT EXISTS public.society_worker_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  society_id uuid NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  name text NOT NULL,
  icon text DEFAULT '👤',
  requires_background_check boolean DEFAULT false,
  requires_security_training boolean DEFAULT false,
  entry_type text NOT NULL DEFAULT 'daily',
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(society_id, name)
);
ALTER TABLE public.society_worker_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Society members can view categories" ON public.society_worker_categories FOR SELECT TO authenticated USING (society_id = public.get_user_society_id(auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "Society admins can manage categories" ON public.society_worker_categories FOR INSERT TO authenticated WITH CHECK (public.is_society_admin(auth.uid(), society_id));
CREATE POLICY "Society admins can update categories" ON public.society_worker_categories FOR UPDATE TO authenticated USING (public.is_society_admin(auth.uid(), society_id));
CREATE POLICY "Society admins can delete categories" ON public.society_worker_categories FOR DELETE TO authenticated USING (public.is_society_admin(auth.uid(), society_id));
CREATE TRIGGER trg_update_worker_categories_updated_at BEFORE UPDATE ON public.society_worker_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 24. worker_flat_assignments
CREATE TABLE IF NOT EXISTS public.worker_flat_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id uuid NOT NULL REFERENCES public.society_workers(id) ON DELETE CASCADE,
  society_id uuid NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  flat_number text NOT NULL,
  resident_id uuid REFERENCES public.profiles(id),
  assigned_by uuid REFERENCES public.profiles(id),
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(worker_id, flat_number, society_id)
);
ALTER TABLE public.worker_flat_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Society members can view flat assignments" ON public.worker_flat_assignments FOR SELECT TO authenticated USING (society_id = public.get_user_society_id(auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "Admins and residents can insert flat assignments" ON public.worker_flat_assignments FOR INSERT TO authenticated WITH CHECK (public.is_society_admin(auth.uid(), society_id) OR resident_id = auth.uid());
CREATE POLICY "Admins and residents can update flat assignments" ON public.worker_flat_assignments FOR UPDATE TO authenticated USING (public.is_society_admin(auth.uid(), society_id) OR resident_id = auth.uid());
CREATE POLICY "Admins and residents can delete flat assignments" ON public.worker_flat_assignments FOR DELETE TO authenticated USING (public.is_society_admin(auth.uid(), society_id) OR resident_id = auth.uid());

-- 25. worker_entry_logs
CREATE TABLE IF NOT EXISTS public.worker_entry_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id uuid NOT NULL REFERENCES public.society_workers(id),
  society_id uuid NOT NULL REFERENCES public.societies(id),
  gate_entry_id uuid REFERENCES public.gate_entries(id),
  entry_time timestamptz NOT NULL DEFAULT now(),
  exit_time timestamptz,
  validation_result text NOT NULL DEFAULT 'allowed',
  denial_reason text,
  verified_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.worker_entry_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Society members can view entry logs" ON public.worker_entry_logs FOR SELECT TO authenticated USING (society_id = public.get_user_society_id(auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "Security officers can insert entry logs" ON public.worker_entry_logs FOR INSERT TO authenticated WITH CHECK (public.is_security_officer(auth.uid(), society_id) OR public.is_society_admin(auth.uid(), society_id));
CREATE POLICY "Security officers can update entry logs" ON public.worker_entry_logs FOR UPDATE TO authenticated USING (public.is_security_officer(auth.uid(), society_id) OR public.is_society_admin(auth.uid(), society_id));

-- 26. worker_ratings
CREATE TABLE IF NOT EXISTS public.worker_ratings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id uuid NOT NULL REFERENCES public.society_workers(id) ON DELETE CASCADE,
  society_id uuid NOT NULL REFERENCES public.societies(id),
  rated_by uuid NOT NULL REFERENCES public.profiles(id),
  rating integer NOT NULL,
  review text,
  month text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(worker_id, rated_by, month)
);
ALTER TABLE public.worker_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Society members can view ratings" ON public.worker_ratings FOR SELECT TO authenticated USING (society_id = public.get_user_society_id(auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "Residents can rate workers" ON public.worker_ratings FOR INSERT TO authenticated WITH CHECK (rated_by = auth.uid() AND society_id = public.get_user_society_id(auth.uid()));

-- 27. worker_job_requests
CREATE TABLE IF NOT EXISTS public.worker_job_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id uuid NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  resident_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  job_type text NOT NULL,
  description text,
  price numeric(10,2),
  duration_hours integer DEFAULT 1,
  start_time timestamptz,
  location_details text,
  urgency text DEFAULT 'normal',
  status text NOT NULL DEFAULT 'open',
  accepted_by uuid REFERENCES public.profiles(id),
  accepted_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  expires_at timestamptz DEFAULT (now() + interval '24 hours'),
  payment_status text DEFAULT 'pending',
  payment_amount numeric(10,2),
  resident_rating integer,
  worker_rating integer,
  resident_review text,
  worker_review text,
  voice_summary_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.worker_job_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can create job requests" ON public.worker_job_requests FOR INSERT TO authenticated WITH CHECK (resident_id = auth.uid() AND can_write_to_society(auth.uid(), society_id));
CREATE POLICY "Resident can view own job requests" ON public.worker_job_requests FOR SELECT TO authenticated USING (resident_id = auth.uid());
CREATE POLICY "Worker can view open jobs in society" ON public.worker_job_requests FOR SELECT TO authenticated USING (status = 'open' AND society_id IN (SELECT sw.society_id FROM public.society_workers sw WHERE sw.user_id = auth.uid() AND sw.deactivated_at IS NULL));
CREATE POLICY "Worker can view accepted jobs" ON public.worker_job_requests FOR SELECT TO authenticated USING (accepted_by = auth.uid());
CREATE POLICY "Resident can update own job" ON public.worker_job_requests FOR UPDATE TO authenticated USING (resident_id = auth.uid()) WITH CHECK (resident_id = auth.uid());
CREATE POLICY "Worker can update job" ON public.worker_job_requests FOR UPDATE TO authenticated USING (accepted_by = auth.uid() OR (status = 'open' AND society_id IN (SELECT sw.society_id FROM public.society_workers sw WHERE sw.user_id = auth.uid() AND sw.deactivated_at IS NULL))) WITH CHECK (true);
CREATE POLICY "Society admin manages job requests" ON public.worker_job_requests FOR ALL TO authenticated USING (public.is_society_admin(auth.uid(), society_id)) WITH CHECK (public.is_society_admin(auth.uid(), society_id));
CREATE POLICY "Platform admin full access jobs" ON public.worker_job_requests FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER update_worker_jobs_updated_at BEFORE UPDATE ON public.worker_job_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 28. ai_review_log
CREATE TABLE IF NOT EXISTS public.ai_review_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  decision text NOT NULL,
  confidence numeric(4,3) NOT NULL DEFAULT 0,
  reason text,
  rule_hits jsonb DEFAULT '[]'::jsonb,
  input_snapshot jsonb DEFAULT '{}'::jsonb,
  model_used text,
  society_id uuid REFERENCES public.societies(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_review_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Platform admins can view AI review logs" ON public.ai_review_log FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE INDEX IF NOT EXISTS idx_ai_review_log_target ON public.ai_review_log (target_type, target_id);

-- 29. test_results
CREATE TABLE IF NOT EXISTS public.test_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id TEXT NOT NULL,
  module_name TEXT NOT NULL,
  test_name TEXT NOT NULL,
  page_or_api_url TEXT,
  input_data JSONB,
  outcome TEXT NOT NULL DEFAULT 'passed',
  duration_ms NUMERIC,
  response_payload JSONB,
  error_message TEXT,
  error_code TEXT,
  http_status_code INTEGER,
  file_path TEXT,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow insert for all" ON public.test_results FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow read for authenticated" ON public.test_results FOR SELECT USING (true);

-- 30. orders_archive
CREATE TABLE IF NOT EXISTS public.orders_archive (
  id uuid PRIMARY KEY,
  buyer_id uuid,
  seller_id uuid,
  society_id uuid,
  status text,
  total_amount numeric NOT NULL,
  payment_status text,
  payment_type text,
  order_type text,
  notes text,
  delivery_address text,
  rejection_reason text,
  discount_amount numeric DEFAULT 0,
  coupon_id uuid,
  deposit_paid boolean DEFAULT false,
  deposit_refunded boolean DEFAULT false,
  rental_start_date date,
  rental_end_date date,
  scheduled_date date,
  scheduled_time_start time,
  scheduled_time_end time,
  auto_cancel_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  archived_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.orders_archive ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Only admins can view archived orders" ON public.orders_archive FOR SELECT TO authenticated USING (is_admin(auth.uid()));

-- 31. audit_log_archive
CREATE TABLE IF NOT EXISTS public.audit_log_archive (
  id uuid PRIMARY KEY,
  actor_id uuid,
  society_id uuid,
  target_type text NOT NULL,
  target_id uuid,
  action text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_log_archive ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Only admins can view archived audit logs" ON public.audit_log_archive FOR SELECT TO authenticated USING (is_admin(auth.uid()));

-- 32. rate_limits
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  count integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  UNIQUE (key)
);
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.collective_escalations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.worker_job_requests;

-- Add society security columns
ALTER TABLE public.societies
  ADD COLUMN IF NOT EXISTS security_mode text DEFAULT 'basic',
  ADD COLUMN IF NOT EXISTS security_confirmation_timeout_seconds integer DEFAULT 120;

-- Add idempotency key index on orders
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency_key ON public.orders (idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Add category_id FK to society_workers (deferred since table created in same migration)
DO $$ BEGIN
  ALTER TABLE public.society_workers ADD CONSTRAINT fk_workers_category FOREIGN KEY (category_id) REFERENCES public.society_worker_categories(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
