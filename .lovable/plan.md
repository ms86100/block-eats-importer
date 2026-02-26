

## Problem Analysis

The root cause is in `useOrderDetail.ts` line 97:

```typescript
const statusOrder: OrderStatus[] = ['placed', 'accepted', 'preparing', 'ready', 'picked_up', 'delivered', 'completed'];
```

The `'enquired'` status is missing from this array. When `order.status === 'enquired'`:
- `statusOrder.indexOf('enquired')` returns **-1**
- `currentStatusIndex` = -1
- `getNextStatus()` calculates `nextIndex = -1 + 1 = 0` → returns `statusOrder[0]` = **`'placed'`**

This is why the seller sees "Mark Placed" — a completely invalid transition. The database trigger correctly rejects it, producing the error.

Additionally, after clicking "Accept" (which works via a separate code path), the component sets the local order status but `nextStatus` is computed once at render — and since `enquired` is still not in the array, the stale "Mark Placed" button persists.

## Plan

### File 1: `src/hooks/useOrderDetail.ts`

**Change A** — Add `enquired` to the status order array and create a service-appropriate flow:

Replace the single `statusOrder` with logic that checks order type:
- **Service/enquiry orders** (`order_type === 'enquiry'`): `enquired → accepted → preparing → ready → completed`
- **Regular orders**: `placed → accepted → preparing → ready → picked_up → delivered → completed`

This removes `picked_up` and `delivered` from service flows (they are food/delivery concepts).

**Change B** — Fix `getNextStatus()`:

For `enquired` status, the next valid status should be `accepted`. The existing reject button logic checks `order.status === 'placed'` — extend it to also show for `enquired`.

### File 2: `src/pages/OrderDetailPage.tsx`

**Change C** — Update the seller action bar:

- Show the Reject button for both `placed` and `enquired` statuses
- Update `displayStatuses` to be dynamic based on order type (service orders should show `Enquired → Accepted → Preparing → Ready` instead of `Placed → Accepted → Preparing → Ready`)

### File 3: `src/hooks/useStatusLabels.ts` (verify)

Confirm that `getOrderStatus('enquired')` returns a valid label. If not, add it.

---

### Summary of Changes

| What | Where | Why |
|------|-------|-----|
| Add `enquired` to status flow | `useOrderDetail.ts` | Fixes -1 index → wrong next status |
| Service-specific status sequence | `useOrderDetail.ts` | Removes irrelevant food/delivery statuses |
| Show Reject for `enquired` | `OrderDetailPage.tsx` | Seller can reject booking requests |
| Dynamic timeline labels | `OrderDetailPage.tsx` | Display correct steps for service orders |

