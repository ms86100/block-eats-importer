

# Fix: Categories Show Products But Clicking Shows "No Items Found"

## Problem

The buyer (Sagar, in Akshara Green City) sees category tiles on the home page, but clicking any category shows "No items found." This happens because the only seller (Sagar's Kitchen) is in a **different society** (Prestige Tranquility). The nearby seller discovery works correctly using distance-based logic, but all category and product listing queries strictly filter to `seller.society_id = buyer's society`, which excludes cross-society sellers entirely.

The buyer has `browse_beyond_community = true` and `search_radius_km = 10`, confirming they **should** see cross-society products. The seller has `sell_beyond_community = true` and is within delivery range (1.7 km away). The system already validates all of this in the `search_nearby_sellers` RPC -- but the category pages bypass that RPC entirely.

## Root Cause

Five separate queries all apply the same broken filter pattern:

| Location | Filter Applied |
|----------|----------------|
| `useCategoryProducts` (CategoryGroupPage) | `query.eq('seller.society_id', societyId)` |
| `useProductsByCategory` (Home page) | `query.eq('seller.society_id', effectiveSocietyId)` |
| `usePopularProducts` (Home page) | `query.eq('seller.society_id', effectiveSocietyId)` |
| `CategoryGroupPage` top sellers query | `query.eq('society_id', effectiveSocietyId)` |
| `CategoryPage` fetchProducts | `query.eq('seller.society_id', effectiveSocietyId)` |

All of these exclude cross-society sellers, even when the buyer has opted in and the seller is within range.

## Solution

Use a **dual-fetch merge pattern**: keep the existing local-society query, then also call the already-working `search_nearby_sellers` RPC to get cross-society products. Merge and deduplicate results.

### Step 1: Create a shared helper hook (`useNearbyProducts`)

Create a reusable hook that calls `search_nearby_sellers` and returns a flat list of products enriched with seller data. This avoids duplicating the RPC call logic across 5 different hooks/pages.

- Checks the buyer's `browse_beyond_community` setting
- Only fires the RPC if `browse_beyond_community = true`
- Returns products in the same shape as the existing queries (`ProductWithSeller`)
- Cached with React Query for efficiency (all pages share the same cache)

### Step 2: Update `useCategoryProducts` hook

- After fetching local-society products, merge in cross-society products from the shared hook
- Filter by the requested `parentGroup`
- Deduplicate by product ID (local products take priority)

### Step 3: Update `useProductsByCategory` hook

- Same merge pattern: local products + cross-society products
- Group by category as before, but include cross-society products in each group

### Step 4: Update `usePopularProducts` hook

- Merge cross-society products into the popular products list
- Sort by bestseller flag and recency as before

### Step 5: Update `CategoryGroupPage`

- Update the top sellers query to include cross-society sellers from nearby societies
- Use the `search_nearby_sellers` RPC data to extract unique sellers

### Step 6: Update `CategoryPage`

- Update `fetchProducts` to merge cross-society products
- Filter by the specific sub-category as before

## Files to Create

| File | Purpose |
|------|---------|
| `src/hooks/queries/useNearbyProducts.ts` | Shared hook that calls `search_nearby_sellers` RPC and returns flat product list |

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/queries/usePopularProducts.ts` | Merge cross-society products in both `usePopularProducts` and `useCategoryProducts` |
| `src/hooks/queries/useProductsByCategory.ts` | Merge cross-society products into category groups |
| `src/pages/CategoryGroupPage.tsx` | Include cross-society sellers in top sellers; use merged product data |
| `src/pages/CategoryPage.tsx` | Include cross-society products in category product list |

## Why This Approach

- Reuses the battle-tested `search_nearby_sellers` RPC which already handles all business rules (distance, radius, `sell_beyond_community`, product approval, seller verification)
- No database changes needed -- the RPC already returns everything we need
- Single cached RPC call shared across all pages via React Query
- If `browse_beyond_community` is false, behavior stays exactly the same (local only)
- Products are deduplicated by ID so nothing appears twice

