

# Product-Aware Category Visibility

## Problem
Currently, the category grids on the Home page and Categories page display ALL categories from the `category_config` table, regardless of whether any active products exist. This leads to dead-end clicks and a cluttered UI.

## What Changes

### 1. CategoryImageGrid -- Filter by actual products
The `CategoryImageGrid` component currently fetches categories from `useCategoryConfigs()` (pure config). It will be updated to accept a set of "active categories" (categories that have at least one product) and only render categories present in that set.

- `MarketplaceSection` already has `useProductsByCategory()` which returns only categories with products
- Pass the set of active category slugs down to `CategoryImageGrid` as a prop
- `CategoryImageGrid` will intersect its config-based list with this active set

### 2. ParentGroupTabs -- Already partially correct
`MarketplaceSection` already filters parent group tabs to only show groups that have products (line 31-33). No change needed here.

### 3. CategoriesPage -- Filter by products
The standalone `/categories` page also shows all categories. It will use `useProductsByCategory()` to build the set of active categories and filter out empty ones.

### 4. CategoryBrowseGrid -- Filter by products
The `CategoryBrowseGrid` component (used on category browse) will also receive the active category filter.

## Technical Details

### File: `src/components/home/MarketplaceSection.tsx`
- Compute `activeCategorySet` from `localCategories` data: `new Set(localCategories.map(c => c.category))`
- Pass `activeCategorySet` to each `CategoryImageGrid` as a new prop

### File: `src/components/home/CategoryImageGrid.tsx`
- Add optional prop `activeCategories?: Set<string>`
- When provided, filter the config categories: `categories.filter(c => activeCategories.has(c.category))`
- If filtered list is empty, return `null` (hide entire section)

### File: `src/pages/CategoriesPage.tsx`
- Import and use `useProductsByCategory()` to get categories with products
- Build active set and filter the grouped categories display
- Only show parent groups that have at least one category with products

### File: `src/components/category/CategoryBrowseGrid.tsx`
- Accept optional `activeCategories?: Set<string>` prop
- Filter configs by active set when provided

## Result
- Only categories with real, active, approved product listings are shown
- No empty categories, no dead-end clicks
- Parent group tabs and sections auto-hide when they have no products
- Works correctly with cross-society discovery (the product data already respects society filters)
