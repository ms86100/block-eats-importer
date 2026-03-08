

# Fix: `products_action_type_valid` Constraint Violation

## Root Cause

The `action_type` column on `products` has a **column default of `'buy'`** (set in migration `20260306152924`), but a later migration (`20260308110457`) added a CHECK constraint that only allows:
`add_to_cart`, `buy_now`, `book`, `request_service`, `request_quote`, `contact_seller`, `schedule_visit`, `make_offer`

`'buy'` is not in that list. When `DraftProductManager.tsx` inserts a product without explicitly setting `action_type`, the DB default `'buy'` kicks in and violates the constraint.

The same issue affects the main `useSellerProducts` hook — it does set `action_type`, so it works for the edit flow, but could also fail if the value is somehow empty.

## Regarding the AI Image Generation Page Reset

This is a separate issue — the image generation likely triggers a re-render or state reset in the parent onboarding stepper. Will need to investigate the stepper state management if it persists after the constraint fix, but it may be caused by the error itself cascading.

## Fix (2 changes)

### 1. Database: Change column default from `'buy'` to `'add_to_cart'`

```sql
ALTER TABLE public.products ALTER COLUMN action_type SET DEFAULT 'add_to_cart';
-- Also fix any existing rows with the invalid default
UPDATE public.products SET action_type = 'add_to_cart' WHERE action_type = 'buy';
```

### 2. Code: Explicitly set `action_type` in `DraftProductManager.tsx`

In the insert call (~line 116), derive the correct `action_type` from the category config's `transaction_type` using the existing `deriveActionType` utility, so service categories get `'book'`, cart categories get `'add_to_cart'`, etc.

```typescript
import { deriveActionType } from '@/lib/marketplace-constants';
// ...
action_type: deriveActionType(null, activeConfig?.raw?.transaction_type),
```

This ensures the product always gets the correct action type based on its category, matching what `useSellerProducts` already does for the main product management flow.

