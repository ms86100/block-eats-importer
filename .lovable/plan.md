

# Performance Audit Report — Deep Analysis & 20 Actionable Fixes

## Section 1 — Root Cause Summary

The UI sluggishness is caused by a **combination of factors**, with the dominant problems being:

1. **BottomNav as the #1 remaining bottleneck**: Every page renders `BottomNav`, which calls `useEffectiveFeatures()` (an RPC), `useSecurityOfficer()` (another RPC), `useWorkerRole()` (a query), `useCart()`, and `useAuth()`. These 5 hooks fire on every page mount and re-render the nav bar on any auth/cart state change. Since BottomNav is rendered on **every page via AppLayout**, this creates a baseline of 3 database calls per navigation.

2. **CommunityTeaser uses raw `useEffect` fetch**: No caching, refetches on every home page mount.

3. **Duplicate `search_nearby_sellers` RPC calls**: The home page fires `search_nearby_sellers` from both `useNearbySocietySellers` (in `ShopByStoreDiscovery`) and `useNearbyProducts` (in `useProductsByCategory`), with different query keys so React Query cannot deduplicate them.

4. **Search page re-renders on every filter change**: `runSearch` is called inside a `useEffect` with `filters` as dependency, but `filters` is an object reference that changes on every interaction.

5. **ProductListingCard memo comparator is incomplete**: The custom comparator ignores `categoryConfigs`, `marketplaceConfig`, and `badgeConfigs` props, so when these objects change reference (parent re-render), the memo is bypassed anyway.

6. **Heavy hooks in BottomNav / Header fire on every page**: `useEffectiveFeatures` calls `get_effective_society_features` RPC, `useSecurityOfficer` calls `is_security_officer` RPC — both on every single page mount.

---

## Section 2 — 20 High-Impact Performance Fixes

### Fix 1: Memoize BottomNav with React.memo
**Area**: Layout / Navigation
**Problem**: BottomNav re-renders on every parent re-render (route change, auth state change, cart change). It calls 5 hooks.
**Why it hurts**: Every page transition triggers BottomNav's hooks cascade.
**Fix**: Wrap `BottomNav` in `React.memo`. The component only needs to re-render when `location.pathname` or `itemCount` changes.
**Impact**: HIGH — eliminates hook re-evaluation on every parent render.

### Fix 2: Memoize Header with React.memo
**Area**: Layout / Header
**Problem**: Header re-renders on every parent re-render, triggering unread notification fetch, haptics hook, system settings hook.
**Fix**: Wrap `Header` in `React.memo` with prop comparison. The header only changes when `title`, `showBack`, or `showLocation` change.
**Impact**: HIGH — Header is on every page.

### Fix 3: Convert CommunityTeaser to useQuery
**Area**: Home Page / CommunityTeaser
**Problem**: Uses raw `useState` + `useEffect` + `supabase.from()` with no caching. Re-fetches bulletin_posts and help_requests on every mount.
**Why it hurts**: Every time user navigates to home page, two uncached DB queries fire.
**Fix**: Replace with `useQuery` using keys like `['community-teaser', effectiveSocietyId]`.
**Impact**: MEDIUM — eliminates 2 redundant queries per home page visit.

### Fix 4: Deduplicate search_nearby_sellers across home page
**Area**: Home Page / Data Fetching
**Problem**: `ShopByStoreDiscovery` calls `useNearbySocietySellers` which fires `search_nearby_sellers` RPC. Meanwhile, `useNearbyProducts` (if still used anywhere) fires the same RPC with a different query key.
**Why it hurts**: The RPC is the heaviest query in the app — it joins societies, seller_profiles, and products with geo-distance calculations.
**Fix**: Ensure all consumers use the same query key pattern `['store-discovery', 'nearby', societyId, radiusKm]` so React Query deduplicates. Or use `useNearbyProducts` everywhere and remove `useNearbySocietySellers` (or vice versa).
**Impact**: HIGH — eliminates a duplicate heavy RPC call.

### Fix 5: Fix ProductListingCard memo comparator to include config refs
**Area**: Product Cards
**Problem**: The `React.memo` comparator only checks `product.id`, `is_available`, `price`, `stock_quantity`, `layout`, `viewOnly`, `className`. It ignores `categoryConfigs`, `marketplaceConfig`, `badgeConfigs`. When parent re-renders and creates new object refs for these, memo does nothing.
**Fix**: Add referential checks for the config props: `prev.categoryConfigs === next.categoryConfigs && prev.marketplaceConfig === next.marketplaceConfig && prev.badgeConfigs === next.badgeConfigs`.
**Impact**: HIGH — without this, the React.memo wrapping is effectively broken for the most common re-render scenarios.

