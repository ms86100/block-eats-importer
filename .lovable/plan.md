

## Plan: Fix Signup — Create Profile & Role from Frontend

### Problem
The `handle_new_user` database trigger exists as a function but **no trigger is attached** to `auth.users` (Lovable Cloud prohibits triggers on reserved schemas). After `signUp()`, no profile or role is created, causing "Account setup incomplete" and a blank homepage.

### Solution
Insert profile + buyer role **directly from the frontend** right after `signUp()` succeeds. RLS policies already permit this:
- `profiles` INSERT: `id = auth.uid()` ✓
- `user_roles` INSERT: `user_id = auth.uid() AND role = 'buyer'` ✓

### Changes

**1. `src/hooks/useAuthPage.ts` — `handleSignupComplete()`**

After `signUp()` returns `data.user`, immediately insert:

```typescript
// After signUp succeeds with data.user:
const userId = data.user.id;

// Insert profile
await supabase.from('profiles').upsert({
  id: userId,
  email,
  name: profileData.name,
  phone: `${settings.defaultCountryCode}${profileData.phone}`,
  flat_number: profileData.flat_number,
  block: profileData.block,
  phase: profileData.phase || null,
  society_id: initialSocietyId,
  verification_status: 'pending', // auto_approve_resident trigger handles upgrade
}, { onConflict: 'id' });

// Insert buyer role
await supabase.from('user_roles').upsert({
  user_id: userId,
  role: 'buyer',
}, { onConflict: 'user_id,role' });
```

This replaces the comment "Profile + role are created by the DB trigger" with actual inserts. The `upsert` with `onConflict` makes it idempotent — safe if the trigger ever gets re-attached.

Note: The `auto_approve_resident` trigger on `profiles` INSERT will still fire to auto-approve if the society has `auto_approve_residents = true`.

**2. `src/contexts/auth/useAuthState.ts` — Auto-recovery fallback**

When `fetchProfile` finds `ctx.profile === null` after all retries, instead of showing "contact support", attempt to create the profile from `session.user.user_metadata`:

```typescript
// Final fallback: create profile from user_metadata
const { data: { session } } = await supabase.auth.getSession();
const meta = session?.user?.user_metadata;
if (meta && session?.user) {
  await supabase.from('profiles').upsert({
    id: session.user.id,
    email: session.user.email || '',
    name: meta.name || 'User',
    phone: meta.phone || null,
    flat_number: meta.flat_number || '',
    block: meta.block || '',
    phase: meta.phase || null,
    society_id: meta.society_id || null,
  }, { onConflict: 'id' });
  
  await supabase.from('user_roles').upsert({
    user_id: session.user.id, role: 'buyer'
  }, { onConflict: 'user_id,role' });
  
  // Re-fetch after recovery
  setTimeout(() => fetchProfile(session.user.id), 500);
  return;
}
// Only show error if recovery is impossible
toast.error('Account setup incomplete. Please contact support.');
```

This ensures that even if the explicit insert in step 1 fails (network issue, race condition), the auth state listener will self-heal on next load.

### Files Modified
1. `src/hooks/useAuthPage.ts` — Add profile + role inserts after signUp
2. `src/contexts/auth/useAuthState.ts` — Add auto-recovery fallback

