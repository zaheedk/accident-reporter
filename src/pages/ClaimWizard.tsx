import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Save, Camera, X, Loader2, MapPin, Car, Sparkles, Trash2 } from 'lucide-react';
import { DamagePhotoAnalyzer, ThirdPartyPhotos } from '@/components/PhotoAnalyzer';
import { motion, AnimatePresence } from 'framer-motion';
import { ClaimReport, ThirdPartyVehicle, Witness, Vehicle, WEATHER_OPTIONS, ROAD_OPTIONS } from '@/types';
import { deleteClaim, getVehicles, saveClaim } from '@/lib/storage';
import { compressImage } from '@/lib/image-compress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

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
    atFault: '', courtesyCarRequested: false,
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
  const [searchParams] = useSearchParams();
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
  const [deleting, setDeleting] = useState(false);
  const [loadingClaim, setLoadingClaim] = useState(!!id);
  const [submitting, setSubmitting] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

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
      if (err?.code === 1) {
        toast.error('Location access denied. Please enable location permissions in your browser settings and try again.', { duration: 6000 });
      } else if (err?.code === 2) {
        toast.error('Location unavailable. Please check your device location settings.');
      } else if (err?.code === 3) {
        toast.error('Location request timed out. Please try again.');
      } else {
        toast.error(err?.message || 'Could not detect location');
      }
    } finally {
      setDetectingLocation(false);
    }
  }, []);

  const isEdit = !!id;
  const STEPS = isEdit ? [
    t('claims.steps.yourVehicle'),
    'Incident Details',
    'Damage & Vehicle',
    'Other Party & Witnesses',
    'Conditions & Liability',
    t('claims.steps.review'),
  ] : [
    t('claims.steps.yourVehicle'),
    'At the Scene',
    'Other Party & Witnesses',
    t('claims.steps.review'),
  ];

  const [autoSkipped, setAutoSkipped] = useState(false);

  useEffect(() => {
    getVehicles(user?.id).then(v => {
      setVehicles(v);
      const regoParam = searchParams.get('rego');
      if (!id && regoParam) {
        // Auto-select vehicle by rego from external link
        const match = v.find(veh => veh.regoNumber?.toLowerCase() === regoParam.toLowerCase());
        if (match) {
          setClaim(prev => ({ ...prev, vehicleId: match.id, insuranceCompany: match.insuranceCompany || '' }));
          setStep(1);
          setAutoSkipped(true);
        }
      } else if (!id && v.length === 1 && !autoSkipped) {
        setClaim(prev => ({ ...prev, vehicleId: v[0].id, insuranceCompany: v[0].insuranceCompany || '' }));
        setStep(1);
        setAutoSkipped(true);
      }
    });
    if (id) {
      const loadClaim = async () => {
        const [{ data: claimRow }, { data: claimNumData }, { data: photosData }] = await Promise.all([
          supabase.from('claims').select('*').eq('id', id).single(),
          supabase.from('claims').select('claim_number').eq('id', id).single(),
          supabase.from('claim_photos').select('id, file_path, file_name').eq('claim_id', id),
        ]);
        if (claimRow) {
          const loaded: ClaimReport = {
            id: claimRow.id, status: claimRow.status as any, createdAt: claimRow.created_at, updatedAt: claimRow.updated_at,
            incidentDate: claimRow.incident_date, incidentTime: claimRow.incident_time, incidentLocation: claimRow.incident_location,
            vehicleUsage: claimRow.vehicle_usage, journeyDetails: claimRow.journey_details, description: claimRow.description,
            vehicleId: claimRow.vehicle_id, speedBeforeBraking: claimRow.speed_before_braking,
            thirdParties: (claimRow.third_parties as any) || [], otherPropertyDamage: claimRow.other_property_damage,
            otherPropertyOwner: claimRow.other_property_owner, witnesses: (claimRow.witnesses as any) || [],
            policeAttended: claimRow.police_attended, policeOfficerDetails: claimRow.police_officer_details,
            anyoneHurt: claimRow.anyone_hurt, injuryDetails: claimRow.injury_details,
            weatherCondition: claimRow.weather_condition as any, roadCondition: claimRow.road_condition as any,
            driverConsumedSubstance: claimRow.driver_consumed_substance, substanceDetails: claimRow.substance_details,
            blameDescription: claimRow.blame_description, liabilityAdmitted: claimRow.liability_admitted,
            liabilityDetails: claimRow.liability_details,
            atFault: (claimRow as any).at_fault || '',
            courtesyCarRequested: (claimRow as any).courtesy_car_requested || false,
            damageDescription: claimRow.damage_description,
            vehicleTowed: claimRow.vehicle_towed, towingCompany: claimRow.towing_company,
            repairerName: claimRow.repairer_name, repairerPhone: claimRow.repairer_phone,
            repairerAddress: claimRow.repairer_address, insuranceCompany: claimRow.insurance_company || '',
            selectedPanelShopId: claimRow.selected_panel_shop_id || '',
          };
          setClaim(loaded);
        }
        if (claimNumData?.claim_number) setClaimNumber(claimNumData.claim_number);
        if (photosData) setPhotos(photosData as ClaimPhoto[]);
        setLoadingClaim(false);
      };
      loadClaim();
    }
  }, [id]);

  const update = (field: keyof ClaimReport, value: any) => setClaim(prev => ({ ...prev, [field]: value, updatedAt: new Date().toISOString() }));

  const shouldSave = () => {
    // Only save once the user has filled in date, time, and location
    return !!(claim.incidentDate && claim.incidentTime && claim.incidentLocation?.trim());
  };

  const autoSave = async () => {
    if (!shouldSave()) return;
    const savedId = await saveClaim({ ...claim, updatedAt: new Date().toISOString() });
    if (!claim.id && savedId) setClaim(prev => ({ ...prev, id: savedId }));
  };

  const handleDeleteReport = async () => {
    if (!claim.id) return;
    setDeleting(true);
    try {
      await deleteClaim(claim.id);
      toast.success('Report deleted');
      navigate('/claims');
    } catch (err: any) {
      toast.error(err?.message || 'Could not delete report');
    } finally {
      setDeleting(false);
    }
  };

  const next = async () => { if (navigating) return; setNavigating(true); try { await autoSave(); setStep(s => Math.min(s + 1, STEPS.length - 1)); } finally { setNavigating(false); } };
  const prev = async () => { if (navigating) return; setNavigating(true); try { await autoSave(); setStep(s => Math.max(s - 1, 0)); } finally { setNavigating(false); } };

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    await saveClaim({ ...claim, status: 'saved' as const, updatedAt: new Date().toISOString() });
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
    for (const rawFile of Array.from(files)) {
      if (rawFile.size > 10 * 1024 * 1024) { toast.error(`${rawFile.name} is too large (max 10MB)`); continue; }
      const file = await compressImage(rawFile);
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

  if (loadingClaim) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={async () => { if (shouldSave()) await autoSave(); navigate(-1); }} className="p-2 -ml-2 rounded-xl hover:bg-muted transition-colors">
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

          {claim.id && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  disabled={deleting}
                  className="p-2 rounded-xl hover:bg-muted transition-colors disabled:opacity-50"
                  title="Delete report"
                >
                  <Trash2 className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete report?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete this accident report.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteReport}
                    disabled={deleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleting ? 'Deleting…' : 'Delete'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
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
                    <select
                      value={claim.vehicleId}
                      onChange={e => {
                        const vid = e.target.value;
                        if (!vid) return;
                        const v = vehicles.find(x => x.id === vid);
                        setClaim(prev => ({ ...prev, vehicleId: vid, insuranceCompany: v?.insuranceCompany || '' }));
                      }}
                      className="w-full p-3.5 rounded-xl border border-border bg-background text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
                    >
                      <option value="">{t('claims.vehicle.selectVehicle')}</option>
                      {vehicles.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.regoNumber} — {v.year} {v.make} {v.model}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            )}

            {/* At the Scene / Incident Details */}
            {step === 1 && (
              <div className="card-surface space-y-4">
                {!isEdit && <p className="text-xs text-muted-foreground -mt-1">Capture the essentials now. You can add more details later.</p>}

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

                {isEdit && (
                  <>
                    <div><label className="form-label">Vehicle usage</label><input className="form-input" placeholder="e.g. Personal, Business" value={claim.vehicleUsage} onChange={e => update('vehicleUsage', e.target.value)} /></div>
                    <div><label className="form-label">Journey details</label><textarea className="form-input min-h-[60px]" placeholder="Where were you going?" value={claim.journeyDetails} onChange={e => update('journeyDetails', e.target.value)} /></div>
                    <div><label className="form-label">Description of incident</label><textarea className="form-input min-h-[80px]" placeholder="Describe what happened" value={claim.description} onChange={e => update('description', e.target.value)} /></div>
                  </>
                )}

                {/* Fault selection */}
                <div>
                  <label className="form-label">Who is at fault?</label>
                  <select className="form-input" value={claim.atFault} onChange={e => update('atFault', e.target.value)}>
                    <option value="">Select...</option>
                    <option value="me">I am at fault</option>
                    <option value="other_party">The other party is at fault</option>
                    <option value="shared">Shared fault</option>
                  </select>
                </div>
                {claim.atFault === 'other_party' && (
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-3">
                    <div className="flex items-center gap-3">
                      <Car className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">Courtesy car available</p>
                        <p className="text-xs text-muted-foreground">Since you're not at fault, you may be entitled to a courtesy car while yours is being repaired.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <input type="checkbox" id="courtesyCar" className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20" checked={claim.courtesyCarRequested} onChange={e => update('courtesyCarRequested', e.target.checked)} />
                      <label htmlFor="courtesyCar" className="text-sm font-medium text-foreground">I'd like to request a courtesy car</label>
                    </div>
                  </div>
                )}


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
                  <div className="flex gap-2">
                    <button type="button" onClick={async () => {
                      if (!claim.id) {
                        const savedId = await saveClaim({ ...claim, updatedAt: new Date().toISOString() });
                        if (savedId) setClaim(prev => ({ ...prev, id: savedId }));
                      }
                      cameraInputRef.current?.click();
                    }} disabled={uploading}
                      className="btn-secondary flex-1 h-9 gap-2 text-xs">
                      {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                      {t('claims.insurance.takePhoto', 'Take photo')}
                    </button>
                    <button type="button" onClick={async () => {
                      if (!claim.id) {
                        const savedId = await saveClaim({ ...claim, updatedAt: new Date().toISOString() });
                        if (savedId) setClaim(prev => ({ ...prev, id: savedId }));
                      }
                      photoInputRef.current?.click();
                    }} disabled={uploading}
                      className="btn-secondary flex-1 h-9 gap-2 text-xs">
                      {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>📁</span>}
                      {t('claims.insurance.gallery', 'Gallery')}
                    </button>
                  </div>
                  <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={handlePhotoUpload} />
                  <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
                </div>
              </div>
            )}

            {/* Edit-only Step 2: Damage & Vehicle */}
            {isEdit && step === 2 && (
              <div className="card-surface space-y-4">
                <div><label className="form-label">Speed before braking (km/h)</label><input className="form-input" type="text" placeholder="e.g. 50" value={claim.speedBeforeBraking} onChange={e => update('speedBeforeBraking', e.target.value)} /></div>
                <div><label className="form-label">Damage description</label><textarea className="form-input min-h-[80px]" placeholder="Describe the damage to your vehicle" value={claim.damageDescription} onChange={e => update('damageDescription', e.target.value)} /></div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="vehicleTowed" className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20" checked={claim.vehicleTowed} onChange={e => update('vehicleTowed', e.target.checked)} />
                  <label htmlFor="vehicleTowed" className="text-sm font-medium text-foreground">Vehicle was towed</label>
                </div>
                {claim.vehicleTowed && (
                  <div><label className="form-label">Towing company</label><input className="form-input" placeholder="Company name" value={claim.towingCompany} onChange={e => update('towingCompany', e.target.value)} /></div>
                )}
                <div className="border-t border-border pt-4 mt-2">
                  <p className="text-xs font-semibold text-muted-foreground mb-3">Repairer details</p>
                  <div className="space-y-3">
                    <div><label className="form-label">Repairer name</label><input className="form-input" value={claim.repairerName} onChange={e => update('repairerName', e.target.value)} /></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div><label className="form-label">Phone</label><input className="form-input" type="tel" value={claim.repairerPhone} onChange={e => update('repairerPhone', e.target.value)} /></div>
                    </div>
                    <div><label className="form-label">Address</label><input className="form-input" value={claim.repairerAddress} onChange={e => update('repairerAddress', e.target.value)} /></div>
                  </div>
                </div>
              </div>
            )}

            {/* Other Party & Witnesses (step 2 in create, step 3 in edit) */}
            {step === (isEdit ? 3 : 2) && (
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
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="form-label">Insurer</label><input className="form-input" placeholder="Insurance company" value={tp.insurer} onChange={e => updTP(i, 'insurer', e.target.value)} /></div>
                        <div><label className="form-label">Policy #</label><input className="form-input" placeholder="Policy number" value={tp.claimNumber} onChange={e => updTP(i, 'claimNumber', e.target.value)} /></div>
                      </div>
                      {isEdit && (
                        <>
                          <div><label className="form-label">Address</label><input className="form-input" value={tp.address} onChange={e => updTP(i, 'address', e.target.value)} /></div>
                          <div className="grid grid-cols-2 gap-3">
                            <div><label className="form-label">Make</label><input className="form-input" value={tp.make} onChange={e => updTP(i, 'make', e.target.value)} /></div>
                            <div><label className="form-label">Model</label><input className="form-input" value={tp.model} onChange={e => updTP(i, 'model', e.target.value)} /></div>
                          </div>
                          <div><label className="form-label">Damage description</label><textarea className="form-input min-h-[60px]" value={tp.damageDescription} onChange={e => updTP(i, 'damageDescription', e.target.value)} /></div>
                        </>
                      )}

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
                  {claim.thirdParties.length > 0 && (
                    <button onClick={addTP} className="w-full py-3 rounded-xl border border-dashed border-primary/30 text-sm text-primary font-medium hover:bg-primary/5 transition-colors">
                      + Add another vehicle
                    </button>
                  )}
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
                      {isEdit && (
                        <>
                          <div><label className="form-label">Address</label><input className="form-input" value={w.address} onChange={e => updW(i, 'address', e.target.value)} /></div>
                          <div className="flex items-center gap-3">
                            <input type="checkbox" id={`passenger-${i}`} className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20" checked={w.isPassenger} onChange={e => updW(i, 'isPassenger', e.target.checked)} />
                            <label htmlFor={`passenger-${i}`} className="text-sm text-foreground">Was a passenger</label>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {claim.witnesses.length > 0 && (
                    <button onClick={addW} className="w-full py-3 rounded-xl border border-dashed border-primary/30 text-sm text-primary font-medium hover:bg-primary/5 transition-colors">
                      + {t('claims.witnesses.addWitness')}
                    </button>
                  )}
                </div>

                {isEdit && (
                  <div className="card-surface space-y-3">
                    <div className="flex items-center gap-3">
                      <input type="checkbox" id="policeAttended" className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20" checked={claim.policeAttended} onChange={e => update('policeAttended', e.target.checked)} />
                      <label htmlFor="policeAttended" className="text-sm font-medium text-foreground">Police attended</label>
                    </div>
                    {claim.policeAttended && (
                      <div><label className="form-label">Officer details</label><input className="form-input" placeholder="Officer name / badge number" value={claim.policeOfficerDetails} onChange={e => update('policeOfficerDetails', e.target.value)} /></div>
                    )}
                    <div className="flex items-center gap-3">
                      <input type="checkbox" id="anyoneHurt" className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20" checked={claim.anyoneHurt} onChange={e => update('anyoneHurt', e.target.checked)} />
                      <label htmlFor="anyoneHurt" className="text-sm font-medium text-foreground">Anyone injured</label>
                    </div>
                    {claim.anyoneHurt && (
                      <div><label className="form-label">Injury details</label><textarea className="form-input min-h-[60px]" value={claim.injuryDetails} onChange={e => update('injuryDetails', e.target.value)} /></div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Edit-only Step 4: Conditions & Liability */}
            {isEdit && step === 4 && (
              <div className="card-surface space-y-4">
                <div>
                  <label className="form-label">Weather condition</label>
                  <select className="form-input" value={claim.weatherCondition} onChange={e => update('weatherCondition', e.target.value)}>
                    <option value="">Select...</option>
                    {WEATHER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Road condition</label>
                  <select className="form-input" value={claim.roadCondition} onChange={e => update('roadCondition', e.target.value)}>
                    <option value="">Select...</option>
                    {ROAD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="substance" className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20" checked={claim.driverConsumedSubstance} onChange={e => update('driverConsumedSubstance', e.target.checked)} />
                  <label htmlFor="substance" className="text-sm font-medium text-foreground">Driver consumed alcohol or drugs</label>
                </div>
                {claim.driverConsumedSubstance && (
                  <div><label className="form-label">Substance details</label><input className="form-input" value={claim.substanceDetails} onChange={e => update('substanceDetails', e.target.value)} /></div>
                )}
                <div className="border-t border-border pt-4 mt-2">
                  <p className="text-xs font-semibold text-muted-foreground mb-3">Liability</p>
                  <div className="space-y-3">
                    <div><label className="form-label">Who is to blame and why?</label><textarea className="form-input min-h-[80px]" value={claim.blameDescription} onChange={e => update('blameDescription', e.target.value)} /></div>
                    <div className="flex items-center gap-3">
                      <input type="checkbox" id="liabilityAdmitted" className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20" checked={claim.liabilityAdmitted} onChange={e => update('liabilityAdmitted', e.target.checked)} />
                      <label htmlFor="liabilityAdmitted" className="text-sm font-medium text-foreground">Liability admitted</label>
                    </div>
                    {claim.liabilityAdmitted && (
                      <div><label className="form-label">Details</label><textarea className="form-input min-h-[60px]" value={claim.liabilityDetails} onChange={e => update('liabilityDetails', e.target.value)} /></div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Review (step 3 in create, step 5 in edit) */}
            {step === STEPS.length - 1 && (
              <div className="space-y-3">
                {!isEdit && (
                  <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
                    <p className="text-xs text-primary font-medium">💡 You can add more details like insurance, repairer, conditions and liability from the incident detail page later.</p>
                  </div>
                )}
                <RSection title={t('claims.review.incident')}>
                  <RRow label={t('claims.review.date')} value={claim.incidentDate} />
                  <RRow label={t('claims.review.time')} value={claim.incidentTime} />
                  <RRow label={t('claims.review.location')} value={claim.incidentLocation} />
                  {isEdit && claim.vehicleUsage && <RRow label="Usage" value={claim.vehicleUsage} />}
                  {isEdit && claim.description && <RRow label="Description" value={claim.description} />}
                </RSection>
                <RSection title={t('claims.review.yourVehicle')}>
                  <RRow label={t('claims.review.vehicle')} value={selV ? `${selV.year} ${selV.make} ${selV.model}` : '—'} />
                  <RRow label={t('claims.review.rego')} value={selV?.regoNumber || '—'} />
                  <RRow label={t('claims.review.photos')} value={t('claims.review.uploaded', { count: photos.length })} />
                  {claim.damageDescription && <RRow label={t('claims.review.damage')} value={claim.damageDescription} />}
                  {isEdit && claim.speedBeforeBraking && <RRow label="Speed" value={`${claim.speedBeforeBraking} km/h`} />}
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
                {isEdit && (claim.weatherCondition || claim.roadCondition || claim.blameDescription) && (
                  <RSection title="Conditions & Liability">
                    {claim.weatherCondition && <RRow label="Weather" value={WEATHER_OPTIONS.find(o => o.value === claim.weatherCondition)?.label || claim.weatherCondition} />}
                    {claim.roadCondition && <RRow label="Road" value={ROAD_OPTIONS.find(o => o.value === claim.roadCondition)?.label || claim.roadCondition} />}
                    {claim.blameDescription && <RRow label="Blame" value={claim.blameDescription} />}
                  </RSection>
                )}
              </div>
            )}

          </motion.div>
        </AnimatePresence>

        <div className="flex flex-col gap-3 pb-16 md:pb-0">
          <div className="flex gap-3">
            {step > 0 && <button onClick={prev} disabled={navigating} className="btn-secondary flex-1 h-11">{navigating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />} {t('common.back')}</button>}
            {step < STEPS.length - 1 ? (
              <button onClick={next} disabled={navigating} className="btn-primary flex-1 h-11">{navigating ? <Loader2 className="w-4 h-4 animate-spin" /> : <>{t('common.next')} <ArrowRight className="w-4 h-4" /></>}</button>
            ) : (
              <button onClick={submit} disabled={submitting} className="btn-primary flex-1 h-11">{submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {t('common.save')} report</button>
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
