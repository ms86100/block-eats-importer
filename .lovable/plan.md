

# Dynamic Category-Driven Seller UI Configuration

## Current State

The system already has **most of the infrastructure** in place but has two key gaps where hardcoded logic overrides the admin configuration:

### What's Already Working (Admin → DB)
- `category_config` table has columns: `supports_addons`, `supports_recurring`, `supports_staff_assignment`, `show_veg_toggle`, `show_duration_field`, `layout_type`, `transaction_type`
- Admin `CategoryManager` UI has toggles for all these flags per category
- These flags are saved to the database correctly

### What's Broken (DB → Seller UI)
1. **`SellerSettingsPage.tsx` line 25-28** — Hardcoded `SERVICE_PARENT_GROUPS` array decides whether to show `ServiceAvailabilityConfig` and `ServiceStaffManager`. It ignores the DB flags entirely.
2. **`SellerProductsPage.tsx` line 70-74** — Uses `isCurrentCategoryService` (based on `layoutType === 'service'`) to show `ServiceFieldsSection` and `ServiceAddonsManager`. This partially works but doesn't use the granular `supports_addons` / `supports_staff_assignment` flags.
3. **`SellerDashboardPage.tsx`** — Likely also uses the same hardcoded parent group list for showing booking calendar and slot manager.

The admin can already toggle these flags, but the seller-side UI doesn't read them.

## Implementation Plan

### Task 1: Create a `useCategoryFeatureFlags` hook

A thin hook that, given a category slug (or seller's categories), returns the resolved feature flags from `category_config`:

```ts
// Returns { supportsAddons, supportsRecurring, supportsStaffAssignment, 
//           showVegToggle, showDurationField, isServiceLayout }
```

This hook reuses the existing `useCategoryConfigs()` cache — no new queries needed.

### Task 2: Fix SellerSettingsPage — Remove hardcoded SERVICE_PARENT_GROUPS

**Current:** `isServiceGroup(primaryGroup)` checks against a hardcoded array.

**Fix:** 
- Query the seller's product categories via `category_config`
- Show `ServiceAvailabilityConfig` if **any** of the seller's categories has `layout_type = 'service'`
- Show `ServiceStaffManager` if **any** category has `supports_staff_assignment = true`
- Remove the `SERVICE_PARENT_GROUPS` constant entirely

### Task 3: Fix SellerProductsPage — Use granular flags

**Current:** Shows `ServiceFieldsSection` and `ServiceAddonsManager` based on `layoutType === 'service'` only.

**Fix:**
- Show `ServiceFieldsSection` when `layoutType === 'service'` (this is correct)
- Show `ServiceAddonsManager` only when the specific category has `supports_addons = true`
- Both already read from `category_config` via `useCategoryConfigs`, just need to check the right flag

### Task 4: Fix SellerDashboardPage — Dynamic service widgets

Check if any of the seller's active products belong to categories with `layout_type = 'service'` before showing:
- `ServiceBookingsCalendar`
- `SlotCalendarManager`
- `ServiceBookingStats`

### Task 5: Fix DraftProductManager — Use granular flags

Currently shows `ServiceFieldsSection` when `layoutType === 'service'`. This is correct but should also respect `supports_addons` when showing add-on hints.

---

## Summary

| # | Change | File |
|---|--------|------|
| 1 | Create `useCategoryFeatureFlags` hook | New hook file |
| 2 | Remove hardcoded `SERVICE_PARENT_GROUPS`, use DB flags | `SellerSettingsPage.tsx` |
| 3 | Use `supports_addons` flag for add-ons visibility | `SellerProductsPage.tsx` |
| 4 | Dynamic service widget visibility on dashboard | `SellerDashboardPage.tsx` |
| 5 | Respect granular flags in onboarding flow | `DraftProductManager.tsx` |

No DB migrations needed — the columns and admin UI already exist. This is purely a frontend wiring fix to make the seller UI respect what the admin has configured.

