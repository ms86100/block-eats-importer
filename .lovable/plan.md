
# Marketplace Integrity Fix -- Execution Plan

## PHASE 1 -- Critical Integrity Fixes

### Fix 1: Backend Category Validation (DB Trigger)

**Problem:** No database-level enforcement prevents inserting a product with a disabled or nonexistent category.

**Solution:** Create a validation trigger on the `products` table that fires BEFORE INSERT and BEFORE UPDATE. It will:
- Look up the `category` value in `category_config`
- Reject if no matching row exists
- Reject if `is_active = false`
- Also reject if the parent group is inactive in `parent_groups`

**Migration:**
```sql
CREATE OR REPLACE FUNCTION public.validate_product_category()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _cat record;
BEGIN
  SELECT cc.is_active, pg.is_active AS group_active
  INTO _cat
  FROM category_config cc
  JOIN parent_groups pg ON pg.slug = cc.parent_group
  WHERE cc.category = NEW.category::text;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid category: %. Category does not exist.', NEW.category;
  END IF;
  IF NOT _cat.is_active THEN
    RAISE EXCEPTION 'Category "%" is currently disabled.', NEW.category;
  END IF;
  IF NOT _cat.group_active THEN
    RAISE EXCEPTION 'Parent group for category "%" is currently disabled.', NEW.category;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_product_category
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.validate_product_category();
```

**Enforcement level:** Database. Cannot be bypassed by frontend or direct API calls.

---

### Fix 2: Product-Level Approval Workflow

**Problem:** Products go live immediately. No draft/review/approve lifecycle exists.

**Solution:** Add an `approval_status` column to the `products` table with states: `draft`, `pending`, `approved`, `rejected`. Default is `draft`.

**Database changes:**
- Add column: `approval_status text NOT NULL DEFAULT 'draft'`
- Add validation trigger to restrict values to the 4 allowed states
- Update the SELECT RLS policy so that buyers only see `approval_status = 'approved'` products (sellers still see their own)

**Migration:**
```sql
ALTER TABLE public.products ADD COLUMN approval_status text NOT NULL DEFAULT 'draft';

-- Backfill: all existing products become approved
UPDATE public.products SET approval_status = 'approved';

-- Validation trigger
CREATE OR REPLACE FUNCTION public.validate_product_approval_status()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.approval_status NOT IN ('draft', 'pending', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid approval_status: %', NEW.approval_status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_product_approval_status
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.validate_product_approval_status();
```

**RLS update:** Modify the existing SELECT policy so non-owner queries additionally require `approval_status = 'approved'`.

**Frontend changes:**

*Seller side (`SellerProductsPage.tsx`):*
- Show approval status badge on each product card (Draft / Pending / Approved / Rejected)
- Add "Submit for Approval" button that sets status to `pending`
- Products in `draft` and `rejected` states remain editable
- Products in `pending` or `approved` states show read-only indicator

*Admin side (`AdminPage.tsx` or new tab):*
- Add "Product Approvals" section listing all `pending` products
- Admin can approve (set `approved`) or reject (set `rejected`) with optional note
- Filter by society

---

### Fix 3: Bulk Upload Category Intelligence

**Problem:** Bulk grid shows Veg toggle for all categories; Duration column missing; no per-row category intelligence.

**Solution:** Update `BulkProductUpload.tsx`:

1. Remove static "Veg" column from the table header
2. Add conditional rendering per row: look up the `CategoryConfig` for that row's category
3. If `showVegToggle = true` for that row's category, show the switch; otherwise hide it and default `is_veg` to `true`
4. Add a "Duration" column that only shows an input when `showDurationField = true` for the row's category
5. Update validation to reject `is_veg = false` when `showVegToggle` is not enabled for the category
6. Set `approval_status = 'draft'` on all bulk-inserted products (aligns with Fix 2)

**File modified:** `src/components/seller/BulkProductUpload.tsx`

---

## PHASE 2 -- Minor Hardening

### Fix 4: Remove Hardcoded Veg Fallback

**Problem:** Line 74 in `SellerProductsPage.tsx`: `return primaryGroup === 'food';` -- a hardcoded fallback.
Also line 627: `prodConfig?.formHints.showVegToggle ?? primaryGroup === 'food'`.

**Solution:** Change both to default to `false` instead of checking `primaryGroup`. If no category is selected, veg toggle is hidden. Pure DB-driven behavior.

**File modified:** `src/pages/SellerProductsPage.tsx` (lines 74 and 627)

---

### Fix 5: Populate Missing Beverages Placeholders

**Problem:** The `beverages` category has NULL placeholders.

**Solution:** Run a data UPDATE to populate:
- `name_placeholder`: 'e.g., Fresh Mango Lassi'
- `description_placeholder`: 'Describe the drink, ingredients, serving size...'
- `price_label`: 'Price'
- `show_veg_toggle`: true
- `show_duration_field`: true
- `duration_label`: 'Prep Time (min)'

**Enforcement level:** Database data update.

---

### Fix 6: Server-Side Hint Enforcement (Trigger)

**Solution:** Add a lightweight validation trigger that:
- Resets `is_veg` to `true` if the category has `show_veg_toggle = false` (prevents non-food items from carrying a misleading non-veg flag)
- Resets `prep_time_minutes` to `NULL` if `show_duration_field = false`

This is a data normalization trigger, not a blocking one -- it silently corrects invalid combinations rather than rejecting them, ensuring data cleanliness without breaking existing flows.

---

## Technical Summary

| Fix | Type | Enforcement | Files / Tables |
|-----|------|-------------|----------------|
| 1. Category validation | DB trigger | Database | `products` table, new trigger |
| 2. Product approval workflow | Column + trigger + RLS + UI | Database + UI | `products` table, `SellerProductsPage.tsx`, admin UI |
| 3. Bulk upload intelligence | UI + validation | Frontend | `BulkProductUpload.tsx` |
| 4. Remove hardcoded fallback | Code cleanup | Frontend | `SellerProductsPage.tsx` |
| 5. Beverages placeholders | Data update | Database | `category_config` table |
| 6. Server-side hint enforcement | DB trigger | Database | `products` table, new trigger |

### Implementation Order
1. Database migration (Fixes 1, 2, 6 -- single migration)
2. Data update (Fix 5 -- beverages placeholders)
3. Frontend changes (Fixes 3, 4 -- parallel)
4. Seller UI for approval workflow (Fix 2 frontend)
5. Admin UI for product review (Fix 2 admin)
