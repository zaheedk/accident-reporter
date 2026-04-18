import { Capacitor } from '@capacitor/core';

interface GeoPosition {
  latitude: number;
  longitude: number;
}

/**
 * Get current position using Capacitor plugin on native, browser API on web.
 * On native, this triggers proper Android/iOS permission dialogs.
 * Defensive: if the native plugin isn't registered (APK built before sync),
 * throws a catchable error instead of crashing the app.
 */
export async function getCurrentPosition(options?: { enableHighAccuracy?: boolean; timeout?: number }): Promise<GeoPosition> {
  if (Capacitor.isNativePlatform()) {
    // Defensive load — if plugin missing from native build, fail gracefully
    let Geolocation: typeof import('@capacitor/geolocation').Geolocation;
    try {
      const mod = await import('@capacitor/geolocation');
      Geolocation = mod.Geolocation;
      if (!Geolocation || typeof Geolocation.checkPermissions !== 'function') {
        throw new Error('Plugin not registered');
      }
    } catch (e) {
      console.error('Geolocation plugin unavailable on native:', e);
      throw new Error('Location service is unavailable. Please update the app to the latest version.');
    }

    try {
      const permStatus = await Geolocation.checkPermissions();
      if (permStatus.location === 'denied') {
        throw new Error('Location access denied. Please enable location permissions in your device settings.');
      }
      if (permStatus.location !== 'granted') {
        const req = await Geolocation.requestPermissions();
        if (req.location !== 'granted') {
          throw new Error('Location access denied. Please enable location permissions in your device settings.');
        }
      }

      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: options?.enableHighAccuracy ?? false,
        timeout: options?.timeout ?? 10000,
      });
      return { latitude: position.coords.latitude, longitude: position.coords.longitude };
    } catch (e: any) {
      if (e?.message?.includes('denied') || e?.message?.includes('unavailable')) throw e;
      console.error('Native geolocation failed:', e);
      throw new Error('Could not determine your location.');
    }
  }

  // Web fallback — use browser geolocation API
  if (!navigator.geolocation) {
    throw new Error('Geolocation is not supported by your browser');
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => {
        if (err.code === 1) {
          reject(new Error('Location access denied. Please enable location permissions in your browser settings.'));
        } else {
          reject(new Error('Could not determine your location.'));
        }
      },
      { enableHighAccuracy: options?.enableHighAccuracy ?? false, timeout: options?.timeout ?? 10000 },
    );
  });
}
