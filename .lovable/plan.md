

# Booking Workflow: Gap Analysis & Fix Plan

## Root Cause — Why Seller Sees No Actions

The system has a correct status flow in the database:

```text
education_learning / service_booking flow:
  requested (buyer, sort 10)
  rescheduled (buyer, sort 15)  ← THIS IS THE PROBLEM
  confirmed (seller, sort 20)
  scheduled (seller, sort 30)
  in_progress (seller, sort 60)
  completed (seller, sort 70, terminal)
```

**Bug in `getNextStatusForActor()`** (`useCategoryStatusFlow.ts` line 72-87): It only checks the *immediate* next step. When the current status is `requested`, the next step is `rescheduled` (actor: buyer). Since the function checks `if (actor === 'seller' && next.actor !== 'seller') return null`, it returns **null** — the seller gets no action button.

The function should **scan forward** past non-seller steps to find the next seller-actionable step (`confirmed`).

**Second bug on `OrderDetailPage.tsx` line 302**: The Reject button only shows for `placed` or `enquired` status. For service bookings that start at `requested`, the seller cannot reject either.

## What Currently Works (No Changes Needed)

- **Buyer post-booking message**: Line 132 shows "Booking request sent. Awaiting confirmation." for `requested` status. Already works.
- **Buyer timeline**: `displayStatuses` correctly derives from `category_status_flows`. Shows requested → confirmed → scheduled → in_progress. Already works.
- **Service booking details card**: Shows date, time, location, staff. Already works.
- **Buyer reschedule & cancel actions**: Already present in the order detail.
- **Admin configuration**: `category_status_flows` table already drives the flow per parent_group + transaction_type. Statuses are NOT hardcoded — they come from DB. Already configurable.
- **Notifications**: DB trigger `enqueue_order_status_notification` fires on order status change. Already works.

## Fixes Required

### Fix 1: `getNextStatusForActor()` — scan forward past non-actor steps

**File:** `src/hooks/useCategoryStatusFlow.ts`

Change the function to iterate forward from the current position, skipping steps that belong to a different actor, until it finds the next step the current actor can perform:

```typescript
export function getNextStatusForActor(
  flow: StatusFlowStep[],
  currentStatus: string,
  actor: string
): string | null {
  const currentIndex = flow.findIndex(s => s.status_key === currentStatus);
  if (currentIndex === -1) return null;

  // Scan forward for the next step this actor can perform
  for (let i = currentIndex + 1; i < flow.length; i++) {
    const step = flow[i];
    if (step.is_terminal) return step.actor === actor ? step.status_key : null;
    if (step.actor === actor) return step.status_key;
  }
  return null;
}
```

This means when the seller views a `requested` booking, it skips `rescheduled` (buyer) and finds `confirmed` (seller) → the "Mark Confirmed" button appears.

### Fix 2: Reject button for `requested` status

**File:** `src/pages/OrderDetailPage.tsx` line 302

Add `requested` to the reject condition:

```
(order.status === 'placed' || order.status === 'enquired' || order.status === 'requested')
```

### Fix 3: Seller guidance text for service bookings

**File:** `src/pages/OrderDetailPage.tsx`

Currently the seller action bar (line 298-310) shows just a button with no context. Add a small guidance line for sellers when viewing service bookings, showing what the next action means:

```
{o.isSellerView && order.status === 'requested' && (
  <p className="text-xs text-muted-foreground">
    Review the booking details and confirm or reject this appointment.
  </p>
)}
```

## Summary of Changes

| File | Change |
|------|--------|
| `src/hooks/useCategoryStatusFlow.ts` | Fix `getNextStatusForActor` to scan forward past non-actor steps |
| `src/pages/OrderDetailPage.tsx` | Add `requested` to reject button condition; add seller guidance text |

## What Already Works (No Gaps)

- Status lifecycle is admin-configurable via `category_status_flows` table
- Buyer sees status timeline, contextual messages, appointment details
- Buyer can reschedule and cancel
- Notifications fire on status changes
- Realtime updates refresh the order detail page

The core issue is simply that the seller's "next action" resolver has a logic bug that prevents buttons from appearing for service booking flows.

