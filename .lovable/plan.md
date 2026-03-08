

# Category Configuration & Attribute Block Design

## Part 1: Transaction Type Corrections

All categories currently have `transaction_type: purchase` (except Yoga and Salon which have `request_service`). Most are wrong. Here is the industry-aligned mapping:

### Food & Beverages (layout: food)
| Category | Transaction Type | Rationale |
|----------|-----------------|-----------|
| Home Food | `cart_purchase` | Standard food ordering with cart |
| Bakery | `cart_purchase` | Multiple items, cart checkout |
| Snacks | `cart_purchase` | Quick add-to-cart items |
| Groceries | `cart_purchase` | Cart-based bulk buying |
| Beverages | `cart_purchase` | Cart-based ordering |

### Education & Learning (layout: service)
| Category | Transaction Type | Feature Flags |
|----------|-----------------|---------------|
| Tuition | `book_slot` | recurring ✓, staff ✓ |
| Daycare | `contact_only` | recurring ✓ |
| Coaching | `book_slot` | recurring ✓, staff ✓, addons ✓ |
| Yoga | `book_slot` | recurring ✓, staff ✓ |
| Dance | `book_slot` | recurring ✓, staff ✓ |
| Music | `book_slot` | recurring ✓, staff ✓ |
| Art & Craft | `book_slot` | recurring ✓ |
| Language | `book_slot` | recurring ✓, staff ✓ |
| Fitness | `book_slot` | recurring ✓, staff ✓, addons ✓ |

### Home Services (layout: service)
| Category | Transaction Type | Feature Flags |
|----------|-----------------|---------------|
| Electrician | `request_service` | staff ✓ |
| Plumber | `request_service` | staff ✓ |
| Carpenter | `request_quote` | — |
| AC Service | `book_slot` | staff ✓, addons ✓ |
| Pest Control | `book_slot` | addons ✓ |
| Appliance Repair | `request_service` | staff ✓ |

### Personal Care (layout: service)
| Category | Transaction Type | Feature Flags |
|----------|-----------------|---------------|
| Tailoring | `request_quote` | — |
| Laundry | `cart_purchase` | recurring ✓ (change layout to ecommerce) |
| Beauty | `book_slot` | staff ✓, addons ✓ |
| Mehendi | `book_slot` | addons ✓ |
| Salon | `book_slot` | staff ✓, addons ✓, recurring ✓ (already correct) |

### Domestic Help
| Category | Transaction Type | Feature Flags |
|----------|-----------------|---------------|
| Maid | `contact_only` | recurring ✓ |
| Cook | `contact_only` | recurring ✓ |
| Driver | `contact_only` | recurring ✓ |
| Nanny | `contact_only` | recurring ✓ |

### Events
| Category | Transaction Type |
|----------|-----------------|
| Catering | `request_quote` |
| Decoration | `request_quote` |
| Photography | `book_slot` (staff ✓, addons ✓) |
| DJ & Music | `book_slot` (addons ✓) |

### Professional
| Category | Transaction Type |
|----------|-----------------|
| Tax Consultant | `book_slot` |
| IT Support | `request_service` |
| Tutoring | `book_slot` (recurring ✓) |
| Resume Writing | `request_quote` |

### Pets
| Category | Transaction Type |
|----------|-----------------|
| Pet Food | `cart_purchase` (layout: ecommerce) |
| Pet Grooming | `book_slot` (staff ✓, addons ✓) |
| Pet Sitting | `book_slot` (recurring ✓) |
| Dog Walking | `book_slot` (recurring ✓) |

### Rentals (layout: ecommerce)
| Category | Transaction Type |
|----------|-----------------|
| Equipment Rental | `contact_only` |
| Vehicle Rental | `contact_only` |
| Party Supplies | `cart_purchase` |
| Baby Gear | `contact_only` |

### Shopping (layout: ecommerce)
| Category | Transaction Type |
|----------|-----------------|
| Furniture | `buy_now` |
| Electronics | `cart_purchase` |
| Books | `cart_purchase` |
| Toys | `cart_purchase` |
| Kitchen | `cart_purchase` |
| Clothing | `cart_purchase` |

