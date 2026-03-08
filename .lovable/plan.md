

# Post-Remediation Roadmap — Implementation Plan

## Scope
13 tasks across 7 milestones. No new tables needed except one `admin_settings` insert. All RPCs either exist or need minor modifications.

---

## Milestone 1 — Trust Metric Accuracy (P0)

### Task 1: Fix Fulfillment Rate (fake 100%)

**Problem:** `SellerStatsCard.tsx` line 20 uses `(trust as any).cancelled_count` which doesn't exist in the RPC return, making fulfillment always 100%.

**Fix:**
1. **DB Migration:** Alter `get_seller_trust_snapshot` RPC to add `cancelled_orders` to the return table:
   ```sql
   (SELECT COUNT(*) FROM public.orders WHERE seller_id = _seller_id AND status = 'cancelled') as cancelled_orders
   ```
2. **Type:** Add `cancelled_orders: number` to `SellerTrustSnapshot` in `useProductTrustMetrics.ts`
3. **Component:** In `SellerStatsCard.tsx`, replace the broken calculation with:
   ```ts
   const denom = trust.completed_orders + trust.cancelled_orders;
   const fulfillmentRate = denom > 0 ? Math.round((trust.completed_orders / denom) * 100) : null;
   ```
   Hide the metric if `fulfillmentRate === null`.

---

## Milestone 2 — Configurable Trust System (P0)

### Task 2: Wire SellerTrustBadge to trust_tier_config

**Problem:** `SellerTrustBadge.tsx` uses hardcoded thresholds (5/50/100), ignoring `trust_tier_config` table and `get_seller_trust_tier` RPC.

**Fix:**
1. **Create hook** `src/hooks/queries/useSellerTrustTier.ts` — calls `get_seller_trust_tier` RPC with sellerId, returns `{ tier_key, tier_label, badge_color, icon_name }`.
2. **Rewrite `SellerTrustBadge.tsx`:**
   - Change props from `completedOrders + rating` to `sellerId` (+ optional `size`).
   - Use the new hook internally.
   - Map `icon_name` string → Lucide icon component.
   - Keep the exported `getSellerTrustTier` for backward compat but mark deprecated.
3. **Update all consumers** (`CartPage.tsx`, `ProductListingCard.tsx`, `SellerDetailPage.tsx`) to pass `sellerId` instead of `completedOrders/rating`.

### Task 3: Unify SellerGrowthTier with trust config

**Problem:** `SellerGrowthTier.tsx` has a second set of hardcoded tiers.

**Fix:**
1. **DB Migration:** Add `growth_label` and `growth_icon` columns to `trust_tier_config`.
2. **Extend `get_seller_trust_tier` RPC** to also return `growth_label, growth_icon`.
3. **Rewrite `SellerGrowthTier.tsx`** to accept `sellerId`, reuse `useSellerTrustTier` hook, display `growth_label` + next tier progress from config.

---

## Milestone 3 — Performance (P1)

### Task 4: Use batch delivery scores in checkout

**Problem:** `CartPage.tsx` line 195 renders `<DeliveryReliabilityScore sellerId={...} />` per seller group → N individual RPCs.

**Fix:**
1. Import `useDeliveryScoresBatch` from `DeliveryReliabilityScore.tsx`.
2. Call it once with all `sellerIds`.
3. Pass score data as props to a presentational delivery badge (no internal fetch).
4. Create a thin `DeliveryScoreBadge` presentational component that takes `onTimePct` and `compact` — no RPC inside.

### Task 5: Move search suggestions aggregation to DB

**Problem:** `useCommunitySearchSuggestions` fetches 200 rows, aggregates in JS.

**Fix:**
1. **DB Migration:** Create RPC `get_society_search_suggestions(_society_id uuid, _limit int DEFAULT 8)` that does the GROUP BY + HAVING count >= 2 + ORDER BY in SQL.
2. **Update hook** to call the RPC directly, return results as-is.

---

## Milestone 4 — Trust Score Activation (P1)

### Task 6: Implement `refresh_all_trust_scores`

