

# Notification System — Full End-to-End Audit

---

## Architecture Overview

```text
┌─────────────────────────────────────────────────────────────────┐
│                    NOTIFICATION PIPELINE                        │
│                                                                 │
│  EVENT TRIGGER                                                  │
│  ┌──────────────┐    ┌──────────────────┐    ┌───────────────┐ │
│  │ DB Triggers   │───▶│ notification_    │───▶│ pg_cron       │ │
│  │ (orders,      │    │ queue (pending)  │    │ every 1 min   │ │
│  │ notices, etc) │    └──────────────────┘    └──────┬────────┘ │
│  └──────────────┘                                    │          │
│                                                      ▼          │
│  CLIENT DIRECT     ┌──────────────────────────────────────────┐ │
│  ┌──────────────┐  │ process-notification-queue               │ │
│  │ society-      │  │  1. INSERT into user_notifications (DB) │ │
│  │ notifications │  │  2. INVOKE send-push-notification       │ │
│  │ .ts (bypass   │  │  3. UPDATE queue status                 │ │
│  │ queue)        │  └──────────────────────┬───────────────────┘ │
│  └──────┬───────┘                          │                    │
│         │                                  ▼                    │
│         │              ┌──────────────────────────────┐         │
│         └─────────────▶│ send-push-notification       │         │
│                        │  1. Fetch device_tokens      │         │
│                        │  2. Generate FCM JWT          │         │
│                        │  3. POST to FCM HTTP v1       │         │
│                        │  4. Clean invalid tokens      │         │
│                        └──────────────┬───────────────┘         │
│                                       │                         │
│                                       ▼                         │
│                        ┌──────────────────────────────┐         │
│                        │ FCM / APNs → Device          │         │
│                        └──────────────────────────────┘         │
│                                                                 │
│  IN-APP UI SIDE                                                 │
│  ┌──────────────────────────────────────────────────────┐       │
│  │ Header.tsx → Bell icon → unread badge (polling 30s)  │       │
│  │ NotificationInboxPage.tsx → full list from DB        │       │
│  │ usePushNotifications.ts → Capacitor listeners        │       │
│  │  ├─ pushNotificationReceived → toast + haptic + sound│       │
│  │  └─ pushNotificationActionPerformed → navigate       │       │
│  └──────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. Notification Type Assessment

| Type | Status | Evidence |
|------|--------|----------|
| **In-app notification (UI badge + inbox)** | **WORKS** | `user_notifications` table has 64 records (54 unread). `NotificationInboxPage` renders them. `useUnreadNotificationCount` polls every 30s. Header bell shows badge. |
| **Push notification (FCM/APNs)** | **NOT WORKING** | `device_tokens` table has **0 rows**. No device has ever registered. Push pipeline is correct in code but has never successfully delivered. |
| **Local notification** | **NOT IMPLEMENTED** | No Capacitor local notification plugin used. Not a gap — not needed given push + in-app. |
| **Foreground banner (when push arrives in-app)** | **WORKS (in code)** | `pushNotificationReceived` listener shows toast + plays audio + haptic. Never triggered because no tokens exist. |

---

## 2. Device & OS Permission Gaps

### Android
| Check | Status | Evidence |
|-------|--------|---------|
| POST_NOTIFICATIONS (Android 13+) | **HANDLED** | `PushNotifications.requestPermissions()` triggers native prompt (line 90). |
| Notification channel importance | **NOT CONFIGURABLE** | Capacitor creates default channel. No custom channel configuration in code. Default is `IMPORTANCE_DEFAULT` — sound works. |
| Battery optimization | **N/A** | App-level concern, not code-level. |

### iOS
| Check | Status | Evidence |
|-------|--------|---------|
| Permission request after login | **YES** | `registerPushNotifications()` only called when `user` exists (line 195). |
| Denied → re-prompt | **HANDLED CORRECTLY** | Checks `permStatus.receive`, only prompts on `'prompt'`, not on `'denied'`. User must go to Settings. This is correct iOS behavior. |
| Push capability | **CONFIGURED** | `capacitor.config.ts` has `PushNotifications.presentationOptions: ['badge', 'sound', 'alert']`. Codemagic pipeline injects Push Notifications entitlement. |

**Verdict: OS permission handling is correct. Not the failure point.**

---

## 3. Capacitor / Native Bridge Assessment

| Check | Status | Evidence |
|-------|--------|---------|
| `PushNotifications.register()` called | **YES** | Line 102, called after permission granted. |
| Plugin initialized before app ready | **NO ISSUE** | Listeners set up in `useEffect` on component mount (line 109). |
| All 4 listeners registered | **YES** | `registration` (113), `registrationError` (127), `pushNotificationReceived` (135), `pushNotificationActionPerformed` (181). |
| Listener is global (not page-scoped) | **YES** | `usePushNotifications()` is called in `PushNotificationProvider` which wraps the entire app tree in `App.tsx`. |
| Cleanup on unmount | **YES** | Lines 199-204 remove all listeners. |

**Critical finding:** The listeners and registration are correctly structured and globally mounted. The code is sound.

---

## 4. Token Generation & Storage — **THE PRIMARY FAILURE POINT**

| Step | Expected | Actual | Evidence |
|------|----------|--------|----------|
| Token generated | On first native launch after login | **NEVER HAPPENED** | `device_tokens` has 0 rows. |
| Token saved to DB | After `registration` event | **CODE IS CORRECT** | `saveTokenToDatabase` upserts with `onConflict: 'user_id,token'`. |
| Token linked to user | Via `user_id` | **CODE IS CORRECT** | Uses `currentUser.id`. |
| Token removed on logout | user null → null transition | **CODE IS CORRECT** | `PushNotificationProvider` detects user→null and calls `removeTokenFromDatabase`. |

### Root Cause Analysis

**The `device_tokens` table has 0 rows because no native build has been installed and run by a user.**

The web preview (`lovableproject.com`) correctly skips registration (line 80: `if (!isNative) return`). Push notifications only work on native builds (iOS/Android). The code is correct — it simply hasn't been exercised on a real device yet.

**This is NOT a code bug. It is a deployment/testing gap.**

---

## 5. Backend Pipeline Assessment

| Step | Status | Evidence |
|------|--------|---------|
| Event occurs → queue entry | **WORKS** | 61 notifications processed in `notification_queue`. DB triggers insert correctly. |
| Queue processing (pg_cron) | **WORKS** | Cron job #15 runs `* * * * *`, calls `process-notification-queue`. Edge function logs show clean boot/shutdown every minute. |
| `user_notifications` insert | **WORKS** | 64 records in table. Pipeline successfully persists in-app notifications. |
| Push via `send-push-notification` | **SILENTLY FAILS** | Function is invoked but finds 0 device tokens → returns `{ sent: 0 }`. This is **expected behavior** when no devices are registered. |
| Invalid token cleanup | **WORKS** | Code deletes tokens returning `UNREGISTERED` from FCM (line 237-243). |
| Retry with exponential backoff | **WORKS** | `MAX_RETRIES = 3`, backoff: 30s → 2min → 8min. Dead-letters after 3 failures. |
| FIREBASE_SERVICE_ACCOUNT secret | **EXISTS** | Confirmed via secrets fetch. |

**Verdict: Backend pipeline is production-ready. No failures — just no target devices.**

---

## 6. Payload Structure Assessment

| Platform | Status | Evidence |
|----------|--------|---------|
| Android | **CORRECT** | FCM payload includes `notification.title`, `notification.body`, `android.priority: "high"`, `android.notification.sound: "default"` (lines 133-139). |
| iOS | **CORRECT** | APNs payload includes `apns.payload.aps.alert`, `sound: "default"`, `badge: 1` (lines 120-131). |
| Data payload | **INCLUDED** | `data` field sent alongside notification payload (line 118). Works in both foreground and background. |

**Common gap check:** This is NOT a data-only message. Both `notification` AND `data` blocks are present. Background delivery will work correctly.

**One minor issue:** `click_action: "FLUTTER_NOTIFICATION_CLICK"` on line 137 is a Flutter convention, not Capacitor. Harmless but unnecessary — Capacitor handles tap via its own listener.

---

## 7. In-App Notification UI Assessment

| Check | Status | Evidence |
|-------|--------|---------|
| Global notification store | **YES (DB-backed)** | `user_notifications` table, queried via `useNotifications` hook. |
| Realtime/polling active | **YES (polling)** | `useUnreadNotificationCount` polls every 30s with `refetchInterval: 30_000`. |
| Badge count updated live | **YES** | Header bell icon shows unread count from polling. Also invalidated on app resume (`useAppLifecycle`). |
| Toast/banner on foreground push | **YES** | `pushNotificationReceived` listener shows toast with title/body + action button. |
| Inbox page exists | **YES** | `NotificationInboxPage` at `/notifications/inbox`. Shows all notifications with read/unread state, mark-all-read, tap-to-navigate. |

**Gap:** No realtime subscription (WebSocket) for instant UI updates. Relies on 30s polling. A notification inserted by a trigger won't appear in the badge for up to 30 seconds. This is acceptable for current scale but worth noting.

---

## 8. App Lifecycle Assessment

| State | Expected | Status | Evidence |
|-------|----------|--------|---------|
| Foreground | Show toast | **YES** | `pushNotificationReceived` listener with toast + haptic + sound. |
| Background | Push notification | **YES (code ready)** | FCM payload has `notification` block — OS will display it natively. |
| Killed | Push notification | **YES (code ready)** | Same FCM payload — OS displays without app running. |
| Resume | Refresh data | **YES** | `useAppLifecycle` invalidates `unread-notifications` on `appStateChange.isActive`. |

---

## 9. Sound & Buzzing Assessment

| Check | Status | Evidence |
|-------|--------|---------|
| FCM payload sound | **YES** | `sound: "default"` on both Android and iOS payloads. |
| Foreground sound | **YES** | WebAudio oscillator plays 3-tone alarm (lines 143-162). |
| Foreground haptic | **YES** | `hapticNotification('warning')` on line 140. |
| Seller-specific alarm | **SEPARATE SYSTEM** | `GlobalSellerAlert` / `NewOrderAlertOverlay` has its own audio alarm loop — independent of push. Works via Realtime + polling. |

---

## 10. Environment & Build Assessment

| Check | Status | Evidence |
|-------|--------|---------|
| FIREBASE_SERVICE_ACCOUNT | **CONFIGURED** | Secret exists in project. |
| Firebase project setup | **ASSUMED DONE** | Service account implies Firebase project exists. Cannot verify `google-services.json` / `GoogleService-Info.plist` in native builds from here. |
| Capacitor config | **CORRECT** | `PushNotifications.presentationOptions: ['badge', 'sound', 'alert']` configured. |
| Codemagic pipeline | **CONFIGURED** | Per memory: patches AppDelegate.swift for APNs token forwarding, copies Firebase config files. |
| Bundle ID match | **app.sociva.community** | Consistent across capacitor.config.ts and deployment configs. |

---

## Explicit Gap Summary

| # | Gap | Severity | Component | Risk |
|---|-----|----------|-----------|------|
| **G1** | **Zero device tokens in production DB** | **P0** | `device_tokens` table | Push notifications have NEVER been delivered. All 61 processed queue items sent push to 0 devices. The entire push pipeline is untested on real devices. |
| **G2** | **No realtime subscription for in-app notifications** | **P2** | `useUnreadNotificationCount` | Badge updates delayed up to 30s. User must manually refresh inbox. Not blocking but suboptimal. |
| **G3** | **Dual notification path creates duplicates** | **P1** | `society-notifications.ts` vs `notification_queue` triggers | `notifySocietyMembers()` writes directly to `user_notifications` AND calls `send-push-notification` directly — bypassing the queue. Meanwhile, DB triggers ALSO write to `notification_queue`, which the cron job processes into `user_notifications` again. Some events could create duplicate inbox entries. |
| **G4** | **`click_action: FLUTTER_NOTIFICATION_CLICK`** | **P3** | `send-push-notification` line 137 | Harmless artifact. Capacitor ignores it. No functional impact. |

---

## Corrective Actions Required

### G1 — Zero device tokens (P0): NO CODE FIX NEEDED
This is a deployment gap, not a code bug. The code correctly:
- Skips registration on web (`if (!isNative) return`)
- Requests permission after login
- Saves token via upsert
- Retries if user isn't ready when token arrives

**Action needed:** Install a native build (TestFlight / internal test track) and verify:
1. Permission prompt appears after login
2. `registration` event fires and logs token
3. Token row appears in `device_tokens`
4. Trigger a notification event and confirm push arrives

### G3 — Dual path duplication risk (P1): NEEDS INVESTIGATION
Two paths exist:
1. **Queue path:** DB triggers → `notification_queue` → cron → `process-notification-queue` → inserts `user_notifications` + sends push
2. **Direct path:** `notifySocietyMembers()` → directly inserts `user_notifications` + directly invokes `send-push-notification`

If both paths fire for the same event, users get duplicate inbox entries. Need to verify which events use which path and ensure no overlap.

**Proposed fix:** Audit all notification trigger points. Either:
- Route ALL notifications through the queue (remove direct inserts from `society-notifications.ts`)
- OR ensure DB triggers and client-side calls never fire for the same event

### G2 — No realtime for inbox (P2): DEFERRED
Acceptable at current scale. Can add Supabase Realtime subscription on `user_notifications` later for instant badge updates.

---

## Final Verdict

### ⚠️ Conditionally Ready for Production

**The notification system is architecturally complete and correctly implemented.** All layers — Capacitor listeners, token lifecycle, backend queue, FCM payload structure, in-app UI — are properly wired.

**The single blocking issue is that no native build has been tested end-to-end.** The `device_tokens` table has 0 rows, meaning push notifications have never been delivered to any device. This cannot be verified or fixed from the web preview — it requires a TestFlight/Play Store internal test build.

**Conditions for production clearance:**
1. Install native build on real device
2. Verify token registration flow (check `device_tokens` table)
3. Trigger a notification event and confirm push delivery
4. Audit `society-notifications.ts` for duplicate notification risk (G3)

**Known limitations accepted:**
- 30-second polling delay for in-app badge (no realtime)
- `FLUTTER_NOTIFICATION_CLICK` artifact (harmless)
- No re-prompt if user denies notification permission (correct iOS/Android behavior)

