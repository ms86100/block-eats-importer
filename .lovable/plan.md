

## Fix: Store Settings Showing Raw Icon Names Instead of Icons

### Problem
Two places in `SellerSettingsPage.tsx` render icon names as plain text:

1. **Primary group display (line 119)**: Shows "UtensilsCrossed" as text alongside "Food & Beverages"
2. **Category checkboxes (line 136)**: Shows "ChefHat", "Cake", "Cookie", etc. as text instead of rendered icons

Both fields store Lucide icon names in the database. The `DynamicIcon` component (already used elsewhere) resolves these to actual SVG icons.

### Fix — `src/pages/SellerSettingsPage.tsx`

1. **Import `DynamicIcon` and `resolveColorProps`** from `@/components/ui/DynamicIcon`

2. **Line 119** — Primary group icon: Replace `{getGroupBySlug(primaryGroup)?.icon}` text with `<DynamicIcon name={...} size={24} />` and use `resolveColorProps` for the color styling on the container div

3. **Line 136** — Category icon in checkbox list: Replace `<span className="text-lg">{config.icon}</span>` with `<DynamicIcon name={config.icon} size={18} />` and apply `resolveColorProps(config.color)` for proper icon coloring

### Result
- Parent group section shows the actual Lucide icon (e.g., fork-knife icon) with proper background color
- Category checkboxes show actual icons (e.g., chef hat, cake, cookie) with their configured colors
- All data remains dynamic from the database — no hardcoded text

