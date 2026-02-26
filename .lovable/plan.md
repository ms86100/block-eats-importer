

## Root Cause

The database trigger works correctly — products DO have `action_type: book` in the database. The bug is in the **frontend**: when building the `selectedProduct` object to pass to the `ProductDetailSheet`, several pages **omit** `action_type`. Without it, `useProductDetail` defaults to `add_to_cart`, which triggers the cart validation error in the database.

## Affected Locations (6 total)

| File | Context | `action_type` present? |
|---|---|---|
| `CategoryGroupPage.tsx` line 41-56 | `handleProductTap` | **MISSING** |
| `CategoryGroupPage.tsx` line 330-344 | `onSelectProduct` callback | **MISSING** |
| `SearchPage.tsx` line 41-62 | `handleProductTap` | Present |
| `SearchPage.tsx` line 153-165 | `onSelectProduct` callback | **MISSING** |
| `SellerDetailPage.tsx` line 498-519 | `handleProductTap` | Present |
| `SellerDetailPage.tsx` line 551-565 | `onSelectProduct` callback | **MISSING** |
| `MarketplaceSection.tsx` line 69-97 | `handleProductTap` | Present |
| `MarketplaceSection.tsx` line 163-177 | `onSelectProduct` callback | **MISSING** |

## Fix

Add `action_type` to all 5 missing locations:

1. **CategoryGroupPage.tsx `handleProductTap`** — add `action_type: product.action_type`, `contact_phone: product.contact_phone`, `prep_time_minutes`, `fulfillment_mode`, `delivery_note`
2. **CategoryGroupPage.tsx `onSelectProduct`** — add `action_type: sp.action_type`
3. **SearchPage.tsx `onSelectProduct`** — add `action_type: sp.action_type`
4. **SellerDetailPage.tsx `onSelectProduct`** — add `action_type: sp.action_type`
5. **MarketplaceSection.tsx `onSelectProduct`** — add `action_type: sp.action_type`

This ensures the `ProductDetailSheet` always knows the correct action type and routes to the right flow (book, enquiry, or cart) instead of defaulting to `add_to_cart`.

