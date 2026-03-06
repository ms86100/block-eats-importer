-- 1. claim_device_token
CREATE OR REPLACE FUNCTION public.claim_device_token(p_user_id uuid, p_token text, p_platform text, p_apns_token text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.device_tokens (user_id, token, platform, apns_token)
  VALUES (p_user_id, p_token, p_platform, p_apns_token)
  ON CONFLICT (user_id, token) DO UPDATE SET platform = EXCLUDED.platform, apns_token = EXCLUDED.apns_token, updated_at = now();
END;
$$;

-- 2. claim_notification_queue
CREATE OR REPLACE FUNCTION public.claim_notification_queue(batch_size int DEFAULT 10)
RETURNS SETOF public.notification_queue LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  RETURN QUERY
  UPDATE public.notification_queue SET status = 'processing', processed_at = now()
  WHERE id IN (SELECT id FROM public.notification_queue WHERE status = 'pending' AND (next_retry_at IS NULL OR next_retry_at <= now()) ORDER BY created_at LIMIT batch_size FOR UPDATE SKIP LOCKED)
  RETURNING *;
END;
$$;

-- 3. can_access_feature
CREATE OR REPLACE FUNCTION public.can_access_feature(_feature_key text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _society_id uuid;
BEGIN
  SELECT society_id INTO _society_id FROM public.profiles WHERE id = auth.uid();
  IF _society_id IS NULL THEN RETURN true; END IF;
  RETURN public.is_feature_enabled_for_society(_society_id, _feature_key);
END;
$$;

-- 4. get_category_parent_group
CREATE OR REPLACE FUNCTION public.get_category_parent_group(cat text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT parent_group FROM public.category_config WHERE category::text = cat LIMIT 1;
$$;

-- 5. get_visitor_types_for_society
CREATE OR REPLACE FUNCTION public.get_visitor_types_for_society(_society_id uuid)
RETURNS TABLE(type_key text, label text, icon text, display_order int) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT vt.type_key, vt.label, COALESCE(vt.icon, '👤'), COALESCE(vt.display_order, 0)
  FROM public.visitor_types vt
  WHERE (vt.society_id = _society_id OR vt.society_id IS NULL) AND vt.is_active = true
  ORDER BY vt.display_order, vt.label;
$$;

-- 6. get_allowed_transitions
CREATE OR REPLACE FUNCTION public.get_allowed_transitions(_order_id uuid, _actor text DEFAULT 'seller')
RETURNS TABLE(status_key text, sort_order int, actor text) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _current_status text; _parent_group text; _transaction_type text;
BEGIN
  SELECT o.status::text, COALESCE(cc.parent_group, 'food'), COALESCE(cc.transaction_type, 'purchase')
  INTO _current_status, _parent_group, _transaction_type
  FROM public.orders o
  LEFT JOIN public.order_items oi ON oi.order_id = o.id
  LEFT JOIN public.products p ON p.id = oi.product_id
  LEFT JOIN public.category_config cc ON cc.category::text = p.category::text
  WHERE o.id = _order_id LIMIT 1;

  RETURN QUERY
  SELECT csf.status_key, csf.sort_order, csf.actor
  FROM public.category_status_flows csf
  WHERE csf.parent_group = _parent_group
    AND csf.transaction_type = _transaction_type
    AND csf.actor = _actor
    AND csf.sort_order > (SELECT COALESCE(csf2.sort_order, 0) FROM public.category_status_flows csf2 WHERE csf2.parent_group = _parent_group AND csf2.transaction_type = _transaction_type AND csf2.status_key = _current_status LIMIT 1)
  ORDER BY csf.sort_order;
END;
$$;

-- 7. validate_worker_entry
CREATE OR REPLACE FUNCTION public.validate_worker_entry(_worker_id uuid, _society_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _worker record; _result json;
BEGIN
  SELECT * INTO _worker FROM public.society_workers WHERE id = _worker_id AND society_id = _society_id AND is_active = true;
  IF NOT FOUND THEN RETURN json_build_object('valid', false, 'reason', 'Worker not found or inactive'); END IF;
  RETURN json_build_object('valid', true, 'worker_name', _worker.name, 'worker_type', _worker.worker_type, 'worker_id', _worker.id);
END;
$$;

-- 8. complete_worker_job
CREATE OR REPLACE FUNCTION public.complete_worker_job(_job_id uuid, _worker_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.worker_job_requests SET status = 'completed', completed_at = now(), updated_at = now()
  WHERE id = _job_id AND accepted_by = _worker_id AND status = 'accepted';
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'Job not found or not in accepted state'); END IF;
  RETURN json_build_object('success', true);
END;
$$;

-- 9. rate_worker_job
CREATE OR REPLACE FUNCTION public.rate_worker_job(_job_id uuid, _rating int, _review text DEFAULT NULL)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.worker_job_requests SET worker_rating = _rating, worker_review = _review, updated_at = now()
  WHERE id = _job_id AND resident_id = auth.uid() AND status = 'completed';
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'Job not found'); END IF;
  RETURN json_build_object('success', true);
END;
$$;