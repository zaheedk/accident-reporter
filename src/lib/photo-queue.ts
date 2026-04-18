/**
 * IndexedDB queue for claim photos that haven't been uploaded yet.
 * Stores the raw Blob so they survive reload, app close, and offline periods.
 */

const DB_NAME = 'savo_photo_queue';
const DB_VERSION = 1;
const STORE = 'pending_photos';

export interface QueuedPhoto {
  id: string;
  claimId: string | null; // may be null until the claim is created
  userId: string;
  fileName: string;
  fileType: string;
  blob: Blob;
  createdAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('userId', 'userId', { unique: false });
        store.createIndex('claimId', 'claimId', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueuePhoto(photo: QueuedPhoto): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(photo);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* ignore */
  }
}

export async function removeQueuedPhoto(id: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* ignore */
  }
}

export async function getQueuedPhotosForUser(userId: string): Promise<QueuedPhoto[]> {
  try {
    const db = await openDB();
    return await new Promise<QueuedPhoto[]>((resolve) => {
      const tx = db.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        const all = (req.result as QueuedPhoto[]) || [];
        resolve(all.filter((p) => p.userId === userId));
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function updateQueuedPhotoClaimId(id: string, claimId: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const req = store.get(id);
      req.onsuccess = () => {
        const existing = req.result as QueuedPhoto | undefined;
        if (existing) {
          existing.claimId = claimId;
          store.put(existing);
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* ignore */
  }
}
