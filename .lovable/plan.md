

# Documentation Update: Accurate Admin Catalog Configuration Steps

## Problem
The documentation says "Navigate to Admin Panel → Catalog → Select a category → Toggle feature flags" but the actual UI flow is different. The feature flags are inside the **Edit Category dialog** and only appear when the category's **Listing Type** is set to a service type (`book_slot`, `request_service`, or `schedule_visit`). The docs need to match the real UI.

## Current UI Flow (from code analysis)
1. Admin → Catalog tab → Categories sub-tab
2. Click the **Edit** (pencil) icon on a specific category row
3. In the Edit Category dialog:
   - Change **Listing Type** to a service type (Book Slot, Request Service, or Schedule Visit)
   - Only then do the **Service Features** toggles appear (Add-ons, Recurring Bookings, Staff Assignment)
   - Other always-visible toggles: Show Veg/Non-Veg, Show Duration Field
4. Save changes

## Changes
Update `DocumentationPage.tsx` — rewrite the Admin Configuration section to match the actual UI:

- Step-by-step: Go to Catalog → Categories → click Edit on a category → set Listing Type → toggle service flags
- Clarify that service feature flags are conditional on the listing type selection
- Add note about Seller Form Hints (name/description placeholders, price/duration labels) also being configurable in the same dialog
- Fix the "Navigate to Admin Panel → Catalog" instruction to be more specific about clicking Edit on a category

