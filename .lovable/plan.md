

## Fix: CreateJobRequestPage Missing Society Filter

### Problem
The `society_worker_categories` query in `CreateJobRequestPage.tsx` (lines 36-41) does not filter by `society_id`, meaning it returns categories from **all** societies. This is a data isolation bug.

### Current Code (lines 36-41)
```typescript
const { data, error } = await supabase
  .from('society_worker_categories')
  .select('name')
  .eq('is_active', true)
  .order('display_order');
```

### Fix
Add `.eq('society_id', effectiveSocietyId)` and gate the query on `effectiveSocietyId` being present:

```typescript
const { data, error } = await supabase
  .from('society_worker_categories')
  .select('name')
  .eq('society_id', effectiveSocietyId!)
  .eq('is_active', true)
  .order('display_order');
```

Also update the `enabled` condition to include `!!effectiveSocietyId` so the query doesn't fire without a society context.

### Builder Credentials
There are **no builder member credentials** to provide. The builder "Shriram Greenfield" exists and is linked to the society, but has zero members assigned. To add a member:
1. Log in as admin (`ms86100@gmail.com`)
2. Go to Features > Assignments
3. Click "Manage" on "Shriram Greenfield"
4. In the Members tab, search for a user email and add them

### Single file change
- **`src/pages/CreateJobRequestPage.tsx`** — Add `society_id` filter and `enabled` guard to the worker categories query.

