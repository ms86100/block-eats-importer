
# Deep Module Reality Audit: Marketplace / Search

## SECTION A -- Summary Status

| Area | Status |
|---|---|
| SearchPage.tsx | Partially implemented -- core search and grid work, but several gaps in data flow, filter enforcement, and action_type handling |
| CategoryPage.tsx | Partially implemented -- does not filter by approval_status, lacks action_type awareness in product fetching |
| CategoryGroupPage.tsx | Partially implemented -- same approval_status and action_type gaps |
| HomePage.tsx (Marketplace section) | Functional but shallow -- product grid works, but behavior prop may not carry action_type |
| ProductGridCard.tsx | Fully implemented for action_type rendering |
| ProductDetailSheet.tsx | UI-only for non-cart action types -- always shows "Add to Cart" regardless of action_type |
| FloatingCartBar.tsx | Fully implemented |
| SearchFilters.tsx | Functional but has hardcoded values |
| FilterPresets.tsx | Fully hardcoded -- not DB-driven |
| useCart.tsx | Client-side guard exists for action_type, backend trigger also enforces |
| search_marketplace RPC | Missing action_type and contact_phone in returned product JSON |
| search_nearby_sellers RPC | Missing action_type, contact_phone, and approval_status filter in returned product JSON |

---

## SECTION B -- Hardcoded Logic List

### B1. FilterPresets.tsx -- Entirely hardcoded
- Four static presets (Veg Only, Under 150, Top Rated, Featured) with hardcoded thresholds.
- Price cap of 150 is arbitrary, not derived from actual product price distribution.
- **Risk**: If product pricing changes or new preset categories are needed, code must be redeployed.
- **Fix**: Create a `filter_presets` table or derive presets from `category_config`.

### B2. SearchFilters.tsx -- Hardcoded block list
- Line 41: `blocks = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']` -- static array, not from DB.
- **Risk**: Societies with different block naming (numbers, wings, towers) get wrong options.
- **Fix**: Fetch blocks from `profiles` table grouped by society.

### B3. SearchFilters.tsx -- Hardcoded price range max
- Price slider max is hardcoded at 1000 (line 30, 54, 201, 346-348).
- **Risk**: Products over 1000 are silently excluded from filter results.
- **Fix**: Derive max from `MAX(price)` query or make configurable per society.

### B4. Sort options duplicated across 3 pages
- CategoryPage, CategoryGroupPage, and SearchPage each define their own sort options array inline.
- **Risk**: Inconsistency if one is updated but others are not.
- **Fix**: Extract to shared constant or component.

### B5. Category icon/emoji fallbacks
- ProductGridByCategory line 656: `catInfo?.icon || '📦'` -- hardcoded fallback emoji.
- ProductGridCard line 97: `'🍽️'` and `'🛠️'` hardcoded fallback emojis.
- **Risk**: Cosmetic inconsistency across views.

### B6. "Popular" sort uses `is_bestseller` boolean only
- CategoryPage line 129 and CategoryGroupPage line 90: sort by `is_bestseller` flag (binary 0/1).
- **Risk**: No meaningful ranking among non-bestseller items. All tie at 0.
- **Fix**: Use order count or a computed popularity score.

---

## SECTION C -- Dead UI / Placeholder List

### C1. ProductDetailSheet -- action_type completely ignored
- **Critical**: The detail sheet always shows "Add to Cart" button (line 204) regardless of the product's `action_type`.
- If a product is `contact_seller` or `book`, tapping from the grid opens the detail sheet which then shows an "Add to Cart" CTA that will fail at the backend trigger level.
- The `handleAdd` function (line 53-69) constructs a product without `action_type`, bypassing the client-side cart guard in `useCart`.
- **Status**: UI-only logic -- the CTA exists but will fail for non-cart products.

### C2. ProductDetailSheet -- "View Full Menu" link always shown
- Line 232-238: Always says "View Full Menu" even for service categories (tutors, plumbers).
- **Status**: Misleading label, should be dynamic based on category.

### C3. SearchPage -- `?filter=open` URL param (HomePage line 348)
- HomePage links to `/search?filter=open` but SearchPage never reads or processes a `filter` query param.
- **Status**: Dead link -- navigates to search page but doesn't apply "Open Now" filter.

### C4. SearchFilters -- Block filter has no backend effect
- The block filter is collected in FilterState but never used in `runSearch()` in SearchPage.
- Line 339-362 in SearchPage: no filtering by `filters.block`.
- **Status**: UI-only -- user can select a block but results are unaffected.

### C5. CategoryPage -- Products not filtered by approval_status
- Line 76-77: Fetches products with `is_available = true` but never checks `approval_status = 'approved'`.
- **Risk**: Draft and pending products are visible to buyers.
- **Status**: Backend gap leaking to UI.

### C6. CategoryGroupPage -- Same approval_status gap
- `useCategoryProducts` hook (usePopularProducts.ts line 51-89) fetches products without `approval_status` filter.
- Only filters by `verification_status` on seller, not `approval_status` on product.

### C7. HomePage -- usePopularProducts also missing approval_status
- usePopularProducts.ts line 14-25: No `approval_status = 'approved'` filter.
- All pages showing product grids will display unapproved products.

### C8. CategoryPage -- Products filtered client-side by society_id
- Line 81: `prodResults = prodResults.filter((p: any) => p.society_id === effectiveSocietyId)`.
- But products table may not have a `society_id` column -- this field lives on `seller_profiles`. This filter likely returns zero results or all results depending on data.
- **Status**: Broken logic -- filtering on a field that likely doesn't exist on the product row.

---

## SECTION D -- Backend Enforcement Gaps

