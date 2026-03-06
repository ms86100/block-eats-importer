-- Add missing enum values
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'on_the_way';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'arrived';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'assigned';

-- Create product_category enum (alias used by original schema)
DO $$ BEGIN
  CREATE TYPE public.product_category AS ENUM ('home_food', 'bakery', 'snacks', 'groceries', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add 'draft' to verification_status
DO $$ BEGIN
  CREATE TYPE public.verification_status AS ENUM ('draft', 'pending', 'approved', 'rejected', 'suspended');
EXCEPTION WHEN duplicate_object THEN
  -- Try adding just the missing value
  BEGIN
    ALTER TYPE public.verification_status ADD VALUE IF NOT EXISTS 'draft';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

-- Add 'security_officer' to user_role
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'security_officer';