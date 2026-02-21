

## Fix: License Upload Shows Premature "Pending Verification" During Onboarding

### Problem
After uploading a license in Step 3 of the seller onboarding wizard, the `LicenseUpload` component immediately shows a scary admin-review message: "Your license is being reviewed by the admin. Selling is restricted until approved." This is misleading because the seller hasn't even finished onboarding yet.

### Root Cause
The `LicenseUpload` component has a single rendering path for `status === 'pending'` that always shows the full admin-review warning. It doesn't distinguish between:
- **During onboarding**: License just uploaded, seller is still completing steps -- should show a positive confirmation
- **Post-onboarding**: Seller has submitted everything and is waiting for admin review -- the current warning is appropriate

### Solution
Add an `isOnboarding` prop to `LicenseUpload` that changes the "pending" state UI during the wizard flow.

### Changes

**File 1: `src/components/seller/LicenseUpload.tsx`**
- Add `isOnboarding?: boolean` to the props interface
- When `isOnboarding` is true AND status is `pending`, show a friendly confirmation message like: "License uploaded successfully! You can continue setting up your store." with a green checkmark
- When `isOnboarding` is false (default), keep the existing admin-review warning as-is
- Also: when `isOnboarding` is true and status is `pending`, still allow the seller to see what they uploaded (don't hide the upload section entirely)

**File 2: `src/pages/BecomeSellerPage.tsx`**
- Pass `isOnboarding={true}` to the `LicenseUpload` component rendered in Step 3
- No other changes to the wizard flow, step order, or architecture

### What the Seller Will See After This Fix

| Scenario | Before Fix | After Fix |
|----------|-----------|-----------|
| Upload license in Step 3 | "Pending Verification -- Selling is restricted until approved" (alarming, feels stuck) | "License uploaded! You can continue setting up your store." (positive, clear) |
| View license after final submission | Same as above | "Your license is being reviewed by the admin." (appropriate context) |

### Testing Plan
1. Navigate to `/become-seller`
2. Select a category that requires a license (e.g., Food and Groceries -> Home Food)
3. Proceed to Step 3 (Store Details)
4. Enter a business name and wait for draft auto-save
5. Upload a license document
6. **Verify**: Friendly success message appears (not the admin-review warning)
7. **Verify**: "Continue" button is enabled (license status is now `pending`, which satisfies the mandatory check)
8. Proceed through Steps 4 and 5 to confirm the rest of the flow is unaffected

### Technical Details

Only two files are modified. No database changes, no routing changes, no architecture changes. The `isOnboarding` prop defaults to `false` so all existing uses of `LicenseUpload` outside the wizard are unaffected.

