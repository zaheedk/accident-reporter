import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Save, Camera, Loader2, MapPin, Car, Trash2, Check, CarFront, Ban, ParkingSquare, Plus, User, Users, Phone, AlertTriangle, FileText } from 'lucide-react';
import { DamagePhotoAnalyzer, ThirdPartyPhotos } from '@/components/PhotoAnalyzer';
import { PhotoCapture } from '@/components/PhotoCapture';
import { motion, AnimatePresence } from 'framer-motion';
import { ClaimReport, ThirdPartyVehicle, Witness, Vehicle, WEATHER_OPTIONS, ROAD_OPTIONS } from '@/types';
import { deleteClaim, getVehicles, saveClaim } from '@/lib/storage';

import { supabase } from '@/integrations/supabase/client';
import { resolveClaimId } from '@/lib/claim-id';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
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

const stepVariants = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 } };

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
    insuranceCompany: '', selectedPanelShopId: '', userClaimNumber: '',
    incidentType: '' as any, // soft field, persisted in description if not in schema
  } as any;
}

type ClaimPhoto = {
  id: string; file_path: string; file_name: string; url?: string;
};

// Step labels for the new 4-step polished wizard
const STEPS = ['Details', 'Scene', 'Vehicles', 'Witnesses', 'Review'] as const;

const INCIDENT_TYPES = [
  { value: 'collision', label: 'Collision', icon: CarFront },
  { value: 'hit_run',   label: 'Hit & run', icon: Ban },
  { value: 'parked',    label: 'Parked',    icon: ParkingSquare },
] as const;

