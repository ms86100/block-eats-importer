

## PRE-PRODUCTION DEFECT AUDIT — Post-Fix Verification

---

### P0 — GO-LIVE BLOCKERS

---

#### DEFECT 1: Existing orders have `delivery_handled_by = NULL` — data not backfilled

**Who:** Seller, Rider, Admin
**Scenario:** 9 active orders exist with `delivery_handled_by = NULL`. If seller marks one `ready`, the trigger `trg_auto_assign_delivery` sees `COALESCE(NULL, 'seller') != 'platform'` and correctly skips. However, `process-settlements` checks `delivery_handled_by != 'platform'` and treats them as non-platform, which is correct. **But** the `validate_settlement_release` DB trigger (see Defect 5) will still block them.
**Status:** RPC fix deployed. New orders will have correct values. Existing orders need a one-time backfill migration.
**Severity:** P0

**Fix:**
- New migration: `UPDATE orders SET delivery_handled_by = CASE WHEN fulfillment_type = 'delivery' THEN COALESCE((SELECT CASE WHEN sp.fulfillment_mode IN ('seller_delivery','pickup_and_seller_delivery') THEN 'seller' ELSE 'platform' END FROM seller_profiles sp WHERE sp.id = orders.seller_id), 'seller') ELSE NULL END WHERE delivery_handled_by IS NULL AND status NOT IN ('cancelled','completed','delivered');`
- Do NOT touch: RPC function, triggers

---

#### DEFECT 2: `validate_settlement_release` trigger blocks settlements for self-pickup/seller-delivery orders

**Who:** Seller, Admin
**Scenario:** Self-pickup order reaches `completed` → `trg_create_settlement_on_delivery` creates a settlement → cooldown passes → `process-settlements` edge function correctly skips delivery check → tries to update `settlement_status` to `eligible` → **DB trigger `validate_settlement_release` fires** → queries `delivery_assignments` → no row exists → **RAISE EXCEPTION 'Cannot settle: delivery not confirmed'** → settlement permanently blocked
**Observed:** The edge function fix (Defect 5 from previous audit) is correct, but the DB trigger `validate_settlement_release` was never updated. It still unconditionally requires a `delivery_assignments` row with status `delivered`.
**Expected:** Self-pickup and seller-delivery orders should pass the settlement release validation
**Root cause:** `validate_settlement_release` trigger was not updated alongside the edge function fix
**Severity:** P0

**Fix:**
- New migration: `CREATE OR REPLACE FUNCTION validate_settlement_release()` — add a check: look up the order's `fulfillment_type` and `delivery_handled_by`. If `fulfillment_type = 'self_pickup'` or `delivery_handled_by != 'platform'`, skip the delivery_assignments check and verify order status is `completed` or `delivered` instead.
- Do NOT touch: payment verification logic, settlement status transitions, the edge function

---

#### DEFECT 3: COD orders never have `payment_status = 'paid'` — settlements always fail payment check

**Who:** Seller
**Scenario:** All 10 COD orders in DB have `payment_status: 'pending'` in `payment_records`. When settlement processing reaches the payment verification step (both edge function line 97-107 and `validate_settlement_release` trigger), it checks `payment_status != 'paid'` → fails with "Payment not confirmed". There is NO code path that ever marks a COD `payment_records` row as `paid`.
**Observed:** COD payment records are created with status `pending` and never updated
**Expected:** When a COD order is delivered/completed, the payment record should be marked `paid`
**Root cause:** Missing wiring — no trigger or handler marks COD payments as confirmed upon delivery/completion
**Severity:** P0

**Fix:**
- New migration: Add logic to `trg_create_settlement_on_delivery` (or create a new trigger) that, when an order transitions to `delivered`/`completed` AND `payment_type = 'cod'`, updates the corresponding `payment_records` row to `payment_status = 'paid'`.
- Do NOT touch: Razorpay webhook handler, UPI payment flow

---

#### DEFECT 4: Zero device tokens — push notifications cannot be delivered

**Who:** All users
**Scenario:** `device_tokens` table has 0 rows. All push notifications fail silently.
**Status:** Code is correct. Requires native app rebuild by user.
**Severity:** P0 (requires user action)

