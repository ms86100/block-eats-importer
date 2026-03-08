# Product Approval Workflow — Deep Audit

> Generated: 2026-03-08 | Source: Full code analysis across seller, admin, and buyer surfaces

## Status Lifecycle (Intended)

```
Draft → Pending Review → Approved (Live) / Rejected
                              ↑                 ↓
                              └── Resubmit ←────┘
```

---

## Issue PA-01 — CRITICAL: Dual Admin Approval Paths with Divergent Behavior

**Location:** `useSellerApplicationReview.ts:155-157` vs `useAdminData.ts:164-166`

**Problem:** Two separate admin hooks handle seller approval, and they cascade product approval differently:

| Hook | Cascades draft→approved? | Cascades pending→approved? |
|------|--------------------------|---------------------------|
| `useSellerApplicationReview` (line 157) | ✅ Yes — `.in('approval_status', ['pending', 'draft'])` | ✅ Yes |
| `useAdminData` (line 166) | ❌ No — `.eq('approval_status', 'pending')` only | ✅ Yes |

**Impact:** If the admin approves a seller via `useAdminData`, any draft products remain stuck as "Draft" forever — the seller sees them but they never become visible to buyers. The seller has no indication anything is wrong.

**Fix:** Unify to a single seller-approval function (ideally an RPC or edge function) that handles the full cascade consistently. Both hooks should call the same function.

---

## Issue PA-02 — CRITICAL: `is_available` Toggle Bypasses Approval Status

**Location:** `useSellerProducts.ts:283-286`

**Problem:** The `toggleAvailability` function updates only `is_available` without checking `approval_status`. A seller can toggle a draft/pending/rejected product to "In Stock" (`is_available = true`), which is misleading because:
- The product won't be visible to buyers (RLS/query filters check `approval_status = 'approved'`)
- But the seller sees no warning about why enabling stock doesn't make it visible

**Impact:** Seller confusion. They think enabling availability makes the product live.

**Fix:** Disable the availability toggle for non-approved products. Show a tooltip: "Submit for review first."

---

## Issue PA-03 — HIGH: Bulk Upload Products Stay as 'draft' With No Submit Path

**Location:** `useBulkUpload.ts:130`

**Problem:** Bulk-uploaded products are always created as `approval_status: 'draft'`. While the seller products page shows a "Submit All for Approval" banner for draft products, this banner uses inline supabase calls rather than the centralized `handleSave` function. The bulk upload itself has no submit-for-review step.

Additionally, the banner only appears when drafts exist but provides no per-product control — it's all-or-nothing.

**Impact:** Sellers who bulk upload get confused when products don't appear. There's no guided path from bulk upload → review → submit.

**Fix:** After bulk upload completes, show a toast with a CTA: "X products saved as drafts. Submit them for review from your Products page." Consider adding a "Submit all for review" button in the bulk upload completion dialog.

---

## Issue PA-04 — HIGH: Editing a 'pending' Product Keeps It 'pending' Even With Content Changes

**Location:** `useSellerProducts.ts:191-208`

**Problem:** The edit logic only resets to `pending` when `['approved', 'rejected'].includes(ep.approval_status)`. If a product is already `pending` and the seller makes content changes, the status stays `pending` — which is correct. But there's no mechanism to notify the admin that the product under review has been modified.

**Impact:** Admin may approve a stale version. The product content they reviewed is different from what actually goes live.

**Fix:** Add an `updated_while_pending` boolean or timestamp to products. Show a visual indicator in the admin panel: "⚠️ Modified since submission." Alternatively, bump the product to the back of the review queue.

---

## Issue PA-05 — HIGH: Admin Can't See Draft Products in AdminProductApprovals

**Location:** `AdminProductApprovals.tsx:48`

