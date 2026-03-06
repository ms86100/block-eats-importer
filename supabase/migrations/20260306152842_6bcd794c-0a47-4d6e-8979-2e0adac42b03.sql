
-- ============================================
-- BATCH 2: Add missing columns to existing tables
-- ============================================

-- builders
ALTER TABLE public.builders ADD COLUMN IF NOT EXISTS address text DEFAULT NULL;
ALTER TABLE public.builders ADD COLUMN IF NOT EXISTS latitude numeric DEFAULT NULL;
ALTER TABLE public.builders ADD COLUMN IF NOT EXISTS longitude numeric DEFAULT NULL;

-- cart_items
ALTER TABLE public.cart_items ADD COLUMN IF NOT EXISTS society_id uuid DEFAULT NULL REFERENCES public.societies(id);

-- category_config - many new columns
ALTER TABLE public.category_config ADD COLUMN IF NOT EXISTS accepts_preorders boolean NOT NULL DEFAULT false;
ALTER TABLE public.category_config ADD COLUMN IF NOT EXISTS default_sort text NOT NULL DEFAULT 'popular';
ALTER TABLE public.category_config ADD COLUMN IF NOT EXISTS description_placeholder text DEFAULT NULL;
ALTER TABLE public.category_config ADD COLUMN IF NOT EXISTS duration_label text DEFAULT NULL;
ALTER TABLE public.category_config ADD COLUMN IF NOT EXISTS image_aspect_ratio text NOT NULL DEFAULT '1:1';
ALTER TABLE public.category_config ADD COLUMN IF NOT EXISTS image_object_fit text NOT NULL DEFAULT 'cover';
ALTER TABLE public.category_config ADD COLUMN IF NOT EXISTS image_url text DEFAULT NULL;
ALTER TABLE public.category_config ADD COLUMN IF NOT EXISTS lead_time_hours integer DEFAULT NULL;
ALTER TABLE public.category_config ADD COLUMN IF NOT EXISTS name_placeholder text DEFAULT NULL;
ALTER TABLE public.category_config ADD COLUMN IF NOT EXISTS placeholder_emoji text DEFAULT NULL;
ALTER TABLE public.category_config ADD COLUMN IF NOT EXISTS preorder_cutoff_time text DEFAULT NULL;
ALTER TABLE public.category_config ADD COLUMN IF NOT EXISTS price_label text DEFAULT NULL;
ALTER TABLE public.category_config ADD COLUMN IF NOT EXISTS price_prefix text DEFAULT NULL;
ALTER TABLE public.category_config ADD COLUMN IF NOT EXISTS primary_button_label text NOT NULL DEFAULT 'Order';
ALTER TABLE public.category_config ADD COLUMN IF NOT EXISTS requires_availability boolean NOT NULL DEFAULT false;
ALTER TABLE public.category_config ADD COLUMN IF NOT EXISTS requires_price boolean NOT NULL DEFAULT true;
ALTER TABLE public.category_config ADD COLUMN IF NOT EXISTS review_dimensions text[] DEFAULT NULL;
ALTER TABLE public.category_config ADD COLUMN IF NOT EXISTS show_duration_field boolean NOT NULL DEFAULT false;
ALTER TABLE public.category_config ADD COLUMN IF NOT EXISTS show_veg_toggle boolean NOT NULL DEFAULT false;
ALTER TABLE public.category_config ADD COLUMN IF NOT EXISTS supports_brand_display boolean NOT NULL DEFAULT false;
ALTER TABLE public.category_config ADD COLUMN IF NOT EXISTS supports_warranty_display boolean NOT NULL DEFAULT false;
ALTER TABLE public.category_config ADD COLUMN IF NOT EXISTS transaction_type text NOT NULL DEFAULT 'purchase';

-- delivery_assignments
ALTER TABLE public.delivery_assignments ADD COLUMN IF NOT EXISTS assigned_at timestamptz DEFAULT NULL;
ALTER TABLE public.delivery_assignments ADD COLUMN IF NOT EXISTS delivery_code text DEFAULT NULL;
ALTER TABLE public.delivery_assignments ADD COLUMN IF NOT EXISTS failure_owner text DEFAULT NULL;
ALTER TABLE public.delivery_assignments ADD COLUMN IF NOT EXISTS rider_id uuid DEFAULT NULL REFERENCES public.delivery_partner_pool(id);
ALTER TABLE public.delivery_assignments ADD COLUMN IF NOT EXISTS stalled_notified boolean DEFAULT false;

-- device_tokens
ALTER TABLE public.device_tokens ADD COLUMN IF NOT EXISTS apns_token text DEFAULT NULL;

-- expense_flags
ALTER TABLE public.expense_flags ADD COLUMN IF NOT EXISTS resolved_at timestamptz DEFAULT NULL;
ALTER TABLE public.expense_flags ADD COLUMN IF NOT EXISTS resolved_by uuid DEFAULT NULL REFERENCES public.profiles(id);

-- favorites
ALTER TABLE public.favorites ADD COLUMN IF NOT EXISTS society_id uuid DEFAULT NULL REFERENCES public.societies(id);

-- feature_packages
ALTER TABLE public.feature_packages ADD COLUMN IF NOT EXISTS price_amount numeric DEFAULT NULL;
ALTER TABLE public.feature_packages ADD COLUMN IF NOT EXISTS price_period text DEFAULT NULL;

