

# Buyer & Seller Service Booking Experience — Enhancement Plan

## Current State Summary

**What works today:**
- Seller has `ServiceBookingsCalendar` (week view with accept/reject/start/complete actions)
- Seller has `SlotCalendarManager` (block/unblock slots)
- Seller has `ServiceBookingStats` (analytics widget)
- Buyer sees order detail with appointment date/time, status timeline, contextual messages, reschedule/cancel actions
- Buyer sees `RecurringBookingsList` on the Orders page
- Status flow is DB-driven via `category_status_flows`

**What's missing:**
- **Buyer has no calendar view** — bookings are buried in a flat order list with no schedule-oriented interface
- **No "upcoming next" prominence** — buyer can't quickly see their next appointment
- **No session progress** for multi-session/recurring services (e.g., "Class 3 of 10")
- **No post-session rating** at the individual session level (only order-level review exists)
- **Seller booking cards lack context** — no location, no buyer notes, no service duration shown

---

## Changes

### 1. New Component: `BuyerBookingsCalendar`

**File:** `src/components/booking/BuyerBookingsCalendar.tsx`

A calendar-based view for buyers showing all their upcoming service bookings. Mirrors the seller's `ServiceBookingsCalendar` layout pattern (week strip + daily list) but tailored for buyer context:

- Week day selector with dot indicators for days with bookings
- Each booking card shows: service name, seller name, time, location type, status badge
- Tap navigates to order detail
- "Next appointment" highlight card at the top showing the soonest confirmed/scheduled booking with countdown ("in 2 days", "tomorrow at 3 PM")
- For recurring services: shows session progress ("Session 3 of 10")

**Data source:** Query `service_bookings` where `buyer_id = auth.uid()` and `booking_date >= today`, joined with products + seller_profiles for display names.

### 2. New Hook: `useBuyerServiceBookings`

**File:** `src/hooks/useServiceBookings.ts` (add to existing file)

```typescript
export function useBuyerServiceBookings(buyerId: string | undefined) {
  return useQuery({
    queryKey: ['buyer-service-bookings', buyerId],
    queryFn: async () => {
      // Fetch upcoming bookings with product + seller info
      // Filter: booking_date >= today, status NOT IN (cancelled, no_show)
    },
    enabled: !!buyerId,
  });
}
```

### 3. Integrate Buyer Calendar into Orders Page

**File:** `src/pages/OrdersPage.tsx`

Add `BuyerBookingsCalendar` above the order list in the "My Orders" tab. It will only render if the buyer has any service bookings (graceful empty state — component self-hides if no bookings).

### 4. Enrich Seller Booking Cards

**File:** `src/components/seller/ServiceBookingsCalendar.tsx`

Add to each booking card:
- Location type icon + label (home visit / at seller / online)
- Buyer notes if present (from order.notes)
- Duration display (e.g., "60 min")
- For recurring bookings: session number indicator

### 5. Session-Level Feedback for Completed Bookings

**File:** `src/components/booking/SessionFeedbackPrompt.tsx`

After a booking is marked `completed`, show a lightweight inline rating prompt (1-5 stars + optional comment) on the order detail page. This differs from the existing `ReviewForm` (which is seller-level) — this captures per-session quality for multi-session services.

**Database:** New `session_feedback` table:
```sql
CREATE TABLE public.session_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES service_bookings(id) ON DELETE CASCADE NOT NULL,
  buyer_id UUID NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(booking_id, buyer_id)
);
ALTER TABLE public.session_feedback ENABLE ROW LEVEL SECURITY;
-- Buyer can insert/read own; seller can read for their bookings
```

### 6. "Next Appointment" Card on Buyer Order Detail

**File:** `src/pages/OrderDetailPage.tsx`

For service orders in `confirmed`/`scheduled` status, add a prominent card showing:
- Countdown to appointment ("Starts in 2 hours")
- Quick-access buttons: "Get Directions" (if at_seller), "Join Online" (if online), or address confirmation (if home_visit)
- Preparation tips based on service type (configurable per category in future)

---

## Database Migration

One new table: `session_feedback` (as described above) with RLS policies for buyer insert/read and seller read access.

## Files Changed

| File | Change |
|------|--------|
| `src/components/booking/BuyerBookingsCalendar.tsx` | **New** — Buyer calendar view |
| `src/hooks/useServiceBookings.ts` | Add `useBuyerServiceBookings` hook |
| `src/pages/OrdersPage.tsx` | Integrate `BuyerBookingsCalendar` |
| `src/components/seller/ServiceBookingsCalendar.tsx` | Enrich booking cards with location, duration, notes |
| `src/components/booking/SessionFeedbackPrompt.tsx` | **New** — Per-session rating widget |
| `src/pages/OrderDetailPage.tsx` | Add countdown card + session feedback prompt |
| Migration SQL | Create `session_feedback` table with RLS |

