

## Investigation: Profile Data Loss During Signup

### Root Cause

The signup flow has a **critical RLS (Row Level Security) failure** when email confirmation is required (which is the current setting).

Here's what happens step by step:

1. User fills out all 4 signup steps (credentials → society → profile → verification)
2. `supabase.auth.signUp()` is called at line 281 — this creates the auth user but **does NOT create a session** because email is unconfirmed
3. The code immediately tries to INSERT the profile at line 322: `supabase.from('profiles').upsert({...})`
4. The `profiles` INSERT RLS policy requires `id = auth.uid()` — but **`auth.uid()` is NULL** because there's no session yet
5. The INSERT **silently fails** (RLS rejection) or the error is caught and the user is signed out
6. When the user later confirms email and logs in, no profile exists → the auto-recovery in `useAuthState.ts` creates a barebones profile from `user_metadata`, but with potentially incomplete data (e.g., `society_id` is null because it was stored as `null` for pending societies)

**Evidence**: The existing profile in the database has `society_id: NULL` and `name: Sagar` — indicating it was created by the auto-recovery fallback from `user_metadata`, not by the signup flow's proper INSERT.

### Solution

Move the profile creation to a **database trigger** that fires on `auth.users` INSERT, reading from `raw_user_meta_data`. This guarantees the profile is created atomically with the auth user, bypassing RLS entirely (since triggers run as `SECURITY DEFINER`).

### Implementation Plan

**1. Database Migration — Create `handle_new_user` trigger function**

Create a `SECURITY DEFINER` trigger on `auth.users` AFTER INSERT that:
- Reads `raw_user_meta_data` (name, phone, flat_number, block, phase, society_id)
- Inserts into `profiles` with the new user's ID
- Inserts the default `buyer` role into `user_roles`
- Handles the `auto_approve_resident` logic inline

This runs with elevated privileges, so RLS doesn't block it.

**2. Update `handleSignupComplete` in `src/hooks/useAuthPage.ts`**

- Keep the `signUp()` call with all profile data in `options.data` (user_metadata) — this is already done correctly at line 283-285
- **Remove** the manual `profiles.upsert()` call (lines 322-342) and `user_roles.insert()` call (line 344) since the trigger handles both
- Keep the pending society creation logic (validate-society edge function) but move it BEFORE `signUp()` so `society_id` in metadata is always a real UUID
- Keep error handling for duplicate email/phone

**3. Update auto-recovery in `src/contexts/auth/useAuthState.ts`**

- Keep the auto-recovery as a safety net but make it less aggressive — the trigger should handle 99% of cases
- Add a small delay before auto-recovery to allow the trigger to complete

**4. Fix the existing broken profile**

- Use the insert tool to UPDATE the existing profile (`id: 4a005c1b-...`) to set the correct `society_id` if needed

### Key Technical Details

```text
BEFORE (broken):
  signUp() → no session → profiles.upsert() FAILS (RLS) → auto-recovery creates partial profile

AFTER (fixed):
  validate-society() → signUp(metadata) → DB trigger creates profile → user confirms email → login works
```

The trigger approach is the standard Supabase pattern for profile creation and eliminates the race condition entirely.

