import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Trash2, Loader2, Phone, FileText, ChevronDown, Upload, Pencil, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Recording {
  id: string;
  fileName: string;
  url: string;
  durationSeconds: number | null;
  createdAt: string;
  notes: string | null;
  status: string;
  transcript: string;
  summary: string;
}

interface CallRecorderProps {
  claimId: string;
  compact?: boolean;
  insurerPhone?: string;
  userPhone?: string;
}

const ACCEPTED_AUDIO = '.mp3,.m4a,.wav,.ogg,.aac,.webm,.mp4';

export default function CallRecorder({ claimId, compact = false, insurerPhone, userPhone }: CallRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [showSpeakerConfirm, setShowSpeakerConfirm] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingRecordings, setLoadingRecordings] = useState(true);
  const [calling, setCalling] = useState(false);
  const [expandedTranscript, setExpandedTranscript] = useState<string | null>(null);
  const [editingTranscript, setEditingTranscript] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [savingTranscript, setSavingTranscript] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { loadRecordings(); }, [claimId]);

  useEffect(() => {
    const pending = recordings.some(r => ['calling', 'recording', 'transcribing'].includes(r.status));
    if (!pending) return;
    const interval = setInterval(loadRecordings, 5000);
    return () => clearInterval(interval);
  }, [recordings]);

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
          let url = '';
          if (r.file_path) {
            const { data: signedData } = await supabase.storage
              .from('call-recordings')
              .createSignedUrl(r.file_path, 3600);
            url = signedData?.signedUrl || '';
          }
          return {
            id: r.id,
            fileName: r.file_name,
            url,
            durationSeconds: r.duration_seconds,
            createdAt: r.created_at,
            notes: r.notes,
            status: r.status || 'complete',
            transcript: r.transcript || '',
            summary: r.summary || '',
          };
        })
      );
      setRecordings(recs);
    }
    setLoadingRecordings(false);
  };

  // ── Twilio Bridged Call ──
  const initiateBridgedCall = async () => {
    if (!insurerPhone || !userPhone) {
      toast.error('Phone numbers are required to initiate a bridged call.');
      return;
    }
    setCalling(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/initiate-call`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ claimId, insurerPhone, userPhone }),
        }
      );
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || 'Call failed');
      toast.success('Call initiated — answer your phone to connect to the insurer.');
      loadRecordings();
    } catch (err: any) {
      console.error('Bridged call error:', err);
      toast.error(err.message || 'Failed to initiate call');
    } finally {
      setCalling(false);
    }
  };

  // ── Mic Recording ──
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : 'audio/webm';

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
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } catch {
      toast.error('Microphone access is required. Please enable it in your device settings.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
  };

  const uploadRecording = async (blob: Blob, mimeType: string, transcribe = false) => {
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('webm') ? 'webm' : mimeType.split('/').pop()?.split(';')[0] || 'webm';
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `call-${ts}.${ext}`;
      const filePath = `${user.id}/${claimId}/${fileName}`;

      const { error: storageErr } = await supabase.storage
        .from('call-recordings')
        .upload(filePath, blob, { contentType: mimeType });
      if (storageErr) throw storageErr;

      const { data: inserted, error: dbErr } = await supabase.from('call_recordings').insert({
        claim_id: claimId,
        user_id: user.id,
        file_path: filePath,
        file_name: fileName,
        file_size: blob.size,
        duration_seconds: elapsed || null,
        status: transcribe ? 'transcribing' : 'complete',
      }).select('id').single();
      if (dbErr) throw dbErr;

      toast.success(transcribe ? 'Audio uploaded — transcribing…' : 'Recording saved');

      if (transcribe && inserted) {
        // Trigger transcription
        const { data: { session } } = await supabase.auth.getSession();
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transcribe-call`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ recordingId: inserted.id, filePath }),
        }).catch(err => console.error('Transcription trigger failed:', err));
      }

      loadRecordings();
    } catch (err) {
      console.error('Upload failed', err);
      toast.error('Failed to save recording');
    } finally {
      setUploading(false);
    }
  };

  // ── Audio File Upload ──
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      toast.error('Audio file must be under 50 MB.');
      return;
    }
    await uploadRecording(file, file.type || 'audio/mpeg', true);
    if (fileInputRef.current) fileInputRef.current.value = '';
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

  // ── Edit transcript ──
  const startEditingTranscript = (rec: Recording) => {
    setEditingTranscript(rec.id);
    setEditText(rec.transcript);
  };

  const saveTranscript = async (recId: string) => {
    setSavingTranscript(true);
    try {
      const { error } = await supabase
        .from('call_recordings')
        .update({ transcript: editText })
        .eq('id', recId);
      if (error) throw error;
      setRecordings(prev => prev.map(r => r.id === recId ? { ...r, transcript: editText } : r));
      setEditingTranscript(null);
      toast.success('Transcript updated');
    } catch {
      toast.error('Failed to save transcript');
    } finally {
      setSavingTranscript(false);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioRef.current) audioRef.current.pause();
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const statusLabel = (status: string) => {
    switch (status) {
      case 'calling': return 'Calling…';
      case 'recording': return 'In progress…';
      case 'transcribing': return 'Transcribing…';
      case 'failed': return 'Failed';
      default: return null;
    }
  };

  return (
    <div className="space-y-3">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_AUDIO}
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Bridged call button */}
      {insurerPhone && userPhone && (
        <button
          onClick={initiateBridgedCall}
          disabled={calling}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 transition-colors border border-primary/20 active:scale-[0.98] w-full"
        >
          {calling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
          {calling ? 'Connecting…' : compact ? 'Call & Record' : 'Call Insurer (Recorded & Transcribed)'}
        </button>
      )}

      {/* Manual mic recording + upload controls */}
      <div className="flex items-center gap-2 flex-wrap">
        {!isRecording ? (
          <>
            <button
              onClick={() => setShowSpeakerConfirm(true)}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-destructive/10 text-destructive text-sm font-semibold hover:bg-destructive/20 transition-colors border border-destructive/20 active:scale-[0.98]"
            >
              <Mic className="w-4 h-4" />
              {compact ? 'Record' : 'Record via Mic'}
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-semibold hover:bg-secondary/80 transition-colors border border-border active:scale-[0.98]"
            >
              <Upload className="w-4 h-4" />
              {compact ? 'Upload' : 'Upload Audio'}
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-destructive/10 border border-destructive/30">
              <span className="w-2.5 h-2.5 rounded-full bg-destructive animate-pulse" />
              <span className="text-sm font-mono font-semibold text-destructive">{formatTime(elapsed)}</span>
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

      {isRecording && (
        <p className="text-xs text-muted-foreground leading-relaxed">
          📢 Speakerphone is on — recording both sides of the conversation.
        </p>
      )}

      {/* Speakerphone confirmation dialog */}
      {showSpeakerConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowSpeakerConfirm(false)}>
          <div className="bg-background border border-border rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Phone className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Enable Speakerphone</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                To capture both sides of the conversation, please make sure your phone is on <strong className="text-foreground">speakerphone</strong> before starting the recording.
              </p>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => {
                  setShowSpeakerConfirm(false);
                  startRecording();
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors active:scale-[0.98]"
              >
                <Mic className="w-4 h-4" />
                Speakerphone is on — Start Recording
              </button>
              <button
                onClick={() => setShowSpeakerConfirm(false)}
                className="w-full px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saved recordings list */}
      {!loadingRecordings && recordings.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Saved Recordings ({recordings.length})
          </p>
          {recordings.map(rec => {
            const label = statusLabel(rec.status);
            const isProcessing = ['calling', 'recording', 'transcribing'].includes(rec.status);
            const isEditing = editingTranscript === rec.id;
            return (
              <div key={rec.id} className="rounded-xl bg-background border border-border/50 overflow-hidden">
                <div className="flex items-center gap-3 p-3">
                  {rec.url && !isProcessing ? (
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
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      {isProcessing ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : <Phone className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-foreground truncate">{rec.fileName}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {label && <span className="text-primary font-medium">{label} </span>}
                      {rec.durationSeconds != null ? formatTime(rec.durationSeconds) : '—'} ·{' '}
                      {new Date(rec.createdAt).toLocaleDateString('en-NZ', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {(rec.transcript || rec.summary) && (
                      <button
                        onClick={() => setExpandedTranscript(expandedTranscript === rec.id ? null : rec.id)}
                        className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                        title="View transcript"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteRecording(rec)}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title="Delete recording"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded transcript/summary */}
                {expandedTranscript === rec.id && (rec.transcript || rec.summary) && (
                  <div className="px-3 pb-3 pt-0 border-t border-border/40 space-y-2">
                    {rec.summary && (
                      <div className="mt-2">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-primary mb-1">Summary</p>
                        <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{rec.summary}</p>
                      </div>
                    )}
                    {rec.transcript && (
                      <div>
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => {
                              const el = document.getElementById(`transcript-${rec.id}`);
                              if (el) el.classList.toggle('hidden');
                            }}
                            className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                          >
                            Full Transcript <ChevronDown className="w-3 h-3" />
                          </button>
                          {!isEditing && (
                            <button
                              onClick={() => startEditingTranscript(rec)}
                              className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors"
                              title="Edit transcript"
                            >
                              <Pencil className="w-3 h-3" /> Edit
                            </button>
                          )}
                        </div>
                        <div id={`transcript-${rec.id}`} className="hidden mt-1 max-h-60 overflow-y-auto">
                          {isEditing ? (
                            <div className="space-y-2">
                              <textarea
                                value={editText}
                                onChange={e => setEditText(e.target.value)}
                                className="w-full min-h-[120px] text-xs leading-relaxed p-2 rounded-lg border border-border bg-muted/50 text-foreground resize-y focus:outline-none focus:ring-1 focus:ring-primary"
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => saveTranscript(rec.id)}
                                  disabled={savingTranscript}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
                                >
                                  {savingTranscript ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingTranscript(null)}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                >
                                  <X className="w-3 h-3" /> Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{rec.transcript}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
