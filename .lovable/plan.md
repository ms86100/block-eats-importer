

# Feature Entitlement Bypass: Root Cause & Fix

## Root Cause

The database function `get_effective_society_features` contains this fallback logic on line 47 of the live function:

```sql
-- No builder assigned = default enabled; builder assigned but feature not in package = disabled
ELSE (_builder_id IS NULL)
```

This expression evaluates to `true` when no builder is assigned to the society. Since Maple Gardens Residency has:
- **No builder assigned** (`builder_societies` returns NULL)
- **No package assigned** (consequently NULL)
- **No `is_core` flags** (all 26 features have `is_core = false`)
- **No society overrides**

The function falls through to `ELSE (_builder_id IS NULL)` which returns `true` for every feature. All 26 features are returned as `is_enabled: true, source: 'default'`.

This was an intentional "backward compatibility" decision from the original implementation — the rationale was "societies without a builder get everything by default." However, this directly contradicts the strict package-driven entitlement model.

## Current Resolution Flow (Broken)

```text
Platform Features (26 features, all is_core=false)
  → Builder lookup: NULL (no builder assigned)
    → Package lookup: skipped
      → Override lookup: no overrides
        → Fallback: (_builder_id IS NULL) = TRUE
          → All features enabled ← THIS IS THE BUG
```

## Correct Resolution Flow

```text
Platform Features (26 features)
  → Core features: always enabled
  → Override exists: use override value
  → Package assigned + feature in package: use package value
  → Everything else: DISABLED (false)
```

## Fix

One line change in the database function:

```sql
-- BEFORE (permissive fallback):
ELSE (_builder_id IS NULL)

-- AFTER (strict entitlement):
ELSE false
```

This means:
- Features only become enabled through one of three paths: `is_core = true`, a society override, or inclusion in an assigned package
- Societies without a builder and without overrides will have zero non-core features enabled
- Admins can still use society overrides to selectively enable features for unassigned societies

## Impact Assessment

**Maple Gardens Residency** currently has no builder, no package, and no overrides. After this fix, all 26 features will become disabled. To restore access, one of the following must happen:
1. Assign a builder to the society and assign a package to that builder
2. Create society-level overrides for specific features
3. Mark certain features as `is_core = true` in `platform_features` if they should be universally available

## Recommendation

Before deploying the fix, the admin should decide which features (if any) should be universally available without a package. Candidates for `is_core = true` might include `marketplace` and `bulletin` as baseline features. Everything else should require a package assignment.

## Files to Modify

| File | Change |
|---|---|
| New migration SQL | `CREATE OR REPLACE FUNCTION get_effective_society_features` — change `ELSE (_builder_id IS NULL)` to `ELSE false` |

No frontend changes are needed. The function signature and return type remain identical.

