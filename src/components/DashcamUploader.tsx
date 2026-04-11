import { useState, useEffect, useRef } from 'react';
import { Video, Upload, Trash2, Loader2, Play, X, FileVideo } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DashcamVideo {
  id: string;
  fileName: string;
  fileSize: number;
  notes: string;
  createdAt: string;
  signedUrl?: string;
}

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ACCEPTED_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];

export default function DashcamUploader({ claimId }: { claimId: string }) {
  const [videos, setVideos] = useState<DashcamVideo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadVideos = async () => {
    const { data } = await supabase
      .from('dashcam_videos')
      .select('*')
      .eq('claim_id', claimId)
      .order('created_at', { ascending: false });

    if (data) {
      const mapped: DashcamVideo[] = [];
      for (const v of data) {
        const { data: urlData } = await supabase.storage
          .from('dashcam-videos')
          .createSignedUrl(v.file_path, 3600);
        mapped.push({
          id: v.id,
          fileName: v.file_name,
          fileSize: v.file_size,
          notes: v.notes || '',
          createdAt: v.created_at,
          signedUrl: urlData?.signedUrl,
        });
      }
      setVideos(mapped);
    }
  };

  useEffect(() => { loadVideos(); }, [claimId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Please upload a video file (MP4, MOV, AVI, or WebM)');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Video must be under 100MB');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const ext = file.name.spli'.'.pop() || 'mp4';
      const filePath = `${user.id}/${claimId}/${Date.now()}.${ext}`;

      // Simulate progress for UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 5, 90));
      }, 300);

      const { error } = await supabase.storage
        .from('dashcam-videos')
        .upload(filePath, file);

      clearInterval(progressInterval);

      if (error) throw error;

      setUploadProgress(95);

      await supabase.from('dashcam_videos').insert({
        claim_id: claimId,
        user_id: user.id,
        file_path: filePath,
        file_name: file.name,
        file_size: file.size,
      });

      setUploadProgress(100);
      toast.success('Dashcam footage uploaded');
      await loadVideos();
    } catch (err: any) {
      toast.error('Upload failed: ' + (err?.message || 'Unknown error'));
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDelete = async (video: DashcamVideo) => {
    setDeleting(video.id);
    try {
      const { data: row } = await supabase
        .from('dashcam_videos')
        .select('file_path')
        .eq('id', video.id)
        .single();

      if (row) {
        await supabase.storage.from('dashcam-videos').remove([row.file_path]);
      }
      await supabase.from('dashcam_videos').delete().eq('id', video.id);
      setVideos(prev => prev.filter(v => v.id !== video.id));
      if (playingVideo === video.id) setPlayingVideo(null);
      toast.success('Video deleted');
    } catch {
      toast.error('Failed to delete video');
    } finally {
      setDeleting(null);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-3">
      {videos.map(video => (
        <div key={video.id} className="rounded-xl border border-border/50 bg-background overflow-hidden">
          {playingVideo === video.id && video.signedUrl ? (
            <div className="relative">
              <video
                src={video.signedUrl}
                controls
                autoPlay
                className="w-full max-h-64 bg-black rounded-t-xl"
              />
              <button
                onClick={() => setPlayingVideo(null)}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setPlayingVideo(video.id)}
              className="w-full h-32 bg-muted/50 flex flex-col items-center justify-center gap-2 hover:bg-muted transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Play className="w-5 h-5 text-primary ml-0.5" />
              </div>
              <span className="text-xs text-muted-foreground">Tap to play</span>
            </button>
          )}
          <div className="px-3 py-2.5 flex items-center gap-3">
            <FileVideo className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-foreground truncate">{video.fileName}</p>
              <p className="text-[11px] text-muted-foreground">
                {formatSize(video.fileSize)} · {new Date(video.createdAt).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={() => handleDelete(video)}
              disabled={deleting === video.id}
              className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
            >
              {deleting === video.id ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              ) : (
                <Trash2 className="w-4 h-4 text-destructive" />
              )}
            </button>
          </div>
        </div>
      ))}

      {uploading && (
        <div className="rounded-xl border border-border/50 bg-muted/30 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Uploading footage… {uploadProgress}%</span>
          </div>
          <div className="h-1.5 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="w-full h-20 border-2 border-dashed border-border rounded-xl flex items-center justify-center gap-2 text-muted-foreground hover:border-foreground/30 hover:text-foreground transition-colors"
      >
        <Video className="w-5 h-5" strokeWidth={1.5} />
        <span className="text-sm">Upload dashcam footage</span>
      </button>

      <input
        ref={fileRef}
        type="file"
        accept="video/mp4,video/quicktime,video/x-msvideo,video/webm"
        className="hidden"
        onChange={handleUpload}
      />
    </div>
  );
}
