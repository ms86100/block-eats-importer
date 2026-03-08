

# Homepage Trust & Discovery Enhancement Plan

## What's Already Built (from Phase 1-5)
- SellerTrustBadge (tiers) on product cards ✅
- Social proof count on product cards ✅
- Seller inactive warning on cards ✅
- TrendingInSociety section ✅
- SocietyLeaderboard (top sellers, most ordered) ✅
- ReorderLastOrder component ✅
- Community teaser ✅
- FirstOrderBadge, RefundTierBadge, PriceStabilityBadge (exist but only on detail/seller pages) ✅

## What's Missing on the Homepage (Gap Analysis)

Looking at the screenshot and code, the homepage currently flows:
1. Header → Search bar → Category tabs → Category grids → Featured banners → Trending → Popular → New → Category listings → Shop by store → Leaderboard → Community

**Key gaps that would make the biggest visual/trust impact:**

---

### 1. Society Trust Header Bar (NEW)
A small trust strip below the header showing society-level credibility:
> "🏘 Shriram Greenfield · 142 families · 23 active sellers · 4.6★ avg"

Uses `calculate_society_trust_score` + society data already available. Gives instant context that this is a thriving community marketplace.

**File:** Create `src/components/home/SocietyTrustStrip.tsx`
**Integration:** Add to `HomePage.tsx` above `UpcomingAppointmentBanner`

---

### 2. "Buy Again" Quick Row (NEW)
A compact horizontal scroll showing products the user has ordered before, with one-tap add-to-cart. Different from `ReorderLastOrder` (which reorders entire last order) — this shows individual frequently-bought products.

**File:** Create `src/components/home/BuyAgainRow.tsx`
**Query:** Fetch from `order_items` joined with `orders` where `buyer_id = user.id` and `status = completed`, group by product, sort by frequency.
**Integration:** Add to `HomePage.tsx` after `ReorderLastOrder`

---

### 3. First Order Protection Badge on Product Cards (MISSING from cards)
The `FirstOrderBadge` component exists but is only shown on detail sheets. Surface it on product cards for first-time buyers who haven't ordered from that seller yet.

**File:** Modify `ProductListingCard.tsx`
**Logic:** Check if user has 0 completed orders with that seller (can derive from a lightweight query or pass as prop). Show small inline badge: "🛡 First Order Protected"

---

### 4. Community Search Suggestions on Homepage (MISSING)
The `CommunitySuggestions` component exists but only on SearchPage. Add a compact version on the homepage below the search bar showing "People in your society searched for..." pills.

**File:** Create `src/components/home/HomeSearchSuggestions.tsx` (thin wrapper)
**Integration:** Add to `HomePage.tsx` or inside `MarketplaceSection` above category tabs

---

### 5. Seller Activity Dots on Store Cards (MISSING)
`ShopByStoreDiscovery` shows seller cards but without activity status dots. Add green/yellow/gray dots based on `last_active_at`.

**File:** Modify `ShopByStoreDiscovery.tsx` — add activity indicator to `CategorySellerRow` and `SocietyCard` seller avatars.
**Data:** Need to include `last_active_at` in the seller query (check if already fetched).

---

### 6. Price Stability on Product Cards (MISSING from cards)
`PriceStabilityBadge` exists but only on ProductDetailSheet. Add a micro "Price stable 30d" text on popular/trending product cards.

**File:** Modify `ProductListingCard.tsx` — add optional `priceStability` prop
**Data:** Batch fetch from `price_history` for displayed products, pass via `socialProofMap`-like pattern

---

### 7. Homepage Section Reorder for Trust-First Flow
Current order buries trust signals. Recommended new order:

```text
Header
  └ Society Trust Strip (NEW)
  └ Search suggestions (NEW)
Upcoming Appointment
Reorder Last Order
Buy Again Row (NEW)
Society Quick Links
Category Tabs + Grids
Featured Banners
Trending in Society
Popular Near You
New This Week
Category Listings
Shop By Store (with activity dots)
Leaderboard
Community
```

**File:** Modify `HomePage.tsx` section order

---

## Implementation Summary

| # | Task | Files | Effort |
|---|---|---|---|
| 1 | Create SocietyTrustStrip | New component + HomePage.tsx | Low |
| 2 | Create BuyAgainRow | New component + query + HomePage.tsx | Medium |
| 3 | FirstOrderBadge on product cards | ProductListingCard.tsx | Low |
| 4 | Search suggestions on home | New wrapper + HomePage.tsx or MarketplaceSection | Low |
| 5 | Activity dots on store cards | ShopByStoreDiscovery.tsx | Low |
| 6 | Price stability micro-badge on cards | ProductListingCard.tsx + batch query | Medium |
| 7 | Reorder homepage sections | HomePage.tsx | Low |

No database migrations needed — all data sources already exist.

