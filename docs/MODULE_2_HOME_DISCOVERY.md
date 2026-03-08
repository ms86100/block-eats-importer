# Module 2 — Home & Discovery

> Complete product documentation for the Home dashboard, Search, Categories, Category Group, and Favorites pages.

---

## Table of Contents

1. [App Layout Shell](#1-app-layout-shell)
2. [HomePage (`/`)](#2-homepage)
3. [SearchPage (`/search`)](#3-searchpage)
4. [CategoriesPage (`/categories`)](#4-categoriespage)
5. [CategoryGroupPage (`/category/:category`)](#5-categorygrouppage)
6. [FavoritesPage (`/favorites`)](#6-favoritespage)

---

## 1. App Layout Shell

**File:** `src/components/layout/AppLayout.tsx`

Every page in this module is wrapped in `AppLayout`, which provides:

| Element | Description |
|---|---|
| **Header** | Top bar with location selector, cart icon, and optional back button. Configurable via `showHeader`, `showLocation`, `showBack`, `headerTitle` props. |
| **EnableNotificationsBanner** | Persistent prompt for users who haven't enabled push notifications. |
| **FloatingCartBar** | Floating bottom bar showing cart item count and total; navigates to `/cart`. Visible when `showCart=true`. |
| **NavigatorBackButton** | Admin-only floating back button for deep-link navigation. |
| **BottomNav** | Fixed bottom navigation bar with tabs: Home, Categories, Search, Orders, Profile. Visible when `showNav=true`. |

**Props:**
- `showHeader` (default `true`) — Toggles the header bar.
- `showNav` (default `true`) — Toggles the bottom navigation.
- `showCart` (default `true`) — Toggles cart icon in header and the floating cart bar.
- `showLocation` (default `true`) — Toggles the society/location selector in the header.
- `showBack` — Shows a back arrow instead of location.
- `headerTitle` — Override text in the header.
- `className` — Additional CSS for the `<main>` element.

---

## 2. HomePage

**Route:** `/`  
**File:** `src/pages/HomePage.tsx`

The main dashboard users land on after authentication. Content is conditionally rendered based on user state.

### 2.1 Conditional Screens

| Condition | Rendered Screen |
|---|---|
| `showOnboarding && isApproved` | **OnboardingWalkthrough** — Guided first-time tour (documented in Module 1). |
| `!isApproved && profile exists` | **VerificationPendingScreen** — Shows queue position and auto-polls for approval (Module 1). |
| `!profile` (loading) | **Skeleton loader** — Animated placeholder pills, banner, and grid. |
| Default (approved user) | Full homepage with all sections below. |

### 2.2 Incomplete Profile Banner

**Trigger:** `profile.flat_number` is empty/null.  
**UI:** Warning card with `AlertCircle` icon, message "Complete your profile to enable delivery orders."  
**Action:** "Update" link → navigates to `/profile`.  
**Animation:** `framer-motion` fade-in from top (`y: -8`).

### 2.3 HomeSearchSuggestions

**File:** `src/components/home/HomeSearchSuggestions.tsx`  
**Position:** First content section after the banner.

**What it does:** Displays horizontally scrollable pills showing popular search terms from the user's society.

**Data source:** `useCommunitySearchSuggestions()` hook — fetches aggregated search terms from community activity.

**UI Elements:**
- Section label: "Popular in your society" with `Sparkles` icon.
- Up to 8 pill buttons, each showing:
  - `TrendingUp` icon
  - Search term text
  - Order count badge (e.g., "12×")
- Each pill animates in with staggered `framer-motion` (`delay: i * 0.05`).

**Action:** Tapping a pill navigates to `/search?q={term}`.

**Visibility:** Hidden when no suggestions are available.

### 2.4 UpcomingAppointmentBanner

**File:** `src/components/home/UpcomingAppointmentBanner.tsx`  
**Position:** Below search suggestions, within `px-4 mt-3` wrapper.

**What it does:** Shows the user's next upcoming service booking/appointment.

**Data source:** Direct Supabase query on `service_bookings` table:
- Filters: `buyer_id = user.id`, `booking_date >= today`, status NOT in `cancelled/completed/no_show`.
- Orders by `booking_date ASC, start_time ASC`, limit 5.
- Skips bookings where `start_time` has already passed today.
- Fetches related product name and seller business name.

**UI Elements:**
- Card with `Calendar` icon (left), service name + time details (center), `ChevronRight` (right).
- Date label: "Today", "Tomorrow", or formatted date (e.g., "Mar 5").
- Time shown as `HH:MM`.
- Seller name appended after separator dot.
- **Urgent styling:** When appointment is ≤2 hours away, card gets `bg-primary/10 border-primary/30` highlight.

**Actions:**
- Tap → navigates to `/orders/{order_id}` (order detail page).
- Listens for `booking-changed` window event to auto-refresh.

**Visibility:** Hidden when no upcoming booking exists.

### 2.5 ReorderLastOrder

**File:** `src/components/home/ReorderLastOrder.tsx`  
**Position:** Below appointment banner.

**What it does:** Quick one-tap reorder of the user's most recent completed order.

**Data source:** Queries `orders` table:
- Filters: `buyer_id = user.id`, status in `completed` or `delivered`.
- Joins `seller_profiles` (for business_name) and `order_items` (for product_id + quantity).
- Limit 1, ordered by `created_at DESC`.

**UI Elements:**
- Card with `RefreshCw` icon (animated spin when loading), seller name, item count, total amount, and relative time ("Today", "Yesterday", "3d ago").
- Labels driven by `useMarketplaceLabels()` hook:
  - `label_reorder_prefix` — e.g., "Reorder from"
  - `label_reorder_unavailable` — error when all items unavailable
  - `label_reorder_success` — success toast

**Workflow:**
1. User taps the card.
2. System checks if cart already has items.
3. If cart is non-empty → **AlertDialog** confirmation: "Replace cart? Your current cart will be cleared..."
   - "Cancel" → dismisses dialog.
   - "Replace Cart" → proceeds to step 4.
4. Checks product availability via `products` table (`is_available = true`).
5. Deletes existing cart items, inserts new items from previous order.
6. If some items were unavailable → info toast with count.
7. Success toast → navigates to `/cart`.
8. Invalidates `cart-items` and `cart-count` query caches.

**Visibility:** Hidden when user has no completed orders.

### 2.6 BuyAgainRow

**File:** `src/components/home/BuyAgainRow.tsx`  
**Position:** Below reorder section.

**What it does:** Horizontal scrollable row of frequently purchased products with one-tap add-to-cart.

**Data source:**
1. **Primary:** `get_user_frequent_products` RPC with `_user_id` and `_limit: 12`.
2. **Fallback** (if RPC fails): Direct query on `order_items` → `products` → `seller_profiles`, filtered by completed orders, aggregated by frequency.

**UI Elements per product card (w-[105px]):**
- Product image (aspect-square) or 🛒 fallback.
- Quick-add button overlay (bottom-right):
  - `Plus` icon when not in cart.
  - `Check` icon (green) when already in cart.
- Order count badge (top-left): "3× ordered" — shown when `order_count > 1`.
- Product name (2-line clamp).
- Price (formatted via `useCurrency()`).

**Actions:**
- Tap card → calls `useCart().addItem()` with haptic feedback (`impact('medium')`).
- If already in cart → no action.
- If `seller_id` missing → error toast "Cannot add this item — missing seller info".
- Success toast: "{product.name} added to cart".

**Visibility:** Hidden when no frequently purchased products exist.

### 2.7 SocietyQuickLinks

**File:** `src/components/home/SocietyQuickLinks.tsx`  
**Position:** Below buy again row.

**What it does:** Horizontal row of quick-access cards for society management features.

**Feature gating:** Uses `useEffectiveFeatures().isFeatureEnabled()` to show only enabled features.

**Available links (feature-gated):**

| Icon | Label | Route | Feature Key |
|---|---|---|---|
| Users | Visitors | `/visitors` | `visitor_management` |
| Car | Parking | `/parking` | `vehicle_parking` |
| IndianRupee | Finances | `/society/finances` | `finances` |
| MessageCircle | Bulletin | `/community` | `bulletin` |
| Wrench | Maintenance | `/maintenance` | `maintenance` |
| ShieldAlert | Disputes | `/disputes` | `disputes` |

**UI:** Each link is a card with icon (in rounded container) + label. Max 6 shown.  
**Section header:** "Your Society" with `Building2` icon + "View all" link → `/society`.

**Visibility:** Hidden when no features are enabled or no society is associated.

### 2.8 MarketplaceSection

**File:** `src/components/home/MarketplaceSection.tsx`

The main product discovery area — the largest section on the homepage.

#### 2.8.1 ParentGroupTabs

**File:** `src/components/home/ParentGroupTabs.tsx`

Horizontal scrollable filter tabs for top-level product categories (parent groups).

**Data source:** `useParentGroups()` → `parent_groups` table.

**UI Elements:**
- "All" tab (shown when >1 group exists, value `__all__`) — resets filter.
- One tab per parent group with `DynamicIcon` + label.
- Active tab: `bg-primary text-primary-foreground shadow-cta`.
- Inactive: `bg-card text-foreground border border-border`.

**Behavior:**
- Tap triggers `hapticSelection()` + `onGroupChange(slug | null)`.
- Only groups with active products are shown (filtered by `activeParentGroups` Set).

#### 2.8.2 CategoryImageGrid

**File:** `src/components/home/CategoryImageGrid.tsx`  
**Rendered:** Up to 4 parent groups, each as a grid section.

**What it does:** Displays a 2-column (3 on sm+) grid of category cards with product image collages.

**Data source:** `useCategoryConfigs()` for config, `useProductsByCategory()` for product data.

**Category Card UI:**
- **Image area** (aspect 3:2):
  - **ImageCollage** — up to 4 product images in a CSS grid, or fallback to category icon/image.
  - Gradient overlay (`from-black/70`).
  - Item count badge (top-right): "12 items" in primary pill.
  - Bestseller star (top-left): Gold star if any product in category is bestseller.
  - Category name (bottom, white text with drop shadow).
- **Metadata row** (below image):
  - Seller count with `Users` icon.
  - Starting price with `Tag` icon ("From ₹99").
  - "Explore →" when no data available.

**Section header:** Group title + "See all" link → `/category/{parentGroup}`.

**Actions:** Each card links to `/category/{parentGroup}?sub={category}`.

#### 2.8.3 FeaturedBanners

**File:** `src/components/home/FeaturedBanners.tsx`

**What it does:** Auto-rotating promotional banner carousel.

**Data source:** `featured_items` table:
- Filters: `is_active = true`, ordered by `display_order`.
- Society-scoped: `society_id = user's society OR null` (global banners).
- **Realtime subscription** on `featured_items` — new banners appear immediately without refresh.

**Banner Templates:**
| Template | Description |
|---|---|
| `image_only` | Full-width image (h-36) or colored box with title. |
| `text_overlay` | Image background + gradient overlay + title/subtitle/CTA button. |
| `split_left` | Color background, left text + right image (40% width). |
| `gradient_cta` | Full gradient background, centered title/subtitle/CTA. |
| `minimal_text` | White card with left colored border, centered text. |

**Carousel behavior:**
- Horizontal scroll with `snap-x snap-mandatory`, cards at `85vw` width.
- **Auto-rotation:** Per-banner interval (`auto_rotate_seconds`, default 4s).
- **Touch interaction:** Pauses auto-scroll on touch; resumes after 8s of inactivity.
- **Scroll sync:** Scroll position syncs to dot indicators via `IntersectionObserver`-style logic.
- **Dot indicators:** Clickable dots below carousel; active dot is elongated (`w-5`), inactive is small circle (`w-1.5`).

**Actions:** Tapping a banner navigates to `banner.link_url` (if set).

#### 2.8.4 TrendingInSociety

**File:** `src/components/home/TrendingInSociety.tsx`

**What it does:** Horizontal scrollable row of products with high recent order velocity in the user's society.

**Data source:** `useTrendingProducts(10)` — fetches products sorted by recent order velocity.

**UI:** Standard `ProductListingCard` in 155px-wide containers with snap scrolling.

**Visibility:** Hidden when fewer than 3 trending products. Only shown when no parent group filter is active.

#### 2.8.5 Discovery Rows (Popular & New This Week)

**Defined inline in** `MarketplaceSection.tsx` as the `DiscoveryRow` component.

**Popular Near You:**
- Sorted by `completed_order_count DESC`.
- Limited to `discoveryMaxItems` (from `marketplace_labels` config, default 10).
- Icon: `Flame` (destructive color).
- Label: `label_discovery_popular` from marketplace labels.
- **Visibility:** Hidden when count ≤ `discoveryMinProducts` (default 3) or when a parent group filter is active.

**New This Week:**
- Filtered by `created_at` within `newThisWeekDays` (default 7 days).
- Excludes products already in "Popular" section (deduplication).
- Icon: `Sparkles` (primary color).
- Label: `label_discovery_new` from marketplace labels.
- **Visibility:** Hidden when empty or when a parent group filter is active.

#### 2.8.6 ProductListings (Category-Grouped Products)

**Defined inline in** `MarketplaceSection.tsx` as the `ProductListings` component.

**What it does:** Renders all products grouped by category in horizontal scroll rows.

**Per category section:**
- Header: Category icon (via `DynamicIcon`) + display name + "see all" link → `/category/{parentGroup}?sub={category}`.
- Horizontal scroll of `ProductListingCard` (max 8 per category, 155px wide).

**Loading state:** Skeleton placeholders (2 rows of 3 cards).

**Empty state:** Animated illustration with:
- `ShoppingBag` icon in primary circle + `Sparkles` badge.
- Title: "Your marketplace is getting ready!"
- Subtitle: "Sellers from your community are setting up shop..."
- Footer pill: `Clock` icon + "New listings appear here automatically".

#### 2.8.7 ShopByStoreDiscovery

**File:** `src/components/home/ShopByStoreDiscovery.tsx`

**What it does:** Seller-centric discovery section showing stores grouped by location.

**Two sections:**

**A) "In Your Society"**
- Data: `useLocalSellers()` → sellers in user's society, grouped by parent group.
- Activity indicators: Green dot (active <30min), yellow (<2h), grey (<24h) via `seller_profiles.last_active_at`.
- Each group renders a `CategorySellerRow` — badge label + horizontal scroll of seller cards (w-24).
- Seller card: Profile image (or Store icon), business name, star rating.
- Tap → navigates to `/seller/{id}`.

**B) "Nearby Societies"**
- Data: `useNearbySocietySellers(radiusKm, browseBeyond)`.
- Enabled when user's `browse_beyond_community` profile setting is true.
- Radius from `profile.search_radius_km` (default 10km).
- Organized by distance bands (collapsible via `Collapsible` component):
  - Each band shows its label (e.g., "0-2 km").
  - Contains `SocietyCard` components — society name + distance + horizontal seller scroll.

**Visibility:** Hidden when no local or nearby sellers exist.

#### 2.8.8 SocietyLeaderboard

**File:** `src/components/home/SocietyLeaderboard.tsx`  
**Position:** At the bottom of ProductListings.

**What it does:** Gamified leaderboard showing top sellers and most-ordered products.

**Data sources:**
1. `seller_profiles` table — top 5 by `completed_order_count`, society-scoped, approved only.
2. `get_society_top_products` RPC — top 5 products by order count.

**Top Sellers UI:**
- `Trophy` icon header.
- Horizontal scroll of cards (w-28) with:
  - Medal emoji (🥇🥈🥉4️⃣5️⃣).
  - Seller avatar or placeholder.
  - Business name (truncated).
  - Star rating.
  - Total order count.
- Tap → `/seller/{id}`.

**Most Ordered Products UI:**
- `ShoppingBag` icon header.
- Horizontal scroll of cards (w-130px) with:
  - Product image (aspect-square) with rank badge + order count pill.
  - Product name, seller name, price.
- Tap → `/seller/{seller_id}`.

**Visibility:** Hidden when both lists are empty.

### 2.9 CommunityTeaser

**File:** `src/components/home/CommunityTeaser.tsx`  
**Position:** Last section on homepage.

**What it does:** Preview of community activity with recent bulletin posts and help requests.

**Data source:** Parallel queries:
1. `bulletin_posts` — 2 most recent non-archived posts (society-scoped).
2. `help_requests` — count of open requests (society-scoped).

**Empty state:** CTA card: "Be the first to post!" with `MessageCircle` icon → links to `/community`.

**Populated state:**

**Help Requests Banner** (when `helpCount > 0`):
- Warning-colored card with `Heart` icon.
- Text: "{count} neighbor(s) need help" + "See how you can assist".
- Animated entrance (`opacity: 0, x: -8`).
- Tap → `/community`.

**Recent Posts** (up to 2):
- Card per post with title (1-line clamp), comment count, vote count.
- Staggered animation (`delay: i * 0.08`).
- Hover: border highlight + shadow.
- Tap → `/community`.

**Section header:** "Community" with `MessageCircle` icon + "View all" link → `/community`.

**Visibility:** Hidden when `effectiveSocietyId` is null. Shows empty state when no posts and no help requests.

---

## 3. SearchPage

**Route:** `/search`  
**File:** `src/pages/SearchPage.tsx`

Full-text product search with advanced filtering, sorting, and cross-society discovery.

### 3.1 Search Header (Sticky)

**Elements:**
- **Back button** — round muted button with `ArrowLeft`, calls `window.history.back()`.
- **Search input** — auto-focused, with:
  - `SearchIcon` prefix.
  - **TypewriterPlaceholder** — animated cycling placeholder text (shown when input is empty).
  - Clear button (`X` icon) — shown when query is non-empty.

### 3.2 Filter Bar (Sticky, below header)

Horizontally scrollable row of filter controls:

| Control | Type | Description |
|---|---|---|
| **Filters** button | Sheet trigger | Opens `SearchFilters` bottom sheet (see §3.5). Badge shows active filter count. |
| **Veg** toggle | Button | Toggles `isVeg: true`. Green border when active. Square indicator with green dot. |
| **Non-veg** toggle | Button | Toggles `isVeg: false`. Red border when active. Square indicator with red dot. |
| **Top Rated** | Sort button | Toggles `sortBy: 'rating'`. |
| **Price ↑** | Sort button | Toggles `sortBy: 'price_low'`. |
| **Price ↓** | Sort button | Toggles `sortBy: 'price_high'`. |

### 3.3 Browse Beyond Society

**Toggle:** `Globe` icon + "Nearby societies" label + `Switch` component.

When enabled:
- **Radius slider** appears (1–10 km, step 1).
- Products from nearby societies are included in results.
- Values stored in `searchRadius` / `browseBeyond` state (managed by `useSearchPage` hook).

### 3.4 Community Search Suggestions

**File:** `src/components/search/CommunitySuggestions.tsx`

**Shown when:** Search is NOT active (no query entered).

**UI:** "Popular in your society" header + wrapped pill buttons.
- Each pill: `TrendingUp` icon + term + count.
- Tap → fills the search input with the term.

### 3.5 SearchFilters (Bottom Sheet)

**File:** `src/components/search/SearchFilters.tsx`

**Trigger:** "Filters" button in filter bar.  
**Sheet:** Bottom sheet at 85vh height, rounded top corners.

**Filter sections:**

| Section | Controls | Details |
|---|---|---|
| **Sort by** | 4 toggle pills | Top Rated, Newest, Price: Low to High, Price: High to Low. |
| **Dietary Preference** | 2 toggle buttons | Veg Only (green border), Non-Veg (red border). |
| **Minimum Rating** | 5 toggle pills | Any, 3+, 3.5+, 4+, 4.5+. |
| **Price Range** | Dual-handle slider | Min 0 to `maxPriceFilter` (from system settings), step ₹50. Current range shown as text. |

**Actions:**
- "Reset all" button (top-right) — clears all filters.
- "Apply Filters" button (fixed bottom) — applies and closes sheet.

**Active filter count:** Computed from non-default values across all filter dimensions.

### 3.6 FilterPresets

**File:** `src/components/search/FilterPresets.tsx`

**Quick-apply preset pills:**

| Preset | Icon | Filter Applied |
|---|---|---|
| Veg Only | `Leaf` (green) | `isVeg: true` |
| Under ₹{threshold} | `Banknote` (green) | `priceRange: [0, threshold]` — threshold from system settings (`budgetFilterThreshold`). |
| Top Rated | `Star` (yellow) | `minRating: 4, sortBy: 'rating'` |
| Featured | `Sparkles` (primary) | `sortBy: 'rating'` |

**Behavior:** Toggle on/off. Active preset gets `bg-primary text-primary-foreground`.

### 3.7 Category Bubble Row

Horizontal scroll of category filter bubbles.

- Only shows categories that have products in current results.
- Tap to filter by category (toggle).
- Active: `bg-primary text-primary-foreground shadow-md scale-[1.03]`.
- Shows `DynamicIcon` + display name.

### 3.8 Active Filter Pills

When filters are active, shows a row of descriptive pills (e.g., "Veg", "₹0–₹500", "Top Rated") with a "Clear" button.

### 3.9 Results Display

**ProductGridByCategory:** Groups results by category, each with:
- Category header: icon + name + item count + starting price ("From ₹99").
- 2-column grid (3 on sm, 4 on md) of `ProductListingCard`.

**Product Detail Sheet:** Tapping any product opens `ProductDetailSheet` — a bottom sheet with full product details, add-to-cart, seller info, and related products.

### 3.10 Empty States

**No results (with search):**
- Search icon illustration.
- "No results found" + "Try different keywords or browse categories".
- If `browseBeyond` is off → CTA: "Search nearby societies too" (enables cross-society search).

**Empty marketplace (no search):**
- Shopping bag illustration.
- "Your marketplace is getting ready!" + "Sellers in your community haven't listed products yet."

---

## 4. CategoriesPage

**Route:** `/categories`  
**File:** `src/pages/CategoriesPage.tsx`

Browse all available service/product categories organized by parent groups.

### 4.1 Header (Sticky)

- Title: "Explore Categories"
- Subtitle: "Find what you love"
- Decorative gradient line below.
- **Search bar** (non-functional) — links to `/search`. Shows rotating placeholder text via `useSearchPlaceholder()`.

### 4.2 Parent Group Filter Pills

Horizontal scroll of filter buttons:
- "All" button (default active).
- One button per parent group that has active categories.
- Active: `bg-primary text-primary-foreground border-primary shadow-cta scale-105`.
- Tap scrolls to the corresponding section (via `ref.scrollIntoView`).

### 4.3 Category Grid

Grouped by parent group, each section has:

**Section header:** Badge pill with group icon + name + category count + horizontal rule.

**Card grid (2-col, 3 on md):**
- Same `ImageCollage` component as homepage.
- Same metadata row (seller count, min price).
- Staggered `framer-motion` entrance animations.
- Tap → `/category/{parentGroup}?sub={category}`.

### 4.4 Data Sources

- `useCategoryConfigs()` — category definitions.
- `useParentGroups()` — parent group hierarchy.
- `useProductsByCategory()` — product counts and images.
- `useNearbySocietySellers()` — expands active categories to include nearby societies (when `browse_beyond_community` is enabled).

### 4.5 Empty State

- `Store` icon with animated `Sparkles` badge.
- "Stay tuned — we're growing!"
- "New sellers are joining your community."
- Clock pill: "Check back soon for new listings".

---

## 5. CategoryGroupPage

**Route:** `/category/:category`  
**File:** `src/pages/CategoryGroupPage.tsx`

Filtered product view for a specific parent group (e.g., "Food & Drinks", "Services").

### 5.1 Header (Sticky)

- **Back button** → `navigate(-1)`.
- **Group title** with `DynamicIcon`.
- **Search input** — local search within the group.
- **Sub-category pills** — horizontal scroll of active sub-categories:
  - "All" tab (when >1 sub-category).
  - Each with `DynamicIcon` + display name.
  - Active: `bg-foreground text-background`.
  - URL synced via `?sub=` query param.

### 5.2 Sort Bar

Horizontal scroll of sort options from `SORT_OPTIONS` constant:

| Key | Label |
|---|---|
| `relevance` | Relevance |
| `price_low` | Price: Low to High |
| `price_high` | Price: High to Low |
| `popular` | Popular |

Active sort: `bg-primary/10 text-primary border-primary`.

### 5.3 Product Grid

- 2-column (3 on sm, 4 on md) grid.
- Item count shown above grid.
- Uses `ProductListingCard` with `categoryConfigs`.
- Tap → opens `ProductDetailSheet`.

### 5.4 Top Sellers Section

**Shown when:** Products exist and no search query is active.

**Data:** Fetches sellers with products in the parent group's categories:
- From `seller_profiles` (approved, ordered by rating DESC).
- Filtered to those with at least one product in target categories.
- Society-scoped, limit 10.

**UI:** Vertical list of `SellerCard` components (max 5).  
Header: ⭐ "Top Sellers in {Group Name}".

### 5.5 Empty State

- Category group icon (large, muted).
- "No items found".
- Context-aware subtitle: "Try a different search" or "Check back soon for new listings!"
- "Browse other categories" button → `/`.

### 5.6 Not Found State

When `parentGroup` doesn't exist: "Category not found" + "Go Home" button.

---

## 6. FavoritesPage

**Route:** `/favorites`  
**File:** `src/pages/FavoritesPage.tsx`

User's saved/favorited sellers.

### 6.1 Header (Sticky)

- **Back button** — navigates back or to `/` if no history.
- Title: "Favourites".
- Saved count badge (right-aligned).

### 6.2 Data Source

Direct Supabase query on `favorites` table:
- Joins `seller_profiles` → `profiles` (for name and block).
- Filters: `user_id = current user`, ordered by `created_at DESC`.
- Client-side filter: only shows sellers where `verification_status = 'approved'` and `is_available !== false`.
- Refetches on `location.key` change (React Router re-renders).

### 6.3 Favorites Grid

3-column grid of `FavoriteSellerCard` components.

**Per card:**
- **Image area** (aspect-square):
  - Seller's `profile_image_url` or `cover_image_url`, or `Store` icon fallback.
  - **FavoriteButton** overlay (top-right) — heart icon, pre-set to `initialFavorite=true`.
    - Toggling off → calls `onRemoved()` which removes seller from local state immediately.
- **Label area:**
  - Business name (truncated).
  - Owner name (from profile, if available).
- Tap → navigates to `/seller/{id}`.

### 6.4 Empty State

- Heart icon in muted circle.
- "No favourites yet".
- "Tap the heart icon on any store to save it here".
- "Browse stores →" link to `/`.

### 6.5 Loading State

3-column grid of skeleton squares.

---

## Cross-Cutting Concerns

### Marketplace Configuration

Many labels and thresholds are driven by two config systems:

1. **`useMarketplaceLabels()`** — Labels and thresholds from `marketplace_labels` table:
   - `label_discovery_popular`, `label_discovery_new`
   - `label_reorder_prefix`, `label_reorder_success`, `label_reorder_unavailable`
   - `new_this_week_days` (default 7)
   - `discovery_min_products` (default 3)
   - `discovery_max_items` (default 10)

2. **`useMarketplaceConfig()`** — Feature flags and display settings.

3. **`useSystemSettings()`** — Global settings:
   - `currencySymbol`, `maxPriceFilter`, `budgetFilterThreshold`.

### Social Proof

`useSocialProof(productIds)` returns a `Map<string, number>` of order counts per product, displayed as badges on product cards.

### Badge Configuration

`useBadgeConfig()` returns configurable badge definitions (e.g., "Bestseller", "New", "Trending") with:
- `tag_key`, `badge_label`, `color`, `priority`, `layout_visibility`.

### Currency Formatting

`useCurrency()` hook provides `formatPrice()` — formats numbers with the society's currency symbol and locale.

### Haptics

`useHaptics()` provides `impact('light' | 'medium' | 'heavy')` for native app haptic feedback (via Capacitor).

---

*Documentation generated on 2026-03-08. Ready to proceed with Module 3: Marketplace & Shopping.*
