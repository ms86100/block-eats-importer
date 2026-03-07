import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

export interface DiagnosticResult {
  step: string;
  ok: boolean;
  detail: string;
}

/**
 * Run a full diagnostic check of the push notification chain.
 * Uses @capacitor-firebase/messaging for unified FCM token access.
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

  // 2. FirebaseMessaging plugin
  let FM: any = null;
  try {
    const mod = await import('@capacitor-firebase/messaging');
    FM = mod.FirebaseMessaging;
    results.push({ step: '2. FirebaseMessaging plugin', ok: true, detail: 'Loaded' });
  } catch (e) {
    results.push({ step: '2. FirebaseMessaging plugin', ok: false, detail: String(e) });
    return results;
  }

  // 3. Permission status
  try {
    const perm = await FM.checkPermissions();
    const granted = perm.receive === 'granted';
    let extraDetail = `receive: ${perm.receive}`;
    if (!granted) {
      const isDenied = perm.receive === 'denied';
      extraDetail += ` | ${isDenied ? 'User previously denied — must enable in Settings' : 'OS prompt never shown or was suppressed'}`;
    }
    results.push({ step: '3. Permission', ok: granted, detail: extraDetail });
  } catch (e: any) {
    results.push({ step: '3. Permission', ok: false, detail: `checkPermissions() threw: ${e?.message ?? String(e)}` });
  }

  // 4. FCM Token
  let runtimeFcmToken: string | null = null;
  try {
    const tokenResult = await FM.getToken();
    const tok = tokenResult.token;
    const valid = tok && tok.length > 20;
    if (valid) runtimeFcmToken = tok;
    results.push({
      step: '4. getToken()',
      ok: !!valid,
      detail: valid
        ? `Token: ${tok.substring(0, 20)}… (${tok.length} chars)`
        : `Invalid or empty: ${tok?.substring(0, 20) ?? 'null'}`,
    });
  } catch (e) {
    results.push({ step: '4. getToken()', ok: false, detail: String(e) });
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
      results.push({
        step: '5. device_tokens in DB',
        ok: count > 0,
        detail: `${count} token(s) found${count > 0 ? ` — latest: ${data![0].platform}` : ''}`,
      });

      if (runtimeFcmToken) {
        const match = data?.some((row) => row.token === runtimeFcmToken);
        results.push({
          step: '5b. Runtime token matches DB',
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
