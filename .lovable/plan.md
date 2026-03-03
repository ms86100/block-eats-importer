

## Plan: Direct APNs Test Edge Function (Bypass Firebase Completely)

### Problem
FCM returns 200 OK but notifications never arrive. The token format is valid (`fZYG2oOwOUNWsrKm8TX3vJ:APA91b...`). Since you're certain Firebase is correctly configured, the only remaining variable is whether the FCM token maps to the correct APNs environment.

### What We'll Build
A new edge function `test-apns-direct` that:
1. Takes the **raw APNs device token** (not the FCM token) from the device
2. Sends directly to `api.push.apple.com` (production) using your `.p8` key
3. Returns the **exact APNs response code** — no Firebase in the middle

### Why This Is Definitive
- If APNs returns **200**: your `.p8` key and APNs environment are correct → problem is Firebase token mapping
- If APNs returns **400 BadDeviceToken**: the binary is signed for sandbox, not production
- If APNs returns **403 InvalidProviderToken**: the `.p8` key or Team ID is wrong
- If APNs returns **410 Unregistered**: the app was uninstalled or token expired

### Steps

1. **Add APNs secrets** — You'll need to provide:
   - `APNS_KEY_P8`: Your `.p8` key contents
   - `APNS_KEY_ID`: The Key ID from Apple Developer Portal
   - `APNS_TEAM_ID`: Your Apple Team ID
   - `APNS_BUNDLE_ID`: Your app's bundle ID (e.g., `com.sociva.app`)

2. **Create `test-apns-direct` edge function** that:
   - Constructs a JWT using the `.p8` key (ES256 algorithm)
   - Sends HTTP/2 POST to `https://api.push.apple.com/3/device/{apns_token}`
   - Returns the raw APNs status code and response

3. **Modify the push debug page** to:
   - Extract the **raw APNs token** (the 64-char hex string from `PushNotifications.register()`)
   - Add a "Send Direct APNs Test" button
   - Display the raw APNs response

4. **Update `usePushNotifications` hook** to expose the raw APNs token alongside the FCM token

### Technical Detail
The critical difference: FCM tokens are Firebase abstractions. APNs tokens are what Apple actually uses. By testing APNs directly, we eliminate Firebase as a variable entirely. The hook already receives the APNs token in the `registration` event on iOS — we just need to capture and expose it.

### Key Requirement
You will need to provide the `.p8` key file contents and associated metadata (Key ID, Team ID, Bundle ID) as secrets before this can work.

