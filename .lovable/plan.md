

# Plan: Address Critical Gaps in Order Delivery System

## Gap Analysis Summary

After reviewing the full codebase, here are the confirmed gaps:

1. **GAP 1 (Status Sync):** CONFIRMED. No trigger or function syncs `delivery_assignments.status` changes back to `orders.status`. The two tables can drift. The `update-delivery-location` edge function updates `delivery_assignments` fields but never touches `orders.status`.

2. **GAP 2 (Delivery Partner App):** The edge function `update-delivery-location` exists and accepts GPS data, but NO client code anywhere calls it. The existing rider dashboard needs a background location sender.

3. **GAP 3 (Background Location):** `native-location.ts` only does one-shot `getCurrentPosition()`. No `watchPosition` or background tracking loop exists.

4. **GAP 4 (ETA Accuracy):** Edge function uses raw Haversine × speed. No state-based overrides for edge cases (speed=0, high inaccuracy, GPS stale).

5. **GAP 5 (Seller Abuse):** No timeout rules for seller delays or stalled riders. No auto-escalation.

---

## Implementation Steps

### Step 1: Delivery → Order Status Sync Trigger (Database Migration)

Create a trigger on `delivery_assignments` that auto-syncs status changes to `orders.status`:

```sql
CREATE OR REPLACE FUNCTION sync_delivery_to_order_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;

  -- Mapping: delivery_assignments.status → orders.status
  CASE NEW.status
    WHEN 'picked_up' THEN
      UPDATE orders SET status = 'picked_up' WHERE id = NEW.order_id AND status = 'ready';
    WHEN 'at_gate' THEN
      UPDATE orders SET status = 'on_the_way' WHERE id = NEW.order_id AND status = 'picked_up';
    WHEN 'delivered' THEN
      UPDATE orders SET status = 'delivered' WHERE id = NEW.order_id;
  END CASE;

  RETURN NEW;
END; $$;

CREATE TRIGGER trg_sync_delivery_to_order
  AFTER UPDATE ON delivery_assignments
  FOR EACH ROW EXECUTE FUNCTION sync_delivery_to_order_status();
```

This establishes: delivery phase source of truth = `delivery_assignments.status`, which auto-propagates to `orders.status` via trigger. Seller never touches delivery statuses (enforced by `validate_order_status_transition`).

**Note:** The `validate_order_status_transition` trigger runs as `SECURITY DEFINER` so the sync trigger's UPDATE on orders will pass through it. The category_status_flows already define `picked_up` and `on_the_way` as `actor = 'delivery'`, so the transition validation allows it since it only checks sort_order sequence, not actor. This is correct — actor filtering happens at the UI/API level, not the DB trigger level.

### Step 2: Background Location Tracking for Rider App

Create `src/hooks/useBackgroundLocationTracking.ts`:
- Uses `Capacitor.isNativePlatform()` check
- On native: uses `@capacitor/geolocation` `watchPosition` with `enableHighAccuracy: true`
- On web: uses `navigator.geolocation.watchPosition` as fallback
- Sends location to `update-delivery-location` edge function every 10 seconds (throttled)
- Handles permission denied gracefully with toast
- Returns `{ isTracking, startTracking, stopTracking, permissionDenied }`

Integrate into the rider delivery screen (wherever rider manages active delivery) — start tracking when assignment status is `picked_up`, stop on `delivered`/`failed`.

### Step 3: ETA State-Based Overrides in Edge Function

Update `supabase/functions/update-delivery-location/index.ts`:
- If `speed_kmh < 2` and `distance < 200m` → ETA = 1 (arriving)
- If `speed_kmh < 2` and `distance > 200m` → use default 15km/h speed, don't spike ETA
- If `accuracy_meters > 100` → skip ETA update, keep previous value
- Add proximity state labels in response: `proximity: 'at_doorstep' | 'arriving' | 'nearby' | 'en_route'`
- Add `stale` flag: if last update was >3 min ago, mark in `delivery_assignments`

### Step 4: Seller/Rider Timeout & Escalation Rules (Database + Edge Function)

**Database migration:**
- Add `ready_at timestamptz` column to `orders` (set via trigger when status becomes `ready`)
- Add `stalled_notified boolean DEFAULT false` to `delivery_assignments`

**Modify `update-delivery-location` edge function:**
- If no location update received for 3+ minutes during active delivery and `stalled_notified = false`: insert notification to buyer ("Delivery partner may be delayed"), set `stalled_notified = true`

**New pg_cron job or edge function (called periodically):**
- Check orders stuck at `ready` for >15 min with no delivery assignment → notify admin
- Check `delivery_assignments` in `assigned` status for >10 min with no `picked_up` → notify seller + admin

### Step 5: Google Maps Failure Handling

Update `LiveDeliveryTracker.tsx`:
- Wrap Google Maps in error boundary
- If Maps API fails to load or key is missing → show text-only fallback (distance + ETA + rider info, no map)
- Map is enhancement, not requirement — all tracking data already displays without it
- The current `LiveDeliveryTracker` already works as text-only (no map is rendered yet), so this is already handled

### Step 6: Status Vocabulary Normalization

No DB changes needed. The system correctly separates:
- **System statuses** (`delivery_assignments.status`): `picked_up`, `at_gate`, `delivered`
- **Order statuses** (`orders.status`): `picked_up`, `on_the_way`, `delivered`
- **UI labels**: Already mapped via `order_status_config` table and `DELIVERY_STATUS_CONFIG` in `DeliveryStatusCard.tsx`

Document the mapping in code comments. `at_gate` (delivery) → `on_the_way` (order) → UI shows "At Your Gate" via delivery card.

---

## Files to Create/Modify

| Action | File |
|--------|------|
| Create | Migration: `sync_delivery_to_order_status` trigger + `ready_at` / `stalled_notified` columns |
| Create | `src/hooks/useBackgroundLocationTracking.ts` |
| Modify | `supabase/functions/update-delivery-location/index.ts` — ETA overrides, stale detection |
| Modify | `src/components/delivery/LiveDeliveryTracker.tsx` — Maps error boundary |
| Modify | Rider delivery screen — integrate background tracking hook |

## Answers to Your Specific Questions

1. **Source of truth:** `orders.status` pre-delivery and post-delivery. `delivery_assignments.status` during delivery, auto-synced to `orders.status` via DB trigger.

2. **Which app sends GPS:** The rider/delivery partner uses the same app (it's a web app with Capacitor). The rider dashboard will call the `update-delivery-location` edge function using `watchPosition`.

3. **Background location:** Capacitor `@capacitor/geolocation` `watchPosition` on native. On web, standard `watchPosition`. If permission denied → tracking degrades to manual status updates only.

4. **Abuse prevention:** Timeout rules at DB level. Orders stuck at `ready` >15 min → admin alert. Riders idle >10 min → admin alert. Stalled delivery (no GPS for 3 min) → buyer notification.

5. **Maps API failure:** `LiveDeliveryTracker` already renders text-only (ETA, distance, rider info). Map embed is additive. Error boundary ensures graceful fallback.

