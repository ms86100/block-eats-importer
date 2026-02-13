

## Revised Plan: Fix Misleading "No Results Found" Label and GPS Unavailable

### Issue 1: "No results found" appears after selecting a location

**Root cause:** After a user selects a Google Place, the code sets `selectedSociety` (line 135). This causes `showGoogleResults` (line 318) to become `false` because of the `&& !selectedSociety` condition. Since `showDbResults` is also `false`, the empty state on line 608 triggers, showing "No results found" -- even though the location was successfully selected.

**Fix:** Add `&& !selectedSociety` to the empty state condition on line 608. When a society is already selected, the "No results found" message should not appear.

Change line 608 from:
```
{societySearch.length >= 3 && !showDbResults && !showGoogleResults && !isSearching && (
```
to:
```
{societySearch.length >= 3 && !showDbResults && !showGoogleResults && !isSearching && !selectedSociety && (
```

---

### Issue 2: "GPS not available for this society"

**Root cause:** On line 135, the temporary `selectedSociety` object is created without `latitude` and `longitude` properties. The GPS verification function (line 184) checks `selectedSociety?.latitude` and `selectedSociety?.longitude` -- both are `undefined`, so it immediately sets the status to `'unavailable'`.

The coordinates ARE available in the `details` object at that point but are only stored in `pendingNewSociety`, not in `selectedSociety`.

**Fix:** Add `latitude` and `longitude` to the temporary society object on line 135.

Change line 135 from:
```
setSelectedSociety({ id: 'pending', name, slug, is_active: false, is_verified: false, created_at: '', updated_at: '' } as Society);
```
to:
```
setSelectedSociety({ id: 'pending', name, slug, is_active: false, is_verified: false, latitude: details.latitude, longitude: details.longitude, created_at: '', updated_at: '' } as Society);
```

---

### Summary

| File | Line | Change |
|------|------|--------|
| `src/pages/AuthPage.tsx` | 135 | Add `latitude` and `longitude` from place details to temporary society object |
| `src/pages/AuthPage.tsx` | 608 | Add `&& !selectedSociety` to hide empty state when a society is already selected |

Both fixes are single-line changes with no impact on existing functionality.

