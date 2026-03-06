-- 17. get_seller_trust_snapshot
CREATE OR REPLACE FUNCTION public.get_seller_trust_snapshot(_seller_id uuid)
RETURNS TABLE(completed_orders bigint, unique_customers bigint, repeat_customer_pct numeric, avg_response_min numeric, recent_order_count bigint) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM public.orders WHERE seller_id = _seller_id AND status = 'completed'),
    (SELECT COUNT(DISTINCT buyer_id) FROM public.orders WHERE seller_id = _seller_id AND status = 'completed'),
    CASE WHEN (SELECT COUNT(DISTINCT buyer_id) FROM public.orders WHERE seller_id = _seller_id AND status = 'completed') = 0 THEN 0
      ELSE (SELECT COUNT(DISTINCT buyer_id) FILTER (WHERE cnt > 1) * 100.0 / COUNT(DISTINCT buyer_id) FROM (SELECT buyer_id, COUNT(*) as cnt FROM public.orders WHERE seller_id = _seller_id AND status = 'completed' GROUP BY buyer_id) sub) END,
    COALESCE((SELECT sp.avg_response_minutes FROM public.seller_profiles sp WHERE sp.id = _seller_id), 0),
    (SELECT COUNT(*) FROM public.orders WHERE seller_id = _seller_id AND status = 'completed' AND created_at > now() - interval '30 days');
END;
$$;

-- 18. get_seller_demand_stats
CREATE OR REPLACE FUNCTION public.get_seller_demand_stats(_seller_id uuid)
RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _result json;
BEGIN
  SELECT json_build_object(
    'total_views', 0,
    'search_appearances', COALESCE((SELECT COUNT(*) FROM public.search_demand_log WHERE society_id = (SELECT society_id FROM public.seller_profiles WHERE id = _seller_id)), 0),
    'conversion_rate', 0
  ) INTO _result;
  RETURN _result;
END;
$$;

-- 19. get_society_order_stats
CREATE OR REPLACE FUNCTION public.get_society_order_stats(_society_id uuid, _product_ids uuid[])
RETURNS TABLE(product_id uuid, families_this_week bigint) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  RETURN QUERY
  SELECT oi.product_id, COUNT(DISTINCT o.buyer_id)
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE oi.product_id = ANY(_product_ids) AND o.society_id = _society_id AND o.created_at > now() - interval '7 days' AND o.status NOT IN ('cancelled')
  GROUP BY oi.product_id;
END;
$$;

-- 20. get_unmet_demand
CREATE OR REPLACE FUNCTION public.get_unmet_demand(_society_id uuid, _seller_categories text[] DEFAULT NULL)
RETURNS TABLE(search_term text, search_count bigint, last_searched timestamptz) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  RETURN QUERY
  SELECT sdl.query, COUNT(*), MAX(sdl.created_at)
  FROM public.search_demand_log sdl
  WHERE sdl.society_id = _society_id AND sdl.result_count = 0
  GROUP BY sdl.query
  ORDER BY COUNT(*) DESC LIMIT 20;
END;
$$;

-- 21. get_builder_dashboard
CREATE OR REPLACE FUNCTION public.get_builder_dashboard(_builder_id uuid)
RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _result json;
BEGIN
  SELECT json_build_object(
    'society_count', (SELECT COUNT(*) FROM public.builder_societies WHERE builder_id = _builder_id),
    'total_members', (SELECT COALESCE(SUM(s.member_count), 0) FROM public.builder_societies bs JOIN public.societies s ON s.id = bs.society_id WHERE bs.builder_id = _builder_id),
    'active_snags', (SELECT COUNT(*) FROM public.snag_tickets st JOIN public.builder_societies bs ON bs.society_id = st.society_id WHERE bs.builder_id = _builder_id AND st.status NOT IN ('resolved', 'closed')),
    'pending_milestones', (SELECT COUNT(*) FROM public.construction_milestones cm JOIN public.builder_societies bs ON bs.society_id = cm.society_id WHERE bs.builder_id = _builder_id AND cm.completion_percentage < 100)
  ) INTO _result;
  RETURN _result;
END;
$$;

-- 22. auto_checkout_visitors
CREATE OR REPLACE FUNCTION public.auto_checkout_visitors()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.visitor_entries SET status = 'checked_out', checked_out_at = now()
  WHERE status = 'checked_in' AND created_at < now() - interval '12 hours';
END;
$$;

-- 23. auto_escalate_overdue_disputes
CREATE OR REPLACE FUNCTION public.auto_escalate_overdue_disputes()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.dispute_tickets SET status = 'escalated'
  WHERE status IN ('open', 'acknowledged') AND sla_deadline < now();
END;
$$;

-- 24. apply_maintenance_late_fees
CREATE OR REPLACE FUNCTION public.apply_maintenance_late_fees()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.maintenance_dues SET late_fee = COALESCE(late_fee, 0) + (amount * 0.02)
  WHERE status = 'overdue' AND due_date < now() - interval '30 days';
END;
$$;

-- 25. notify_upcoming_maintenance_dues
CREATE OR REPLACE FUNCTION public.notify_upcoming_maintenance_dues()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.notification_queue (user_id, type, title, body)
  SELECT md.resident_id, 'maintenance_reminder', 'Maintenance Due Reminder',
    'Your maintenance payment of ₹' || md.amount || ' is due on ' || md.due_date
  FROM public.maintenance_dues md WHERE md.status = 'pending' AND md.due_date BETWEEN now() AND now() + interval '7 days';
END;
$$;

-- 26. generate_recurring_visitor_entries
CREATE OR REPLACE FUNCTION public.generate_recurring_visitor_entries()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  -- Generate today's entries from recurring visitors
  INSERT INTO public.visitor_entries (visitor_name, visitor_phone, visitor_type, resident_id, society_id, status, is_preapproved, is_recurring, purpose)
  SELECT ve.visitor_name, ve.visitor_phone, ve.visitor_type, ve.resident_id, ve.society_id, 'expected', true, true, ve.purpose
  FROM public.visitor_entries ve
  WHERE ve.is_recurring = true AND ve.status != 'cancelled'
    AND to_char(now(), 'Dy') = ANY(ve.recurring_days)
    AND NOT EXISTS (SELECT 1 FROM public.visitor_entries ve2 WHERE ve2.visitor_phone = ve.visitor_phone AND ve2.society_id = ve.society_id AND ve2.created_at::date = CURRENT_DATE);
END;
$$;