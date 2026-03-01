

## Problem

The project relies solely on `@capacitor/push-notifications`, which on iOS only ever emits **APNs tokens** via the `registration` event. The native Swift injection in Codemagic correctly passes the APNs token to Firebase and receives the FCM token back, but posting it to `.capacitorDidRegisterForRemoteNotifications` does **not** reliably feed back into the `@capacitor/push-notifications` JS listener — the plugin has already fired with the APNs token.

**Result**: The frontend always receives 64-char APNs hex tokens on iOS, never FCM tokens. The `isValidFcmToken` guard rejects them, so no token is ever saved.

## Solution: Install `@capacitor-firebase/messaging`

Replace the push notification registration path on iOS with `@capacitor-firebase/messaging`, which natively integrates with Firebase and emits FCM tokens directly from its `tokenReceived` listener.

### Implementation Steps

1. **Install `@capacitor-firebase/messaging`** as a dependency.

2. **Update `src/hooks/usePushNotifications.ts`**:
   - On iOS (detected via `Capacitor.getPlatform()`), import and use `FirebaseMessaging` from `@capacitor-firebase/messaging` instead of `PushNotifications` from `@capacitor/push-notifications`.
   - Use `FirebaseMessaging.requestPermissions()` and `FirebaseMessaging.getToken()` to obtain the FCM token directly.
   - Listen to `FirebaseMessaging.addListener('tokenReceived', ...)` for token refresh events.
   - On Android/web, continue using `@capacitor/push-notifications` as before (Android already returns FCM tokens natively).
   - Keep the `isValidFcmToken` guard as a safety net.
   - Keep foreground notification listeners (`pushNotificationReceived`, `pushNotificationActionPerformed`) using `PushNotifications` — they still work for displaying toasts.

3. **Update `codemagic.yaml`**:
   - Remove the `MessagingDelegate` Swift injection and the `didRegisterForRemoteNotificationsWithDeviceToken` override — `@capacitor-firebase/messaging` handles this internally.
   - Keep Firebase SDK pod injection (`FirebaseMessaging` pod, `GoogleService-Info.plist` copy, `FirebaseApp.configure()`).
   - Keep entitlements and background modes injection.

4. **No database or migration changes needed** — the token format stored in `device_tokens` will now be correct FCM tokens.

### Technical Detail

```text
Current flow (broken):
  APNs → @capacitor/push-notifications → 'registration' event → 64-char hex token ❌

Fixed flow:
  APNs → Firebase SDK (via pod) → @capacitor-firebase/messaging → 'tokenReceived' → FCM token ✅
```

