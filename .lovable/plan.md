
## Application Robustness Audit Report

### Overall Robustness Score: **Medium**

The application demonstrates solid foundational patterns (optimistic updates, error boundaries, validation schemas, submit guards) but has several medium-to-high severity issues in state management, edge case handling, and flow consistency that could cause user confusion or data integrity problems in production.

---

### Finding 1: Seller Onboarding Draft Resume Loses Step 4-6 Form Data

- **Severity**: High
- **Location**: `src/pages/BecomeSellerPage.tsx`, lines 129-164
- **Description**: When a user saves a draft and returns later, the `checkExisting` effect only restores `business_name`, `primary_group`, and `draftProducts`. All Step 4 settings (fulfillment_mode, accepts_upi, upi_id, operating_days, profile/cover images) and Step 3 fields (description, availability hours, delivery radius, sell_beyond_community, categories) are NOT restored from the database. The user is sent to Step 3 with default values, overwriting their previously saved data.
- **Impact**: Sellers who save a draft and return will lose all their store configuration and must re-enter everything.
- **Root Cause**: The draft resume logic reads the seller profile but only extracts `id`, `business_name`, `primary_group`, and `verification_status`. It does not SELECT or restore the remaining columns.
- **Recommendation (Required)**: Expand the draft resume query to `select('*')` and populate the full `formData` state from the returned record, including categories, description, availability times, fulfillment_mode, operating_days, accepts_cod, accepts_upi, upi_id, delivery_radius_km, sell_beyond_community, profile_image_url, and cover_image_url.

---

### Finding 2: Duplicate Draft Seller Profiles on Re-entry

- **Severity**: High
- **Location**: `src/pages/BecomeSellerPage.tsx`, lines 129-164 and 216-254
- **Description**: The `checkExisting` effect finds a draft profile and sets `draftSellerId`. But separately, the auto-save effect on Step 3 (lines 216-254) creates a NEW draft if `draftSellerId` is null AND the user types a business name. There is a race condition: if the initial check hasn't completed before the user starts typing (or if it fails silently), a second draft profile gets inserted. Over time, users can accumulate multiple orphaned draft profiles.
- **Impact**: Data clutter, potential confusion if the wrong draft is loaded, and waste of database rows.
- **Root Cause**: The auto-save effect depends on `draftSellerId` being null, but doesn't check whether an existing draft query is still in flight.
- **Recommendation (Required)**: Add a guard that prevents auto-save while `isCheckingExisting` is true. Also add a uniqueness check (e.g., query before insert) or use an upsert with a conflict on `(user_id, primary_group, verification_status='draft')`.

---

### Finding 3: Auth Signup - Profile Insert Can Silently Fail

- **Severity**: High
- **Location**: `src/pages/AuthPage.tsx`, lines 314-322
- **Description**: After `supabase.auth.signUp()`, the code inserts a profile and user_role. If the profile insert fails (e.g., RLS, network error), the error is caught with `console.log('Profile will be created after email verification')` and silently swallowed. However, there is no mechanism to retry profile creation after email verification. The user would end up with an auth account but no profile row, causing the app to malfunction on login (the `get_user_auth_context` RPC would return null profile).
- **Impact**: Users could be permanently stuck -- logged in but with no profile, unable to access any features.
- **Root Cause**: Optimistic assumption that profile creation always succeeds, with no fallback or retry mechanism.
- **Recommendation (Required)**: Add a profile-check-and-create flow on login. If `get_user_auth_context` returns a null profile for an authenticated user, redirect to a profile completion screen rather than showing a broken home page.

---

### Finding 4: Cart Checkout Doesn't Validate Product Availability

- **Severity**: Medium
- **Location**: `src/pages/CartPage.tsx`, `src/hooks/useCart.tsx`
- **Description**: When placing an order, the cart data is sent to `create_multi_vendor_orders` without re-checking if products are still available, approved, or if the seller is still active. Stale cart items (added hours/days ago) could reference deactivated products or sellers.
- **Impact**: Orders could be created for unavailable products. The DB function doesn't validate product availability either.
- **Root Cause**: No freshness check between cart population and order placement.
- **Recommendation (Medium priority)**: Add a pre-checkout validation step that verifies all cart items still reference available, approved products with active sellers before calling `create_multi_vendor_orders`.

