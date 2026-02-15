

# Comprehensive Product Improvement Plan

Based on a thorough audit of the codebase, database state, and the product strategy analysis, here are the prioritized tasks to address the critical gaps -- organized from highest impact to lowest.

---

## Phase 1: Fix the Broken Product Discovery Flow (Critical)

### Task 1.1: Add Product Detail Sheet
**Problem:** Tapping a product on the search page redirects to `/seller/:id` (the entire seller storefront). A buyer searching for "biryani" doesn't want to land on a seller's full menu -- they want to see that specific product's details and add it to cart instantly.

**Solution:** Create a `ProductDetailSheet` (bottom sheet) that opens when tapping any `ProductResultCard` on the Search page. It shows:
- Full product image (large)
- Product name, price, veg/non-veg badge
- Product description
- Seller name (tappable link to seller page)
- Seller rating + review count
- Society/distance badge
- "Add to Cart" button with quantity stepper
- "View Seller's Full Menu" link at the bottom

**Files:**
- New: `src/components/product/ProductDetailSheet.tsx`
- Modified: `src/pages/SearchPage.tsx` (replace `Link to={/seller/...}` with sheet trigger)

### Task 1.2: Add "Add to Cart" Button on Search Result Cards
**Problem:** Currently, the only way to add a product to cart is to navigate to the seller page, find the product, then add it. This is 3 clicks for what should be 1.

**Solution:** Add an inline "Add +" button directly on each `ProductResultCard`. When tapped, it adds the product to the cart with quantity 1. If already in cart, show the +/- quantity stepper inline (same pattern as `ProductCard`).

**Files:**
- Modified: `src/pages/SearchPage.tsx` (ProductResultCard component -- add cart integration)

---

## Phase 2: Remove Fake Trust Signals (Trust-Critical)

### Task 2.1: Reset Seeded Ratings to Zero
**Problem:** We seeded fake ratings (4.2, 4.5, 4.8, etc.) on seller profiles that have zero real orders. This is deceptive. Any user who orders from a "4.8 rated" seller and gets a bad experience will never come back.

**Solution:**
- Run a SQL update to set `rating = 0` and `total_reviews = 0` on all seller profiles that have no actual reviews in the `reviews` table
- In the UI, when a seller has 0 reviews, show a "New Seller" badge instead of empty stars
- Show "X families ordered this week" computed from real `orders` data (count of distinct buyer_ids in last 7 days)

**Files:**
- Database migration: Reset fake ratings
- Modified: `src/components/ui/rating-stars.tsx` (handle 0-review state)
- Modified: `src/pages/SearchPage.tsx` (ProductResultCard -- show "New" badge when 0 reviews)
- Modified: `src/pages/SellerDetailPage.tsx` (show "New Seller" badge, show real order count)

---

## Phase 3: Seller Transparency & Confidence (Seller-Side)

### Task 3.1: Add Preparation Time to Products
**Problem:** Buyers have zero idea how long an order will take. There's no delivery/preparation ETA anywhere in the system.

**Solution:**
- Add `prep_time_minutes` column to `products` table (nullable integer, default null)
- Seller can set this per product in the product manager
- Display on ProductResultCard, ProductDetailSheet, and CartPage as "Ready in ~30 min"
- Cart shows the longest prep time across all items: "Estimated ready time: ~45 min"

**Files:**
- Database migration: `ALTER TABLE products ADD COLUMN prep_time_minutes integer`
- Modified: `src/components/seller/DraftProductManager.tsx` (add prep time input)
- Modified: `src/pages/SearchPage.tsx` (show prep time on cards)
- Modified: `src/pages/CartPage.tsx` (show estimated ready time)

### Task 3.2: Add Seller Analytics Dashboard
**Problem:** Sellers have no visibility into who's viewing their products, what's popular, or when their peak hours are. Without data, sellers can't improve.

**Solution:** Add a simple analytics section to the Seller Dashboard showing:
- Product-level view proxy: "Most ordered items" (from real order_items data)
- Peak ordering hours (group orders by hour of day)
- Repeat customer count (distinct buyers who ordered 2+ times)
- Cancellation rate (cancelled orders / total orders)

All computed from existing `orders` and `order_items` tables -- no new tables needed.

**Files:**
- New: `src/components/seller/SellerAnalytics.tsx`
- Modified: `src/pages/SellerDashboardPage.tsx` (add analytics section)
- New: `src/hooks/queries/useSellerAnalytics.ts`

---

## Phase 4: Cart & Checkout Trust (Buyer-Side)

### Task 4.1: Cross-Society Cart Warning
**Problem:** If a buyer has items from a seller in another society, there's no indication that delivery might take longer or work differently. The cart treats all orders identically.

**Solution:** In CartPage, for each seller group, check if `seller.society_id !== profile.society_id`. If cross-society:
- Show a subtle banner: "This seller is from [Society Name] (X km away)"
- Show estimated prep time if available

**Files:**
- Modified: `src/pages/CartPage.tsx` (add cross-society indicators per seller group)
- Modified: `src/hooks/useCart.tsx` (include society info in cart item joins)

### Task 4.2: Empty Cart Improvement
**Problem:** Empty cart page says "Add items from your favorite sellers" with a "Browse Sellers" button. This is generic and unhelpful.

**Solution:** Show personalized content:
- "Your recent orders" (last 3 completed orders with quick reorder buttons)
- "Popular in your community" (top 5 products by order count)
- Better CTA: "Explore Marketplace" linking to search page

**Files:**
- Modified: `src/pages/CartPage.tsx` (enhance empty state)

---

## Phase 5: Micro-Improvements (Polish)

### Task 5.1: "New Seller" Badge
When seller has fewer than 5 completed orders, show a "New" badge in green on their profile and search cards. Remove it automatically once they cross 5.

### Task 5.2: Category Icon on Product Cards
Show the category emoji next to the category label on all ProductCards and in the cart, so items are visually scannable.

### Task 5.3: Seller Response Time Display
Compute average time between order `placed` and `accepted` statuses from real order data. Show "Usually responds in ~X min" on seller detail page.

### Task 5.4: "Your Neighbor" Tag
On seller detail page and search results, if the seller is in the same block as the buyer, show "Your Neighbor - Block X" instead of just the address.

### Task 5.5: Price Range on Seller Cards
On HomePage seller cards, show the price range of their products (e.g., "₹80 - ₹250") so buyers know upfront if it's in their budget.

---

## Technical Summary

| Phase | Tasks | New Files | Modified Files | DB Changes |
|-------|-------|-----------|----------------|------------|
| 1 | 2 | 1 | 1 | None |
| 2 | 1 | 0 | 3 | 1 migration (reset ratings) |
| 3 | 2 | 2 | 3 | 1 migration (prep_time column) |
| 4 | 2 | 0 | 2 | None |
| 5 | 5 | 0 | 4 | None |

### Implementation Order
Phase 1 first (unblocks the core shopping flow), then Phase 2 (trust), then 3-5 in parallel.

