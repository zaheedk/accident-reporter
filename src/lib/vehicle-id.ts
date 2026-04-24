import { supabase } from '@/integrations/supabase/client';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolves a route param (either a UUID vehicle id or an 8-char slug)
 * into the canonical UUID id. Returns null if not found.
 */
export async function resolveVehicleId(param: string | undefined | null): Promise<string | null> {
  if (!param) return null;
  if (UUID_RE.test(param)) return param;
  const { data } = await supabase
    .from('vehicles')
    .select('id')
    .eq('slug', param.toUpperCase())
    .maybeSingle();
  return (data as any)?.id ?? null;
}

/** Preferred URL slug for a vehicle — slug when present, else id. */
export function vehicleSlug(vehicle: { id: string; slug?: string | null }): string {
  return vehicle.slug || vehicle.id;
}

export function isUuid(value: string | undefined | null): boolean {
  return !!value && UUID_RE.test(value);
}
