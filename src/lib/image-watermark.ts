import { getCurrentPosition } from './geolocation';

/**
 * Cache of latest known location + reverse-geocoded label so each photo
 * doesn't re-trigger geolocation/network calls.
 */
let cachedLocation: { lat: number; lng: number; label: string; ts: number } | null = null;
const LOCATION_TTL_MS = 2 * 60 * 1000; // 2 minutes

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=16`
    );
    const geo = await res.json();
    const a = geo.address || {};
    const parts = [
      a.road || a.pedestrian || a.suburb,
      a.suburb && a.road ? null : a.suburb,
      a.city || a.town || a.village,
    ].filter(Boolean);
    if (parts.length) return parts.join(', ');
  } catch {
    /* ignore */
  }
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

async function getLocationLabel(): Promise<string | null> {
  const now = Date.now();
  if (cachedLocation && now - cachedLocation.ts < LOCATION_TTL_MS) {
    return cachedLocation.label;
  }
  try {
    const { latitude, longitude } = await getCurrentPosition({ timeout: 6000 });
    const label = await reverseGeocode(latitude, longitude);
    cachedLocation = { lat: latitude, lng: longitude, label, ts: now };
    return label;
  } catch {
    return null;
  }
}

function formatStamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Stamp date/time and location onto the bottom of an image.
 * Returns a new File. Falls back to the original file on any error.
 */
export async function watermarkImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;

  // Get location in parallel with image decode.
  const locationPromise = getLocationLabel();

  return new Promise<File>((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = async () => {
      URL.revokeObjectURL(url);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0);

        const locationLabel = await locationPromise;
        const stampLines = [formatStamp(new Date())];
        if (locationLabel) stampLines.push(locationLabel);

        // Scale font to image size
        const fontSize = Math.max(18, Math.round(canvas.width * 0.022));
        const padding = Math.round(fontSize * 0.6);
        const lineHeight = Math.round(fontSize * 1.2);
        const blockHeight = stampLines.length * lineHeight + padding * 2;

        // Semi-transparent background bar at the bottom
        const grad = ctx.createLinearGradient(0, canvas.height - blockHeight - 40, 0, canvas.height);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(0,0,0,0.65)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, canvas.height - blockHeight - 40, canvas.width, blockHeight + 40);

        ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.fillStyle = '#FFFFFF';
        ctx.textBaseline = 'bottom';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 4;

        let y = canvas.height - padding;
        for (let i = stampLines.length - 1; i >= 0; i--) {
          ctx.fillText(stampLines[i], padding, y);
          y -= lineHeight;
        }
        ctx.shadowBlur = 0;

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const stamped = new File(
              [blob],
              file.name.replace(/\.\w+$/, '.jpg'),
              { type: 'image/jpeg', lastModified: Date.now() }
            );
            resolve(stamped);
          },
          'image/jpeg',
          0.92
        );
      } catch {
        resolve(file);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };

    img.src = url;
  });
}
