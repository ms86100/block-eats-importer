
-- Phase 1: Add missing columns to notification_queue
ALTER TABLE public.notification_queue
  ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error text;

-- Add missing column to user_notifications
ALTER TABLE public.user_notifications
  ADD COLUMN IF NOT EXISTS queue_item_id uuid;

-- Unique partial index for deduplication
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_notifications_queue_item
  ON public.user_notifications (queue_item_id)
  WHERE queue_item_id IS NOT NULL;

-- Retry index for queue processor
CREATE INDEX IF NOT EXISTS idx_notification_queue_retry
  ON public.notification_queue (status, next_retry_at);

-- Phase 2: RLS policies for push_logs
CREATE POLICY "Users can insert own push logs"
  ON public.push_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can read own push logs"
  ON public.push_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid());
