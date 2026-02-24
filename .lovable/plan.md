

# Attribute Blocks: Onboarding, Admin Visibility, Dialog Width, and Bug Fixes

## Overview

This plan addresses four areas:
1. Add the AttributeBlockBuilder to the onboarding product form (BecomeSellerPage / DraftProductManager)
2. Show attribute blocks in the admin product approval screen
3. Widen the Add Product dialog on SellerProductsPage
4. Fix the `discount_percentage` insertion error (it's a GENERATED ALWAYS column)
5. Seed ~60 new category-specific attribute blocks for all the categories listed

---

## 1. Fix: `discount_percentage` GENERATED ALWAYS Column Error

**Root Cause:** The `discount_percentage` column is defined as `GENERATED ALWAYS AS (...)` in the database. Attempting to insert or update a value for this column causes a PostgreSQL error. The code in both `SellerProductsPage.tsx` (line 296) and `DraftProductManager.tsx` (line 106-107) tries to set `discount_percentage` on insert/update.

**Fix:**
- `SellerProductsPage.tsx` line 296: Remove `discount_percentage` from the `productData` object sent to Supabase
- `DraftProductManager.tsx` line 100-113: The insert payload does not include `discount_percentage` (already correct), but confirm no other path sends it
- Remove `discount_percentage` from `formData` state in SellerProductsPage since it's auto-computed by the DB

---

## 2. Integrate AttributeBlockBuilder into Onboarding (DraftProductManager)

**File:** `src/components/seller/DraftProductManager.tsx`

Changes:
- Import `AttributeBlockBuilder` and `BlockData` from the hooks
- Add `attributeBlocks` state to the "Add Product" form
- Render `AttributeBlockBuilder` inside the add-product card, below the image upload / veg toggle area
- On save, include `specifications: { blocks: attributeBlocks }` in the product insert payload
- Reset `attributeBlocks` after successful save

---

## 3. Widen the Add Product Dialog

**File:** `src/pages/SellerProductsPage.tsx` (line 417)

Change the DialogContent className from:
```
max-h-[90vh] overflow-y-auto
```
to:
```
max-h-[90vh] overflow-y-auto sm:max-w-2xl
```

This makes the dialog 672px wide on desktop (up from the default ~450px), giving more room for attribute blocks while remaining responsive on mobile.

---

## 4. Admin Visibility: Show Attribute Blocks in Product Approval

**File:** `src/components/admin/AdminProductApprovals.tsx`

Changes:
- Update the Supabase query to also fetch `specifications` from products
- Import `ProductAttributeBlocks` component
- Below each product's description, render `ProductAttributeBlocks` if specifications exist
- This gives admins full visibility into seller-added attributes during approval

---

## 5. Seed Category-Specific Attribute Blocks

**New migration** to insert approximately 60 additional blocks into `attribute_block_library`, covering:

| Category Group | Categories | Blocks Added |
|---|---|---|
| Food | home_food, bakery, snacks, groceries | cuisine_type, portion_size, item_type_bakery, ingredients_allergens, freshness, snack_type, shelf_life, grocery_category, brand, expiry_date |
| Beverages | beverages | beverage_type, temperature_served, volume |
| Classes | tuition, yoga, dance, music, art_craft, language, fitness, coaching | subject, grade_level, mode_of_delivery, session_duration, schedule, yoga_type, skill_level, batch_timing, dance_style, instrument_type, craft_type, materials_included, language_taught, proficiency_level, fitness_type, coaching_subject, target_exam |
| Home Services | electrician, plumber, carpenter, ac_service, pest_control, appliance_repair, maid_service, cook, driver | service_type, visit_fee, estimated_duration, service_area, certification_experience, material_handled, ac_type, brand_supported, pest_type, area_coverage, chemicals_used, warranty_period, appliance_type, issue_type, work_type_maid, frequency, working_hours, cuisine_type_cook, meal_type, vehicle_type, license_type, shift_duration |
| Personal Care | tailoring, laundry, beauty, mehendi, salon | garment_type, stitching_type, fabric_provided, measurement_method, laundry_type, price_per_unit, turnaround_time, pickup_drop, design_type_mehendi, coverage_area, occasion, gender_served |
| Professional | tax_consultant, it_support, tutoring, resume_writing | qualification, years_experience, consultation_mode, device_supported, response_time, resume_type, revisions_included, delivery_format |
| Rentals | equipment_rental, vehicle_rental, party_supplies, baby_gear | equipment_type, rental_duration, security_deposit, pickup_location, fuel_policy, damage_policy, age_suitability, hygiene_assurance |
| Buy and Sell | furniture, electronics, books, toys, kitchen, clothing | furniture_type, dimensions, material_condition, device_type, key_specifications, warranty_status, book_title, author, edition, toy_type, age_range, safety_standard, item_type_kitchen, capacity_size, usage_type, clothing_category, size, color, fabric, fit |
| Events | catering, decoration, photography, dj_music | guest_capacity, cuisine_type_catering, event_type, theme, materials_included_event, setup_time, deliverables, equipment_used, turnaround_time_photo, music_genre |
| Pet Services | pet_food, pet_grooming, pet_sitting, dog_walking | pet_type, food_type_pet, grooming_type, stay_type, feeding_included, dog_size, walk_duration, area_covered |
| Property | flat_for_rent, roommate, parking | bhk_configuration, furnishing_status, rent_amount, room_type, rent_share, occupancy_type, gender_preference, parking_type, vehicle_supported, monthly_charge |
| Donation | puja | puja_type, puja_occasion, puja_inclusions |

Each block will use `category_hints` for soft guidance and appropriate `renderer_type` and `schema`.

---

## Files to Change

| File | Action | What Changes |
|---|---|---|
| New migration SQL | Create | Seed ~60 new attribute blocks |
| `src/pages/SellerProductsPage.tsx` | Edit | Widen dialog; remove `discount_percentage` from insert/update payload |
| `src/components/seller/DraftProductManager.tsx` | Edit | Add AttributeBlockBuilder; include specifications in product insert |
| `src/components/admin/AdminProductApprovals.tsx` | Edit | Fetch specifications; render ProductAttributeBlocks |

