

# Checkout Page Trust & Confidence Enhancement Plan

## Current State
The CartPage (which IS the checkout page) has:
- Sticky header with item count
- Delivery time estimate (prep time)
- Urgent item warning
- Min order warnings
- Multi-seller split explanation
- Cart items grouped by seller with quantity controls
- Notes/instructions textarea
- Payment method selector (COD/UPI)
- Fulfillment selector (pickup/delivery)
- Coupon input
- Price breakdown (per-seller subtotals, delivery fee, platform fee ₹0)
- Address card
- Refund promise banner
- Neighborhood guarantee banner
- Confirm dialog → Order progress overlay → Razorpay sheet

## What's Missing — Gap Analysis

### 1. Seller Trust Badges per Cart Group (MISSING)
Each seller group header shows just a store icon and name. Add `SellerTrustBadge` (Community Trusted, Favorite, etc.) next to each seller name in the cart group header. Instant trust signal at the point of commitment.

**File:** Modify `CartPage.tsx` — seller group header (line ~134)
**Data:** Need `completed_order_count` and `rating` from seller. Check if already in cart item's `product.seller`.

### 2. Delivery Reliability Micro-Score (MISSING)
Show a compact one-liner per seller group: "Delivers on time 94%" using `DeliveryReliabilityScore` in `compact` mode.

**File:** Modify `CartPage.tsx` — below each seller group header
**Component:** `DeliveryReliabilityScore` already supports `compact` prop

### 3. First Order Protection per Seller (MISSING)
If this is the buyer's first order with a specific seller, show "First Order Protected — instant refund if something goes wrong" inline in that seller's group.

**File:** Create `useFirstOrderCheck.ts` hook — batch-check if user has prior completed orders with each seller in cart.
**Integration:** Show `FirstOrderBadge` (card variant) inside seller groups where applicable.

### 4. Savings & Value Reinforcement (MISSING)
Above the "Place Order" button, show a savings summary when a coupon is applied or free delivery is earned:
> "You're saving ₹70 on this order (₹50 coupon + ₹20 free delivery)"

**File:** Modify `CartPage.tsx` — sticky footer area (line ~263)
**Logic:** Calculate from `effectiveCouponDiscount` + delivery fee savings

### 5. Refund Tier Badge per Order Value (MISSING)
`RefundTierBadge` exists but is only on product detail. Show it in the price breakdown section based on `finalAmount` — tells buyers exactly what refund protection they get.

**File:** Modify `CartPage.tsx` — below price breakdown (line ~224)

### 6. Social Proof in Confirm Dialog (MISSING)
The confirmation dialog is bare. Add a trust reinforcement line:
> "You're ordering from Community Trusted sellers" or "94% on-time delivery"

**File:** Modify `CartPage.tsx` — confirm dialog (line ~288)

### 7. Estimated Delivery Window (ENHANCE)
Currently only shows prep time. For delivery orders, add an estimated delivery window based on prep time + a buffer:
> "Expected delivery: Today, 6:30 – 7:00 PM"

**File:** Modify `CartPage.tsx` — delivery time section (line ~78)
**Logic:** Current time + prep time + 30 min buffer, formatted as time range

## Implementation Summary

| # | Task | Effort |
|---|---|---|
| 1 | Seller trust badges in cart group headers | Low |
| 2 | Delivery reliability micro-score per seller | Low |
| 3 | First order protection check + badge per seller | Medium |
| 4 | Savings reinforcement in sticky footer | Low |
| 5 | Refund tier badge in price breakdown | Low |
| 6 | Trust line in confirm dialog | Low |
| 7 | Estimated delivery time window | Low |

No database migrations needed — all data sources and components already exist.

