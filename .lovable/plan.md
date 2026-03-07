

## Problem: Society Coordinates Not Being Captured

### Root Cause

There are **two broken paths** where society coordinates are lost:

**Path 1 — Existing DB society has no coordinates:**
When a user selects a pre-existing society from the database (e.g., "Shriram Greenfield"), the record already has `latitude: null, longitude: null`. The signup flow simply uses that society as-is and never updates it.

Current data confirms: Shriram Greenfield has `null` coordinates in the DB.

**Path 2 — Google Place matches existing society:**
When a user types in Google Places, finds their society, and it fuzzy-matches an existing DB record, `handleSelectGooglePlace` calls `setSelectedSociety(match)` — discarding the Google coordinates. The match object from DB has null lat/lng.

**Path 3 — Manual new society form:**
`handleRequestNewSociety` hardcodes `latitude: 0, longitude: 0` since there's no map/geocoding in that flow.

Only **Path 4** (new society via Google Places → `validate-society`) correctly captures coordinates.

### Fix

#### 1. Backfill coordinates when Google Places matches an existing society (`useAuthPage.ts`)

In `handleSelectGooglePlace`, when a fuzzy match is found against an existing DB society that has `null` coordinates, update the society record with the Google coordinates via the `validate-society` edge function (or a direct update if user has permission).

```text
handleSelectGooglePlace:
  if (match found && match has no coordinates) {
    → call validate-society with society_id + lat/lng to backfill
    → update local match object with coordinates
  }
```

#### 2. Add geocoding to manual society request form (`useAuthPage.ts`)

In `handleRequestNewSociety`, use the society name + city + pincode to geocode via Google Places (already loaded) instead of hardcoding `latitude: 0, longitude: 0`. Or, show the `GoogleMapConfirm` component to let the user pin their location.

Since the Google Maps SDK is already loaded for the search flow, we can call `geocode()` with the address string to get coordinates.

#### 3. Update `validate-society` edge function to accept coordinate backfill

Modify the edge function to accept an optional `coordinates` payload alongside `society_id`, so it can update an existing society's null coordinates:

```text
// In validate-society/index.ts
if (society_id && latitude && longitude) {
  UPDATE societies SET latitude, longitude 
  WHERE id = society_id AND latitude IS NULL
}
```

### Files Changed
- `src/hooks/useAuthPage.ts` — backfill coordinates on Google match; geocode on manual form
- `supabase/functions/validate-society/index.ts` — accept coordinate backfill for existing societies

