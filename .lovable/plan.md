

## Three Bugs Identified

### Bug 1: Buzzing sound never stops after accepting an order
**Root cause:** The seller navigates to the bell icon or elsewhere without clicking "Dismiss" or "View" on the overlay. The `dismiss()` function (which calls `stopBuzzing`) is never invoked. The buzzing interval runs forever.

Additionally, the polling fallback queries ALL orders newer than `lastSeenAt` regardless of status. So even after an order is accepted, it still matches the poll query (though `seenIdsRef` prevents re-alerting for the same ID, the original buzzing interval from the first detection was never cleared).

**Fix in `useNewOrderAlert.ts`:**
- Filter polling to only fetch orders in actionable statuses: `status IN ('placed', 'enquired', 'quoted')`
- Add cleanup: when the hook unmounts or `sellerId` changes, call `stopBuzzing` to clear the interval
- Ensure `stopBuzzing` also suspends/closes the AudioContext to fully silence audio

### Bug 2: "New order arrived" popup reappears for already-accepted orders
**Root cause:** The polling doesn't filter by order status. Even though `seenIdsRef` deduplicates, if the component ever remounts (HMR, error boundary recovery, etc.), the `seenIdsRef` Set resets to empty and `lastSeenAtRef` resets to `new Date()`. On the next poll cycle, it can re-detect orders.

**Fix in `useNewOrderAlert.ts`:**
- Add `.in('status', ['placed', 'enquired', 'quoted'])` to the polling query so accepted/completed orders are never picked up

### Bug 3: Clicking "View" on overlay → crash → reload → logout
**Root cause:** The `NewOrderAlertOverlay` navigates to `/orders/${order.id}`. If this happens after a code deployment (stale chunk) or if the order data is in an unexpected state, the lazy-loaded `OrderDetailPage` module fails to load. The existing chunk-error handler in `main.tsx` reloads the page, which clears the auth session and redirects to login.

**Fix in `NewOrderAlertOverlay.tsx`:**
- Wrap navigation in a try-catch
- Use `navigate()` with a fallback

**Fix in `main.tsx`:**
- The chunk reload handler should NOT clear session — just reload without the `sessionStorage` flag causing issues

### Files to modify

1. **`src/hooks/useNewOrderAlert.ts`**
   - Add status filter to polling query: `.in('status', ['placed', 'enquired', 'quoted'])`
   - Ensure cleanup on unmount closes AudioContext and clears interval
   - Add a `dismissedIdsRef` to track dismissed orders and skip them even if re-detected

2. **`src/components/seller/NewOrderAlertOverlay.tsx`**
   - Wrap `handleView` navigation in try-catch with fallback to `/orders`

3. **`src/App.tsx`** (GlobalSellerAlert)
   - No changes needed — the fix is in the hook

