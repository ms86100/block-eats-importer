

## Research Findings: Why Push Notifications Fail on iOS

### What the community and official docs say (2026)

The **definitive recommendation** from the Capacitor ecosystem (dev.to, npm, GitHub issues) is:

> **`@capacitor-firebase/messaging`** is the production-ready solution for iOS FCM tokens. It handles native APNs-to-FCM swizzling internally and returns a **unified FCM token** on both platforms. The older combo of `@capacitor/push-notifications` + `@capacitor-community/fcm` is known to cause token conversion failures on iOS.

Key references:
- [GitHub Issue #2178](https://github.com/ionic-team/capacitor-plugins/issues/2178): `@capacitor/push-notifications` returns raw APNs tokens on iOS that are **invalid FCM tokens** (400 INVALID_ARGUMENT)
- [GitHub Issue #738](https://github.com/capawesome-team/capacitor-firebase/issues/738): `FCM.getToken()` hangs on iOS when Firebase is not initialized via `AppDelegate`
- [Dev.to Complete Guide](https://dev.to/saltorgil/the-complete-guide-to-capacitor-push-notifications-ios-android-firebase-bh4): Explicitly recommends migrating away from `@capacitor-community/fcm`

### What the device logs prove

The `push_logs` table shows a consistent failure pattern on iOS:

1. `RECONCILE_GET_FCM_PLUGIN_CALLING` fires — but `RECONCILE_GET_FCM_PLUGIN_RESULT` **never appears**
2. The `import('@capacitor-community/fcm')` dynamic import **hangs indefinitely** on the native bridge
3. After 5s timeout, the reconcile fails → `attemptRegistration` fires
4. `attemptRegistration` also hangs at `getPushNotificationsPlugin()` — **no `AR_PLUGIN_LOADED` log ever appears**
5. Result: `regState` stays stuck at `registering`, `hasToken: false` forever

**Root cause**: Sequential dynamic imports of Capacitor native plugins cause a **bridge deadlock** on iOS. The `@capacitor-community/fcm` plugin's `getToken()` call never resolves because Firebase SDK initialization is incomplete or swizzling conflicts with `@capacitor/push-notifications`.

### The Fix: Migrate to `@capacitor-firebase/messaging`

Replace the dual-plugin approach with the single unified plugin that the community recommends.

#### Step 1 — Swap the dependency

Remove: `@capacitor/push-notifications`, `@capacitor-community/fcm`
Add: `@capacitor-firebase/messaging` (^8.x for Capacitor 8)

#### Step 2 — Rewrite `usePushNotifications.ts`

The 1,395-line hook with retry loops, timeouts, bridge deadlock workarounds, and dual-plugin coordination gets replaced with a ~200-line hook:

```text
Flow (both platforms):
  FirebaseMessaging.requestPermissions()
  → FirebaseMessaging.getToken()     // returns FCM token on BOTH iOS and Android
  → save to device_tokens via claim_device_token RPC
  → listen for 'tokenReceived' event for refreshes
  → listen for 'notificationReceived' for foreground
  → listen for 'notificationActionPerformed' for taps
```

No APNs-to-FCM conversion needed. No bridge deadlock. No retry loops for token retrieval.

#### Step 3 — Update the banner and debug page

- `EnableNotificationsBanner.tsx`: Replace `PushNotifications.requestPermissions()` with `FirebaseMessaging.requestPermissions()`
- `PushDebugPage.tsx`: Update token extraction to use `FirebaseMessaging.getToken()`

#### Step 4 — Update `capacitor.config.ts`

Replace the `PushNotifications` plugin config with `FirebaseMessaging`:

```typescript
plugins: {
  FirebaseMessaging: {
    presentationOptions: ['badge', 'sound', 'alert'],
  },
}
```

#### Step 5 — Native side (user action required after deploy)

After pulling the code changes, the user must:
1. `npm install` (picks up new dependency)
2. `npx cap sync ios` (installs the Firebase Messaging pod)
3. Ensure `GoogleService-Info.plist` is in the Xcode project
4. Ensure `AppDelegate.swift` calls `FirebaseApp.configure()` and has push capability + background modes enabled
5. Build and deploy to device

### What stays the same

- `claim_device_token` RPC — no changes needed
- `device_tokens` table schema — compatible
- `process-notification-queue` edge function — already fixed in previous migration
- `push_logs` table and RLS — already fixed
- APNs direct delivery path — still works (apns_token captured separately)

### Risk mitigation

- Android continues to work identically (the new plugin returns FCM tokens on Android too)
- The `@capacitor-firebase/messaging` plugin is actively maintained (v8.0.1, published 2 months ago)
- Fallback: keep the debug page's "Save FCM Token Manually" button for emergency manual token injection

