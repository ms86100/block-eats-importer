

# Seller Control Gaps: Audit & Fix Plan

## Current State: What's Real vs What's Broken

After auditing every seller-facing page, here is the honest truth about which features have proper seller controls and which are "display-only" with no way for the seller to manage them.

---

## GAP AUDIT

### SUPPORTED (Seller has full UI control)
- Business name, description, profile/cover images
- Category selection (within locked primary group)
- Operating days and availability hours
- Store open/close toggle
- Payment methods (COD, UPI, bank details)
- Cross-society sales toggle + delivery radius slider
- Product CRUD: name, price, description, image, category, veg/non-veg, bestseller, recommended, urgent, availability toggle
- License upload (for regulated categories)

### PARTIALLY SUPPORTED (exists somewhere but not where it matters)
1. **Preparation Time (`prep_time_minutes`)** -- exists in `DraftProductManager` (onboarding) but is COMPLETELY MISSING from `SellerProductsPage` (the main product management page). A seller who onboarded without setting it, or wants to update it later, has zero way to do so. The column exists in DB, the buyer-side shows it, but the seller's primary product edit form doesn't include it.

### NOT SUPPORTED AT ALL (no seller UI exists)
2. **Delivery/Pickup Mode** -- We show "FREE delivery" on buyer-side but there is no column or toggle for the seller to specify: "I only do self-pickup" vs "I deliver within my society" vs "I deliver cross-society." No `delivery_type` or `fulfillment_mode` field exists anywhere.
3. **Seller Response Time Display** -- We show "Responds in ~X min" on `SellerDetailPage` computed from order data, but the seller cannot see their own response time metric anywhere on their dashboard. They have no visibility into what buyers see about them.
4. **"Your Neighbor" / Block Info** -- We display block info from the seller's profile on buyer-side, but sellers cannot see or edit their block/flat info from the seller settings. They'd have to go to their personal profile page.
5. **Price Range on Seller Cards** -- Buyer-side shows price range, but sellers have no visibility into how their store appears to buyers (no "preview my store" feature).
6. **Per-Product Stock/Inventory** -- There is no stock quantity field. A seller can only toggle `is_available` on/off. They cannot say "I have 5 left" or "Out of stock until tomorrow."
7. **Seller Analytics Visibility into Trust Signals** -- The `SellerAnalytics` component shows repeat buyers, cancellation rate, and peak hours. But the seller CANNOT see: their own rating/review count, their fulfillment rate, their avg response time, or what badges buyers see on their profile. These metrics are computed and stored in `seller_profiles` columns (`avg_response_minutes`, `completed_order_count`, `cancellation_rate`) but never shown to the seller.

---

## Implementation Plan

### Task 1: Add `prep_time_minutes` to the Product Edit Form (SellerProductsPage)

**The gap:** The main product management dialog (`SellerProductsPage.tsx`) has no prep time field. Only the onboarding draft manager has it.

**Fix:**
- Add a "Preparation Time (minutes)" input field to the product add/edit dialog in `SellerProductsPage.tsx`
- Include `prep_time_minutes` in the `formData` state, `resetForm()`, `openEditDialog()`, and `handleSave()` functions
- Show it between the price field and the veg/non-veg toggle

### Task 2: Add Delivery/Fulfillment Mode to Seller Settings

**The gap:** No way for seller to specify how they fulfill orders.

**Fix:**
- Add a `fulfillment_mode` column to `seller_profiles` table via migration (enum-like text: `self_pickup`, `delivery`, `both`, default `self_pickup`)
- Add a `delivery_note` text column for sellers to write custom delivery instructions (e.g., "Pickup from Gate 2" or "Will deliver to your door within 1 hour")
- Add a "Fulfillment Mode" section in `SellerSettingsPage.tsx` with radio/toggle options:
  - "Self Pickup Only" -- buyer picks up from seller
  - "I Deliver" -- seller delivers within society/radius  
  - "Both" -- buyer can choose
- Add a text input for delivery instructions
- Display this info on `SellerDetailPage` and `ProductDetailSheet` on buyer side

### Task 3: Add "My Store Performance" Section to Seller Dashboard

**The gap:** Sellers cannot see what trust signals buyers see about them.

**Fix:**
- Add a "Your Store Profile" card to `SellerDashboardPage.tsx` showing:
  - Current rating + review count (from `seller_profiles.rating` and `total_reviews`)
  - Avg response time (from `avg_response_minutes`)
  - Fulfillment count (from `completed_order_count`)
  - Cancellation rate (from `cancellation_rate`)
  - "New Seller" badge status (if `completed_order_count < 5`)
  - Last active timestamp
- This is read-only (seller can see but not edit -- these are computed from real data)
- Label it "How buyers see your store" so sellers understand these are public signals

### Task 4: Add Store Preview Link

**The gap:** Sellers have no way to see their store the way buyers see it.

**Fix:**
- Add a "Preview My Store" button on `SellerDashboardPage` and `SellerSettingsPage` that links to `/seller/{sellerId}` (the buyer-facing seller detail page)
- Simple but powerful -- lets sellers verify their images, descriptions, product listings, and trust signals

---

## Technical Summary

| Task | Files Modified | Files Created | DB Changes |
|------|---------------|---------------|------------|
| 1. Prep time in product edit | `SellerProductsPage.tsx` | None | None (column exists) |
| 2. Fulfillment mode | `SellerSettingsPage.tsx`, `SellerDetailPage.tsx`, `ProductDetailSheet.tsx`, `SearchPage.tsx`, `types/database.ts` | None | Migration: add `fulfillment_mode` + `delivery_note` to `seller_profiles` |
| 3. Store performance card | `SellerDashboardPage.tsx` | None | None (columns exist) |
| 4. Store preview link | `SellerDashboardPage.tsx`, `SellerSettingsPage.tsx` | None | None |

### Implementation Order
Task 1 first (smallest, highest impact -- unblocks prep time for all existing sellers), then Task 2 (new schema), then Tasks 3-4 together (dashboard polish).

