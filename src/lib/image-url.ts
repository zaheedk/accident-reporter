import { supabase } from '@/integrations/supabase/client';

/**
 * Get a signed URL for a private storage file.
 * Signed URLs expire after the given duration (default 300s / 5 min).
 */
export async function getSignedUrl(
  bucket: string,
  filePath: string,
  expiresIn = 300
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(filePath, expiresIn);
  if (error || !data?.signedUrl) {
    console.error('Failed to get signed URL:', error);
    return '';
  }
  return data.signedUrl;
}

/**
 * Get a signed URL with image transforms for private buckets.
 */
export async function getTransformedSignedUrl(
  bucket: string,
  filePath: string,
  options?: { width?: number; height?: number; quality?: number },
  expiresIn = 300
): Promise<string> {
  // Try with transforms first
  if (options) {
    const { data } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn, {
        transform: {
          width: options.width,
          height: options.height,
          quality: options.quality ?? 75,
        },
      });
    if (data?.signedUrl) {
      // Verify the transform endpoint actually serves the image (some plans don't support transforms)
      try {
        const head = await fetch(data.signedUrl, { method: 'HEAD' });
        if (head.ok) return data.signedUrl;
      } catch {
        /* fall through to plain signed URL */
      }
    }
  }
  // Fallback: plain signed URL (no transforms)
  const { data: plain, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(filePath, expiresIn);
  if (error || !plain?.signedUrl) {
    console.error('Failed to get signed URL:', error);
    return '';
  }
  return plain.signedUrl;
}

/**
 * Get a public URL for a storage file with optional image transforms.
 * Use only for PUBLIC buckets (avatars, downloads, vehicle-photos, etc.)
 */
export function getImageUrl(
  bucket: string,
  filePath: string,
  options?: { width?: number; height?: number; quality?: number }
): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath, {
    transform: options ? {
      width: options.width,
      height: options.height,
      quality: options.quality ?? 75,
    } : undefined,
  });
  return data?.publicUrl || '';
}

/** Thumbnail signed URL for list views */
export async function getThumbnailUrl(bucket: string, filePath: string): Promise<string> {
  return getTransformedSignedUrl(bucket, filePath, { width: 200, height: 200, quality: 60 });
}

/** Medium signed URL for detail view grids */
export async function getMediumUrl(bucket: string, filePath: string): Promise<string> {
  return getTransformedSignedUrl(bucket, filePath, { width: 600, quality: 70 });
}

/** Full size signed URL for lightbox */
export async function getFullUrl(bucket: string, filePath: string): Promise<string> {
  return getTransformedSignedUrl(bucket, filePath, { width: 1200, quality: 80 });
}
