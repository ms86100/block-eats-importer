

## Fix Plan: 4 Critical Discovery and Visibility Issues

### Issue 1: Sellers Visible Without Approved Products

**Root Cause (with evidence):**
Three components query `seller_profiles` directly without checking if the seller has any approved products:

- `ShopByStore.tsx` (line 16-24): Queries `seller_profiles` filtered only by `verification_status = 'approved'` and `is_available = true`. No product existence check.
- `useStoreDiscovery.ts` / `useLocalSellers` (line 55-63): Same pattern -- fetches approved sellers without verifying products exist.
- `useHomeSellers.ts` (all hooks): Same pattern across `useOpenNowSellers`, `useTopRatedSellers`, `useFeaturedSellers`.

**Fix:**
Add an `!inner` join on products or a subquery filter to ensure only sellers with at least one approved product are returned. For the direct queries, change from:
```sql
seller_profiles WHERE verification_status = 'approved'
```
to joining with products:
```sql
seller_profiles!inner JOIN products ON products.seller_id = seller_profiles.id
  WHERE products.approval_status = 'approved' AND products.is_available = true
```

Since Supabase JS doesn't support EXISTS subqueries easily, the cleanest approach is to add an `approved_product_count` column (or use a lightweight RPC). However, the simplest immediate fix is to **post-filter on the client** using a single extra query, or use the `!inner` join pattern already used in SearchPage.

**Concrete change:** In `ShopByStore.tsx`, `useLocalSellers`, and all `useHomeSellers` hooks, add a products subquery with `!inner` to filter out sellers with zero approved products.

---

### Issue 2: Search Radius Not Persisting

**Root Cause (with evidence):**
In `SearchPage.tsx` (lines 108-109):
```typescript
const [searchRadius, setSearchRadiusLocal] = useState(
  (profile as any)?.search_radius_km ?? 5,
);
```

The `profile` object comes from `AuthContext`, which is loaded via `get_user_auth_context` RPC. Looking at `useAuthState.ts`, the fetched profile is stored as `ctx.profile`. However, `browse_beyond_community` and `search_radius_km` are **not included** in the auth context RPC return -- confirmed by searching contexts for these fields (zero matches).

So `(profile as any)?.search_radius_km` is always `undefined`, and the fallback `?? 5` kicks in. The `persistPreference` function (line 112-116) **does write** the value to the DB correctly (confirmed: profile `749b0d70` has `search_radius_km: 10`), but the next page load reads from the profile object which never includes these fields.

**Fix:**
Ensure the `get_user_auth_context` RPC returns `browse_beyond_community` and `search_radius_km` in the profile object. Alternatively, fetch these two fields directly from `profiles` table on SearchPage mount as a one-time read.

The simpler approach: add a small `useQuery` on SearchPage that reads the user's `browse_beyond_community` and `search_radius_km` from `profiles` and initializes state from that.

---

### Issue 3: Categories Page Missing Nearby Society Categories

**Root Cause (with evidence):**
`CategoriesPage.tsx` (line 12) uses `useProductsByCategory()` to determine which categories have products. Looking at `useProductsByCategory.ts` (lines 48-49):
```typescript
if (effectiveSocietyId) {
  query = query.eq('seller.society_id', effectiveSocietyId);
}
```
This filters products to **only the user's own society**. It never calls `search_nearby_sellers` RPC. So categories that only exist in nearby societies are invisible on the Categories page, even though they appear via the home page discovery section.

**Fix:**
When `browse_beyond_community` is enabled, the Categories page should also include categories from nearby societies. This can be done by:
1. Making a parallel call to `search_nearby_sellers` RPC (which already returns `matching_products` with category info).
2. Merging the category set from nearby products into the `activeCategorySet`.

---

### Issue 4: Multiple Stores by Same User Not All Visible

**Root Cause (with evidence):**
The `search_nearby_sellers` RPC (see DB functions) queries `seller_profiles` individually -- each row is a separate store. This should return all stores. However, the **client-side hooks** may deduplicate by `user_id` or the query may filter incorrectly.

Looking at `ShopByStore.tsx` and `useLocalSellers`: they query `seller_profiles` with standard filters. If a user has two stores (e.g., "Woof" with `primary_group: pets` and "Biryani Hub" with `primary_group: food`), both should appear. The DB data confirms both exist under the same `society_id`.

The likely issue is the **`sell_beyond_community` flag**. Checking the data:
- "Woof" has `sell_beyond_community: false`
- "Biryani Hub" has `sell_beyond_community: true`

So for a buyer in a **different society**, only "Biryani Hub" would appear via `search_nearby_sellers` (which filters `sp.sell_beyond_community = true`). "Woof" would be invisible to cross-society buyers. This is correct behavior for cross-society, but for **local society buyers**, both should appear -- and the `useLocalSellers` query does not filter by `sell_beyond_community`, so both should show locally.

If the newly created store isn't appearing, it may be due to:
- The store's `is_available` being `false` by default
- The store lacking approved products (ties back to Issue 1)

**Fix:** The same fix as Issue 1 (filtering sellers by approved product count) will also make the visibility logic consistent -- a new store will appear as soon as it has approved products, not before.

---

### Implementation Summary

| File | Change |
|------|--------|
| `ShopByStore.tsx` | Add products `!inner` join to filter sellers with 0 approved products |
| `useStoreDiscovery.ts` | Same `!inner` join for local sellers query |
| `useHomeSellers.ts` | Same `!inner` join for all 4 hooks |
| `SearchPage.tsx` | Add `useQuery` to load `browse_beyond_community` and `search_radius_km` from profiles on mount; initialize state from cached data |
| `CategoriesPage.tsx` | When browse-beyond is enabled, merge nearby-society categories into the active set |
| `useProductsByCategory.ts` | Optionally extend to include nearby products for category visibility |

### Technical Approach for Seller Visibility Fix

The Supabase JS `!inner` join approach will be used. Instead of:
```typescript
.from('seller_profiles')
.select('id, business_name, ...')
.eq('verification_status', 'approved')
```

Change to:
```typescript
.from('seller_profiles')
.select('id, business_name, ..., products!inner(id)')
.eq('verification_status', 'approved')
.eq('products.is_available', true)
.eq('products.approval_status', 'approved')
```

This ensures the DB only returns sellers who have at least one approved, available product. The `!inner` keyword makes it an INNER JOIN, excluding sellers with zero matching products.

For the `search_nearby_sellers` RPC, add a `HAVING` clause or `WHERE EXISTS` to exclude sellers with no approved products from the results (this is partially done already since `matching_products` is computed, but sellers with NULL `matching_products` are still returned).

