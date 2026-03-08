
# Listing Type Audit — Investigation Results

## Summary

After investigating the codebase and database, I found **critical gaps** between the documented behavior and actual implementation. The system's foundation exists but several key pieces are missing or broken.

---

## What's Working ✅

| Component | Status | Evidence |
|-----------|--------|----------|
| `ACTION_CONFIG` mapping | ✅ Correct | `marketplace-constants.ts` has all 8 action types with correct labels/icons |
| `LISTING_TYPE_PRESETS` | ✅ Correct | `useCategoryManagerData.ts` has 7 transaction types |
| `deriveBehaviorFlags()` | ✅ Correct | Maps transaction_type → behavior flags |
| `ContactSellerModal` | ✅ Correct | Opens for `contact_seller` action |
| `ProductEnquirySheet` | ✅ Correct | Has metadata for book/request_service/request_quote/schedule_visit/make_offer |
| `category_config` table | ✅ Correct | Has `transaction_type`, `supports_cart`, `enquiry_only`, `layout_type` columns |
| Category configs in DB | ✅ Correct | Music = `book_slot`, yoga = `book_slot`, home_food = `cart_purchase`, etc. |
| Propagation trigger migration | ✅ Exists | `supabase/migrations/20260226113525_*.sql` with `propagate_category_transaction_type` |

---

## What's Broken ❌

### Issue #1: Trigger NOT installed in database

**Evidence:** Query for triggers on `category_config` returned no `trg_propagate_category_transaction_type`:
```
[trg_update_updated_at_category_config, trg_validate_category_layout_type, ...]
```
The migration file exists but the trigger was never created (likely migration failed or was skipped).

### Issue #2: Products have wrong `action_type` values

**Evidence:** Database query shows mismatched values:
```
Guitar       | action_type: 'buy'     | transaction_type: 'book_slot' (should be 'book')
Yoga classes | action_type: 'enquiry' | transaction_type: 'book_slot' (should be 'book')
Panner       | action_type: 'buy'     | transaction_type: 'cart_purchase' (should be 'add_to_cart')
```

The `action_type` values `'buy'` and `'enquiry'` are **not valid** in `ACTION_CONFIG`:
- `ACTION_CONFIG` expects: `add_to_cart`, `buy_now`, `book`, `request_service`, etc.
- Products have: `buy`, `enquiry` — these fall through to the default `add_to_cart`

### Issue #3: Default in DB is wrong

**Evidence:** `products.action_type` column defaults to `'buy'`:
```
column_default: 'buy'::text
```
This causes all new products to have an invalid action_type that falls back to cart.

### Issue #4: No trigger on product INSERT

The `propagate_category_transaction_type` trigger only fires on **UPDATE** of `category_config`. There's no trigger to set `action_type` when a **new product** is created. Product creation flows (`useSellerProducts.ts`, `DraftProductManager.tsx`, `useBulkUpload.ts`) don't derive `action_type` from category config.

### Issue #5: UI correctly reads action_type but values are invalid

`ProductGridCard.tsx` line 39:
```typescript
const actionType: ProductActionType = (product.action_type as ProductActionType) || 'add_to_cart';
const actionConfig = ACTION_CONFIG[actionType] || ACTION_CONFIG.add_to_cart;
```
When `action_type = 'buy'`, it fails the `ACTION_CONFIG['buy']` lookup (undefined) and falls back to `add_to_cart`.

---

## Root Cause

1. **DB trigger not applied** — The propagation trigger migration exists but wasn't applied to the live database
2. **Invalid action_type values** — Historical products have `'buy'`/`'enquiry'` instead of valid ACTION_CONFIG keys
3. **No INSERT-time derivation** — New products don't get action_type from their category
4. **Wrong DB default** — Default is `'buy'` instead of `'add_to_cart'`

---

## Implementation Plan

### Phase 1: Database Fixes

