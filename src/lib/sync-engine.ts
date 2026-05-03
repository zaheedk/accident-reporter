/**
 * Sync engine — drains the offline mutation queue (last-write-wins) and
 * the queued claim photos. Triggered on:
 *   • Capacitor `App` resume (foreground on native)
 *   • window 'online' event
 *   • manual `runSync()` call after a queued write
 *
 * On failure a mutation stays in the queue for a future retry.
 */
import {
  applyMutation,
  listMutations,
  markFailed,
  removeMutation,
} from '@/lib/offline-queue';
import {
  getQueuedPhotosForUser,
  removeQueuedPhoto,
} from '@/lib/photo-queue';
import { supabase } from '@/integrations/supabase/client';

type Status = 'idle' | 'syncing' | 'offline' | 'error';
type Listener = (s: Status, pending: number) => void;

let status: Status = 'idle';
let listeners: Listener[] = [];
let inFlight = false;
let pendingCount = 0;

function emit() {
  for (const l of listeners) l(status, pendingCount);
}

export function onSyncStatus(l: Listener): () => void {
  listeners.push(l);
  l(status, pendingCount);
  return () => {
    listeners = listeners.filter((x) => x !== l);
  };
}

export function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine !== false;
}

export async function runSync(): Promise<void> {
  if (inFlight) return;
  if (!isOnline()) {
    status = 'offline';
    emit();
    return;
  }
  inFlight = true;
  status = 'syncing';
  emit();

  try {
    // 1) Drain mutation queue (FIFO, last-write-wins on conflicts)
    const muts = await listMutations();
    pendingCount = muts.length;
    emit();
    for (const m of muts) {
      try {
        await applyMutation(m);
        await removeMutation(m.id);
        pendingCount = Math.max(0, pendingCount - 1);
        emit();
      } catch (e: any) {
        const msg = e?.message ?? String(e);
        // Drop permanently-bad rows (e.g. RLS denies, unique violations) after a few tries
        await markFailed(m.id, msg);
        if ((m.attempts ?? 0) >= 5) {
          await removeMutation(m.id);
          console.warn('[sync] dropping mutation after 5 failures', m.table, msg);
        }
      }
    }

    // 2) Drain queued photos (best-effort — uploads can be large)
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    if (user) {
      const photos = await getQueuedPhotosForUser(user.id);
      for (const p of photos) {
        if (!p.claimId) continue; // wait until parent claim exists
        try {
          const path = `${p.userId}/${p.claimId}/${p.fileName}`;
          const { error: upErr } = await supabase.storage
            .from('claim-photos')
            .upload(path, p.blob, { contentType: p.fileType, upsert: true });
          if (upErr) throw upErr;
          await supabase.from('claim_photos').insert({
            claim_id: p.claimId,
            user_id: p.userId,
            file_path: path,
            file_name: p.fileName,
          });
          await removeQueuedPhoto(p.id);
        } catch (e) {
          console.warn('[sync] photo upload failed, will retry', e);
        }
      }

      // 3) Re-hydrate the offline read cache so subsequent reads see fresh data.
      try {
        const { hydrateUserData } = await import('@/lib/offline-hydrate');
        await hydrateUserData(user.id, { force: true });
      } catch (e) {
        console.warn('[sync] hydrate failed', e);
      }
    }

    status = 'idle';
    emit();
  } catch (e) {
    console.error('[sync] failed', e);
    status = 'error';
    emit();
  } finally {
    inFlight = false;
  }
}

let installed = false;
export function installSyncTriggers() {
  if (installed) return;
  installed = true;

  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => { void runSync(); });
    window.addEventListener('offline', () => {
      status = 'offline';
      emit();
    });
  }

  // Capacitor App resume — load lazily so web builds don't break
  (async () => {
    try {
      const cap = await import('@capacitor/core').catch(() => null as any);
      if (!cap?.Capacitor?.isNativePlatform?.()) return;
      const { App } = await import('@capacitor/app');
      App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) void runSync();
      });
      App.addListener('resume', () => { void runSync(); });
    } catch {
      /* not on native */
    }
  })();

  // Initial drain shortly after boot
  setTimeout(() => { void runSync(); }, 1500);
}
