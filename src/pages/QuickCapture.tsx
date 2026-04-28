import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Camera, Check, X, MapPin, Clock, Loader2,
  SkipForward, ArrowRight, Car, User as UserIcon, IdCard, Hash, AlertTriangle, Phone, Users,
  Volume2, VolumeX,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getVehicles } from '@/lib/storage';
import { Vehicle } from '@/types';
import { getCurrentPosition } from '@/lib/geolocation';
import { watermarkImage } from '@/lib/image-watermark';
import { compressImage } from '@/lib/image-compress';
import { enqueuePhoto, getQueuedPhotosForUser, removeQueuedPhoto, type QueuedPhoto } from '@/lib/photo-queue';
import { useSpeech } from '@/hooks/use-speech';

type Target =
  | { kind: 'claim' }                                           // claim_photos / claim-photos bucket
  | { kind: 'tp'; tpType: 'damage' | 'rego' | 'license' | 'driver' }; // tp_photos / tp-photos bucket

interface CaptureStep {
  key: string;
  title: string;
  hint: string;
  icon: typeof Camera;
  optional?: boolean;
  /** If undefined → this step is a form step, not a photo step */
  target?: Target;
  /** Form step renderer key */
  form?: 'other-driver-info' | 'witness-info';
}

const STEPS: CaptureStep[] = [
  { key: 'scene',             title: 'Wide shot of the scene',     hint: 'Step back. Capture the full scene — both vehicles, road, surroundings.', icon: MapPin,        target: { kind: 'claim' } },
  { key: 'own-damage',        title: 'Your vehicle damage',        hint: 'Get close to the damaged area. Take 1–2 angles if needed.',           icon: Car,             target: { kind: 'claim' } },
  { key: 'other-damage',      title: 'Other vehicle damage',       hint: 'Show the damage on the other car clearly.',                            icon: AlertTriangle,   target: { kind: 'tp', tpType: 'damage' } },
  { key: 'other-plate',       title: "Other car's number plate",   hint: 'Make sure the plate is readable — fill the frame.',                    icon: Hash,            target: { kind: 'tp', tpType: 'rego' } },
  { key: 'other-licence',     title: "Other driver's licence",     hint: 'Ask permission. Capture both sides if possible.',                       icon: IdCard,    optional: true, target: { kind: 'tp', tpType: 'license' } },
  { key: 'other-driver',      title: "Photo of the other driver license",  hint: 'Optional — only with consent.',                                         icon: UserIcon,  optional: true, target: { kind: 'tp', tpType: 'driver' } },
  { key: 'other-driver-info', title: "Other driver's details",     hint: "Quick — name, phone, rego, and insurer if you have them.",         icon: Phone,           form: 'other-driver-info' },
  { key: 'witness-info',      title: 'Witness details',            hint: 'Anyone who saw what happened? Capture their name and phone — optional but powerful.', icon: Users, optional: true, form: 'witness-info' },
];

const TP_INDEX = 0; // QuickCapture binds to first third party

