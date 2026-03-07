

## Problem

The `ParentGroupTabs` component renders `{tab.icon}` as plain text, displaying raw Lucide icon names like "UtensilsCrossed" and "ChefHat" instead of actual icons. The same issue exists in `CategoryImageGrid` where `cat.icon` (also a Lucide icon name) is used as a fallback emoji text.

The project already has a `DynamicIcon` component (`src/components/ui/DynamicIcon.tsx`) that resolves Lucide icon name strings to rendered components — it's used correctly in admin pages, `CategoryBrowseGrid`, and `CategoryGroupPage`, but was missed in these two home page components.

## Fix

### 1. `ParentGroupTabs.tsx` — Replace plain text icon with `DynamicIcon`

Line 54: Change `<span className="text-sm leading-none">{tab.icon}</span>` to use `<DynamicIcon name={tab.icon} size={14} />`.

### 2. `CategoryImageGrid.tsx` — Replace plain text fallback icon with `DynamicIcon`

Line 66 (inside `ImageCollage` fallback): Change `<span className="text-3xl">{fallbackIcon}</span>` to use `<DynamicIcon name={fallbackIcon} size={32} />`.

Line 304 (inside `ProductListings` category header): Change `<span className="text-base">{cat.icon}</span>` in `MarketplaceSection.tsx` to use `<DynamicIcon name={cat.icon} size={16} />`.

### Files Changed
- `src/components/home/ParentGroupTabs.tsx` — import and use `DynamicIcon`
- `src/components/home/CategoryImageGrid.tsx` — import and use `DynamicIcon` for fallback
- `src/components/home/MarketplaceSection.tsx` — import and use `DynamicIcon` in category headers

