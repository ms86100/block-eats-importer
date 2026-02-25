

## Problem Analysis

Two distinct issues identified from the code and screenshot:

### Issue 1: Broken Builder Dashboard Layout
In `BuilderDashboardPage.tsx` (lines 160-168), `BuilderFeaturePlan` is placed inside a `flex items-center justify-between` div alongside `BuilderAnnouncementSheet`. However, `BuilderFeaturePlan` returns a React fragment (`<>...</>`) containing multiple top-level elements (plan summary card, active features grid, locked features grid, and the showcase sheet). Placing all of these inside a horizontal flex container causes the layout to break — the feature plan cards and the announcement button fight for horizontal space instead of stacking vertically.

### Issue 2: "Try this feature" button shown for locked features
In `FeatureShowcase.tsx` (lines 97-108), the "Try this feature" button is always shown when a feature has a `route`, regardless of whether the feature is enabled or locked. When a builder clicks a locked/grayed-out feature card, the showcase sheet opens and shows the same "Try this feature" button, which then navigates to a page that shows "Feature Not Available." The showcase should only display feature information (description, audience, capabilities) for locked features — no navigation button.

---

## Plan

### Fix 1: BuilderDashboardPage layout
- Move `BuilderFeaturePlan` out of the shared flex container with `BuilderAnnouncementSheet`
- Place `BuilderAnnouncementSheet` separately (e.g., inline with the section header or as its own row)
- Let `BuilderFeaturePlan` occupy its own full-width block in the vertical flow

### Fix 2: Pass `isLocked` context to FeatureShowcase
- In `BuilderFeaturePlan.tsx`, when setting the showcase key, also track whether the clicked feature is enabled or disabled
- Add an `isLocked` (or `isEnabled`) prop to `FeatureShowcase`
- In `FeatureShowcase.tsx`, conditionally hide the "Try this feature" button when `isLocked` is true
- For locked features, optionally show an "Upgrade your plan" or "Contact admin" hint instead

### Detailed Changes

**`src/pages/BuilderDashboardPage.tsx`** (lines 159-168):
- Separate `BuilderFeaturePlan` and `BuilderAnnouncementSheet` into distinct layout blocks
- Render `BuilderAnnouncementSheet` alongside a section title (e.g., "Feature Plan") in a flex row
- Render `BuilderFeaturePlan` below that as its own full-width section

**`src/components/builder/BuilderFeaturePlan.tsx`**:
- Add state to track whether the selected showcase feature is enabled: `const [showcaseLocked, setShowcaseLocked] = useState(false)`
- On card click for enabled features: `setShowcaseKey(f.feature_key); setShowcaseLocked(false)`
- On card click for disabled features: `setShowcaseKey(f.feature_key); setShowcaseLocked(true)`
- Pass `isLocked={showcaseLocked}` to `FeatureShowcase`

**`src/components/admin/FeatureShowcase.tsx`**:
- Add `isLocked?: boolean` to `FeatureShowcaseProps`
- When `isLocked` is true, hide the "Try this feature" button
- Optionally show a muted note like "This feature is not included in your current plan"

