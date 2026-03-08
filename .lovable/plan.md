

# Audit: Buyer Appointment Calendar & Order Detail — Static vs Dynamic

## Audit Results

**Everything is fully dynamic.** There is zero dummy/static/hardcoded data in the buyer booking views. Here is the component-by-component breakdown:

---

### 1. `BuyerBookingsCalendar` (Orders Page)

| Element | Source | Verdict |
|---------|--------|---------|
| Week day strip (dates) | Computed from `selectedDate` state via `date-fns` | **Dynamic** — real dates |
| Dot indicators on days | Checked against `bookings` array from DB | **Dynamic** |
| "X upcoming" count | `bookings.length` from DB query | **Dynamic** |
| "Next Appointment" card | First future booking with status `confirmed/scheduled/rescheduled` | **Dynamic** |
| Countdown text ("in 2h", "tomorrow") | Computed from `booking_date + start_time` vs `new Date()` | **Dynamic** — real-time |
| Booking cards (service name, seller name, time, location, staff, status) | All from `useBuyerServiceBookings` query joining `service_bookings → products → seller_profiles → service_staff` | **Dynamic** |

**Data hook:** `useBuyerServiceBookings` queries `service_bookings` filtered by `buyer_id`, `booking_date >= today`, status not cancelled/no_show. All joined data is real.

---

### 2. `UpcomingAppointmentBanner` (Home Page)

| Element | Source | Verdict |
|---------|--------|---------|
| Service name | `products.name` via FK join | **Dynamic** |
| Seller name | `seller_profiles.business_name` | **Dynamic** |
| Date label ("Today", "Tomorrow", "Mar 15") | Computed from `booking_date` | **Dynamic** |
| Time | `start_time` from `service_bookings` | **Dynamic** |
| Urgent pulse animation | `differenceInHours <= 2` | **Dynamic** |

---

### 3. `OrderDetailPage` — Appointment Details Section

| Element | Source | Verdict |
|---------|--------|---------|
| Booking date | `serviceBooking.booking_date` from `useServiceBookingForOrder` | **Dynamic** |
| Time range | `serviceBooking.start_time / end_time` | **Dynamic** |
| Countdown badge ("Starts in 2h") | Computed from booking time vs `new Date()` | **Dynamic** |
| Location type + address | `serviceBooking.location_type`, `buyer_address` | **Dynamic** |
| Status badge | `serviceBooking.status` mapped to `SERVICE_STATUS_LABELS` | **Dynamic** |
| Staff name | `service_staff.name` via join | **Dynamic** |
| Preparation instructions | Fetched from `service_listings.preparation_instructions` | **Dynamic** |
| Calendar export (.ics) | Generated from real booking data | **Dynamic** |
| Status timeline steps | From `category_status_flows` DB table via `useOrderDetail` | **Dynamic** |
| Guidance text ("Awaiting confirmation") | Mapped from `order.status` — hardcoded text per status, but the status itself is dynamic | **Dynamic trigger, static copy** (this is correct behavior — the copy is intentional UX guidance) |

---

### 4. Seller's `ServiceBookingsCalendar`

| Element | Source | Verdict |
|---------|--------|---------|
| All booking cards | `useSellerServiceBookings` query | **Dynamic** |
| Staff list for assignment | Queried from `service_staff` table | **Dynamic** |
| Week strip + day filtering | Same pattern as buyer — computed dates, filtered from DB | **Dynamic** |

---

## Conclusion

**No dummy data exists anywhere in the booking/calendar system.** Every date, time, service name, seller name, status, countdown, and staff assignment is pulled from the database in real-time. The only "static" elements are intentional UX copy strings (e.g., "Your booking is confirmed") that are triggered by dynamic status values — this is standard and correct.

Both buyer and seller calendars query the same `service_bookings` table, so a booking made by a buyer is immediately visible on the seller's calendar (and vice versa for status changes), subject to React Query's stale time (15 seconds for slots, default for bookings).

