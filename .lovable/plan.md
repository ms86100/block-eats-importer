

# Governance Reclassification + Mobile Real-Time Audit

## Part 1: Ownership Reclassification

The current implementation puts all ~55 settings under Admin control in `PlatformSettingsManager.tsx`. This is incorrect. Below is the corrected ownership matrix.

### Tier 1: System-Controlled (Code Constants, Not UI-Editable)

These define how the platform computes things. They should remain as hardcoded defaults in `useMarketplaceLabels.ts` and NOT appear in the Admin UI.

| Setting | Rationale |
|---|---|
| `stable_price_days` | Price stability computation rule |
| `price_history_max_points` | Chart rendering limit |
| `reputation_event_labels_json` | Ledger structure tied to trigger logic |
| `dispute_status_options_json` | Tied to DB enum constraints and workflow logic |

**Action**: Remove these 4 keys from `SETTING_FIELDS` in `PlatformSettingsManager.tsx`. Keep them in `useMarketplaceLabels.ts` DEFAULTS only.

### Tier 2: Admin-Controlled (Keep in Admin UI)

These affect marketplace policy, buyer trust messaging, and discovery behavior. Admin ownership is correct.

| Group | Settings |
|---|---|
| **Trust Labels** | `label_in_your_society`, `label_distance_m_format`, `label_distance_km_format`, `label_your_neighbor`, `label_active_now`, `label_active_hours_ago`, `label_active_yesterday`, `label_on_time_format`, `label_social_proof_format`, `label_social_proof_singular`, `label_social_proof_plural`, `label_stable_price` |
| **Checkout & Guarantee** | `label_checkout_community_support`, `label_checkout_community_emoji`, `label_neighborhood_guarantee`, `label_neighborhood_guarantee_desc`, `label_neighborhood_guarantee_badge`, `label_neighborhood_guarantee_emoji`, `label_dispute_sla_notice` |
| **Group Buy Labels** | `label_group_buy_title`, `label_group_buy_subtitle`, `label_group_buy_empty`, `label_group_buy_empty_desc`, `label_group_buy_join`, `label_group_buy_leave`, `label_group_buy_fulfilled` |
| **Discovery Labels** | `label_discovery_popular`, `label_discovery_new`, `label_reorder_prefix`, `label_reorder_success`, `label_reorder_unavailable` |
| **Dispute Config** | `dispute_categories_json` |
| **Visibility Thresholds** | `on_time_badge_min_orders`, `new_this_week_days`, `discovery_min_products`, `discovery_max_items`, `demand_insights_max_items`, `dispute_sla_warning_hours` |

### Tier 3: Seller-Controlled (Remove from Admin UI, Already Seller-Driven)

These are NOT settings at all -- they are seller operational data already stored on `seller_profiles` or `products` tables and editable by sellers through their own dashboard.

| Capability | Where It Lives | Seller UI |
|---|---|---|
| Product availability / "Sold out" | `products.is_available` | Seller Products page toggle |
| Pricing | `products.price`, `products.mrp` | Seller product form |
| Seller descriptions & images | `seller_profiles.description`, `profile_image_url` | Seller Settings page |
| Group buy participation | `collective_buy_requests` (seller creates) | Already seller-initiated |
| Back-in-stock notifications | `stock_watchlist` (buyer subscribes, trigger fires on `is_available` change) | Seller flips `is_available` |
| `last_active_at` | `seller_profiles.last_active_at` (auto-updated) | System-computed |

**Action**: No changes needed here -- these are already correctly seller-driven. The labels that describe these (e.g., "Notify Me", "Watching") remain Admin-controlled because they are buyer-facing copy, not seller operational data.

### Tier 3b: Seller-Facing Labels (Move to Separate Section, Clearly Labeled)

These labels appear on seller-only screens. They should stay Admin-configurable (Admin controls platform UX) but be grouped separately with clear "Seller Dashboard Labels" heading.

