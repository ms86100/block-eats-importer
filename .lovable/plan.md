

# End-to-End Store Availability Testing Plan

## What We're Testing

The store availability system that controls whether buyers can order based on:
1. Store operating hours (availability_start / availability_end)
2. Operating days (Mon–Sun)
3. Store active status (is_available toggle)
4. Product stock (is_available per product)

And ensuring backward compatibility — changes in seller settings must not break the buyer experience.

## Test Strategy

### Part 1: Unit Tests for `store-availability.ts`

Create `src/lib/__tests__/store-availability.test.ts` covering all edge cases of `computeStoreStatus` and `formatStoreClosedMessage`:

| # | Test Case | Input | Expected |
|---|-----------|-------|----------|
| 1 | Store paused (holiday) | isAvailable=false | status=`paused` |
| 2 | No hours configured | start=null, end=null | status=`open` |
| 3 | Currently within hours | start=09:00, end=21:00, now=14:00 | status=`open` |
| 4 | Before opening today | start=09:00, end=21:00, now=04:00 | status=`closed`, minutesUntilOpen=300 |
| 5 | After closing today | start=09:00, end=21:00, now=22:00 | status=`closed`, nextOpenAt=tomorrow 09:00 |
| 6 | Closed today (wrong day) | operatingDays=['Mon','Tue'], today=Sun | status=`closed_today` |
| 7 | Operating days empty array | operatingDays=[] | status=`open` (no restriction) |
| 8 | `formatStoreClosedMessage` paused | | `"Store paused"` |
| 9 | `formatStoreClosedMessage` closed_today | | `"Closed today"` |
| 10 | `formatStoreClosedMessage` opens in <60 min | minutesUntilOpen=30 | `"Opens in 30 min"` |
| 11 | `formatStoreClosedMessage` opens in 1-2 hrs | minutesUntilOpen=90 | `"Opens in 1 hr"` |
| 12 | `formatStoreClosedMessage` opens at time | minutesUntilOpen=300 | `"Opens at 09:00 AM"` |

**Backward compatibility tests:**
| # | Test Case | Why it matters |
|---|-----------|---------------|
| 13 | Seller has no availability fields (null/undefined) | Old sellers who never set hours must still show as `open` |
| 14 | Time format `HH:MM:SS` vs `HH:MM` | DB returns `09:00:00`, form sends `09:00` — both must work |
| 15 | `is_available` defaults to true when undefined | Ensures existing sellers without explicit toggle aren't broken |
| 16 | Empty string for start/end treated as null | Guard against form clearing values |

### Part 2: Integration Test for ProductListingCard store-closed rendering

Create `src/components/product/__tests__/ProductListingCard-availability.test.tsx`:
- Render card with store closed → verify grayscale class applied, add-to-cart button hidden
- Render card with store open → verify normal rendering, add-to-cart visible
- Render card with store paused → verify overlay shows "Store paused"
- Render card with out-of-stock + store open → verify "Out of Stock" shown (not store closed)

### Part 3: Browser E2E Testing

After unit/integration tests pass, use browser automation to:

1. **Log in as a seller** in the preview
2. Navigate to seller settings
3. **Change store hours** to a time window that excludes current time (e.g., set open=23:00, close=23:30)
4. Save settings
5. **Switch to buyer view** — navigate to marketplace
6. Verify the seller's products appear grayed out with "Opens at..." message
7. Verify add-to-cart is disabled
8. **Change store hours back** to include current time
9. Refresh buyer view — verify products are fully active again
10. **Toggle is_available off** (pause store)
11. Verify buyer sees "Store paused" state
12. Document which store was tested and exact results

## Files to Create/Modify

1. **New**: `src/lib/__tests__/store-availability.test.ts` — 16+ unit tests
2. **New**: `src/components/product/__tests__/ProductListingCard-availability.test.tsx` — 4 integration tests
3. No production code changes needed — this is purely testing

## What Gets Reported Back

After running tests, I will report:
- Which store/seller ID was tested in E2E
- Exact test cases executed with pass/fail
- Any bugs discovered
- Screenshots of buyer view in closed vs open state

