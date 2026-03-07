import { useEffect, useState, useCallback, useContext, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { IdentityContext } from '@/contexts/auth/contexts';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { hapticNotification } from '@/lib/haptics';
import { pushLog, setLogUser, flushPushLogs } from '@/lib/pushLogger';

/**
 * BUILD FINGERPRINT — if the device logs this, the bundle is current.
 */
export const PUSH_BUILD_ID = '2026-03-07-FIREBASE-MESSAGING-V2';

type RegistrationState = 'idle' | 'registering' | 'registered' | 'failed';

/**
 * Lazily import @capacitor-firebase/messaging — avoids top-level import on web.
 */
async function getFirebaseMessaging() {
  try {
    const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');
    return FirebaseMessaging;
  } catch (e) {
    console.warn('[Push] @capacitor-firebase/messaging not available:', e);
    return null;
  }
}

// Module-level singleton guard
let activeInstanceId = 0;

/**
 * INTERNAL: Full hook with all side effects. Only called by PushNotificationProvider.
 *
 * Uses @capacitor-firebase/messaging which returns unified FCM tokens on both
 * iOS and Android — no APNs-to-FCM conversion needed.
 */
export function usePushNotificationsInternal() {
  const [token, setToken] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const identity = useContext(IdentityContext);
  const user = identity?.user ?? null;
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  console.log(`[Push][BUILD] BUILD_ID=${PUSH_BUILD_ID} | platform=${Capacitor.getPlatform()} | isNative=${Capacitor.isNativePlatform()} | userId=${user?.id ?? 'null'}`);

  const userRef = useRef(user);
  userRef.current = user;
  const tokenRef = useRef(token);
  tokenRef.current = token;
  const regStateRef = useRef<RegistrationState>('idle');

  // ── Set log user ──
  useEffect(() => {
    if (user?.id) setLogUser(user.id);
    else setLogUser(null);
  }, [user?.id]);

  // ── Save token to DB via RPC ──
  const saveTokenToDb = useCallback(async (fcmToken: string) => {
    const currentUser = userRef.current;
    if (!currentUser?.id) {
      pushLog('warn', 'SAVE_TOKEN_NO_USER', { token: fcmToken.substring(0, 20) });
      return;
    }

    const platform = Capacitor.getPlatform();
    pushLog('info', 'SAVING_TOKEN', { userId: currentUser.id, platform, token: fcmToken.substring(0, 20) });

    try {
      const { error } = await supabase.rpc('claim_device_token', {
        p_user_id: currentUser.id,
        p_token: fcmToken,
        p_platform: platform,
      });

      if (error) {
        pushLog('error', 'CLAIM_TOKEN_RPC_ERROR', { error: error.message });
        // Fallback: direct upsert
        await supabase.from('device_tokens').upsert(
          { user_id: currentUser.id, token: fcmToken, platform, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,token' }
        );
        pushLog('info', 'FALLBACK_UPSERT_OK');
      } else {
        pushLog('info', 'CLAIM_TOKEN_OK');
      }

      await flushPushLogs();
    } catch (e) {
      pushLog('error', 'SAVE_TOKEN_EXCEPTION', { error: String(e) });
    }
  }, []);

  // ── Core registration logic ──
  const registerPush = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return;
    if (regStateRef.current === 'registering') return;
    regStateRef.current = 'registering';

    pushLog('info', 'REGISTER_START');

    try {
      const FM = await getFirebaseMessaging();
      if (!FM) {
        pushLog('error', 'PLUGIN_NOT_AVAILABLE');
        regStateRef.current = 'failed';
        return;
      }

      // Check current permission
      let perm: 'granted' | 'denied' | 'prompt' = 'prompt';
      try {
        const permResult = await FM.checkPermissions();
        perm = permResult.receive as 'granted' | 'denied' | 'prompt';
      } catch (e) {
        pushLog('warn', 'CHECK_PERMISSIONS_ERROR', { error: String(e) });
        // Don't update permissionStatus on error — keep as 'prompt'
        regStateRef.current = 'idle';
        return;
      }

      setPermissionStatus(perm);
      pushLog('info', 'PERMISSION_CHECK', { status: perm });

      if (perm !== 'granted') {
        pushLog('info', 'PERMISSION_NOT_GRANTED_SKIP_TOKEN', { status: perm });
        regStateRef.current = 'idle';
        return;
      }

      // Get FCM token (unified on both platforms)
      const tokenResult = await FM.getToken();
      const fcmToken = tokenResult.token;
      pushLog('info', 'GOT_TOKEN', { token: fcmToken?.substring(0, 20), length: fcmToken?.length });

      if (fcmToken && fcmToken.length > 20) {
        setToken(fcmToken);
        tokenRef.current = fcmToken;
        regStateRef.current = 'registered';
        await saveTokenToDb(fcmToken);
      } else {
        pushLog('error', 'INVALID_TOKEN', { token: fcmToken });
        regStateRef.current = 'failed';
      }
    } catch (e) {
      pushLog('error', 'REGISTER_EXCEPTION', { error: String(e) });
      regStateRef.current = 'failed';
    }
  }, [saveTokenToDb]);

  // ── Request full permission (called from banner / settings) ──
  const requestFullPermission = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return;

    pushLog('info', 'REQUEST_FULL_PERMISSION');

    const FM = await getFirebaseMessaging();
    if (!FM) {
      pushLog('error', 'PLUGIN_NOT_AVAILABLE_FOR_PERMISSION');
      return;
    }

    const result = await FM.requestPermissions();
    const perm = result.receive as 'granted' | 'denied' | 'prompt';
    setPermissionStatus(perm);
    pushLog('info', 'PERMISSION_RESULT', { status: perm });

    if (perm === 'granted') {
      regStateRef.current = 'idle'; // Allow re-registration
      await registerPush();
    }
  }, [registerPush]);

  // ── Remove token from DB (for logout) ──
  const removeTokenFromDatabase = useCallback(async () => {
    const currentToken = tokenRef.current;
    if (!currentToken) return;

    try {
      await supabase.from('device_tokens').delete().eq('token', currentToken);
      pushLog('info', 'TOKEN_REMOVED_FROM_DB');
    } catch (e) {
      pushLog('error', 'TOKEN_REMOVE_ERROR', { error: String(e) });
    }

    setToken(null);
    tokenRef.current = null;
    regStateRef.current = 'idle';
  }, []);

  // ── Main effect: setup listeners + register on login ──
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const instanceId = ++activeInstanceId;
    pushLog('info', 'EFFECT_INIT', { instanceId, userId: user?.id ?? null });

    let cleanupListeners: (() => void)[] = [];

    const setup = async () => {
      const FM = await getFirebaseMessaging();
      if (!FM || instanceId !== activeInstanceId) return;

      // Listen for token refreshes
      const tokenListener = await FM.addListener('tokenReceived', async (event) => {
        if (instanceId !== activeInstanceId) return;
        const newToken = event.token;
        pushLog('info', 'TOKEN_REFRESHED', { token: newToken?.substring(0, 20) });

        if (newToken && newToken.length > 20) {
          setToken(newToken);
          tokenRef.current = newToken;
          regStateRef.current = 'registered';
          await saveTokenToDb(newToken);
        }
      });
      cleanupListeners.push(() => tokenListener.remove());

      // Listen for foreground notifications
      const fgListener = await FM.addListener('notificationReceived', (event) => {
        if (instanceId !== activeInstanceId) return;
        const notification = event.notification;
        pushLog('info', 'FOREGROUND_NOTIFICATION', {
          title: notification?.title,
          body: notification?.body,
        });
        hapticNotification('success');
        toast(notification?.title ?? 'New Notification', {
          description: notification?.body,
        });
      });
      cleanupListeners.push(() => fgListener.remove());

      // Listen for notification taps
      const tapListener = await FM.addListener('notificationActionPerformed', (event) => {
        if (instanceId !== activeInstanceId) return;
        const data = event.notification?.data as Record<string, string> | undefined;
        pushLog('info', 'NOTIFICATION_TAP', { data });

        if (data?.route) {
          navigateRef.current(data.route);
        }
      });
      cleanupListeners.push(() => tapListener.remove());

      // If user is logged in, register
      if (user?.id) {
        await registerPush();
      }
    };

    setup();

    // Re-register on app resume
    let appListener: any = null;
    (async () => {
      try {
        const { App } = await import('@capacitor/app');
        appListener = await App.addListener('appStateChange', ({ isActive }) => {
          if (isActive && instanceId === activeInstanceId && userRef.current?.id) {
            pushLog('info', 'APP_RESUME_REGISTER');
            registerPush();
          }
        });
      } catch {}
    })();

    return () => {
      pushLog('info', 'EFFECT_CLEANUP', { instanceId });
      cleanupListeners.forEach((fn) => fn());
      appListener?.remove?.();
    };
  }, [user?.id, registerPush, saveTokenToDb]);

  return {
    token,
    permissionStatus,
    registerPushNotifications: registerPush,
    requestFullPermission,
    removeTokenFromDatabase,
  };
}
