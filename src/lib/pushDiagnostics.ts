import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

export interface DiagnosticResult {
  step: string;
  ok: boolean;
  detail: string;
}

/**
 * Run a full diagnostic check of the push notification chain.
 * Uses the proven dual-plugin architecture:
 * - @capacitor/push-notifications for permissions + registration
 * - @capacitor-community/fcm for FCM token on iOS
 */
export async function runPushDiagnostics(userId?: string): Promise<DiagnosticResult[]> {
  const results: DiagnosticResult[] = [];
  const platform = Capacitor.getPlatform();

  // 1. Platform check
  const isNative = Capacitor.isNativePlatform();
  results.push({
    step: '1. Platform',
    ok: isNative,
    detail: isNative ? `Native (${platform})` : `Web — push not supported`,
  });
  if (!isNative) return results;

  // 2. PushNotifications plugin
  let PN: any = null;
  try {
    const mod = await import('@capacitor/push-notifications');
    PN = mod.PushNotifications;
    results.push({ step: '2. PushNotifications plugin', ok: true, detail: 'Loaded (@capacitor/push-notifications)' });
  } catch (e) {
    results.push({ step: '2. PushNotifications plugin', ok: false, detail: String(e) });
    return results;
  }

  // 2b. FCM plugin (iOS only)
  if (platform === 'ios') {
    try {
      const fcmMod = await import('@capacitor-community/fcm');
      results.push({ step: '2b. FCM plugin', ok: true, detail: 'Loaded (@capacitor-community/fcm)' });
    } catch (e) {
      results.push({ step: '2b. FCM plugin', ok: false, detail: String(e) });
    }
  }

  // 3. Permission status
  try {
    const perm = await PN.checkPermissions();
    const granted = perm.receive === 'granted';
    let extraDetail = `receive: ${perm.receive}`;
    if (!granted) {
      const isDenied = perm.receive === 'denied';
      extraDetail += ` | ${isDenied ? 'User previously denied — must enable in Settings' : 'OS prompt never shown — user must tap Turn On'}`;
    }
    results.push({ step: '3. Permission', ok: granted, detail: extraDetail });
  } catch (e: any) {
    results.push({ step: '3. Permission', ok: false, detail: `checkPermissions() threw: ${e?.message ?? String(e)}` });
  }

  // 4. FCM Token (via @capacitor-community/fcm on iOS, already in registration on Android)
  let runtimeFcmToken: string | null = null;
  if (platform === 'ios') {
    try {
      const { FCM } = await import('@capacitor-community/fcm');
      const tokenResult = await FCM.getToken();
      const tok = tokenResult.token;
      const valid = tok && tok.length > 20;
      if (valid) runtimeFcmToken = tok;
      results.push({
        step: '4. FCM Token (iOS)',
        ok: !!valid,
        detail: valid
          ? `Token: ${tok.substring(0, 20)}… (${tok.length} chars)`
          : `Invalid or empty: ${tok?.substring(0, 20) ?? 'null'}`,
      });
    } catch (e) {
      results.push({ step: '4. FCM Token (iOS)', ok: false, detail: String(e) });
    }
  } else {
    results.push({ step: '4. FCM Token', ok: true, detail: 'Android — token from registration event' });
  }

  // 5. device_tokens in DB
  if (userId) {
    try {
      const { data, error } = await supabase
        .from('device_tokens')
        .select('id, token, platform, updated_at, apns_token')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false, nullsFirst: false });
      if (error) throw error;
      const count = data?.length ?? 0;
      const hasApns = data?.some((r) => !!r.apns_token);
      results.push({
        step: '5. device_tokens in DB',
        ok: count > 0,
        detail: `${count} token(s) found${count > 0 ? ` — latest: ${data![0].platform}, apns_token: ${hasApns ? 'YES' : 'NO'}` : ''}`,
      });

      if (runtimeFcmToken) {
        const match = data?.some((row) => row.token === runtimeFcmToken);
        results.push({
          step: '5b. Runtime FCM token matches DB',
          ok: !!match,
          detail: match ? 'Runtime FCM token is persisted' : 'Runtime FCM token NOT in DB',
        });
      }
    } catch (e) {
      results.push({ step: '5. device_tokens in DB', ok: false, detail: String(e) });
    }
  } else {
    results.push({ step: '5. device_tokens in DB', ok: false, detail: 'No userId — skipped' });
  }

  // 6. Queue test notification
  if (userId && runtimeFcmToken) {
    try {
      const { data: insertData, error } = await supabase.from('notification_queue').insert({
        user_id: userId,
        title: '🔔 Push Diagnostics',
        body: 'If you see this, push notifications are working!',
        payload: { type: 'diagnostic' },
        status: 'pending',
      }).select('id').single();

      if (error) {
        results.push({ step: '6. Test notification', ok: false, detail: `Insert failed: ${error.message}` });
      } else {
        results.push({ step: '6. Test notification', ok: true, detail: `Queued (id: ${insertData?.id?.substring(0, 8)}…)` });
      }
    } catch (e: any) {
      results.push({ step: '6. Test notification', ok: false, detail: `Exception: ${e?.message ?? String(e)}` });
    }
  } else {
    results.push({
      step: '6. Test notification',
      ok: false,
      detail: !userId ? 'No userId — skipped' : 'No runtime token — fix registration first',
    });
  }

  return results;
}

/** Pretty-print diagnostics to console. */
export function printDiagnostics(results: DiagnosticResult[]): void {
  console.group('🔔 Push Notification Diagnostics');
  for (const r of results) {
    const icon = r.ok ? '✅' : '❌';
    console.log(`${icon} ${r.step}: ${r.detail}`);
  }
  console.groupEnd();
}
