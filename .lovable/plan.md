

## Plan: Allow Products During Draft — Single End-to-End Onboarding

### Problem
The `check_seller_license` database trigger on the `products` table blocks all product inserts/updates when the seller's `verification_status` is not `'approved'`. This prevents sellers from adding products during onboarding (when status is `draft`), breaking the intended single-flow experience.

### Solution
Modify the `check_seller_license()` database function to allow product operations for `draft` and `pending` sellers. Products added during onboarding will have `approval_status = 'draft'`, making them invisible to buyers until admin approval. Only `rejected` sellers will be blocked.

### Changes

**1. Database migration — Update `check_seller_license()` function**

```sql
CREATE OR REPLACE FUNCTION public.check_seller_license()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _status text;
BEGIN
  SELECT verification_status INTO _status 
  FROM public.seller_profiles WHERE id = NEW.seller_id;
  
  IF _status IS NULL THEN 
    RAISE EXCEPTION 'Seller profile not found'; 
  END IF;
  
  -- Allow draft/pending sellers to manage products during onboarding
  -- Only block rejected sellers
  IF _status = 'rejected' THEN 
    RAISE EXCEPTION 'Seller not approved (status: %)', _status; 
  END IF;
  
  RETURN NEW;
END;
$$;
```

**2. No frontend changes needed**

The existing 6-step flow (Category → Specialize → Store Details → Settings → Products → Review) already implements the single end-to-end flow. The `handleSubmit()` in `useSellerApplication.ts` already:
- Requires at least 1 product before submission
- Transitions both the seller profile to `pending` and products from `draft` to `pending`
- Submits everything together for admin review

The only blocker is the database trigger — once relaxed, the existing flow works as intended.

### Why this is safe
- Draft products have `approval_status = 'draft'` and are not visible to buyers
- The marketplace queries (`search_marketplace`, product listings) filter by `is_available = true` and seller `verification_status = 'approved'`
- On final submission, both seller and products move to `pending` for admin review together