### Real Estate
| Category | Transaction Type |
|----------|-----------------|
| Flat Rent | `schedule_visit` |
| Roommate | `contact_only` |
| Parking | `contact_only` |

---

## Part 2: Attribute Blocks

Each block is inserted into `attribute_block_library` with a JSON schema defining fields. The `category_hints` array links blocks to categories. Blocks are reusable across categories.

### Block Definitions (28 blocks)

**1. food_details** — Categories: home_food, bakery, snacks
```
Fields: cuisine_type (select), spice_level (select: Mild/Medium/Hot), portion_size (text), prep_time_minutes (number), dietary_tags (tag_input: Veg/Vegan/Gluten-Free/Nut-Free), ingredients (textarea)
Renderer: key_value
```

**2. grocery_details** — Categories: groceries, beverages
```
Fields: brand (text), weight_volume (text), shelf_life (text), storage_instructions (text), organic (checkbox)
Renderer: key_value
```

**3. class_session_info** — Categories: tuition, coaching, yoga, dance, music, art_craft, language, fitness
```
Fields: subject_topic (text), experience_level (select: Beginner/Intermediate/Advanced/All Levels), session_duration_min (number), mode (select: Online/Offline/Both), batch_size (number), fee_structure (select: Per Session/Monthly/Per Course), certifications (tag_input)
Renderer: key_value
```

**4. daycare_info** — Categories: daycare
```
Fields: age_group (text), operating_hours (text), meals_included (checkbox), capacity (number), activities (tag_input), safety_certifications (tag_input)
Renderer: key_value
```

**5. home_service_details** — Categories: electrician, plumber, carpenter, ac_service, pest_control, appliance_repair
```
Fields: service_area (text), experience_years (number), specializations (tag_input), tools_provided (checkbox), warranty_days (number), emergency_available (checkbox)
Renderer: key_value
```

**6. domestic_help_profile** — Categories: maid, cook, driver, nanny
```
Fields: experience_years (number), availability_type (select: Full-Time/Part-Time/Hourly), languages_spoken (tag_input), skills (tag_input), id_verified (checkbox), references_available (checkbox)
Renderer: key_value
```

**7. beauty_salon_details** — Categories: beauty, salon, mehendi
```
Fields: specializations (tag_input: Haircut/Facial/Makeup/Bridal/Nails), brands_used (tag_input), gender_preference (select: Male/Female/Unisex), home_visit_available (checkbox), hygiene_standards (tag_input)
Renderer: key_value
```

**8. laundry_details** — Categories: laundry
```
Fields: service_types (tag_input: Wash & Fold/Dry Clean/Iron Only/Wash & Iron), pickup_available (checkbox), turnaround_hours (number), min_order_pieces (number)
Renderer: key_value
```

**9. tailoring_details** — Categories: tailoring
```
Fields: garment_types (tag_input: Blouse/Kurta/Suit/Dress/Alterations), fabric_provided (checkbox), delivery_days (number), measurement_mode (select: Home Visit/At Shop/Self-Measure Guide)
Renderer: key_value
```

**10. catering_details** — Categories: catering
```
Fields: cuisine_types (tag_input), min_guests (number), max_guests (number), meal_types (tag_input: Breakfast/Lunch/Dinner/Snacks), dietary_options (tag_input: Veg/Non-Veg/Jain/Vegan), crockery_included (checkbox)
Renderer: key_value
```

**11. event_service_details** — Categories: decoration, photography, dj_music
```
Fields: event_types (tag_input: Wedding/Birthday/Corporate/Housewarming), coverage_hours (number), equipment_included (checkbox), travel_radius_km (number), portfolio_link (text)
Renderer: key_value
```

**12. pet_service_details** — Categories: pet_grooming, pet_sitting, dog_walking
```
Fields: pet_types (tag_input: Dog/Cat/Bird/Fish/Other), experience_years (number), home_visit (checkbox), certified (checkbox), emergency_care (checkbox)
Renderer: key_value
```

