
-- ============================================================
-- BATCH 3: Community, Governance & Activity Tables
-- ============================================================

-- Add missing columns to societies
ALTER TABLE public.societies
  ADD COLUMN IF NOT EXISTS is_under_construction boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trust_score numeric NOT NULL DEFAULT 0;

-- ===================== BULLETIN BOARD =====================

CREATE TABLE public.bulletin_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id uuid NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'alert',
  title text NOT NULL,
  body text,
  attachment_urls text[] DEFAULT '{}',
  is_pinned boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  poll_options jsonb,
  poll_deadline timestamptz,
  event_date timestamptz,
  event_location text,
  rsvp_enabled boolean NOT NULL DEFAULT false,
  comment_count integer NOT NULL DEFAULT 0,
  vote_count integer NOT NULL DEFAULT 0,
  ai_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.bulletin_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.bulletin_posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.bulletin_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.bulletin_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  poll_option_id text,
  vote_type text NOT NULL DEFAULT 'upvote',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id, vote_type)
);

CREATE TABLE public.bulletin_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.bulletin_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'going',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

ALTER TABLE public.bulletin_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulletin_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulletin_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulletin_rsvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view posts in their society" ON public.bulletin_posts FOR SELECT
  USING (society_id = get_user_society_id(auth.uid()) OR is_admin(auth.uid()));
CREATE POLICY "Users can create posts in their society" ON public.bulletin_posts FOR INSERT
  WITH CHECK (author_id = auth.uid() AND society_id = get_user_society_id(auth.uid()));
CREATE POLICY "Authors can update their own posts" ON public.bulletin_posts FOR UPDATE
  USING (author_id = auth.uid() OR is_admin(auth.uid()));
CREATE POLICY "Authors and admins can delete posts" ON public.bulletin_posts FOR DELETE
  USING (author_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Users can view comments in their society" ON public.bulletin_comments FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.bulletin_posts bp WHERE bp.id = bulletin_comments.post_id AND (bp.society_id = get_user_society_id(auth.uid()) OR is_admin(auth.uid()))));
CREATE POLICY "Users can create comments" ON public.bulletin_comments FOR INSERT
  WITH CHECK (author_id = auth.uid() AND EXISTS (SELECT 1 FROM public.bulletin_posts bp WHERE bp.id = bulletin_comments.post_id AND bp.society_id = get_user_society_id(auth.uid())));
CREATE POLICY "Authors can delete comments" ON public.bulletin_comments FOR DELETE
  USING (author_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Users can view votes" ON public.bulletin_votes FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.bulletin_posts bp WHERE bp.id = bulletin_votes.post_id AND (bp.society_id = get_user_society_id(auth.uid()) OR is_admin(auth.uid()))));
CREATE POLICY "Users can vote" ON public.bulletin_votes FOR INSERT
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.bulletin_posts bp WHERE bp.id = bulletin_votes.post_id AND bp.society_id = get_user_society_id(auth.uid())));
CREATE POLICY "Users can remove votes" ON public.bulletin_votes FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Users can view RSVPs" ON public.bulletin_rsvps FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.bulletin_posts bp WHERE bp.id = bulletin_rsvps.post_id AND (bp.society_id = get_user_society_id(auth.uid()) OR is_admin(auth.uid()))));
CREATE POLICY "Users can RSVP" ON public.bulletin_rsvps FOR INSERT
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.bulletin_posts bp WHERE bp.id = bulletin_rsvps.post_id AND bp.society_id = get_user_society_id(auth.uid())));
CREATE POLICY "Users can update RSVP" ON public.bulletin_rsvps FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete RSVP" ON public.bulletin_rsvps FOR DELETE USING (user_id = auth.uid());

CREATE INDEX idx_bulletin_posts_society ON public.bulletin_posts(society_id);
CREATE INDEX idx_bulletin_posts_created ON public.bulletin_posts(created_at DESC);
CREATE INDEX idx_bulletin_comments_post ON public.bulletin_comments(post_id);
CREATE INDEX idx_bulletin_votes_post ON public.bulletin_votes(post_id);
CREATE INDEX idx_bulletin_rsvps_post ON public.bulletin_rsvps(post_id);

CREATE TRIGGER update_bulletin_posts_updated_at BEFORE UPDATE ON public.bulletin_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.bulletin_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bulletin_comments;

-- ===================== HELP REQUESTS =====================

CREATE TABLE public.help_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id uuid NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  tag text NOT NULL DEFAULT 'question',
  status text NOT NULL DEFAULT 'open',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  response_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.help_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.help_requests(id) ON DELETE CASCADE,
  responder_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.help_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view help requests" ON public.help_requests FOR SELECT
  USING (society_id = get_user_society_id(auth.uid()) OR is_admin(auth.uid()));
