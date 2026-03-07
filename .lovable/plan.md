

## Investigation: Cross-Society Seller Discovery Broken

### Root Cause

The `search_nearby_sellers` database function was **overwritten** by a later migration (`20260306154612`) with a simplified version that broke cross-society discovery. The correct version from migration `20260216141023` was replaced with one that has these critical defects:

| Check | Correct version (Feb 16) | Broken version (Mar 6) |
|-------|--------------------------|------------------------|
| `sell_beyond_community = true` | Yes | **Missing** |
| `delivery_radius_km` check | Yes | **Missing** |
| `is_available = true` | Yes | **Missing** |
| `matching_products` subquery | Full product aggregation | **Hardcoded to `'[]'`** |
| Product existence check | `EXISTS (approved products)` | **Missing** |

The hardcoded `'[]'::json` for `matching_products` is likely the main reason buyers see nothing — the `useNearbyProducts` hook iterates over `matching_products` to build the product list, and an empty array means zero products are shown, effectively hiding the seller.

### Fix

**Single database migration** to restore the `search_nearby_sellers` function to the correct version from the Feb 16 migration, which:

1. Checks `sp.sell_beyond_community = true` — only sellers who opted in
2. Checks distance against **both** the buyer's search radius AND the seller's `delivery_radius_km`
3. Checks `sp.is_available = true` is implied by the product availability filter
4. Populates `matching_products` with actual approved, available product data via a subquery
5. Requires at least one approved product via `EXISTS`
6. Keeps the return type compatible with the current TypeScript types (using `double precision` for distance)

No frontend changes are needed — the hooks (`useNearbyProducts`, `useNearbySocietySellers`) already expect this data shape.