---

### Finding 5: Seller Onboarding Step 5 Unreachable Without draftSellerId

- **Severity**: Medium
- **Location**: `src/pages/BecomeSellerPage.tsx`, line 1037
- **Description**: Step 5 (Products) renders conditionally: `{step === 5 && draftSellerId && (...)}`. If `draftSellerId` is null (e.g., auto-save failed, network issue), Step 5 renders nothing -- blank screen. The user sees an empty page with no error message or recovery option.
- **Impact**: User gets stuck on a blank page with no explanation.
- **Root Cause**: No fallback UI for the case where `draftSellerId` is missing at Step 5.
- **Recommendation (Required)**: Add an error state when `step === 5 && !draftSellerId` that shows a message like "Unable to load your store. Please go back and try again." with a back button.

---

### Finding 6: Auth State Listener Calls fetchProfile in setTimeout(0)

- **Severity**: Low
- **Location**: `src/contexts/auth/useAuthState.ts`, line 84
- **Description**: `fetchProfile` is wrapped in `setTimeout(() => fetchProfile(session.user.id), 0)`. This is intended to avoid Supabase deadlocks, but it means there is a brief window where `user` is set but `profile` is still null. Any component that checks `user` without also checking `profile` may render incorrectly during this gap.
- **Impact**: Momentary UI flash or incorrect routing (e.g., `AppRoutes` checks `user && profile` for some redirects but just `user` for `ProtectedRoute`).
- **Root Cause**: Intentional async deferral to avoid auth listener deadlocks.
- **Recommendation (Optional)**: This is an acceptable trade-off. Document it as known behavior. The `isLoading` flag covers most cases.

---

### Finding 7: No Validation on Operating Days (Can Submit With 0 Days)

- **Severity**: Medium
- **Location**: `src/pages/BecomeSellerPage.tsx`, line 1025
- **Description**: Step 4's Continue button is disabled when `operating_days.length === 0`, which is correct. However, `handleSubmit()` (final submission) does NOT check operating_days. If a user goes back to Step 4, deselects all days, then navigates forward to Step 6 via browser manipulation or state change, they can submit with 0 operating days.
- **Impact**: Seller profile created with no operating days, effectively invisible to buyers.
- **Root Cause**: Final submission validation only checks for products and declaration, not store settings completeness.
- **Recommendation (Medium priority)**: Add a validation check in `handleSubmit()` that ensures `formData.operating_days.length > 0` before submitting.

---

### Finding 8: UPI ID Not Validated When UPI Toggle is On

- **Severity**: Low
- **Location**: `src/pages/BecomeSellerPage.tsx`, lines 930-942 (Step 4) and `handleSubmit`
- **Description**: When `accepts_upi` is true, the UPI ID input appears but is not required. A seller can enable UPI payment with no UPI ID, resulting in `upi_id: null` in the database. Buyers who select UPI payment for this seller would have no way to pay.
- **Impact**: Broken UPI payment flow for buyers if seller forgot to enter UPI ID.
- **Root Cause**: No conditional validation -- UPI ID field is shown but not enforced.
- **Recommendation (Medium priority)**: Either make UPI ID required when `accepts_upi` is true (disable Continue until filled), or auto-disable `accepts_upi` when saving if `upi_id` is empty.

---

### Finding 9: Cart - Optimistic Update Stale Closure in updateQuantity

