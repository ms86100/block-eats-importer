

# Forensic Audit Report — Sociva Platform

---

## Section A — Critical Issues (Immediate Risk)

### A1. Country Code Hardcoded to India (`+91`)
- **Impact**: Platform cannot serve users outside India. SaaS readiness is broken.
- **Failure scenario**: A society in UAE or USA signs up; all phone numbers are prefixed with `+91`, making them invalid.
- **Evidence**: `src/pages/AuthPage.tsx` lines 286, 327 — `phone: \`+91${profileData.phone}\``. Also in `useAuthState.ts` auto-create path.
- **Fix**: Add `country_code` and `phone_format` to `system_settings`. Render country code selector from DB. Store E.164 formatted numbers.

### A2. Cart Has No Stock Validation at Checkout
- **Impact**: Users can place orders for products that are out of stock or have been removed between cart addition and checkout.
- **Failure scenario**: Product marked unavailable after being added to cart → order placed → seller must reject → poor UX, potential financial dispute.
- **Evidence**: `CartPage.tsx` calls `create_multi_vendor_orders` RPC without a freshness check on product availability or stock. The `useCart` hook fetches products but never revalidates `is_available` or `stock_quantity` at checkout.
- **Fix**: The `create_multi_vendor_orders` RPC must validate each product's `is_available = true` and `stock_quantity >= requested_quantity` atomically via `SELECT ... FOR UPDATE`. Return specific error listing unavailable items.

### A3. `validate-society` Edge Function Allows Arbitrary Society Creation
- **Impact**: Any authenticated user can create unlimited unverified societies via the edge function. No rate limiting, no duplicate detection (beyond exact slug match).
- **Failure scenario**: Attacker script creates thousands of societies, polluting the DB. Or a user creates a society with an offensive name.
- **Evidence**: `supabase/functions/validate-society/index.ts` — any authenticated user can call with `new_society` payload. No rate limiter applied despite `_shared/rate-limiter.ts` existing.
- **Fix**: Apply `withAuth` + rate limiter. Add a `pending_societies` table with admin approval flow rather than direct `societies` insert.

### A4. No CSRF/Rate Limiting on Login/Signup
- **Impact**: Credential stuffing, brute force attacks.
- **Failure scenario**: Attacker automates login attempts. Supabase has some built-in rate limiting, but the client has no throttling, lockout UI, or CAPTCHA.
- **Fix**: Add client-side attempt counting with exponential backoff. Display CAPTCHA after N failures. Show remaining lockout timer.

### A5. Onboarding `localStorage` Key Not User-Scoped
- **Impact**: If two users share a browser (kiosk, family device), the second user never sees the onboarding walkthrough.
- **Evidence**: `OnboardingWalkthrough.tsx` uses `localStorage.getItem('app_has_seen_onboarding')` without user ID prefix.
- **Fix**: Change key to `app_has_seen_onboarding_${userId}`.

---

## Section B — Hidden Time Bombs (Future Failures)

### B1. No Pagination on Orders, Products, Admin Lists
- **What will fail**: When a seller has 1000+ orders or a society has 1000+ products, queries hit the Supabase 1000-row default limit silently.
- **When**: When any society scales past ~100 active sellers.
- **Evidence**: `OrdersPage.tsx` uses `.limit(PAGE_SIZE)` but `AdminPage.tsx` fetches `payment_records` with `.limit(100)` and `reviews` with `.limit(50)` in a single batch. No cursor-based pagination.
- **Preventive redesign**: Implement cursor-based pagination with `created_at` + `id` as cursor. Add infinite scroll or "Load More" patterns.

### B2. Cart Context Re-renders Entire App on Any Cart Change
- **What will fail**: Performance degrades as cart items grow; every cart mutation triggers `invalidate()` which causes all consumers of `CartContext` to re-render.
- **When**: Users with 20+ cart items from multiple sellers.
- **Preventive redesign**: Split cart state into atomic selectors. Use `useSyncExternalStore` or separate count/total into their own contexts.

### B3. `useSecurityOfficer` Called in Every `BottomNav` Render
- **What will fail**: Every page load fires an RPC to check security officer status, even for pure buyers.
- **Evidence**: `BottomNav.tsx` line 38 — `useSecurityOfficer(!isPureBuyer)` is called on every render of BottomNav.
- **Preventive redesign**: Move security officer status into the auth context RPC (`get_user_auth_context`) to eliminate the extra query.

### B4. Realtime Channel per User in Header
- **What will fail**: With 10K concurrent users, 10K persistent WebSocket subscriptions just for notification badge counts.
- **When**: Scale beyond ~500 concurrent users.
- **Preventive redesign**: Use polling with exponential backoff for badge counts. Reserve realtime for chat/critical features only.

