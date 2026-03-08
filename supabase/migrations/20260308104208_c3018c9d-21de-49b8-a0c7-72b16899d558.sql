-- PA-04: Add column to flag products modified while under pending review
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS updated_while_pending boolean NOT NULL DEFAULT false;