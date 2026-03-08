import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const E164_REGEX = /^\+[1-9]\d{6,14}$/;

// Constant-time string comparison
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

async function sha256(message: string): Promise<string> {
  const data = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateOtp(length: number): string {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  const max = Math.pow(10, length);
  return String(arr[0] % max).padStart(length, "0");
}

async function getSettings(
  supabase: ReturnType<typeof createClient>
): Promise<Record<string, string>> {
  const keys = [
    "otp_length",
    "otp_expiry_minutes",
    "otp_max_attempts",
    "otp_resend_cooldown_seconds",
    "otp_message_template",
    "n8n_otp_webhook_url",
    "n8n_otp_enabled",
  ];
  const { data } = await supabase
    .from("system_settings")
    .select("key, value")
    .in("key", keys);
  const map: Record<string, string> = {};
  for (const row of data || []) {
    if (row.key && row.value) map[row.key] = row.value;
  }
  return map;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (!["send", "verify", "resend"].includes(action || "")) {
      return json({ error: "Invalid action. Use send, verify, or resend." }, 400);
    }

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser(token);
    if (authError || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    // Service-role client for OTP table access (no RLS policies)
    const admin = createClient(supabaseUrl, supabaseServiceKey);
    const settings = await getSettings(admin);

    const otpLength = parseInt(settings.otp_length || "4", 10);
    const expiryMinutes = parseInt(settings.otp_expiry_minutes || "5", 10);
    const maxAttempts = parseInt(settings.otp_max_attempts || "5", 10);
    const cooldownSeconds = parseInt(settings.otp_resend_cooldown_seconds || "30", 10);
    const messageTemplate =
      settings.otp_message_template ||
      "Your verification code is {OTP}. This code will expire in {expiry_minutes} minutes. Do not share this code with anyone.";
    const n8nEnabled = settings.n8n_otp_enabled === "true";
    const n8nWebhookUrl = settings.n8n_otp_webhook_url || "";

    const body = await req.json().catch(() => ({}));
    const phoneNumber = (body.phone_number || "").trim();

    if (!phoneNumber || !E164_REGEX.test(phoneNumber)) {
      return json({ error: "Invalid phone number. Use E.164 format (e.g. +919876543210)." }, 400);
    }

    // ─── SEND ───
    if (action === "send") {
      // Rate limit: 3 sends per phone per 5 minutes
      const rl = await checkRateLimit(`otp:send:${phoneNumber}`, 3, 300);
      if (!rl.allowed) return rateLimitResponse(corsHeaders);

      // Check cooldown
      const { data: recent } = await admin
        .from("phone_otp_verifications")
        .select("created_at")
        .eq("phone_number", phoneNumber)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (recent) {
        const elapsed = (Date.now() - new Date(recent.created_at).getTime()) / 1000;
        if (elapsed < cooldownSeconds) {
          return json({
            error: `Please wait ${Math.ceil(cooldownSeconds - elapsed)} seconds before requesting again.`,
            resend_after_seconds: Math.ceil(cooldownSeconds - elapsed),
          }, 429);
        }
      }

      const otp = generateOtp(otpLength);
      const otpHash = await sha256(otp);
      const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString();

      await admin.from("phone_otp_verifications").insert({
        user_id: user.id,
        phone_number: phoneNumber,
        otp_hash: otpHash,
        expires_at: expiresAt,
        max_attempts: maxAttempts,
        status: "pending",
      });

      // Send via n8n if enabled
      let deliveryStatus = "skipped";
      if (n8nEnabled && n8nWebhookUrl) {
        const message = messageTemplate
          .replace("{OTP}", otp)
          .replace("{expiry_minutes}", String(expiryMinutes));

        try {
          const webhookPayload: Record<string, unknown> = {
            phone_number: phoneNumber,
            otp_code: otp,
            user_type: "user",
            message,
            expiry_minutes: expiryMinutes,
          };

          // HMAC signing if secret configured
          const hmacSecret = Deno.env.get("N8N_OTP_WEBHOOK_SECRET");
          const headers: Record<string, string> = { "Content-Type": "application/json" };
          if (hmacSecret) {
            const key = await crypto.subtle.importKey(
              "raw",
              new TextEncoder().encode(hmacSecret),
              { name: "HMAC", hash: "SHA-256" },
              false,
              ["sign"]
            );
            const sig = await crypto.subtle.sign(
              "HMAC",
              key,
              new TextEncoder().encode(JSON.stringify(webhookPayload))
            );
            headers["X-Webhook-Signature"] = Array.from(new Uint8Array(sig))
              .map((b) => b.toString(16).padStart(2, "0"))
              .join("");
          }

          const resp = await fetch(n8nWebhookUrl, {
            method: "POST",
            headers,
            body: JSON.stringify(webhookPayload),
          });
          deliveryStatus = resp.ok ? "sent" : "failed";
        } catch (e) {
          console.error("n8n webhook error:", e);
          deliveryStatus = "failed";
        }
      }

      return json({
        success: true,
        expires_in_seconds: expiryMinutes * 60,
        resend_after_seconds: cooldownSeconds,
        delivery_status: deliveryStatus,
      });
    }

    // ─── VERIFY ───
    if (action === "verify") {
      const otpCode = (body.otp_code || "").trim();
      if (!otpCode) return json({ error: "OTP code is required." }, 400);

      const { data: record } = await admin
        .from("phone_otp_verifications")
        .select("*")
        .eq("phone_number", phoneNumber)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!record) {
        return json({ verified: false, error: "No pending OTP found. Please request a new one." }, 400);
      }

      // Check expiry
      if (new Date(record.expires_at) < new Date()) {
        await admin
          .from("phone_otp_verifications")
          .update({ status: "expired" })
          .eq("id", record.id);
        return json({ verified: false, error: "OTP has expired. Please request a new one." }, 400);
      }

      // Check attempts
      if (record.attempt_count >= record.max_attempts) {
        await admin
          .from("phone_otp_verifications")
          .update({ status: "exhausted" })
          .eq("id", record.id);
        return json({ verified: false, error: "Too many attempts. Please request a new OTP." }, 400);
      }

      // Increment attempt
      await admin
        .from("phone_otp_verifications")
        .update({ attempt_count: record.attempt_count + 1 })
        .eq("id", record.id);

      const inputHash = await sha256(otpCode);
      if (!timingSafeEqual(inputHash, record.otp_hash)) {
        const remaining = record.max_attempts - record.attempt_count - 1;
        if (remaining <= 0) {
          await admin
            .from("phone_otp_verifications")
            .update({ status: "exhausted" })
            .eq("id", record.id);
        }
        return json({
          verified: false,
          error: `Incorrect OTP. ${remaining > 0 ? remaining + " attempts remaining." : "No attempts remaining."}`,
        }, 400);
      }

      // Success — mark verified
      await admin
        .from("phone_otp_verifications")
        .update({ status: "verified", verified_at: new Date().toISOString() })
        .eq("id", record.id);

      // Update profile phone_verified
      await admin
        .from("profiles")
        .update({ phone_verified: true })
        .eq("id", user.id);

      return json({ verified: true });
    }

    // ─── RESEND ───
    if (action === "resend") {
      // Check cooldown
      const { data: latest } = await admin
        .from("phone_otp_verifications")
        .select("*")
        .eq("phone_number", phoneNumber)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (latest) {
        const elapsed = (Date.now() - new Date(latest.created_at).getTime()) / 1000;
        if (elapsed < cooldownSeconds) {
          return json({
            error: `Please wait ${Math.ceil(cooldownSeconds - elapsed)} seconds.`,
            resend_after_seconds: Math.ceil(cooldownSeconds - elapsed),
          }, 429);
        }
      }

      // Rate limit
      const rl = await checkRateLimit(`otp:send:${phoneNumber}`, 3, 300);
      if (!rl.allowed) return rateLimitResponse(corsHeaders);

      let otp: string;
      let otpHash: string;
      let expiresAt: string;

      // Reuse existing OTP if not expired, otherwise generate new
      if (latest && latest.status === "pending" && new Date(latest.expires_at) > new Date()) {
        // We can't recover the OTP from hash, so generate a new one and update
        otp = generateOtp(otpLength);
        otpHash = await sha256(otp);
        expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString();

        await admin
          .from("phone_otp_verifications")
          .update({ otp_hash: otpHash, expires_at: expiresAt, attempt_count: 0 })
          .eq("id", latest.id);
      } else {
        otp = generateOtp(otpLength);
        otpHash = await sha256(otp);
        expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString();

        await admin.from("phone_otp_verifications").insert({
          user_id: user.id,
          phone_number: phoneNumber,
          otp_hash: otpHash,
          expires_at: expiresAt,
          max_attempts: maxAttempts,
          status: "pending",
        });
      }

      // Send via n8n
      let deliveryStatus = "skipped";
      if (n8nEnabled && n8nWebhookUrl) {
        const message = messageTemplate
          .replace("{OTP}", otp)
          .replace("{expiry_minutes}", String(expiryMinutes));

        try {
          const webhookPayload: Record<string, unknown> = {
            phone_number: phoneNumber,
            otp_code: otp,
            user_type: "user",
            message,
            expiry_minutes: expiryMinutes,
          };

          // [BUG FIX] Add HMAC signing for resend (was missing, unlike send action)
          const headers: Record<string, string> = { "Content-Type": "application/json" };
          const hmacSecret = Deno.env.get("N8N_OTP_WEBHOOK_SECRET");
          if (hmacSecret) {
            const key = await crypto.subtle.importKey(
              "raw",
              new TextEncoder().encode(hmacSecret),
              { name: "HMAC", hash: "SHA-256" },
              false,
              ["sign"]
            );
            const sig = await crypto.subtle.sign(
              "HMAC",
              key,
              new TextEncoder().encode(JSON.stringify(webhookPayload))
            );
            headers["X-Webhook-Signature"] = Array.from(new Uint8Array(sig))
              .map((b) => b.toString(16).padStart(2, "0"))
              .join("");
          }

          const resp = await fetch(n8nWebhookUrl, {
            method: "POST",
            headers,
            body: JSON.stringify(webhookPayload),
          });
          deliveryStatus = resp.ok ? "sent" : "failed";
        } catch (e) {
          console.error("n8n webhook error:", e);
          deliveryStatus = "failed";
        }
      }

      return json({
        success: true,
        expires_in_seconds: expiryMinutes * 60,
        resend_after_seconds: cooldownSeconds,
        delivery_status: deliveryStatus,
      });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error("otp-verify error:", error);
    return json({ error: "Internal server error" }, 500);
  }
});
