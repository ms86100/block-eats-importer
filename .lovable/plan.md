

# Seller Schedule Configuration: Current State & Recommendations

## Summary

The seller **can** configure their schedule, but the feature is **hidden in Settings** and there's no prompt guiding service sellers to set it up.

### Current Location
- **Seller Settings Page** (`/seller/settings`) → "Service Availability" section
- Only shown when `sellerFlags.hasServiceLayout === true` (i.e., seller has a category with `layout_type: service`)
- The `ServiceAvailabilityConfig` component lets sellers define working hours per day of week

### Why This Seller's Bookings Fail
1. Seller has category `yoga` → `layout_type: service` ✓
2. Seller has NOT configured any rows in `service_availability_schedules`
3. The daily slot generation cron (`generate-service-slots`) only creates slots for sellers with schedules
4. No slots exist → Booking shows "phantom" times → Fails with "slot unavailable"

---

## Discoverability Issue

The service availability config is buried at the bottom of Settings. Service sellers are not prompted to configure it when:
- Creating a service product
- First visiting their dashboard
- When a service product gets approved

---

## Proposed Improvements

### Option A: Add Prominent Setup Prompt on Dashboard (Recommended)
Show a warning banner on `SellerDashboardPage` when:
- Seller has `hasServiceLayout === true`
- AND `service_availability_schedules` has no active rows for this seller

**UI:** Alert card at top of dashboard:
> ⚠️ **Set up your service hours**  
> You haven't configured your availability schedule. Buyers can't book your services until you set your working hours.  
> [Configure Schedule] → links to `/seller/settings#availability`

### Option B: Add Quick Access on Dashboard
Add "Service Hours" card in the dashboard's "Slot Management" section that:
- Shows current schedule summary (or "Not configured" warning)
- Links to full config in settings

### Option C: Inline Schedule Config on Dashboard
Move `ServiceAvailabilityConfig` to dashboard (in addition to settings) for quicker access.

---

## Implementation (Option A)

**File:** `src/pages/SellerDashboardPage.tsx`

1. Add a query to check if seller has configured schedules
2. Show warning banner at top of page if no schedules exist

**File:** `src/pages/SellerSettingsPage.tsx`

1. Add `id="availability"` to the ServiceAvailabilityConfig section for deep linking

