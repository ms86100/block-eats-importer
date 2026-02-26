## Diagnosis: Login Spinner Hanging on Native iOS

### What I verified (facts, not guesses)


| Layer          | Evidence                                                              | Result                      |
| -------------- | --------------------------------------------------------------------- | --------------------------- |
| Auth backend   | 4 login attempts, all returned HTTP 200 in 90-360ms                   | Working perfectly           |
| Database       | Profile for `348e9393...` exists with `verification_status: approved` | Working perfectly           |
| RPC            | `get_user_auth_context` returns full profile, roles, society          | Working perfectly           |
| Auth logs      | No errors, no failures, no rejections                                 | Clean                       |
| Postgres logs  | No errors, only routine connections                                   | Clean                       |
| Timing pattern | Attempts at 12:05:10, 12:05:47, 12:06:21, 12:06:53 (~30-40s apart)    | Matches 20s timeout + retry |


### Root cause identification

The backend is not the problem. The auth API succeeds in <400ms every time. The 20-second safety timer in `handleLogin` fires, which means one of the `await` calls AFTER `signInWithPassword` is hanging on native iOS.

The login flow has 3 sequential awaits:

```text
Step 1: await signInWithPassword()     → auth API returns 200 in <400ms
Step 2: await profiles.select().single() → REST call (should be fast)
Step 3: navigate('/') or signOut()      → sync call

One of steps 1-2 is hanging on native because Supabase JS internally
awaits capacitorStorage.setItem() during session persistence.
```

**I cannot tell you which exact line hangs without native device logs, and you confirmed you cannot provide those.** This is the honest answer.

However, I can determine the most probable cause: the Supabase JS client internally performs **multiple** storage operations during `signInWithPassword` (set session, set refresh token, remove old tokens). Each goes through `capacitorStorage` with a 3-second timeout. If the Capacitor Preferences native bridge is unresponsive (common under iOS memory pressure), these can accumulate to >20 seconds total, causing the safety timer to fire before the `finally` block clears the spinner.

### Why previous fixes failed

1. The 3-second timeout on individual `capacitorStorage` operations doesn't help if Supabase internally makes 5-7 sequential storage calls (5 x 3s = 15s, still under 20s, but add the profile query and it exceeds 20s)
2. The 20-second safety timer correctly clears the spinner but shows a misleading "connection" error when the real problem is native bridge latency

### Fix plan (3 changes)

**Change 1: Add step-by-step instrumentation to** `handleLogin` (`src/hooks/useAuthPage.ts`)

Add `console.log` with timestamps at each step of `handleLogin`. These logs will be automatically captured next time the issue occurs, giving us the exact hanging line. This is the **only way** to get device-level evidence without Xcode debug access.

```typescript
// Before signInWithPassword
console.log('[Auth:Login] Step 1: signInWithPassword start', Date.now());
const { data, error } = await supabase.auth.signInWithPassword({...});
console.log('[Auth:Login] Step 2: signInWithPassword done', Date.now());

// Before profile query  
console.log('[Auth:Login] Step 3: profile query start', Date.now());
const { data: profile } = await supabase.from('profiles')...;
console.log('[Auth:Login] Step 4: profile query done', Date.now());

// Before navigate
console.log('[Auth:Login] Step 5: navigating', Date.now());
```

**Change 2: Add a per-step timeout wrapper around the profile query** (`src/hooks/useAuthPage.ts`)

If `signInWithPassword` succeeds but the profile query hangs, we should not wait 20 seconds. Wrap the profile query in a 5-second `Promise.race` timeout. If it times out, trust that `onAuthStateChange` in `useAuthState.ts` will handle profile loading and just navigate.

```typescript
const profilePromise = supabase.from('profiles').select('*').eq('id', data.user?.id).single();
const profileResult = await Promise.race([
  profilePromise,
  new Promise(resolve => setTimeout(() => resolve({ data: null, error: 'timeout' }), 5000))
]);
```

**Change 3: Add storage operation logging to** `capacitorStorage` (`src/lib/capacitor-storage.ts`)

Add `console.log` with timestamps to `setItem` and `getItem` so we can see if the native bridge is the bottleneck:

```typescript
async setItem(key: string, value: string): Promise<void> {
  const t = Date.now();
  console.log('[CapacitorStorage] setItem start', key.substring(0, 20), t);
  // ... existing logic ...
  console.log('[CapacitorStorage] setItem done', key.substring(0, 20), Date.now() - t, 'ms');
}
```

### What this achieves

- **No speculative fixes** — the instrumentation will capture the exact hanging step
- **Per-step timeout** prevents the profile query from blocking for 20s
- **Storage logging** will confirm or rule out native bridge as the bottleneck
- After you rebuild and test on TestFlight, the next failure will produce logs that I can read directly, giving us the exact root cause line

### What this does NOT do (per your rules)

- No timeout extensions
- No UI bandaids
- No error message changes
- No assumptions about network