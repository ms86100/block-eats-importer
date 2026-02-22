
## Fix: Categories Page Empty + Search Toggle Still Resetting

### Two Root Causes Found

**Bug 1 — Categories Page shows "Stay tuned" despite nearby sellers existing:**

The CategoriesPage calls `useNearbySocietySellers()` with NO arguments (line 35). This hook defaults to `radiusKm = 5`. But the seller is ~5.8 km away, so a 5 km radius misses it. The user's profile has `search_radius_km = 10`, but this value is never passed to the hook. Additionally, the page does a separate redundant DB query for prefs instead of using the auth context `profile`.

**Bug 2 — Search toggle shows OFF then flips ON:**

The fix used `useState(profile?.browse_beyond_community ?? true)`. The problem is `useState` only captures its initial value on the **first render**. When the Search page mounts, `profile` in the auth context may still be `null` (loading). So it falls back to `true` -- which is actually correct. But if profile loads as `null` first, then loads with the real value, `useState` ignores the update. We need a `useEffect` to sync the state when profile finishes loading.

### Changes

**File 1: `src/pages/CategoriesPage.tsx`**
- Remove the separate `useQuery` for user prefs (lines 20-32) -- use `profile` from auth context instead
- Pass the user's `search_radius_km` to `useNearbySocietySellers(radiusKm, browseBeyond)`
- Use `useAuth()` to get `profile` directly (already imported)

Before:
```typescript
const { user } = useAuth();
// ... separate DB query for prefs ...
const browseBeyond = prefs?.browse_beyond_community ?? true;
const { data: nearbyBands = [] } = useNearbySocietySellers();
```

After:
```typescript
const { user, profile } = useAuth();
const browseBeyond = profile?.browse_beyond_community ?? true;
const searchRadius = profile?.search_radius_km ?? 10;
const { data: nearbyBands = [] } = useNearbySocietySellers(searchRadius, browseBeyond);
```

**File 2: `src/pages/SearchPage.tsx`**
- Add a `useEffect` that syncs `browseBeyond` and `searchRadius` when `profile` loads/changes, so the toggle doesn't show a stale initial value

```typescript
useEffect(() => {
  if (profile) {
    setBrowseBeyondLocal(profile.browse_beyond_community ?? true);
    setSearchRadiusLocal(profile.search_radius_km ?? 10);
  }
}, [profile]);
```

### Summary

| Bug | Root cause | Fix |
|---|---|---|
| Categories shows "Stay tuned" | `useNearbySocietySellers()` called with default 5 km radius; seller is at 5.8 km | Pass user's radius (10 km) and browseBeyond flag from auth profile |
| Search toggle resets to OFF | `useState` ignores async profile updates | Add `useEffect` to sync state when profile loads |
