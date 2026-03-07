

## Push Notification Fix Plan

### Root Cause Summary

Three blocking issues prevent the end-to-end push pipeline from working:

1. **Missing DB columns**: `notification_queue` lacks `retry_count` and `last_error`; `user_notifications` lacks `queue_item_id`. The edge function references all three, causing every queue item to fail and get stuck in `processing` status forever.

2. **push_logs RLS blocks non-admin users**: Only admins can write/read `push_logs`. Your buyer and seller accounts cannot persist diagnostic logs, making it impossible to debug token registration from the device.

3. **3 stuck queue rows**: Currently 3 items are stuck in `processing` and will never be retried.

### Implementation Steps

#### Phase 1 — Database schema fixes (migration)

Add the missing columns and fix stuck rows:

```sql
-- Add missing columns to notification_queue
ALTER TABLE public.notification_queue
  ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error text;

-- Add missing column to user_notifications  
ALTER TABLE public.user_notifications
  ADD COLUMN IF NOT EXISTS queue_item_id uuid;

-- Add unique partial index for deduplication
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_notifications_queue_item
  ON public.user_notifications (queue_item_id)
  WHERE queue_item_id IS NOT NULL;

-- Add retry index for queue processor
CREATE INDEX IF NOT EXISTS idx_notification_queue_retry
  ON public.notification_queue (status, next_retry_at);

-- Unstick the 3 stuck rows
UPDATE public.notification_queue
  SET status = 'pending', processed_at = NULL, retry_count = 0
  WHERE status = 'processing';
```

#### Phase 2 — Fix push_logs RLS for all authenticated users

Add policies so any logged-in user can insert and read their own logs:

```sql
-- Users can insert their own push logs
CREATE POLICY "Users can insert own push logs"
  ON public.push_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can read their own push logs
CREATE POLICY "Users can read own push logs"
  ON public.push_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid());
```

#### Phase 3 — Redeploy `process-notification-queue`

No code changes needed — the current function code already references `retry_count`, `last_error`, and `queue_item_id`. Once the columns exist, it will work correctly.

#### Phase 4 — Validation on device

After deploying, both buyer and seller accounts should:
1. Open Push Debug page
2. Tap "Request Permission" → grant on iOS
3. Confirm FCM token + APNs token appear
4. Check `device_tokens` table has a row per user
5. Tap "Run Diagnostics" to verify end-to-end
6. Trigger a test notification and confirm the queue row transitions to `processed`
7. Verify the push arrives on the device in foreground and background

