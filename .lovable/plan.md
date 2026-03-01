## Status: IMPLEMENTED ✅

## Problem

`@capacitor/push-notifications` on iOS only emits raw 64-char APNs hex tokens via the `registration` event. The native Swift `MessagingDelegate` injection was unreliable — the plugin already fired with the APNs token before the FCM token arrived.

## Solution: `@capacitor-firebase/messaging` installed

On iOS, the hook now uses `FirebaseMessaging.getToken()` and `tokenReceived` listener from `@capacitor-firebase/messaging` to get FCM tokens directly. On Android, it continues using `@capacitor/push-notifications` (which already returns FCM tokens).

### Changes Made

1. **Installed `@capacitor-firebase/messaging`** as dependency.

2. **Updated `src/hooks/usePushNotifications.ts`**:
   - iOS path: `FirebaseMessaging.requestPermissions()` → `FirebaseMessaging.getToken()` → FCM token ✅
   - iOS listener: `FirebaseMessaging.addListener('tokenReceived', ...)` for refresh
   - Android path: unchanged (`PushNotifications.register()` + `registration` listener)
   - Foreground toast/haptic listeners: unchanged (both platforms)
   - `isValidFcmToken` guard: kept as safety net

3. **Updated `codemagic.yaml`** (both `ios-release` and `release-all`):
   - Removed `didRegisterForRemoteNotificationsWithDeviceToken` override (plugin handles APNs→FCM internally)
   - Removed `MessagingDelegate` extension injection
   - Removed `FirebaseAppDelegateProxyEnabled` swizzling disable
   - Removed `import FirebaseMessaging` (not needed in AppDelegate anymore)
   - Kept: `FirebaseApp.configure()`, `FirebaseMessaging` pod, `GoogleService-Info.plist`, entitlements, background modes

### Token Flow

```
iOS (fixed):
  APNs → Firebase SDK (pod) → @capacitor-firebase/messaging → getToken()/tokenReceived → FCM token ✅

Android (unchanged):
  FCM SDK → @capacitor/push-notifications → registration event → FCM token ✅
```
