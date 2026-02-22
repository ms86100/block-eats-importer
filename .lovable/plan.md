

# Workforce Module Enhancement -- Complete Implementation Plan

## Overview

This plan transforms the workforce module from a single-society job system into a multi-society, multi-language, accessibility-first worker marketplace. It covers 9 implementation steps across database, backend functions, and UI changes.

---

## Step 1: Database Migration -- New Tables and Columns

### 1A: `supported_languages` table (admin-configurable)

```text
CREATE TABLE supported_languages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,          -- e.g. 'hi', 'en', 'ta', 'bn'
  name text NOT NULL,                 -- e.g. 'Hindi', 'English'
  native_name text NOT NULL,          -- e.g. 'हिन्दी', 'English'
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
```

Seed with initial languages: Hindi, English, Tamil, Telugu, Bengali, Marathi, Kannada, Gujarati, Malayalam, Punjabi.

RLS: Public read (all authenticated users), admin-only write.

### 1B: `preferred_language` on `society_workers`

```text
ALTER TABLE society_workers
  ADD COLUMN preferred_language text DEFAULT 'hi';
```

This stores the worker's chosen language code, referencing `supported_languages.code`.

### 1C: `visibility_scope` and `target_society_ids` on `worker_job_requests`

```text
ALTER TABLE worker_job_requests
  ADD COLUMN visibility_scope text NOT NULL DEFAULT 'society',
  ADD COLUMN target_society_ids uuid[] DEFAULT '{}';
```

- `visibility_scope`: `'society'` or `'nearby'`
- `target_society_ids`: specific society UUIDs selected by resident (only populated when scope is `'nearby'`)

Validation trigger to enforce allowed values.

### 1D: `job_tts_cache` table (optional caching)

```text
CREATE TABLE job_tts_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES worker_job_requests(id) ON DELETE CASCADE,
  language_code text NOT NULL,
  summary_text text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(job_id, language_code)
);
```

RLS: Authenticated read, system-only write (via edge function).

---

## Step 2: RLS Policies

### 2A: Cross-society job visibility

New SELECT policy on `worker_job_requests` for workers:

```text
-- Worker can see jobs from own society
(society_id = get_user_society_id(auth.uid()))
OR
-- Worker can see nearby-scoped jobs where their society is in target list
(visibility_scope = 'nearby'
 AND get_user_society_id(auth.uid()) = ANY(target_society_ids))
```

This ensures:
- Society-scoped jobs: only visible to workers in the same society
- Nearby-scoped jobs: only visible to workers in explicitly selected societies
- No blanket radius broadcast -- resident controls exactly which societies

### 2B: `supported_languages` RLS

- SELECT: all authenticated users
- INSERT/UPDATE/DELETE: platform admins only (`is_admin(auth.uid())`)

### 2C: `job_tts_cache` RLS

- SELECT: all authenticated users (workers need to read cached summaries)
- INSERT/UPDATE: none (written by edge function via service role)

---

## Step 3: Update `accept_worker_job` RPC

Current logic rejects workers not in the job's society. Updated logic:

```text
-- For 'society' scope: worker must be in same society (unchanged)
-- For 'nearby' scope: worker's society must be in target_society_ids
IF _job.visibility_scope = 'nearby' THEN
  SELECT * INTO _worker FROM society_workers
  WHERE user_id = _worker_id
    AND society_id = ANY(_job.target_society_ids)
    AND deactivated_at IS NULL;
ELSE
  SELECT * INTO _worker FROM society_workers
  WHERE user_id = _worker_id
    AND society_id = _job.society_id
    AND deactivated_at IS NULL;
END IF;
```

No distance check needed because `target_society_ids` was already validated at insert time (Step 5).

---

## Step 4: Notification Trigger -- `notify_workers_on_job_posted`

New trigger on `worker_job_requests` AFTER INSERT:

```text
-- If visibility_scope = 'society':
--   Notify workers in NEW.society_id matching job_type (or all if 'general')
-- If visibility_scope = 'nearby':
--   Notify workers in NEW.society_id + each society in NEW.target_society_ids
```

