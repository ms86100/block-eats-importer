

# Seller Dashboard Audit — Findings & Fix Plan

## Issue 1: "Set up your service hours" banner shows even after configuration

**Root Cause**: The query on line 56-68 of `SellerDashboardPage.tsx` checks `service_availability_schedules` where `is_active = true`. If the seller saved schedules but they were saved with `is_active = false` (or the column defaults to false), the count returns 0 and the banner persists. Additionally, `hasSchedules` starts as `undefined` before the query resolves — the condition `hasSchedules === false` doesn't distinguish "not loaded yet" from "truly none."

**Fix**:
- In the query, also count rows where `is_active` might be null (i.e., remove or relax the `is_active` filter — count any schedule rows for this seller).
- Guard the banner render: only show when `hasSchedules === false` (strict false, not undefined), which is already done — but the real bug is the `is_active` filter being too strict.

**File**: `src/pages/SellerDashboardPage.tsx` lines 56-68

---

## Issue 2: Status indicator shows red (🔴 Closed) despite admin approval

**Root Cause**: The `StoreStatusCard` shows "Store is live" (from `verification_status === 'approved'` implied by not being pending) but then shows `🔴 Closed` because `is_available` is `false`. These are two separate states: admin approval vs. operational open/closed toggle. The card conflates them — it says "Store is live" (approved) but shows a red dot (closed operationally).

The `SellerVisibilityChecklist` similarly shows a red `fail` status for "Store is closed" (line 81) when `is_available` is false, even though the store is approved.

**Fix**:
- In `StoreStatusCard`, when `is_available` is false but store is approved, show an amber/info indicator instead of red — clarify "Store is approved but currently paused" vs implying it's broken.
- Improve the status line to distinguish approval status from operational status: e.g., "✅ Approved • ⏸ Paused" vs "✅ Approved • 🟢 Open".

**File**: `src/components/seller/StoreStatusCard.tsx` lines 50-57

---

## Issue 3: "Store in draft" appears for an approved seller

**Root Cause**: In `useSellerHealth.ts` line 66-75, the verification_status check has an `else` branch (line 73-74) that catches any status that isn't `approved`, `pending`, or `rejected` — and labels it "Store in draft." 

The user has **multiple seller profiles** (the code supports this via `sellerProfiles` array and `SellerSwitcher`). The dashboard passes the `activeSellerId` to the checklist. If the active seller ID accidentally points to a **draft profile** (e.g., the user started creating a second business but didn't finish), the checklist correctly shows "Store in draft."

**Fix**:
- The `SellerVisibilityChecklist` receives the correct `sellerProfile.id` from the dashboard, so this should match. But verify: if `currentSellerId` in AuthContext points to a draft profile, the entire dashboard renders for that draft profile.
- Add a safeguard: in the health check, if `verification_status` is `'draft'`, show a more specific message like "This store is a draft. Switch to your approved store or complete setup." with a switcher prompt.
- Also ensure that the `activeSellerId` defaults to the first **non-draft** seller profile.

**File**: `src/pages/SellerDashboardPage.tsx` line 50 — prefer non-draft profile in fallback selection.
**File**: `src/hooks/queries/useSellerHealth.ts` line 73-75 — improve draft messaging.

---

## Issue 4: Feedback has no admin visibility

**Root Cause**: The `FeedbackSheet` inserts into `user_feedback` table, but there is **no admin panel component** that reads from this table. The data is saved to the database but has no retrieval UI anywhere.

**Fix**:
- Create an `AdminFeedbackViewer` component that queries `user_feedback` (joined with `profiles` for user name) and displays it in a sortable table.
- Add it as a new sub-section in the admin panel (e.g., under the existing admin tabs or as part of the Settings/System area).

**File**: New `src/components/admin/AdminFeedbackViewer.tsx`
**File**: `src/pages/AdminPage.tsx` — add rendering for the feedback viewer.

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/pages/SellerDashboardPage.tsx` | Remove `is_active` filter from schedule query; prefer non-draft seller in fallback |
| `src/components/seller/StoreStatusCard.tsx` | Distinguish approved+paused from approved+open visually |
| `src/hooks/queries/useSellerHealth.ts` | Improve draft status messaging and action label |
| `src/components/admin/AdminFeedbackViewer.tsx` | New component — table showing user feedback with ratings, messages, timestamps |
| `src/pages/AdminPage.tsx` | Add Feedback tab/section to admin panel |

All existing functionality preserved. No hooks, mutations, or routes are modified — only UI rendering logic and one new read-only admin component.