**Migration 1 — Fix and install trigger + backfill:**
```sql
-- 1. Create/replace the propagation trigger
CREATE OR REPLACE FUNCTION public.propagate_category_transaction_type() ...

-- 2. Create INSERT trigger for new products
CREATE OR REPLACE FUNCTION public.set_product_action_type_on_insert()
RETURNS trigger AS $$
BEGIN
  IF NEW.action_type IS NULL OR NEW.action_type NOT IN (
    'add_to_cart','buy_now','book','request_service',
    'request_quote','contact_seller','schedule_visit','make_offer'
  ) THEN
    SELECT CASE cc.transaction_type
      WHEN 'cart_purchase' THEN 'add_to_cart'
      WHEN 'buy_now' THEN 'buy_now'
      WHEN 'book_slot' THEN 'book'
      WHEN 'request_service' THEN 'request_service'
      WHEN 'request_quote' THEN 'request_quote'
      WHEN 'contact_only' THEN 'contact_seller'
      WHEN 'schedule_visit' THEN 'schedule_visit'
      ELSE 'add_to_cart'
    END INTO NEW.action_type
    FROM public.category_config cc
    WHERE cc.category::text = NEW.category::text;
    
    IF NEW.action_type IS NULL THEN
      NEW.action_type := 'add_to_cart';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_product_action_type_on_insert
BEFORE INSERT ON public.products
FOR EACH ROW EXECUTE FUNCTION public.set_product_action_type_on_insert();

-- 3. Fix DB default
ALTER TABLE public.products ALTER COLUMN action_type SET DEFAULT 'add_to_cart';

-- 4. Backfill all existing products
UPDATE public.products p
SET action_type = CASE cc.transaction_type
  WHEN 'cart_purchase' THEN 'add_to_cart'
  WHEN 'buy_now' THEN 'buy_now'
  WHEN 'book_slot' THEN 'book'
  WHEN 'request_service' THEN 'request_service'
  WHEN 'request_quote' THEN 'request_quote'
  WHEN 'contact_only' THEN 'contact_seller'
  WHEN 'schedule_visit' THEN 'schedule_visit'
  ELSE 'add_to_cart'
END
FROM public.category_config cc
WHERE cc.category::text = p.category::text;

-- 5. Add constraint to prevent invalid values
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_action_type_valid;
ALTER TABLE public.products ADD CONSTRAINT products_action_type_valid
CHECK (action_type IN (
  'add_to_cart','buy_now','book','request_service',
  'request_quote','contact_seller','schedule_visit','make_offer'
));
```

### Phase 2: Frontend Hardening

Add `deriveActionType()` utility to `marketplace-constants.ts` and use it in UI components as a safety net:

**Files to update:**
- `src/lib/marketplace-constants.ts` — Add mapping utility
- `src/components/product/ProductGridCard.tsx` — Use derived action
- `src/components/product/ProductListingCard.tsx` — Use derived action  
- `src/hooks/useProductDetail.ts` — Use derived action
- `src/hooks/useCart.tsx` — Add guard to reject non-cart items

### Phase 3: Product Creation Flows

Update to explicitly set `action_type` from category config:
- `src/hooks/useSellerProducts.ts`
- `src/components/seller/DraftProductManager.tsx`
- `src/hooks/useBulkUpload.ts`

### Phase 4: Fix ProductDetailSheet Buy Now CTA

Update sticky CTA to show "Buy Now" instead of "Add to cart" when `actionType === 'buy_now'`.

---

## Expected Outcome After Fix

| Category | transaction_type | Products get action_type | Button Shows |
|----------|------------------|--------------------------|--------------|
| Home Food | cart_purchase | add_to_cart | ADD |
| Music | book_slot | book | Book |
| Yoga | book_slot | book | Book |
| Electrician | request_service | request_service | Request |
| Catering | request_quote | request_quote | Quote |
| Maid | contact_only | contact_seller | Contact |
| Flat Rent | schedule_visit | schedule_visit | Visit |

---

## Audit Document

Will create `.lovable/listing-type-audit.md` to track all findings and fixes.
