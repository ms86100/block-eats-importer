# Category Management System — Complete Reference Guide

> **Last Updated:** 2026-03-08  
> **Audience:** Admins, Developers, Product Managers  
> **Scope:** End-to-end documentation of the Admin → Category Management system

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Three-Level Taxonomy](#2-three-level-taxonomy)
3. [Module 1: Sections (Parent Groups)](#3-module-1-sections-parent-groups)
4. [Module 2: Categories](#4-module-2-categories)
5. [Module 3: Subcategories](#5-module-3-subcategories)
6. [Module 4: Attribute Blocks](#6-module-4-attribute-blocks)
7. [Transaction Types & Listing Behavior](#7-transaction-types--listing-behavior)
8. [Behavior Flag Derivation](#8-behavior-flag-derivation)
9. [Service Feature Flags](#9-service-feature-flags)
10. [Seller Form Hints](#10-seller-form-hints)
11. [Display Configuration](#11-display-configuration)
12. [How Configurations Flow Through the Platform](#12-how-configurations-flow-through-the-platform)
13. [Impact on Seller Experience](#13-impact-on-seller-experience)
14. [Impact on Buyer Experience](#14-impact-on-buyer-experience)
15. [Database Tables Reference](#15-database-tables-reference)
16. [Key Frontend Hooks & Components](#16-key-frontend-hooks--components)
17. [Safety Mechanisms](#17-safety-mechanisms)

---

## 1. System Overview

The Category Management system is the **central configuration hub** that controls how products and services are listed, displayed, and transacted on the platform. Every listing's UI/UX — from the seller's product creation form to the buyer's action button — is driven by the category configuration.

### Admin Interface Location

The system is accessed via **Admin Panel → Catalog Manager** (`AdminCatalogManager` component), which provides three tabs:

| Tab | Purpose |
|-----|---------|
| **Overview** | Read-only view of all categories with their linked attribute blocks |
| **Categories** | Full CRUD for Sections, Categories, and Subcategories |
| **Attributes** | Manage the Attribute Block Library |

A **Taxonomy Overview** collapsible tree shows the full Section → Category → Subcategory hierarchy at a glance, with counts (e.g., "12 sections · 54 categories · 23 subcategories").

A **universal search bar** filters across all tabs — matching sections, categories, subcategories, and attribute blocks by name, slug, or description.

---

## 2. Three-Level Taxonomy

```
Section (Parent Group)
  └── Category
        └── Subcategory
```

| Level | DB Table | Example | Purpose |
|-------|----------|---------|---------|
| **Section** | `parent_groups` | "Food & Beverages" | Visual grouping for buyers on the home page |
| **Category** | `category_config` | "Home Food" (`home_food`) | Core configuration unit — defines listing behavior, form hints, transaction type |
| **Subcategory** | `subcategories` | "North Indian", "South Indian" | Buyer-facing filter within a category |

### Hierarchy Rules
- A Section can contain **zero or more** Categories
- A Category belongs to **exactly one** Section (via `parent_group` foreign key)
- A Category can have **zero or more** Subcategories
- Disabling a Section **cascades** to disable all its Categories
- Deleting a Section with active sellers **soft-disables** instead of hard-deleting

---

## 3. Module 1: Sections (Parent Groups)

### DB Table: `parent_groups`

| Field | Type | Purpose |
|-------|------|---------|
| `id` | UUID | Primary key |
| `slug` | TEXT (unique) | URL-safe identifier, auto-generated from name (e.g., `food_beverages`) |
| `name` | TEXT | Display name shown to buyers and in admin |
| `icon` | TEXT | Emoji icon (e.g., 🍲) |
| `color` | TEXT | Tailwind CSS class pair (e.g., `bg-orange-100 text-orange-600`) |
| `description` | TEXT | Short description |
| `is_active` | BOOLEAN | Whether visible to buyers |
| `sort_order` | INT | Display ordering (drag-and-drop reorderable) |
| `layout_type` | TEXT | One of `ecommerce`, `food`, `service` |
| `requires_license` | BOOLEAN | Whether sellers in this section need a license |
| `license_mandatory` | BOOLEAN | Whether license is mandatory vs optional |
| `license_type_name` | TEXT | Label for the license field (e.g., "FSSAI License") |
| `license_description` | TEXT | Help text for the license field |
| `placeholder_hint` | TEXT | Placeholder hint text |

### Admin Actions
- **Add Section**: Name*, Icon*, Color, Description → auto-generates slug
- **Edit Section**: Update name, icon, color, description
- **Delete Section**: Hard-deletes if no sellers use it; soft-disables otherwise
- **Toggle Active/Inactive**: Disabling cascades to all child categories
- **Drag-and-Drop Reorder**: Updates `sort_order` for all sections

### Where Sections Appear
- **Buyer Home Page**: `ParentGroupTabs` component shows section tabs for filtering
- **Category Group Grid**: Groups categories by section on marketplace browse pages
- **Seller Registration**: Sections organize category selection during onboarding
- **Welcome Carousel**: Displays top 6 active sections as feature highlights

---

## 4. Module 2: Categories

### DB Table: `category_config`

This is the **most important table** in the system. Each row defines the complete behavior for a product/service category.

#### Identity Fields

| Field | Type | Purpose |
|-------|------|---------|
| `id` | UUID | Primary key |
| `category` | ENUM (`service_category`) | Unique machine-readable key (e.g., `home_food`, `yoga`) |
| `display_name` | TEXT | Human-readable name shown everywhere |
| `icon` | TEXT | Emoji icon |
| `color` | TEXT | Tailwind CSS class pair |
| `parent_group` | TEXT (FK → `parent_groups.slug`) | Which section this category belongs to |
| `display_order` | INT | Sort position within the section |
| `is_active` | BOOLEAN | Whether category is live |
| `image_url` | TEXT | AI-generated or uploaded category image |

#### Transaction Type (Listing Behavior)

| Field | Type | Purpose |
|-------|------|---------|
| `transaction_type` | TEXT | **Master field** that drives the entire listing behavior. One of 7 values (see [Section 7](#7-transaction-types--listing-behavior)) |

#### Behavior Flags (Auto-Derived from Transaction Type)

| Field | Type | Purpose |
|-------|------|---------|
| `is_physical_product` | BOOLEAN | Product requires physical handling |
| `requires_preparation` | BOOLEAN | Item needs prep time (e.g., food) |
| `requires_time_slot` | BOOLEAN | Buyer must pick a time slot |
| `requires_delivery` | BOOLEAN | Delivery logistics needed |
| `supports_cart` | BOOLEAN | Item can be added to multi-item cart |
| `enquiry_only` | BOOLEAN | No direct purchase; enquiry-based interaction |
| `has_quantity` | BOOLEAN | Buyer can select quantity |
| `has_duration` | BOOLEAN | Service has a time duration |
| `has_date_range` | BOOLEAN | Rental-style date range selection |
| `is_negotiable` | BOOLEAN | Price is negotiable |
| `layout_type` | TEXT | UI layout: `ecommerce`, `food`, or `service` |

#### Seller Form Hints

| Field | Type | Purpose |
|-------|------|---------|
| `name_placeholder` | TEXT | Placeholder text for product name field |
| `description_placeholder` | TEXT | Placeholder for description field |
| `price_label` | TEXT | Label for the price field (default: "Price") |
| `duration_label` | TEXT | Label for duration field (if shown) |
| `price_prefix` | TEXT | Currency/unit prefix (e.g., "₹/hr") |
| `show_veg_toggle` | BOOLEAN | Show Veg/Non-Veg toggle in seller form |
| `show_duration_field` | BOOLEAN | Show duration input in seller form |
| `primary_button_label` | TEXT | Override for the buyer-facing action button |
| `placeholder_emoji` | TEXT | Emoji shown in empty states |

#### Service Feature Flags

| Field | Type | Purpose |
|-------|------|---------|
| `supports_addons` | BOOLEAN | Sellers can add optional extras |
| `supports_recurring` | BOOLEAN | Buyers can set up recurring bookings |
| `supports_staff_assignment` | BOOLEAN | Sellers can assign staff to bookings |

#### Display Configuration

| Field | Type | Purpose |
|-------|------|---------|
| `supports_brand_display` | BOOLEAN | Show brand info on product cards |
| `supports_warranty_display` | BOOLEAN | Show warranty info on product cards |
| `image_aspect_ratio` | TEXT | Image aspect ratio (e.g., `square`, `4:3`) |
| `image_object_fit` | TEXT | CSS object-fit value (e.g., `cover`, `contain`) |

#### Advanced Fields

| Field | Type | Purpose |
|-------|------|---------|
| `accepts_preorders` | BOOLEAN | Allow preorders |
| `preorder_cutoff_time` | TEXT | Cutoff time for preorders |
| `lead_time_hours` | INT | Lead time requirement |
| `requires_availability` | BOOLEAN | Seller must configure availability |
| `requires_price` | BOOLEAN | Price is mandatory |
| `default_sort` | TEXT | Default sort order for this category's listings |
| `review_dimensions` | TEXT[] | Custom review dimensions (e.g., `["taste", "packaging"]`) |

### Admin Actions
- **Add Category**: Display Name*, Icon*, Color, Listing Type, Section → auto-generates machine key from name
- **Edit Category**: All fields above are editable in a dialog with sections for Identity, Listing Type, Form Hints, and Service Features
- **Delete Category**: Hard-deletes if no sellers; soft-disables otherwise
- **Toggle Active/Inactive**: Immediately hides from buyers and sellers
- **Drag-and-Drop Reorder**: Within a section
- **Generate AI Image**: Auto-generates a category illustration via edge function `generate-category-image`

---

## 5. Module 3: Subcategories

### DB Table: `subcategories`

| Field | Type | Purpose |
|-------|------|---------|
| `id` | UUID | Primary key |
| `category_config_id` | UUID (FK) | Links to parent category |
| `slug` | TEXT | URL-safe identifier |
| `display_name` | TEXT | Shown to buyers as filter chips |
| `display_order` | INT | Sort position |
| `icon` | TEXT | Emoji icon |
| `is_active` | BOOLEAN | Visibility flag |
| `image_url` | TEXT | Optional image |
| `color` | TEXT | Color class |
| `name_placeholder` | TEXT | Override parent's name placeholder |
| `description_placeholder` | TEXT | Override parent's description placeholder |
| `price_label` | TEXT | Override parent's price label |
| `duration_label` | TEXT | Override parent's duration label |
| `show_veg_toggle` | BOOLEAN | Override parent's veg toggle setting |
| `show_duration_field` | BOOLEAN | Override parent's duration field setting |

### Key Behavior
- Subcategories **inherit** their parent category's transaction type and behavior flags
- Subcategories can **override** form hints (placeholders, labels, toggles) — if a subcategory field is `null`, the parent's value is used
- Subcategories primarily serve as **buyer-side filters** within a category page

### Admin Actions
- **Add Subcategory**: Can be triggered from the Category row (+ button) or from the Subcategory Manager section
- **Edit Subcategory**: Full form with all override fields
- **Delete Subcategory**: Hard delete (no soft-disable)
- **Filter by Parent Category**: Dropdown to view subcategories of a specific category
- **Generate AI Image**: Same edge function as categories

---

## 6. Module 4: Attribute Blocks

### DB Table: `attribute_block_library`

Attribute blocks define **structured data fields** that sellers fill in when creating a listing. They provide buyers with standardized, category-relevant information.

| Field | Type | Purpose |
|-------|------|---------|
| `id` | UUID | Primary key |
| `block_type` | TEXT (unique) | Machine key (e.g., `food_details`, `real_estate_flat`) |
| `display_name` | TEXT | Human name (e.g., "Food Details") |
| `description` | TEXT | Admin-facing description |
| `icon` | TEXT | Emoji icon |
| `category_hints` | TEXT[] | **Array of category keys** this block is available for |
| `schema` | JSONB | Field definitions (see below) |
| `renderer_type` | TEXT | How data is displayed to buyers |
| `display_order` | INT | Sort position |
| `is_active` | BOOLEAN | Visibility flag |

### Schema Definition

The `schema` field contains a JSON object with a `fields` array:

```json
{
  "fields": [
    {
      "key": "cuisine_type",
      "label": "Cuisine Type",
      "type": "select",
      "options": ["North Indian", "South Indian", "Chinese", "Continental"],
      "placeholder": "Select cuisine"
    },
    {
      "key": "spice_level",
      "label": "Spice Level",
      "type": "select",
      "options": ["Mild", "Medium", "Spicy", "Extra Spicy"]
    },
    {
      "key": "allergens",
      "label": "Allergens",
      "type": "tag_input"
    }
  ]
}
```

#### Supported Field Types

| Type | Description | Input Widget |
|------|-------------|-------------|
| `text` | Short text | Text input |
| `number` | Numeric | Number input |
| `select` | Dropdown | Select with predefined options |
| `tag_input` | Multiple tags | Tag input (freeform) |
| `boolean` | Yes/No | Toggle switch |
| `textarea` | Long text | Textarea |
| `date` | Date picker | Date input |

#### Renderer Types

| Renderer | Description | Used For |
|----------|-------------|----------|
| `key_value` | Two-column table (label → value) | Most attribute blocks |
| `tags` | Horizontal badge/chip layout | Cuisine types, allergens |
| `table` | Full table with headers | Size charts |
| `badge_list` | Outlined badge layout | Features, amenities |
| `text` | Plain paragraph text | Long descriptions |

### Category Linking

Attribute blocks are linked to categories via the `category_hints` array. When a seller selects a category for their product, only blocks whose `category_hints` contain that category key are shown in the `AttributeBlockBuilder`.

**Example:** The `food_details` block has `category_hints: ["home_food", "bakery", "snacks"]`, so it only appears when a seller creates a listing in those categories.

### Admin Actions
- **Create Block**: Display Name*, Icon, Description, Renderer Type, Category Assignment*, Schema Fields*
- **Edit Block**: All fields editable in a bottom sheet
- **Toggle Active/Inactive**: Hides from seller forms; existing product data is preserved
- **Deactivate (Delete)**: Soft-deactivates only; never hard-deleted
- **Filter by Category**: Dropdown to view blocks for a specific category
- **Schema Builder**: Visual field editor with drag-to-reorder, type selection, and option management for select fields

---

## 7. Transaction Types & Listing Behavior

The `transaction_type` field on `category_config` is the **single most important configuration**. It determines:

1. What **action button** buyers see
2. What **checkout flow** is triggered
3. What **behavior flags** are auto-set
4. What **order status flow** is used

### The 7 Transaction Types

| Transaction Type | Action Button | Cart Behavior | Buyer Flow |
|-----------------|---------------|---------------|------------|
| `cart_purchase` | **ADD** (Add to Cart) | Multi-item cart, combined checkout | Browse → Add to Cart → Checkout |
| `buy_now` | **BUY** (Buy Now) | Direct purchase, no cart aggregation | Browse → Buy Now → Payment |
| `book_slot` | **Book** (Book Now) | No cart; slot-based booking | Browse → Select Slot → Book |
| `request_service` | **Request** (Request Service) | No cart; enquiry-based | Browse → Request → Seller Responds |
| `request_quote` | **Quote** (Request Quote) | No cart; negotiable | Browse → Request Quote → Negotiate |
| `contact_only` | **Contact** (Contact Seller) | No cart; direct contact | Browse → Contact → Offline arrangement |
| `schedule_visit` | **Visit** (Schedule Visit) | No cart; calendar-based | Browse → Pick Date → Visit |

### Action Type Mapping

The `transaction_type` maps to a `ProductActionType` via `TRANSACTION_TO_ACTION`:

```
cart_purchase  → add_to_cart
buy_now        → buy_now
book_slot      → book
request_service → request_service
request_quote  → request_quote
contact_only   → contact_seller
schedule_visit → schedule_visit
```

The `deriveActionType()` function provides a safety net:
1. If the product has a valid `action_type` → use it
2. Else if the category has a `transaction_type` → map it
3. Else → fallback to `add_to_cart`

### DB Triggers
- **INSERT trigger** (`trg_set_product_action_type_on_insert`): Auto-derives `action_type` from the category's `transaction_type` when a product is created
- **UPDATE propagation trigger** (`trg_propagate_category_transaction_type`): When an admin changes a category's `transaction_type`, all existing products in that category are updated

---

## 8. Behavior Flag Derivation

When an admin selects a `transaction_type`, the system auto-derives behavior flags via `deriveBehaviorFlags()`:

| Transaction Type | supports_cart | has_quantity | requires_time_slot | has_duration | has_date_range | enquiry_only | is_negotiable | layout_type |
|-----------------|---------------|--------------|-------------------|-------------|----------------|-------------|--------------|------------|
| `cart_purchase` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ecommerce |
| `buy_now` | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ecommerce |
| `book_slot` | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | service |
| `request_service` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | service |
| `request_quote` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | service |
| `contact_only` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | service |
| `schedule_visit` | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | service |

These flags are saved to the `category_config` row alongside the `transaction_type`, ensuring backward compatibility with code that reads individual flags.

---

## 9. Service Feature Flags

Three additional flags are configurable **only** when the transaction type is `book_slot`, `request_service`, or `schedule_visit`:

| Flag | Purpose | Effect on Seller | Effect on Buyer |
|------|---------|-----------------|-----------------|
| `supports_addons` | Optional extras | Seller sees "Add-ons" section in product form | Buyer sees add-on selection during booking |
| `supports_recurring` | Repeat bookings | Seller sees recurring pattern options | Buyer can set up weekly/monthly bookings |
| `supports_staff_assignment` | Team management | Seller sees staff manager; can assign staff to bookings | Buyer may see assigned staff name |

These flags are resolved by the `useCategoryFeatureFlags` hook and drive conditional UI rendering throughout the seller dashboard.

---

## 10. Seller Form Hints

Form hints customize the seller's product creation experience per category:

| Hint | Default | Example Override | Effect |
|------|---------|-----------------|--------|
| `name_placeholder` | "Product name" | "e.g., Paneer Butter Masala" | Placeholder text in name field |
| `description_placeholder` | "Description" | "Describe the dish, ingredients, serving size..." | Placeholder in description field |
| `price_label` | "Price" | "Price per plate" | Label on the price input |
| `duration_label` | null | "Session Duration" | Label on duration input (if shown) |
| `show_veg_toggle` | false | true | Shows Veg/Non-Veg toggle for food categories |
| `show_duration_field` | false | true | Shows duration input for service categories |
| `price_prefix` | null | "₹/hr" | Prefix shown before price |

Subcategories can override any of these — a `null` value means "use parent category's value."

---

## 11. Display Configuration

Controls how product cards are rendered on buyer-facing pages:

| Field | Purpose | Example Values |
|-------|---------|---------------|
| `supports_brand_display` | Show brand badge on cards | `true` for Electronics, `false` for Home Food |
| `supports_warranty_display` | Show warranty info | `true` for Electronics |
| `image_aspect_ratio` | Card image aspect ratio | `square`, `4:3`, `16:9` |
| `image_object_fit` | CSS object-fit | `cover`, `contain` |

---

## 12. How Configurations Flow Through the Platform

### Data Loading & Caching

```
App Start
  └── AuthProvider prefetches ['category-configs'] query
        └── fetchCategoryConfigs() → Supabase → category_config table
              └── Maps DB rows → CategoryConfig[] (TypeScript type)
                    └── Cached via React Query (30 min stale time)
```

All category data is loaded once and cached. Multiple hooks share the same cache key `['category-configs']`:

- `useCategoryConfigs()` — returns all configs + grouped by section
- `useCategoryBehavior(category)` — returns behavior for a specific category
- `useCategoryConfig()` — thin wrapper in `src/hooks/queries/`
- `useCategoryFeatureFlags` — resolves feature flags from cached configs
- `useCategoryFlags(category)` — single category flag lookup
- `useSellerCategoryFlags(categories)` — merged flags across multiple categories

### Configuration Application Chain

```
Admin configures category_config
  ↓
category_config row saved with transaction_type + derived behavior flags
  ↓
DB trigger updates existing products' action_type
  ↓
Frontend cache invalidated (['category-configs'])
  ↓
Seller Form: useCategoryBehavior() → shows/hides fields, placeholders
  ↓
Seller Form: AttributeBlockBuilder → shows category-specific attribute blocks
  ↓
Product saved with action_type + specifications (attribute block data)
  ↓
Buyer View: deriveActionType() → resolves action button
  ↓
Buyer View: ACTION_CONFIG[actionType] → renders correct button label/icon
  ↓
Buyer Action: triggers appropriate flow (cart, booking, enquiry, etc.)
```

---

## 13. Impact on Seller Experience

### Product Creation Form
1. **Category Selection**: Seller picks from categories allowed in their seller profile
2. **Form Fields**: `show_veg_toggle` and `show_duration_field` control which optional fields appear
3. **Placeholders**: `name_placeholder`, `description_placeholder`, `price_label`, `duration_label` customize hints
4. **Attribute Blocks**: `AttributeBlockBuilder` shows only blocks whose `category_hints` match the selected category
5. **Service Fields**: If `layout_type === 'service'`, additional fields appear (session duration, buffer time, location type, etc.)

### Seller Dashboard
- **Service Availability**: Only shown if `hasServiceLayout === true` (derived from `layout_type === 'service'`)
- **Slot Calendar**: Visible when `supports_staff_assignment` or `requires_time_slot` is true
- **Staff Manager**: Visible when `supports_staff_assignment` is true
- **Booking Stats**: Visible for service categories
- **Schedule Warning**: Dashboard shows a prominent banner if a service seller hasn't configured availability

### Seller Settings
- **Allowed Categories**: Seller's `categories[]` field determines which category configs apply
- **Feature Toggles**: `useSellerCategoryFlags(categories)` merges flags across all seller's categories — if ANY category supports a feature, the seller sees it

---

## 14. Impact on Buyer Experience

### Home Page
- **Section Tabs**: `ParentGroupTabs` shows active sections as horizontal tabs
- **Category Image Grid**: Shows categories with AI-generated images, organized by section
- **Product Cards**: Action button label/icon determined by `deriveActionType()`

### Category Page
- **Subcategory Filters**: Subcategories appear as filter chips at the top
- **Sort Options**: `default_sort` from category config sets initial sort
- **Product Grid/List**: Cards show appropriate action buttons per transaction type

### Product Detail
- **Action Button**: Primary CTA determined by `ACTION_CONFIG[actionType]`
- **Attribute Blocks**: `ProductAttributeBlocks` renders structured data using the renderer type from the library
- **Booking Flow**: If `book_slot`, shows `ServiceBookingFlow` with date/time picker
- **Cart**: If `cart_purchase` or `buy_now`, cart operations are enabled
- **Enquiry**: If `request_service`/`request_quote`/`contact_only`, shows enquiry UI

### Action Button Mapping (Buyer Sees)

| Transaction Type | Full Label | Short Label | Icon |
|-----------------|-----------|-------------|------|
| `cart_purchase` | "Add to Cart" | "ADD" | Plus |
| `buy_now` | "Buy Now" | "BUY" | ShoppingBag |
| `book_slot` | "Book Now" | "Book" | Calendar |
| `request_service` | "Request Service" | "Request" | Send |
| `request_quote` | "Request Quote" | "Quote" | MessageCircle |
| `contact_only` | "Contact Seller" | "Contact" | Phone |
| `schedule_visit` | "Schedule Visit" | "Visit" | Home |

---

## 15. Database Tables Reference

| Table | Purpose | Row Count (typical) |
|-------|---------|-------------------|
| `parent_groups` | Sections | ~12 |
| `category_config` | Categories with full behavior config | ~54 |
| `subcategories` | Buyer-facing filters within categories | ~20-100 |
| `attribute_block_library` | Reusable structured data templates | ~24 |
| `seller_form_configs` | Per-seller block customization (optional) | Variable |
| `category_status_flows` | Order status progression per category | ~100+ |

---

## 16. Key Frontend Hooks & Components

### Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useCategoryConfigs()` | `useCategoryBehavior.ts` | All configs + grouped by section |
| `useCategoryBehavior(cat)` | `useCategoryBehavior.ts` | Single category behavior + listing/order type |
| `useCategoryConfig()` | `queries/useCategoryConfig.ts` | Shared query wrapper |
| `useCategoryFlags(cat)` | `useCategoryFeatureFlags.ts` | Feature flags for one category |
| `useSellerCategoryFlags(cats)` | `useCategoryFeatureFlags.ts` | Merged flags for seller's categories |
| `useParentGroups()` | `useParentGroups.ts` | Section data + layout map |
| `useSubcategories(configId?)` | `useSubcategories.ts` | Subcategories, optionally filtered |
| `useBlockLibrary()` | `useAttributeBlocks.ts` | All active attribute blocks |
| `useSellerFormConfig(sellerId, cat)` | `useAttributeBlocks.ts` | Seller's custom block config |
| `useCategoryManagerData()` | `useCategoryManagerData.ts` | Admin CRUD operations state machine |

### Components

| Component | File | Purpose |
|-----------|------|---------|
| `AdminCatalogManager` | `admin/AdminCatalogManager.tsx` | Main admin entry point with tabs |
| `CategoryManager` | `admin/CategoryManager.tsx` | Section + Category CRUD with DnD |
| `SubcategoryManager` | `admin/SubcategoryManager.tsx` | Subcategory CRUD |
| `AdminAttributeBlockManager` | `admin/AdminAttributeBlockManager.tsx` | Block library CRUD with schema builder |
| `TransactionTypeConfirmSave` | `admin/TransactionTypeConfirmSave.tsx` | Confirmation dialog when changing transaction type |
| `AttributeBlockBuilder` | `seller/AttributeBlockBuilder.tsx` | Seller-facing block selection + data entry |
| `AttributeBlockForm` | `seller/AttributeBlockForm.tsx` | Dynamic form renderer for block schema |
| `ProductAttributeBlocks` | `product/ProductAttributeBlocks.tsx` | Buyer-facing block data renderer |

### Utilities

| Utility | File | Purpose |
|---------|------|---------|
| `deriveActionType()` | `marketplace-constants.ts` | Resolves product action type with fallback chain |
| `ACTION_CONFIG` | `marketplace-constants.ts` | Button labels, icons, cart eligibility per action type |
| `TRANSACTION_TO_ACTION` | `marketplace-constants.ts` | Maps transaction_type → action_type |
| `deriveBehaviorFlags()` | `useCategoryManagerData.ts` | Auto-derives behavior flags from transaction type |
| `getListingType()` | `types/categories.ts` | Derives listing type (product/service/rental/resale) from behavior |
| `getOrderType()` | `types/categories.ts` | Derives order type (purchase/booking/rental/enquiry) from behavior |

---

## 17. Safety Mechanisms

### Transaction Type Change Protection
When an admin changes a category's `transaction_type`:
1. `TransactionTypeConfirmSave` queries the count of affected products
2. Shows a confirmation dialog: "X existing products will be updated to show the new button type"
3. Only proceeds after explicit confirmation
4. DB trigger `trg_propagate_category_transaction_type` auto-updates all products

### Deletion Protection
- Categories with active sellers are **soft-disabled** (not deleted)
- Sections with active sellers are **soft-disabled** with cascade to child categories
- Attribute blocks are **soft-deactivated** (never hard-deleted); existing product data preserved

### Cart Validation
- `useCart` hook rejects items whose `action_type` is not `add_to_cart` or `buy_now`
- `validate_cart_item_store_availability()` DB trigger checks product availability and seller store status

### Data Integrity
- `products_action_type_valid` CHECK constraint prevents invalid action_type values
- `validate_category_layout_type()` trigger ensures layout_type is valid
- `category_config.category` uses an ENUM type, preventing arbitrary values

---

## Appendix: Current Category Inventory (54 Categories)

| Section | Categories | Transaction Type |
|---------|-----------|-----------------|
| Food & Beverages | home_food, bakery, snacks, groceries, beverages | cart_purchase |
| Education | tuition, daycare, coaching | book_slot |
| Fitness & Wellness | yoga, dance, music, art_craft, language, fitness | book_slot |
| Home Services | electrician, plumber, carpenter, ac_service, pest_control, appliance_repair | request_service / request_quote / book_slot |
| Personal Care | tailoring, laundry, beauty, mehendi, salon | book_slot / request_quote / cart_purchase |
| Domestic Help | maid, cook, driver, nanny | contact_only |
| Events | catering, decoration, photography, dj_music | request_quote / book_slot |
| Professional | tax_consultant, it_support, tutoring, resume_writing | book_slot / request_service / request_quote |
| Pets | pet_food, pet_grooming, pet_sitting, dog_walking | cart_purchase / book_slot |
| Rentals | equipment_rental, vehicle_rental, party_supplies, baby_gear | contact_only / cart_purchase |
| Shopping | furniture, electronics, books, toys, kitchen, clothing | cart_purchase / buy_now |
| Real Estate | flat_rent, roommate, parking | schedule_visit / contact_only |

---

*This document reflects the system as implemented on 2026-03-08. Configuration values may change as admins update category settings.*
