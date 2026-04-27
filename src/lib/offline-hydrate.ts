/**
 * Offline hydration — on first login (and on every app foreground / network
 * reconnect) this prefetches the user's data into IndexedDB so the app can
 * read everything locally afterwards (local-first).
 *
 * Photos and dashcam videos are NOT downloaded as binaries here — only their
 * metadata rows. The actual files remain in Supabase Storage and are fetched
 * on demand via signed URLs (cached by the browser/native HTTP cache).
 *
 * Refresh strategy: local-first, background refresh. Reads in `storage.ts`
 * return the cached copy immediately and `hydrateUserData` keeps it fresh.
 */
import { supabase } from '@/integrations/supabase/client';
import { setCache } from '@/lib/offline-cache';
import { isOnline } from '@/lib/sync-engine';

let hydrating: Promise<void> | null = null;
let lastHydratedUserId: string | null = null;
let lastHydratedAt = 0;

const MIN_REHYDRATE_INTERVAL_MS = 30 * 1000; // throttle rapid refreshes

export function getLastHydratedAt(): number {
  return lastHydratedAt;
}

/**
 * Fetches a "snapshot" of the user's data and writes each slice to the
 * offline cache under the same keys read by `storage.ts` and the directory
 * pages. Safe to call repeatedly — concurrent calls share one promise.
 */
export async function hydrateUserData(
  userId: string,
  opts?: { force?: boolean }
): Promise<void> {
  if (!userId) return;
  if (!isOnline()) return;

  if (
    !opts?.force &&
    lastHydratedUserId === userId &&
    Date.now() - lastHydratedAt < MIN_REHYDRATE_INTERVAL_MS
  ) {
    return;
  }
  if (hydrating) return hydrating;

  hydrating = (async () => {
    try {
      // Fetch every per-user slice in parallel. Errors on a single slice are
      // logged but don't abort the whole hydration.
      const results = await Promise.allSettled([
        // Profile
        supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
        // Vehicles (used by storage.ts → key: vehicles:<uid>)
        supabase.from('vehicles').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        // Claims (key: claims:<uid>)
        supabase.from('claims').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        // Claim photos metadata
        supabase.from('claim_photos').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        // Third-party photos metadata
        supabase.from('tp_photos').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        // Claim messages
        supabase.from('claim_messages').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        // Dashcam videos metadata
        supabase.from('dashcam_videos').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        // Documents metadata
        supabase.from('user_documents').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        // Notifications
        supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(200),
        // Call recordings metadata
        supabase.from('call_recordings').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        // Public directories — small, read-mostly
        supabase.from('insurance_companies').select('*').order('name'),
        supabase.from('panel_shops').select('*').order('name'),
        supabase.from('tow_companies').select('*').order('name'),
      ]);

      const [
        profile,
        vehicles,
        claims,
        claimPhotos,
        tpPhotos,
        claimMessages,
        dashcam,
        documents,
        notifications,
        callRecordings,
        insurers,
        panelShops,
        towCompanies,
      ] = results;

      // Helper: only persist on success with data
      const persist = async (key: string, settled: PromiseSettledResult<any>) => {
        if (settled.status !== 'fulfilled') return;
        const { data, error } = settled.value as { data: unknown; error: unknown };
        if (error) return;
        await setCache(key, data ?? []);
      };

      await Promise.all([
        persist(`profile:${userId}`, profile),
        persist(`vehicles:${userId}`, vehicles),
        persist(`claims:${userId}`, claims),
        persist(`claim_photos:${userId}`, claimPhotos),
        persist(`tp_photos:${userId}`, tpPhotos),
        persist(`claim_messages:${userId}`, claimMessages),
        persist(`dashcam_videos:${userId}`, dashcam),
        persist(`user_documents:${userId}`, documents),
        persist(`notifications:${userId}`, notifications),
        persist(`call_recordings:${userId}`, callRecordings),
        persist(`insurance_companies:all`, insurers),
        persist(`panel_shops:all`, panelShops),
        persist(`tow_companies:all`, towCompanies),
      ]);

      lastHydratedUserId = userId;
      lastHydratedAt = Date.now();
    } catch (e) {
      console.warn('[hydrate] failed', e);
    } finally {
      hydrating = null;
    }
  })();

  return hydrating;
}

export function resetHydration() {
  lastHydratedUserId = null;
  lastHydratedAt = 0;
}
