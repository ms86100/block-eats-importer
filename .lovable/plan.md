

# Push Notification System — Full Audit & Restoration Plan

## Current State Summary

The push notification **architecture is complete and correct**. The frontend hook (`usePushNotifications.ts`, 1395 lines), edge functions (`send-push-notification`, `process-notification-queue`, `test-apns-direct`), database functions (`claim_device_token`, `claim_notification_queue`), and the provider/context wiring are all in place and match the original project.

The system is **not broken at the code level**. The reason push notifications are not working automatically is a **missing secrets configuration**.

---

## Root Cause: Missing Secrets

The `send-push-notification` and `test-apns-direct` edge functions require **5 secrets** that are **not currently configured**:

| Secret | Required By | Status |
|--------|------------|--------|
| `FIREBASE_SERVICE_ACCOUNT` | `send-push-notification` (FCM for Android + fallback) | **MISSING** |
| `APNS_KEY_P8` | `send-push-notification`, `test-apns-direct` (iOS direct APNs) | **MISSING** |
| `APNS_KEY_ID` | Both APNs functions (value: `SA4J5B62V2` per PDF) | **MISSING** |
| `APNS_TEAM_ID` | Both APNs functions (value: `6HBR38JB8Z` per PDF) | **MISSING** |
| `APNS_BUNDLE_ID` | Both APNs functions (value: `app.sociva.community` per PDF) | **MISSING** |

Only `LOVABLE_API_KEY` exists. Without these secrets, the backend edge functions fail silently — notifications are queued but never delivered.

---

## Verification: Frontend Pipeline is Intact

The registration pipeline follows the correct flow from the PDF:

1. **Login** → `attemptRegistration()` → `checkPermissions()` only (never auto-requests)
2. **User taps "Turn On"** → `requestFullPermission()` → iOS system prompt
3. **Permission granted** → `PN.register()` → APNs token captured via `registration` event → FCM token via `FCM.getToken()`
4. **Both tokens saved** → `claim_device_token` RPC → `device_tokens` table
5. **Backend delivery** → `process-notification-queue` → `send-push-notification` → direct APNs (iOS) / FCM (Android)

All critical rules from the PDF are followed:
- Never auto-calls `requestPermissions()`
- Permission prompt only from user tap
- Token ownership is 1:1 via `claim_device_token` (SECURITY DEFINER)
- APNs token stored alongside FCM token
- Direct APNs delivery for iOS, FCM for Android

---

## Implementation Plan

### Step 1: Add Missing Secrets

Prompt the user to provide the 5 required secrets:

- **`FIREBASE_SERVICE_ACCOUNT`** — The full Firebase service account JSON (from Firebase Console → Project Settings → Service Accounts → Generate New Private Key)
- **`APNS_KEY_P8`** — The .p8 private key file contents (the full PEM including `-----BEGIN PRIVATE KEY-----` markers)
- **`APNS_KEY_ID`** — `SA4J5B62V2`
- **`APNS_TEAM_ID`** — `6HBR38JB8Z`
- **`APNS_BUNDLE_ID`** — `app.sociva.community`

### Step 2: Verify Edge Function Deployment

After secrets are added, test the `send-push-notification` and `test-apns-direct` edge functions using the invoke tool to confirm they respond correctly (no 500 errors from missing env vars).

### Step 3: No Code Changes Required

The frontend registration pipeline, edge functions, database functions, RLS policies, and context providers are all correctly implemented. No code modifications are needed.

---

## Summary

The push notification system is architecturally complete. The only gap is **5 missing backend secrets** that the edge functions need to actually deliver notifications. Once these are configured, the automatic flow (login → permission → token capture → delivery) will work end-to-end without the debug page.

