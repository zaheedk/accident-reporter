/**
 * Offline write queue (last-write-wins).
 *
 * Mutations against Supabase tables are recorded in IndexedDB while offline,
 * then replayed in FIFO order when the device reconnects (see sync-engine.ts).
 * Writes go straight to the cloud when already online — the queue still
 * persists them briefly so a sudden disconnect mid-flight doesn't drop them.
 */
import { supabase } from '@/integrations/supabase/client';

const DB_NAME = 'savo_offline_queue';
const DB_VERSION = 1;
const STORE = 'mutations';

export type QueueOp = 'insert' | 'update' | 'upsert' | 'delete';

export interface QueuedMutation {
  id: string;                       // ulid-ish
  table: string;                    // e.g. 'vehicles'
  op: QueueOp;
  payload?: Record<string, unknown>;
  match?: Record<string, unknown>;  // eq filter for update/delete
  createdAt: number;
  attempts: number;
  lastError?: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function enqueueMutation(
  m: Omit<QueuedMutation, 'id' | 'createdAt' | 'attempts'>,
): Promise<string> {
  const id = uid();
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put({
        ...m,
        id,
        createdAt: Date.now(),
        attempts: 0,
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* swallow — queue best effort */
  }
  return id;
}

export async function listMutations(): Promise<QueuedMutation[]> {
  try {
    const db = await openDB();
    return await new Promise<QueuedMutation[]>((resolve) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => {
        const all = (req.result as QueuedMutation[]) || [];
        all.sort((a, b) => a.createdAt - b.createdAt);
        resolve(all);
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function removeMutation(id: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    /* ignore */
  }
}

export async function markFailed(id: string, err: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const req = store.get(id);
      req.onsuccess = () => {
        const existing = req.result as QueuedMutation | undefined;
        if (existing) {
          existing.attempts += 1;
          existing.lastError = err.slice(0, 500);
          store.put(existing);
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    /* ignore */
  }
}

/** Apply a single queued mutation to Supabase. */
export async function applyMutation(m: QueuedMutation): Promise<void> {
  // Cast to any to keep the queue table-agnostic; callers pass typed payloads upstream.
  const tbl = (supabase.from as any)(m.table);
  let q: any;
  if (m.op === 'insert') q = tbl.insert(m.payload);
  else if (m.op === 'upsert') q = tbl.upsert(m.payload);
  else if (m.op === 'update') {
    q = tbl.update(m.payload);
    for (const [k, v] of Object.entries(m.match ?? {})) q = q.eq(k, v);
  } else if (m.op === 'delete') {
    q = tbl.delete();
    for (const [k, v] of Object.entries(m.match ?? {})) q = q.eq(k, v);
  } else throw new Error(`unknown op ${m.op}`);

  const { error } = await q;
  if (error) throw error;
}
