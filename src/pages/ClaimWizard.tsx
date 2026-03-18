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

const STEPS = ['Incident details', 'Your vehicle', 'Third parties', 'Witnesses & police', 'Conditions & damage', 'Insurance & repairer', 'Review'];
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
  };
}

export default function ClaimWizard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [claim, setClaim] = useState<ClaimReport>(emptyClaim);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  useEffect(() => {
    getVehicles().then(setVehicles);
    if (id) {
      getClaims().then(claims => {
        const e = claims.find(c => c.id === id);
        if (e) setClaim(e);
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
    navigate('/claims');
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
            <h1 className="text-lg font-bold text-foreground">Report an incident</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Save className="w-3 h-3" /> Auto-saved as draft</p>
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
                  <div><label className="form-label">Date of incident</label><input type="date" className="form-input tabular-nums" value={claim.incidentDate} onChange={e => update('incidentDate', e.target.value)} /></div>
                  <div><label className="form-label">Time</label><input type="time" className="form-input tabular-nums" value={claim.incidentTime} onChange={e => update('incidentTime', e.target.value)} /></div>
                </div>
                <div><label className="form-label">Location (street and town)</label><input className="form-input" placeholder="e.g. 42 Queen St, Auckland CBD" value={claim.incidentLocation} onChange={e => update('incidentLocation', e.target.value)} /></div>
                <div><label className="form-label">What was the vehicle being used for?</label><input className="form-input" placeholder="e.g. Personal use, commuting to work" value={claim.vehicleUsage} onChange={e => update('vehicleUsage', e.target.value)} /></div>
                <div><label className="form-label">Details of your journey</label><textarea className="form-input min-h-[80px] resize-none" placeholder="Describe where you were going and the route taken" value={claim.journeyDetails} onChange={e => update('journeyDetails', e.target.value)} /></div>
                <div><label className="form-label">What happened?</label><textarea className="form-input min-h-[100px] resize-none" placeholder="Provide full details of the incident" value={claim.description} onChange={e => update('description', e.target.value)} /></div>
              </div>
            )}

            {step === 1 && (
              <div className="card-surface space-y-4">
                <div>
                  <label className="form-label">Select your vehicle</label>
                  {vehicles.length === 0 ? (
                    <div className="p-5 rounded-xl bg-background text-center">
                      <p className="text-sm text-muted-foreground">No vehicles in your garage.</p>
                      <button onClick={async () => { await autoSave(); navigate('/vehicles/new'); }} className="text-sm text-primary font-medium mt-2 hover:underline">Add a vehicle first</button>
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
                <div><label className="form-label">Speed before braking (km/h)</label><input className="form-input tabular-nums" placeholder="e.g. 50" value={claim.speedBeforeBraking} onChange={e => update('speedBeforeBraking', e.target.value)} /></div>
                <div><label className="form-label">Describe damage to your vehicle</label><textarea className="form-input min-h-[80px] resize-none" placeholder="Describe all visible damage" value={claim.damageDescription} onChange={e => update('damageDescription', e.target.value)} /></div>
                <Toggle active={claim.vehicleTowed} onToggle={() => update('vehicleTowed', !claim.vehicleTowed)} label="Vehicle needed towing" />
                {claim.vehicleTowed && <div><label className="form-label">Towing company</label><input className="form-input" value={claim.towingCompany} onChange={e => update('towingCompany', e.target.value)} /></div>}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="card-surface space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="form-label mb-0">Other vehicles involved</label>
                    <button onClick={addTP} className="text-xs text-primary font-semibold hover:underline">+ Add vehicle</button>
                  </div>
                  {claim.thirdParties.length === 0 && <p className="text-sm text-muted-foreground">No third-party vehicles added.</p>}
                  {claim.thirdParties.map((tp, i) => (
                    <div key={i} className="p-4 rounded-xl bg-background space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground">Vehicle {i + 1}</span>
                        <button onClick={() => rmTP(i)} className="text-xs text-destructive hover:underline font-medium">Remove</button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="form-label">Owner / driver</label><input className="form-input" value={tp.ownerName} onChange={e => updTP(i, 'ownerName', e.target.value)} /></div>
                        <div><label className="form-label">Phone</label><input className="form-input" value={tp.phone} onChange={e => updTP(i, 'phone', e.target.value)} /></div>
                      </div>
                      <div><label className="form-label">Address</label><input className="form-input" value={tp.address} onChange={e => updTP(i, 'address', e.target.value)} /></div>
                      <div className="grid grid-cols-3 gap-3">
                        <div><label className="form-label">Make</label><input className="form-input" value={tp.make} onChange={e => updTP(i, 'make', e.target.value)} /></div>
                        <div><label className="form-label">Model</label><input className="form-input" value={tp.model} onChange={e => updTP(i, 'model', e.target.value)} /></div>
                        <div><label className="form-label">Rego no.</label><input className="form-input tabular-nums" value={tp.regoNumber} onChange={e => updTP(i, 'regoNumber', e.target.value.toUpperCase())} /></div>
                      </div>
                      <div><label className="form-label">Insurer</label><input className="form-input" value={tp.insurer} onChange={e => updTP(i, 'insurer', e.target.value)} /></div>
                      <div><label className="form-label">Damage description</label><textarea className="form-input min-h-[60px] resize-none" value={tp.damageDescription} onChange={e => updTP(i, 'damageDescription', e.target.value)} /></div>
                    </div>
                  ))}
                </div>
                <div className="card-surface space-y-3">
                  <label className="form-label">Other property damaged</label>
                  <input className="form-input" placeholder="Owner name and address" value={claim.otherPropertyOwner} onChange={e => update('otherPropertyOwner', e.target.value)} />
                  <textarea className="form-input min-h-[60px] resize-none" placeholder="Describe damage to other property" value={claim.otherPropertyDamage} onChange={e => update('otherPropertyDamage', e.target.value)} />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="card-surface space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="form-label mb-0">Witnesses</label>
                    <button onClick={addW} className="text-xs text-primary font-semibold hover:underline">+ Add witness</button>
                  </div>
                  {claim.witnesses.length === 0 && <p className="text-sm text-muted-foreground">No witnesses added.</p>}
                  {claim.witnesses.map((w, i) => (
                    <div key={i} className="p-4 rounded-xl bg-background space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground">Witness {i + 1}</span>
                        <button onClick={() => rmW(i)} className="text-xs text-destructive hover:underline font-medium">Remove</button>
                      </div>
                      <div><label className="form-label">Full name</label><input className="form-input" value={w.name} onChange={e => updW(i, 'name', e.target.value)} /></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="form-label">Phone</label><input className="form-input" value={w.phone} onChange={e => updW(i, 'phone', e.target.value)} /></div>
                        <div className="flex items-center pt-5"><Toggle active={w.isPassenger} onToggle={() => updW(i, 'isPassenger', !w.isPassenger)} label="Passenger" /></div>
                      </div>
                      <div><label className="form-label">Address</label><input className="form-input" value={w.address} onChange={e => updW(i, 'address', e.target.value)} /></div>
                    </div>
                  ))}
                </div>
                <div className="card-surface space-y-3">
                  <Toggle active={claim.policeAttended} onToggle={() => update('policeAttended', !claim.policeAttended)} label="Police attended the accident" />
                  {claim.policeAttended && <div><label className="form-label">Officer's name and number</label><input className="form-input" value={claim.policeOfficerDetails} onChange={e => update('policeOfficerDetails', e.target.value)} /></div>}
                  <Toggle active={claim.anyoneHurt} onToggle={() => update('anyoneHurt', !claim.anyoneHurt)} label="Anyone injured in the accident" />
                  {claim.anyoneHurt && <div><label className="form-label">Injury details</label><textarea className="form-input min-h-[60px] resize-none" placeholder="Who was hurt, relationship to driver, extent of injuries" value={claim.injuryDetails} onChange={e => update('injuryDetails', e.target.value)} /></div>}
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <div className="card-surface space-y-4">
                  <div>
                    <label className="form-label">Weather conditions</label>
                    <div className="flex flex-wrap gap-2">
                      {WEATHER_OPTIONS.map(opt => (
                        <button key={opt.value} onClick={() => update('weatherCondition', opt.value)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                            claim.weatherCondition === opt.value ? 'bg-foreground text-card' : 'bg-background text-foreground hover:bg-muted'
                          }`}>{opt.label}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="form-label">Road conditions</label>
                    <div className="flex flex-wrap gap-2">
                      {ROAD_OPTIONS.map(opt => (
                        <button key={opt.value} onClick={() => update('roadCondition', opt.value)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                            claim.roadCondition === opt.value ? 'bg-foreground text-card' : 'bg-background text-foreground hover:bg-muted'
                          }`}>{opt.label}</button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="card-surface space-y-3">
                  <Toggle active={claim.driverConsumedSubstance} onToggle={() => update('driverConsumedSubstance', !claim.driverConsumedSubstance)} label="Driver consumed alcohol/drugs in 12 hours before" />
                  {claim.driverConsumedSubstance && <div><label className="form-label">Substance details</label><input className="form-input" placeholder="What, how much, when" value={claim.substanceDetails} onChange={e => update('substanceDetails', e.target.value)} /></div>}
                </div>
                <div className="card-surface space-y-3">
                  <div><label className="form-label">Who do you consider to be at fault?</label><textarea className="form-input min-h-[60px] resize-none" placeholder="Describe who is at fault and why" value={claim.blameDescription} onChange={e => update('blameDescription', e.target.value)} /></div>
                  <Toggle active={claim.liabilityAdmitted} onToggle={() => update('liabilityAdmitted', !claim.liabilityAdmitted)} label="Anyone admitted liability" />
                  {claim.liabilityAdmitted && <div><label className="form-label">Who admitted liability?</label><input className="form-input" value={claim.liabilityDetails} onChange={e => update('liabilityDetails', e.target.value)} /></div>}
                </div>
                <div className="card-surface space-y-3">
                  <label className="form-label">Repairer details</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="form-label">Name</label><input className="form-input" value={claim.repairerName} onChange={e => update('repairerName', e.target.value)} /></div>
                    <div><label className="form-label">Phone</label><input className="form-input" value={claim.repairerPhone} onChange={e => update('repairerPhone', e.target.value)} /></div>
                  </div>
                  <div><label className="form-label">Address</label><input className="form-input" value={claim.repairerAddress} onChange={e => update('repairerAddress', e.target.value)} /></div>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-3">
                <RSection title="Incident">
                  <RRow label="Date" value={claim.incidentDate} /><RRow label="Time" value={claim.incidentTime} />
                  <RRow label="Location" value={claim.incidentLocation} /><RRow label="Description" value={claim.description} />
                </RSection>
                <RSection title="Your vehicle">
                  <RRow label="Vehicle" value={selV ? `${selV.year} ${selV.make} ${selV.model}` : '—'} />
                  <RRow label="Rego" value={selV?.regoNumber || '—'} /><RRow label="Damage" value={claim.damageDescription} />
                </RSection>
                <RSection title="Third parties">
                  {claim.thirdParties.length === 0 ? <p className="text-sm text-muted-foreground">None</p> : claim.thirdParties.map((tp, i) => (
                    <div key={i} className="p-3 rounded-xl bg-background"><RRow label="Owner" value={tp.ownerName} /><RRow label="Vehicle" value={`${tp.make} ${tp.model} – ${tp.regoNumber}`} /></div>
                  ))}
                </RSection>
                <RSection title="Witnesses">
                  {claim.witnesses.length === 0 ? <p className="text-sm text-muted-foreground">None</p> : claim.witnesses.map((w, i) => <RRow key={i} label={`Witness ${i + 1}`} value={`${w.name} – ${w.phone}`} />)}
                  <RRow label="Police attended" value={claim.policeAttended ? 'Yes' : 'No'} />
                </RSection>
                <RSection title="Conditions">
                  <RRow label="Weather" value={claim.weatherCondition || '—'} /><RRow label="Road" value={claim.roadCondition || '—'} />
                  <RRow label="At fault" value={claim.blameDescription || '—'} />
                </RSection>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex gap-3 pb-16 md:pb-0">
          {step > 0 && <button onClick={prev} className="btn-secondary flex-1 h-11"><ArrowLeft className="w-4 h-4" strokeWidth={1.5} /> Back</button>}
          {step < STEPS.length - 1 ? (
            <button onClick={next} className="btn-primary flex-1 h-11">Next <ArrowRight className="w-4 h-4" /></button>
          ) : (
            <button onClick={submit} className="btn-primary flex-1 h-11"><Check className="w-4 h-4" /> Submit report</button>
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