### B5. `queryClient` Created Outside React Component Tree
- **What will fail**: `queryClient` at module scope (App.tsx line 90) persists across hot reloads in dev and cannot be cleanly reset on logout.
- **Evidence**: `signOut` clears auth state but doesn't call `queryClient.clear()`, leaving cached data from the previous user visible momentarily.
- **Fix**: Call `queryClient.clear()` in `signOut` callback.

---

## Section C — UX Failures

### C1. No Loading Indicator During Order Placement
- **Pain point**: After tapping "Place Order," user sees no immediate feedback if network is slow.
- **Affected users**: All buyers, especially on 3G/slow connections.
- **Why it fails**: `isPlacingOrder` state exists but optimistic UI feedback (button spinner) may not cover the entire multi-step RPC process.
- **Fix**: Add a full-screen overlay with step indicators: "Validating cart... Creating order... Confirming payment..."

### C2. Error Messages Are Technical
- **Pain point**: `friendlyError(error)` is used inconsistently. Many `catch` blocks show raw error messages.
- **Affected users**: Non-technical residents, elderly users.
- **Evidence**: `toast.error(friendlyError(error))` is used in auth, but raw errors appear in cart, profile, and admin flows.
- **Fix**: Centralize all user-facing errors through `friendlyError()`. Map every known error code to a human-friendly message.

### C3. Society Switching Has No Confirmation
- **Pain point**: Tapping the society name in the header shows a dropdown with no visual consequence explanation.
- **Affected users**: Admin users who accidentally switch context.
- **Fix**: Add confirmation dialog: "You are about to view [Society Name]. Your cart and active orders remain in your home society."

### C4. No Empty State for Community Teaser
- **Pain point**: If there are no bulletin posts and no help requests, the Community section silently disappears.
- **Evidence**: `CommunityTeaser.tsx` line 49 — returns `null` when empty.
- **Fix**: Show an inviting empty state: "Be the first to post in your community!" with a CTA.

### C5. Password Reset Success State Is Disconnected
- **Pain point**: After password reset email is sent, user sees a success message but no clear next step.
- **Fix**: Show "Check your email" card with a countdown to resend, plus a "Back to Login" button prominently.

---

## Section D — Security Gaps

### D1. Seller Dashboard Routes Not Gated by Seller Role
- **Vulnerability**: `/seller`, `/seller/products`, `/seller/settings`, `/seller/earnings` use `ProtectedRoute` but not a `SellerRoute` guard.
- **Exploit scenario**: Any authenticated user navigates to `/seller/products` and sees the product management UI (though DB writes would fail via RLS).
- **Severity**: Medium — UI exposure without data leak, but reveals product management interface.
- **Fix**: Create `SellerRoute` guard checking `isSeller`. Apply to all `/seller/*` routes.

### D2. `validate-society` Function Creates Societies Without Admin Approval
- **Vulnerability**: Described in A3 above.
- **Exploit scenario**: Mass society creation, data pollution, brand/name abuse.
- **Severity**: High.
- **Fix**: Queue creation requests; require admin approval before `is_active = true`.

### D3. Worker/Delivery Routes Lack Role Verification
- **Vulnerability**: `/worker/jobs`, `/worker/my-jobs`, `/my-deliveries` are behind `ProtectedRoute` only. Any authenticated user can access.
- **Exploit scenario**: A buyer accesses the worker jobs board and accepts jobs they shouldn't.
- **Severity**: Medium-High — RLS on the DB side may catch writes, but full UI exposure.
- **Fix**: Add `WorkerRoute` and `DeliveryPartnerRoute` guards.

### D4. `dangerouslySetInnerHTML` in Chart Component
- **Vulnerability**: `src/components/ui/chart.tsx` uses `dangerouslySetInnerHTML` to inject CSS.
- **Exploit scenario**: If chart config themes were ever user-configurable, XSS injection would be possible.
- **Severity**: Low (currently only internal config), but violates defense-in-depth.
- **Fix**: Use a CSS-in-JS approach or sanitize content.

### D5. Notification Preferences Stored in `localStorage`
- **Vulnerability**: `NotificationsPage.tsx` stores push notification preferences only in localStorage.
- **Exploit scenario**: Preferences reset on device change, cache clear, or incognito. User stops receiving expected notifications silently.
- **Severity**: Medium — reliability, not security.
- **Fix**: Store notification preferences in `profiles` table or a dedicated `notification_preferences` table.

---

## Section E — Hardcoding & Configuration Violations

### E1. Phone Country Code `+91` Hardcoded
- **Where**: `AuthPage.tsx` (lines 286, 327, 659, 803), `AuthorizedPersonsPage.tsx`, `CreateBuilderSheet.tsx`, `VisitorManagementPage.tsx`.
- **Danger**: Blocks international expansion.
- **DB-driven redesign**: Add `default_country_code` and `supported_country_codes` to `system_settings`. Render phone input with a dynamic country selector.

