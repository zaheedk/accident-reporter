import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

interface GeoPosition {
  latitude: number;
  longitude: number;
}

/**
 * Get current position using Capacitor plugin on native, browser API on web.
 * On native, this triggers proper Android/iOS permission dialogs.
 */
export async function getCurrentPosition(options?: { enableHighAccuracy?: boolean; timeout?: number }): Promise<GeoPosition> {
  if (Capacitor.isNativePlatform()) {
    // Request permission first on native (shows native dialog)
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