| Setting | Screen |
|---|---|
| `label_demand_insights_title` | Seller Dashboard |
| `label_demand_insights_empty` | Seller Dashboard |
| `label_reputation_empty` | Seller Detail |
| `label_reputation_empty_desc` | Seller Detail |
| `label_analytics_intelligence_title` | Seller Analytics |
| `label_analytics_active_buyers` | Seller Analytics |
| `label_analytics_views` | Seller Analytics |
| `label_analytics_conversion` | Seller Analytics |
| `label_analytics_fee_format` | Seller Analytics |
| `label_analytics_fee_desc` | Seller Analytics |
| `label_notify_me`, `label_notify_watching`, etc. | Buyer + Seller context |

---

## Part 2: Mobile Real-Time Audit (TestFlight Issue)

### Root Cause Identified

In `src/App.tsx` lines 114-115:

```typescript
refetchOnWindowFocus: false,
refetchOnReconnect: false,
```

This means:
1. When the iOS app returns from background (triggers `visibilitychange`/`focus`), React Query does NOT refetch stale data.
2. When network reconnects after a drop, React Query does NOT refetch.
3. There is NO `appStateChange` listener anywhere in the codebase to handle Capacitor foreground events.

### Why Web Works But Mobile Does Not

On web, users typically do a full page reload or navigate fresh. On mobile (TestFlight), the app stays in memory and resumes from background with stale cache (10-minute `staleTime`). Featured announcements, order updates, and other dynamic data remain frozen until the cache expires.

### Realtime Subscriptions

The app uses Supabase realtime channels in ~10 components (orders, chat, guard, bulletin, etc.), but:
- `featured_items` (announcements) has NO realtime subscription
- `system_settings` has NO realtime subscription
- There is no global "refetch on app resume" mechanism

### Fix Plan

**A. Add Capacitor App State Listener** (new file: `src/hooks/useAppLifecycle.ts`)

A hook that listens for Capacitor `appStateChange` events and invalidates critical queries when the app returns to foreground. This ensures fresh data on resume without full realtime overhead.

Critical queries to invalidate on foreground:
- `featured-items` (announcements)
- `system-settings-core` / `system-settings-raw`
- `cart-count`
- `unread-notifications`
- `products-by-category` (marketplace)

**B. Enable `refetchOnReconnect: true`** in QueryClient defaults

When network reconnects after a drop, stale queries should refetch. This is safe and low-cost.

**C. Add realtime subscription for `featured_items`** in the `FeaturedBanners` component

Since admin announcements are time-sensitive and the current implementation only fetches once, add a postgres_changes subscription so new banners appear immediately.

**D. Keep `refetchOnWindowFocus: false`**

This is correct for mobile -- Capacitor fires focus events frequently and refetching on every focus would cause excessive network traffic. The `appStateChange` listener is the correct replacement.

---

## Implementation Summary

### Files to Modify

| File | Change |
|---|---|
| `src/components/admin/PlatformSettingsManager.tsx` | Remove 4 system-controlled settings from `SETTING_FIELDS`. Regroup seller-facing labels under "Seller Dashboard Labels" section. |
| `src/hooks/useAppLifecycle.ts` | **New** -- Capacitor `appStateChange` listener that invalidates critical queries on foreground resume. |
| `src/App.tsx` | Change `refetchOnReconnect` to `true`. Wire `useAppLifecycle` hook. |
| `src/components/home/FeaturedBanners.tsx` | Add realtime subscription for `featured_items` table. |

### Files NOT Modified

- `useMarketplaceLabels.ts` -- No changes needed; defaults remain as fallbacks.
- Seller dashboard components -- Already seller-driven; no ownership change.
- `useSystemSettingsRaw.ts` -- No changes needed.

### Database Changes

- Enable realtime for `featured_items`: `ALTER PUBLICATION supabase_realtime ADD TABLE public.featured_items;`

