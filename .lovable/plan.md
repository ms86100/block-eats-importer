

# Redesign: Categories Page -- Vibrant, Engaging, Fun

## The Problem
The current Categories page is a plain grid of large square image cards with tiny text labels. It lacks visual hierarchy, interactivity, and personality. On desktop it looks especially sparse with just 3 huge cards in a row.

## Design Vision
Transform this into a visually rich, multi-section experience inspired by top grocery/food apps (Blinkit, Swiggy Instamart, Zepto) with layered visual sections, animated interactions, and clear hierarchy.

## Layout Changes

### 1. Page Header with Search Bar
- Compact "Explore Categories" title with a subtitle like "Find what you love"
- Inline search bar that filters categories in real-time as you type
- Animated gradient accent line under the header

### 2. Parent Group Tabs (Horizontal Pill Scroll)
- Scrollable pill-style tabs at the top: "All", "Food & Groceries", "Services", "Shopping", etc.
- Tapping a pill scrolls to that section or filters to only that group
- Active pill uses primary color with a subtle scale animation

### 3. Category Cards -- Compact, Visual, Playful
Replace the current large square cards with a tighter, more engaging layout:

**Mobile (default):** 3-column grid of rounded cards
- Each card: rounded-2xl, subtle gradient overlay on image, category name overlaid at bottom in white bold text
- On hover/press: scale-[0.97] haptic feedback + subtle shadow lift
- Emoji/icon badge floats in top-left corner of each card
- Product count badge in top-right (e.g., "12 items") pulled from `activeCategorySet`

**Desktop:** 4-column grid with slightly larger cards

### 4. Group Section Headers
- Each parent group section gets a styled header with:
  - Group icon + name in a colored pill/badge
  - Subtle horizontal rule
  - Staggered fade-in animation per section (framer-motion)

### 5. Visual Enhancements
- **Gradient overlays** on category images (bottom fade to dark) so text is always readable
- **Staggered entrance animations**: cards fade in with slight delay per item
- **Active:scale-[0.97]** press feedback on all cards (Blinkit style)
- **Shimmer skeletons** during loading that match the new card shape
- **Category count** shown next to group header (e.g., "Food & Groceries (5)")

### 6. Empty State (keep existing)
The current animated empty state with Store icon and "Stay tuned" message is already good -- keep it as-is.

## Technical Changes

### File: `src/pages/CategoriesPage.tsx` (rewrite)
- Add local `searchQuery` state to filter categories by name
- Add `activeGroup` state for the parent group pill filter
- Replace the flat grid with the new multi-section layout
- Add framer-motion staggered animations for card entrance
- Add gradient overlay on image cards
- Add product count per category from `activeCategorySet` data
- Add horizontal scrollable parent group pills at top
- Use `active:scale-[0.97]` on all interactive cards

### No new files or dependencies needed
- Uses existing: `framer-motion`, `lucide-react`, `Link` from react-router
- Uses existing hooks: `useCategoryConfigs`, `useParentGroups`, `useProductsByCategory`, `useNearbySocietySellers`
- Uses existing UI: `Skeleton`, `Input`, `AppLayout`

### No database changes needed
All data is already available from existing hooks.

## Mobile-First Considerations
- 3-column grid on mobile, 4-column on desktop
- Pill tabs scroll horizontally with `overflow-x-auto scrollbar-hide`
- Cards have sufficient tap targets (min 44px height)
- Safe-area padding preserved via AppLayout
- Search input with `Search` icon prefix, `X` clear button

