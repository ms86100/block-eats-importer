

# Phase 1: Service Booking Infrastructure

## Scope
Core service tables, seller availability configuration, pre-generated slot system, booking flow for buyers, and extended order status flows for services. No technician assignment, analytics, or add-ons in this phase.

## Database Changes (1 migration)

### Table: `service_listings`
Extends the `products` table concept for service-specific metadata.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| product_id | uuid FK → products | 1:1 link to existing product record |
| service_type | text | `scheduled`, `on_demand`, `group`, `recurring` |
| location_type | text | `home_visit`, `at_seller`, `online` |
| duration_minutes | int | Session duration |
| buffer_minutes | int default 0 | Gap between appointments |
| max_bookings_per_slot | int default 1 | >1 for group services |
| price_model | text default 'fixed' | `fixed`, `hourly`, `tiered` |
| cancellation_notice_hours | int default 24 | Minimum notice for cancellation |
| rescheduling_notice_hours | int default 12 | Minimum notice for rescheduling |
| cancellation_fee_percentage | numeric default 0 | |
| created_at / updated_at | timestamptz | |

### Table: `service_availability_schedules`
Seller-configurable weekly schedule per service (or per seller default).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| seller_id | uuid FK → seller_profiles | |
| product_id | uuid FK → products | Nullable = seller default |
| day_of_week | int | 0=Sun, 6=Sat |
| start_time | time | |
| end_time | time | |
| is_active | boolean default true | |

### Table: `service_slots`
Pre-generated concrete slots with capacity tracking.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| product_id | uuid FK → products | |
| seller_id | uuid FK → seller_profiles | |
| slot_date | date | |
| start_time | time | |
| end_time | time | |
| max_capacity | int | From service config |
| booked_count | int default 0 | Incremented on booking |
| is_blocked | boolean default false | Manual block |
| created_at | timestamptz | |

Unique constraint: `(product_id, slot_date, start_time)` to prevent duplicates.

### Table: `service_bookings`
Links orders to specific slots with service-specific data.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| order_id | uuid FK → orders | |
| slot_id | uuid FK → service_slots | |
| buyer_id | uuid | |
| seller_id | uuid | |
| product_id | uuid | |
| booking_date | date | |
| start_time | time | |
| end_time | time | |
| location_type | text | |
| buyer_address | text | For home visits |
| status | text default 'confirmed' | Mirrors order status |
| rescheduled_from | uuid | Self-ref for reschedule tracking |
| cancelled_at | timestamptz | |
| cancellation_reason | text | |
| created_at / updated_at | timestamptz | |

### Data inserts: Extend `category_status_flows`
Add service-specific statuses for parent groups that have `transaction_type = 'booking'`:
- `requested` (sort 10)
- `confirmed` (sort 20)
- `scheduled` (sort 30)
- `on_the_way` (sort 40)
- `arrived` (sort 50)
- `in_progress` (sort 60)
- `completed` (sort 70)
- `cancelled` (sort 80, terminal)
- `rescheduled` (sort 15)
- `no_show` (sort 75, terminal)

Also add corresponding entries to `order_status_config` for labels/colors.

### RLS
- `service_listings`: Authenticated read; seller/admin write via `user_id` match on `seller_profiles`
- `service_availability_schedules`: Authenticated read; seller write
- `service_slots`: Authenticated read; seller/system write
- `service_bookings`: Buyer reads own; seller reads own; admin reads all

## Edge Function: `generate-service-slots`
Generates slots for a service for the next N days (default 14) based on `service_availability_schedules`. Called:
- When seller saves/updates availability schedule
- On a daily cron-like trigger (can be manual initially)

Logic: For each active day in schedule × each service → generate slots from `start_time` to `end_time` stepping by `duration_minutes + buffer_minutes`, respecting `max_bookings_per_slot` as `max_capacity`. Skip existing slots (upsert by unique constraint).

## Frontend Changes

### 1. Seller: Service Availability Config (`src/components/seller/ServiceAvailabilityConfig.tsx`)
- Weekly day/time grid (Mon-Sun, start/end time per day)
- Toggle days on/off
- Set slot duration, buffer time, max bookings per slot
- Save → writes to `service_availability_schedules` + calls `generate-service-slots`
- Accessible from SellerSettingsPage when the seller has service-type categories

### 2. Seller: Service Listing Form additions
- Extend existing product form in `SellerProductsPage.tsx` to show service-specific fields when `layoutType === 'service'`:
  - Service type selector (scheduled/on_demand/group)
  - Location type (home_visit/at_seller/online)
  - Duration, buffer time, max bookings per slot
  - Cancellation/rescheduling notice hours
- On save → also upserts `service_listings` row

### 3. Buyer: Enhanced BookingSheet (`src/components/booking/BookingSheet.tsx`)
- When booking a service listing, fetch available slots from `service_slots` where `booked_count < max_capacity` and `is_blocked = false`
- Pass real slot data to `TimeSlotPicker` via `availableSlots` prop (already supported)
- On confirm → create order + `service_bookings` row + increment `booked_count` on the slot
- Show location type and address input for home visits

### 4. Buyer: Reschedule/Cancel actions on `OrderDetailPage`
- Show "Reschedule" and "Cancel" buttons for service orders
- Reschedule: opens slot picker for new date/time, validates notice period, creates new booking linked via `rescheduled_from`
- Cancel: validates cancellation notice, shows fee if applicable, updates status

### 5. Seller: Bookings Calendar View (`src/components/seller/ServiceBookingsCalendar.tsx`)
- Simple day/week list view of upcoming bookings
- Shows slot times, buyer name, service name, status
- Accessible from seller dashboard

## Files to Create/Modify

1. **Migration SQL** — 4 new tables + RLS + seed status flow data
2. **New** `supabase/functions/generate-service-slots/index.ts`
3. **New** `src/components/seller/ServiceAvailabilityConfig.tsx`
4. **New** `src/components/seller/ServiceBookingsCalendar.tsx`
5. **Edit** `src/pages/SellerProductsPage.tsx` — service fields in product form
6. **Edit** `src/components/booking/BookingSheet.tsx` — fetch real slots, create service_bookings
7. **Edit** `src/pages/OrderDetailPage.tsx` — reschedule/cancel buttons for service orders
8. **Edit** `src/pages/SellerSettingsPage.tsx` — link to availability config
9. **Edit** `src/pages/SellerDashboardPage.tsx` — add bookings calendar section
10. **Edit** `src/types/database.ts` — add service booking types
11. **New** `src/hooks/useServiceSlots.ts` — fetch available slots for a product
12. **New** `src/hooks/useServiceBookings.ts` — seller's booking queries

## Notification Integration
The existing `fn_enqueue_order_status_notification` trigger will automatically fire for the new service statuses since they flow through the orders table. We add the new status cases (`on_the_way`, `arrived`, `in_progress`, `no_show`, `rescheduled`) to the trigger's CASE statement.

## Concurrency / Double-Booking Prevention
The `booked_count` increment on `service_slots` will use an atomic UPDATE with a WHERE clause: `UPDATE service_slots SET booked_count = booked_count + 1 WHERE id = $1 AND booked_count < max_capacity RETURNING id`. If no row returned, the slot is full — booking rejected.

