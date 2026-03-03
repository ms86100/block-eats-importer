

## Plan: Campaign Push Notification System

### Overview

Build a complete campaign push system with two parts: a `send-campaign` edge function for reliable delivery and an admin UI tab for composing and sending campaigns. The system reuses the proven direct APNs (iOS) and FCM v1 (Android) delivery paths already in `send-push-notification`.

### Architecture

```text
Admin UI (Campaigns tab)
  │
  ├─ Compose: title, body, data, target filter
  ├─ Preview: device count before sending
  └─ Send → supabase.functions.invoke('send-campaign')
        │
        ├─ Query device_tokens (batched, filtered)
        ├─ iOS (apns_token) → Direct APNs (.p8 JWT)
        ├─ iOS (no apns_token) → FCM v1 fallback
        ├─ Android (token) → FCM v1
        └─ Return: { targeted, sent, failed, cleaned }
```

### Database Changes

**New table: `campaigns`** — stores campaign history for audit and analytics.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| title | text | Campaign title |
| body | text | Campaign body |
| data | jsonb | Deep-link payload |
| target_platform | text | `all`, `ios`, `android` |
| target_user_ids | uuid[] | Empty = everyone |
| target_society_id | uuid | null = all societies |
| sent_by | uuid FK profiles | Admin who sent |
| status | text | `sending`, `completed`, `failed` |
| targeted_count | int | Devices targeted |
| sent_count | int | Successfully delivered |
| failed_count | int | Failed deliveries |
| cleaned_count | int | Invalid tokens removed |
| created_at | timestamptz | |
| completed_at | timestamptz | |

RLS: admin-only read/write using `has_role(auth.uid(), 'admin')`.

### Edge Function: `send-campaign/index.ts`

**Request:**
```json
{
  "title": "Flash Sale!",
  "body": "50% off for 2 hours",
  "data": { "screen": "offers", "type": "campaign" },
  "target": {
    "platform": "all",
    "user_ids": [],
    "society_id": null
  }
}
```

**Implementation:**
1. Service-role auth guard (same as `send-push-notification`)
2. Create a `campaigns` row with status `sending`
3. Query `device_tokens` with filters — if `society_id` provided, join with `profiles` to filter by society
4. Batch into chunks of 500 devices
5. For each batch, send up to 20 concurrently:
   - iOS with `apns_token` → direct APNs (ES256 JWT, `.p8` key)
   - iOS without `apns_token` → FCM v1 fallback
   - Android → FCM v1
6. Clean invalid tokens inline (APNs 410, FCM UNREGISTERED)
7. Update `campaigns` row with final counts and status `completed`
8. Return summary

**Delivery code:** Duplicated inline from `send-push-notification` (the APNs JWT signing, FCM access token generation, and send functions). Edge functions cannot share code across folders.

**Config addition:**
```toml
[functions.send-campaign]
verify_jwt = false
```

### Admin UI: Campaign Tab

**New file: `src/components/admin/CampaignSender.tsx`**

A form with:
- Title input (required)
- Body textarea (required)
- Deep-link screen selector (optional — dropdown of known routes like `offers`, `orders`, `bulletin`)
- Target platform toggle: All / iOS / Android
- Target audience: All users vs. specific society (dropdown from existing societies list)
- Preview badge showing "Will send to X devices" (live query of `device_tokens` count with filters)
- Send button with confirmation dialog ("Send to 847 devices?")
- Results display after send: sent, failed, cleaned counts
- Campaign history table below the form (last 20 campaigns from `campaigns` table)

**Integration into admin nav:**

Add to `AdminSidebarNav.tsx` under "System" group:
```
{ value: 'campaigns', label: 'Campaigns', icon: Send }
```

Add to `AdminPage.tsx`:
```
{admin.activeTab === 'campaigns' && <CampaignSender />}
```

### Security

- Edge function: service-role only (no public access)
- Admin UI: behind `AdminRoute` guard (existing)
- Database: RLS on `campaigns` table — admin read/write only
- The campaign form calls `supabase.functions.invoke('send-campaign')` which passes the user's JWT, but the edge function validates service-role. So the UI will need to use the service-role pattern — or the edge function accepts admin JWT and verifies the user has admin role before proceeding.

**Revised auth approach for admin-initiated campaigns:** The edge function will accept a regular user JWT, verify the user exists, then check `has_role(user_id, 'admin')` via a DB query before proceeding. This is safer than exposing service-role from the client.

### Secrets Required

None new. All already configured:
- `FIREBASE_SERVICE_ACCOUNT` (Android FCM)
- `APNS_KEY_P8`, `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_BUNDLE_ID` (iOS APNs)

### Files to Create/Modify

| File | Action |
|---|---|
| `supabase/functions/send-campaign/index.ts` | Create — campaign sender with batched delivery |
| `supabase/config.toml` | Add `[functions.send-campaign]` |
| `src/components/admin/CampaignSender.tsx` | Create — admin campaign UI |
| `src/components/admin/AdminSidebarNav.tsx` | Add "Campaigns" nav item |
| `src/pages/AdminPage.tsx` | Add campaigns tab rendering |
| Database migration | Create `campaigns` table with RLS |

