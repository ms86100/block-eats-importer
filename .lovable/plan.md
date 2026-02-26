

# Investigation Results and Fix Plan

## Finding Summary

I investigated all three issues end-to-end. Here is what I found:

---

## Issue 1: Emergency Broadcast Push Notifications Not Received

### Root Cause (confirmed via database query)

**The `device_tokens` table has 0 rows.** Zero. No device has ever registered a push token.

This means:
- The `send-push-notification` edge function runs, queries `device_tokens` for the target user, finds nothing, returns `{ sent: 0 }`.
- The in-app notification inbox DOES work (I confirmed broadcast entries in `user_notifications` — the "sss" broadcast you sent is there for 7 users).
- But actual push delivery to the phone cannot happen without a registered device token.

**Why tokens are not being saved:** The `usePushNotifications` hook only runs when `Capacitor.isNativePlatform()` returns `true`. If the app was built and installed as a native app with Firebase configured correctly, tokens should register on first launch after the user grants permission. If Firebase is misconfigured in the native project (missing `google-services.json` for Android or `GoogleService-Info.plist` for iOS), the registration silently fails.

**Secondary issue:** The `notification_queue` table has many items stuck in `pending` status (order notifications from DB triggers). The `process-notification-queue` edge function is not being invoked automatically — it needs a cron job to process the queue. Without this, order status notifications via the queue path also never send push or write to `user_notifications`.

### Proposed Fix

1. **No code change needed for the push registration flow** — the code is correct. The issue is native app configuration (Firebase project setup).
2. **Add a cron job** to process the notification queue automatically (every 1 minute), so order notifications are not stuck forever.
3. **Add a diagnostic admin panel** showing device token count and queue health, so you can verify when tokens start registering.

---

## Issue 2: Featured Banner Not Visible to Residents

### Root Cause

The RLS policy and query logic are both correct:
- RLS: `is_active = true AND (society_id IS NULL OR society_id = get_user_society_id(auth.uid()))`
- Query: filters by `effectiveSocietyId` match
- Realtime: subscription on `featured_items` invalidates cache on changes
- Data: 1 active banner exists with the correct `society_id`

**Most likely cause:** When you tested as a resident, the `effectiveSocietyId` may have been `undefined` briefly during auth loading, causing the query to run without the society filter and return nothing (or skip). The query at line 25-27 only adds the `.or()` filter when `effectiveSocietyId` is truthy. If it's undefined, the query runs without any society filter, but the RLS policy still enforces `society_id = get_user_society_id(auth.uid())`, so it should still return the banner.

**I need to verify one more thing:** whether the resident user's `society_id` in the `profiles` table actually matches the banner's `society_id`. If you tested with a different resident account that belongs to a different society, the banner would not appear.

### Proposed Fix

1. **Reduce staleTime** from 5 minutes to 1 minute for faster visibility of new banners.
2. **Add `refetchOnMount: true`** to ensure the banner query always refetches when the home page is visited.
3. The realtime subscription is already in place and should handle live updates.

---

## Issue 3: Featured Seller Toggle Not Reflected in Real-Time

### How Featured Sellers Work Today

- Admin toggles `is_featured` on a `seller_profiles` row.
- The `ShopByStore` component queries `seller_profiles` ordered by `is_featured DESC, rating DESC`.
- **All residents in the same society** see the same sellers list (filtered by `society_id`).
- Featured sellers appear first in the "Shop by store" horizontal scroll.
- The `SellerCard` component shows a gold "Featured" badge for `is_featured = true` sellers.

### Why It Doesn't Update in Real-Time

**There is no realtime subscription on `seller_profiles`.** The query uses a `staleTime` of ~60 seconds (with jitter). So changes to `is_featured` only appear after ~1 minute when the cache expires, or when the user navigates away and back.

### Who Sees Featured Sellers

All residents whose `society_id` matches the seller's `society_id`. Featured sellers from nearby societies also appear in the `ShopByStoreDiscovery` component (via the `search_nearby_sellers` function), but that function sorts by distance first, then `is_featured`.

### Proposed Fix

1. **Add a realtime subscription** on `seller_profiles` (specifically for the user's society) that invalidates the `shop-by-store` and store discovery queries when any seller profile changes.
2. **Add `seller_profiles` to the `supabase_realtime` publication** if not already there.
3. This will make featured seller toggles reflect instantly for all online users.

---

## Implementation Plan

### Step 1 — Database: Add cron for notification queue processing
- Create a `pg_cron` job or document that the `process-notification-queue` edge function needs to be called periodically (via external cron or Supabase scheduled function).

### Step 2 — Add realtime for seller profiles
- Add `seller_profiles` to `supabase_realtime` publication.
- Add a realtime subscription in `ShopByStore.tsx` and `ShopByStoreDiscovery.tsx` that invalidates the store queries on any change.

### Step 3 — Improve banner freshness
- Reduce `staleTime` on `FeaturedBanners` query from 5 minutes to 1 minute.
- Ensure `refetchOnMount` is set.

### Step 4 — Add notification queue processing trigger
- Since the `notification_queue` items are stuck at `pending`, add an automatic mechanism to process them. The cleanest approach is to invoke `process-notification-queue` from the `EmergencyBroadcastSheet` after sending, and also set up periodic processing.

### Step 5 — Add diagnostic info for admin
- Show device token count and pending notification queue count in the admin panel so you can monitor whether devices are registering.

---

## Technical Details

```text
Current state:
├── device_tokens:        0 rows (no devices registered)
├── notification_queue:   many rows, ALL status = 'pending' (never processed)
├── user_notifications:   working (broadcasts appear here)
├── featured_items:       1 active banner, correct society_id
├── seller_profiles:      NOT in supabase_realtime publication
└── process-notification-queue: exists but never called (no cron)

After fix:
├── device_tokens:        populated when native app is built with Firebase
├── notification_queue:   processed automatically via cron/trigger
├── featured_banners:     1-min staleTime + realtime subscription (already exists)
├── seller_profiles:      added to supabase_realtime + client subscription
└── Admin panel:          shows token count + queue health
```

