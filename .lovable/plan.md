## Category Configuration & Attribute Blocks — COMPLETED

### What Was Done

**Part 1: Transaction Type & Feature Flags** — Updated all 54 categories in `category_config`:
- Food & Beverages → `cart_purchase`
- Education → `book_slot` (with recurring, staff, addons as appropriate)
- Home Services → `request_service` / `request_quote` / `book_slot`
- Personal Care → `book_slot` / `request_quote` / `cart_purchase`
- Domestic Help → `contact_only` (with recurring)
- Events → `request_quote` / `book_slot`
- Professional → `book_slot` / `request_service` / `request_quote`
- Pets → `cart_purchase` / `book_slot`
- Rentals → `contact_only` / `cart_purchase`
- Shopping → `cart_purchase` / `buy_now`
- Real Estate → `schedule_visit` / `contact_only`

**Part 2: Attribute Block Library** — Inserted 24 reusable blocks:
food_details, grocery_details, class_session_info, daycare_info, home_service_details, domestic_help_profile, beauty_salon_details, laundry_details, tailoring_details, catering_details, event_service_details, pet_service_details, pet_food_details, professional_service_details, rental_item_details, electronics_specs, furniture_details, clothing_details, books_details, toys_details, kitchen_details, real_estate_flat, parking_details, roommate_details

### No Code Changes Needed
Existing `ProductAttributeBlocks`, `useAttributeBlocks`, and `CategoryManager` components already handle the dynamic rendering.

---

## Listing Type Behavior Fix — COMPLETED

### Root Cause
- DB trigger `propagate_category_transaction_type` was never installed
- Products had invalid `action_type` values (`'buy'`, `'enquiry'`) not in `ACTION_CONFIG`
- DB default was `'buy'` instead of `'add_to_cart'`
- No INSERT-time trigger to derive action_type from category

### Database Fixes Applied
1. **INSERT trigger** `trg_set_product_action_type_on_insert` — auto-derives action_type from category_config.transaction_type
2. **UPDATE propagation trigger** `trg_propagate_category_transaction_type` — syncs products when admin changes category transaction_type
3. **Default changed** to `'add_to_cart'`
4. **Backfilled** all existing products with correct action_type values
5. **CHECK constraint** `products_action_type_valid` — prevents invalid values

### Frontend Fixes Applied
1. **`deriveActionType()` utility** in `marketplace-constants.ts` — maps transaction_type → action_type as safety net
2. **`transactionType`** added to `CategoryConfig` type and loaded from DB
3. **ProductListingCard** — uses `deriveActionType(product.action_type, catConfig.transactionType)`
4. **ProductGridCard** — uses `deriveActionType(product.action_type, null)`
5. **useProductDetail** — uses `deriveActionType`
6. **useCart** — rejects non-cart items (`action_type` not in `add_to_cart`/`buy_now`)
7. **useBulkUpload** — sets `action_type` from category config on bulk create
8. **ProductDetailSheet** — shows "Buy Now" label for `buy_now` action type

### Mapping Reference
| transaction_type | action_type | Button |
|-----------------|-------------|--------|
| cart_purchase | add_to_cart | ADD |
| buy_now | buy_now | BUY |
| book_slot | book | Book |
| request_service | request_service | Request |
| request_quote | request_quote | Quote |
| contact_only | contact_seller | Contact |
| schedule_visit | schedule_visit | Visit |

---

## Buyer & Seller Service Booking Experience — COMPLETED

### What Was Done

**1. Database: `session_feedback` table**
- New table with RLS for per-session ratings (1-5 stars + comment)
- Buyer can insert/read own; seller can read for their bookings
- Validation trigger ensures rating 1-5

**2. `useBuyerServiceBookings` hook** (`src/hooks/useServiceBookings.ts`)
- Fetches upcoming bookings for buyer joined with product + seller info
- Also added `useSessionFeedback` hook for checking existing feedback

**3. `BuyerBookingsCalendar` component** (`src/components/booking/BuyerBookingsCalendar.tsx`)
- Week strip day selector with dot indicators
- "Next Appointment" highlight card with countdown ("in 2 days", "tomorrow")
- Each booking card shows: service name, seller, time, location type, status badge
- Tap navigates to order detail
- Self-hides if no upcoming bookings

**4. Orders Page Integration** (`src/pages/OrdersPage.tsx`)
- `BuyerBookingsCalendar` added above order list in both buyer-only and tabbed views

**5. Enriched Seller Booking Cards** (`src/components/seller/ServiceBookingsCalendar.tsx`)
- Location type with icon (home visit / at seller / online)
- Duration display (e.g., "60 min")
- Buyer address when present (home visits)

**6. Session Feedback Prompt** (`src/components/booking/SessionFeedbackPrompt.tsx`)
- Inline 1-5 star rating with optional comment
- Shows after booking is completed on order detail page
- Shows "rated X/5" summary if already submitted

**7. Appointment Countdown on Order Detail** (`src/pages/OrderDetailPage.tsx`)
- Countdown badge ("Starts in 2h", "Starts in 3 days") for upcoming appointments
- Session feedback prompt integrated below booking add-ons