CREATE POLICY "Users can create help requests" ON public.help_requests FOR INSERT
  WITH CHECK (author_id = auth.uid() AND society_id = get_user_society_id(auth.uid()));
CREATE POLICY "Authors can update help requests" ON public.help_requests FOR UPDATE
  USING (author_id = auth.uid() OR is_admin(auth.uid()));
CREATE POLICY "Authors can delete help requests" ON public.help_requests FOR DELETE
  USING (author_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Requester and responder can view responses" ON public.help_responses FOR SELECT
  USING (responder_id = auth.uid() OR EXISTS (SELECT 1 FROM public.help_requests hr WHERE hr.id = help_responses.request_id AND hr.author_id = auth.uid()) OR is_admin(auth.uid()));
CREATE POLICY "Users can respond to help requests" ON public.help_responses FOR INSERT
  WITH CHECK (responder_id = auth.uid() AND EXISTS (SELECT 1 FROM public.help_requests hr WHERE hr.id = help_responses.request_id AND hr.society_id = get_user_society_id(auth.uid()) AND hr.status = 'open'));
CREATE POLICY "Responders can delete responses" ON public.help_responses FOR DELETE USING (responder_id = auth.uid());

CREATE INDEX idx_help_requests_society ON public.help_requests(society_id);
CREATE INDEX idx_help_responses_request ON public.help_responses(request_id);

-- ===================== SUBSCRIPTIONS =====================

CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  frequency text NOT NULL DEFAULT 'daily',
  quantity integer NOT NULL DEFAULT 1,
  delivery_days text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'active',
  next_delivery_date date NOT NULL DEFAULT CURRENT_DATE,
  pause_until date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.subscription_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id),
  scheduled_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can view subscriptions" ON public.subscriptions FOR SELECT
  USING (buyer_id = auth.uid() OR EXISTS (SELECT 1 FROM seller_profiles sp WHERE sp.id = subscriptions.seller_id AND sp.user_id = auth.uid()) OR is_admin(auth.uid()));
CREATE POLICY "Buyers can create subscriptions" ON public.subscriptions FOR INSERT WITH CHECK (buyer_id = auth.uid());
CREATE POLICY "Buyers can update subscriptions" ON public.subscriptions FOR UPDATE USING (buyer_id = auth.uid() OR is_admin(auth.uid()));
CREATE POLICY "Buyers can view deliveries" ON public.subscription_deliveries FOR SELECT
  USING (EXISTS (SELECT 1 FROM subscriptions s WHERE s.id = subscription_deliveries.subscription_id AND (s.buyer_id = auth.uid() OR EXISTS (SELECT 1 FROM seller_profiles sp WHERE sp.id = s.seller_id AND sp.user_id = auth.uid()))) OR is_admin(auth.uid()));

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE INDEX idx_subscriptions_buyer ON public.subscriptions(buyer_id);

-- ===================== SKILL LISTINGS =====================

CREATE TABLE public.skill_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  society_id uuid NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  skill_name text NOT NULL,
  description text,
  availability text,
  trust_score numeric NOT NULL DEFAULT 0,
  endorsement_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.skill_endorsements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id uuid NOT NULL REFERENCES public.skill_listings(id) ON DELETE CASCADE,
  endorser_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (skill_id, endorser_id)
);

ALTER TABLE public.skill_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_endorsements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view skills" ON public.skill_listings FOR SELECT
  USING (society_id = get_user_society_id(auth.uid()) OR is_admin(auth.uid()));
CREATE POLICY "Users can add skills" ON public.skill_listings FOR INSERT
  WITH CHECK (user_id = auth.uid() AND society_id = get_user_society_id(auth.uid()));
CREATE POLICY "Users can update skills" ON public.skill_listings FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete skills" ON public.skill_listings FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Users can view endorsements" ON public.skill_endorsements FOR SELECT
  USING (EXISTS (SELECT 1 FROM skill_listings sl WHERE sl.id = skill_endorsements.skill_id AND (sl.society_id = get_user_society_id(auth.uid()) OR is_admin(auth.uid()))));
CREATE POLICY "Users can endorse" ON public.skill_endorsements FOR INSERT
  WITH CHECK (endorser_id = auth.uid() AND EXISTS (SELECT 1 FROM skill_listings sl WHERE sl.id = skill_endorsements.skill_id AND sl.society_id = get_user_society_id(auth.uid())));