**Problem:** The standalone `AdminProductApprovals` component only queries `.eq('approval_status', 'pending')`. Draft products are invisible to admins in this view. While this is intentional (drafts shouldn't need approval), it means:
- If a seller submits a product but the status transition to 'pending' fails silently, the product is invisible to everyone
- Admin has no visibility into the full product pipeline

**Impact:** Orphaned draft products with no clear path forward.

**Fix:** Add an optional "Show drafts" toggle in the admin panel. Or add a count badge: "X draft products across all sellers."

---

## Issue PA-06 — HIGH: Seller Approval Cascade Skips Individual Product Review

**Location:** `useSellerApplicationReview.ts:157`

**Problem:** When admin approves a seller, ALL pending+draft products are auto-approved in one shot: `.update({ approval_status: 'approved' }).eq('seller_id', seller.id).in('approval_status', ['pending', 'draft'])`. Products are not individually reviewed.

**Impact:** Problematic, inappropriate, or incorrectly priced products go live without scrutiny. This was flagged in the original audit as S6.

**Fix:** Change the cascade to only set products to `pending` (not `approved`), so admin must still approve each product individually. OR add a confirmation step: "This will approve X products. Review them first?"

---

## Issue PA-07 — MEDIUM: `rejection_note` Cleared Even on Non-Content Edits

**Location:** `useSellerProducts.ts:207`

**Problem:** `rejection_note: null` is always set when editing, even if the seller only toggles `is_available` or `is_bestseller` without changing content-significant fields. The `contentChanged` check only controls `approval_status`, not `rejection_note`.

**Impact:** If a seller edits a rejected product but doesn't change the problematic content, the rejection reason disappears and the status stays `rejected` (since `contentChanged` is false). The seller loses the admin's feedback without actually fixing the issue.

**Fix:** Only clear `rejection_note` when `approval_status` is being reset to `pending` (i.e., when `contentChanged` is true).

---

## Issue PA-08 — MEDIUM: Admin `statusBadge()` Function Doesn't Handle 'draft'

**Location:** `SellerApplicationReview.tsx:20-27`

**Problem:** The `statusBadge` function only handles `pending`, `approved`, `rejected`. If a product has `approval_status = 'draft'`, it falls through to the `default` case showing raw text "draft" without styling.

**Impact:** Inconsistent visual representation of draft products in the admin panel.

**Fix:** Add a `case 'draft'` with appropriate styling (gray outline badge with "Draft" label).

---

## Issue PA-09 — MEDIUM: No Notification to Seller on Product Approval/Rejection

**Location:** `useSellerApplicationReview.ts:225-246`, `AdminProductApprovals.tsx:54-74`

**Problem:** When admin approves or rejects a product individually, there's an audit log but no notification to the seller. The seller only finds out by checking their products page.

Contrast with seller approval which sends a notification (line 158-164).

**Impact:** Seller may not know their product was rejected (especially if they have many products) and won't see the rejection reason until they manually check.

**Fix:** Insert a notification into `notification_queue` or `user_notifications` on product status changes.

---

## Issue PA-10 — MEDIUM: Price Change on Edit Doesn't Trigger Re-Approval

**Location:** `useSellerProducts.ts:195-202` — `contentChanged` check

**Problem:** The `contentChanged` check includes `parseFloat(formData.price) !== ep.price`, which correctly detects price changes. However, `mrp`, `stock_quantity`, `is_urgent`, `specifications` (attribute blocks), and `prep_time_minutes` are NOT in the change detection list. A seller could change attribute blocks (which might contain misleading specs) without triggering re-approval.

**Impact:** Potentially misleading product information goes live without review.

**Fix:** Add `specifications` (JSON deep compare) and other relevant fields to the content-change detection.

---

## Issue PA-11 — MEDIUM: Onboarding Submit Only Transitions Draft→Pending, Not Re-checked

**Location:** `useSellerApplication.ts:309`

**Problem:** During onboarding submission, products are transitioned from `draft` to `pending`: `.update({ approval_status: 'pending' }).eq('seller_id', draftSellerId).eq('approval_status', 'draft')`. But if a product was already pending (from a previous partial submission), it won't be re-queued. This is correct behavior but there's no error handling if the update fails — `prodError` is only console.error'd.

**Impact:** Silent failure could leave products stuck in draft on submission.

**Fix:** Surface the error to the user: "Some products couldn't be submitted. Please try again from your Products page."

---

## Issue PA-12 — LOW: `showPendingHint` Variable Declared But Only Used for Pending Status Message

**Location:** `SellerProductsPage.tsx:120`

**Problem:** `const showPendingHint = approvalStatus === 'pending';` is declared but only used in one place (line ~155). This is a minor code quality issue but also means the hint text is only shown for pending status — there's no equivalent hint for draft or rejected.

**Impact:** Minor. Could confuse sellers in draft state who don't know what to do next.

**Fix:** Add contextual hints for all non-approved states:
- Draft: "Tap Submit to send for admin review"
- Rejected: "Edit and resubmit to get approved"

---

## Issue PA-13 — LOW: Shared `rejectionNote` State Across Multiple Products in AdminProductApprovals

**Location:** `AdminProductApprovals.tsx:36-37`

**Problem:** There's a single `rejectionNote` state and a single `rejectingId`. If an admin starts writing a rejection note for Product A, then clicks "Reject" on Product B, the note from A is lost and the UI switches to B's rejection form.

**Impact:** Minor UX issue for admins reviewing multiple products.

**Fix:** Use a map `Record<string, string>` for rejection notes keyed by product ID, or clear the note when switching products.

---

## Issue PA-14 — LOW: No Admin View for Rejected Products History

**Location:** `AdminProductApprovals.tsx` only shows `pending` products

**Problem:** Once a product is rejected, it disappears from the admin's view entirely. There's no way for admin to:
- See previously rejected products
- Verify that a resubmitted product has actually been fixed
- Compare old vs new version

**Impact:** Admin can't track rejection→resubmission patterns or identify repeat offenders.

**Fix:** Add a "Rejected" tab or filter to `AdminProductApprovals` showing recently rejected products with their rejection reasons.

---

## Issue PA-15 — LOW: No Database Constraint Enforcing Valid `approval_status` Values

**Problem:** The `validate_product_approval_status` trigger (per audit doc) should enforce valid values (draft, pending, approved, rejected). But the constraint is a trigger, not a CHECK or ENUM. If the trigger has a bug or is disabled, invalid statuses could be inserted.

**Impact:** Low probability but would cause complete status display failure.

**Fix:** Consider adding a CHECK constraint: `CHECK (approval_status IN ('draft', 'pending', 'approved', 'rejected'))` as a defense-in-depth measure alongside the trigger.

---

## Summary Matrix

| ID | Severity | Area | Status |
|----|----------|------|--------|
| PA-01 | CRITICAL | Dual approval paths diverge | ✅ Fixed |
| PA-02 | CRITICAL | is_available toggle misleads sellers | ✅ Fixed |
| PA-03 | HIGH | Bulk upload has no submit path | ✅ Fixed |
| PA-04 | HIGH | Edits during review not flagged | ✅ Fixed |
| PA-05 | HIGH | Admins can't see draft pipeline | ✅ Fixed |
| PA-06 | HIGH | Seller approval auto-approves all products | ✅ Fixed |
| PA-07 | MEDIUM | rejection_note cleared on non-content edits | ✅ Fixed |
| PA-08 | MEDIUM | Admin statusBadge missing 'draft' case | ✅ Fixed |
| PA-09 | MEDIUM | No notification on product approval/rejection | ✅ Fixed |
| PA-10 | MEDIUM | Specs/MRP changes bypass re-approval | ✅ Fixed |
| PA-11 | MEDIUM | Silent failure on onboarding product transition | ✅ Fixed |
| PA-12 | LOW | Missing contextual hints for non-approved states | ✅ Fixed |
| PA-13 | LOW | Shared rejection note state in admin | Open (minor UX) |
| PA-14 | LOW | No admin view for rejected product history | ✅ Fixed |
| PA-15 | LOW | No DB constraint on approval_status values | ✅ Fixed |
