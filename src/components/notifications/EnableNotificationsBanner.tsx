import { useEffect, useState, useRef } from 'react';
import { Bell, X, ExternalLink } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { usePushNotifications } from '@/contexts/PushNotificationContext';
import { getCachedFirebaseMessaging } from '@/hooks/usePushNotifications';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const DISMISSED_KEY = 'notif_banner_dismissed';
const GRANTED_KEY = 'notif_permission_granted';
// Tracks if user has explicitly denied after we prompted them
const DENIED_CONFIRMED_KEY = 'notif_permission_denied_confirmed';

export function EnableNotificationsBanner() {
  const { token, permissionStatus, requestFullPermission } = usePushNotifications();
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(DISMISSED_KEY) === '1'
  );
  const [loading, setLoading] = useState(false);
  const [grantedLocally, setGrantedLocally] = useState(
    () => sessionStorage.getItem(GRANTED_KEY) === '1'
  );
  // Only show "Blocked" if user has explicitly denied in this session or a prior one
  const [confirmedDenied, setConfirmedDenied] = useState(
    () => localStorage.getItem(DENIED_CONFIRMED_KEY) === '1'
  );

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    if (permissionStatus === 'granted' || !!token) {
      sessionStorage.setItem(GRANTED_KEY, '1');
      localStorage.removeItem(DENIED_CONFIRMED_KEY);
      setGrantedLocally(true);
      setConfirmedDenied(false);
      return;
    }

    // Double-check via plugin if status is ambiguous
    (async () => {
      try {
        const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');
        const result = await FirebaseMessaging.checkPermissions();
        if (result.receive === 'granted') {
          sessionStorage.setItem(GRANTED_KEY, '1');
          localStorage.removeItem(DENIED_CONFIRMED_KEY);
          setGrantedLocally(true);
          setConfirmedDenied(false);
        }
      } catch {
        // Plugin unavailable — don't show blocked banner
      }
    })();
  }, [permissionStatus, token]);

  // Not native → no banner
  if (!Capacitor.isNativePlatform()) return null;
  // Already granted → no banner
  if (permissionStatus === 'granted' || !!token || grantedLocally) return null;
  // Dismissed and not confirmed-denied → no banner
  if (dismissed && !confirmedDenied) return null;

  // ── "Notifications Blocked" variant — only when user explicitly denied ──
  if (confirmedDenied) {
    const openSettings = async () => {
      try {
        const platform = Capacitor.getPlatform();
        if (platform === 'ios') {
          const { Browser } = await import('@capacitor/browser');
          await Browser.open({ url: 'app-settings:' });
        } else {
          const { NativeSettings, AndroidSettings, IOSSettings } = await import('capacitor-native-settings');
          await NativeSettings.open({ optionIOS: IOSSettings.App, optionAndroid: AndroidSettings.AppNotification });
        }
      } catch {
        toast.error('Please go to Settings → Sociva → Notifications manually.');
      }
    };

    return (
      <div className="mx-4 mt-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 shadow-sm relative">
        <button
          onClick={() => { sessionStorage.setItem(DISMISSED_KEY, '1'); setDismissed(true); }}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-start gap-3 pr-4">
          <div className="rounded-full bg-destructive/10 p-2.5 shrink-0">
            <Bell className="h-5 w-5 text-destructive" />
          </div>
          <div className="flex-1 space-y-1">
            <h3 className="text-sm font-semibold text-foreground">Notifications Blocked</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Open Settings to enable notifications for Sociva.
            </p>
          </div>
        </div>
        <Button onClick={openSettings} variant="outline" size="sm" className="w-full mt-3 gap-2">
          <ExternalLink className="h-3.5 w-3.5" />
          Open Settings
        </Button>
      </div>
    );
  }

  // ── "Turn On" prompt variant ──
  const handleTurnOn = async () => {
    setLoading(true);
    try {
      // Use pre-cached instance to avoid breaking iOS gesture chain
      const FM = getCachedFirebaseMessaging();
      if (!FM) {
        // Fallback: try dynamic import (won't show prompt on iOS but handles edge case)
        const mod = await import('@capacitor-firebase/messaging');
        const permResult = await mod.FirebaseMessaging.requestPermissions();
        if (permResult.receive === 'granted') {
          sessionStorage.setItem(GRANTED_KEY, '1');
          localStorage.removeItem(DENIED_CONFIRMED_KEY);
          setGrantedLocally(true);
          setConfirmedDenied(false);
          try { await requestFullPermission(); } catch {}
        } else {
          localStorage.setItem(DENIED_CONFIRMED_KEY, '1');
          setConfirmedDenied(true);
        }
        return;
      }

      const permResult = await FM.requestPermissions();

      if (permResult.receive === 'granted') {
        sessionStorage.setItem(GRANTED_KEY, '1');
        localStorage.removeItem(DENIED_CONFIRMED_KEY);
        setGrantedLocally(true);
        setConfirmedDenied(false);

        try {
          await requestFullPermission();
        } catch (e) {
          console.error('[Push][Banner] requestFullPermission failed:', e);
        }
      } else {
        localStorage.setItem(DENIED_CONFIRMED_KEY, '1');
        setConfirmedDenied(true);
      }
    } catch {
      sessionStorage.setItem(DISMISSED_KEY, '1');
      setDismissed(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, '1');
    setDismissed(true);
  };

  return (
    <div className="mx-4 mt-4 rounded-2xl border bg-card p-4 shadow-sm relative">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3 pr-4">
        <div className="rounded-full bg-primary/10 p-2.5 shrink-0">
          <Bell className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 space-y-1">
          <h3 className="text-sm font-semibold text-foreground">Turn On Notifications</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Stay updated on your orders and community activity.
          </p>
        </div>
      </div>

      <Button
        onClick={handleTurnOn}
        disabled={loading}
        size="sm"
        className="w-full mt-3"
      >
        {loading ? 'Enabling…' : 'Turn On'}
      </Button>
    </div>
  );
}
