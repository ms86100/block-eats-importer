

# Marketplace Product Form Intelligence and Bulk Upload

## Overview

Two major gaps need fixing:
1. The seller product form is static -- same food-centric labels and fields regardless of whether you're selling biryani or offering plumbing services
2. No bulk upload capability exists

The category architecture itself is already fully database-driven (11 parent groups, 55 subcategories, full admin CRUD). No changes needed there.

---

## Task 1: Add Form Hint Columns to category_config Table

**Database migration** -- Add columns to the existing `category_config` table:

```text
name_placeholder     TEXT  -- e.g., "Paneer Butter Masala" for food, "Switchboard Repair" for electrician
description_placeholder TEXT  -- e.g., "Describe the dish..." vs "Describe your service..."
price_label          TEXT  -- e.g., "Price" for food, "Starting Rate" for services, "Asking Price" for resale
duration_label       TEXT  -- e.g., "Prep Time" for food, "Service Duration" for services, NULL to hide
show_veg_toggle      BOOLEAN DEFAULT false  -- true only for food categories
show_duration_field  BOOLEAN DEFAULT false  -- true for food (prep time) and services (duration)
```

Then populate these columns with sensible defaults for all 55 existing categories using UPDATE statements:
- Food categories: name_placeholder="e.g., Paneer Butter Masala", show_veg_toggle=true, show_duration_field=true, duration_label="Prep Time (min)"
- Service categories: name_placeholder="e.g., Full House Wiring", price_label="Starting Rate", show_duration_field=true, duration_label="Est. Duration (min)"
- Classes: name_placeholder="e.g., Class 10 Maths - 1hr", duration_label="Session Duration (min)"
- Resale: name_placeholder="e.g., Samsung TV 55 inch", price_label="Asking Price"
- Rentals: price_label="Rental Rate", duration_label=NULL (uses date range instead)
- Professional: name_placeholder="e.g., ITR Filing for Salaried", price_label="Consultation Fee"
- And so on for all groups

**Files affected:** Database migration only. Types file auto-updates.

---

## Task 2: Update Product Form to Use Dynamic Hints

Modify `SellerProductsPage.tsx` product add/edit dialog:

1. Read the `category_config` row for the currently selected category (already available via `useCategoryConfigs`)
2. Extend the config mapping in `useCategoryBehavior.ts` to include the new hint fields
3. In the form dialog:
   - Product Name input: use `config.namePlaceholder` instead of hardcoded "Chicken Biryani"
   - Description textarea: use `config.descriptionPlaceholder`
   - Price label: use `config.priceLabel` (default "Price")
   - Duration field: show/hide based on `config.showDurationField`, label from `config.durationLabel`
   - Veg toggle: show/hide based on `config.showVegToggle` instead of JS parentGroup check

Also update `DraftProductManager.tsx` (onboarding) with the same dynamic behavior.

**Files modified:**
- `src/hooks/useCategoryBehavior.ts` -- extend CategoryConfig interface and mapping
- `src/pages/SellerProductsPage.tsx` -- dynamic form fields
- `src/components/seller/DraftProductManager.tsx` -- dynamic form fields

---

## Task 3: Admin Controls for Form Hints

Add form hint editing to the existing `CategoryManager.tsx` admin panel. When admin edits a subcategory, the edit dialog should include:
- Name placeholder input
- Description placeholder input
- Price label input
- Duration label input
- Show veg toggle checkbox
- Show duration field checkbox

This makes the form intelligence fully admin-configurable without code changes.

**Files modified:**
- `src/components/admin/CategoryManager.tsx` -- extend edit dialog with hint fields

---

## Task 4: Bulk Product Upload

Add a bulk upload feature to the seller products page.

**UI Flow:**
1. On `SellerProductsPage`, add a "Bulk Add" button next to the existing "Add Product" button
2. Opens a sheet/dialog with two options:
   - **CSV Upload**: Download template, upload filled CSV, preview parsed rows, validate, save
   - **Multi-Row Grid**: Inline table with editable rows -- name, price, category, description -- with add/remove row buttons

**CSV Template columns:**
- name (required)
- price (required)
- category (must match an allowed category slug)
- description (optional)
- is_veg (true/false, only for food)
- prep_time_minutes (optional)
- image_url (optional)

**Validation rules:**
- Name must not be empty
- Price must be a positive number
- Category must be in the seller's allowed categories
- Duplicate detection (same name + category)
- Per-row error display with row number

**Save logic:**
- Batch insert via single Supabase insert call (array of products)
- Show success count and error count
- Refresh product list after save

**Files created:**
- `src/components/seller/BulkProductUpload.tsx` -- main bulk upload component with CSV parser and multi-row grid

**Files modified:**
- `src/pages/SellerProductsPage.tsx` -- add "Bulk Add" button that opens the new component

---

## Technical Summary

| Task | Action | Files | DB Changes |
|------|--------|-------|------------|
| 1. Form hint columns | Migration | None | Add 6 columns to category_config + populate data |
| 2. Dynamic product form | Modify | useCategoryBehavior.ts, SellerProductsPage.tsx, DraftProductManager.tsx | None |
| 3. Admin hint controls | Modify | CategoryManager.tsx | None |
| 4. Bulk upload | Create + Modify | BulkProductUpload.tsx (new), SellerProductsPage.tsx | None |

### Implementation Order
Task 1 first (schema), then Task 2 (form uses new columns), then Tasks 3 and 4 in parallel (independent features).