CREATE POLICY "Users can remove endorsement" ON public.skill_endorsements FOR DELETE USING (endorser_id = auth.uid());

CREATE INDEX idx_skill_listings_society ON public.skill_listings(society_id);
CREATE INDEX idx_skill_endorsements_skill ON public.skill_endorsements(skill_id);

-- ===================== DISPUTES =====================

CREATE TABLE public.dispute_tickets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  society_id uuid NOT NULL REFERENCES public.societies(id),
  submitted_by uuid NOT NULL REFERENCES public.profiles(id),
  category text NOT NULL DEFAULT 'other',
  description text NOT NULL,
  photo_urls text[] DEFAULT '{}'::text[],
  is_anonymous boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'submitted',
  sla_deadline timestamptz NOT NULL DEFAULT (now() + interval '48 hours'),
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.dispute_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id uuid NOT NULL REFERENCES public.dispute_tickets(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id),
  body text NOT NULL,
  is_committee_note boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dispute_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tickets" ON public.dispute_tickets FOR SELECT
  USING (submitted_by = auth.uid() OR ((society_id = get_user_society_id(auth.uid())) AND (is_admin(auth.uid()) OR is_society_admin(auth.uid(), society_id))));
CREATE POLICY "Users can create tickets" ON public.dispute_tickets FOR INSERT
  WITH CHECK (submitted_by = auth.uid() AND society_id = get_user_society_id(auth.uid()));
CREATE POLICY "Admins can update tickets" ON public.dispute_tickets FOR UPDATE
  USING ((society_id = get_user_society_id(auth.uid())) AND (is_admin(auth.uid()) OR is_society_admin(auth.uid(), society_id)));

CREATE POLICY "Users can view comments" ON public.dispute_comments FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.dispute_tickets dt WHERE dt.id = dispute_comments.ticket_id AND (dt.submitted_by = auth.uid() OR ((dt.society_id = get_user_society_id(auth.uid())) AND (is_admin(auth.uid()) OR is_society_admin(auth.uid(), dt.society_id))))));
CREATE POLICY "Users can add comments" ON public.dispute_comments FOR INSERT
  WITH CHECK (author_id = auth.uid() AND EXISTS (SELECT 1 FROM dispute_tickets dt WHERE dt.id = dispute_comments.ticket_id AND (dt.submitted_by = auth.uid() OR ((dt.society_id = get_user_society_id(auth.uid())) AND (is_admin(auth.uid()) OR is_society_admin(auth.uid(), dt.society_id))))));

CREATE INDEX idx_dispute_tickets_society_status ON public.dispute_tickets(society_id, status);
CREATE INDEX idx_dispute_tickets_society_created ON public.dispute_tickets(society_id, created_at DESC);

-- ===================== FINANCES =====================