**13. pet_food_details** — Categories: pet_food
```
Fields: pet_type (select: Dog/Cat/Bird/Fish/Other), food_type (select: Dry/Wet/Treats/Supplements), brand (text), weight (text), age_group (select: Puppy-Kitten/Adult/Senior), organic (checkbox)
Renderer: key_value
```

**14. professional_service_details** — Categories: tax_consultant, it_support, tutoring, resume_writing
```
Fields: specialization (text), experience_years (number), mode (select: Online/Offline/Both), qualifications (tag_input), languages (tag_input), turnaround_time (text)
Renderer: key_value
```

**15. rental_item_details** — Categories: equipment_rental, vehicle_rental, party_supplies, baby_gear
```
Fields: condition (select: New/Like New/Good/Fair), brand (text), rental_period (select: Hourly/Daily/Weekly/Monthly), deposit_required (checkbox), delivery_available (checkbox), age_suitability (text)
Renderer: key_value
```

**16. electronics_specs** — Categories: electronics
```
Fields: brand (text), model (text), condition (select: New/Refurbished/Used), warranty_months (number), key_features (tag_input), accessories_included (tag_input)
Renderer: key_value
```

**17. furniture_details** — Categories: furniture
```
Fields: material (select: Wood/Metal/Plastic/Glass/Fabric), dimensions (text), color (text), condition (select: New/Like New/Good/Fair), assembly_required (checkbox), weight_kg (number)
Renderer: key_value
```

**18. clothing_details** — Categories: clothing
```
Fields: size (tag_input: XS/S/M/L/XL/XXL), material (text), color (tag_input), gender (select: Men/Women/Unisex/Kids), care_instructions (text), brand (text)
Renderer: tags (for sizes/colors)
```

**19. books_details** — Categories: books
```
Fields: author (text), genre (tag_input), condition (select: New/Like New/Good), language (text), isbn (text), pages (number)
Renderer: key_value
```

**20. toys_details** — Categories: toys
```
Fields: age_group (text), material (text), brand (text), battery_required (checkbox), safety_certified (checkbox)
Renderer: key_value
```

**21. kitchen_details** — Categories: kitchen
```
Fields: material (text), brand (text), capacity (text), dishwasher_safe (checkbox), type (select: Cookware/Appliance/Storage/Utensil)
Renderer: key_value
```

**22. real_estate_flat** — Categories: flat_rent
```
Fields: bedrooms (select: 1BHK/2BHK/3BHK/4BHK/Studio), furnishing (select: Furnished/Semi-Furnished/Unfurnished), floor (number), total_floors (number), parking (checkbox), area_sqft (number), available_from (text), deposit_months (number)
Renderer: key_value
```

**23. parking_details** — Categories: parking
```
Fields: vehicle_type (select: Car/Two-Wheeler/Both), covered (checkbox), floor_level (text), available_from (text)
Renderer: key_value
```

**24. roommate_details** — Categories: roommate
```
Fields: gender_preference (select: Male/Female/Any), occupancy (select: Single/Sharing), furnishing (select: Furnished/Semi-Furnished/Unfurnished), move_in_date (text), food_preference (select: Veg/Non-Veg/Any)
Renderer: key_value
```

---

## Implementation Steps

### Step 1: Update `transaction_type` and feature flags
Run UPDATE statements on `category_config` for all ~50 categories to set the correct `transaction_type`, `supports_addons`, `supports_recurring`, and `supports_staff_assignment` values.

### Step 2: Insert attribute blocks into `attribute_block_library`
Insert all 24 block definitions with their JSON schemas and `category_hints` arrays.

### Step 3: Create default `seller_form_configs`
For each category, create a default form config that references the relevant attribute blocks, so sellers immediately see the right fields when creating listings.

### Step 4: No code changes needed
The existing `ProductAttributeBlocks` component and `useAttributeBlocks` hook already render blocks dynamically based on the library. The seller product form already reads from `attribute_block_library` filtered by `category_hints`.

