

# OTP Phone Verification via n8n Webhooks

## Overview

Build an OTP verification system where the backend generates and stores OTPs, triggers n8n webhooks for message delivery (WhatsApp/SMS), and verifies OTPs on the backend. The messaging provider is fully swappable.

## Database Changes (1 migration)

**Table: `phone_otp_verifications`**

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid | References profiles, nullable (guest OTP) |
| phone_number | text NOT NULL | E.164 format |
| otp_hash | text NOT NULL | SHA-256 hashed OTP |
| expires_at | timestamptz NOT NULL | |
| status | text | `pending`, `verified`, `expired`, `exhausted` |
| attempt_count | int default 0 | |
| max_attempts | int default 5 | |
| created_at | timestamptz | |
| verified_at | timestamptz | |

RLS: service-role only (edge function access). No direct client access.

**System settings rows** (insert via data tool):
- `otp_length` → `4`
- `otp_expiry_minutes` → `5`
- `otp_max_attempts` → `5`
- `otp_resend_cooldown_seconds` → `30`
- `otp_message_template` → `Your verification code is {OTP}. This code will expire in {expiry_minutes} minutes. Do not share this code with anyone.`
- `n8n_otp_webhook_url` → (empty, admin configures)
- `n8n_otp_enabled` → `false`

## New Edge Function: `otp-verify`

Single function with `action` query param:

### `action=send` (authenticated)
1. Validate phone number (E.164 regex)
2. Rate limit: 3 OTP sends per phone per 5 minutes
3. Check resend cooldown (30s since last OTP for same phone)
4. Read config from `system_settings` (length, expiry, template)
5. Generate cryptographic OTP, hash with SHA-256, store in `phone_otp_verifications`
6. If `n8n_otp_enabled` is true and webhook URL configured, POST to n8n webhook:
   ```json
   { "phone_number": "+91...", "otp_code": "1234", "user_type": "buyer", "message": "Your verification code is 1234...", "expiry_minutes": 5 }
   ```
7. Return `{ success: true, expires_in_seconds: 300, resend_after_seconds: 30 }`

### `action=verify` (authenticated)
1. Look up latest `pending` OTP for phone number
2. Check expiry, attempt count
3. Increment attempt_count
4. Constant-time compare OTP hash
5. If valid: mark `verified`, update `profiles.phone_verified = true` (add column if missing)
6. If exhausted: mark `exhausted`
7. Return `{ verified: true/false, error?: string }`

### `action=resend` (authenticated)
1. Check cooldown
2. If existing OTP not expired, resend same OTP via webhook
3. If expired, generate new OTP
4. Same webhook call as `send`

## Secret Required

**`N8N_OTP_WEBHOOK_SECRET`** — Optional HMAC secret for signing webhook payloads to n8n. Will prompt user to add this when they configure their n8n workflow.

The n8n webhook URL itself is stored in `system_settings` (not as a secret) so admins can change it from the UI.

## Frontend Components

### `src/components/auth/PhoneOtpVerification.tsx`
- Phone input with country code
- "Send OTP" button with cooldown timer
- 4-digit OTP input (using existing `InputOTP` component)
- "Verify" button
- "Resend OTP" with countdown
- Success/error states

### `src/components/admin/OtpSettings.tsx`
- Configure OTP length, expiry, max attempts, cooldown
- Set n8n webhook URL
- Toggle n8n OTP delivery on/off
- Test send button
- Uses `system_settings` table

## Integration Points

- The edge function calls n8n via HTTP POST — n8n workflow handles actual WhatsApp/SMS delivery
- No direct dependency on any messaging provider in the codebase
- Swapping from n8n to WhatsApp Business API later = change the HTTP call in `otp-verify`

## Files to Create/Modify

1. **Migration SQL** — `phone_otp_verifications` table + `phone_verified` column on profiles
2. **Data insert** — system_settings rows for OTP config
3. **New** `supabase/functions/otp-verify/index.ts`
4. **New** `src/components/auth/PhoneOtpVerification.tsx`
5. **New** `src/components/admin/OtpSettings.tsx`
6. **Edit** admin settings page — add OTP configuration section
7. **Edit** `supabase/config.toml` — register `otp-verify` function

