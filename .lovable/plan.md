

## Auto-Activate Societies on Creation

### Problem
When a new society is created (via the `validate-society` edge function), it defaults to `is_active: false` and `is_verified: false`, requiring manual admin activation. This causes sellers in new societies to have broken profiles until an admin notices.

### Fix

**File: `supabase/functions/validate-society/index.ts`**

Change line 72 from:
```
is_active: false,
```
to:
```
is_active: true,
```

This single-line change ensures every newly created society is immediately active. The `is_verified` field remains `false` so admins can still distinguish verified vs. unverified societies if needed for trust/badge purposes, but the society will function normally from day one.

### Scope
One file, one line changed. No database migration needed.

