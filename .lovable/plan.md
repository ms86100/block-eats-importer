

## Fix: Back Button and Bottom Navigation Reachability on Mobile

### Problem
Two issues are making the app difficult to use on mobile phones:

1. **Back buttons are unreachable** -- On pages like Category, Cart, Order Detail, Favorites, and Seller pages, the back button sits too close to the top edge of the screen. On phones with status bars or notches, this makes them impossible to tap. The buttons are also inconsistently sized (some `w-7 h-7`, some `w-8 h-8`, some `w-9 h-9`).

2. **Bottom navigation is cut off** -- The nav bar has only `py-1` padding, causing the icons and labels (Home, Order Again, Categories, Cart, Profile) to sit right at the very bottom of the screen. On phones with home indicators (swipe bars), the nav gets partially hidden.

### Solution

#### 1. Bottom Navigation -- increase inner padding and ensure safe-area spacing

**File: `src/components/layout/BottomNav.tsx`**
- Change inner padding from `py-1` to `py-2` so nav items have breathing room
- The `safe-bottom` class on the outer `<nav>` already handles the home indicator area, but the inner content needs more space above it

#### 2. Standardize all back buttons to minimum 44x44px tap target with proper top spacing

Create a consistent pattern across all pages: every back button will be at least `w-10 h-10` (40px) with adequate top padding when using `safe-top`.

**Files to update (back button sizing and padding):**

| File | Current size | Fix |
|------|-------------|-----|
| `src/pages/CategoryPage.tsx` | `w-7 h-7` | `w-10 h-10`, add `pt-1` to header |
| `src/pages/CartPage.tsx` (empty state) | `w-9 h-9` | `w-10 h-10`, add `pt-2` |
| `src/pages/CartPage.tsx` (with items) | `w-8 h-8` | `w-10 h-10`, increase `py-3` to `py-3.5` |
| `src/pages/OrderDetailPage.tsx` | `w-8 h-8` | `w-10 h-10`, increase `py-3` to `py-3.5` |
| `src/pages/FavoritesPage.tsx` | `w-9 h-9` | `w-10 h-10`, increase `py-3` to `py-3.5` |
| `src/pages/SearchPage.tsx` | `h-9 w-9` | `h-10 w-10` |
| `src/pages/SellerSettingsPage.tsx` | `w-9 h-9` | `w-10 h-10`, add `pt-2` |
| `src/pages/SellerEarningsPage.tsx` | `w-9 h-9` | `w-10 h-10`, add `pt-2` |
| `src/pages/SellerProductsPage.tsx` | `w-9 h-9` | `w-10 h-10` |
| `src/pages/BecomeSellerPage.tsx` | `w-9 h-9` | `w-10 h-10`, add `pt-2` |

#### 3. Add a minimum top padding to `safe-top` class

**File: `src/index.css`**
- Update the `.safe-top` utility to include a minimum fallback padding so that even on browsers that don't support `env(safe-area-inset-top)`, there is at least `12px` of top padding:

```css
.safe-top {
  padding-top: max(12px, env(safe-area-inset-top));
}
```

Similarly for `.safe-bottom`:
```css
.safe-bottom {
  padding-bottom: max(8px, env(safe-area-inset-bottom));
}
```

### Technical Details

- All back buttons standardized to `w-10 h-10` (40px) which meets the 44px touch target with padding
- ArrowLeft icon size unified to `size={18}` for consistency
- Bottom nav inner padding doubled from 4px to 8px
- Safe-area CSS utilities get `max()` fallbacks for non-notched devices
- No functional changes -- only layout/sizing adjustments

