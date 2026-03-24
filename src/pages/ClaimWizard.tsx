import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Save, Camera, X, Loader2, MapPin, Car, Sparkles } from 'lucide-react';
import { DamagePhotoAnalyzer, ThirdPartyPhotos } from '@/components/PhotoAnalyzer';
import { motion, AnimatePresence } from 'framer-motion';
import { ClaimReport, ThirdPartyVehicle, Witness, Vehicle } from '@/types';
import { getVehicles, getClaims, saveClaim } from '@/lib/storage';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const stepVariants = { initial: { opacity: 0, x: 10 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -10 } };

const emptyTP: ThirdPartyVehicle = { ownerName: '', phone: '', address: '', insurer: '', claimNumber: '', claimLodgementDate: '', make: '', model: '', regoNumber: '', damageDescription: '' };
const emptyW: Witness = { name: '', phone: '', address: '', isPassenger: false };

function emptyClaim(): ClaimReport {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');

  return {
    id: '', status: 'draft', createdAt: now.toISOString(), updatedAt: now.toISOString(),
    incidentDate: `${yyyy}-${mm}-${dd}`, incidentTime: `${hh}:${min}`, incidentLocation: '', vehicleUsage: '', journeyDetails: '', description: '',
    vehicleId: '', speedBeforeBraking: '', thirdParties: [], otherPropertyDamage: '', otherPropertyOwner: '',
    witnesses: [], policeAttended: false, policeOfficerDetails: '', anyoneHurt: false, injuryDetails: '',
    weatherCondition: '', roadCondition: '', driverConsumedSubstance: false, substanceDetails: '',
    blameDescription: '', liabilityAdmitted: false, liabilityDetails: '',
    damageDescription: '', vehicleTowed: false, towingCompany: '',
    repairerName: '', repairerPhone: '', repairerAddress: '',
    insuranceCompany: '', selectedPanelShopId: '',
  };
}

type ClaimPhoto = {
  id: string; file_path: string; file_name: string;
};

