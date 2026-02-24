import { useCallback, useMemo } from 'react';
import { Capacitor } from '@capacitor/core';

type ImpactStyle = 'light' | 'medium' | 'heavy';
type NotificationType = 'success' | 'warning' | 'error';

// Fix #19: Pre-check platform once at module level — avoids per-render overhead
const isNative = Capacitor.isNativePlatform();

// No-op for web — stable singleton reference
const noopAsync = async () => {};

const webReturn = {
  impact: noopAsync as (style?: ImpactStyle) => Promise<void>,
  notification: noopAsync as (type?: NotificationType) => Promise<void>,
  vibrate: noopAsync as (duration?: number) => Promise<void>,
  selectionChanged: noopAsync,
};

/**
 * Hook for triggering haptic feedback on native platforms.
 * On web, returns a stable singleton with no-ops (zero hook overhead).
 */
export const useHaptics = isNative ? useHapticsNative : () => webReturn;

function useHapticsNative() {
  const impact = useCallback(async (style: ImpactStyle = 'medium') => {
    try {
      const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
      const styleMap = {
        light: ImpactStyle.Light,
        medium: ImpactStyle.Medium,
        heavy: ImpactStyle.Heavy,
      };
      await Haptics.impact({ style: styleMap[style] });
    } catch (error) {
      console.error('Haptics error:', error);
    }
  }, []);

  const notification = useCallback(async (type: NotificationType = 'success') => {
    try {
      const { Haptics, NotificationType } = await import('@capacitor/haptics');
      const typeMap = {
        success: NotificationType.Success,
        warning: NotificationType.Warning,
        error: NotificationType.Error,
      };
      await Haptics.notification({ type: typeMap[type] });
    } catch (error) {
      console.error('Haptics error:', error);
    }
  }, []);

  const vibrate = useCallback(async (duration: number = 300) => {
    try {
      const { Haptics } = await import('@capacitor/haptics');
      await Haptics.vibrate({ duration });
    } catch (error) {
      console.error('Haptics error:', error);
    }
  }, []);

  const selectionChanged = useCallback(async () => {
    try {
      const { Haptics } = await import('@capacitor/haptics');
      await Haptics.selectionChanged();
    } catch (error) {
      console.error('Haptics error:', error);
    }
  }, []);

  return useMemo(() => ({ impact, notification, vibrate, selectionChanged }), [impact, notification, vibrate, selectionChanged]);
}
