

# Audit: Database Constraint Violations & Default Value Mismatches

## Findings Summary

### ISSUE 1 — ALREADY FIXED: `products.action_type` default was `'buy'`
- **Status**: Fixed in last migration. DB default is now `'add_to_cart'`. Code in `DraftProductManager` now explicitly sets it via `deriveActionType`. No bad rows exist (verified via query: 0 rows with invalid `action_type`).
- **Remaining gap**: The migration only changed the default but did NOT include the data repair `UPDATE`. Query confirmed 0 bad rows exist currently, so no repair needed — but this was luck, not design.

### ISSUE 2 — NEW BUG (P1): `products.approval_status` default is `'pending'`, should be `'draft'` for onboarding

**Root cause**: Migration `20260306134440` recreated the products table with `approval_status DEFAULT 'pending'`. The original migration (`20260215071215`) had `DEFAULT 'draft'`.

**Impact**:
- `DraftProductManager.tsx` does NOT explicitly set `approval_status` during insert (line 117-130)
- Products created during seller onboarding get `'pending'` instead of `'draft'`
- These products appear in admin review queue **before the seller has finished onboarding**
- The "Submit All for Approval" button on `SellerProductsPage` looks for `approval_status = 'draft'` — it won't find these products, so sellers see no drafts to submit
- `useSellerApplication.ts` line 309 does `UPDATE ... SET approval_status = 'pending' WHERE approval_status = 'draft'` — this is a no-op because products are already `'pending'`

**Who is impacted**: Sellers during onboarding, Admins reviewing applications

### ISSUE 3 — LOW RISK: `validate_product_action_type` trigger AND `products_action_type_valid` CHECK constraint are redundant

Both enforce the same allowed values. The trigger additionally validates `contact_phone` and `price` based on action type. The CHECK constraint allows `NULL` but the column is `NOT NULL`. Not a bug, just redundancy.

### NO OTHER CONSTRAINT/DEFAULT MISMATCHES FOUND

All other CHECK constraints verified against their column defaults:
- `service_listings.service_type`: default `'scheduled'` ∈ `{scheduled, on_demand, group, recurring}` ✅
- `service_listings.location_type`: default `'at_seller'` ∈ `{home_visit, at_seller, online}` ✅
- `service_listings.price_model`: default `'fixed'` ∈ `{fixed, hourly, tiered}` ✅
- `featured_items.type`: no default, CHECK `{seller, category, banner}` ✅
- `reviews.rating`: no default, CHECK `>= 1 AND <= 5` ✅
- `society_admins.role`: default `'admin'` ∈ `{admin, moderator}` ✅
- `builder_members.role`: default `'member'` ∈ `{member, admin}` ✅
- `project_towers.delay_category`: nullable, CHECK `{weather, material_shortage, ...}` ✅

---

## Fix Plan

### Fix 1: Database — Change `approval_status` default back to `'draft'`

```sql
ALTER TABLE public.products ALTER COLUMN approval_status SET DEFAULT 'draft';
```

This is safe because:
- `'draft'` is in the CHECK constraint `{draft, pending, approved, rejected}`
- All existing insert paths that need `'pending'` already set it explicitly (`useSellerProducts` sets it at line 233)
- `useBulkUpload` already sets `approval_status: 'draft'` explicitly (line 131)
- Only `DraftProductManager` relies on the default — and it needs `'draft'`

### Fix 2: Code — Explicitly set `approval_status: 'draft'` in `DraftProductManager.tsx`

Belt-and-suspenders: even after fixing the default, explicitly set the field so this can never regress.

```typescript
// In DraftProductManager.tsx insert call (~line 117)
approval_status: 'draft',
```

### Fix 3: Remove redundant CHECK constraint `products_action_type_valid`

The trigger `trg_validate_product_action_type` already enforces the same constraint plus additional business rules. The CHECK constraint is redundant and was the source of the original bug (it was added without considering the trigger already existed). However, removing it has a tiny risk of breaking if someone drops the trigger later.

**Recommendation**: Keep the CHECK constraint as defense-in-depth, but update it to also accept `NULL` (which it already does). No change needed.

---

## Risk Assessment

| Fix | Risk of Breaking | Confidence |
|-----|-----------------|------------|
| Change `approval_status` default to `'draft'` | **Zero** — all code paths that need `pending` set it explicitly | 99% |
| Add `approval_status: 'draft'` to DraftProductManager | **Zero** — makes explicit what was relying on (wrong) default | 100% |

**⚠️ What could break if we DON'T fix**: Sellers onboarding now will have products appear in admin queue prematurely. Admin might approve a half-finished application. The "Submit All for Approval" button won't work for onboarding products.