-- featured_items
ALTER TABLE public.featured_items ADD COLUMN IF NOT EXISTS auto_rotate_seconds integer NOT NULL DEFAULT 5;
ALTER TABLE public.featured_items ADD COLUMN IF NOT EXISTS bg_color text DEFAULT NULL;
ALTER TABLE public.featured_items ADD COLUMN IF NOT EXISTS button_text text DEFAULT NULL;
ALTER TABLE public.featured_items ADD COLUMN IF NOT EXISTS subtitle text DEFAULT NULL;
ALTER TABLE public.featured_items ADD COLUMN IF NOT EXISTS template text DEFAULT NULL;

-- gate_entries
ALTER TABLE public.gate_entries ADD COLUMN IF NOT EXISTS awaiting_confirmation boolean NOT NULL DEFAULT false;
ALTER TABLE public.gate_entries ADD COLUMN IF NOT EXISTS confirmation_denied_at timestamptz DEFAULT NULL;
ALTER TABLE public.gate_entries ADD COLUMN IF NOT EXISTS confirmation_expires_at timestamptz DEFAULT NULL;
ALTER TABLE public.gate_entries ADD COLUMN IF NOT EXISTS confirmed_by_resident_at timestamptz DEFAULT NULL;

-- inspection_checklists
ALTER TABLE public.inspection_checklists ADD COLUMN IF NOT EXISTS builder_acknowledged_by uuid DEFAULT NULL REFERENCES public.profiles(id);
ALTER TABLE public.inspection_checklists ADD COLUMN IF NOT EXISTS builder_notes text DEFAULT NULL;

-- orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS buyer_society_id uuid DEFAULT NULL REFERENCES public.societies(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_handled_by text DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_cross_society boolean NOT NULL DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS razorpay_order_id text DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS razorpay_payment_id text DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS ready_at timestamptz DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS seller_society_id uuid DEFAULT NULL REFERENCES public.societies(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS distance_km numeric DEFAULT NULL;

-- parcel_entries
ALTER TABLE public.parcel_entries ADD COLUMN IF NOT EXISTS logged_by uuid DEFAULT NULL;

-- parent_groups
ALTER TABLE public.parent_groups ADD COLUMN IF NOT EXISTS placeholder_hint text DEFAULT NULL;

-- payment_records
ALTER TABLE public.payment_records ADD COLUMN IF NOT EXISTS payment_collection text NOT NULL DEFAULT 'direct';
ALTER TABLE public.payment_records ADD COLUMN IF NOT EXISTS payment_mode text NOT NULL DEFAULT 'offline';
ALTER TABLE public.payment_records ADD COLUMN IF NOT EXISTS razorpay_payment_id text DEFAULT NULL;
ALTER TABLE public.payment_records ADD COLUMN IF NOT EXISTS society_id uuid DEFAULT NULL REFERENCES public.societies(id);

-- platform_features
ALTER TABLE public.platform_features ADD COLUMN IF NOT EXISTS audience text[] DEFAULT NULL;
ALTER TABLE public.platform_features ADD COLUMN IF NOT EXISTS capabilities text[] DEFAULT NULL;
ALTER TABLE public.platform_features ADD COLUMN IF NOT EXISTS display_name text DEFAULT NULL;
ALTER TABLE public.platform_features ADD COLUMN IF NOT EXISTS icon_name text DEFAULT NULL;
ALTER TABLE public.platform_features ADD COLUMN IF NOT EXISTS route text DEFAULT NULL;
ALTER TABLE public.platform_features ADD COLUMN IF NOT EXISTS tagline text DEFAULT NULL;

-- profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS browse_beyond_community boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_seen_onboarding boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS search_radius_km numeric NOT NULL DEFAULT 5;

-- project_towers
ALTER TABLE public.project_towers ADD COLUMN IF NOT EXISTS delay_category text DEFAULT NULL;
ALTER TABLE public.project_towers ADD COLUMN IF NOT EXISTS delay_reason text DEFAULT NULL;
ALTER TABLE public.project_towers ADD COLUMN IF NOT EXISTS revised_completion text DEFAULT NULL;

-- reviews
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS hidden_reason text DEFAULT NULL;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS society_id uuid DEFAULT NULL REFERENCES public.societies(id);

-- snag_tickets
ALTER TABLE public.snag_tickets ADD COLUMN IF NOT EXISTS assigned_to_name text DEFAULT NULL;
ALTER TABLE public.snag_tickets ADD COLUMN IF NOT EXISTS verified_at timestamptz DEFAULT NULL;

-- society_activity
ALTER TABLE public.society_activity ADD COLUMN IF NOT EXISTS is_system boolean NOT NULL DEFAULT false;
ALTER TABLE public.society_activity ADD COLUMN IF NOT EXISTS reference_id text DEFAULT NULL;
ALTER TABLE public.society_activity ADD COLUMN IF NOT EXISTS reference_type text DEFAULT NULL;
ALTER TABLE public.society_activity ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT '';
ALTER TABLE public.society_activity ADD COLUMN IF NOT EXISTS tower_id uuid DEFAULT NULL REFERENCES public.project_towers(id);

-- society_admins
ALTER TABLE public.society_admins ADD COLUMN IF NOT EXISTS appointed_by uuid DEFAULT NULL REFERENCES public.profiles(id);

-- user_notifications
ALTER TABLE public.user_notifications ADD COLUMN IF NOT EXISTS society_id uuid DEFAULT NULL REFERENCES public.societies(id);
