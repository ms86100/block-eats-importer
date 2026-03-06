
-- Products missing columns
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS accepts_preorders boolean NOT NULL DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS action_type text NOT NULL DEFAULT 'buy';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS brand text DEFAULT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS bullet_features text[] DEFAULT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS contact_phone text DEFAULT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cuisine_type text DEFAULT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS delivery_time_text text DEFAULT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS discount_percentage numeric DEFAULT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS ingredients text DEFAULT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS lead_time_hours integer DEFAULT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS low_stock_threshold integer DEFAULT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS minimum_charge numeric DEFAULT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS mrp numeric DEFAULT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS preorder_cutoff_time text DEFAULT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS prep_time_minutes integer DEFAULT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS price_per_unit text DEFAULT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS price_stable_since timestamptz DEFAULT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS secondary_images text[] DEFAULT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS service_scope text DEFAULT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS serving_size text DEFAULT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS spice_level text DEFAULT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS subcategory_id uuid DEFAULT NULL REFERENCES public.subcategories(id);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tags text[] DEFAULT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS unit_type text DEFAULT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS visit_charge numeric DEFAULT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS warranty_period text DEFAULT NULL;

-- Seller profiles missing columns
ALTER TABLE public.seller_profiles ADD COLUMN IF NOT EXISTS avg_response_minutes integer DEFAULT NULL;
ALTER TABLE public.seller_profiles ADD COLUMN IF NOT EXISTS bank_account_holder text DEFAULT NULL;
ALTER TABLE public.seller_profiles ADD COLUMN IF NOT EXISTS bank_account_number text DEFAULT NULL;
ALTER TABLE public.seller_profiles ADD COLUMN IF NOT EXISTS bank_ifsc_code text DEFAULT NULL;
ALTER TABLE public.seller_profiles ADD COLUMN IF NOT EXISTS cancellation_rate numeric DEFAULT NULL;
ALTER TABLE public.seller_profiles ADD COLUMN IF NOT EXISTS completed_order_count integer DEFAULT NULL;
ALTER TABLE public.seller_profiles ADD COLUMN IF NOT EXISTS delivery_handled_by text DEFAULT NULL;
ALTER TABLE public.seller_profiles ADD COLUMN IF NOT EXISTS delivery_note text DEFAULT NULL;
ALTER TABLE public.seller_profiles ADD COLUMN IF NOT EXISTS delivery_radius_km numeric NOT NULL DEFAULT 5;
ALTER TABLE public.seller_profiles ADD COLUMN IF NOT EXISTS food_license_reviewed_at timestamptz DEFAULT NULL;
ALTER TABLE public.seller_profiles ADD COLUMN IF NOT EXISTS food_license_status text DEFAULT NULL;
ALTER TABLE public.seller_profiles ADD COLUMN IF NOT EXISTS food_license_submitted_at timestamptz DEFAULT NULL;
ALTER TABLE public.seller_profiles ADD COLUMN IF NOT EXISTS food_license_url text DEFAULT NULL;
ALTER TABLE public.seller_profiles ADD COLUMN IF NOT EXISTS fulfillment_mode text NOT NULL DEFAULT 'pickup';
ALTER TABLE public.seller_profiles ADD COLUMN IF NOT EXISTS last_active_at timestamptz DEFAULT NULL;
ALTER TABLE public.seller_profiles ADD COLUMN IF NOT EXISTS minimum_order_amount numeric DEFAULT NULL;
ALTER TABLE public.seller_profiles ADD COLUMN IF NOT EXISTS on_time_delivery_pct numeric DEFAULT NULL;
ALTER TABLE public.seller_profiles ADD COLUMN IF NOT EXISTS razorpay_account_id text DEFAULT NULL;
ALTER TABLE public.seller_profiles ADD COLUMN IF NOT EXISTS razorpay_onboarding_status text DEFAULT NULL;
ALTER TABLE public.seller_profiles ADD COLUMN IF NOT EXISTS sell_beyond_community boolean NOT NULL DEFAULT false;

