import { supabase } from '@/integrations/supabase/client';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolves a route param (either a UUID claim id or an 8-char report_number)
 * into the canonical UUID id. Returns null if not found.
 */
export async function resolveClaimId(param: string | undefined): Promise<string | null> {
  if (!param) return null;
  if (UUID_RE.test(param)) return param;
  const { data } = await supabase
    .from('claims')
    .select('id')
    .eq('report_number', param.toUpperCase())
    .maybeSingle();
  return data?.id ?? null;
}

/** Preferred URL slug for a claim — report_number when present, else id. */
export function claimSlug(claim: { id: string; report_number?: string | null } | { id: string; reportNumber?: string | null }): string {
  const rn = (claim as any).report_number ?? (claim as any).reportNumber;
  return rn || claim.id;
}
