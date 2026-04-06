import { useState, useCallback } from 'react';
import { toast } from 'sonner';

const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export function useNearbySort() {
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [nearbyActive, setNearbyActive] = useState(false);
  const [locating, setLocating] = useState(false);

  const toggleNearby = useCallback(() => {
    if (nearbyActive) {
      setNearbyActive(false);
      return;
    }
    if (userLat != null) {
      setNearbyActive(true);
      return;
    }
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
        setNearbyActive(true);
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        if (err.code === 1) {
          toast.error('Location access denied. Please enable location permissions.');
        } else {
          toast.error('Could not determine your location.');
        }
      },
      { timeout: 10000 }
    );
  }, [nearbyActive, userLat]);

  const getDistance = useCallback((lat: number | null, lng: number | null): number | null => {
    if (userLat == null || userLng == null || lat == null || lng == null) return null;
    return haversineDistance(userLat, userLng, lat, lng);
  }, [userLat, userLng]);

  const formatDistance = useCallback((d: number | null): string | null => {
    if (d == null) return null;
    return d < 1 ? `${Math.round(d * 1000)}m away` : `${Math.round(d)}km away`;
  }, []);

  const sortByDistance = useCallback(<T extends { latitude?: number | null; longitude?: number | null }>(list: T[]): T[] => {
    if (!nearbyActive || userLat == null || userLng == null) return list;
    return [...list].sort((a, b) => {
      const dA = (a.latitude != null && a.longitude != null) ? haversineDistance(userLat, userLng, a.latitude, a.longitude) : Infinity;
      const dB = (b.latitude != null && b.longitude != null) ? haversineDistance(userLat, userLng, b.latitude, b.longitude) : Infinity;
      return dA - dB;
    });
  }, [nearbyActive, userLat, userLng]);

  return { nearbyActive, locating, toggleNearby, getDistance, formatDistance, sortByDistance };
}