**Fix:** No code change. User must rebuild native app (`npx cap sync` + `npx cap run ios/android`).

---

### P1 — MUST-FIX BEFORE SCALE

---

#### DEFECT 5: Razorpay webhook processes only first order in multi-vendor UPI cart

**Who:** Buyer, Seller
**Status:** Mitigated — UPI is disabled for multi-seller carts (line 52 of useCartPage.ts). Present but fragile.
**Severity:** P1 (mitigated)

**Fix:** Add code comment documenting the limitation. No logic change needed.

---

#### DEFECT 6: 3 spurious `delivery_assignments` exist for pre-fix orders

**Who:** Rider
**Scenario:** 3 delivery assignments were created before the trigger fix was deployed, for orders that may be seller-delivery. Riders may receive notifications for orders they shouldn't handle.
**Severity:** P1

**Fix:**
- One-time data cleanup migration: Delete `delivery_assignments` where the order's `delivery_handled_by` is not `platform` (after backfill from Defect 1).

---

### P2 — QUALITY

---

#### DEFECT 7: `handleRazorpaySuccess` still calls `clearCart()` (line 253)

**Who:** Buyer
**Scenario:** UPI payment succeeds → `handleRazorpaySuccess` calls `await clearCart()` → redundant DELETE since RPC already cleared cart
**Severity:** P2

**Fix:** Remove `await clearCart()` from `handleRazorpaySuccess` in `useCartPage.ts` line 253. Keep `await refresh()`.

---

### RISK AREAS

| Area | Status | Risk |
|---|---|---|
| `delivery_handled_by` on existing orders | **Present but not backfilled** | 9 active orders have NULL values |
| `validate_settlement_release` trigger | **Present but not updated** | Blocks ALL non-platform-delivery settlements at DB level |
| COD payment confirmation | **Missing entirely** | COD orders can never be settled — payment_status stays `pending` forever |
| Push notification delivery | **Present but inactive** (0 device tokens) | Requires native app rebuild |
| Multi-vendor UPI | **Present but intentionally disabled** | Fragile guard |
| Spurious delivery assignments | **Present, 3 orphaned rows** | May confuse riders |

---

### GO-LIVE RISK SUMMARY

**P0 Blockers (4):**
1. Existing orders need `delivery_handled_by` backfilled — 9 active orders affected
2. `validate_settlement_release` trigger blocks self-pickup/seller-delivery settlements at DB level
3. COD payment records never marked as `paid` — ALL COD settlements will fail
4. Zero device tokens — push notifications non-functional (requires native rebuild)

**P1 Must-Fix (2):**
5. 3 spurious delivery assignments need cleanup
6. Multi-vendor UPI fragility (mitigated but undocumented)

**P2 Quality (1):**
7. Redundant `clearCart()` in UPI success handler

---

### VERDICT

**❌ Not safe for go-live** without fixing Defects 1-3.

Even with the previous round of fixes deployed, **no seller can ever receive a settlement** for any COD order because:
- COD `payment_records` are never marked `paid` (Defect 3)
- `validate_settlement_release` trigger blocks non-delivery settlements (Defect 2)
- Existing orders have NULL `delivery_handled_by` (Defect 1)

These are three compounding blockers on the settlement path. All three must be resolved via database migrations before any seller can be paid.

### Implementation Plan

**Migration 1: Backfill existing orders + fix validate_settlement_release + auto-confirm COD payments**
- UPDATE existing orders to set `delivery_handled_by` based on seller's `fulfillment_mode`
- CREATE OR REPLACE `validate_settlement_release` to handle self-pickup/seller-delivery orders
- Add COD auto-confirmation: when order reaches `delivered`/`completed` and `payment_type = 'cod'`, mark `payment_records.payment_status = 'paid'` (add to `trg_create_settlement_on_delivery` or new trigger)
- Clean up 3 spurious `delivery_assignments`

**Client-side fix:**
- Remove redundant `clearCart()` from `handleRazorpaySuccess` in `useCartPage.ts`