CREATE TABLE public.society_expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  society_id uuid NOT NULL REFERENCES public.societies(id),
  category text NOT NULL DEFAULT 'miscellaneous',
  title text NOT NULL,
  amount numeric NOT NULL,
  vendor_name text,
  invoice_url text,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  added_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.society_income (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  society_id uuid NOT NULL REFERENCES public.societies(id),
  source text NOT NULL DEFAULT 'maintenance',
  amount numeric NOT NULL,
  description text,
  income_date date NOT NULL DEFAULT CURRENT_DATE,
  added_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.expense_flags (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id uuid NOT NULL REFERENCES public.society_expenses(id) ON DELETE CASCADE,
  flagged_by uuid NOT NULL REFERENCES public.profiles(id),
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  admin_response text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.expense_views (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id uuid NOT NULL REFERENCES public.society_expenses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(expense_id, user_id)
);

ALTER TABLE public.society_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.society_income ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Society members can view expenses" ON public.society_expenses FOR SELECT
  USING (society_id = get_user_society_id(auth.uid()) OR is_admin(auth.uid()));
CREATE POLICY "Admins can insert expenses" ON public.society_expenses FOR INSERT
  WITH CHECK (added_by = auth.uid() AND society_id = get_user_society_id(auth.uid()) AND (is_admin(auth.uid()) OR is_society_admin(auth.uid(), society_id)));
CREATE POLICY "Admins can update expenses" ON public.society_expenses FOR UPDATE
  USING (society_id = get_user_society_id(auth.uid()) AND (is_admin(auth.uid()) OR is_society_admin(auth.uid(), society_id)));
CREATE POLICY "Admins can delete expenses" ON public.society_expenses FOR DELETE
  USING (society_id = get_user_society_id(auth.uid()) AND (is_admin(auth.uid()) OR is_society_admin(auth.uid(), society_id)));

CREATE POLICY "Society members can view income" ON public.society_income FOR SELECT
  USING (society_id = get_user_society_id(auth.uid()) OR is_admin(auth.uid()));
CREATE POLICY "Admins can insert income" ON public.society_income FOR INSERT
  WITH CHECK (added_by = auth.uid() AND society_id = get_user_society_id(auth.uid()) AND (is_admin(auth.uid()) OR is_society_admin(auth.uid(), society_id)));
CREATE POLICY "Admins can update income" ON public.society_income FOR UPDATE
  USING (society_id = get_user_society_id(auth.uid()) AND (is_admin(auth.uid()) OR is_society_admin(auth.uid(), society_id)));
CREATE POLICY "Admins can delete income" ON public.society_income FOR DELETE
  USING (society_id = get_user_society_id(auth.uid()) AND (is_admin(auth.uid()) OR is_society_admin(auth.uid(), society_id)));

CREATE POLICY "Flaggers and admins can view flags" ON public.expense_flags FOR SELECT
  USING (flagged_by = auth.uid() OR is_admin(auth.uid()));
CREATE POLICY "Society members can flag expenses" ON public.expense_flags FOR INSERT
  WITH CHECK (flagged_by = auth.uid() AND EXISTS (SELECT 1 FROM public.society_expenses se WHERE se.id = expense_flags.expense_id AND se.society_id = get_user_society_id(auth.uid())));
CREATE POLICY "Admins can update flags" ON public.expense_flags FOR UPDATE
  USING (is_admin(auth.uid()) OR is_society_admin(auth.uid(), (SELECT se.society_id FROM society_expenses se WHERE se.id = expense_flags.expense_id)));

CREATE POLICY "Users can view expense views" ON public.expense_views FOR SELECT
  USING (EXISTS (SELECT 1 FROM society_expenses se WHERE se.id = expense_views.expense_id AND se.society_id = get_user_society_id(auth.uid())));
CREATE POLICY "Users can record views" ON public.expense_views FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_society_expenses_society_created ON public.society_expenses(society_id, created_at DESC);

-- ===================== CONSTRUCTION =====================

CREATE TABLE public.construction_milestones (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  society_id uuid NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  stage text NOT NULL DEFAULT 'foundation',
  photos text[] DEFAULT '{}'::text[],
  completion_percentage integer NOT NULL DEFAULT 0,
  posted_by uuid NOT NULL REFERENCES public.profiles(id),
  tower_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.milestone_reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  milestone_id uuid NOT NULL REFERENCES public.construction_milestones(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  reaction_type text NOT NULL DEFAULT 'thumbsup',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(milestone_id, user_id)
);

ALTER TABLE public.construction_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestone_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Society members can view milestones" ON public.construction_milestones FOR SELECT
  USING (society_id = get_user_society_id(auth.uid()) OR is_admin(auth.uid()));
CREATE POLICY "Admins can create milestones" ON public.construction_milestones FOR INSERT
  WITH CHECK (posted_by = auth.uid() AND society_id = get_user_society_id(auth.uid()) AND (is_admin(auth.uid()) OR is_society_admin(auth.uid(), society_id)));
CREATE POLICY "Admins can update milestones" ON public.construction_milestones FOR UPDATE
  USING (society_id = get_user_society_id(auth.uid()) AND (is_admin(auth.uid()) OR is_society_admin(auth.uid(), society_id)));
CREATE POLICY "Admins can delete milestones" ON public.construction_milestones FOR DELETE
  USING (society_id = get_user_society_id(auth.uid()) AND (is_admin(auth.uid()) OR is_society_admin(auth.uid(), society_id)));

CREATE POLICY "Society members can view reactions" ON public.milestone_reactions FOR SELECT
  USING (EXISTS (SELECT 1 FROM construction_milestones cm WHERE cm.id = milestone_reactions.milestone_id AND (cm.society_id = get_user_society_id(auth.uid()) OR is_admin(auth.uid()))));
CREATE POLICY "Society members can add reactions" ON public.milestone_reactions FOR INSERT
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM construction_milestones cm WHERE cm.id = milestone_reactions.milestone_id AND cm.society_id = get_user_society_id(auth.uid())));
CREATE POLICY "Users can remove reactions" ON public.milestone_reactions FOR DELETE USING (user_id = auth.uid());

CREATE INDEX idx_construction_milestones_society ON public.construction_milestones(society_id, created_at DESC);

-- ===================== EMERGENCY BROADCASTS =====================

CREATE TABLE public.emergency_broadcasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  society_id UUID NOT NULL REFERENCES public.societies(id),
  sent_by UUID NOT NULL REFERENCES public.profiles(id),
  category TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.emergency_broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can create broadcasts" ON public.emergency_broadcasts FOR INSERT
  WITH CHECK (society_id = get_user_society_id(auth.uid()) AND sent_by = auth.uid() AND (is_admin(auth.uid()) OR is_society_admin(auth.uid(), society_id)));
CREATE POLICY "Society members can view broadcasts" ON public.emergency_broadcasts FOR SELECT
  USING (society_id = get_user_society_id(auth.uid()) OR is_admin(auth.uid()));
CREATE POLICY "Admins can delete broadcasts" ON public.emergency_broadcasts FOR DELETE
  USING (society_id = get_user_society_id(auth.uid()) AND (is_admin(auth.uid()) OR is_society_admin(auth.uid(), society_id)));

-- ===================== SOCIETY ACTIVITY =====================

CREATE TABLE public.society_activity (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  society_id uuid NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  activity_type text NOT NULL,
  title text NOT NULL,
  description text,
  reference_id uuid,
  reference_type text,
  is_system boolean NOT NULL DEFAULT false,
  tower_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.society_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Society members can view activity" ON public.society_activity FOR SELECT
  USING (society_id = get_user_society_id(auth.uid()) OR is_admin(auth.uid()));
CREATE POLICY "System and admins can insert activity" ON public.society_activity FOR INSERT
  WITH CHECK ((society_id = get_user_society_id(auth.uid()) AND actor_id = auth.uid()) OR is_admin(auth.uid()));

CREATE INDEX idx_society_activity_society_created ON public.society_activity(society_id, created_at DESC);
ALTER PUBLICATION supabase_realtime ADD TABLE public.society_activity;

-- ===================== USER NOTIFICATIONS =====================

CREATE TABLE public.user_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  type text NOT NULL DEFAULT 'general',
  reference_id text,
  reference_path text,
  is_read boolean NOT NULL DEFAULT false,
  society_id uuid REFERENCES public.societies(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.user_notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON public.user_notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "System can insert notifications" ON public.user_notifications FOR INSERT WITH CHECK (true);

CREATE INDEX idx_user_notifications_user_read ON public.user_notifications(user_id, is_read, created_at DESC);

-- ===================== MAINTENANCE DUES =====================

CREATE TABLE public.maintenance_dues (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  society_id uuid NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  flat_identifier text NOT NULL,
  resident_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  month text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  paid_date date,
  receipt_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.maintenance_dues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Residents can view own dues" ON public.maintenance_dues FOR SELECT
  USING (resident_id = auth.uid() OR (society_id = get_user_society_id(auth.uid()) AND (is_admin(auth.uid()) OR is_society_admin(auth.uid(), society_id))));
CREATE POLICY "Admins can insert dues" ON public.maintenance_dues FOR INSERT
  WITH CHECK (society_id = get_user_society_id(auth.uid()) AND (is_admin(auth.uid()) OR is_society_admin(auth.uid(), society_id)));
CREATE POLICY "Admins can update dues" ON public.maintenance_dues FOR UPDATE
  USING (society_id = get_user_society_id(auth.uid()) AND (is_admin(auth.uid()) OR is_society_admin(auth.uid(), society_id)));
CREATE POLICY "Admins can delete dues" ON public.maintenance_dues FOR DELETE
  USING (society_id = get_user_society_id(auth.uid()) AND (is_admin(auth.uid()) OR is_society_admin(auth.uid(), society_id)));

CREATE INDEX idx_maintenance_dues_society_month ON public.maintenance_dues(society_id, month DESC);

-- ===================== AUDIT LOG =====================

CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES public.profiles(id),
  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  society_id uuid REFERENCES public.societies(id),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs" ON public.audit_log FOR SELECT
  USING (is_admin(auth.uid()) OR is_society_admin(auth.uid(), society_id));
CREATE POLICY "Authenticated users can insert audit logs" ON public.audit_log FOR INSERT
  WITH CHECK (actor_id = auth.uid());

CREATE INDEX idx_audit_log_society_created ON public.audit_log(society_id, created_at DESC);
CREATE INDEX idx_audit_log_actor ON public.audit_log(actor_id, created_at DESC);

-- ===================== NOTIFICATION QUEUE =====================

CREATE TABLE public.notification_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  type text NOT NULL DEFAULT 'general',
  reference_path text,
  payload jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can enqueue notifications" ON public.notification_queue FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can view own queued notifications" ON public.notification_queue FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE INDEX idx_notification_queue_status ON public.notification_queue (status, created_at) WHERE status = 'pending';