export default function ClaimWizard() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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

  const detectLocation = useCallback(async () => {
    setDetectingLocation(true);
    try {
      const { getCurrentPosition } = await import('@/lib/geolocation');
      const { latitude, longitude } = await getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
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
      if (err?.code === 1) toast.error('Location access denied. Enable location permissions and try again.', { duration: 6000 });
      else if (err?.code === 2) toast.error('Location unavailable. Check your device location settings.');
      else if (err?.code === 3) toast.error('Location request timed out. Please try again.');
      else toast.error(err?.message || 'Could not detect location');
    } finally {
      setDetectingLocation(false);
    }
  }, []);

  const isEdit = !!id;

  useEffect(() => {
    getVehicles(user?.id).then(v => {
      setVehicles(v);
      const regoParam = searchParams.get('rego');
      const vehicleIdParam = searchParams.get('vehicleId');
      if (!id && vehicleIdParam) {
        const match = v.find(veh => veh.id === vehicleIdParam);
        if (match) setClaim(prev => ({ ...prev, vehicleId: match.id, insuranceCompany: match.insuranceCompany || '' }));
      } else if (!id && regoParam) {
        const match = v.find(veh => veh.regoNumber?.toLowerCase() === regoParam.toLowerCase());
        if (match) setClaim(prev => ({ ...prev, vehicleId: match.id, insuranceCompany: match.insuranceCompany || '' }));
      } else if (!id && v.length === 1) {
        setClaim(prev => ({ ...prev, vehicleId: v[0].id, insuranceCompany: v[0].insuranceCompany || '' }));
      }
    });
    if (id) {
      const loadClaim = async () => {
        const resolvedId = await resolveClaimId(id);
        if (!resolvedId) { setLoadingClaim(false); return; }
        const [{ data: claimRow }, { data: claimNumData }, { data: photosData }] = await Promise.all([
          supabase.from('claims').select('*').eq('id', resolvedId).single(),
          supabase.from('claims').select('claim_number').eq('id', resolvedId).single(),
          supabase.from('claim_photos').select('id, file_path, file_name').eq('claim_id', resolvedId),
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
            userClaimNumber: (claimRow as any).user_claim_number || '',
            incidentType: (claimRow as any).incident_type || '',
          } as any;
          setClaim(loaded);
        }
        if (claimNumData?.claim_number) setClaimNumber(claimNumData.claim_number);
        if (photosData) {
          const photosWithUrls = await Promise.all(
            (photosData as ClaimPhoto[]).map(async (p) => {
              const { data: urlData } = await supabase.storage.from('claim-photos').createSignedUrl(p.file_path, 3600);
              return { ...p, url: urlData?.signedUrl || '' };
            })
          );
          setPhotos(photosWithUrls);
        }
        setLoadingClaim(false);
      };
      loadClaim();
    }
  }, [id]);

  const update = (field: keyof ClaimReport, value: any) => setClaim(prev => ({ ...prev, [field]: value, updatedAt: new Date().toISOString() }));

  const shouldSave = () => !!(claim.incidentDate && claim.incidentTime && claim.incidentLocation?.trim());

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
      queryClient.invalidateQueries({ queryKey: ['claims'] });
      toast.success('Report deleted');
      navigate('/claims');
    } catch (err: any) {
      toast.error(err?.message || 'Could not delete report');
    } finally {
      setDeleting(false);
    }
  };

  const next = async () => { if (navigating) return; setNavigating(true); try { await autoSave(); setStep(s => Math.min(s + 1, STEPS.length - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); } finally { setNavigating(false); } };
  const prev = async () => { if (navigating) return; setNavigating(true); try { await autoSave(); setStep(s => Math.max(s - 1, 0)); window.scrollTo({ top: 0, behavior: 'smooth' }); } finally { setNavigating(false); } };

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    await saveClaim({ ...claim, status: 'saved' as const, updatedAt: new Date().toISOString() });
    let recipientEmail = user?.email || '';
    const isPhoneUser = recipientEmail.endsWith('@savo.phone.local');
    if (isPhoneUser) {
      const { data: profileData } = await supabase.from('profiles').select('email, email_verified').eq('user_id', user!.id).single();
      recipientEmail = (profileData?.email && profileData.email_verified) ? profileData.email : '';
    }

    if (recipientEmail) {
      const vehicle = vehicles.find(v => v.id === claim.vehicleId);
      supabase.functions.invoke('send-email', {
        body: {
          type: 'claim_submitted',
          to: recipientEmail,
          data: {
            claimId: claim.id || '', userId: user!.id,
            date: claim.incidentDate, time: claim.incidentTime, location: claim.incidentLocation,
            vehicle: vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : '',
            rego: vehicle?.regoNumber || '', insurer: claim.insuranceCompany,
            policyNumber: vehicle?.insurancePolicyNumber || '',
            description: claim.description, damageDescription: claim.damageDescription,
            vehicleUsage: claim.vehicleUsage, journeyDetails: claim.journeyDetails,
            speedBeforeBraking: claim.speedBeforeBraking,
            vehicleTowed: claim.vehicleTowed ? 'Yes' : 'No', towingCompany: claim.towingCompany,
            weatherCondition: claim.weatherCondition, roadCondition: claim.roadCondition,
            policeAttended: claim.policeAttended ? 'Yes' : 'No', policeOfficerDetails: claim.policeOfficerDetails,
            anyoneHurt: claim.anyoneHurt ? 'Yes' : 'No', injuryDetails: claim.injuryDetails,
            driverConsumedSubstance: claim.driverConsumedSubstance ? 'Yes' : 'No', substanceDetails: claim.substanceDetails,
            blameDescription: claim.blameDescription,
            liabilityAdmitted: claim.liabilityAdmitted ? 'Yes' : 'No', liabilityDetails: claim.liabilityDetails,
            repairerName: claim.repairerName, repairerPhone: claim.repairerPhone, repairerAddress: claim.repairerAddress,
            thirdParties: JSON.stringify(claim.thirdParties),
            witnesses: JSON.stringify(claim.witnesses),
            claimNumber: claimNumber?.toString() || '',
          },
        },
      }).catch(err => console.error('Email send failed:', err));
    }

    if (claim.courtesyCarRequested && claim.atFault === 'other_party' && claim.id) {
      const { data: existing } = await supabase.from('claims').select('courtesy_car_email_sent_at').eq('id', claim.id).maybeSingle();
      if (!existing?.courtesy_car_email_sent_at) {
        supabase.functions.invoke('send-courtesy-car-request', { body: { claimId: claim.id } }).then(async () => {
          await supabase.from('claims').update({ courtesy_car_email_sent_at: new Date().toISOString() }).eq('id', claim.id);
          toast.success('Courtesy car request lodged – someone will be in touch shortly');
        }).catch(err => {
          console.error('Courtesy car email failed:', err);
          toast.error('Could not lodge courtesy car request. Please try again.');
        });
      }
    }

    queryClient.invalidateQueries({ queryKey: ['claims'] });
    navigate('/claims');
  };

  const removePhoto = async (photo: ClaimPhoto) => {
    await supabase.storage.from('claim-photos').remove([photo.file_path]);
    await supabase.from('claim_photos').delete().eq('id', photo.id);
    setPhotos(prev => prev.filter(p => p.id !== photo.id));
  };

  const addTP = async () => {
    // Ensure a claim id exists so photo capture (rego, license, damage) works for this party
    if (!claim.id) {
      const savedId = await saveClaim({ ...claim, updatedAt: new Date().toISOString() });
      if (savedId) {
        setClaim(prev => ({
          ...prev,
          id: savedId,
          thirdParties: [...prev.thirdParties, { ...emptyTP }],
        }));
        return;
      }
    }
    update('thirdParties', [...claim.thirdParties, { ...emptyTP }]);
  };
  const updTP = (i: number, f: string, v: string) => { const u = [...claim.thirdParties]; (u[i] as any)[f] = v; update('thirdParties', u); };
  const rmTP = (i: number) => update('thirdParties', claim.thirdParties.filter((_, idx) => idx !== i));
  const addW = () => update('witnesses', [...claim.witnesses, { ...emptyW }]);
  const updW = (i: number, f: string, v: string | boolean) => { const u = [...claim.witnesses]; (u[i] as any)[f] = v; update('witnesses', u); };
  const rmW = (i: number) => update('witnesses', claim.witnesses.filter((_, idx) => idx !== i));
  const selV = vehicles.find(v => v.id === claim.vehicleId);

  // Local-only incident type, mirrored into description prefix on save (no schema change)
  const incidentType = (claim as any).incidentType || '';
  const setIncidentType = (val: string) => setClaim(prev => ({ ...prev, ...( { incidentType: val } as any) }));

  if (loadingClaim) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const reportRef = claimNumber ? `CLM-${String(claimNumber).padStart(4, '0')}` : claim.id ? claim.id.slice(0, 8).toUpperCase() : '';

  return (
    <AppLayout>
      <div className="theme-garage !pt-0 md:!pt-5">
        <div className="space-y-8">
          {/* Header — desktop / tablet (Apple/Linear) */}
          <div className="hidden md:flex items-end justify-between gap-3 pt-2">
            <div className="flex items-start gap-2 min-w-0">
              <button onClick={async () => { if (shouldSave()) await autoSave(); navigate(-1); }}
                className="w-9 h-9 -ml-1 mt-1 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0"
                aria-label="Back">
                <ArrowLeft className="w-[18px] h-[18px]" strokeWidth={2} />
              </button>
              <div className="min-w-0">
                <h1 className="text-[28px] leading-tight font-semibold text-foreground tracking-[-0.02em] truncate">
                  Report incident
                </h1>
                <p className="text-[13px] text-muted-foreground mt-1">
                  {isEdit ? 'Edit claim' : 'New claim'}{reportRef ? ` · ${reportRef}` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Save className="w-3 h-3" /> Auto-saved
              </span>
              {claim.id && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button type="button" disabled={deleting}
                      className="w-9 h-9 rounded-lg hover:bg-muted transition-colors disabled:opacity-50 flex items-center justify-center"
                      title="Delete report">
                      <Trash2 className="w-4 h-4 text-muted-foreground" strokeWidth={2} />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete report?</AlertDialogTitle>
                      <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteReport} disabled={deleting}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        {deleting ? 'Deleting…' : 'Delete'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>

          {/* Header — mobile dark hero card with integrated stepper */}
          <div className="md:hidden -mx-4 sm:-mx-6 -mt-5 px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-5 bg-foreground text-background rounded-b-3xl shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <button onClick={async () => { if (shouldSave()) await autoSave(); navigate(-1); }}
                className="w-9 h-9 -ml-2 rounded-full flex items-center justify-center text-background/70 hover:text-background hover:bg-background/10 transition-colors flex-shrink-0"
                aria-label="Back">
                <ArrowLeft className="w-[18px] h-[18px]" strokeWidth={2.2} />
              </button>
              <div className="flex-1 min-w-0 text-center px-1">
                <p className="text-[10px] uppercase tracking-[0.18em] text-background/50 font-semibold">
                  {isEdit ? 'Edit claim' : 'New claim'}{reportRef ? ` · ${reportRef}` : ''}
                </p>
                <h1 className="text-[22px] leading-tight font-bold tracking-[-0.02em] mt-0.5">
                  Report incident
                </h1>
              </div>
              {claim.id ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button type="button" disabled={deleting}
                      className="w-9 h-9 -mr-1 rounded-full hover:bg-background/10 transition-colors disabled:opacity-50 flex items-center justify-center text-background/70 hover:text-background"
                      title="Delete report">
                      <Trash2 className="w-4 h-4" strokeWidth={2} />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete report?</AlertDialogTitle>
                      <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteReport} disabled={deleting}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        {deleting ? 'Deleting…' : 'Delete'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : <div className="w-9" />}
            </div>

            {/* Compact stepper inside dark header */}
            <div className="flex items-center mt-5">
              {STEPS.map((label, i) => {
                const status = i < step ? 'done' : i === step ? 'active' : 'idle';
                return (
                  <div key={label} className="flex items-center flex-1 min-w-0 last:flex-none">
                    <button
                      type="button"
                      onClick={async () => { if (shouldSave()) await autoSave(); setStep(i); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      className="flex items-center gap-1.5 min-w-0"
                    >
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold tabular-nums shrink-0 transition-colors ${
                        status === 'active' ? 'bg-background text-foreground' :
                        status === 'done' ? 'bg-background/90 text-foreground' :
                        'bg-background/15 text-background/60'
                      }`}>
                        {status === 'done' ? <Check className="w-3 h-3" strokeWidth={3} /> : i + 1}
                      </span>
                      {status === 'active' && (
                        <span className="text-[12px] font-semibold text-background truncate">{label}</span>
                      )}
                    </button>
                    {i < STEPS.length - 1 && (
                      <div className={`h-px flex-1 mx-2 ${i < step ? 'bg-background/80' : 'bg-background/20'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Body — sidebar + main on tablet+ */}
          <div className="md:grid md:grid-cols-[240px_1fr] md:gap-6 lg:grid-cols-[260px_1fr] lg:gap-8 space-y-6 md:space-y-0">
            {/* Left rail — Garage-style cards */}
            <aside className="hidden md:block space-y-4">
              {/* Progress panel */}
              <div className="rounded-xl bg-card border border-border overflow-hidden">
                <div className="px-3.5 pt-3 pb-2 text-[11px] font-medium text-muted-foreground">Progress</div>
                <div className="divide-y divide-border">
                  {STEPS.map((label, i) => {
                    const status = i < step ? 'done' : i === step ? 'active' : 'idle';
                    return (
                      <button
                        key={label}
                        onClick={async () => { if (shouldSave()) await autoSave(); setStep(i); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left hover:bg-muted/50 transition-colors ${status === 'active' ? 'bg-muted/40' : ''}`}
                      >
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold tabular-nums shrink-0 ${
                          status === 'done' ? 'bg-foreground text-background' :
                          status === 'active' ? 'bg-foreground text-background' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {status === 'done' ? <Check className="w-3 h-3" strokeWidth={3} /> : i + 1}
                        </span>
                        <p className={`flex-1 min-w-0 text-[13px] ${status === 'idle' ? 'text-muted-foreground' : 'text-foreground font-medium'}`}>{label}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick actions panel */}
              <div className="rounded-xl bg-card border border-border overflow-hidden">
                <div className="px-3.5 pt-3 pb-2 text-[11px] font-medium text-muted-foreground">Emergency</div>
                <div className="divide-y divide-border">
                  <a href="tel:111" className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-muted/50 transition-colors text-left">
                    <Phone className="w-3.5 h-3.5 text-destructive" strokeWidth={2} />
                    <p className="flex-1 min-w-0 text-[13px] text-foreground">Call police · 111</p>
                  </a>
                  <Link to="/tow-companies" className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-muted/50 transition-colors text-left">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" strokeWidth={2} />
                    <p className="flex-1 min-w-0 text-[13px] text-foreground">Find a tow truck</p>
                  </Link>
                  <Link to="/claims" className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-muted/50 transition-colors text-left">
                    <FileText className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={2} />
                    <p className="flex-1 min-w-0 text-[13px] text-foreground">All reports</p>
                  </Link>
                </div>
              </div>

              {/* Auto-save hint */}
              <div className="rounded-xl bg-card border border-border p-3.5">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Save className="w-3 h-3" /> Auto-saved as you type
                </div>
              </div>
            </aside>

            {/* Right column — wizard */}
            <div className="space-y-6 pb-24">

        {/* mobile stepper now lives inside the dark header card above */}

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div key={step} variants={stepVariants} initial="initial" animate="animate" exit="exit"
            transition={{ ease: [0.25, 0.1, 0.25, 1], duration: 0.22 }} className="space-y-5">

            {/* ===== STEP 1: DETAILS ===== */}
            {step === 0 && (
              <div className="space-y-5">
                {/* Your vehicle — tile-style picker */}
                <div>
                  <label className="field-label">Your vehicle</label>
                  {vehicles.length === 0 ? (
                    <button onClick={async () => { await autoSave(); navigate('/vehicles/new'); }}
                      className="w-full p-4 rounded-2xl border border-dashed border-border bg-muted/30 text-sm text-muted-foreground hover:bg-muted/50 transition-colors">
                      No vehicles yet — <span className="text-foreground font-semibold">Add one</span>
                    </button>
                  ) : (
                    (() => {
                      const selected = vehicles.find(v => v.id === claim.vehicleId);
                      return (
                        <div className="relative rounded-2xl border border-border bg-card hover:border-foreground/30 transition-colors">
                          <div className="flex items-center gap-3 p-3 pr-10">
                            <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center shrink-0">
                              <Car className="w-5 h-5 text-foreground/70" strokeWidth={1.8} />
                            </div>
                            <div className="min-w-0 flex-1">
                              {selected ? (
                                <>
                                  <div className="text-[15px] font-bold text-foreground truncate tracking-[-0.01em]">
                                    {selected.year} {selected.make} {selected.model}
                                  </div>
                                  <div className="text-[12px] text-muted-foreground tabular-nums uppercase tracking-wider mt-0.5">
                                    {selected.regoNumber}
                                  </div>
                                </>
                              ) : (
                                <div className="text-[14px] font-semibold text-muted-foreground">Select your vehicle</div>
                              )}
                            </div>
                            <ArrowRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground rotate-0" strokeWidth={2} />
                          </div>
                          <select
                            aria-label="Select vehicle"
                            value={claim.vehicleId}
                            onChange={e => {
                              const vid = e.target.value;
                              const v = vehicles.find(x => x.id === vid);
                              setClaim(prev => ({ ...prev, vehicleId: vid, insuranceCompany: v?.insuranceCompany || prev.insuranceCompany }));
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer">
                            <option value="">Select your vehicle</option>
                            {vehicles.map(v => (
                              <option key={v.id} value={v.id}>{v.regoNumber} — {v.year} {v.make} {v.model}</option>
                            ))}
                          </select>
                        </div>
                      );
                    })()
                  )}
                </div>

                {/* When did it happen — Date & Time */}
                <div>
                  <label className="field-label">When did it happen?</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-border bg-card px-3.5 py-2.5">
                      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/80 font-medium">Date</div>
                      <input type="date"
                        className="w-full mt-0.5 bg-transparent text-[15px] font-semibold text-foreground tabular-nums focus:outline-none"
                        value={claim.incidentDate} onChange={e => update('incidentDate', e.target.value)} />
                    </div>
                    <div className="rounded-2xl border border-border bg-card px-3.5 py-2.5">
                      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/80 font-medium">Time</div>
                      <input type="time"
                        className="w-full mt-0.5 bg-transparent text-[15px] font-semibold text-foreground tabular-nums focus:outline-none"
                        value={claim.incidentTime} onChange={e => update('incidentTime', e.target.value)} />
                    </div>
                  </div>
                </div>

                {/* Incident type tiles */}
                <div>
                  <label className="field-label">Incident type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {INCIDENT_TYPES.map(({ value, label, icon: Icon }) => (
                      <button key={value} type="button"
                        onClick={() => setIncidentType(value)}
                        data-active={incidentType === value}
                        className="seg-tile">
                        <Icon className="seg-tile-icon" strokeWidth={1.7} />
                        <span className="seg-tile-label">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Location — bigger preview + stacked address */}
                <div>
                  <label className="field-label">Location</label>
                  <div className="rounded-2xl border border-border overflow-hidden bg-card">
                    <div className="relative h-36 bg-gradient-to-br from-muted to-muted/40 flex items-center justify-center"
                      style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent 0 22px, hsl(var(--border) / .45) 22px 23px), repeating-linear-gradient(90deg, transparent 0 22px, hsl(var(--border) / .45) 22px 23px)' }}>
                      <div className="relative">
                        <div className="absolute inset-0 rounded-full bg-foreground/20 blur-md scale-110" />
                        <div className="relative w-11 h-11 rounded-full bg-foreground flex items-center justify-center shadow-xl">
                          <MapPin className="w-5 h-5 text-background" strokeWidth={2.5} fill="currentColor" />
                        </div>
                      </div>
                    </div>
                    <div className="p-3 flex items-center gap-2 border-t border-border">
                      <div className="flex-1 min-w-0">
                        <input
                          className="w-full bg-transparent text-[14px] font-bold text-foreground placeholder:text-muted-foreground/60 focus:outline-none truncate"
                          placeholder="Street address"
                          value={claim.incidentLocation}
                          onChange={e => update('incidentLocation', e.target.value)} />
                        <div className="text-[12px] text-muted-foreground truncate">
                          {claim.incidentLocation ? 'Tap to edit · auto-saved' : 'Detect or type the address'}
                        </div>
                      </div>
                      <button type="button" onClick={detectLocation} disabled={detectingLocation}
                        className="shrink-0 h-9 px-3.5 rounded-full bg-muted text-xs font-semibold text-foreground hover:bg-muted/70 transition-colors flex items-center gap-1.5 disabled:opacity-50">
                        {detectingLocation ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
                        {detectingLocation ? 'Detecting' : 'Detect'}
                      </button>
                    </div>
                  </div>
                </div>

                {isEdit && (
                  <>
                    {/* What happened */}
                    <div>
                      <label className="field-label">What happened</label>
                      <textarea className="w-full min-h-[88px] px-3.5 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
                        placeholder="Describe the incident in your own words"
                        value={claim.description} onChange={e => update('description', e.target.value)} />
                    </div>

                    {/* Vehicle usage & journey */}
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <label className="field-label">Vehicle usage</label>
                        <input className="w-full h-12 px-3.5 rounded-xl border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
                          placeholder="e.g. Personal commute, work trip"
                          value={claim.vehicleUsage} onChange={e => update('vehicleUsage', e.target.value)} />
                      </div>
                      <div>
                        <label className="field-label">Journey details</label>
                        <input className="w-full h-12 px-3.5 rounded-xl border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
                          placeholder="From → To"
                          value={claim.journeyDetails} onChange={e => update('journeyDetails', e.target.value)} />
                      </div>
                    </div>
                  </>
                )}

              </div>
            )}

            {/* ===== STEP 2: SCENE ===== */}
            {step === 1 && (
              <div className="space-y-5">
                {/* Photos grid */}
                <div>
                  <label className="field-label flex items-center gap-1.5"><Camera className="w-3 h-3" /> Photos</label>
                  <PhotoCapture
                    claimId={claim.id}
                    photos={photos}
                    uploading={uploading}
                    setUploading={setUploading}
                    userId={user?.id || ''}
                    ensureClaimId={async () => {
                      if (claim.id) return claim.id;
                      const savedId = await saveClaim({ ...claim, updatedAt: new Date().toISOString() });
                      if (savedId) setClaim(prev => ({ ...prev, id: savedId }));
                      return savedId || undefined;
                    }}
                    onUploaded={(p) => setPhotos(prev => [...prev, p as ClaimPhoto])}
                    onRemoved={removePhoto}
                  />
                </div>

                {/* Conditions */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="field-label">Weather</label>
                    <select className="w-full h-12 px-3.5 rounded-xl border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 appearance-none"
                      value={claim.weatherCondition} onChange={e => update('weatherCondition', e.target.value)}>
                      <option value="">Select…</option>
                      {WEATHER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="field-label">Road</label>
                    <select className="w-full h-12 px-3.5 rounded-xl border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 appearance-none"
                      value={claim.roadCondition} onChange={e => update('roadCondition', e.target.value)}>
                      <option value="">Select…</option>
                      {ROAD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>

                {/* Speed */}
                <div>
                  <label className="field-label">Speed before braking (km/h)</label>
                  <input className="w-full h-12 px-3.5 rounded-xl border border-border bg-card text-sm text-foreground tabular-nums placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/30"
                    placeholder="e.g. 50" value={claim.speedBeforeBraking} onChange={e => update('speedBeforeBraking', e.target.value)} />
                </div>

                {isEdit && (
                  <>
                    {/* Damage to your vehicle */}
                    <div>
                      <label className="field-label">Damage to your vehicle</label>
                      <textarea className="w-full min-h-[72px] px-3.5 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
                        placeholder="Describe the visible damage"
                        value={claim.damageDescription} onChange={e => update('damageDescription', e.target.value)} />
                    </div>

                    {/* Towed */}
                    <div className="card-soft space-y-3">
                      <ToggleRow id="towed" label="Vehicle was towed"
                        checked={!!claim.vehicleTowed}
                        onChange={v => update('vehicleTowed', v)} />
                      {claim.vehicleTowed && (
                        <input className="w-full h-11 px-3.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                          placeholder="Towing company"
                          value={claim.towingCompany} onChange={e => update('towingCompany', e.target.value)} />
                      )}
                    </div>

                    {/* Police */}
                    <div className="card-soft space-y-3">
                      <ToggleRow id="police" label="Police attended"
                        checked={!!claim.policeAttended}
                        onChange={v => update('policeAttended', v)} />
                      {claim.policeAttended && (
                        <input className="w-full h-11 px-3.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                          placeholder="Officer name / badge / station"
                          value={claim.policeOfficerDetails} onChange={e => update('policeOfficerDetails', e.target.value)} />
                      )}
                    </div>

                    {/* Injuries */}
                    <div className="card-soft space-y-3">
                      <ToggleRow id="hurt" label="Anyone hurt"
                        checked={!!claim.anyoneHurt}
                        onChange={v => update('anyoneHurt', v)} />
                      {claim.anyoneHurt && (
                        <textarea className="w-full min-h-[64px] px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                          placeholder="Describe injuries and who was affected"
                          value={claim.injuryDetails} onChange={e => update('injuryDetails', e.target.value)} />
                      )}
                    </div>

                    {/* Substance use */}
                    <div className="card-soft space-y-3">
                      <ToggleRow id="substance" label="Driver consumed alcohol or drugs"
                        checked={!!claim.driverConsumedSubstance}
                        onChange={v => update('driverConsumedSubstance', v)} />
                      {claim.driverConsumedSubstance && (
                        <textarea className="w-full min-h-[64px] px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                          placeholder="Substance and quantity"
                          value={claim.substanceDetails} onChange={e => update('substanceDetails', e.target.value)} />
                      )}
                    </div>

                    {/* Other property damage */}
                    <div className="card-soft space-y-3">
                      <label className="field-label mb-0">Other property damage</label>
                      <textarea className="w-full min-h-[64px] px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                        placeholder="e.g. fence, lamp post (optional)"
                        value={claim.otherPropertyDamage} onChange={e => update('otherPropertyDamage', e.target.value)} />
                      <input className="w-full h-11 px-3.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                        placeholder="Owner name / contact"
                        value={claim.otherPropertyOwner} onChange={e => update('otherPropertyOwner', e.target.value)} />
                    </div>
                    {/* Repairer */}
                    <div className="card-soft space-y-3">
                      <label className="field-label mb-0">Repairer (if known)</label>
                      <input className="w-full h-11 px-3.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                        placeholder="Repairer / panel shop name"
                        value={claim.repairerName} onChange={e => update('repairerName', e.target.value)} />
                      <div className="grid grid-cols-2 gap-2">
                        <input className="h-11 px-3.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                          type="tel" placeholder="Phone"
                          value={claim.repairerPhone} onChange={e => update('repairerPhone', e.target.value)} />
                        <input className="h-11 px-3.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                          placeholder="Address"
                          value={claim.repairerAddress} onChange={e => update('repairerAddress', e.target.value)} />
                      </div>
                    </div>

                    {/* Your insurance claim number */}
                    <div>
                      <label className="field-label">Your insurance claim #</label>
                      <input className="w-full h-12 px-3.5 rounded-xl border border-border bg-card text-sm text-foreground tabular-nums focus:outline-none focus:ring-2 focus:ring-ring/30"
                        placeholder="Reference from your insurer"
                        value={claim.userClaimNumber} onChange={e => update('userClaimNumber', e.target.value)} />
                    </div>
                  </>
                )}

              </div>
            )}

            {/* ===== STEP 3: VEHICLES ===== */}
            {step === 2 && (
              <div className="space-y-5">
                {/* Other vehicles */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="field-label mb-0 flex items-center gap-1.5"><Users className="w-3 h-3" /> Other vehicles</label>
                    {claim.thirdParties.length > 0 && (
                      <button onClick={addTP} className="text-xs font-semibold text-primary hover:underline">+ Add</button>
                    )}
                  </div>
                  {claim.thirdParties.length === 0 && (
                    <button onClick={addTP} className="dashed-zone w-full p-5 flex flex-col items-center gap-1.5">
                      <Plus className="w-5 h-5 text-muted-foreground" />
                      <span className="text-sm font-semibold text-foreground">Add other vehicle</span>
                      <span className="text-xs text-muted-foreground">Driver, rego, insurer, photos</span>
                    </button>
                  )}
                  {claim.thirdParties.map((tp, i) => (
                    <div key={i} className="card-soft space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="eyebrow">Vehicle {i + 1}</span>
                        <button onClick={() => rmTP(i)} className="text-xs text-destructive hover:underline font-semibold">Remove</button>
                      </div>
                      <input className="w-full h-11 px-3.5 rounded-xl border border-border bg-background text-base font-bold tabular-nums tracking-wide focus:outline-none focus:ring-2 focus:ring-ring/30"
                        placeholder="REGO" value={tp.regoNumber} onChange={e => updTP(i, 'regoNumber', e.target.value.toUpperCase())} />
                      <div className="grid grid-cols-2 gap-2">
                        <input className="h-11 px-3.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                          placeholder="Driver name" value={tp.ownerName} onChange={e => updTP(i, 'ownerName', e.target.value)} />
                        <input className="h-11 px-3.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                          type="tel" placeholder="Phone" value={tp.phone} onChange={e => updTP(i, 'phone', e.target.value)} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input className="h-11 px-3.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                          placeholder="Insurer" value={tp.insurer} onChange={e => updTP(i, 'insurer', e.target.value)} />
                        <input className="h-11 px-3.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                          placeholder="Policy #" value={tp.claimNumber} onChange={e => updTP(i, 'claimNumber', e.target.value)} />
                      </div>
                      
                      {claim.id && user && (
                        <ThirdPartyPhotos
                          tpIndex={i} claimId={claim.id} userId={user.id}
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
              </div>
            )}

            {/* ===== STEP 4: WITNESSES & FAULT ===== */}
            {step === 3 && (
              <div className="space-y-5">
                {/* Witnesses */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="field-label mb-0 flex items-center gap-1.5"><User className="w-3 h-3" /> Witnesses</label>
                    {claim.witnesses.length > 0 && (
                      <button onClick={addW} className="text-xs font-semibold text-primary hover:underline">+ Add</button>
                    )}
                  </div>
                  {claim.witnesses.length === 0 && (
                    <button onClick={addW} className="dashed-zone w-full p-5 flex flex-col items-center gap-1.5">
                      <Plus className="w-5 h-5 text-muted-foreground" />
                      <span className="text-sm font-semibold text-foreground">Add witness</span>
                      <span className="text-xs text-muted-foreground">Optional but helpful</span>
                    </button>
                  )}
                  {claim.witnesses.map((w, i) => (
                    <div key={i} className="card-soft space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="eyebrow">Witness {i + 1}</span>
                        <button onClick={() => rmW(i)} className="text-xs text-destructive hover:underline font-semibold">Remove</button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input className="h-11 px-3.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                          placeholder="Full name" value={w.name} onChange={e => updW(i, 'name', e.target.value)} />
                        <input className="h-11 px-3.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                          placeholder="Phone" value={w.phone} onChange={e => updW(i, 'phone', e.target.value)} />
                      </div>
                      <input className="w-full h-11 px-3.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                        placeholder="Address" value={w.address} onChange={e => updW(i, 'address', e.target.value)} />
                      <ToggleRow id={`passenger-${i}`} label="Was a passenger" checked={!!w.isPassenger}
                        onChange={v => updW(i, 'isPassenger', v)} />
                    </div>
                  ))}
                </div>

                {/* Fault */}
                <div className="card-soft space-y-3">
                  <label className="field-label">Who is at fault?</label>
                  <select className="w-full h-12 px-3.5 rounded-xl border border-border bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-ring/30 appearance-none"
                    value={claim.atFault} onChange={e => update('atFault', e.target.value)}>
                    <option value="">Select…</option>
                    <option value="me">I am at fault</option>
                    <option value="other_party">The other party is at fault</option>
                    <option value="shared">Shared fault</option>
                  </select>
                  {claim.atFault === 'other_party' && (
                    <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 flex items-start gap-3">
                      <Car className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div>
                          <p className="text-sm font-semibold text-foreground">Courtesy car available</p>
                          <p className="text-xs text-muted-foreground">You may be entitled to one while yours is repaired.</p>
                        </div>
                        <label className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer">
                          <input type="checkbox" className="w-4 h-4 rounded border-border text-primary focus:ring-ring/30"
                            checked={claim.courtesyCarRequested} onChange={e => update('courtesyCarRequested', e.target.checked)} />
                          Request a courtesy car
                        </label>
                      </div>
                    </div>
                  )}
                  <textarea className="w-full min-h-[72px] px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                    placeholder="Who is to blame and why?" value={claim.blameDescription} onChange={e => update('blameDescription', e.target.value)} />
                </div>
              </div>
            )}

            {/* ===== STEP 5: REVIEW ===== */}
            {step === 4 && (
              <div className="space-y-3">
                <RSection title="Incident">
                  <RRow label="Date" value={claim.incidentDate} />
                  <RRow label="Time" value={claim.incidentTime} />
                  <RRow label="Location" value={claim.incidentLocation} />
                  {incidentType && <RRow label="Type" value={INCIDENT_TYPES.find(t => t.value === incidentType)?.label || ''} />}
                  {claim.vehicleUsage && <RRow label="Usage" value={claim.vehicleUsage} />}
                  {claim.description && <RRow label="What happened" value={claim.description} />}
                </RSection>
                <RSection title="Your vehicle">
                  <RRow label="Vehicle" value={selV ? `${selV.year} ${selV.make} ${selV.model}` : '—'} />
                  <RRow label="Rego" value={selV?.regoNumber || '—'} />
                  <RRow label="Photos" value={`${photos.length} uploaded`} />
                  {claim.damageDescription && <RRow label="Damage" value={claim.damageDescription} />}
                  {claim.speedBeforeBraking && <RRow label="Speed" value={`${claim.speedBeforeBraking} km/h`} />}
                </RSection>
                <RSection title="Other parties">
                  {claim.thirdParties.length === 0
                    ? <p className="text-sm text-muted-foreground">None</p>
                    : claim.thirdParties.map((tp, i) => (
                      <div key={i} className="py-1">
                        <RRow label={`Vehicle ${i + 1}`} value={`${tp.regoNumber} – ${tp.ownerName}`} />
                      </div>
                    ))}
                </RSection>
                <RSection title="Witnesses">
                  {claim.witnesses.length === 0
                    ? <p className="text-sm text-muted-foreground">None</p>
                    : claim.witnesses.map((w, i) => <RRow key={i} label={`Witness ${i + 1}`} value={`${w.name} – ${w.phone}`} />)}
                </RSection>
                {claim.atFault && (
                  <RSection title="Fault & conditions">
                    <RRow label="At fault" value={claim.atFault === 'me' ? 'I am at fault' : claim.atFault === 'other_party' ? 'Other party' : 'Shared'} />
                    {claim.atFault === 'other_party' && <RRow label="Courtesy car" value={claim.courtesyCarRequested ? 'Requested' : 'Not requested'} />}
                    {claim.weatherCondition && <RRow label="Weather" value={WEATHER_OPTIONS.find(o => o.value === claim.weatherCondition)?.label || claim.weatherCondition} />}
                    {claim.roadCondition && <RRow label="Road" value={ROAD_OPTIONS.find(o => o.value === claim.roadCondition)?.label || claim.roadCondition} />}
                  </RSection>
                )}
              </div>
            )}

          </motion.div>
        </AnimatePresence>

        {/* Sticky footer actions */}
        <div className="space-y-2 pt-2">
          <div className="flex gap-3">
            {step > 0 && (
              <button onClick={prev} disabled={navigating}
                className="h-12 px-5 rounded-2xl bg-muted text-foreground text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-40 inline-flex items-center justify-center gap-2 shrink-0">
                {navigating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowLeft className="w-4 h-4" strokeWidth={2.2} />}
                Back
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button onClick={next} disabled={navigating}
                className="flex-1 h-12 rounded-2xl bg-foreground text-background text-[15px] font-semibold transition-all active:scale-[0.98] disabled:opacity-40 inline-flex items-center justify-center gap-2 shadow-sm">
                {navigating ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue to {STEPS[step + 1].toLowerCase()} <ArrowRight className="w-4 h-4" strokeWidth={2.2} /></>}
              </button>
            ) : (
              <button onClick={submit} disabled={submitting}
                className="flex-1 h-12 rounded-2xl bg-foreground text-background text-[15px] font-semibold transition-all active:scale-[0.98] disabled:opacity-40 inline-flex items-center justify-center gap-2 shadow-sm">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Save report</>}
              </button>
            )}
          </div>
          <p className="md:hidden text-center text-[11px] text-muted-foreground">
            Step {step + 1} of {STEPS.length} · Auto-saved
          </p>
        </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function ToggleRow({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label htmlFor={id} className="flex items-center justify-between gap-3 cursor-pointer">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        id={id}
        className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-foreground' : 'bg-muted border border-border'}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-background shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </button>
    </label>
  );
}

function RSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card-soft space-y-1">
      <h3 className="eyebrow mb-2">{title}</h3>
      {children}
    </div>
  );
}
function RRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1.5">
      <span className="text-[13px] text-muted-foreground flex-shrink-0">{label}</span>
      <span className="text-[13px] font-medium text-foreground text-right">{value || '—'}</span>
    </div>
  );
}
