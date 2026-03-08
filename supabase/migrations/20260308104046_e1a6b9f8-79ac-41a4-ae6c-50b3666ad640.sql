-- PA-15: Add CHECK constraint on approval_status values for defense-in-depth
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_approval_status_check'
  ) THEN
    ALTER TABLE public.products ADD CONSTRAINT products_approval_status_check
      CHECK (approval_status IN ('draft', 'pending', 'approved', 'rejected'));
  END IF;
END $$;