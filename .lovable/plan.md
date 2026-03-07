

## Root Cause

The `orders` table is **not published** to the `supabase_realtime` publication. The seller's new-order alert system (`useNewOrderAlert.ts`) relies on a Realtime subscription listening for `INSERT` events on the `orders` table. Since the table isn't in the publication, Realtime never fires — sellers never see the alert overlay.

The polling fallback exists but only catches orders created after the current browser session started, and with increasing backoff delays (up to 30s), it's unreliable as a primary mechanism.

**Current published tables:** `user_roles`, `society_admins`, `bulletin_posts`, `delivery_assignments`, etc. — but **not** `orders`.

## Fix

**Single database migration** to add the `orders` table to the Realtime publication:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
```

No frontend changes needed — the `useNewOrderAlert` hook and `NewOrderAlertOverlay` component are already correctly wired up. Once Realtime events flow, sellers will see the alert popup with accept/reject immediately when a buyer places an order.