Notification payload includes: job ID, job type, society name, urgency, price.

Also enhances the existing acceptance flow: when a worker accepts, insert a notification to the resident with the worker's profile summary (name, photo, phone, society, rating).

---

## Step 5: RPC -- `get_nearby_societies`

New server-side function to fetch nearby societies for the job creation form:

```text
CREATE FUNCTION get_nearby_societies(_society_id uuid, _radius_km numeric DEFAULT 5)
RETURNS TABLE(id uuid, name text, distance_km numeric)
AS $$
  SELECT s.id, s.name,
    ROUND(haversine_km(origin.latitude, origin.longitude, s.latitude, s.longitude), 1)
  FROM societies s, societies origin
  WHERE origin.id = _society_id
    AND s.id != _society_id
    AND s.is_active = true
    AND s.latitude IS NOT NULL AND s.longitude IS NOT NULL
    AND haversine_km(origin.latitude, origin.longitude, s.latitude, s.longitude) <= _radius_km
  ORDER BY distance_km;
$$
```

This powers the multi-select checklist in the job creation form.

---

## Step 6: Edge Function -- `generate-job-voice-summary` (Enhanced)

The existing edge function generates Hindi-English summaries. Enhanced version:

**Input changes:**
- Accept `language` parameter (worker's preferred language code)
- Accept `society_name` for cross-society context

**AI prompt changes:**
- Generate summary in the worker's selected language
- Include society name/origin for cross-society jobs
- Include all job details: type, location, salary, urgency, schedule, society name

**Caching:**
- Before calling AI, check `job_tts_cache` for existing summary in this language
- After generating, insert into `job_tts_cache`
- Return cached version on subsequent requests

**Speech synthesis:**
- The edge function returns text summary
- Client uses browser `SpeechSynthesis` API with the appropriate language voice
- Fallback: For Capacitor native builds, use the same `SpeechSynthesis` API (supported on both Android and iOS WebView)
- This is consistent across web and mobile without requiring a third-party TTS service

**Why not server-side audio generation:**
- Browser SpeechSynthesis is free, instant, and works offline
- Server-side TTS would require an API key and add latency
- The AI generates the translated text; the browser reads it aloud
- If server-side TTS is later needed, the architecture supports swapping in ElevenLabs

---

## Step 7: UI Changes

### 7A: Worker Registration Sheet (`WorkerRegistrationSheet.tsx`)

Add a "Preferred Language" dropdown between Name/Phone and Category/Type sections:

- Fetch languages from `supported_languages` table (query with `is_active = true`, ordered by `display_order`)
- Display `native_name` in the dropdown (e.g., "हिन्दी", "தமிழ்")
- Default to `'hi'` (Hindi)
- Store selected code in `preferred_language` column on insert
- Add to validation schema

### 7B: Create Job Request Page (`CreateJobRequestPage.tsx`)

Add scope selection section after the Urgency field:

1. **Visibility Scope** -- two tappable cards:
   - "Within My Society" (default, icon: Building)
   - "Expand to Nearby Societies" (icon: Globe)

2. **Nearby Society Selector** (shown only when "nearby" is selected):
   - Call `get_nearby_societies` RPC to fetch nearby societies with distances
   - Display as a checkbox list: "Society Name (X.X km)"
   - Resident selects which societies to broadcast to
   - Store selected IDs in `target_society_ids`
   - If no nearby societies found, show "No nearby societies within range"

3. **Insert mutation** updated to include `visibility_scope` and `target_society_ids`

### 7C: Worker Jobs Page (`WorkerJobsPage.tsx`)

- Remove `.eq('society_id', effectiveSocietyId)` -- let RLS handle filtering
- Add origin badge on each job card:
  - Green badge: "Your Society" (when `job.society_id === effectiveSocietyId`)
  - Blue badge: "Society Name" (for cross-society jobs, fetched via join)
- Add **"Listen" button** (Volume2 icon) on each job card:
  - On tap: calls `generate-job-voice-summary` edge function with job data + worker's preferred language
  - Shows loading spinner while generating
  - Uses browser `speechSynthesis.speak()` to read the returned text
  - Button toggles to "Stop" while playing
- Join `societies` table to get society name for display
- Update realtime subscription to remove society filter (RLS handles it)

### 7D: My Workers Page (`MyWorkersPage.tsx`)

- Add a summary card at the top showing count: "3 workers assigned to your flat"
- Display worker name from `skills.name` field (currently shows `worker_type` only)

### 7E: Job Acceptance Notification Enhancement

When `accept_worker_job` RPC succeeds, the trigger inserts a notification to the resident containing:

```text
Title: "Worker Accepted Your Job!"
Body: "[Worker Name] from [Society Name] accepted your [job_type] request"
Payload: {
  worker_name, worker_photo_url, worker_phone,
  worker_society, worker_rating, worker_total_jobs
}
```

The resident's in-app notification and push notification will display this structured worker profile summary.

---

## Step 8: Validation Schema Updates (`validation-schemas.ts`)

Update `jobRequestSchema`:

```text
visibility_scope: z.enum(['society', 'nearby']).default('society'),
target_society_ids: z.array(z.string().uuid()).default([]),
```

Add validation: if `visibility_scope === 'nearby'`, `target_society_ids` must have at least 1 entry.

Update `workerRegistrationSchema`:

```text
preferredLanguage: z.string().min(2).max(10).default('hi'),
```

---

## Step 9: Security Enforcement Summary

| Layer | Enforcement |
|---|---|
| Job visibility (SELECT) | RLS: own society OR society in `target_society_ids` |
| Job creation (INSERT) | RLS: `society_id = get_user_society_id(auth.uid())` (unchanged) |
| Job acceptance | RPC: validates worker's society against scope + target list |
| Feature gate (UI) | `FeatureGate` with `worker_marketplace` on all pages |
| Feature gate (RLS) | `can_access_feature('worker_marketplace')` on write policies |
| Language config | Admin-only write, public read |
| TTS cache | System-only write (service role), public read |
| Nearby societies | Server-side RPC with distance validation |

No worker outside the selected target societies can see or accept the job. RLS is the primary gate, not the UI.

---

## File Changes Summary

| File | Change |
|---|---|
| New migration SQL | `supported_languages` table, `preferred_language` column, `visibility_scope` + `target_society_ids` columns, `job_tts_cache` table, `get_nearby_societies` RPC, `notify_workers_on_job_posted` trigger, updated `accept_worker_job` RPC, RLS policies |
| `src/components/workforce/WorkerRegistrationSheet.tsx` | Add preferred language dropdown |
| `src/pages/CreateJobRequestPage.tsx` | Add scope selector + nearby society checklist |
| `src/pages/WorkerJobsPage.tsx` | Remove society filter, add origin badge, add Listen button with TTS |
| `src/pages/MyWorkersPage.tsx` | Add worker count summary, show worker name |
| `supabase/functions/generate-job-voice-summary/index.ts` | Add language parameter, caching, society context |
| `src/lib/validation-schemas.ts` | Add `visibility_scope`, `target_society_ids`, `preferredLanguage` |
| `src/hooks/useWorkerRole.ts` | Include `preferred_language` in worker profile select |

---

## Edge Cases

- **No nearby societies found**: UI shows "No nearby societies within range" and disables the nearby option
- **Society without coordinates**: excluded from nearby results (handled by `WHERE latitude IS NOT NULL`)
- **Worker in multiple societies**: RLS uses `get_user_society_id` (primary society); worker sees jobs from their primary society + any jobs targeting it
- **TTS language not supported by browser**: falls back to default voice; the text summary is still displayed visually
- **Job expires**: existing `expires_at` column handles this; expired jobs filtered out of worker feed
- **Admin adds new language**: immediately available in registration dropdown (live query)