export default function QuickCapture() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const vehicleIdParam = params.get('vehicleId');

  const cameraRef = useRef<HTMLInputElement>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [captures, setCaptures] = useState<Record<string, { previewUrl: string; queuedId: string }[]>>({});
  const [creating, setCreating] = useState(true);
  const [claimId, setClaimId] = useState<string | null>(null);
  const [reportNumber, setReportNumber] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [capturedAt] = useState<Date>(new Date());
  const [finishing, setFinishing] = useState(false);
  const [failedQueueIds, setFailedQueueIds] = useState<Set<string>>(new Set());
  const previewUrlsRef = useRef<string[]>([]);
  // Map queuedId -> target so we can retry uploads (e.g. on finish or when user taps retry)
  const queuedTargetsRef = useRef<Map<string, Target>>(new Map());

  // Other driver info (form step)
  const [otherDriverName, setOtherDriverName] = useState('');
  const [otherDriverPhone, setOtherDriverPhone] = useState('');
  const [otherDriverRego, setOtherDriverRego] = useState('');
  const [otherDriverInsurer, setOtherDriverInsurer] = useState('');
  const [insurerOptions, setInsurerOptions] = useState<string[]>([]);
  const [savingDriver, setSavingDriver] = useState(false);

  // Witness info (form step)
  const [witnessName, setWitnessName] = useState('');
  const [witnessPhone, setWitnessPhone] = useState('');
  const [savingWitness, setSavingWitness] = useState(false);

  const step = STEPS[stepIdx];
  const totalCaptured = Object.values(captures).reduce((n, arr) => n + arr.length, 0);

  // Voice prompts (Web Speech API) — defaults to ON, persisted in localStorage.
  const speech = useSpeech();

  // Speak the current step's title + hint whenever it changes (and on mount once init is done).
  useEffect(() => {
    if (creating) return;
    speech.speak(`${step.title}. ${step.hint}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIdx, creating, speech.enabled]);

  // Stop any speech when leaving the screen.
  useEffect(() => () => speech.stop(), [speech]);

  // Load insurer suggestions for the datalist
  useEffect(() => {
    supabase.from('insurance_companies').select('name').order('name').then(({ data }) => {
      if (data) setInsurerOptions(data.map((r: any) => r.name).filter(Boolean));
    });
  }, []);

  // Boot: load vehicles, capture GPS, create draft claim
  useEffect(() => {
    if (!user) return;
    let mounted = true;

    (async () => {
      try {
        const vs = await getVehicles(user.id);
        if (!mounted) return;
        setVehicles(vs);
        const initial = vehicleIdParam || vs[0]?.id || '';
        setSelectedVehicleId(initial);
        const initialVehicle = vs.find(v => v.id === initial);

        getCurrentPosition({ timeout: 10000 })
          .then(async ({ latitude, longitude }) => {
            if (!mounted) return;
            let address = '';
            try {
              const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
              const geo = await res.json();
              const a = geo.address || {};
              address = [a.road, a.suburb || a.city || a.town, a.state, a.country]
                .filter(Boolean).join(', ');
            } catch { /* ignore */ }
            if (mounted) setLocation({ lat: latitude, lng: longitude, address });
          })
          .catch(() => { /* user can enter later */ });

        const now = new Date();
        const incidentDate = now.toISOString().split('T')[0];
        const incidentTime = now.toTimeString().slice(0, 5);
        const { data: created, error: createErr } = await supabase
          .from('claims')
          .insert({
            user_id: user.id,
            status: 'draft',
            vehicle_id: initial,
            insurance_company: initialVehicle?.insuranceCompany || '',
            incident_date: incidentDate,
            incident_time: incidentTime,
            incident_location: '',
          })
          .select('id, report_number')
          .single();
        if (createErr) throw createErr;
        if (!mounted) return;
        setClaimId(created.id);
        setReportNumber(created.report_number);
      } catch (err: any) {
        console.error('Quick capture init failed', err);
        toast.error('Could not start capture — please try again.');
        navigate('/claims/new');
      } finally {
        if (mounted) setCreating(false);
      }
    })();

    return () => {
      mounted = false;
      previewUrlsRef.current.forEach(u => URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!claimId || !location) return;
    supabase
      .from('claims')
      .update({ incident_location: location.address || `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}` })
      .eq('id', claimId)
      .then(() => { /* fire and forget */ });
  }, [claimId, location]);

  const openCamera = () => cameraRef.current?.click();

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || !user || !claimId || !step.target) return;
    const stepKey = step.key;
    const target = step.target;
    const newCaps: { previewUrl: string; queuedId: string }[] = [];

    // Phase 1 (synchronous): create object URLs from raw files and show previews IMMEDIATELY.
    const toProcess: { id: string; file: File }[] = [];
    for (const f of Array.from(files)) {
      if (f.size > 10 * 1024 * 1024) {
        toast.error(`${f.name} is too large (max 10MB)`);
        continue;
      }
      const id = `qc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const previewUrl = URL.createObjectURL(f);
      previewUrlsRef.current.push(previewUrl);
      newCaps.push({ previewUrl, queuedId: id });
      toProcess.push({ id, file: f });
    }

    if (newCaps.length) {
      setCaptures(prev => ({ ...prev, [stepKey]: [...(prev[stepKey] || []), ...newCaps] }));
    }

    // Phase 2 (async, in background): watermark, persist to IndexedDB, upload to server.
    // The user can keep tapping & navigating while this runs.
    void (async () => {
      for (const { id, file } of toProcess) {
        try {
          const stamped = await watermarkImage(file);
          const queued: QueuedPhoto = {
            id,
            claimId,
            userId: user.id,
            fileName: `${stepKey}-${stamped.name}`,
            fileType: stamped.type,
            blob: stamped,
            createdAt: Date.now(),
          };
          await enqueuePhoto(queued);
          queuedTargetsRef.current.set(id, target);
          uploadPhotoInBackground(queued, target).catch(() => { /* retried later */ });
        } catch (e) {
          console.error('background processing failed', e);
          setFailedQueueIds(prev => { const n = new Set(prev); n.add(id); return n; });
        }
      }
    })();
  }, [step, user, claimId]);

  const uploadPhotoInBackground = async (q: QueuedPhoto, target: Target) => {
    try {
      const file = q.blob instanceof File
        ? await compressImage(q.blob)
        : await compressImage(new File([q.blob], q.fileName, { type: q.fileType }));
      const ext = file.name.split('.').pop() || 'jpg';

      if (target.kind === 'claim') {
        const path = `${q.userId}/${q.claimId}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
        const { error: upErr } = await supabase.storage.from('claim-photos').upload(path, file);
        if (upErr) throw upErr;
        const { error: dbErr } = await supabase.from('claim_photos').insert({
          claim_id: q.claimId,
          user_id: q.userId,
          file_path: path,
          file_name: file.name,
        });
        if (dbErr) throw dbErr;
      } else {
        // Third-party photo
        const path = `${q.userId}/${q.claimId}/tp${TP_INDEX}/${target.tpType}_${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('tp-photos').upload(path, file);
        if (upErr) throw upErr;
        const { error: dbErr } = await supabase.from('tp_photos').insert({
          claim_id: q.claimId,
          user_id: q.userId,
          tp_index: TP_INDEX,
          type: target.tpType,
          file_path: path,
          file_name: file.name,
        });
        if (dbErr) throw dbErr;
      }

      await removeQueuedPhoto(q.id);
      queuedTargetsRef.current.delete(q.id);
      setFailedQueueIds(prev => {
        if (!prev.has(q.id)) return prev;
        const n = new Set(prev); n.delete(q.id); return n;
      });
    } catch (e) {
      console.warn('Background upload failed, will retry', e);
      setFailedQueueIds(prev => {
        const n = new Set(prev); n.add(q.id); return n;
      });
      throw e;
    }
  };

  const persistOtherDriverInfo = async (): Promise<boolean> => {
    if (!claimId) return false;
    const name = otherDriverName.trim();
    const phone = otherDriverPhone.trim();
    const regoNumber = otherDriverRego.trim().toUpperCase();
    const insurer = otherDriverInsurer.trim();
    if (!name && !phone && !regoNumber && !insurer) return true; // skipped — nothing to save
    setSavingDriver(true);
    try {
      // Read existing third_parties (it might already have an entry seeded)
      const { data: row } = await supabase.from('claims').select('third_parties').eq('id', claimId).single();
      const existing: any[] = Array.isArray(row?.third_parties) ? [...(row!.third_parties as any[])] : [];
      const empty = { ownerName: '', phone: '', address: '', insurer: '', claimNumber: '', claimLodgementDate: '', make: '', model: '', regoNumber: '', damageDescription: '' };
      if (existing.length === 0) existing.push({ ...empty });
      existing[TP_INDEX] = { ...empty, ...existing[TP_INDEX], ownerName: name, phone, regoNumber, insurer };
      const { error } = await supabase.from('claims').update({ third_parties: existing }).eq('id', claimId);
      if (error) throw error;
      return true;
    } catch (e: any) {
      console.error('save other driver info', e);
      toast.error('Could not save the details — try again');
      return false;
    } finally {
      setSavingDriver(false);
    }
  };

  const next = async () => {
    // If leaving the form step, persist its data first
    if (step.form === 'other-driver-info') {
      const ok = await persistOtherDriverInfo();
      if (!ok) return;
    }
    if (stepIdx < STEPS.length - 1) setStepIdx(stepIdx + 1);
    else finish();
  };

  const back = () => {
    if (stepIdx > 0) setStepIdx(stepIdx - 1);
  };

  const finish = async () => {
    if (!claimId || !user) return;
    setFinishing(true);

    // Sweep any photos still queued in IndexedDB for this claim/user and retry uploading them.
    // This catches photos whose initial background upload silently failed (e.g. transient network).
    try {
      const queued = await getQueuedPhotosForUser(user.id);
      const mine = queued.filter(q => q.claimId === claimId);
      if (mine.length > 0) {
        toast.message(`Finishing ${mine.length} photo upload${mine.length > 1 ? 's' : ''}…`);
        const results = await Promise.allSettled(
          mine.map(q => {
            const target = queuedTargetsRef.current.get(q.id) || ({ kind: 'claim' } as Target);
            return uploadPhotoInBackground(q, target);
          })
        );
        const failed = results.filter(r => r.status === 'rejected').length;
        if (failed > 0) {
          toast.error(`${failed} photo${failed > 1 ? 's' : ''} couldn't upload. They're saved on this device — open the report to retry.`);
        }
      }
    } catch (e) {
      console.warn('finish sweep failed', e);
    }

    const target = reportNumber
      ? `/claims/${reportNumber}/edit?step=1&from=quick-capture`
      : `/claims/new`;
    navigate(target);
  };

  const exitWithConfirm = () => {
    if (totalCaptured > 0 || otherDriverName || otherDriverPhone || otherDriverRego || otherDriverInsurer) {
      const ok = window.confirm('Save what you have and continue later?');
      if (!ok) return;
    }
    if (claimId && reportNumber) {
      navigate(`/claims/${reportNumber}/edit`);
    } else {
      navigate('/');
    }
  };

  const isFormStep = !!step.form;
  const currentCaps = captures[step.key] || [];
  const hasCapForStep = currentCaps.length > 0;
  const isLast = stepIdx === STEPS.length - 1;
  const formHasContent = step.form === 'other-driver-info' && (otherDriverName.trim() || otherDriverPhone.trim() || otherDriverRego.trim() || otherDriverInsurer.trim());

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-foreground text-background overflow-y-auto"
         style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>

        {/* Header strip */}
        <div className="px-5 pt-5 pb-4 flex items-center justify-between">
          <button
            onClick={exitWithConfirm}
            aria-label="Exit"
            className="w-9 h-9 rounded-full bg-background/10 flex items-center justify-center active:scale-95 transition-transform"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="text-center">
            <div className="text-[11px] uppercase tracking-[0.18em] text-background/50 font-medium">Quick capture</div>
            <div className="text-[13px] font-semibold mt-0.5 tabular-nums">
              Step {stepIdx + 1} of {STEPS.length}
            </div>
          </div>
          {speech.supported ? (
            <button
              onClick={() => {
                const next = !speech.enabled;
                speech.setEnabled(next);
                if (next) speech.speak(`${step.title}. ${step.hint}`);
              }}
              aria-label={speech.enabled ? 'Mute voice prompts' : 'Unmute voice prompts'}
              aria-pressed={speech.enabled}
              className="w-9 h-9 rounded-full bg-background/10 flex items-center justify-center active:scale-95 transition-transform"
            >
              {speech.enabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-background/50" />}
            </button>
          ) : (
            <div className="w-9 h-9" />
          )}
        </div>

        {/* Status pills (location + time) */}
        <div className="px-5 pb-4 flex items-center gap-2 text-[11px]">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background/10 text-background/80 max-w-[60%]">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">
              {location ? (location.address || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`) : 'Detecting location…'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background/10 text-background/80">
            <Clock className="w-3 h-3" />
            <span className="tabular-nums">
              {capturedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          {creating && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background/10 text-background/80">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Saving draft…</span>
            </div>
          )}
        </div>

        {/* Progress dots */}
        <div className="px-5 pb-5 flex items-center gap-1.5">
          {STEPS.map((s, i) => {
            const captured = (captures[s.key] || []).length > 0
              || (s.form === 'other-driver-info' && (otherDriverName || otherDriverPhone || otherDriverRego || otherDriverInsurer));
            const isCurrent = i === stepIdx;
            return (
              <button
                key={s.key}
                onClick={() => setStepIdx(i)}
                className={`flex-1 h-1.5 rounded-full transition-colors ${
                  isCurrent ? 'bg-background' :
                  captured ? 'bg-background/70' :
                  'bg-background/20'
                }`}
                aria-label={`Go to ${s.title}`}
              />
            );
          })}
        </div>

        {/* Step body */}
        <div className="flex-1 px-5 pb-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={step.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-background/15 flex items-center justify-center shrink-0">
                  <step.icon className="w-5 h-5" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-[20px] font-semibold leading-tight tracking-[-0.01em]">{step.title}</h1>
                    {step.optional && (
                      <span className="text-[10px] uppercase tracking-wider text-background/50 font-medium px-1.5 py-0.5 rounded bg-background/10">Optional</span>
                    )}
                  </div>
                  <p className="text-[13px] text-background/70 mt-1.5 leading-relaxed">{step.hint}</p>
                </div>
              </div>

              {/* Body: form step OR photo capture */}
              {isFormStep ? (
                <div className="rounded-2xl bg-background/5 border border-background/10 p-4 space-y-3">
                  <label className="block">
                    <span className="text-[11px] uppercase tracking-wider text-background/60 font-medium">Full name</span>
                    <input
                      type="text"
                      value={otherDriverName}
                      onChange={(e) => setOtherDriverName(e.target.value)}
                      autoComplete="name"
                      placeholder="e.g. John Smith"
                      className="mt-1.5 w-full h-11 px-3 rounded-xl bg-background/10 border border-background/15 text-background placeholder:text-background/40 text-[14px] focus:outline-none focus:border-background/40"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] uppercase tracking-wider text-background/60 font-medium">Contact number</span>
                    <input
                      type="tel"
                      value={otherDriverPhone}
                      onChange={(e) => setOtherDriverPhone(e.target.value)}
                      autoComplete="tel"
                      inputMode="tel"
                      placeholder="e.g. 021 555 1234"
                      className="mt-1.5 w-full h-11 px-3 rounded-xl bg-background/10 border border-background/15 text-background placeholder:text-background/40 text-[14px] focus:outline-none focus:border-background/40"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] uppercase tracking-wider text-background/60 font-medium">Rego (number plate)</span>
                    <input
                      type="text"
                      value={otherDriverRego}
                      onChange={(e) => setOtherDriverRego(e.target.value.toUpperCase().slice(0, 10))}
                      autoCapitalize="characters"
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder="e.g. ABC123"
                      maxLength={10}
                      className="mt-1.5 w-full h-11 px-3 rounded-xl bg-background/10 border border-background/15 text-background placeholder:text-background/40 text-[14px] uppercase tracking-wider focus:outline-none focus:border-background/40"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] uppercase tracking-wider text-background/60 font-medium">Insurance company</span>
                    <input
                      type="text"
                      value={otherDriverInsurer}
                      onChange={(e) => setOtherDriverInsurer(e.target.value.slice(0, 100))}
                      list="quickcapture-insurer-options"
                      placeholder="e.g. AA Insurance"
                      maxLength={100}
                      className="mt-1.5 w-full h-11 px-3 rounded-xl bg-background/10 border border-background/15 text-background placeholder:text-background/40 text-[14px] focus:outline-none focus:border-background/40"
                    />
                    <datalist id="quickcapture-insurer-options">
                      {insurerOptions.map((n) => (
                        <option key={n} value={n} />
                      ))}
                    </datalist>
                  </label>
                  <p className="text-[11px] text-background/50 leading-relaxed">
                    Saved to the third-party section of your report. You can add the rest later.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl bg-background/5 border border-background/10 overflow-hidden">
                  {hasCapForStep ? (
                    <div className="p-3 grid grid-cols-3 gap-2">
                      {currentCaps.map((c, i) => (
                        <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-background/10">
                          <img src={c.previewUrl} alt={`${step.title} ${i + 1}`} className="w-full h-full object-cover" />
                          <div className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-background/90 text-foreground flex items-center justify-center">
                            <Check className="w-3 h-3" strokeWidth={2.5} />
                          </div>
                        </div>
                      ))}
                      <button
                        onClick={openCamera}
                        className="aspect-square rounded-xl border border-dashed border-background/30 flex flex-col items-center justify-center gap-1 text-background/70 active:scale-95 transition-transform"
                      >
                        <Camera className="w-5 h-5" strokeWidth={1.8} />
                        <span className="text-[10px] font-medium">Add more</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={openCamera}
                      className="w-full aspect-[4/3] flex flex-col items-center justify-center gap-3 active:scale-[0.99] transition-transform"
                    >
                      <div className="w-16 h-16 rounded-full bg-background/10 flex items-center justify-center">
                        <Camera className="w-7 h-7" strokeWidth={1.8} />
                      </div>
                      <div className="text-[14px] font-semibold">Tap to take photo</div>
                      <div className="text-[11px] text-background/60">Auto-stamped with time + location</div>
                    </button>
                  )}
                </div>
              )}

              {totalCaptured > 0 && (
                <div className="text-[11px] text-background/60 text-center tabular-nums">
                  {totalCaptured} photo{totalCaptured === 1 ? '' : 's'} captured · saved to claim {reportNumber ? `#${reportNumber}` : '…'}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer actions */}
        <div className="px-5 pt-3 pb-5 border-t border-background/10 flex items-center gap-2">
          <button
            onClick={back}
            disabled={stepIdx === 0}
            className="h-12 px-4 rounded-xl text-[13px] font-medium text-background/80 active:scale-95 transition-transform disabled:opacity-30"
          >
            Back
          </button>

          {/* Photo step — no capture yet, optional → Skip */}
          {!isFormStep && !hasCapForStep && step.optional && !isLast && (
            <button
              onClick={next}
              className="flex-1 h-12 rounded-xl bg-background/10 text-background text-[14px] font-semibold inline-flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
            >
              <SkipForward className="w-4 h-4" />
              Skip
            </button>
          )}

          {/* Photo step — required, no capture yet → Take photo */}
          {!isFormStep && !hasCapForStep && !step.optional && (
            <button
              onClick={openCamera}
              className="flex-1 h-12 rounded-xl bg-background text-foreground text-[14px] font-semibold inline-flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
            >
              <Camera className="w-4 h-4" />
              Take photo
            </button>
          )}

          {/* Photo step — has at least one capture → Next */}
          {!isFormStep && hasCapForStep && (
            <button
              onClick={next}
              disabled={finishing}
              className="flex-1 h-12 rounded-xl bg-background text-foreground text-[14px] font-semibold inline-flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
            >
              {finishing ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <>
                  {isLast ? 'Continue to report' : 'Next'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}

          {/* Form step → Skip (when empty) or Save & continue */}
          {isFormStep && !formHasContent && (
            <button
              onClick={next}
              disabled={savingDriver || finishing}
              className="flex-1 h-12 rounded-xl bg-background/10 text-background text-[14px] font-semibold inline-flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
            >
              <SkipForward className="w-4 h-4" />
              Skip
            </button>
          )}
          {isFormStep && formHasContent && (
            <button
              onClick={next}
              disabled={savingDriver || finishing}
              className="flex-1 h-12 rounded-xl bg-background text-foreground text-[14px] font-semibold inline-flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
            >
              {savingDriver || finishing ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <>
                  {isLast ? 'Continue to report' : 'Next'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>

        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>
  );
}
