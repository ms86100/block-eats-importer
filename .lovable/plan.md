

# AI Auto-Review Cron System (Background, Non-Breaking)

## Approach
Add a **background edge function** (`ai-auto-review`) that runs every minute via `pg_cron`. It picks up pending/draft sellers and products, sends them to Lovable AI (gemini-3-flash-preview) for evaluation, and updates their status. The existing manual admin approval flow remains completely untouched.

## New Database Table: `ai_review_log`

Append-only audit log for every AI decision.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| target_type | text | 'seller' or 'product' |
| target_id | uuid | |
| decision | text | 'approved', 'rejected', 'flagged' |
| confidence | numeric(4,3) | 0-1 |
| reason | text | Human-readable |
| rule_hits | jsonb | Deterministic rules that fired |
| input_snapshot | jsonb | Full data sent to AI |
| model_used | text | |
| society_id | uuid | |
| created_at | timestamptz | |

RLS: Platform admins can SELECT. No INSERT/UPDATE/DELETE from client — only service role writes.

## Edge Function: `ai-auto-review`

**Trigger:** Called every minute by `pg_cron` + `pg_net`.

**Logic:**
1. Fetch up to 10 sellers with `verification_status = 'pending'` that have NO entry in `ai_review_log` (not yet reviewed)
2. Fetch up to 20 products with `approval_status IN ('pending', 'draft')` that have NO entry in `ai_review_log`
3. For each item, apply **deterministic rules first**:
   - Missing name/category → reject
   - Price negative or zero (for add_to_cart items) → reject
   - Seller has no products → flag (don't reject — they might add later)
4. If rules don't produce a hard decision, call **Lovable AI** (gemini-3-flash-preview) with tool calling to get structured `{decision, confidence, reason}`
5. Apply threshold: confidence >= 0.85 → auto-approve, <= 0.30 → reject, between → leave as pending (admin can review)
6. Update `verification_status` / `approval_status` accordingly
7. When seller is approved, cascade: set all their `draft`/`pending` products to `approved` (matching existing admin behavior)
8. Log every decision to `ai_review_log`

**AI Prompt:** System prompt includes platform rules (Indian marketplace, category alignment, prohibited items). Uses tool calling for structured output — no JSON parsing risk.

## Cron Schedule (SQL insert, not migration)

```sql
SELECT cron.schedule(
  'ai-auto-review-cron',
  '* * * * *',
  $$ SELECT net.http_post(
    url := 'https://rvvctaikytfeyzkwoqxg.supabase.co/functions/v1/ai-auto-review',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <anon_key>"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id; $$
);
```

## Admin Visibility: AI Review Log Tab

New component `AdminAIReviewLog` added as a tab in the admin panel. Shows:
- All AI decisions with target name, decision badge, confidence %, reason
- Filterable by decision type and target type
- Links to the seller/product for manual override if needed
- Admin can still use existing approve/reject buttons (manual override)

## Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/functions/ai-auto-review/index.ts` | Create — edge function |
| `supabase/config.toml` | Add `[functions.ai-auto-review]` entry |
| Migration SQL | Create `ai_review_log` table + RLS + indexes |
| Cron SQL (insert tool) | Schedule the cron job |
| `src/components/admin/AdminAIReviewLog.tsx` | Create — audit log viewer |
| `src/pages/AdminPage.tsx` (or equivalent admin tabs) | Add AI Review Log tab |

## What Is NOT Changed

- `useSellerApplication.ts` — untouched
- `useSellerProducts.ts` — untouched
- `SellerApplicationReview.tsx` — untouched
- `AdminProductApprovals.tsx` — untouched
- All existing manual approval buttons and flows remain as-is
- Seller onboarding flow remains identical

## Risk Mitigation

- Items already reviewed by AI (logged in `ai_review_log`) are skipped — no double processing
- If AI call fails, item stays pending — no auto-reject on error
- Admin can always override by using existing approve/reject buttons
- Rate limit: batch size capped at 10 sellers + 20 products per minute

