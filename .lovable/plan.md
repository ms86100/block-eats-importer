

## Issue: Buyer still sees old action button after admin changes category listing type

### Root Cause

There are **two gaps** working together:

1. **No product backfill on category update**: When the admin saves a changed `transaction_type` in `saveEditedCategory` (useCategoryManagerData.ts line 121), it only updates the `category_config` table. It does **not** update the `action_type` column on existing `products` rows. The confirmation dialog (TransactionTypeConfirmSave.tsx) tells the admin "N products will be updated" but the actual update never happens.

2. **deriveActionType priority**: In `marketplace-constants.ts` line 41, the function checks `product.action_type` **first**. Since existing products still have their old `action_type` (e.g., `"book"` from the previous `book_slot` setting), the category fallback on line 44 is never reached.

### Fix Plan

**Step 1 — Backfill products when admin changes transaction_type** (in `useCategoryManagerData.ts`)

After the `category_config` update succeeds in `saveEditedCategory`, add a second query to update all products in that category:

```sql
UPDATE products 
SET action_type = <new_derived_action_type> 
WHERE category = <category_key>
```

This will be done via `supabase.from('products').update({ action_type }).eq('category', editingCategory.category)` right after the category_config update on line 122. The new `action_type` value is derived using `TRANSACTION_TO_ACTION[editForm.transaction_type]`.

**Step 2 — Invalidate product caches**

After the backfill, invalidate product-related query caches so buyer pages refetch:
- `queryClient.invalidateQueries({ queryKey: ['category-configs'] })` (already done)
- Add: `queryClient.invalidateQueries({ queryKey: ['products'] })`
- Add: `queryClient.invalidateQueries({ queryKey: ['category-products'] })`

### Files Changed

| File | Change |
|---|---|
| `src/hooks/useCategoryManagerData.ts` | Add product `action_type` backfill after category_config update in `saveEditedCategory` + invalidate product caches |

### Why not just change deriveActionType priority?

Flipping the priority (category first, product second) would be a breaking change — some products may intentionally have a custom `action_type` that differs from their category default. The correct fix is to ensure the backfill actually runs when the admin makes the change, which is what the UI already promises.