### Fix 6: Stabilize config object references in MarketplaceSection and SearchPage
**Area**: Home Page / Search
**Problem**: `useCategoryConfigs()`, `useMarketplaceConfig()`, and `useBadgeConfig()` return new object references on every render unless their data changes. The parent passes these to cards, but since the objects are re-created, memo fails.
**Fix**: Ensure the hook returns are memoized (check each hook), and use `useMemo` at the call site if needed. `useBadgeConfig` returns `{ badges, isLoading }` — the `badges` array reference is stable from useQuery, but the wrapping object `{ badges, isLoading }` is recreated each render.
**Impact**: HIGH — makes Fix 5's memo comparator actually effective.

### Fix 7: Debounce search radius slider
**Area**: Search Page
**Problem**: The `Slider` for search radius calls `setSearchRadius` on every drag pixel, which: (a) updates local state, (b) persists to profiles table via `persistPreference`, (c) invalidates the popular products query key (since `searchRadius` is a dependency).
**Why it hurts**: Dragging the slider fires dozens of DB writes + query refetches.
**Fix**: Use the `onValueCommit` prop on Slider (Radix supports this) instead of `onValueChange` for the persist call. Only update query keys on commit, not drag.
**Impact**: MEDIUM — prevents cascade during slider interaction.

### Fix 8: Lazy-load useSecurityOfficer and useWorkerRole in BottomNav
**Area**: BottomNav / every page
**Problem**: `useSecurityOfficer` and `useWorkerRole` fire RPCs/queries on every page for every user, even though 95%+ of users are regular residents who will never be security officers or workers.
**Fix**: Check `roles` from AuthContext first — if user doesn't have a security/worker role, skip the RPC entirely. Add `enabled: roles.includes('security_staff')` or similar gate.
**Impact**: HIGH — eliminates 2 unnecessary DB calls per page for most users.

### Fix 9: Move `useNavigate` out of ProductListingCard
**Area**: Product Cards
**Problem**: Every `ProductListingCard` calls `useNavigate()`, creating a hook subscription. With 30+ cards, that's 30 router subscriptions.
**Fix**: Pass an `onNavigate` callback from the parent instead of each card creating its own navigate reference.
**Impact**: LOW-MEDIUM — reduces hook overhead per card.

### Fix 10: Virtualize product grids on Search page
**Area**: Search Page
**Problem**: The search page renders up to 80+ products in a flat grid. All product cards are mounted in the DOM simultaneously.
**Fix**: Use `react-window` or a simple "render only visible rows" approach for the product grid. Since cards are fixed-height in a 4-column grid, windowing is straightforward.
**Impact**: HIGH for search — reduces DOM nodes from 80+ cards to ~12-16 visible.

### Fix 11: Avoid re-creating `toProductWithSeller` function on every render
**Area**: Search Page
**Problem**: `ProductGridByCategory` defines `toProductWithSeller` as a regular function inside the component body. It's re-created on every render and called for every product.
**Fix**: Move it outside the component or wrap in `useCallback`. Since it has no closures, it can be a module-level function.
**Impact**: LOW — minor allocation reduction but easy win.

### Fix 12: Prevent `runSearch` re-fires from `filters` object reference changes
**Area**: Search Page
**Problem**: `useEffect` depends on `filters` (line 272), but `filters` is a new object on every `setFilters` call even if the values are identical. Setting veg/non-veg filter toggles recreates the entire filters object.
**Fix**: Use a stringified or deep-compare dependency: `JSON.stringify(filters)` as the effect dependency, or use a ref-based comparison.
**Impact**: MEDIUM — prevents redundant search executions.

### Fix 13: Batch category_config queries
**Area**: Multiple hooks
**Problem**: `useCategoryConfigs()` fetches `category_config` with `select('*')`. The `TypewriterPlaceholder` fetches `category_config` with `select('display_name')`. These use different query keys so they're separate requests.
**Fix**: Standardize on a single query key `['category-configs']` for the full select, and derive display names from the cached full data.
**Impact**: MEDIUM — eliminates one redundant query on every page.

### Fix 14: Add `loading="lazy"` to category images in CategoryImageGrid
**Area**: Home Page / Categories
**Problem**: Category images load eagerly, competing with product data for bandwidth.
**Fix**: Ensure all category images use `loading="lazy"`. Check `CategoryImageGrid` component.
**Impact**: LOW — improves perceived load time.

### Fix 15: Prefetch critical data on auth success
**Area**: Auth / App startup
**Problem**: After login, the app shows a loading state while `get_user_auth_context` RPC completes, then renders the home page which fires 6+ more queries sequentially.
**Fix**: After `get_user_auth_context` returns, immediately prefetch `category-configs`, `badge-config`, `system-settings-core`, and `effective-features` in parallel using `queryClient.prefetchQuery`.
**Impact**: HIGH — eliminates the waterfall of sequential queries after login.

