
-- =========================================================
-- TRIGGERS MIGRATION (idempotent with DROP IF EXISTS)
-- =========================================================

-- 1. auto_approve_resident on profiles INSERT
DROP TRIGGER IF EXISTS trg_auto_approve_resident ON public.profiles;
CREATE TRIGGER trg_auto_approve_resident
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.auto_approve_resident();

-- 2. update_updated_at triggers
DROP TRIGGER IF EXISTS trg_update_updated_at_profiles ON public.profiles;
CREATE TRIGGER trg_update_updated_at_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_update_updated_at_societies ON public.societies;
CREATE TRIGGER trg_update_updated_at_societies BEFORE UPDATE ON public.societies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_update_updated_at_seller_profiles ON public.seller_profiles;
CREATE TRIGGER trg_update_updated_at_seller_profiles BEFORE UPDATE ON public.seller_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_update_updated_at_products ON public.products;
CREATE TRIGGER trg_update_updated_at_products BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_update_updated_at_orders ON public.orders;
CREATE TRIGGER trg_update_updated_at_orders BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_update_updated_at_coupons ON public.coupons;
CREATE TRIGGER trg_update_updated_at_coupons BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_update_updated_at_featured_items ON public.featured_items;
CREATE TRIGGER trg_update_updated_at_featured_items BEFORE UPDATE ON public.featured_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_update_updated_at_builders ON public.builders;
CREATE TRIGGER trg_update_updated_at_builders BEFORE UPDATE ON public.builders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_update_updated_at_admin_settings ON public.admin_settings;
CREATE TRIGGER trg_update_updated_at_admin_settings BEFORE UPDATE ON public.admin_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_update_updated_at_category_config ON public.category_config;
CREATE TRIGGER trg_update_updated_at_category_config BEFORE UPDATE ON public.category_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_update_updated_at_bulletin_posts ON public.bulletin_posts;
CREATE TRIGGER trg_update_updated_at_bulletin_posts BEFORE UPDATE ON public.bulletin_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_update_updated_at_delivery_assignments ON public.delivery_assignments;
CREATE TRIGGER trg_update_updated_at_delivery_assignments BEFORE UPDATE ON public.delivery_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_update_updated_at_delivery_partners ON public.delivery_partners;
CREATE TRIGGER trg_update_updated_at_delivery_partners BEFORE UPDATE ON public.delivery_partners FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_update_updated_at_inspection_checklists ON public.inspection_checklists;
CREATE TRIGGER trg_update_updated_at_inspection_checklists BEFORE UPDATE ON public.inspection_checklists FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_update_updated_at_inspection_items ON public.inspection_items;
CREATE TRIGGER trg_update_updated_at_inspection_items BEFORE UPDATE ON public.inspection_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_update_updated_at_domestic_help_entries ON public.domestic_help_entries;
CREATE TRIGGER trg_update_updated_at_domestic_help_entries BEFORE UPDATE ON public.domestic_help_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_update_updated_at_feature_packages ON public.feature_packages;
CREATE TRIGGER trg_update_updated_at_feature_packages BEFORE UPDATE ON public.feature_packages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_update_updated_at_skill_listings ON public.skill_listings;
CREATE TRIGGER trg_update_updated_at_skill_listings BEFORE UPDATE ON public.skill_listings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 3. Seller rating
DROP TRIGGER IF EXISTS trg_update_seller_rating ON public.reviews;
CREATE TRIGGER trg_update_seller_rating AFTER INSERT OR UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.update_seller_rating();

-- 4. Category layout validation
DROP TRIGGER IF EXISTS trg_validate_category_layout_type ON public.category_config;
CREATE TRIGGER trg_validate_category_layout_type BEFORE INSERT OR UPDATE ON public.category_config FOR EACH ROW EXECUTE FUNCTION public.validate_category_layout_type();

-- 5. Society admin limit
CREATE OR REPLACE FUNCTION public.validate_society_admin_limit()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $func$
DECLARE _max int; _cur int;
BEGIN
  SELECT COALESCE(max_society_admins, 5) INTO _max FROM public.societies WHERE id = NEW.society_id;
  SELECT COUNT(*) INTO _cur FROM public.society_admins WHERE society_id = NEW.society_id AND deactivated_at IS NULL;
  IF _cur >= _max THEN RAISE EXCEPTION 'Society admin limit (%) reached', _max; END IF;
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS trg_validate_society_admin_limit ON public.society_admins;
CREATE TRIGGER trg_validate_society_admin_limit BEFORE INSERT ON public.society_admins FOR EACH ROW EXECUTE FUNCTION public.validate_society_admin_limit();

-- 6. Set order society_id
CREATE OR REPLACE FUNCTION public.set_order_society_id()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $func$
BEGIN
  IF NEW.society_id IS NULL AND NEW.seller_id IS NOT NULL THEN
    SELECT society_id INTO NEW.society_id FROM public.seller_profiles WHERE id = NEW.seller_id;
  END IF;
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS trg_set_order_society_id ON public.orders;
CREATE TRIGGER trg_set_order_society_id BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_order_society_id();