**Problem:** Function body is just `RAISE NOTICE`.

**Fix:** DB Migration to replace function body with:
```sql
UPDATE seller_profiles sp SET trust_score = (
  0.4 * (1 - COALESCE(sp.cancellation_rate, 0))
  + 0.3 * COALESCE(sp.repeat_customer_pct, 0) / 100.0
  + 0.2 * COALESCE(sp.on_time_delivery_pct, 0) / 100.0
  + 0.1 * LEAST(COALESCE(sp.rating, 0) / 5.0, 1)
) * 100
WHERE sp.verification_status = 'approved';
```

### Task 7: Create trust score cron edge function

1. Create `supabase/functions/compute-trust-scores/index.ts` — calls `refresh_all_trust_scores()` via service role.
2. Schedule via `pg_cron` every 12 hours.
3. Surface `trust_score` in `SellerStatsCard` if > 0.

---

## Milestone 5 — Financial System (P1)

### Task 8: Settlement creation on order delivery

1. Create edge function `supabase/functions/create-settlement/index.ts`.
2. Add DB trigger on `orders` — when status changes to `delivered`, insert into `payment_settlements` with gross amount from order, platform_fee = 0 (from admin_settings), net = gross - fee.

### Task 9: Wire SellerEarningsPage to payment_settlements

**Problem:** `SellerEarningsPage.tsx` queries `payment_records` (which may be empty/unused). The `payment_settlements` table exists but has no UI consumers.

**Fix:** Update `SellerEarningsPage` to query `payment_settlements` instead of/alongside `payment_records`, showing settlement status and net earnings.

---

## Milestone 6 — Dynamic Configuration (P2)

### Task 10: Platform fee from admin_settings

**Problem:** `CartPage.tsx` line 290 hardcodes `₹0 (always free)`.

**Fix:**
1. Insert `platform_fee_percentage` and `platform_fee_flat` into `admin_settings` (value `0`).
2. Fetch via `useMarketplaceConfig` (already reads `admin_settings`).
3. Replace hardcoded text in CartPage with dynamic value.

### Task 11: Urgent response timeout from config

**Problem:** Line 136 hardcodes "3 min".

**Fix:** Add `seller_response_timeout_minutes` to `admin_settings` (value `3`). Fetch and display dynamically.

---

## Milestone 7 — Type Safety (P2)

### Task 12: Validate RefundTierBadge RPC response

Add zod schema validation to `RefundTierBadge.tsx` for the RPC response. If validation fails, use fallback gracefully.

### Task 13: Strengthen trust summary in checkout

**Problem:** `trustSummaryText` in `CartPage.tsx` (line 48-62) reads `seller?.completed_order_count` from cart item which may be undefined, and uses hardcoded thresholds (100/50) instead of the DB config.

**Fix:** After Task 2 is done, use the same `useSellerTrustTier` hook results to build the trust summary text dynamically from the tier labels returned by the RPC.

---

## Summary

| # | Task | Type | Key Files |
|---|---|---|---|
| 1 | Fix fulfillment rate | DB + Component | RPC, SellerStatsCard |
| 2 | Wire trust badge to DB | Hook + Component | New hook, SellerTrustBadge, consumers |
| 3 | Unify growth tier | DB + Component | trust_tier_config, SellerGrowthTier |
| 4 | Batch delivery scores | Component | CartPage, DeliveryReliabilityScore |
| 5 | DB-side search suggestions | DB + Hook | New RPC, useCommunitySearchSuggestions |
| 6 | Implement trust score calc | DB | refresh_all_trust_scores |
| 7 | Trust score cron | Edge function | New function + pg_cron |
| 8 | Settlement on delivery | DB trigger + Edge fn | payment_settlements |
| 9 | Wire earnings to settlements | Page | SellerEarningsPage |
| 10 | Dynamic platform fee | Config + UI | admin_settings, CartPage |
| 11 | Dynamic timeout | Config + UI | admin_settings, CartPage |
| 12 | RefundTier type safety | Component | RefundTierBadge |
| 13 | Dynamic trust summary | Component | CartPage |

