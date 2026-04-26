import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Camera, Check, ChevronRight, X, MapPin, Clock, Loader2,
  SkipForward, ArrowRight, Car, User as UserIcon, IdCard, Hash, FileImage, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getVehicles } from '@/lib/storage';
import { Vehicle } from '@/types';
import { getCurrentPosition } from '@/lib/geolocation';
import { watermarkImage } from '@/lib/image-watermark';
import { compressImage } from '@/lib/image-compress';
import { enqueuePhoto, type QueuedPhoto } from '@/lib/photo-queue';

interface CaptureStep {
  key: string;
  title: string;
  hint: string;
  icon: typeof Camera;
  optional?: boolean;
}

const STEPS: CaptureStep[] = [
  { key: 'scene',         title: 'Wide shot of the scene',     hint: 'Step back. Capture the full scene — both vehicles, road, surroundings.', icon: MapPin },
  { key: 'own-damage',    title: 'Your vehicle damage',        hint: 'Get close to the damaged area. Take 1–2 angles if needed.',           icon: Car },
  { key: 'other-damage',  title: 'Other vehicle damage',       hint: 'Show the damage on the other car clearly.',                            icon: AlertTriangle },
  { key: 'other-plate',   title: "Other car's number plate",   hint: 'Make sure the plate is readable — fill the frame.',                    icon: Hash },
  { key: 'other-licence', title: "Other driver's licence",     hint: 'Ask permission. Capture both sides if possible.',                       icon: IdCard, optional: true },
  { key: 'other-driver',  title: "Photo of the other driver",  hint: 'Optional — only with consent.',                                         icon: UserIcon, optional: true },
];

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
  const previewUrlsRef = useRef<string[]>([]);

  const step = STEPS[stepIdx];
  const totalCaptured = Object.values(captures).reduce((n, arr) => n + arr.length, 0);

  // Boot: load vehicles, capture GPS, create draft claim
  useEffect(() => {
    if (!user) return;
    let mounted = true;

    (async () => {
      try {
        // 1. Load vehicles
        const vs = await getVehicles(user.id);
        if (!mounted) return;
        setVehicles(vs);
        const initial = vehicleIdParam || vs[0]?.id || '';
        setSelectedVehicleId(initial);
        const initialVehicle = vs.find(v => v.id === initial);

        // 2. Try GPS in parallel with claim creation (don't block)
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

        // 3. Create draft claim
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

  // Persist location into the claim once we have both
  useEffect(() => {
    if (!claimId || !location) return;
    supabase
      .from('claims')
      .update({ incident_location: location.address || `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}` })
      .eq('id', claimId)
      .then(() => { /* fire and forget */ });
  }, [claimId, location]);

  const openCamera = () => cameraRef.current?.click();

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || !user || !claimId) return;
    const stepKey = step.key;
    const newCaps: { previewUrl: string; queuedId: string }[] = [];

    for (const f of Array.from(files)) {
      if (f.size > 10 * 1024 * 1024) {
        toast.error(`${f.name} is too large (max 10MB)`);
        continue;
      }
      try {
        // Watermark with timestamp + GPS at capture time
        const stamped = await watermarkImage(f);
        const id = `qc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const previewUrl = URL.createObjectURL(stamped);
        previewUrlsRef.current.push(previewUrl);

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
        newCaps.push({ previewUrl, queuedId: id });

        // Background upload — non-blocking
        uploadPhotoInBackground(queued).catch(() => { /* will be retried later */ });
      } catch (e) {
        console.error('capture failed', e);
        toast.error('Could not save that photo');
      }
    }

    if (newCaps.length) {
      setCaptures(prev => ({ ...prev, [stepKey]: [...(prev[stepKey] || []), ...newCaps] }));
    }
  }, [step, user, claimId]);

  const uploadPhotoInBackground = async (q: QueuedPhoto) => {
    try {
      const file = q.blob instanceof File
        ? await compressImage(q.blob)
        : await compressImage(new File([q.blob], q.fileName, { type: q.fileType }));
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${q.userId}/${q.claimId}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('claim-photos').upload(path, file);
      if (upErr) throw upErr;
      await supabase.from('claim_photos').insert({
        claim_id: q.claimId,
        user_id: q.userId,
        file_path: path,
        file_name: file.name,
      });
      const { removeQueuedPhoto } = await import('@/lib/photo-queue');
      await removeQueuedPhoto(q.id);
    } catch (e) {
      console.warn('Background upload failed, will retry', e);
    }
  };

  const next = () => {
    if (stepIdx < STEPS.length - 1) setStepIdx(stepIdx + 1);
    else finish();
  };

  const back = () => {
    if (stepIdx > 0) setStepIdx(stepIdx - 1);
  };

  const finish = async () => {
    if (!claimId) return;
    setFinishing(true);
    // Hop into the wizard at the "scene" step (step index 1) — Step 1 details already pre-filled
    const target = reportNumber
      ? `/claims/${reportNumber}/edit?step=1&from=quick-capture`
      : `/claims/new`;
    navigate(target);
  };

  const exitWithConfirm = () => {
    if (totalCaptured > 0) {
      const ok = window.confirm('Save what you have and continue later?');
      if (!ok) return;
    }
    if (claimId && reportNumber) {
      navigate(`/claims/${reportNumber}/edit`);
    } else {
      navigate('/');
    }
  };

  const currentCaps = captures[step.key] || [];
  const hasCapForStep = currentCaps.length > 0;
  const isLast = stepIdx === STEPS.length - 1;

  return (
    <AppLayout>
      <div className="!pt-0 -mx-4 sm:-mx-6 -mt-10 min-h-[calc(100dvh-4rem)] flex flex-col bg-foreground text-background"
           style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>

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
          <div className="w-9 h-9" />
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
            const captured = (captures[s.key] || []).length > 0;
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

              {/* Capture preview area */}
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
          {!hasCapForStep && step.optional && !isLast && (
            <button
              onClick={next}
              className="flex-1 h-12 rounded-xl bg-background/10 text-background text-[14px] font-semibold inline-flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
            >
              <SkipForward className="w-4 h-4" />
              Skip
            </button>
          )}
          {!hasCapForStep && !step.optional && (
            <button
              onClick={openCamera}
              className="flex-1 h-12 rounded-xl bg-background text-foreground text-[14px] font-semibold inline-flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
            >
              <Camera className="w-4 h-4" />
              Take photo
            </button>
          )}
          {hasCapForStep && (
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
    </AppLayout>
  );
}
