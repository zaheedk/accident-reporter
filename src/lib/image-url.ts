import { supabase } from '@/integrations/supabase/client';

/**
 * Get a public URL for a storage file with optional image transforms.
 * Supabase image transforms resize on the CDN edge for faster delivery.
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

/** Thumbnail for list views (96×96 CSS = ~200px for retina) */
export function getThumbnailUrl(bucket: string, filePath: string): string {
  return getImageUrl(bucket, filePath, { width: 200, height: 200, quality: 60 });
}

/** Medium size for detail view grids */
export function getMediumUrl(bucket: string, filePath: string): string {
  return getImageUrl(bucket, filePath, { width: 600, quality: 70 });
}

/** Full size for lightbox */
export function getFullUrl(bucket: string, filePath: string): string {
  return getImageUrl(bucket, filePath, { width: 1200, quality: 80 });
}
