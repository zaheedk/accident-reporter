import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Save, Camera, X, Search, Star, Send, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClaimReport, ThirdPartyVehicle, Witness, WEATHER_OPTIONS, ROAD_OPTIONS, Vehicle } from '@/types';
import { getVehicles, getClaims, saveClaim } from '@/lib/storage';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const stepVariants = { initial: { opacity: 0, x: 10 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -10 } };

const emptyTP: ThirdPartyVehicle = { ownerName: '', phone: '', address: '', insurer: '', make: '', model: '', regoNumber: '', damageDescription: '' };
const emptyW: Witness = { name: '', phone: '', address: '', isPassenger: false };

function emptyClaim(): ClaimReport {
  return {
    id: '', status: 'draft', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    incidentDate: '', incidentTime: '', incidentLocation: '', vehicleUsage: '', journeyDetails: '', description: '',
    vehicleId: '', speedBeforeBraking: '', thirdParties: [], otherPropertyDamage: '', otherPropertyOwner: '',
    witnesses: [], policeAttended: false, policeOfficerDetails: '', anyoneHurt: false, injuryDetails: '',
    weatherCondition: '', roadCondition: '', driverConsumedSubstance: false, substanceDetails: '',
    blameDescription: '', liabilityAdmitted: false, liabilityDetails: '',
    damageDescription: '', vehicleTowed: false, towingCompany: '',
    repairerName: '', repairerPhone: '', repairerAddress: '',
    insuranceCompany: '', selectedPanelShopId: '',
  };
}

