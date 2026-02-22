

## Fix: Profile Insert Fails Due to Race Condition with validate-society Edge Function

### Root Cause

The `validate-society` edge function calls `adminClient.auth.admin.updateUserById()` which modifies the user's metadata server-side. This happens **between** `signUp()` and `profiles.insert()` on the client. The server-side user modification can invalidate or desync the client's JWT, causing `auth.uid()` to fail the RLS check `id = auth.uid()` on the profiles insert.

Database logs confirm every failed signup shows: `new row violates row-level security policy for table "profiles"`.

### Timeline of the Bug

```text
1. signUp()                        --> user created, JWT issued
2. validate-society edge function  --> adminClient.auth.admin.updateUserById() 
                                       modifies user metadata, can invalidate JWT
3. profiles.insert()               --> auth.uid() returns null or mismatches
                                       --> RLS VIOLATION
4. profileError is silently ignored --> user sees "signup successful"
5. On login, no profile found      --> "account setup incomplete" error
```

### Fix (2 changes)

**Change 1: Move validate-society call AFTER profile insert (AuthPage.tsx ~lines 293-329)**

Reorder the signup flow so the profile is inserted first (while the JWT is still fresh), and the validate-society call happens after:

```text
1. signUp()           --> JWT issued
2. profiles.insert()  --> works because JWT is fresh, auth.uid() matches
3. user_roles.insert()
4. validate-society   --> updates metadata (JWT invalidation no longer matters)
```

**Change 2: Handle profileError explicitly (already in the approved plan)**

If the profile insert still fails for any reason (duplicate phone, etc.), catch it, sign out the orphaned auth user, and show a clear error -- instead of silently proceeding.

**Change 3: Remove the redundant updateUserById from validate-society edge function**

The edge function currently updates both `profiles.society_id` AND `auth.user_metadata.society_id`. Since the profile insert in AuthPage already sets `society_id`, the edge function only needs to validate/create the society and return the ID. Remove the profile update and metadata update from the edge function to eliminate the race condition entirely.

### Files Changed

1. **`src/pages/AuthPage.tsx`** (lines 293-346): Reorder to insert profile first, then call validate-society. Add explicit profileError handling.
2. **`supabase/functions/validate-society/index.ts`**: Remove the `profiles.update` and `auth.admin.updateUserById` calls that cause the race condition. The function should only validate/create societies and return the ID.

### Why This Keeps Recurring

The Supabase client SDK caches the JWT from `signUp()`. When `updateUserById()` is called server-side, the client's cached JWT can become stale. The RLS check `auth.uid()` uses the JWT, so if it's stale or invalidated, the check fails. Moving the profile insert before any server-side user modifications avoids this entirely.
