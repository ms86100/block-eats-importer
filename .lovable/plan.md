

## Plan: Update Firebase Service Account Secret

The `SENDER_ID_MISMATCH` error confirms the currently stored `FIREBASE_SERVICE_ACCOUNT` secret belongs to a different Firebase project than your app (`sociva-d515a`). You've now provided the correct service account JSON.

### What needs to happen

1. **Update the `FIREBASE_SERVICE_ACCOUNT` secret** with the correct JSON you provided (project_id: `sociva-d515a`, matching your `GoogleService-Info.plist`)

2. **No code changes required** — the edge functions (`send-push-notification`, `process-notification-queue`) already use this secret correctly. Once updated, FCM will accept the token and deliver push notifications.

### After the update

- All currently queued notifications in `retrying`/`pending` status will be picked up on the next queue processing cycle and should deliver successfully
- New order notifications will trigger push delivery to the seller's device
- No app rebuild needed — this is a backend-only config change

### Technical detail
The `project_id` in the secret (`sociva-d515a`) must match the Firebase project that issued the device's FCM token (registered via `GoogleService-Info.plist` with sender ID `736572106854`). The previous secret had a different project_id, causing the 403 SENDER_ID_MISMATCH.

