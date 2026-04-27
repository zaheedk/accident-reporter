/**
 * Offline-aware Supabase mutation helper.
 *
 * Behaviour:
 *  • Online → writes directly to Supabase (and returns the response).
 *  • Offline (or write fails with a network error) → enqueues the mutation
 *    in IndexedDB so it replays automatically on reconnect.
 *
 * Last-write-wins: replayed writes simply overwrite whatever the server has.
 */
import { supabase } from '@/integrations/supabase/client';
import { enqueueMutation } from '@/lib/offline-queue';
import { isOnline, runSync } from '@/lib/sync-engine';

type AnyRecord = Record<string, unknown>;

function isNetworkError(err: unknown): boolean {
  if (!err) return false;
  const msg = (err as any)?.message ?? String(err);
  return /Failed to fetch|NetworkError|network|offline|ECONN|timeout/i.test(msg);
}

export async function offlineInsert(table: string, payload: AnyRecord) {
  if (!isOnline()) {
    await enqueueMutation({ table, op: 'insert', payload });
    return { queued: true as const };
  }
  const { data, error } = await (supabase.from as any)(table).insert(payload).select();
  if (error && isNetworkError(error)) {
    await enqueueMutation({ table, op: 'insert', payload });
    return { queued: true as const };
  }
  if (error) throw error;
  return { data };
}

export async function offlineUpdate(table: string, payload: AnyRecord, match: AnyRecord) {
  if (!isOnline()) {
    await enqueueMutation({ table, op: 'update', payload, match });
    return { queued: true as const };
  }
  let q: any = (supabase.from as any)(table).update(payload);
  for (const [k, v] of Object.entries(match)) q = q.eq(k, v);
  const { error } = await q;
  if (error && isNetworkError(error)) {
    await enqueueMutation({ table, op: 'update', payload, match });
    return { queued: true as const };
  }
  if (error) throw error;
  // Trigger a drain in case other queued items are waiting
  void runSync();
  return { ok: true as const };
}

export async function offlineUpsert(table: string, payload: AnyRecord) {
  if (!isOnline()) {
    await enqueueMutation({ table, op: 'upsert', payload });
    return { queued: true as const };
  }
  const { error } = await (supabase.from as any)(table).upsert(payload);
  if (error && isNetworkError(error)) {
    await enqueueMutation({ table, op: 'upsert', payload });
    return { queued: true as const };
  }
  if (error) throw error;
  return { ok: true as const };
}

export async function offlineDelete(table: string, match: AnyRecord) {
  if (!isOnline()) {
    await enqueueMutation({ table, op: 'delete', match });
    return { queued: true as const };
  }
  let q: any = (supabase.from as any)(table).delete();
  for (const [k, v] of Object.entries(match)) q = q.eq(k, v);
  const { error } = await q;
  if (error && isNetworkError(error)) {
    await enqueueMutation({ table, op: 'delete', match });
    return { queued: true as const };
  }
  if (error) throw error;
  return { ok: true as const };
}
