

## Thorough Audit: Category-Subcategory Model

### What Actually Happened (Root Cause)

The database reveals the exact sequence:

| What you created | Where it landed | DB Table |
|---|---|---|
| "tt" | Parent Group | `parent_groups` |
| "ss" | Category (under group "tt") | `category_config` |
| "DD" | Subcategory (under category "ss") | `subcategories` |

The system has a **three-tier hierarchy**: Parent Group → Category → Subcategory. This is technically correct -- subcategories are assigned directly to categories, and there is **no subcategory-under-subcategory nesting** in the schema. The `subcategories` table has a foreign key to `category_config`, not to itself.

However, the admin UI creates this confusion because:

1. **The "Categories" tab creates `category_config` rows**, but labels them just "Categories" -- there is no visual indication that these sit under a parent group, making "ss" look like a top-level item rather than a child of "tt"
2. **The "Subcategories" tab shows `category_config` rows as "Parent Category"** in its dropdown -- so when you see "ss" there, it appears as if "ss" is a category and "DD" is a subcategory of "ss", which is correct but unintuitive because "ss" already felt like a subcategory
3. **There is no visual hierarchy map** showing Group → Category → Subcategory relationships, so the three tiers appear disconnected

The schema is sound. The problem is entirely a **UI/UX labeling and workflow issue**.

### Plan: Clarify the Hierarchy Without Breaking Anything

#### Change 1: Add hierarchy breadcrumb labels throughout the admin Catalog tab

In the **Category Manager** section, each category card should show its parent group as a breadcrumb:
```
[Food] → Home Food
[tt] → ss
```
This makes it immediately clear that "ss" is a category under group "tt", not a standalone item.

In the **Subcategory Manager** section, each subcategory card should show the full path:
```
[tt] → [ss] → DD
```
And the "Parent Category" dropdown in the Add/Edit dialog should show the group prefix:
```
[Food] 🍲 Home Food
[tt] 🏷️ ss
```

#### Change 2: Add a visual hierarchy overview card at the top of the Catalog tab

Add a collapsible "Taxonomy Overview" section that displays the full tree:
```text
├── Food (Group)
│   ├── Home Food (Category)
│   ├── Bakery (Category)
│   └── Snacks (Category)
├── tt (Group)
│   └── ss (Category)
│       └── DD (Subcategory)
```

This gives admins instant clarity on where everything sits.

#### Change 3: Rename UI labels for precision

| Current label | New label |
|---|---|
| "Categories" tab header | "Categories (under Groups)" |
| "Parent Category" in subcategory form | "Parent Category (from Groups → Categories)" |
| Category card subtitle | Show `Group: {groupName}` |

#### Change 4: Add inline "Add Subcategory" button on each category card

In the Category Manager, each category row gets a small `+ Sub` button that opens the Subcategory dialog pre-filled with that category as parent. This makes the parent-child relationship obvious at the point of creation.

#### Change 5: Prevent subcategory-of-subcategory at the database level (defensive)

Although the current schema already prevents this (subcategories FK to `category_config`, not to `subcategories`), add a comment/note in the migration for documentation. No schema change needed -- this is already enforced.

### Impact Analysis

| Area | Impact | Risk |
|---|---|---|
| Seller product forms | None -- `useSellerProducts` reads from `category_config` and `subcategories` tables correctly | None |
| Buyer-facing category pages | None -- `CategoryPage.tsx` filters by `category_config` and shows subcategory chips | None |
| Category filter/browse | None -- `CategoryGroupGrid` reads parent groups and grouped configs correctly | None |
| Search/discovery | None -- product search uses `category` field which maps to `category_config` | None |
| Database schema | No changes needed -- the FK constraint already enforces the correct model | None |
| RLS policies | No changes needed | None |
| Existing data | "tt" group, "ss" category, "DD" subcategory are all valid -- no data migration needed | None |

### Files to modify

| File | Change |
|---|---|
| `src/components/admin/SubcategoryManager.tsx` | Show group prefix in parent dropdown, add full breadcrumb on subcategory cards |
| `src/components/admin/CategoryManager.tsx` | Show parent group badge on each category card, add inline "+ Sub" button |
| `src/components/admin/AdminCatalogManager.tsx` | Add collapsible taxonomy overview tree at top |

### What will NOT change
- No database migrations
- No schema changes (the model is already correct)
- No changes to seller forms, buyer pages, search, or any consumer-facing code
- No changes to RLS policies or triggers
- No data migration needed

