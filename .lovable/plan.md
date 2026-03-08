

# Service Marketplace — Gap Analysis & Next Features

## What Already Exists (No Work Needed)

| Feature | Status |
|---------|--------|
| 1. Visual booking journey / status timeline | ✅ Already on OrderDetailPage — `displayStatuses` from DB |
| 2. Next step guidance (buyer) | ✅ Contextual messages per status (line 128-137 OrderDetailPage) |
| 3. Buyer reminders (24h + 1h) | ✅ `send-appointment-reminders` edge function + cron |
| 4. Buyer ↔ Seller chat | ✅ `OrderChat` component attached to every order |
| 5. No-show status | ✅ `no_show` in order_status enum, handled in UI |
| 6. Duration awareness | ✅ `service_duration_minutes` on products, enforced via slot generation |
| 7. Seller capacity (max per slot) | ✅ `max_capacity` on `service_slots`, enforced in `book_service_slot` |
| 8. Rescheduling rules (notice hours) | ✅ `reschedule_service_booking` checks `rescheduling_notice_hours` |
| 9. Cancellation rules (notice + fee) | ✅ `can_cancel_booking` RPC enforces notice period + fee |
| 10. Recurring sessions | ✅ `service_recurring_configs` + `process-recurring-bookings` cron |
| 11. Booking analytics (seller) | ✅ `ServiceBookingStats` + `SellerAnalytics` on dashboard |
| 12. Seller reputation signals | ✅ Trust scores, fulfillment rate, repeat customer %, on-time delivery |
| 13. Seller next step guidance | ✅ Just implemented in previous changes |
| 14. Buyer calendar | ✅ Just implemented `BuyerBookingsCalendar` |
| 15. Session feedback | ✅ Just implemented `SessionFeedbackPrompt` + `session_feedback` table |

## What's Actually Missing — Prioritized

### Tier 1: High Impact, Moderate Effort

**1. Slot Soft-Locking (Prevent Double-Booking Contention)**

Currently `book_service_slot` uses atomic DB update, but two buyers can select the same slot in the UI simultaneously. Add a lightweight hold mechanism:

- New DB table `slot_holds` (slot_id, user_id, expires_at)
- On slot selection in `TimeSlotPicker`, create a 5-min hold via RPC
- `book_service_slot` checks for existing non-expired holds by other users
- Cron or DB function auto-cleans expired holds
- UI shows "held by another user" for contested slots

**2. Service Preparation Instructions**

Sellers currently have no way to attach "what to bring / how to prepare" text per service. Add:

- New column `preparation_instructions TEXT` on `service_listings` table
- Seller can edit in product form
- Display in: booking confirmation toast, order detail page, reminder notifications
- Category-configurable: admin toggle `supports_preparation_instructions`

**3. "Add to Calendar" (iCal Export)**

No calendar sync exists. Add a simple client-side `.ics` file download button on confirmed bookings:

- Generate iCal format string with event title, date, time, location, description
- Download as `.ics` file (works with Google Calendar, Apple Calendar, Outlook)
- Button appears on `OrderDetailPage` for confirmed/scheduled service orders
- No API integration needed — pure client-side

**4. Seller Day Planner / Agenda View**

The seller has a week calendar but no focused daily agenda. Add:

- New component `SellerDayAgenda` showing today's bookings as a vertical timeline
- Each card: time, service, buyer name, status badge, quick actions (start/complete/message)
- Integrate into `SellerDashboardPage` as a "Today" tab or top section
- Leverages existing `useSellerServiceBookings` hook

**5. Waitlist for Full Slots**

When a slot is at capacity, allow buyers to join a waitlist:

- New table `slot_waitlist` (slot_id, buyer_id, product_id, created_at, notified_at)
- "Join Waitlist" button in `TimeSlotPicker` when slot is full
- When a booking is cancelled (slot released), trigger notification to first waitlisted buyer
- DB trigger on `service_slots.booked_count` decrease → enqueue notification

### Tier 2: Nice-to-Have

**6. Session Package Tracking (Multi-Class Progress)**

For recurring configs, show "Session X of Y" progress:

- Add `total_sessions` and `completed_sessions` columns to `service_recurring_configs`
- Increment `completed_sessions` when a linked booking hits `completed`
- Display progress bar on buyer's recurring config cards and order detail
- Seller sees progress on their booking cards

**7. 15-Minute Reminder**

Currently reminders fire at 24h and 1h. Add a 15-min reminder:

- Update `send-appointment-reminders` edge function to add a third check window
- Use existing notification pipeline

**8. Cancellation Actor Tracking**

Currently `cancelled` doesn't distinguish who cancelled. Add:

- New column `cancelled_by` on `service_bookings` (enum: 'buyer', 'seller', 'system')
- Set during cancellation flow
- Display in order timeline: "Cancelled by seller" vs "Cancelled by buyer"

---

## Implementation Plan (Tier 1 only)

| # | Feature | Files | DB Changes |
|---|---------|-------|------------|
| 1 | Slot soft-locking | `TimeSlotPicker.tsx`, new RPC `hold_slot` / `release_hold`, new table `slot_holds` | Yes |
| 2 | Preparation instructions | `service_listings` ALTER, seller product form, `OrderDetailPage.tsx`, reminder function | Yes |
| 3 | Add to Calendar | New `CalendarExportButton.tsx`, `OrderDetailPage.tsx` | No |
| 4 | Seller Day Agenda | New `SellerDayAgenda.tsx`, `SellerDashboardPage.tsx` | No |
| 5 | Slot Waitlist | New table `slot_waitlist`, `TimeSlotPicker.tsx`, cancellation trigger | Yes |

I recommend implementing in the order: **3 → 4 → 2 → 1 → 5** (easiest/highest-value first).