-- 7. Check seller license
CREATE OR REPLACE FUNCTION public.check_seller_license()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $func$
DECLARE _status text;
BEGIN
  SELECT verification_status INTO _status FROM public.seller_profiles WHERE id = NEW.seller_id;
  IF _status IS NULL THEN RAISE EXCEPTION 'Seller profile not found'; END IF;
  IF _status != 'approved' THEN RAISE EXCEPTION 'Seller not approved (status: %)', _status; END IF;
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS check_seller_license_trigger ON public.products;
CREATE TRIGGER check_seller_license_trigger BEFORE INSERT ON public.products FOR EACH ROW EXECUTE FUNCTION public.check_seller_license();

-- 8. Activity logging triggers
CREATE OR REPLACE FUNCTION public.log_order_activity()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $func$
BEGIN
  BEGIN
    INSERT INTO public.society_activity (society_id, activity_type, actor_id, target_type, target_id, metadata)
    VALUES (NEW.society_id, CASE WHEN TG_OP='INSERT' THEN 'order_placed' ELSE 'order_updated' END, COALESCE(NEW.buyer_id, auth.uid()), 'order', NEW.id, jsonb_build_object('status', NEW.status));
  EXCEPTION WHEN OTHERS THEN RAISE WARNING 'Activity log order %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS trg_log_order_activity ON public.orders;
CREATE TRIGGER trg_log_order_activity AFTER INSERT OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.log_order_activity();

CREATE OR REPLACE FUNCTION public.log_bulletin_activity()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $func$
BEGIN
  BEGIN
    INSERT INTO public.society_activity (society_id, activity_type, actor_id, target_type, target_id, metadata)
    VALUES (NEW.society_id, 'bulletin_post_created', NEW.author_id, 'bulletin_post', NEW.id, jsonb_build_object('title', NEW.title, 'category', NEW.category));
  EXCEPTION WHEN OTHERS THEN RAISE WARNING 'Activity log bulletin %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS trg_log_bulletin_activity ON public.bulletin_posts;
CREATE TRIGGER trg_log_bulletin_activity AFTER INSERT ON public.bulletin_posts FOR EACH ROW EXECUTE FUNCTION public.log_bulletin_activity();

CREATE OR REPLACE FUNCTION public.log_dispute_activity()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $func$
BEGIN
  BEGIN
    INSERT INTO public.society_activity (society_id, activity_type, actor_id, target_type, target_id, metadata)
    VALUES (NEW.society_id, 'dispute_created', NEW.submitted_by, 'dispute_ticket', NEW.id, jsonb_build_object('category', NEW.category));
  EXCEPTION WHEN OTHERS THEN RAISE WARNING 'Activity log dispute %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS trg_log_dispute_activity ON public.dispute_tickets;
CREATE TRIGGER trg_log_dispute_activity AFTER INSERT ON public.dispute_tickets FOR EACH ROW EXECUTE FUNCTION public.log_dispute_activity();

CREATE OR REPLACE FUNCTION public.log_help_request_activity()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $func$
BEGIN
  BEGIN
    INSERT INTO public.society_activity (society_id, activity_type, actor_id, target_type, target_id, metadata)
    VALUES (NEW.society_id, 'help_request_created', NEW.author_id, 'help_request', NEW.id, jsonb_build_object('tag', NEW.tag));
  EXCEPTION WHEN OTHERS THEN RAISE WARNING 'Activity log help %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS trg_log_help_request_activity ON public.help_requests;
CREATE TRIGGER trg_log_help_request_activity AFTER INSERT ON public.help_requests FOR EACH ROW EXECUTE FUNCTION public.log_help_request_activity();

-- 9. Bulletin comment count
CREATE OR REPLACE FUNCTION public.update_bulletin_comment_count()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $func$
BEGIN
  IF TG_OP = 'INSERT' THEN UPDATE public.bulletin_posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN UPDATE public.bulletin_posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$func$;

DROP TRIGGER IF EXISTS trg_update_bulletin_comment_count ON public.bulletin_comments;
CREATE TRIGGER trg_update_bulletin_comment_count AFTER INSERT OR DELETE ON public.bulletin_comments FOR EACH ROW EXECUTE FUNCTION public.update_bulletin_comment_count();

-- 10. Bulletin vote count
CREATE OR REPLACE FUNCTION public.update_bulletin_vote_count()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $func$
BEGIN
  IF TG_OP = 'INSERT' THEN UPDATE public.bulletin_posts SET vote_count = vote_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN UPDATE public.bulletin_posts SET vote_count = GREATEST(vote_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$func$;

DROP TRIGGER IF EXISTS trg_update_bulletin_vote_count ON public.bulletin_votes;
CREATE TRIGGER trg_update_bulletin_vote_count AFTER INSERT OR DELETE ON public.bulletin_votes FOR EACH ROW EXECUTE FUNCTION public.update_bulletin_vote_count();

-- 11. Help response count
CREATE OR REPLACE FUNCTION public.update_help_response_count()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $func$
BEGIN
  IF TG_OP = 'INSERT' THEN UPDATE public.help_requests SET response_count = response_count + 1 WHERE id = NEW.request_id;
  ELSIF TG_OP = 'DELETE' THEN UPDATE public.help_requests SET response_count = GREATEST(response_count - 1, 0) WHERE id = OLD.request_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$func$;

DROP TRIGGER IF EXISTS trg_update_help_response_count ON public.help_responses;
CREATE TRIGGER trg_update_help_response_count AFTER INSERT OR DELETE ON public.help_responses FOR EACH ROW EXECUTE FUNCTION public.update_help_response_count();
