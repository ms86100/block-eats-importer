

## Investigation: Feature Package Access Control Broken

### Root Cause

The `get_effective_society_features` SQL function has a **fallback branch** that activates when no builder is associated with a society. This branch returns **all platform features as enabled by default**:

```sql
-- Third UNION ALL branch (the problem)
WHERE NOT EXISTS (SELECT 1 FROM builder_for_society)
-- Returns: CASE ... ELSE true END  ← defaults everything to enabled
```

**Current database state confirms the issue:**
- `builder_societies`: **0 rows** — no builder is linked to any society
- `builder_feature_packages`: **0 rows** — no packages assigned to any builder
- `feature_packages`: **0 rows** — no packages have been created yet

Since no builder-society association exists, the fallback fires and every feature (visitor_management, parking, etc.) appears enabled for all residents.

This was an intentional "backward compatibility" design — but it directly contradicts the intended behavior where features should be **disabled until explicitly assigned**.

### Additional Issue: Feature Key Mismatch

The `platform_features` table uses different keys than what the frontend expects:

| platform_features key | Frontend FeatureKey |
|---|---|
| `visitor_management` | `visitor_management` ✓ |
| `parking_management` | `vehicle_parking` ✗ |
| `maintenance_dues` | `maintenance` ✗ |
| `bulletin_board` | `bulletin` ✗ |
| `dispute_resolution` | `disputes` ✗ |
| `gate_management` | `guard_kiosk` / `gate_entry` ✗ |

When the fallback is removed and packages are properly assigned, these mismatches will cause features to appear as "unavailable" even when assigned — but that's a secondary issue.

### Fix

**Database migration** to update the `get_effective_society_features` function:

1. **Change the no-builder fallback** from `ELSE true` to `ELSE false` — when no builder is associated, non-core features default to **disabled** instead of enabled
2. **Seed missing feature keys** into `platform_features` to match what the frontend expects (e.g., add `vehicle_parking`, `bulletin`, `disputes`, `maintenance`, `finances`, `guard_kiosk`, `gate_entry`) so that when packages are created and assigned, the correct features light up

No frontend changes needed — the `useEffectiveFeatures` hook and `FeatureGate` component already handle the `is_enabled = false` case correctly by hiding the feature.

### After the Fix

- Societies without a builder assignment will only see **core features** (marketplace, help_requests, bulletin_board, dispute_resolution, emergency_broadcasts)
- Non-core features (visitors, parking, maintenance, etc.) will require: Admin creates package → assigns to builder → builder linked to society
- The admin panel's feature package management becomes the required gateway for feature access

