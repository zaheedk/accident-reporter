import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, Play, Pause, Trash2, Loader2, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Recording {
  id: string;
  fileName: string;
  url: string;
  durationSeconds: number | null;
  createdAt: string;
  notes: string | null;
}

interface CallRecorderProps {
  claimId: string;
  compact?: boolean;
}

export default function CallRecorder({ claimId, compact = false }: CallRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingRecordings, setLoadingRecordings] = useState(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Load existing recordings
  useEffect(() => {
    loadRecordings();
  }, [claimId]);

  const loadRecordings = async () => {
    setLoadingRecordings(true);
    const { data } = await supabase
      .from('call_recordings')
      .select('*')
      .eq('claim_id', claimId)
      .order('created_at', { ascending: false });

    if (data) {
      const recs = await Promise.all(
        data.map(async (r: any) => {
          const { data: signedData } = await supabase.storage
            .from('call-recordings')
            .createSignedUrl(r.file_path, 3600);
          return {
            id: r.id,
            fileName: r.file_name,
            url: signedData?.signedUrl || '',
            durationSeconds: r.duration_seconds,
            createdAt: r.created_at,
            notes: r.notes,
          };
        })
      );
      setRecordings(recs);
    }
    setLoadingRecordings(false);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/webm';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        uploadRecording(blob, mimeType);
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setIsPaused(false);
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } catch (err) {
      console.error('Microphone access denied', err);
      toast.error('Microphone access is required to record calls. Please enable it in your device settings.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    setIsPaused(false);
  };

  const uploadRecording = async (blob: Blob, mimeType: string) => {
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `call-${ts}.${ext}`;
      const filePath = `${user.id}/${claimId}/${fileName}`;

      const { error: storageErr } = await supabase.storage
        .from('call-recordings')
        .upload(filePath, blob, { contentType: mimeType });
      if (storageErr) throw storageErr;

      const { error: dbErr } = await supabase.from('call_recordings').insert({
        claim_id: claimId,
        user_id: user.id,
        file_path: filePath,
        file_name: fileName,
        file_size: blob.size,
        duration_seconds: elapsed,
      });
      if (dbErr) throw dbErr;

      toast.success('Recording saved');
      loadRecordings();
    } catch (err) {
      console.error('Upload failed', err);
      toast.error('Failed to save recording');
    } finally {
      setUploading(false);
    }
  };

  const deleteRecording = async (rec: Recording) => {
    const { data: rows } = await supabase
      .from('call_recordings')
      .select('file_path')
      .eq('id', rec.id)
      .single();
    if (rows?.file_path) {
      await supabase.storage.from('call-recordings').remove([rows.file_path]);
    }
    await supabase.from('call_recordings').delete().eq('id', rec.id);
    setRecordings(prev => prev.filter(r => r.id !== rec.id));
    toast.success('Recording deleted');
  };

  const togglePlayback = (rec: Recording) => {
    if (playingId === rec.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(rec.url);
    audio.onended = () => setPlayingId(null);
    audio.play();
    audioRef.current = audio;
    setPlayingId(rec.id);
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioRef.current) audioRef.current.pause();
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="space-y-3">
      {/* Recording controls */}
      <div className="flex items-center gap-3">
        {!isRecording ? (
          <button
            onClick={startRecording}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 text-red-600 text-sm font-semibold hover:bg-red-500/20 transition-colors border border-red-500/20 active:scale-[0.98]"
          >
            <Mic className="w-4 h-4" />
            {compact ? 'Record' : 'Record Conversation'}
          </button>
        ) : (
          <>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-mono font-semibold text-red-600">{formatTime(elapsed)}</span>
            </div>
            <button
              onClick={stopRecording}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-all active:scale-[0.98]"
            >
              <Square className="w-3.5 h-3.5" />
              Stop & Save
            </button>
          </>
        )}
        {uploading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving…
          </div>
        )}
      </div>

      {/* Hint */}
      {isRecording && (
        <p className="text-xs text-muted-foreground leading-relaxed">
          💡 Put your phone on speaker to capture both sides of the conversation. The recording uses your device microphone.
        </p>
      )}

      {/* Saved recordings list */}
      {!loadingRecordings && recordings.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Saved Recordings ({recordings.length})
          </p>
          {recordings.map(rec => (
            <div
              key={rec.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-background border border-border/50"
            >
              <button
                onClick={() => togglePlayback(rec)}
                className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 hover:bg-primary/20 transition-colors"
              >
                {playingId === rec.id ? (
                  <Pause className="w-4 h-4 text-primary" />
                ) : (
                  <Play className="w-4 h-4 text-primary ml-0.5" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-foreground truncate">{rec.fileName}</p>
                <p className="text-[11px] text-muted-foreground">
                  {rec.durationSeconds != null ? formatTime(rec.durationSeconds) : '—'} ·{' '}
                  {new Date(rec.createdAt).toLocaleDateString('en-NZ', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
              <button
                onClick={() => deleteRecording(rec)}
                className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                title="Delete recording"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