### D1. search_marketplace RPC does not return action_type or contact_phone
- The `matching_products` JSONB in the RPC only includes: `id, name, price, image_url, category, is_veg`.
- When SearchPage maps RPC results (lines 237-256), `action_type` and `contact_phone` are undefined.
- All products found via search term default to `add_to_cart` behavior on the card, regardless of seller configuration.
- **Severity**: HIGH -- seller-defined action types are invisible in search results.

### D2. search_nearby_sellers RPC has the same gap
- Same missing fields: `action_type`, `contact_phone`, `approval_status`.
- Cross-society products also display with wrong action buttons.

### D3. Neither RPC filters by approval_status
- Both RPCs filter by `p.is_available = true` but not by `approval_status = 'approved'`.
- Draft/pending products appear in search results.
- **Severity**: HIGH -- unapproved products are discoverable.

### D4. search_marketplace RPC does not filter by approval_status on products
- Line 191: `AND p.is_available = true` but no `AND p.approval_status = 'approved'`.

### D5. Cart insertion trigger validates action_type but detail sheet bypasses client guard
- The DB trigger `validate_cart_item_category` correctly blocks non-cart products.
- But the error surfaces as an unhandled exception in the UI -- no user-friendly message for "this product can't be added to cart."

### D6. Price validation is frontend-only for the search page price range filter
- Products with price > 1000 are silently excluded. This is a UI constraint, not data-driven.

---

## SECTION E -- Interdependency Risk

### E1. ProductGridCard vs ProductDetailSheet -- action_type divergence
- `ProductGridCard` correctly reads `product.action_type` and shows dynamic buttons.
- `ProductDetailSheet` ignores `action_type` entirely and always shows cart CTA.
- **Risk**: HIGH -- user taps "Contact" on grid card, sheet opens with "Add to Cart".
- **Fix**: ProductDetailSheet must receive and respect action_type.

### E2. useCart client guard vs DB trigger -- double enforcement but inconsistent messaging
- `useCart.addItem()` has a client-side check (lines 92-102) that shows a toast error.
- DB trigger also blocks the insert with a SQL exception.
- If client guard is bypassed (e.g., via ProductDetailSheet), the DB error is caught but shown as generic "Failed to add item".
- **Risk**: MEDIUM -- confusing error messages.

### E3. useCategoryConfigs hook called independently in 5+ components
- Each call to `useCategoryConfigs()` triggers a separate Supabase query.
- Components: SearchPage, CategoryPage, CategoryGroupPage, HomePage, SearchFilters, SellerProductsPage.
- **Risk**: MEDIUM -- redundant API calls on every page load. No shared cache at React Query level because hook uses `useState`+`useEffect` instead of `useQuery`.
- **Fix**: Migrate `useCategoryConfigs` to use `useQuery` with a shared query key.

### E4. Three different product-to-card mapping functions
- `SearchPage.toProductWithSeller()` (line 612-633)
- `CategoryPage` passes `product as any` (line 211)
- `usePopularProducts` maps its own shape (line 37-44)
- **Risk**: LOW-MEDIUM -- inconsistent field availability. Some include `action_type`, some don't.

---

## SECTION F -- Final Hardening Plan

### Priority 1: Critical Fixes (Must fix before production)

1. **Update `search_marketplace` RPC** to include `action_type`, `contact_phone`, and `approval_status = 'approved'` filter in the product subquery.

2. **Update `search_nearby_sellers` RPC** with the same additions.

3. **Add `approval_status = 'approved'` filter** to:
   - `usePopularProducts` hook
   - `useCategoryProducts` hook
   - `CategoryPage.fetchProducts()`
   - `SearchPage.loadPopularProducts()`

4. **Fix ProductDetailSheet** to respect `action_type`:
   - Pass `action_type` and `contact_phone` through the `ProductDetail` interface.
   - Show dynamic CTA (Contact, Book, Quote, etc.) instead of always "Add to Cart".
   - Show ContactSellerModal when action_type is `contact_seller`.

5. **Fix CategoryPage client-side society filter** (line 81) -- filter by joining seller's society_id, not a non-existent `product.society_id`.

### Priority 2: Important Fixes (Should fix)

6. **Remove or wire the block filter** -- either implement block-based filtering in search or remove it from the UI to avoid dead controls.

7. **Handle `?filter=open` param** in SearchPage or remove the link from HomePage.

8. **Migrate `useCategoryConfigs`** to use `useQuery` to benefit from React Query caching and deduplication across components.

9. **Derive blocks from DB** instead of hardcoded A-J array in SearchFilters.

10. **Increase price range max** to be dynamic or at least 5000+ to avoid silently excluding products.

### Priority 3: Polish (Nice to have)

11. **Extract sort options** into a shared constant used by CategoryPage, CategoryGroupPage, and SearchPage.

12. **Make FilterPresets DB-driven** or at least derive thresholds from data.

13. **Fix "View Full Menu" label** in ProductDetailSheet to be dynamic (e.g., "View All Services" for service categories).

14. **Add error boundary** around ProductDetailSheet cart operations to show user-friendly messages when DB trigger rejects cart insertion.

### Performance Notes

- `useCategoryConfigs` using `useState`+`useEffect` instead of `useQuery` causes ~5 redundant fetches per page navigation. **Risk: MEDIUM**.
- `search_marketplace` RPC uses `ILIKE '%term%'` without text search indexes. At scale this will be slow. **Risk: LOW now, HIGH at scale**.
- SearchPage `loadPopularProducts` and `runSearch` are separate async calls without cancellation -- rapid typing can cause stale results to overwrite fresh ones despite debounce. **Risk: LOW-MEDIUM**.