type PanelShop = {
  id: string; name: string; address: string; city: string; region: string;
  phone: string; email: string; google_rating: number; website: string;
};

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
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [panelShops, setPanelShops] = useState<PanelShop[]>([]);
  const [shopSearch, setShopSearch] = useState('');
  const [photos, setPhotos] = useState<ClaimPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const STEPS = [
    t('claims.steps.incidentDetails'), t('claims.steps.yourVehicle'), t('claims.steps.thirdParties'),
    t('claims.steps.witnessesPolice'), t('claims.steps.conditionsDamage'), t('claims.steps.insuranceRepairer'), t('claims.steps.review')
  ];

  useEffect(() => {
    getVehicles().then(setVehicles);
    supabase.from('panel_shops').select('*').gte('google_rating', 4.5)
      .order('google_rating', { ascending: false }).then(({ data }) => {
        if (data) setPanelShops(data as PanelShop[]);
      });
    if (id) {
      getClaims().then(claims => {
        const e = claims.find(c => c.id === id);
        if (e) setClaim(e);
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
    // Send claim submitted email
    if (user?.email) {
      const vehicle = vehicles.find(v => v.id === claim.vehicleId);
      supabase.functions.invoke('send-email', {
        body: {
          type: 'claim_submitted',
          to: user.email,
          data: {
            date: claim.incidentDate,
            location: claim.incidentLocation,
            vehicle: vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : '',
            insurer: claim.insuranceCompany,
          },
        },
      }).catch(err => console.error('Email send failed:', err));
    }
    navigate('/claims');
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user || !claim.id) {
      if (!claim.id) {
        const savedId = await saveClaim({ ...claim, updatedAt: new Date().toISOString() });
        if (savedId) setClaim(prev => ({ ...prev, id: savedId }));
        else { toast.error('Save the claim first'); return; }
      }
      if (!files || !user) return;
    }
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

  const selectedShop = panelShops.find(s => s.id === claim.selectedPanelShopId);
  const filteredShops = panelShops.filter(s =>
    s.name.toLowerCase().includes(shopSearch.toLowerCase()) ||
    s.city.toLowerCase().includes(shopSearch.toLowerCase())
  );

  const sendToRepairer = async () => {
    if (!selectedShop || !claim.id || !user) return;
    setSending(true);
    await supabase.from('repair_requests').insert({
      claim_id: claim.id,
      panel_shop_id: selectedShop.id,
      user_id: user.id,
      insurance_company: claim.insuranceCompany,
    });
    if (selectedShop.email) {
      const vehicle = vehicles.find(v => v.id === claim.vehicleId);
      const photoUrls = photos.map(p => getPhotoUrl(p.file_path)).join('\n');
      const subject = encodeURIComponent(`Repair Request – Claim ${claim.id.slice(0, 8).toUpperCase()}`);
      const body = encodeURIComponent(
        `Hello ${selectedShop.name},\n\n` +
        `I'd like to request a repair quote for the following:\n\n` +
        `Claim Reference: ${claim.id.slice(0, 8).toUpperCase()}\n` +
        `Insurance Company: ${claim.insuranceCompany || 'Not specified'}\n` +
        `Vehicle: ${vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model} (${vehicle.regoNumber})` : 'N/A'}\n` +
        `Damage Description: ${claim.damageDescription}\n\n` +
        (photos.length > 0 ? `Damage Photos:\n${photoUrls}\n\n` : '') +
        `Incident Date: ${claim.incidentDate}\n` +
        `Incident Location: ${claim.incidentLocation}\n\n` +
        `Thank you.`
      );
      window.open(`mailto:${selectedShop.email}?subject=${subject}&body=${body}`);
    }
    setSending(false);
    toast.success('Repair request sent to ' + selectedShop.name);
  };

  const addTP = () => update('thirdParties', [...claim.thirdParties, { ...emptyTP }]);
  const updTP = (i: number, f: string, v: string) => { const u = [...claim.thirdParties]; (u[i] as any)[f] = v; update('thirdParties', u); };
  const rmTP = (i: number) => update('thirdParties', claim.thirdParties.filter((_, idx) => idx !== i));
  const addW = () => update('witnesses', [...claim.witnesses, { ...emptyW }]);
  const updW = (i: number, f: string, v: string | boolean) => { const u = [...claim.witnesses]; (u[i] as any)[f] = v; update('witnesses', u); };
  const rmW = (i: number) => update('witnesses', claim.witnesses.filter((_, idx) => idx !== i));
  const selV = vehicles.find(v => v.id === claim.vehicleId);

  const Toggle = ({ active, onToggle, label }: { active: boolean; onToggle: () => void; label: string }) => (
    <div className="flex items-center gap-3 py-1">
      <button type="button" onClick={onToggle}
        className={`w-11 h-6 rounded-full transition-colors relative ${active ? 'bg-foreground' : 'bg-border'}`}>
        <span className={`absolute top-[3px] w-[18px] h-[18px] rounded-full bg-card transition-transform shadow-sm ${active ? 'left-[23px]' : 'left-[3px]'}`} />
      </button>
      <span className="text-sm text-foreground">{label}</span>
    </div>
  );

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={async () => { await autoSave(); navigate(-1); }} className="p-2 -ml-2 rounded-xl hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" strokeWidth={1.5} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground">{t('claims.reportIncident')}</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Save className="w-3 h-3" /> {t('claims.autoSaved')}</p>
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
            {step === 0 && (
              <div className="card-surface space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="form-label">{t('claims.incident.date')}</label><input type="date" className="form-input tabular-nums" value={claim.incidentDate} onChange={e => update('incidentDate', e.target.value)} /></div>
                  <div><label className="form-label">{t('claims.incident.time')}</label><input type="time" className="form-input tabular-nums" value={claim.incidentTime} onChange={e => update('incidentTime', e.target.value)} /></div>
                </div>
                <div><label className="form-label">{t('claims.incident.location')}</label><input className="form-input" placeholder={t('claims.incident.locationPlaceholder')} value={claim.incidentLocation} onChange={e => update('incidentLocation', e.target.value)} /></div>
                <div><label className="form-label">{t('claims.incident.vehicleUsage')}</label><input className="form-input" placeholder={t('claims.incident.vehicleUsagePlaceholder')} value={claim.vehicleUsage} onChange={e => update('vehicleUsage', e.target.value)} /></div>
                <div><label className="form-label">{t('claims.incident.journeyDetails')}</label><textarea className="form-input min-h-[80px] resize-none" placeholder={t('claims.incident.journeyPlaceholder')} value={claim.journeyDetails} onChange={e => update('journeyDetails', e.target.value)} /></div>
                <div><label className="form-label">{t('claims.incident.whatHappened')}</label><textarea className="form-input min-h-[100px] resize-none" placeholder={t('claims.incident.whatHappenedPlaceholder')} value={claim.description} onChange={e => update('description', e.target.value)} /></div>
              </div>
            )}

            {step === 1 && (
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
                        <button key={v.id} onClick={() => update('vehicleId', v.id)}
                          className={`w-full text-left p-3.5 rounded-xl transition-all border ${claim.vehicleId === v.id ? 'border-foreground bg-foreground/[0.03]' : 'border-border hover:border-foreground/20'}`}>
                          <div className="text-sm font-semibold text-foreground">{v.year} {v.make} {v.model}</div>
                          <div className="text-xs text-muted-foreground tabular-nums">{v.regoNumber}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div><label className="form-label">{t('claims.vehicle.speedBraking')}</label><input className="form-input tabular-nums" placeholder="e.g. 50" value={claim.speedBeforeBraking} onChange={e => update('speedBeforeBraking', e.target.value)} /></div>
                <div><label className="form-label">{t('claims.vehicle.describeDamage')}</label><textarea className="form-input min-h-[80px] resize-none" placeholder={t('claims.vehicle.describeDamagePlaceholder')} value={claim.damageDescription} onChange={e => update('damageDescription', e.target.value)} /></div>
                <Toggle active={claim.vehicleTowed} onToggle={() => update('vehicleTowed', !claim.vehicleTowed)} label={t('claims.vehicle.vehicleTowed')} />
                {claim.vehicleTowed && <div><label className="form-label">{t('claims.vehicle.towingCompany')}</label><input className="form-input" value={claim.towingCompany} onChange={e => update('towingCompany', e.target.value)} /></div>}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="card-surface space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="form-label mb-0">{t('claims.thirdParty.otherVehicles')}</label>
                    <button onClick={addTP} className="text-xs text-primary font-semibold hover:underline">{t('claims.thirdParty.addVehicle')}</button>
                  </div>
                  {claim.thirdParties.length === 0 && <p className="text-sm text-muted-foreground">{t('claims.thirdParty.noThirdParties')}</p>}
                  {claim.thirdParties.map((tp, i) => (
                    <div key={i} className="p-4 rounded-xl bg-background space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground">{t('claims.thirdParty.vehicleNumber', { number: i + 1 })}</span>
                        <button onClick={() => rmTP(i)} className="text-xs text-destructive hover:underline font-medium">{t('common.remove')}</button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="form-label">{t('claims.thirdParty.ownerDriver')}</label><input className="form-input" value={tp.ownerName} onChange={e => updTP(i, 'ownerName', e.target.value)} /></div>
                        <div><label className="form-label">{t('claims.thirdParty.phone')}</label><input className="form-input" value={tp.phone} onChange={e => updTP(i, 'phone', e.target.value)} /></div>
                      </div>
                      <div><label className="form-label">{t('claims.thirdParty.address')}</label><input className="form-input" value={tp.address} onChange={e => updTP(i, 'address', e.target.value)} /></div>
                      <div className="grid grid-cols-3 gap-3">
                        <div><label className="form-label">{t('claims.thirdParty.make')}</label><input className="form-input" value={tp.make} onChange={e => updTP(i, 'make', e.target.value)} /></div>
                        <div><label className="form-label">{t('claims.thirdParty.model')}</label><input className="form-input" value={tp.model} onChange={e => updTP(i, 'model', e.target.value)} /></div>
                        <div><label className="form-label">{t('claims.thirdParty.regoNo')}</label><input className="form-input tabular-nums" value={tp.regoNumber} onChange={e => updTP(i, 'regoNumber', e.target.value.toUpperCase())} /></div>
                      </div>
                      <div><label className="form-label">{t('claims.thirdParty.insurer')}</label><input className="form-input" value={tp.insurer} onChange={e => updTP(i, 'insurer', e.target.value)} /></div>
                      <div><label className="form-label">{t('claims.thirdParty.damageDescription')}</label><textarea className="form-input min-h-[60px] resize-none" value={tp.damageDescription} onChange={e => updTP(i, 'damageDescription', e.target.value)} /></div>
                    </div>
                  ))}
                </div>
                <div className="card-surface space-y-3">
                  <label className="form-label">{t('claims.thirdParty.otherPropertyDamaged')}</label>
                  <input className="form-input" placeholder={t('claims.thirdParty.ownerNameAddress')} value={claim.otherPropertyOwner} onChange={e => update('otherPropertyOwner', e.target.value)} />
                  <textarea className="form-input min-h-[60px] resize-none" placeholder={t('claims.thirdParty.describePropertyDamage')} value={claim.otherPropertyDamage} onChange={e => update('otherPropertyDamage', e.target.value)} />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="card-surface space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="form-label mb-0">{t('claims.witnesses.title')}</label>
                    <button onClick={addW} className="text-xs text-primary font-semibold hover:underline">{t('claims.witnesses.addWitness')}</button>
                  </div>
                  {claim.witnesses.length === 0 && <p className="text-sm text-muted-foreground">{t('claims.witnesses.noWitnesses')}</p>}
                  {claim.witnesses.map((w, i) => (
                    <div key={i} className="p-4 rounded-xl bg-background space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground">{t('claims.witnesses.witnessNumber', { number: i + 1 })}</span>
                        <button onClick={() => rmW(i)} className="text-xs text-destructive hover:underline font-medium">{t('common.remove')}</button>
                      </div>
                      <div><label className="form-label">{t('claims.witnesses.fullName')}</label><input className="form-input" value={w.name} onChange={e => updW(i, 'name', e.target.value)} /></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="form-label">{t('claims.witnesses.phone')}</label><input className="form-input" value={w.phone} onChange={e => updW(i, 'phone', e.target.value)} /></div>
                        <div className="flex items-center pt-5"><Toggle active={w.isPassenger} onToggle={() => updW(i, 'isPassenger', !w.isPassenger)} label={t('claims.witnesses.passenger')} /></div>
                      </div>
                      <div><label className="form-label">{t('claims.witnesses.address')}</label><input className="form-input" value={w.address} onChange={e => updW(i, 'address', e.target.value)} /></div>
                    </div>
                  ))}
                </div>
                <div className="card-surface space-y-3">
                  <Toggle active={claim.policeAttended} onToggle={() => update('policeAttended', !claim.policeAttended)} label={t('claims.witnesses.policeAttended')} />
                  {claim.policeAttended && <div><label className="form-label">{t('claims.witnesses.officerDetails')}</label><input className="form-input" value={claim.policeOfficerDetails} onChange={e => update('policeOfficerDetails', e.target.value)} /></div>}
                  <Toggle active={claim.anyoneHurt} onToggle={() => update('anyoneHurt', !claim.anyoneHurt)} label={t('claims.witnesses.anyoneHurt')} />
                  {claim.anyoneHurt && <div><label className="form-label">{t('claims.witnesses.injuryDetails')}</label><textarea className="form-input min-h-[60px] resize-none" placeholder={t('claims.witnesses.injuryPlaceholder')} value={claim.injuryDetails} onChange={e => update('injuryDetails', e.target.value)} /></div>}
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <div className="card-surface space-y-4">
                  <div>
                    <label className="form-label">{t('claims.conditions.weather')}</label>
                    <div className="flex flex-wrap gap-2">
                      {WEATHER_OPTIONS.map(opt => (
                        <button key={opt.value} onClick={() => update('weatherCondition', opt.value)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                            claim.weatherCondition === opt.value ? 'bg-foreground text-card' : 'bg-background text-foreground hover:bg-muted'
                          }`}>{t(`weather.${opt.value}`)}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="form-label">{t('claims.conditions.road')}</label>
                    <div className="flex flex-wrap gap-2">
                      {ROAD_OPTIONS.map(opt => (
                        <button key={opt.value} onClick={() => update('roadCondition', opt.value)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                            claim.roadCondition === opt.value ? 'bg-foreground text-card' : 'bg-background text-foreground hover:bg-muted'
                          }`}>{t(`road.${opt.value}`)}</button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="card-surface space-y-3">
                  <Toggle active={claim.driverConsumedSubstance} onToggle={() => update('driverConsumedSubstance', !claim.driverConsumedSubstance)} label={t('claims.conditions.substance')} />
                  {claim.driverConsumedSubstance && <div><label className="form-label">{t('claims.conditions.substanceDetails')}</label><input className="form-input" placeholder={t('claims.conditions.substancePlaceholder')} value={claim.substanceDetails} onChange={e => update('substanceDetails', e.target.value)} /></div>}
                </div>
                <div className="card-surface space-y-3">
                  <div><label className="form-label">{t('claims.conditions.atFault')}</label><textarea className="form-input min-h-[60px] resize-none" placeholder={t('claims.conditions.atFaultPlaceholder')} value={claim.blameDescription} onChange={e => update('blameDescription', e.target.value)} /></div>
                  <Toggle active={claim.liabilityAdmitted} onToggle={() => update('liabilityAdmitted', !claim.liabilityAdmitted)} label={t('claims.conditions.liabilityAdmitted')} />
                  {claim.liabilityAdmitted && <div><label className="form-label">{t('claims.conditions.whoAdmitted')}</label><input className="form-input" value={claim.liabilityDetails} onChange={e => update('liabilityDetails', e.target.value)} /></div>}
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4">
                <div className="card-surface space-y-3">
                  <label className="form-label">{t('claims.insurance.insuranceCompany')}</label>
                  <input className="form-input" placeholder={t('claims.insurance.insurancePlaceholder')} value={claim.insuranceCompany} onChange={e => update('insuranceCompany', e.target.value)} />
                </div>

                <div className="card-surface space-y-3">
                  <label className="form-label">{t('claims.insurance.damagePhotos')}</label>
                  <p className="text-xs text-muted-foreground -mt-1">{t('claims.insurance.damagePhotosHint')}</p>
                  {photos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {photos.map(photo => (
                        <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden bg-muted">
                          <img src={getPhotoUrl(photo.file_path)} alt={photo.file_name} className="w-full h-full object-cover" />
                          <button onClick={() => removePhoto(photo)}
                            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-foreground/80 text-card flex items-center justify-center">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <button type="button" onClick={() => photoInputRef.current?.click()} disabled={uploading}
                    className="btn-secondary w-full h-10 gap-2 text-sm">
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                    {uploading ? t('claims.insurance.uploading') : t('claims.insurance.addPhotos')}
                  </button>
                  <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
                </div>

                <div className="card-surface space-y-3">
                  <label className="form-label">{t('claims.insurance.choosePanelShop')}</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input className="form-input pl-9" placeholder={t('claims.insurance.searchShops')} value={shopSearch} onChange={e => setShopSearch(e.target.value)} />
                  </div>
                  {selectedShop && (
                    <div className="p-3 rounded-xl border-2 border-foreground bg-foreground/[0.03] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-foreground">{selectedShop.name}</span>
                        <Badge variant="secondary" className="text-[10px] gap-0.5">
                          <Star className="w-2.5 h-2.5 fill-current" />{Number(selectedShop.google_rating).toFixed(1)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{selectedShop.address}, {selectedShop.city}</p>
                      {selectedShop.phone && <p className="text-xs text-muted-foreground">{selectedShop.phone}</p>}
                      <button onClick={() => update('selectedPanelShopId', '')} className="text-xs text-destructive hover:underline mt-1">{t('claims.insurance.changeShop')}</button>
                    </div>
                  )}
                  {!selectedShop && (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {filteredShops.slice(0, 20).map(shop => (
                        <button key={shop.id} onClick={() => { update('selectedPanelShopId', shop.id); update('repairerName', shop.name); update('repairerPhone', shop.phone); update('repairerAddress', `${shop.address}, ${shop.city}`); }}
                          className="w-full text-left p-3 rounded-xl border border-border hover:border-foreground/30 transition-all">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-foreground">{shop.name}</span>
                            <Badge variant="secondary" className="text-[10px] gap-0.5 shrink-0">
                              <Star className="w-2.5 h-2.5 fill-current" />{Number(shop.google_rating).toFixed(1)}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{shop.address}, {shop.city}</p>
                        </button>
                      ))}
                      {filteredShops.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">{t('claims.insurance.noShopsFound')}</p>}
                    </div>
                  )}
                </div>

                {selectedShop && (
                  <button type="button" onClick={sendToRepairer} disabled={sending}
                    className="btn-primary w-full h-11 gap-2">
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {t('claims.insurance.sendTo', { name: selectedShop.name })}
                  </button>
                )}
              </div>
            )}

            {step === 6 && (
              <div className="space-y-3">
                <RSection title={t('claims.review.incident')}>
                  <RRow label={t('claims.review.date')} value={claim.incidentDate} /><RRow label={t('claims.review.time')} value={claim.incidentTime} />
                  <RRow label={t('claims.review.location')} value={claim.incidentLocation} /><RRow label={t('claims.review.description')} value={claim.description} />
                </RSection>
                <RSection title={t('claims.review.yourVehicle')}>
                  <RRow label={t('claims.review.vehicle')} value={selV ? `${selV.year} ${selV.make} ${selV.model}` : '—'} />
                  <RRow label={t('claims.review.rego')} value={selV?.regoNumber || '—'} /><RRow label={t('claims.review.damage')} value={claim.damageDescription} />
                </RSection>
                <RSection title={t('claims.review.thirdParties')}>
                  {claim.thirdParties.length === 0 ? <p className="text-sm text-muted-foreground">{t('common.none')}</p> : claim.thirdParties.map((tp, i) => (
                    <div key={i} className="p-3 rounded-xl bg-background"><RRow label={t('claims.review.owner')} value={tp.ownerName} /><RRow label={t('claims.review.vehicle')} value={`${tp.make} ${tp.model} – ${tp.regoNumber}`} /></div>
                  ))}
                </RSection>
                <RSection title={t('claims.review.witnesses')}>
                  {claim.witnesses.length === 0 ? <p className="text-sm text-muted-foreground">{t('common.none')}</p> : claim.witnesses.map((w, i) => <RRow key={i} label={t('claims.witnesses.witnessNumber', { number: i + 1 })} value={`${w.name} – ${w.phone}`} />)}
                  <RRow label={t('claims.review.policeAttended')} value={claim.policeAttended ? t('common.yes') : t('common.no')} />
                </RSection>
                <RSection title={t('claims.review.conditions')}>
                  <RRow label={t('claims.review.weatherLabel')} value={claim.weatherCondition ? t(`weather.${claim.weatherCondition}`) : '—'} />
                  <RRow label={t('claims.review.roadLabel')} value={claim.roadCondition ? t(`road.${claim.roadCondition}`) : '—'} />
                  <RRow label={t('claims.review.faultAssessment')} value={claim.blameDescription || '—'} />
                </RSection>
                <RSection title={t('claims.review.insuranceRepairer')}>
                  <RRow label={t('claims.review.insurance')} value={claim.insuranceCompany || '—'} />
                  <RRow label={t('claims.review.repairer')} value={selectedShop?.name || claim.repairerName || '—'} />
                  <RRow label={t('claims.review.photos')} value={t('claims.review.uploaded', { count: photos.length })} />
                </RSection>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex gap-3 pb-16 md:pb-0">
          {step > 0 && <button onClick={prev} className="btn-secondary flex-1 h-11"><ArrowLeft className="w-4 h-4" strokeWidth={1.5} /> {t('common.back')}</button>}
          {step < STEPS.length - 1 ? (
            <button onClick={next} className="btn-primary flex-1 h-11">{t('common.next')} <ArrowRight className="w-4 h-4" /></button>
          ) : (
            <button onClick={submit} className="btn-primary flex-1 h-11"><Check className="w-4 h-4" /> {t('claims.submitReport')}</button>
          )}
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
