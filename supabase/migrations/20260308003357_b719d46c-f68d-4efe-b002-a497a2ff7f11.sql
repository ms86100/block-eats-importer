
-- Create phone_otp_verifications table
CREATE TABLE public.phone_otp_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  phone_number text NOT NULL,
  otp_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempt_count int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz
);

-- RLS: enable but no policies (service-role only access)
ALTER TABLE public.phone_otp_verifications ENABLE ROW LEVEL SECURITY;

-- Index for fast lookups
CREATE INDEX idx_phone_otp_phone_status ON public.phone_otp_verifications (phone_number, status, created_at DESC);

-- Add phone_verified column to profiles if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_verified boolean NOT NULL DEFAULT false;
