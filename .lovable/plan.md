

# Fix: Service Booking Pop-up Notification for Sellers

## Root Cause

The `useNewOrderAlert` hook filters incoming orders by `ACTIONABLE_STATUSES = ['placed', 'enquired', 'quoted']`. Service bookings create orders with status `requested`, which is not in this list. The order gets inserted, realtime fires, but `handleNewOrder` rejects it at line 54.

## Fix

**File:** `src/hooks/useNewOrderAlert.ts` (line 6)

Add `'requested'` to the `ACTIONABLE_STATUSES` array:

```typescript
const ACTIONABLE_STATUSES = ['placed', 'enquired', 'quoted', 'requested'] as const;
```

This single change ensures:
- The realtime INSERT listener accepts `requested` orders
- The polling fallback queries for `requested` orders
- The `handleNewOrder` filter passes `requested` orders through to trigger the buzzer and overlay

No other files need changes — the `NewOrderAlertOverlay` component already handles any status via its `statusLabel` function (which has a default case), and the notification/sound pipeline is status-agnostic.

