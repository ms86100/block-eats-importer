## Investigation Results

I traced the full order placement flow for the order placed at 11:51:53 (id: `cf7ab068`). Here is what happened and why both the push notification and in-app popup failed.

---

### Root Cause 1: Push Notification — Nothing in the Queue

When the buyer placed the order, the code at `useCartPage.ts:241` called `process-notification-queue`, but the queue was **empty**:

```text
Order placed via RPC: create_multi_vendor_orders
  → RPC creates order in DB ✅
  → Client calls process-notification-queue ✅
  → Queue processor finds 0 items (nothing was ever enqueued) ❌
  → No push notification sent ❌
```

**The** `create_multi_vendor_orders` **database function does NOT insert into the** `notification_queue` **table.** There is also no client-side call to `sendOrderStatusNotification()` after order placement — that function is only called inside `updateOrderStatus()` (seller action), not during order creation.

The `process-notification-queue` edge function confirmed this — it processed 0 items.

### Root Cause 2: In-App Popup (Realtime Alert)

The `useNewOrderAlert` hook subscribes to realtime INSERT events on the `orders` table. This mechanism **requires the seller to have the app open in the foreground** with the seller context active. If the seller:

- Had the app closed or backgrounded
- Was not on a page where `GlobalSellerAlert` or `SellerDashboardPage` is mounted
- Had a stale/disconnected realtime channel

...the alert would not fire. The realtime subscription itself is correctly configured (the `orders` table IS in the `supabase_realtime` publication). So the popup mechanism is sound but only works when the seller is actively using the app.

The polling fallback (every 3-30s) would eventually pick it up, but only if the hook is mounted and running.

---

### Fix Plan

#### Fix 1: Enqueue seller notification on order placement (CRITICAL)

**File: `src/hooks/useCartPage.ts**`

After `createOrdersForAllSellers` succeeds (both COD and UPI paths), call `sendOrderStatusNotification()` for each created order with status `'placed'`. This sends an actual push notification to the seller's device even when their app is closed.

```typescript
// After order creation succeeds, notify each seller
for (const orderId of orderIds) {
  // Fetch order details to get seller info, then call sendOrderStatusNotification
}
```

However, the simpler and more reliable approach: **insert into** `notification_queue` **inside the** `create_multi_vendor_orders` **database function itself** via a DB migration. This way the notification is atomically created with the order — no client-side race condition possible.

#### Fix 2: Wire `sendOrderStatusNotification` for order placement (client-side fallback)

**File: `src/hooks/useCartPage.ts**`

After successful order creation, call `sendOrderStatusNotification` with status `'placed'` for each seller. This provides immediate push delivery as a belt-and-suspenders approach alongside the queue.

#### Fix 3: Ensure `process-notification-queue` actually has items to process

**DB Migration**: Add a trigger or modify the `create_multi_vendor_orders` function to INSERT a row into `notification_queue` for each order created, targeting the seller's `user_id` with title "New Order!" and type "order".

---

### Technical Details


| Component                         | Status                 | Issue                                        |
| --------------------------------- | ---------------------- | -------------------------------------------- |
| Order creation RPC                | Working                | Does not enqueue notifications               |
| `notification_queue` table        | Empty                  | Nothing inserts into it on order placement   |
| `process-notification-queue` edge | Working                | Correctly returns `processed: 0`             |
| `send-push-notification` edge     | Never invoked          | No logs found — confirms it was never called |
| Realtime subscription             | Correctly configured   | Only works when seller app is open           |
| Seller device tokens              | Present (2 iOS tokens) | Tokens exist but were never targeted         |


### Implementation Approach

1. **DB migration**: Modify `create_multi_vendor_orders` to insert into `notification_queue` for each seller when orders are created
2. **Client-side**: After order placement in `useCartPage.ts`, call `sendOrderStatusNotification` with `'placed'` status as immediate fallback
3. **Remove duplicate**: Remove the empty `process-notification-queue` call since it currently does nothing