### E2. Nav Items Array Hardcoded in `BottomNav.tsx`
- **Where**: Lines 13-31 — `residentNavItems`, `securityNavItems`, `workerNavItems`.
- **Danger**: Adding a new role or reordering nav requires a code deploy.
- **DB-driven redesign**: Create `nav_configs` table with `role`, `route`, `icon`, `label`, `sort_order`, `feature_key`. Query at boot, cache with long stale time.

### E3. Onboarding Walkthrough Steps Hardcoded
- **Where**: `OnboardingWalkthrough.tsx` — step content embedded in JSX.
- **Danger**: Cannot A/B test or update onboarding copy without deploy.
- **DB-driven redesign**: Store steps in `onboarding_steps` table with `title`, `description`, `image_url`, `sort_order`, `is_active`.

### E4. Pricing Page Plans Hardcoded
- **Where**: `PricingPage.tsx` — plan names, features, prices embedded in component.
- **Danger**: Cannot update pricing without deploy. Violates SaaS configurability standard.
- **DB-driven redesign**: Already have `subscription_packages` table; render pricing page from that data.

### E5. Order Status Transition Labels in Test Helpers
- **Where**: `src/test/helpers/business-rules.ts` — notification titles mapped to statuses.
- **Danger**: If status labels change in DB triggers but tests use hardcoded expectations, tests silently validate wrong behavior.
- **DB-driven redesign**: Pull notification templates from `system_settings` or a `notification_templates` table.

### E6. `systemSettings` DEFAULTS Object Contains Business Constants
- **Where**: `useSystemSettings.ts` lines 33-59.
- **Danger**: If the DB query fails or returns empty, the app falls back to hardcoded defaults silently. No alert to admin.
- **Fix**: Log a warning when falling back to defaults. Consider showing a "Configuration loading..." state rather than silent fallback.

---

## Section F — Implementation Roadmap

### Phase 1: Security & Safety (1-2 weeks)
| Task | Priority | Expected Outcome |
|---|---|---|
| Add `SellerRoute`, `WorkerRoute`, `DeliveryPartnerRoute` guards | P0 | All role-specific routes gated at both UI and routing level |
| Rate-limit `validate-society` + require admin approval | P0 | No unbounded society creation |
| Add stock validation inside `create_multi_vendor_orders` RPC | P0 | No orders for unavailable/out-of-stock products |
| Clear `queryClient` on signOut | P0 | No cross-user data leakage |
| Add login attempt throttling with UI feedback | P1 | Brute force resistance |
| Scope all `localStorage` keys with user ID | P1 | Multi-user device safety |

### Phase 2: Architecture Cleanup (2-3 weeks)
| Task | Priority | Expected Outcome |
|---|---|---|
| Merge `isSecurityOfficer` check into `get_user_auth_context` RPC | P1 | Eliminate redundant RPC per page load |
| Implement cursor-based pagination for Orders, Admin lists | P1 | No silent data truncation at 1000 rows |
| Replace Header realtime channel with polling | P2 | Reduce WebSocket connection pressure |
| Move notification preferences to DB | P2 | Cross-device preference persistence |
| Externalize phone country code to `system_settings` | P1 | SaaS-ready international support |

### Phase 3: UX Excellence (2-3 weeks)
| Task | Priority | Expected Outcome |
|---|---|---|
| Add order placement progress overlay | P1 | Clear feedback during slow operations |
| Standardize all error messages through `friendlyError()` | P1 | No technical jargon shown to users |
| Add empty states for Community, empty categories | P2 | No disappearing sections |
| Add society switch confirmation dialog | P2 | No accidental context switches |
| Improve password reset flow with clear next-step guidance | P2 | Reduced support tickets |
| Make nav items, onboarding steps, pricing DB-driven | P2 | Zero-deploy content updates |

### Phase 4: Scalability & Polish (2-4 weeks)
| Task | Priority | Expected Outcome |
|---|---|---|
| Split `CartContext` into atomic selectors | P2 | Reduced re-renders at scale |
| Add observability: error tracking (Sentry/equivalent) | P2 | Production error visibility |
| Add society-scoped isolation to `cart_items`, `favorites`, `payment_records` (per known gaps in RLS doc) | P1 | Full multi-tenant data isolation |
| Add feature flags for incremental rollout | P3 | Safe deployment of new features |
| Implement offline queue for mutations (cart add, order placement) | P3 | Resilience on poor connectivity |
| DB-driven `BottomNav` configuration | P3 | Role/feature nav without deploys |

