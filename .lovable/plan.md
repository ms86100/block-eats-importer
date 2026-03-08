# Fix: Service Booking "Slot Unavailable" Error + Custom Attributes Display

## Root Cause Analysis

### Issue #1: Booking Always Fails — No Slots Exist in Database

**The `service_slots` table has 0 rows.** The entire table is empty.

The booking flow works like this:

1. `TimeSlotPicker` receives `availableSlots` from `useServiceSlots` hook
2. When `availableSlots` is `undefined` (no DB slots), the picker **falls back to generating fake time slots** from hardcoded hours (09:00–21:00)
3. User selects one of these phantom slots and clicks "Confirm Booking"
4. `ServiceBookingFlow.handleConfirm()` queries `service_slots` table for the selected date+time → finds nothing → shows "Selected slot is no longer available"

**Why are there no slots?** The slot generation depends on `service_availability_schedules` rows — but that table is also empty for this seller. The seller created a `service_listing` for Guitar (duration: 60min, online) but never configured their availability schedule. The `generate-service-slots` edge function (daily cron) only creates slots for sellers who have schedules.

**Two fixes needed:**

1. **TimeSlotPicker must NOT show fallback slots when `availableSlots` is provided but empty** — it should show "No slots available. Seller hasn't set up their schedule yet."
2. **ServiceBookingFlow must pass an empty array `[]` instead of `undefined**` when there are no DB slots, so the picker doesn't fall back to fake slots.

### Issue #2: Custom Attributes Not Showing

The Guitar product has `specifications: null`. The seller didn't fill in any attribute blocks during product creation. This is data-level, not a code bug — `ProductAttributeBlocks` correctly returns null when no specs exist.

However, the product detail sheet should show a hint that attributes exist for this category even if the seller hasn't filled them, OR we should ensure the seller is prompted to fill them. For now, the main fix is ensuring the attribute blocks component works when data exists.

---

## Implementation Plan

### Fix 1: Stop TimeSlotPicker from showing phantom slots for service bookings

**File: `src/components/booking/ServiceBookingFlow.tsx**`

The `availableSlots` variable is derived from `slotsToPickerFormat(serviceSlots)`. When `serviceSlots` is empty, `slotsToPickerFormat` returns `[]`, but the current code only passes it when `serviceSlots.length > 0`:

```typescript
// Line 52-55 — Current (BROKEN):
const availableSlots = useMemo(
  () => (serviceSlots.length > 0 ? slotsToPickerFormat(serviceSlots) : undefined),
  [serviceSlots]
);
```

When length is 0, it passes `undefined` → TimeSlotPicker falls back to generic slots.

**Fix:** Always pass the array (even empty):

```typescript
const availableSlots = useMemo(
  () => slotsToPickerFormat(serviceSlots),
  [serviceSlots]
);
```

**File:** `src/components/order/ServiceBookingActions.tsx` — Same pattern on line ~49:

```typescript
// Fix: always pass array
const availableSlots = useMemo(
  () => slotsToPickerFormat(serviceSlots),
  [serviceSlots]
);
```

### Fix 2: Show helpful message when no slots exist

**File:** `src/components/booking/TimeSlotPicker.tsx`

Add a message when `availableSlots` is provided but has zero dates:

```typescript
// After the quick date selection, before time slots
{availableSlots && availableSlots.length === 0 && (
  <div className="text-center py-6 space-y-2">
    <CalendarDays size={32} className="mx-auto text-muted-foreground" />
    <p className="text-sm font-medium text-muted-foreground">No available slots</p>
    <p className="text-xs text-muted-foreground">The seller hasn't set up their availability schedule yet. Please contact them directly.</p>
  </div>
)}
```

Also: when `availableSlots` is provided, disable date selection for dates that have no slots:

In the quick dates section, mark dates without slots as disabled:

```typescript
const hasSlots = availableSlots?.some(s => s.date === format(date, 'yyyy-MM-dd'));
const isDisabled = isDateDisabled(date) || (availableSlots !== undefined && !hasSlots);
```

### Fix 3: Disable "Confirm Booking" button when no valid slots

**File: `src/components/booking/ServiceBookingFlow.tsx**`

The `isValid` check already requires `selectedTime`, which can't be set without valid slots, so this should be naturally handled by Fixes 1+2.

### Fix 4: Show empty state for custom attributes on product detail

**File: `src/components/product/ProductDetailSheet.tsx**`

No code change needed — `ProductAttributeBlocks` correctly shows nothing when `specifications` is null. The real issue is the seller hasn't configured attributes. This is working as designed.

---

## Summary of Changes


| File                                             | Change                                                       |
| ------------------------------------------------ | ------------------------------------------------------------ |
| `src/components/booking/ServiceBookingFlow.tsx`  | Always pass `slotsToPickerFormat()` result (not `undefined`) |
| `src/components/order/ServiceBookingActions.tsx` | Same fix                                                     |
| `src/components/booking/TimeSlotPicker.tsx`      | Show "no slots" message, disable dates without slots         |
