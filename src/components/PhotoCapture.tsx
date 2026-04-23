import { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, X, Loader2, Upload, Check, CloudOff, RefreshCw } from 'lucide-react';
import { compressImage } from '@/lib/image-compress';
import { watermarkImage } from '@/lib/image-watermark';
import { supabase } from '@/integrations/supabase/client';
import {
  enqueuePhoto,
  getQueuedPhotosForUser,
  removeQueuedPhoto,
  updateQueuedPhotoClaimId,
  type QueuedPhoto,
} from '@/lib/photo-queue';
import { toast } from 'sonner';

export interface UploadedPhoto {
  id: string;
  file_path: string;
  file_name: string;
  url?: string;
}

interface PendingPhoto {
  id: string;
  previewUrl: string;
  fileName: string;
  status: 'ready' | 'uploading' | 'failed';
  error?: string;
}

interface PhotoCaptureProps {
  photos: UploadedPhoto[];
  uploading: boolean;
  ensureClaimId: () => Promise<string | undefined>;
  userId: string;
  claimId?: string;
  onUploaded: (photo: UploadedPhoto) => void;
  onRemoved: (photo: UploadedPhoto) => Promise<void> | void;
  setUploading: (v: boolean) => void;
}

export function PhotoCapture({
  photos,
  uploading,
  ensureClaimId,
  userId,
  claimId,
  onUploaded,
  onRemoved,
  setUploading,
}: PhotoCaptureProps) {
  const [pending, setPending] = useState<PendingPhoto[]>([]);
  const [online, setOnline] = useState<boolean>(typeof navigator === 'undefined' ? true : navigator.onLine);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const previewMapRef = useRef<Map<string, string>>(new Map()); // id -> object URL

  // Track online/offline
  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Hydrate any photos that were queued but never uploaded (across reloads / app restart)
  useEffect(() => {
    let cancelled = false;
    if (!userId) return;
    (async () => {
      const queued = await getQueuedPhotosForUser(userId);
      // Only show those for this claim, OR ones not yet bound to any claim
      const relevant = queued.filter(
        (q) => !q.claimId || (claimId && q.claimId === claimId)
      );
      if (cancelled || relevant.length === 0) return;
      const items: PendingPhoto[] = relevant.map((q) => {
        const url = URL.createObjectURL(q.blob);
        previewMapRef.current.set(q.id, url);
        return {
          id: q.id,
          previewUrl: url,
          fileName: q.fileName,
          status: 'ready',
        };
      });
      setPending((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        return [...prev, ...items.filter((i) => !existingIds.has(i.id))];
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, claimId]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      previewMapRef.current.forEach((url) => URL.revokeObjectURL(url));
      previewMapRef.current.clear();
    };
  }, []);

  const addFiles = async (files: FileList | null) => {
    if (!files || !userId) return;
    const newItems: PendingPhoto[] = [];
    for (const f of Array.from(files)) {
      if (f.size > 10 * 1024 * 1024) {
        toast.error(`${f.name} is too large (max 10MB)`);
        continue;
      }
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const previewUrl = URL.createObjectURL(f);
      previewMapRef.current.set(id, previewUrl);
      // Persist to IndexedDB immediately so it survives reloads / offline
      const queued: QueuedPhoto = {
        id,
        claimId: claimId || null,
        userId,
        fileName: f.name,
        fileType: f.type,
        blob: f,
        createdAt: Date.now(),
      };
      await enqueuePhoto(queued);
      newItems.push({ id, previewUrl, fileName: f.name, status: 'ready' });
    }
    if (newItems.length) setPending((prev) => [...prev, ...newItems]);
  };

  const removePending = async (id: string) => {
    const url = previewMapRef.current.get(id);
    if (url) {
      URL.revokeObjectURL(url);
      previewMapRef.current.delete(id);
    }
    await removeQueuedPhoto(id);
    setPending((prev) => prev.filter((p) => p.id !== id));
  };

  const uploadOne = async (queued: QueuedPhoto, resolvedClaimId: string): Promise<boolean> => {
    try {
      const file =
        queued.blob instanceof File
          ? await compressImage(queued.blob)
          : await compressImage(new File([queued.blob], queued.fileName, { type: queued.fileType }));
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${userId}/${resolvedClaimId}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('claim-photos').upload(path, file);
      if (upErr) throw upErr;
      const { data, error: dbErr } = await supabase
        .from('claim_photos')
        .insert({
          claim_id: resolvedClaimId,
          user_id: userId,
          file_path: path,
          file_name: file.name,
        })
        .select('id, file_path, file_name')
        .single();
      if (dbErr) throw dbErr;
      const { data: urlData } = await supabase.storage
        .from('claim-photos')
        .createSignedUrl(path, 3600);
      onUploaded({ ...(data as UploadedPhoto), url: urlData?.signedUrl || '' });
      await removeQueuedPhoto(queued.id);
      const previewUrl = previewMapRef.current.get(queued.id);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        previewMapRef.current.delete(queued.id);
      }
      return true;
    } catch (err: any) {
      console.error('Photo upload failed', err);
      return false;
    }
  };

  const uploadAll = useCallback(async () => {
    if (!userId) return;
    const queued = await getQueuedPhotosForUser(userId);
    const candidates = queued.filter((q) => !q.claimId || (claimId && q.claimId === claimId));
    if (candidates.length === 0) return;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      toast.info(`${candidates.length} photo${candidates.length > 1 ? 's' : ''} saved offline. Will upload when back online.`);
      return;
    }

    const resolvedClaimId = await ensureClaimId();
    if (!resolvedClaimId) {
      toast.error('Could not create claim — photos kept safe and will retry.');
      return;
    }

    setUploading(true);
    let okCount = 0;
    let failCount = 0;
    for (const q of candidates) {
      // Bind to claim id now that we have one
      if (!q.claimId) {
        await updateQueuedPhotoClaimId(q.id, resolvedClaimId);
        q.claimId = resolvedClaimId;
      }
      setPending((prev) => prev.map((p) => (p.id === q.id ? { ...p, status: 'uploading' } : p)));
      const ok = await uploadOne(q, resolvedClaimId);
      if (ok) {
        okCount++;
        setPending((prev) => prev.filter((p) => p.id !== q.id));
      } else {
        failCount++;
        setPending((prev) =>
          prev.map((p) => (p.id === q.id ? { ...p, status: 'failed', error: 'Upload failed' } : p))
        );
      }
    }
    setUploading(false);

    if (okCount > 0) toast.success(`${okCount} photo${okCount > 1 ? 's' : ''} uploaded`);
    if (failCount > 0) {
      toast.error(`${failCount} photo${failCount > 1 ? 's' : ''} failed — kept safe, will retry automatically.`);
    }
  }, [userId, claimId, ensureClaimId, setUploading]);

  // Auto-retry when we come back online
  useEffect(() => {
    if (!online) return;
    if (pending.length === 0) return;
    // Small debounce to let network settle
    const t = setTimeout(() => {
      uploadAll();
    }, 1500);
    return () => clearTimeout(t);
  }, [online]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalCount = photos.length + pending.length;

  return (
    <div className="space-y-3">
      {!online && pending.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/60 border border-border">
          <CloudOff className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            You're offline. {pending.length} photo{pending.length > 1 ? 's' : ''} saved on this device — they'll upload automatically when you're back online.
          </span>
        </div>
      )}

      {totalCount > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="relative aspect-square rounded-xl overflow-hidden bg-muted ring-1 ring-border shadow-sm"
            >
              <img
                src={photo.url || ''}
                alt={photo.file_name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 px-1.5 py-1 bg-gradient-to-t from-foreground/70 to-transparent flex items-center gap-1">
                <Check className="w-3 h-3 text-card" />
                <span className="text-[10px] font-medium text-card">Uploaded</span>
              </div>
              <button
                type="button"
                onClick={() => onRemoved(photo)}
                aria-label="Remove uploaded photo"
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-foreground/80 text-card flex items-center justify-center hover:bg-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {pending.map((p) => {
            const ringColor =
              p.status === 'failed'
                ? 'ring-destructive/50'
                : p.status === 'uploading'
                ? 'ring-primary/40'
                : 'ring-primary/40';
            const labelBg =
              p.status === 'failed'
                ? 'from-destructive/80'
                : 'from-primary/80';
            const labelText =
              p.status === 'failed'
                ? 'Failed — will retry'
                : p.status === 'uploading'
                ? 'Uploading…'
                : online
                ? 'Ready to upload'
                : 'Saved offline';
            return (
              <div
                key={p.id}
                className={`relative aspect-square rounded-xl overflow-hidden bg-muted ring-2 ${ringColor} shadow-sm`}
              >
                <img src={p.previewUrl} alt={p.fileName} className="w-full h-full object-cover" />
                {p.status === 'uploading' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-foreground/30">
                    <Loader2 className="w-5 h-5 animate-spin text-card" />
                  </div>
                )}
                <div className={`absolute inset-x-0 bottom-0 px-1.5 py-1 bg-gradient-to-t ${labelBg} to-transparent`}>
                  <span className="text-[10px] font-semibold text-primary-foreground">
                    {labelText}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removePending(p.id)}
                  aria-label="Discard pending photo"
                  disabled={p.status === 'uploading'}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-foreground/80 text-card flex items-center justify-center hover:bg-foreground transition-colors disabled:opacity-50"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          disabled={uploading}
          className="btn-secondary flex-1 h-9 gap-2 text-xs"
        >
          <Camera className="w-3.5 h-3.5" />
          Take photo
        </button>
        <button
          type="button"
          onClick={() => galleryRef.current?.click()}
          disabled={uploading}
          className="btn-secondary flex-1 h-9 gap-2 text-xs"
        >
          <span>📁</span>
          Gallery
        </button>
      </div>

      {pending.length > 0 && (
        <button
          type="button"
          onClick={uploadAll}
          disabled={uploading}
          className="btn-primary w-full h-10 gap-2 text-xs font-semibold"
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : pending.some((p) => p.status === 'failed') ? (
            <RefreshCw className="w-4 h-4" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          {uploading
            ? `Uploading ${pending.length} photo${pending.length > 1 ? 's' : ''}...`
            : pending.some((p) => p.status === 'failed')
            ? `Retry — ${pending.length} photo${pending.length > 1 ? 's' : ''}`
            : `Done — Upload ${pending.length} photo${pending.length > 1 ? 's' : ''}`}
        </button>
      )}

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