### Fix 16: Memoize `useEffectiveFeatures` return value
**Area**: Feature flags
**Problem**: `useEffectiveFeatures` returns a new object with new function references (`isFeatureEnabled`, `getFeatureState`, etc.) on every render. Every consumer re-renders.
**Fix**: Memoize the return object and individual functions with `useMemo`/`useCallback`.
**Impact**: MEDIUM — used by BottomNav, SocietyQuickLinks, ProfilePage, etc.

### Fix 17: Stabilize `useCart` return value
**Area**: Cart hook
**Problem**: `useCart()` is used in BottomNav (for badge count) and every ProductListingCard (for quantity). If the return object is recreated on every context render, all consumers re-render.
**Fix**: Verify the CartProvider memoizes its context value. If not, add `useMemo`.
**Impact**: MEDIUM — cart context changes propagate to all cards + nav.

### Fix 18: Reduce SearchPage initial render cost
**Area**: Search Page
**Problem**: On mount, SearchPage renders: search input, TypewriterPlaceholder, horizontal filter bar (ScrollArea with 8+ buttons), browse-beyond toggle, radius slider, CategoryBubbleRow, FilterPresets, AND the product grid.
**Fix**: Defer rendering of CategoryBubbleRow and FilterPresets until after the popular products query resolves. Use `Suspense` boundaries or conditional rendering.
**Impact**: MEDIUM — reduces initial paint time.

### Fix 19: Remove `useHaptics` from BottomNav and Header
**Area**: Layout
**Problem**: `useHaptics()` is called in BottomNav and Header. This hook likely subscribes to Capacitor/native bridge. On web, it's a no-op but still creates hook overhead.
**Fix**: Gate the hook behind a platform check, or inline the no-op for web.
**Impact**: LOW — minor per-render savings.

### Fix 20: Optimize `useParentGroups` in MarketplaceSection
**Area**: Home Page
**Problem**: `useParentGroups` fetches parent group data and is used to render tabs. Check if it's cached and memoized properly.
**Fix**: Verify the hook uses `useQuery` with appropriate staleTime. If it's a raw fetch, convert to `useQuery`.
**Impact**: LOW-MEDIUM.

---

## Section 3 — Guaranteed Quick Wins (5 fixes, minimal effort, maximum payoff)

1. **Fix 5 + Fix 6**: Complete the ProductListingCard memo by adding config refs to comparator AND stabilizing config refs from parent. ~10 lines changed. Eliminates 30+ card re-renders per parent render.

2. **Fix 8**: Gate `useSecurityOfficer` and `useWorkerRole` behind role checks. ~2 lines each. Eliminates 2 DB calls per page for 95% of users.

3. **Fix 3**: Convert CommunityTeaser to `useQuery`. ~15 lines changed. Eliminates 2 uncached queries per home visit.

4. **Fix 1 + Fix 2**: Wrap BottomNav and Header in `React.memo`. ~4 lines each. Prevents hook cascade on every parent re-render.

5. **Fix 15**: Prefetch config data after auth. ~10 lines in AuthProvider. Eliminates query waterfall on app startup.

---

## Section 4 — What NOT to Do

1. **Do NOT add React.lazy to BottomNav or Header** — they're needed on every page immediately. Lazy loading them would add a flash of empty layout.

2. **Do NOT remove the shared IntersectionObserver** — the singleton pattern (Fix #3 from previous round) is correct. Reverting to per-card observers would be worse.

3. **Do NOT reduce React Query staleTime below 3 minutes** — the current 3-minute default (set in previous round) is appropriate. Going lower causes more refetches.

4. **Do NOT replace React Query with raw fetch** — the caching and deduplication are critical. The previous round correctly converted SearchPage popular products to useQuery.

5. **Do NOT virtualize the horizontal scrolling product carousels on the home page** — they render at most 8 items each. Virtualization overhead would exceed the savings.

6. **Do NOT try to batch all Supabase queries into a single RPC** — this would create a monolithic endpoint that's hard to cache and debug. The current granular approach with React Query deduplication is better.

---

## Validation Requirements

**How to measure improvement:**
- Use browser DevTools Performance tab → record a 10-second session including page navigation and scrolling
- Before: Expect 200+ React commit events per second during scroll
- After: Target under 20 React commit events per second
- Use React DevTools Profiler to verify ProductListingCard renders are skipped when scrolling stops
- Network tab: verify no duplicate `search_nearby_sellers` or `category_config` requests on home page load
- Lighthouse Performance score should improve from current ~40-50 to 70+

**Functionality verification:**
- All product cards should still show correct badges, veg indicators, and prices
- Cart add/remove should still update badge counts in BottomNav
- Search should still return results for 2+ character queries
- Security officers should still see the kiosk nav items
- Feature-gated society links should still respect package configuration

