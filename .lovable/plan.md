

## Fix: iOS Permission Prompt Not Appearing on "Turn On" Tap

### Root Cause

On **line 111** of `EnableNotificationsBanner.tsx`, the `handleTurnOn` handler does:

```typescript
const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');
const permResult = await FirebaseMessaging.requestPermissions();
```

The **dynamic `await import()`** breaks the iOS gesture chain. iOS requires `requestPermissions()` to be called **directly and synchronously** within the user tap event — any intermediate `await` (like a dynamic import) causes iOS to silently discard the permission request. The native OS prompt never appears.

The same pattern exists in `requestFullPermission` in `usePushNotifications.ts` (line 161) — it also dynamically imports before requesting.

### Fix

**Pre-import `FirebaseMessaging` at module level** so no `await` sits between the tap and the permission request.

#### `EnableNotificationsBanner.tsx`
- Add a **module-level variable** that caches the `FirebaseMessaging` reference
- **Eagerly import** it in a `useEffect` on mount (so it's ready before any tap)
- In `handleTurnOn`, call `FirebaseMessaging.requestPermissions()` **directly** — no `await import()` in the click path

#### `usePushNotifications.ts`
- Change `getFirebaseMessaging()` from a lazy dynamic import to a **cached singleton** — import once on first call, reuse thereafter
- In `requestFullPermission`, ensure the module is already loaded before the user gesture triggers it (pre-warm on mount)

### Changes

| File | Change |
|------|--------|
| `EnableNotificationsBanner.tsx` | Pre-import FirebaseMessaging on mount via useEffect; remove dynamic import from click handler |
| `usePushNotifications.ts` | Cache the FirebaseMessaging module after first import; pre-warm in the main effect so it's ready for `requestFullPermission` |