- **Severity**: Low
- **Location**: `src/hooks/useCart.tsx`, lines 157-186
- **Description**: `updateQuantity` captures `items` in its closure for rollback (`const prevItems = items`). But since it's wrapped in `useCallback` with `[user, items]` as dependencies, it recreates on every items change. This is technically correct but inefficient, and could cause stale rollback data if multiple rapid quantity changes occur before the callback updates.
- **Impact**: Minor -- could cause a temporary visual glitch during rapid quantity changes, but recovers on next fetch.
- **Root Cause**: Closure-based optimistic update pattern with mutable dependency.
- **Recommendation (Optional)**: Use a ref for the rollback snapshot or use the functional form of `setItems` with a rollback queue.

---

### Finding 10: No Session Expiry Handling

- **Severity**: Medium
- **Location**: `src/contexts/auth/useAuthState.ts`, `src/integrations/supabase/client.ts`
- **Description**: The Supabase client has `autoRefreshToken: true`, which handles most cases. However, if a token refresh fails (e.g., user was deleted, session revoked), the `onAuthStateChange` fires with `event === 'TOKEN_REFRESHED'` failing silently or `event === 'SIGNED_OUT'`. The app clears state but doesn't redirect the user or show an explanation. The user may be left on a protected page with a "Loading..." state that never resolves.
- **Impact**: User stuck on a page after session expiry with no clear path forward.
- **Root Cause**: No explicit handling for session expiry vs. deliberate sign-out.
- **Recommendation (Medium priority)**: In the auth state listener, when `event === 'SIGNED_OUT'` and it wasn't triggered by the user's explicit signOut call, show a toast ("Your session has expired. Please log in again.") and navigate to `/auth`.

---

### Finding 11: Error Boundary Only at App Root Level

- **Severity**: Low
- **Location**: `src/App.tsx`, `src/components/ErrorBoundary.tsx`
- **Description**: The root `ErrorBoundary` catches all unhandled errors but forces a full page reload to recover. `RouteErrorBoundary` wraps some dashboard routes but not all. Pages like `CartPage`, `AuthPage`, `BecomeSellerPage`, and `SearchPage` have no route-level error boundary, meaning any crash in these critical flows triggers the full-app error screen.
- **Impact**: Poor recovery experience for critical user flows.
- **Root Cause**: Selective application of `RouteErrorBoundary`.
- **Recommendation (Optional)**: Wrap `BecomeSellerPage`, `CartPage`, and `AuthPage` with `RouteErrorBoundary` for granular recovery.

---

### Finding 12: Seller Onboarding - Back Navigation Doesn't Persist Step 4 Data

- **Severity**: Medium
- **Location**: `src/pages/BecomeSellerPage.tsx`
- **Description**: When a user is on Step 4 and clicks "Edit store details" (back to Step 3), the form data in React state is preserved (good). But if they then click "Continue to Store Settings" again, `saveDraft()` is called, which saves the Step 3 data. However, the Step 4 data is only saved when the user clicks "Continue to Add Products" from Step 4. If the user navigates Step 3 -> Step 4 -> Step 3 -> exits (Save Draft), the Step 4 changes are saved because `saveDraft` includes all fields. This is actually correct.
- **Severity Adjustment**: Low (the data IS in React state and IS included in saveDraft). No action needed.

---

### Summary of Priority Actions

| Priority | Finding | Action |
|----------|---------|--------|
| Required | #1 - Draft resume loses form data | Expand draft resume query to restore all fields |
| Required | #2 - Duplicate draft profiles | Guard auto-save during initial check, add upsert logic |
| Required | #3 - Profile insert silently fails | Add profile-check-on-login fallback |
| Required | #5 - Blank Step 5 without draftSellerId | Add error state with back button |
| Medium | #4 - No product availability check at checkout | Add pre-checkout validation |
| Medium | #7 - 0 operating days submittable | Add validation in handleSubmit |
| Medium | #8 - UPI ID not enforced | Require UPI ID when UPI enabled |
| Medium | #10 - No session expiry UX | Add toast + redirect on unexpected sign-out |
| Optional | #6 - Brief user/profile desync | Document as known behavior |
| Optional | #9 - Stale closure in cart | Use ref-based rollback |
| Optional | #11 - Missing error boundaries | Wrap critical pages |
