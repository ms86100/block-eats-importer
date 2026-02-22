

## Builder Feature Visibility — Let Builders See Their Assigned Package and Features

### Problem
When an admin assigns a "Basic" package to Prestige Group, the builder has no way to know:
- What package they're on
- Which features are included
- Which features are enabled/disabled per society
- What they could unlock by upgrading

The Builder Dashboard currently shows only societies, stats, and analytics — zero feature information.

### Solution
Add a **"My Plan & Features"** card to the Builder Dashboard that shows:
1. The assigned package name and tier
2. A feature breakdown showing enabled/disabled features with the FeatureShowcase preview
3. Per-society feature status (reusing the existing `get_effective_society_features` RPC)

### Technical Changes

#### 1. New Component: `src/components/builder/BuilderFeaturePlan.tsx`
A card component that:
- Takes the builder's ID as a prop
- Fetches the builder's assigned package from `builder_feature_packages` (joined with `feature_packages` and `feature_package_items` joined with `platform_features`)
- Displays the package name, tier badge (Basic/Pro/Enterprise), and assigned date
- Lists all platform features with check/cross indicating what's included in their package
- Each feature name is clickable to open the `FeatureShowcase` sheet (reuse from admin)
- If no package is assigned, shows a "No package assigned — contact your platform admin" message

#### 2. New Component: `src/components/builder/BuilderSocietyFeatures.tsx`
An expandable section on each society card that:
- Calls `get_effective_society_features` RPC for that society (same as the admin audit)
- Shows the resolved feature list with source badges (Core, Package, Override)
- Allows the builder to see what each society actually has enabled vs what the package provides
- This helps builders understand when a society admin has overridden something

#### 3. Modified: `src/pages/BuilderDashboardPage.tsx`
- Import and add `BuilderFeaturePlan` component between the aggregate stats and the analytics link
- On each society card, add a small "Features" expandable that shows the society's effective features
- The builder can click any feature to see the FeatureShowcase description

#### 4. Modified: `src/components/admin/FeatureShowcase.tsx` (minor)
- Ensure it can be imported and used outside the admin context (it already can since it's a standalone sheet component)

#### 5. Data Flow (no database changes needed)

```text
Builder Dashboard loads
    |
    v
Fetch builder_feature_packages WHERE builder_id = managedBuilderIds[0]
    |
    v
Join feature_packages -> feature_package_items -> platform_features
    |
    v
Display: "Your Plan: Basic (4 of 18 features)"
    |
    v
Builder clicks a society card -> expands features
    |
    v
Call get_effective_society_features(_society_id)
    |
    v
Display resolved features with source badges
```

### What the builder sees

1. **Plan Card** at the top of their dashboard:
   - "Your Plan: Basic" with a blue tier badge
   - "4 of 18 features included"
   - Expandable list showing all 18 features with green checks for included, gray locks for not included
   - Clicking any feature name opens the FeatureShowcase explaining what it does

2. **Per-Society Features** on each society card:
   - A small "Features" button that expands to show the effective features for that society
   - Color-coded sources so the builder can see if a society admin has toggled something

### Files Summary

| File | Action |
|------|--------|
| `src/components/builder/BuilderFeaturePlan.tsx` | New -- package display + feature list |
| `src/components/builder/BuilderSocietyFeatures.tsx` | New -- per-society effective features |
| `src/pages/BuilderDashboardPage.tsx` | Modified -- add both components |

