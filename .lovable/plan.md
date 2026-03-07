

# Fix Plan: Seller Popup, Continuous Sound, and Buyer Push Notifications

## Summary of Root Causes

1. **Seller popup not appearing**: The `trg_enqueue_new_order_notification` INSERT trigger on `orders` is missing (confirmed: only 4 triggers exist, none for notifications). Realtime subscription has no error logging so silent failures go unnoticed.

2. **Sound rings only once**: The buzzer interval's AudioContext can get suspended by mobile OS. The interval runs but produces no sound because it doesn't call `.resume()` before playing.

3. **Buyer not getting push on status change**: `sendOrderStatusNotification` in `useOrderDetail.ts` calls the `send-push-notification` edge function with an anon JWT, which gets 401'd. No DB trigger exists to enqueue buyer notifications on status changes.

---

## Changes

### 1. DB Migration — Restore INSERT trigger + Add UPDATE trigger

Create migration with:

**a)** Restore the INSERT trigger:
```sql
CREATE TRIGGER trg_enqueue_new_order_notification
  AFTER INSERT ON public.orders FOR EACH ROW
  EXECUTE FUNCTION public.fn_enqueue_new_order_notification();
```

**b)** New function `fn_enqueue_order_status_notification` that fires on UPDATE, skips if `OLD.status = NEW.status`, builds buyer-facing notification content per status (accepted, preparing, ready, picked_up, delivered, completed, cancelled, quoted, scheduled), and inserts into `notification_queue` with `reference_path = '/orders/' || NEW.id`, `payload` with orderId/status/type.

**c)** Create the UPDATE trigger:
```sql
CREATE TRIGGER trg_enqueue_order_status_notification
  AFTER UPDATE ON public.orders FOR EACH ROW
  EXECUTE FUNCTION public.fn_enqueue_order_status_notification();
```

### 2. `src/hooks/useOrderDetail.ts` — Remove broken client-side push

Remove lines 171-182 (the `sendOrderStatusNotification` call). Keep only:
```typescript
supabase.functions.invoke('process-notification-queue').catch(() => {});
```
Also remove the `sendOrderStatusNotification` import.

### 3. `src/hooks/useNewOrderAlert.ts` — Fix AudioContext resilience

In the `startBuzzing` interval callback (lines 95-102), add `audioCtxRef.current.resume()` before each `createAlarmSound` call. If AudioContext is closed, recreate it. Log errors instead of swallowing them.

Add `.subscribe((status, err) => { console.log(...) })` to the Realtime channel (line 151) for diagnostics.

Change poll `catch {}` (line 222) to `catch (e) { console.warn(...) }`.

### 4. `src/hooks/useBuyerOrderAlerts.ts` — Add Realtime diagnostics

Change `.subscribe()` (line 104) to `.subscribe((status, err) => { console.log('[BuyerAlert] Realtime channel status:', status) })`.

---

## Files Changed
1. **New migration SQL** — Restore INSERT trigger + create UPDATE trigger for buyer notifications
2. **`src/hooks/useOrderDetail.ts`** — Remove `sendOrderStatusNotification` call (lines 171-182) and its import
3. **`src/hooks/useNewOrderAlert.ts`** — AudioContext `.resume()` in interval, Realtime logging, poll error logging
4. **`src/hooks/useBuyerOrderAlerts.ts`** — Realtime channel status logging