-- Society workers missing columns
ALTER TABLE public.society_workers ADD COLUMN IF NOT EXISTS active_days text[] DEFAULT NULL;
ALTER TABLE public.society_workers ADD COLUMN IF NOT EXISTS allowed_shift_end text DEFAULT NULL;
ALTER TABLE public.society_workers ADD COLUMN IF NOT EXISTS allowed_shift_start text DEFAULT NULL;
ALTER TABLE public.society_workers ADD COLUMN IF NOT EXISTS emergency_contact_phone text DEFAULT NULL;
ALTER TABLE public.society_workers ADD COLUMN IF NOT EXISTS entry_frequency text DEFAULT NULL;
ALTER TABLE public.society_workers ADD COLUMN IF NOT EXISTS is_available boolean DEFAULT true;
ALTER TABLE public.society_workers ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;
ALTER TABLE public.society_workers ADD COLUMN IF NOT EXISTS languages text[] DEFAULT NULL;
ALTER TABLE public.society_workers ADD COLUMN IF NOT EXISTS photo_url text DEFAULT NULL;
ALTER TABLE public.society_workers ADD COLUMN IF NOT EXISTS preferred_language text DEFAULT NULL;
ALTER TABLE public.society_workers ADD COLUMN IF NOT EXISTS rating numeric DEFAULT NULL;
ALTER TABLE public.society_workers ADD COLUMN IF NOT EXISTS skills jsonb DEFAULT NULL;
ALTER TABLE public.society_workers ADD COLUMN IF NOT EXISTS suspension_reason text DEFAULT NULL;
ALTER TABLE public.society_workers ADD COLUMN IF NOT EXISTS total_jobs integer DEFAULT 0;
ALTER TABLE public.society_workers ADD COLUMN IF NOT EXISTS total_ratings integer DEFAULT 0;

-- Visitor entries missing columns
ALTER TABLE public.visitor_entries ADD COLUMN IF NOT EXISTS expected_time text DEFAULT NULL;
ALTER TABLE public.visitor_entries ADD COLUMN IF NOT EXISTS guard_notes text DEFAULT NULL;
ALTER TABLE public.visitor_entries ADD COLUMN IF NOT EXISTS is_preapproved boolean NOT NULL DEFAULT false;
ALTER TABLE public.visitor_entries ADD COLUMN IF NOT EXISTS is_recurring boolean NOT NULL DEFAULT false;
ALTER TABLE public.visitor_entries ADD COLUMN IF NOT EXISTS otp_code text DEFAULT NULL;
ALTER TABLE public.visitor_entries ADD COLUMN IF NOT EXISTS otp_expires_at timestamptz DEFAULT NULL;
ALTER TABLE public.visitor_entries ADD COLUMN IF NOT EXISTS parking_slot_id uuid DEFAULT NULL REFERENCES public.parking_slots(id);
ALTER TABLE public.visitor_entries ADD COLUMN IF NOT EXISTS photo_url text DEFAULT NULL;
ALTER TABLE public.visitor_entries ADD COLUMN IF NOT EXISTS recurring_days text[] DEFAULT NULL;
ALTER TABLE public.visitor_entries ADD COLUMN IF NOT EXISTS visitor_type text NOT NULL DEFAULT 'guest';

-- Worker job requests missing columns
ALTER TABLE public.worker_job_requests ADD COLUMN IF NOT EXISTS accepted_at timestamptz DEFAULT NULL;
ALTER TABLE public.worker_job_requests ADD COLUMN IF NOT EXISTS accepted_by uuid DEFAULT NULL REFERENCES public.profiles(id);
ALTER TABLE public.worker_job_requests ADD COLUMN IF NOT EXISTS cancelled_at timestamptz DEFAULT NULL;
ALTER TABLE public.worker_job_requests ADD COLUMN IF NOT EXISTS completed_at timestamptz DEFAULT NULL;
ALTER TABLE public.worker_job_requests ADD COLUMN IF NOT EXISTS duration_hours numeric DEFAULT NULL;
ALTER TABLE public.worker_job_requests ADD COLUMN IF NOT EXISTS expires_at timestamptz DEFAULT NULL;
ALTER TABLE public.worker_job_requests ADD COLUMN IF NOT EXISTS location_details text DEFAULT NULL;
ALTER TABLE public.worker_job_requests ADD COLUMN IF NOT EXISTS payment_amount numeric DEFAULT NULL;
ALTER TABLE public.worker_job_requests ADD COLUMN IF NOT EXISTS payment_status text DEFAULT NULL;
ALTER TABLE public.worker_job_requests ADD COLUMN IF NOT EXISTS resident_rating numeric DEFAULT NULL;
ALTER TABLE public.worker_job_requests ADD COLUMN IF NOT EXISTS resident_review text DEFAULT NULL;
ALTER TABLE public.worker_job_requests ADD COLUMN IF NOT EXISTS start_time timestamptz DEFAULT NULL;
ALTER TABLE public.worker_job_requests ADD COLUMN IF NOT EXISTS target_society_ids text[] DEFAULT NULL;
ALTER TABLE public.worker_job_requests ADD COLUMN IF NOT EXISTS urgency text DEFAULT NULL;
ALTER TABLE public.worker_job_requests ADD COLUMN IF NOT EXISTS visibility_scope text NOT NULL DEFAULT 'society';
ALTER TABLE public.worker_job_requests ADD COLUMN IF NOT EXISTS voice_summary_url text DEFAULT NULL;
ALTER TABLE public.worker_job_requests ADD COLUMN IF NOT EXISTS worker_rating numeric DEFAULT NULL;
ALTER TABLE public.worker_job_requests ADD COLUMN IF NOT EXISTS worker_review text DEFAULT NULL;
