

# Unified Categories & Attributes Admin Experience

## Problem
1. The "Attach to Categories" section in the attribute block editor only shows emojis without category names
2. Categories and Attributes live in separate tabs, making it hard to see how they relate
3. The admin has to mentally map between two disconnected screens

## Solution

Merge the "Categories" and "Attributes" tabs into a single **"Catalog"** tab that presents a unified, card-based interface showing categories with their linked attribute blocks.

### Layout Design

```text
┌─────────────────────────────────────────┐
│  Catalog                                │
│  ┌─ Categories ─┬─ Attributes ─┐       │
│  │  (sub-tabs within the page)  │       │
│  └──────────────────────────────┘       │
│                                         │
│  [Categories sub-tab]                   │
│  ┌─────────────────────────────────┐    │
│  │ 🍕 Home Food          [Edit]   │    │
│  │ 3 attribute blocks attached     │    │
│  │ ┌────────┐ ┌────────┐ ┌──────┐ │    │
│  │ │Food Det│ │Allergen│ │Nutri │ │    │
│  │ └────────┘ └────────┘ └──────┘ │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │ 👗 Clothing            [Edit]   │    │
│  │ 2 attribute blocks attached     │    │
│  │ ┌────────┐ ┌────────┐          │    │
│  │ │Size/Fit│ │Material│          │    │
│  │ └────────┘ └────────┘          │    │
│  └─────────────────────────────────┘    │
│                                         │
│  [Attributes sub-tab]                   │
│  (existing AdminAttributeBlockManager)  │
│  - with fixed category label display    │
└─────────────────────────────────────────┘
```

### Changes

#### 1. `src/pages/AdminPage.tsx`
- Remove both the "Categories" and "Attributes" tabs from the navigation
- Add a single **"Catalog"** tab in their place (keeps the grid at the same column count)
- The Catalog tab content renders a new `AdminCatalogManager` component

#### 2. New: `src/components/admin/AdminCatalogManager.tsx`
A unified component with internal sub-tabs:

**"Categories" sub-tab:**
- Renders `CategoryManager` and `SubcategoryManager` as before
- Below each category card, shows linked attribute block badges with animated entry (framer-motion `AnimatePresence`)
- Each badge is clickable to jump to that block's edit sheet
- Visual connection: attribute count shown per category

**"Attributes" sub-tab:**
- Renders `AdminAttributeBlockManager` (existing component)
- Provides a cohesive feel within the same page

**"Overview" sub-tab (default):**
- A visual mapping view: categories listed as cards, each showing its attached attribute blocks as nested pill badges
- Clicking a category expands to show block details
- Clicking a block opens the edit sheet
- Uses framer-motion for expand/collapse animations

#### 3. `src/components/admin/AdminAttributeBlockManager.tsx`
- Fix the category display bug: the `categories` query returns objects where `display_name` may be coming through correctly but the rendering context might be empty if category_config has no data loaded yet
- Add a loading state for the category checkbox list
- Ensure each checkbox label shows `{c.icon} {c.display_name}` with a fallback to the slug

### Technical Details

- **Framer Motion** animations: `layout` prop on cards, `AnimatePresence` for block badges appearing/disappearing
- **Sub-tabs**: Uses the existing `Tabs` component nested inside the Catalog tab content
- **Data flow**: `AdminCatalogManager` fetches both `category_config` and `attribute_block_library`, then cross-references `category_hints` to build the mapping view
- The attribute block sheet (create/edit) remains a bottom sheet as currently implemented
- No database changes required

### Files to Change

| File | Action | What Changes |
|------|--------|-------------|
| `src/components/admin/AdminCatalogManager.tsx` | Create | Unified catalog page with overview, categories, and attributes sub-tabs |
| `src/pages/AdminPage.tsx` | Edit | Replace "Categories" + "Attributes" tabs with single "Catalog" tab |
| `src/components/admin/AdminAttributeBlockManager.tsx` | Edit | Fix category name display in checkbox list, add loading fallback |

