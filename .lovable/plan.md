

# Fix Plan: Action Button Mismatch & Cart Sync Issues

## Issue 1: Bookable Services Show "ADD" Instead of "Book"

**Root Cause**: `ProductGridCard.tsx` (line 39) calls `deriveActionType(product.action_type, null)` — it always passes `null` as the category transaction type fallback. When a product's `action_type` column is NULL in the database (trigger didn't backfill, or product was created before the trigger existed), the function falls through to the hardcoded default `'add_to_cart'`.

By contrast, `ProductListingCard.tsx` (line 110-112) correctly looks up the category's `transactionType` from `categoryConfigs` and passes it as the second argument, so it gets the correct button even when `action_type` is NULL.

**Fix** — two-pronged:

1. **`ProductGridCard.tsx`**: Accept `categoryConfigs` (or just a `transactionType` string) as a prop and pass it to `deriveActionType`. Alternatively, use the `useCategoryConfigs()` hook directly inside the component to look up the transaction type for `product.category`.

2. **`useProductDetail.ts`** (line 69): Same issue — passes `null` as second arg. Fix to look up category transaction type.

3. **Database backfill**: Run a one-time migration to backfill `action_type` on all products where it is currently NULL, using the `category_config.transaction_type` mapping. This ensures the primary path in `deriveActionType` always works.

**Files**:
- `src/components/product/ProductGridCard.tsx` — add category config lookup
- `src/hooks/useProductDetail.ts` — add category config lookup
- Database migration — backfill NULL `action_type` values

---

## Issue 2: Cart Shows Items in Badge But Cart Page is Empty

**Root Cause**: The cart badge uses `useCartCount` with query key `['cart-count', user?.id]`. When adding items, the count is optimistically set via `queryClient.setQueryData`. However, the cart page uses the full `useCart` hook with query key `['cart-items', user?.id]`.

The problem is a **stale query cache issue**: after adding items from a product grid, `addItem` calls `invalidate()` which triggers `queryClient.invalidateQueries` for both keys. But if the cart page component hasn't been mounted yet, its query may not re-fetch until the user navigates to it. Combined with `staleTime: 30_000`, the cached empty array from initial load persists.

The deeper issue: when `user` changes (e.g., auth state resolves async), the query key changes from `['cart-items', undefined]` to `['cart-items', '<actual-id>']`. The old empty-result cache for `undefined` is gone, but the new key hasn't fetched yet. The optimistic updates were written to the old key.

**Fix**:
- In `useCart.tsx`, ensure `invalidate()` also invalidates queries without the user ID suffix, or better: after optimistic update, always call `invalidateQueries` with `exact: false` so stale data is cleared regardless of key timing.
- Add `refetchOnMount: 'always'` to the cart query so navigating to the cart page always triggers a fresh fetch.
- Ensure the `CartProvider`'s query re-fetches when `user?.id` transitions from `undefined` to a real value (currently handled by `enabled: !!user`, but stale cache from a previous render cycle can linger).

**Files**:
- `src/hooks/useCart.tsx` — add `refetchOnMount: 'always'` and improve invalidation

---

## Summary

| File | Change |
|------|--------|
| `src/components/product/ProductGridCard.tsx` | Use `useCategoryConfigs()` to pass `transactionType` to `deriveActionType` |
| `src/hooks/useProductDetail.ts` | Same — look up category transaction type instead of passing `null` |
| `src/hooks/useCart.tsx` | Add `refetchOnMount: 'always'` to cart query; broaden invalidation |
| DB migration | Backfill `products.action_type` from `category_config.transaction_type` for all NULL rows |

