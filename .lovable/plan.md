

# Fix Plan: Notification Sound, Tap Navigation, and In-App Link

## Three Root Causes Identified

### Issue 1: No persistent ringing when push arrives in foreground
The foreground push handler (`usePushNotifications.ts` line 310-321) only shows a toast and a single haptic. It does NOT trigger the seller's `useNewOrderAlert` buzzer system. The buzzer only activates via the Supabase Realtime subscription or polling — not from push notifications. When the app is in the foreground and a push arrives, the seller hears a brief toast chime but not the continuous alarm.

**Fix**: In the `pushNotificationReceived` listener, detect order-type notifications and trigger the `useNewOrderAlert` system by injecting a synthetic "new order" into its pending alerts. Since `usePushNotifications.ts` is frozen and the push provider wraps the seller alert, the cleanest approach is to emit a custom DOM event from the foreground handler that `useNewOrderAlert` listens for.

### Issue 2: Notification tap leads nowhere (no navigation)
The tap handler checks `data?.route` (line 329), but the APNs payload sent by the backend contains `{ orderId, status, type }` — there is NO `route` field. The push logs confirm: `data: { aps: {...}, orderId: "625fc808...", status: "placed", type: "order" }`. Since `data.route` is undefined, `navigateRef.current()` is never called.

**Fix**: Update the `pushNotificationActionPerformed` handler to also check for `data?.orderId` and navigate to `/orders/${data.orderId}` when present. This is a minimal, safe change.

### Issue 3: In-app notification "New Order Received" links to 404
The `reference_path` stored in `notification_queue` and `user_notifications` is `/seller/orders/625fc808...`. But the app has NO route matching `/seller/orders/:id`. The only order detail route is `/orders/:id`.

**Evidence**: DB query confirms `reference_path: /seller/orders/625fc808-4975-4d27-be72-27b85b80a376`. The route table in `App.tsx` line 340 only has `<Route path="/orders/:id" ...>`.

**Fix**: Change the `create_multi_vendor_orders` DB function to use `/orders/` instead of `/seller/orders/`. Also fix the `fn_enqueue_new_order_notification` trigger function which uses the correct `/orders/` path already, but the RPC version overrides it.

---

## Implementation

### 1. DB Migration: Fix `reference_path` in `create_multi_vendor_orders`
Change line 51 from `/seller/orders/` to `/orders/`:
```sql
'/orders/' || _order_id::text,
```
This also updates existing broken notifications so tapping them works.

### 2. `usePushNotifications.ts`: Handle notification tap for order data
Update the `pushNotificationActionPerformed` handler to navigate when `orderId` is present:
```typescript
if (data?.route) {
  navigateRef.current(data.route);
} else if (data?.orderId) {
  navigateRef.current(`/orders/${data.orderId}`);
}
```

### 3. `usePushNotifications.ts`: Trigger seller alert on foreground push
In the `pushNotificationReceived` handler, dispatch a custom event when an order notification arrives:
```typescript
if (notification?.data?.type === 'order' && notification?.data?.orderId) {
  window.dispatchEvent(new CustomEvent('push:new-order', { 
    detail: { orderId: notification.data.orderId, status: notification.data.status } 
  }));
}
```

### 4. `useNewOrderAlert.ts`: Listen for foreground push events
Add a `window` event listener for `push:new-order` that fetches the order and pipes it through `handleNewOrder`, triggering the persistent buzzer.

### 5. Fix existing broken `user_notifications` records
Run a one-time SQL update to fix existing records:
```sql
UPDATE user_notifications 
SET reference_path = REPLACE(reference_path, '/seller/orders/', '/orders/') 
WHERE reference_path LIKE '/seller/orders/%';

UPDATE notification_queue 
SET reference_path = REPLACE(reference_path, '/seller/orders/', '/orders/') 
WHERE reference_path LIKE '/seller/orders/%';
```

---

## Files Changed
1. **DB migration** — Fix `reference_path` in RPC + patch existing records
2. **`src/hooks/usePushNotifications.ts`** — Add `orderId` navigation fallback + dispatch foreground order event
3. **`src/hooks/useNewOrderAlert.ts`** — Listen for `push:new-order` custom event to trigger buzzer

