

## Plan: Fix `public.payment_status` Type Error in Checkout

### Root Cause
The `create_multi_vendor_orders` function casts `_payment_status` to `public.payment_status` — a Postgres enum type that does not exist in the database. The `orders.payment_status` column is stored as `text`, so the cast fails.

### Fix
**Single database migration** — recreate `create_multi_vendor_orders` with the cast removed. Replace:
```sql
_payment_status::public.payment_status
```
with just:
```sql
_payment_status
```

The rest of the function remains identical. No frontend changes needed.

