

## Root Cause Analysis

The problem has been fully traced. Here is exactly what happens:

### The Bug Chain

**Step 1 — Signup stores `"pending"` as society_id in auth metadata**

In `useAuthPage.ts` line 308, when a user selects a Google Places result that doesn't match an existing society, `selectedSociety` is set to a fake object with `id: 'pending'`. This gets passed to `supabase.auth.signUp()` as `data.society_id: 'pending'`, which is stored permanently in `auth.users.raw_user_meta_data`.

**Step 2 — Profile insert fails silently**

The `handleSignupComplete` function (line 317-342) tries to resolve the pending society via the `validate-society` edge function. If the edge function succeeds, `finalSocietyId` gets a real UUID. But if `selectedSociety.id` was already a real UUID (not `'pending'`), the profile insert at line 344 works fine. The problem occurs when:
- The society creation edge function fails (network timeout, rate limit, etc.)
- OR the profile insert itself fails due to a phone/email conflict
- In these cases, `signOut()` is called but the auth user already exists with `society_id: 'pending'` baked into metadata

**Step 3 — On next login, auto-recovery fails**

When the user logs in again, `useAuthState.ts` calls `get_user_auth_context` RPC which returns `{profile: null}`. The auto-recovery code (line 36-75) tries to create the profile using `meta.society_id` which is `"pending"` — not a valid UUID. The database rejects this with `invalid input syntax for type uuid: "pending"`, so the profile is never created. The user is stuck in a permanent broken state.

**Proof**: `buyer@sgrf.com` (id `88b82219-5852-4658-b7d7-0743a9540104`) has `raw_user_meta_data.society_id = "pending"` and zero rows in `profiles` table.

### Why This Can Happen Even With Correct Signup

Even when signup completes successfully and the profile is inserted, connectivity loss between the `signUp()` call and the `profiles.insert()` call creates the same orphan. There is **no database trigger** on `auth.users` to guarantee a profile row exists.

---

## Fix Plan (4 changes)

### 1. Database Migration: Add `auth.users` trigger for guaranteed profile creation

Create a `AFTER INSERT ON auth.users` trigger that automatically inserts a minimal profile row. This is the **single most important fix** — it eliminates the entire class of orphaned-user bugs regardless of client-side failures.

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _society_id uuid;
BEGIN
  -- Sanitize society_id: reject non-UUID values like "pending"
  BEGIN
    _society_id := (NEW.raw_user_meta_data->>'society_id')::uuid;
    -- Verify it actually exists
    PERFORM 1 FROM public.societies WHERE id = _society_id;
    IF NOT FOUND THEN _society_id := NULL; END IF;
  EXCEPTION WHEN OTHERS THEN
    _society_id := NULL;
  END;

  INSERT INTO public.profiles (id, email, name, phone, flat_number, block, phase, society_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'flat_number', ''),
    COALESCE(NEW.raw_user_meta_data->>'block', ''),
    NULLIF(NEW.raw_user_meta_data->>'phase', ''),
    _society_id
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'buyer')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 2. Fix `useAuthPage.ts` — Don't store `"pending"` in auth metadata

In `handleSignupComplete` (line 308), change the `society_id` in signup metadata to only pass a real UUID, never `'pending'`:

```typescript
data: {
  ...
  society_id: selectedSociety.id !== 'pending' ? selectedSociety.id : null
}
```

Also update `handleSignupComplete` (line 344) to handle the case where the trigger already created a profile — use `upsert` instead of `insert`:

```typescript
const { error: profileError } = await supabase.from('profiles').upsert({
  id: data.user.id, email, phone: ..., name: ...,
  flat_number: ..., block: ..., phase: ..., society_id: finalSocietyId,
}, { onConflict: 'id' });
```

### 3. Fix `useAuthState.ts` — Sanitize society_id in auto-recovery

In the auto-recovery fallback (line 49), sanitize `society_id`:

```typescript
society_id: meta.society_id && meta.society_id !== 'pending' 
  && /^[0-9a-f]{8}-/.test(meta.society_id) ? meta.society_id : null,
```

This is defense-in-depth; with the trigger in place, the auto-recovery path should rarely fire. But if it does, it must not crash.

### 4. Fix orphaned `buyer@sgrf.com` — Data insert

Insert the missing profile and role for the existing orphaned user:

```sql
INSERT INTO profiles (id, email, name, phone, flat_number, block, phase, society_id, verification_status)
VALUES ('88b82219-5852-4658-b7d7-0743a9540104', 'buyer@sgrf.com', 'Sagar', '+919535115316', '113', 'H', 'Phase 2', 'fc85cc98-205b-4429-a4f0-3f8a57339d69', 'approved')
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_roles (user_id, role)
VALUES ('88b82219-5852-4658-b7d7-0743a9540104', 'buyer')
ON CONFLICT (user_id, role) DO NOTHING;
```

---

## Summary of Changes

| File / Target | Change |
|---|---|
| **New migration** | `handle_new_user()` trigger on `auth.users` |
| **Data fix** | Insert profile for `buyer@sgrf.com` |
| `src/hooks/useAuthPage.ts` | Don't pass `"pending"` in metadata; use `upsert` for profile |
| `src/contexts/auth/useAuthState.ts` | Sanitize `society_id` in auto-recovery |

After these changes, profile creation is **guaranteed at the database level** regardless of client-side failures, network drops, or app crashes during signup.

