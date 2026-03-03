

## Diagnosis: Proven Root Cause

Your isolation test proved everything:

| Step | Result | What it proves |
|---|---|---|
| Request Permission | Granted | iOS permission dialog works, plugin bridge works |
| Trigger Registration | Token stays null | `attemptRegistration()` hangs silently after initial log |
| Save FCM Token Manually | Succeeded | `FCM.getToken()` works, DB save works, RLS is fine |

The "Save FCM Token to DB Manually" button calls `FCM.getToken()` **directly** and saves to DB. It works perfectly. This proves:
- APNs is registered
- FCM token conversion works
- Database persistence works
- The entire pipeline from token to DB is healthy

The **only** problem is inside `attemptRegistration()`. After logging "attemptRegistration — attempt 1/3", zero additional logs appear. The function hangs somewhere in its complex flow: `checkPermissions → listener gate → PN.register() → wait for 'registration' event → FCM.getToken()`.

## What to Fix

### 1. Simplify `attemptRegistration` on iOS — bypass event-based flow

The current flow relies on the `registration` event firing after `PN.register()`, then converting the APNs token to FCM via `FCM.getToken()`. This event-based chain has proven unreliable across multiple builds.

The fix: After confirming permission is granted, call `FCM.getToken()` **directly** (the same thing the manual save button does). Skip the event-listener-based flow entirely on iOS.

```text
Current (broken):
  checkPermissions → listener gate → PN.register() → wait for event → FCM.getToken()

Fixed:
  checkPermissions → PN.register() → FCM.getToken() directly → save to DB
```

### 2. Revert the speculative `apns-topic` change in edge function

Your advisor correctly identified this was a red herring. FCM v1 API auto-sets `apns-topic` from Firebase project config. No FCM call was ever made for your user (zero tokens in DB), so the header was irrelevant. Remove the manually added `apns-topic` header.

### 3. Add granular logging between each step

Every `await` in `attemptRegistration` should have a pushLog before and after, so if it hangs again, we know the exact line.

### Files to modify

- **`src/hooks/usePushNotifications.ts`** — Rewrite `attemptRegistration` to call `FCM.getToken()` directly on iOS after permissions, add per-step logging
- **`supabase/functions/send-push-notification/index.ts`** — Remove speculative `apns-topic` header

### What this does NOT change

- All listener setup (foreground notifications, tap handling) stays the same
- Android flow stays the same (registration event gives FCM token directly)
- Login flow, resume flow, safety nets — all unchanged
- Edge function delivery logic — unchanged (only removing the unnecessary header)

