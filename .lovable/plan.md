

# Platform Admin Feature Bypass

## Root Cause

The strict entitlement fix (`ELSE false`) correctly blocks features for societies without a package. However, it has no awareness of **who is viewing**. Platform admins are subject to the same restrictions as regular residents — the `get_effective_society_features` RPC and the frontend `FeatureGate` / `BottomNav` both treat admins identically to residents.

There are two layers that need an admin bypass:

1. **`FeatureGate` component** — Currently blocks rendering with "Feature Not Available" without checking if the user is an admin.
2. **`BottomNav` component** — Hides the Society tab when `hasAnyFeature` is false, without checking admin status.
3. **`useEffectiveFeatures` hook** — The `isFeatureEnabled` function returns `false` for disabled features regardless of caller role.

## Fix Strategy

The cleanest fix is at the **frontend hook level** — make `isFeatureEnabled` return `true` for all features when the caller is a platform admin. This automatically fixes both `FeatureGate` and `BottomNav` without touching either component individually.

### File: `src/hooks/useEffectiveFeatures.ts`

**Change**: Import `useAuth` and check `isAdmin`. In the `isFeatureEnabled` callback, add an early return `true` if the user is an admin.

```typescript
const isFeatureEnabled = useCallback((key: FeatureKey): boolean => {
  if (isAdmin) return true; // Platform admins bypass all feature gates
  if (!effectiveSocietyId) return false;
  const feature = featureMap.get(key);
  if (!feature) return false;
  return feature.is_enabled;
}, [isAdmin, effectiveSocietyId, featureMap]);
```

### File: `src/components/layout/BottomNav.tsx`

**Change**: Also bypass the `hasAnyFeature` check for the Society tab when the user is an admin. Since `isAdmin` is already destructured from `useAuth()`, add it to the filter:

```typescript
if (item.to === '/society' && !hasAnyFeature && !isAdmin) return false;
```

### Files Modified

| File | Change |
|---|---|
| `src/hooks/useEffectiveFeatures.ts` | Add `isAdmin` check to `isFeatureEnabled` — admins always return `true` |
| `src/components/layout/BottomNav.tsx` | Add `!isAdmin` guard to the Society tab filter |

### No database changes needed

The RPC function does not need modification. The admin bypass is correctly handled at the UI layer since platform admins already have full database access via RLS policies. The feature entitlement system is about controlling what **residents** see, not what admins can access.

