

# Fix: Icon Rendering as Text Instead of Using DynamicIcon

## Problem
On `CategoryGroupPage.tsx`, the parent group icon (e.g., `"Briefcase"`) is rendered as raw text via `{parentGroup.icon}` instead of being passed through the `DynamicIcon` component which resolves Lucide icon names to SVG icons.

This happens in two places:
- **Line 189** — Page header: `<span>{parentGroup.icon}</span>` shows "Briefcase" as text
- **Line 299** — Empty state: `<div className="text-4xl mb-4">{parentGroup.icon}</div>` shows "Briefcase" as text

## Fix

Replace both raw `{parentGroup.icon}` usages with `<DynamicIcon name={parentGroup.icon} />`:

**File: `src/pages/CategoryGroupPage.tsx`**

1. **Line 189** (header):
```tsx
// Before
<span>{parentGroup.icon}</span>

// After
<DynamicIcon name={parentGroup.icon} size={18} />
```

2. **Line 299** (empty state):
```tsx
// Before
<div className="text-4xl mb-4">{parentGroup.icon}</div>

// After
<div className="mb-4 flex justify-center">
  <DynamicIcon name={parentGroup.icon} size={40} className="text-muted-foreground" />
</div>
```

`DynamicIcon` is already imported on line 11 of this file, so no new imports needed.

This is the only file where `parentGroup.icon` is rendered as raw text — other files (ParentGroupTabs, BecomeSellerPage, etc.) already use `DynamicIcon` correctly.