export default function ClaimWizard() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [claim, setClaim] = useState<ClaimReport>(emptyClaim);
  const [claimNumber, setClaimNumber] = useState<number | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [photos, setPhotos] = useState<ClaimPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const detectLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    setDetectingLocation(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 })
      );
      const { latitude, longitude } = position.coords;
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`);
      const data = await res.json();
      if (data?.display_name) {
        update('incidentLocation', data.display_name);
        toast.success('Location detected');
      } else {
        update('incidentLocation', `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        toast.info('Coordinates set (address lookup unavailable)');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Could not detect location');
    } finally {
      setDetectingLocation(false);
    }
  }, []);

  const STEPS = [
    t('claims.steps.yourVehicle'),
    'At the Scene',
    'Other Party & Witnesses',
    t('claims.steps.review'),
  ];

  const [autoSkipped, setAutoSkipped] = useState(false);

  useEffect(() => {
    getVehicles().then(v => {
      setVehicles(v);
      if (!id && v.length === 1 && !autoSkipped) {
        setClaim(prev => ({ ...prev, vehicleId: v[0].id, insuranceCompany: v[0].insuranceCompany || '' }));
        setStep(1);
        setAutoSkipped(true);
      }
    });
    if (id) {
      getClaims().then(claims => {
        const e = claims.find(c => c.id === id);
        if (e) setClaim(e);
      });
      supabase.from('claims').select('claim_number').eq('id', id).single().then(({ data }) => {
        if (data?.claim_number) setClaimNumber(data.claim_number);
      });
      supabase.from('claim_photos').select('id, file_path, file_name')
        .eq('claim_id', id).then(({ data }) => {
          if (data) setPhotos(data as ClaimPhoto[]);
        });
    }
  }, [id]);

  const update = (field: keyof ClaimReport, value: any) => setClaim(prev => ({ ...prev, [field]: value, updatedAt: new Date().toISOString() }));

  const autoSave = async () => {
    const savedId = await saveClaim({ ...claim, updatedAt: new Date().toISOString() });
    if (!claim.id && savedId) setClaim(prev => ({ ...prev, id: savedId }));
  };

  const next = async () => { await autoSave(); setStep(s => Math.min(s + 1, STEPS.length - 1)); };
  const prev = async () => { await autoSave(); setStep(s => Math.max(s - 1, 0)); };

  const submit = async () => {
    await saveClaim({ ...claim, status: 'submitted' as const, updatedAt: new Date().toISOString() });
    if (user?.email) {
      const vehicle = vehicles.find(v => v.id === claim.vehicleId);
      supabase.functions.invoke('send-email', {
        body: {
          type: 'claim_submitted',
          to: user.email,
          data: {
            claimId: claim.id || '',
            date: claim.incidentDate,
            time: claim.incidentTime,
            location: claim.incidentLocation,
            vehicle: vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : '',
            rego: vehicle?.regoNumber || '',
            insurer: claim.insuranceCompany,
            policyNumber: vehicle?.insurancePolicyNumber || '',
            description: claim.description,
            damageDescription: claim.damageDescription,
            vehicleUsage: claim.vehicleUsage,
            journeyDetails: claim.journeyDetails,
            speedBeforeBraking: claim.speedBeforeBraking,
            vehicleTowed: claim.vehicleTowed ? 'Yes' : 'No',
            towingCompany: claim.towingCompany,
            weatherCondition: claim.weatherCondition,
            roadCondition: claim.roadCondition,
            policeAttended: claim.policeAttended ? 'Yes' : 'No',
            policeOfficerDetails: claim.policeOfficerDetails,
            anyoneHurt: claim.anyoneHurt ? 'Yes' : 'No',
            injuryDetails: claim.injuryDetails,
            driverConsumedSubstance: claim.driverConsumedSubstance ? 'Yes' : 'No',
            substanceDetails: claim.substanceDetails,
            blameDescription: claim.blameDescription,
            liabilityAdmitted: claim.liabilityAdmitted ? 'Yes' : 'No',
            liabilityDetails: claim.liabilityDetails,
            repairerName: claim.repairerName,
            repairerPhone: claim.repairerPhone,
            repairerAddress: claim.repairerAddress,
            thirdParties: JSON.stringify(claim.thirdParties),
            witnesses: JSON.stringify(claim.witnesses),
            claimNumber: claimNumber?.toString() || '',
          },
        },
      }).catch(err => console.error('Email send failed:', err));
    }
    navigate('/claims');
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;
    const claimId = claim.id || (await saveClaim({ ...claim, updatedAt: new Date().toISOString() }));
    if (!claimId) return;
    if (!claim.id) setClaim(prev => ({ ...prev, id: claimId }));

    setUploading(true);
    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name} is too large (max 10MB)`); continue; }
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${claimId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('claim-photos').upload(path, file);
      if (uploadError) { toast.error(`Failed to upload ${file.name}`); continue; }
      const { data } = await supabase.from('claim_photos')
        .insert({ claim_id: claimId, user_id: user.id, file_path: path, file_name: file.name })
        .select('id, file_path, file_name').single();
      if (data) setPhotos(prev => [...prev, data as ClaimPhoto]);
    }
    setUploading(false);
    toast.success('Photos uploaded');
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const removePhoto = async (photo: ClaimPhoto) => {
    await supabase.storage.from('claim-photos').remove([photo.file_path]);
    await supabase.from('claim_photos').delete().eq('id', photo.id);
    setPhotos(prev => prev.filter(p => p.id !== photo.id));
  };

  const getPhotoUrl = (filePath: string) => {
    const { data } = supabase.storage.from('claim-photos').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const addTP = () => update('thirdParties', [...claim.thirdParties, { ...emptyTP }]);
  const updTP = (i: number, f: string, v: string) => { const u = [...claim.thirdParties]; (u[i] as any)[f] = v; update('thirdParties', u); };
  const rmTP = (i: number) => update('thirdParties', claim.thirdParties.filter((_, idx) => idx !== i));
  const addW = () => update('witnesses', [...claim.witnesses, { ...emptyW }]);
  const updW = (i: number, f: string, v: string | boolean) => { const u = [...claim.witnesses]; (u[i] as any)[f] = v; update('witnesses', u); };
  const rmW = (i: number) => update('witnesses', claim.witnesses.filter((_, idx) => idx !== i));
  const selV = vehicles.find(v => v.id === claim.vehicleId);

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={async () => { await autoSave(); navigate(-1); }} className="p-2 -ml-2 rounded-xl hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" strokeWidth={1.5} />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">{t('claims.reportIncident')}</h1>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Save className="w-3 h-3" /> {t('claims.autoSaved')}</p>
              {(claim.id || claimNumber) && (
                <span className="text-xs text-muted-foreground">
                  {claimNumber ? `CLM-${String(claimNumber).padStart(4, '0')}` : ''}{claim.id ? ` · ${claim.id.slice(0, 8).toUpperCase()}` : ''}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-1">
          {STEPS.map((_, i) => <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-foreground' : 'bg-border'}`} />)}
        </div>
        <div className="flex items-center gap-2">
          <span className="step-badge step-badge-active tabular-nums">{step + 1}</span>
          <span className="text-sm font-semibold text-foreground">{STEPS[step]}</span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={step} variants={stepVariants} initial="initial" animate="animate" exit="exit" transition={{ ease: [0.25, 0.1, 0.25, 1], duration: 0.2 }}>

            {/* Step 0: Vehicle Selection */}
            {step === 0 && (
              <div className="card-surface space-y-4">
                <div>
                  <label className="form-label">{t('claims.vehicle.selectVehicle')}</label>
                  {vehicles.length === 0 ? (
                    <div className="p-5 rounded-xl bg-background text-center">
                      <p className="text-sm text-muted-foreground">{t('claims.vehicle.noVehicles')}</p>
                      <button onClick={async () => { await autoSave(); navigate('/vehicles/new'); }} className="text-sm text-primary font-medium mt-2 hover:underline">{t('claims.vehicle.addFirst')}</button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {vehicles.map(v => (
                        <button key={v.id} onClick={() => { update('vehicleId', v.id); setClaim(prev => ({ ...prev, vehicleId: v.id, insuranceCompany: v.insuranceCompany || '' })); setTimeout(() => next(), 150); }}
                          className={`w-full text-left p-3.5 rounded-xl transition-all border flex items-center justify-between ${claim.vehicleId === v.id ? 'border-foreground bg-foreground/[0.03]' : 'border-border hover:border-foreground/20'}`}>
                          <div>
                            <div className="text-base font-bold text-foreground tabular-nums">{v.regoNumber}</div>
                            <div className="text-xs text-muted-foreground">{v.year} {v.make} {v.model}</div>
                          </div>
                          <Car className="w-5 h-5 text-muted-foreground/40" strokeWidth={1.5} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 1: At the Scene — date/time, location, own vehicle photos */}
            {step === 1 && (
              <div className="card-surface space-y-4">
                <p className="text-xs text-muted-foreground -mt-1">Capture the essentials now. You can add more details later.</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:max-w-[28rem]">
                  <div className="min-w-0"><label className="form-label">{t('claims.incident.date')}</label><input type="date" className="form-input tabular-nums w-full min-w-0 h-10 px-3 text-sm" value={claim.incidentDate} onChange={e => update('incidentDate', e.target.value)} /></div>
                  <div className="min-w-0"><label className="form-label">{t('claims.incident.time')}</label><input type="time" className="form-input tabular-nums w-full min-w-0 h-10 px-3 text-sm" value={claim.incidentTime} onChange={e => update('incidentTime', e.target.value)} /></div>
                </div>

                <div>
                  <label className="form-label">{t('claims.incident.location')}</label>
                  <div className="flex gap-2">
                    <input className="form-input flex-1" placeholder={t('claims.incident.locationPlaceholder')} value={claim.incidentLocation} onChange={e => update('incidentLocation', e.target.value)} />
                    <button type="button" onClick={detectLocation} disabled={detectingLocation}
                      className="flex-shrink-0 h-10 px-3 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-1.5 text-xs font-medium disabled:opacity-50">
                      {detectingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                      <span className="hidden sm:inline">{detectingLocation ? 'Detecting...' : 'Detect'}</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="form-label flex items-center gap-1.5"><Camera className="w-3.5 h-3.5" /> Your Vehicle Photos</label>
                  <p className="text-xs text-muted-foreground -mt-2">Take photos of the damage to your vehicle</p>
                  {photos.length > 0 && (
                    <div className="grid grid-cols-4 gap-2">
                      {photos.map(photo => (
                        <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden bg-muted">
                          <img src={getPhotoUrl(photo.file_path)} alt={photo.file_name} className="w-full h-full object-cover" />
                          <button onClick={() => removePhoto(photo)}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-foreground/80 text-card flex items-center justify-center">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <button type="button" onClick={async () => {
                    if (!claim.id) {
                      const savedId = await saveClaim({ ...claim, updatedAt: new Date().toISOString() });
                      if (savedId) setClaim(prev => ({ ...prev, id: savedId }));
                    }
                    photoInputRef.current?.click();
                  }} disabled={uploading}
                    className="btn-secondary w-full h-9 gap-2 text-xs">
                    {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                    {uploading ? t('claims.insurance.uploading') : t('claims.insurance.addPhotos')}
                  </button>
                  <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
                </div>
              </div>
            )}

            {/* Step 2: Other Party & Witnesses */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="card-surface space-y-3">
                  <label className="form-label mb-0">{t('claims.thirdParty.otherVehicles')}</label>
                  {claim.thirdParties.length === 0 && (
                    <button onClick={addTP} className="w-full p-4 rounded-xl bg-background text-center cursor-pointer hover:bg-muted/50 transition-colors">
                      <p className="text-sm text-muted-foreground">{t('claims.thirdParty.noThirdParties')}</p>
                      <span className="text-sm text-primary font-medium mt-2 inline-block hover:underline">+ Add other vehicle</span>
                    </button>
                  )}
                  {claim.thirdParties.map((tp, i) => (
                    <div key={i} className="p-4 rounded-xl bg-background space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground">{t('claims.thirdParty.vehicleNumber', { number: i + 1 })}</span>
                        <button onClick={() => rmTP(i)} className="text-xs text-destructive hover:underline font-medium">{t('common.remove')}</button>
                      </div>
                      <div><label className="form-label">{t('claims.thirdParty.regoNo')}</label><input className="form-input tabular-nums text-base font-bold" placeholder="e.g. ABC123" value={tp.regoNumber} onChange={e => updTP(i, 'regoNumber', e.target.value.toUpperCase())} /></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="form-label">{t('claims.thirdParty.ownerDriver')}</label><input className="form-input" placeholder="Driver's name" value={tp.ownerName} onChange={e => updTP(i, 'ownerName', e.target.value)} /></div>
                        <div><label className="form-label">{t('claims.thirdParty.phone')}</label><input className="form-input" type="tel" placeholder="Phone number" value={tp.phone} onChange={e => updTP(i, 'phone', e.target.value)} /></div>
                      </div>

                      {/* Third-party photos: vehicle damage, rego plate, driver license */}
                      {claim.id && user && (
                        <ThirdPartyPhotos
                          tpIndex={i}
                          claimId={claim.id}
                          userId={user.id}
                          onRegoDetected={(rego) => updTP(i, 'regoNumber', rego)}
                          onLicenseDetected={(data) => {
                            if (data.fullName) updTP(i, 'ownerName', data.fullName);
                            if (data.address) updTP(i, 'address', data.address);
                          }}
                          onDamageDescriptionGenerated={(desc) => updTP(i, 'damageDescription', desc)}
                        />
                      )}
                    </div>
                  ))}
                </div>

                <div className="card-surface space-y-3">
                  <label className="form-label mb-0">{t('claims.witnesses.title')}</label>
                  {claim.witnesses.length === 0 && (
                    <button onClick={addW} className="w-full p-4 rounded-xl bg-background text-center cursor-pointer hover:bg-muted/50 transition-colors">
                      <p className="text-sm text-muted-foreground">{t('claims.witnesses.noWitnesses')}</p>
                      <span className="text-sm text-primary font-medium mt-2 inline-block">+ {t('claims.witnesses.addWitness')}</span>
                    </button>
                  )}
                  {claim.witnesses.map((w, i) => (
                    <div key={i} className="p-4 rounded-xl bg-background space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground">{t('claims.witnesses.witnessNumber', { number: i + 1 })}</span>
                        <button onClick={() => rmW(i)} className="text-xs text-destructive hover:underline font-medium">{t('common.remove')}</button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="form-label">{t('claims.witnesses.fullName')}</label><input className="form-input" value={w.name} onChange={e => updW(i, 'name', e.target.value)} /></div>
                        <div><label className="form-label">{t('claims.witnesses.phone')}</label><input className="form-input" value={w.phone} onChange={e => updW(i, 'phone', e.target.value)} /></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Review */}
            {step === 3 && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
                  <p className="text-xs text-primary font-medium">💡 You can add more details like insurance, repairer, conditions and liability from the incident detail page later.</p>
                </div>
                <RSection title={t('claims.review.incident')}>
                  <RRow label={t('claims.review.date')} value={claim.incidentDate} />
                  <RRow label={t('claims.review.time')} value={claim.incidentTime} />
                  <RRow label={t('claims.review.location')} value={claim.incidentLocation} />
                </RSection>
                <RSection title={t('claims.review.yourVehicle')}>
                  <RRow label={t('claims.review.vehicle')} value={selV ? `${selV.year} ${selV.make} ${selV.model}` : '—'} />
                  <RRow label={t('claims.review.rego')} value={selV?.regoNumber || '—'} />
                  <RRow label={t('claims.review.photos')} value={t('claims.review.uploaded', { count: photos.length })} />
                  {claim.damageDescription && <RRow label={t('claims.review.damage')} value={claim.damageDescription} />}
                </RSection>
                <RSection title={t('claims.review.thirdParties')}>
                  {claim.thirdParties.length === 0 ? <p className="text-sm text-muted-foreground">{t('common.none')}</p> : claim.thirdParties.map((tp, i) => (
                    <div key={i} className="p-3 rounded-xl bg-background space-y-0.5">
                      <RRow label="Rego" value={tp.regoNumber} />
                      <RRow label="Driver" value={tp.ownerName} />
                      {tp.phone && <RRow label="Phone" value={tp.phone} />}
                    </div>
                  ))}
                </RSection>
                <RSection title={t('claims.review.witnesses')}>
                  {claim.witnesses.length === 0 ? <p className="text-sm text-muted-foreground">{t('common.none')}</p> : claim.witnesses.map((w, i) => <RRow key={i} label={t('claims.witnesses.witnessNumber', { number: i + 1 })} value={`${w.name} – ${w.phone}`} />)}
                </RSection>
              </div>
            )}

          </motion.div>
        </AnimatePresence>

        <div className="flex flex-col gap-3 pb-16 md:pb-0">
          <div className="flex gap-3">
            {step > 0 && <button onClick={prev} className="btn-secondary flex-1 h-11"><ArrowLeft className="w-4 h-4" strokeWidth={1.5} /> {t('common.back')}</button>}
            {step < STEPS.length - 1 ? (
              <button onClick={next} className="btn-primary flex-1 h-11">{t('common.next')} <ArrowRight className="w-4 h-4" /></button>
            ) : (
              <button onClick={submit} className="btn-primary flex-1 h-11"><Save className="w-4 h-4" /> {t('common.save')} report</button>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function RSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="card-surface space-y-1"><h3 className="text-[13px] font-semibold text-muted-foreground mb-2">{title}</h3>{children}</div>;
}
function RRow({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-4 py-1.5"><span className="text-[13px] text-muted-foreground flex-shrink-0">{label}</span><span className="text-[13px] font-medium text-foreground text-right">{value || '—'}</span></div>;
}
