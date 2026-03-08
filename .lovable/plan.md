
# Service Management UI — Gap Analysis & Implementation Plan

## Current State: What ALREADY Works

The service management infrastructure is **mostly built** but has two critical gaps in the UI flow:

### Working Components (Seller Side):
1. **SellerProductsPage** (`/seller/products`) — When editing a product in a service category, `ServiceFieldsSection` appears (duration, buffer, location type, etc.) and `ServiceAddonsManager` shows for existing products. Service listings are upserted to `service_listings` table on save.
2. **SellerSettingsPage** (`/seller/settings`) — Shows `ServiceAvailabilityConfig` (weekly schedule) and `ServiceStaffManager` if the seller's `primary_group` is in the service parent groups list.
3. **SellerDashboardPage** (`/seller`) — Shows `ServiceBookingsCalendar` and `SlotCalendarManager` for service-group sellers.

### Working Components (Admin Side):
1. **AdminCatalogManager** → **CategoryManager** — Has toggles for `supports_addons`, `supports_recurring`, `supports_staff_assignment` per category. This exists at Admin → Catalog tab.

### Working Backend:
- `service_listings`, `service_slots`, `service_bookings`, `service_staff`, `service_addons`, `service_booking_addons` tables all exist
- `book_service_slot`, `release_service_slot`, `reschedule_service_booking`, `can_cancel_booking` RPCs exist
- `generate-service-slots` and `send-appointment-reminders` edge functions exist

---

## Gap 1: BecomeSellerPage — No Service Configuration During Onboarding

**Problem:** `DraftProductManager` (used in `BecomeSellerPage` step 5) does NOT show `ServiceFieldsSection` when a seller selects a service category. It only inserts into `products` table — no `service_listings` row is created. So new service sellers onboard without configuring duration, buffer time, location type, etc.

**Fix:**
1. Add `ServiceFieldsSection` to `DraftProductManager` — detect if the selected category has `layoutType === 'service'` using `useCategoryConfigs`
2. After inserting the product, upsert the `service_listings` row (same pattern as `useSellerProducts.ts` lines 228-248)
3. Show a post-product-add prompt: "Set your availability schedule in Seller Settings after approval"

## Gap 2: No Admin UI to View/Monitor Service Bookings

**Problem:** Admin has no visibility into service bookings across the platform. The docs mention admin can monitor booking volume, cancellation rates, no-show rates — but no such tab/section exists in `AdminPage.tsx`.

**Fix:**
1. Create `AdminServiceBookingsTab` component showing:
   - Summary stats: total bookings, pending confirmations, no-show count, cancellation count
   - Filterable list of recent service bookings across all sellers
   - Ability to view booking details
2. Add it as a new tab in the admin sidebar nav (e.g., "Services" tab)

---

## Implementation Tasks

### Task 1: Add service fields to DraftProductManager
- Import `ServiceFieldsSection` and `useCategoryConfigs`
- Show `ServiceFieldsSection` when selected category's `layoutType === 'service'`
- On product save, upsert `service_listings` with the service config data
- Track state with `serviceFields` / `setServiceFields` (same pattern as `useSellerProducts`)

### Task 2: Create Admin Service Bookings tab
- Create `src/components/admin/AdminServiceBookingsTab.tsx`
- Query `service_bookings` with joins to `products`, `profiles` (buyer), `seller_profiles`
- Show stats cards: Total bookings, Pending, Completed, No-shows, Cancellations
- Show scrollable booking list with status badges, date/time, buyer/seller names
- Add "services" tab to `AdminSidebarNav` and render in `AdminPage.tsx`

### Task 3: DB migration for admin service booking access
- Add RLS policy on `service_bookings` for admin read access (if not already present)

### Summary
| Task | Type | Key Files |
|------|------|-----------|
| 1 | Component enhancement | `DraftProductManager.tsx` |
| 2 | New component + wiring | `AdminServiceBookingsTab.tsx`, `AdminPage.tsx`, `AdminSidebarNav.tsx` |
| 3 | DB policy | Migration SQL |
