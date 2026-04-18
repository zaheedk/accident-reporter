import { useRef, useState } from 'react';
import { Camera, X, Loader2, Upload, Check } from 'lucide-react';
import { compressImage } from '@/lib/image-compress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface UploadedPhoto {
  id: string;
  file_path: string;
  file_name: string;
  url?: string;
}

interface PendingPhoto {
  id: string;
  file: File;
  previewUrl: string;
}

interface PhotoCaptureProps {
  photos: UploadedPhoto[];
  uploading: boolean;
  ensureClaimId: () => Promise<string | undefined>;
  userId: string;
  onUploaded: (photo: UploadedPhoto) => void;
  onRemoved: (photo: UploadedPhoto) => Promise<void> | void;
  setUploading: (v: boolean) => void;
}

export function PhotoCapture({
  photos,
  uploading,
  ensureClaimId,
  userId,
  onUploaded,
  onRemoved,
  setUploading,
}: PhotoCaptureProps) {
  const [pending, setPending] = useState<PendingPhoto[]>([]);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const next: PendingPhoto[] = [];
    Array.from(files).forEach((f) => {
      if (f.size > 10 * 1024 * 1024) {
        toast.error(`${f.name} is too large (max 10MB)`);
        return;
      }
      next.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        file: f,
        previewUrl: URL.createObjectURL(f),
      });
    });
    if (next.length) setPending((prev) => [...prev, ...next]);
  };

  const removePending = (id: string) => {
    setPending((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  };

  const uploadAll = async () => {
    if (pending.length === 0) return;
    const claimId = await ensureClaimId();
    if (!claimId) return;
    setUploading(true);
    try {
      for (const p of pending) {
        const file = await compressImage(p.file);
        const ext = file.name.split('.').pop();
        const path = `${userId}/${claimId}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
        const { error: upErr } = await supabase.storage.from('claim-photos').upload(path, file);
        if (upErr) {
          toast.error(`Failed to upload ${p.file.name}`);
          continue;
        }
        const { data } = await supabase
          .from('claim_photos')
          .insert({ claim_id: claimId, user_id: userId, file_path: path, file_name: file.name })
          .select('id, file_path, file_name')
          .single();
        if (data) {
          const { data: urlData } = await supabase.storage
            .from('claim-photos')
            .createSignedUrl(path, 3600);
          onUploaded({ ...(data as UploadedPhoto), url: urlData?.signedUrl || '' });
        }
        URL.revokeObjectURL(p.previewUrl);
      }
      setPending([]);
      toast.success('Photos uploaded');
    } finally {
      setUploading(false);
    }
  };

  const totalCount = photos.length + pending.length;

  return (
    <div className="space-y-3">
      {totalCount > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="relative aspect-square rounded-xl overflow-hidden bg-muted ring-1 ring-border shadow-sm group"
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
          {pending.map((p) => (
            <div
              key={p.id}
              className="relative aspect-square rounded-xl overflow-hidden bg-muted ring-2 ring-primary/40 shadow-sm"
            >
              <img src={p.previewUrl} alt="Pending" className="w-full h-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 px-1.5 py-1 bg-gradient-to-t from-primary/80 to-transparent">
                <span className="text-[10px] font-semibold text-primary-foreground">Ready to upload</span>
              </div>
              <button
                type="button"
                onClick={() => removePending(p.id)}
                aria-label="Discard pending photo"
                disabled={uploading}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-foreground/80 text-card flex items-center justify-center hover:bg-foreground transition-colors disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
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
          ) : (
            <Upload className="w-4 h-4" />
          )}
          {uploading
            ? `Uploading ${pending.length} photo${pending.length > 1 ? 's' : ''}...`
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
